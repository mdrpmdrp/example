function doPost(e) {
  if (e.parameter?.action) return hanDleAPI(e)
  Logger = BetterLog.useSpreadsheet()
  const webhooks = LineBotWebhook.init(e, LINE_ACCESS_TOKEN, true)

  // Handle text events immediately (no external HTTP needed)
  webhooks.forEach(webhook => {
    try {
      if (webhook.eventType == 'message' && webhook.messageType == 'text') {
        if (webhook.message == '/groupid') {
          webhook.reply(['Group ID ของกลุ่มนี้คือ', webhook.groupId])
        }
      }
    } catch (err) {
      err = (typeof err === 'string') ? new Error(err) : err;
      Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"', err.name || '',
        err.message || '', err.lineNumber || '', err.fileName || '', err.stack || '');
    }
  })

  // Collect image/file events for batched Gemini processing
  const imageWebhooks = webhooks.filter(wh =>
    wh.eventType == 'message' && (wh.messageType == 'image' || wh.messageType == 'file')
  )

  if (imageWebhooks.length > 0) {
    Logger = BetterLog.useSpreadsheet()
    imageWebhooks.forEach(wh => wh.showLoading())

    // Fetch all blobs and fire all Gemini requests in parallel
    const items = imageWebhooks.map(wh => ({ webhook: wh, blob: wh.file() }))
    const geminiResponses = UrlFetchApp.fetchAll(items.map(({ blob }) => buildGeminiRequest(blob)))
    const ss = SpreadsheetApp.getActiveSpreadsheet()
    items.forEach(({ webhook }, i) => {
      try {
        processExtract(webhook, geminiResponses[i].getContentText(), ss)
      } catch (err) {
        err = (typeof err === 'string') ? new Error(err) : err;
        Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"', err.name || '',
          err.message || '', err.lineNumber || '', err.fileName || '', err.stack || '');
      }
    })
  }

  return ContentService.createTextOutput('OK')
}

const LINE_ACCESS_TOKEN = "hhtpjACdP6l/NpHaUNC/oNapdQkbr7iQr0U5GL6LkzKTzU4UyW/TVROgQCnGBBogMZqafQEb8Prik9pKazS1RqndW5ViQoUbKW20lkvWHMEdYBrDXhQ89UC5LqolFtFvuV3EPnU0SKpJ3KaegfEUNAdB04t89/1O/w1cDnyilFU="
const GEMINI_TOKEN = PropertiesService.getScriptProperties().getProperty('GEMINI_TOKEN')
const NUM_STRIP_RE = /[^0-9.-]+/g

const EXTRACT_PROMPT = `You are an expert OCR AI parsing screenshots of daily sales reports. Extract the following information from the provided screenshot.
The report may be in Thai or English.
Return ONLY a valid JSON object matching the exact structure below, without markdown blocks, without backticks, and without any explanatory text:
{
  "date": "Date of the report. You MUST format this strictly as YYYY-MM-DD (e.g., 2024-12-31). Look carefully for any date shown — it may appear as a header, label, or navigation element (e.g. '12 มีนาคม', '12 March', '12/03/2025'). Thai month names: มกราคม=01 กุมภาพันธ์=02 มีนาคม=03 เมษายน=04 พฤษภาคม=05 มิถุนายน=06 กรกฎาคม=07 สิงหาคม=08 กันยายน=09 ตุลาคม=10 พฤศจิกายน=11 ธันวาคม=12. If no year is visible, assume the current year. (if truly not found, null)",
  "categories": [
    { "name": "Category name", "net_sales": "Net sales amount for this category (number or numeric string)" }
  ],
  "total_transfer": "Transfer payment total for the whole report. In the image this value is prefixed with 'อ' (อ = เงินโอน). Extract the numeric value only.",
  "total_cash": "Cash payment total for the whole report. In the image this value is prefixed with 'ส' (ส = เงินสด). Extract the numeric value only."
}
If a field is not found in the image, set its value to null. 'categories' must be an array; include every category row shown. Ensure the output is strictly valid JSON.`

function buildGeminiRequest(blob) {
  const mimeType = blob.getContentType() || 'image/jpeg'
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_TOKEN}`,
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      generationConfig: { temperature: 0 },
      contents: [{
        parts: [
          { text: EXTRACT_PROMPT },
          { inline_data: { mime_type: mimeType, data: Utilities.base64Encode(blob.getBytes()) } }
        ]
      }]
    }),
    muteHttpExceptions: true
  }
}

function parseGeminiResponse(rawText) {
  const text = JSON.parse(rawText)?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (err) {
    Logger.log('Failed to parse Gemini response: ' + err)
  }
  return {}
}

function processExtract(webhook, rawText, ss) {
  Logger.log('Gemini raw response: ' + rawText)
  const extracted = parseGeminiResponse(rawText)
  const categories = Array.isArray(extracted.categories) ? extracted.categories : []

  if (!extracted.date && categories.length === 0) {
    try { webhook.reply(['❌ ไม่พบข้อมูลที่จำเป็น กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น'], true) } catch (replyErr) {
      Logger.log('Failed to send LINE reply: ' + replyErr)
    }
    return
  }

  const fmt = (n) => n ? Number(String(n).replace(NUM_STRIP_RE, '')).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
  const dateValue = extracted.date ? new Date(extracted.date) : null
  const hasValidDate = dateValue && !isNaN(dateValue.getTime())
  const displayDate = hasValidDate
    ? Utilities.formatDate(dateValue, 'GMT', 'dd MMMM')
    : (extracted.date ?? '-')

  // Build reply with all categories listed
  const categoryLines = categories.map(c => `  • ${c.name ?? '-'}: ${fmt(c.net_sales)} บาท`)
  const replyLines = [
    `📃 ข้อมูลรายงานยอดขาย`,
    `📅 วันที่ : ${displayDate}`,
    `🗂️ หมวดหมู่ :`,
    ...categoryLines,
    `🏦 เงินโอน : ${fmt(extracted.total_transfer)}`,
    `💵 เงินสด : ${fmt(extracted.total_cash)}`
  ]
  try {
    webhook.reply([replyLines.join('\n')], true)
  } catch (replyErr) {
    Logger.log('Failed to send LINE reply: ' + replyErr)
  }

  if (hasValidDate) {
    const monthText = Utilities.formatDate(dateValue, 'GMT', 'MMMM').replace(/^./, c => c.toUpperCase())
    const monthSheet = ss.getSheetByName(monthText) || ss.insertSheet(monthText)
    writeToMonthSheet(monthSheet, dateValue, categories)
  }
}

// Sheet layout:
//   Row 3      = header row
//   Left half  (days  1–15): day in col B(2), category data starts col C(3)
//   Right half (days 16–31): day in col M(13), category data starts col N(14)
//   Data rows start at row 4
const SHEET_DATA_START_ROW = 4
const LEFT_HDR_START = 3  // C
const RIGHT_HDR_START = 14 // N

function writeToMonthSheet(sheet, dateObj, categories) {
  const day = Number(Utilities.formatDate(dateObj, 'GMT', 'd'))
  const isLeft = day <= 15
  const hdrStart = isLeft ? LEFT_HDR_START : RIGHT_HDR_START
  const row = SHEET_DATA_START_ROW + (isLeft ? day - 1 : day - 16)

  // Map category to column: "01.xxx" → offset 0, ..., "06.xxx" → offset 5, no-number → offset 7 (col J/U)
  // Build an 8-cell array (offsets 0–7) and write in one batch
  const rowData = new Array(8).fill('')
  categories.forEach(cat => {
    if (cat.net_sales == null) return
    const numMatch = String(cat.name ?? '').match(/^0*(\d+)\./)
    // ถ้าชื่อ มีคำว่า "promade" ให้จัดไปช่องสุดท้ายเลย
    const isPromade = /promade/i.test(cat.name ?? '')
    if(!isPromade && !numMatch) return
    const colOffset = isPromade ? 7 : (parseInt(numMatch[1], 10) - 1)
    if (colOffset < 0 || colOffset >= rowData.length) return
    const val = Number(String(cat.net_sales).replace(NUM_STRIP_RE, ''))
    if (!isNaN(val)) rowData[colOffset] = val
  })
  sheet.getRange(row, hdrStart, 1, rowData.length).setValues([rowData])
}