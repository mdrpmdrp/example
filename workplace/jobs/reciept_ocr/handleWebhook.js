function doPost(e) {
  if (e.parameter?.action) return hanDleAPI(e)

  LineBotWebhook.init(e, LINE_ACCESS_TOKEN, true).forEach(webhook => {
    try {
      if (webhook.eventType == 'message' && webhook.messageType == 'text') {
        if (webhook.message == '/groupid') {
          webhook.reply(['Group ID ของกลุ่มนี้คือ', webhook.groupId])
        }
      } else if (webhook.eventType == 'message' && (webhook.messageType == 'image' || webhook.messageType == 'file')) {
        return handleReceipt(webhook)
      }
      return webhook.ok
    } catch (e) { //with stack tracing if your exceptions bubble up to here
      e = (typeof e === 'string') ? new Error(e) : e;
      Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"', e.name || '',
        e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
      throw e;
    }
  })
}

const GEMINI_TOKEN = PropertiesService.getScriptProperties().getProperty('GEMINI_TOKEN')

const RECEIPT_PROMPT = `You are an expert OCR AI parsing receipts. Extract the following information from the provided receipt. 
The receipt may be in Thai or English.
Return ONLY a valid JSON object matching the exact structure below, without markdown blocks, without backticks, and without any explanatory text:
{
  "payment_date": "Date of transaction. You MUST format this strictly as YYYY-MM-DD (e.g., 2024-12-31). Convert other formats. (if available, else null)",
  "invoice_number": "Invoice, Receipt, or Tax Invoice number. Exclude any labels like 'No.'",
  "supplier_name": "Full name of the supplier, store, or company",
  "address": "Full address of the supplier",
  "telephone_number": "Phone number(s), stripped of extra text",
  "contact_name": "Name of the buyer/contact person, if specified",
  "price": "Subtotal price before VAT (number or numeric string)",
  "vat_includes": "VAT or tax amount (number or numeric string)",
  "grand_price": "Grand total / final amount (number or numeric string)",
  "line_id": "LINE ID if present"
}
If a field is not found in the image, set its value to null. Ensure the output is strictly valid JSON.`

function extractReceiptData(blob) {
  const mimeType = blob.getContentType() || 'image/jpeg'
  const payload = {
    contents: [{
      parts: [
        { text: RECEIPT_PROMPT },
        { inline_data: { mime_type: mimeType, data: Utilities.base64Encode(blob.getBytes()) } }
      ]
    }]
  }
  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_TOKEN}`,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }
  )
  const rawText = response.getContentText()
  const text = JSON.parse(rawText)?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (err) {
    Logger.log('Failed to parse Gemini response: ' + err)
  }
  return {}
}

function calculatePrice(grandPrice, vatIncludes, price) {
  const fmt = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (!grandPrice) return { price: price || null, vat: vatIncludes || null }
  const grand = Number(grandPrice)
  const vat = grand / 1.07 * 0.07
  return { price: fmt(grand - vat), vat: fmt(vat) }
}

function handleReceipt(webhook) {
  webhook.showLoading()
  const blob = webhook.file()
  const extracted = extractReceiptData(blob)

  if (!extracted.invoice_number) {
    webhook.reply(['ไม่ใช่ภาพใบเสร็จ'])
    return
  }

  const { price, vat } = calculatePrice(extracted.grand_price, extracted.vat_includes, extracted.price)
  const receiptMonth = extracted.payment_date ? new Date(extracted.payment_date).getMonth() + 1 : null
  const fileName = `receipt_${extracted.invoice_number || Date.now()}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}.jpg`
  const fileId = uploadToDrive(blob, fileName, receiptMonth)
  const fileUrl = `https://lh3.googleusercontent.com/d/${fileId}`

  const sheet = SpreadsheetApp.openById('1o8s_15wSiKxaQBU8ZQHbn9Mo5jNzjo-Q5hESFXiFIrI').getSheetByName('Receipts')
  sheet.appendRow([
    '=row()-1',
    new Date(),
    extracted.payment_date ? new Date(extracted.payment_date) : null,
    extracted.invoice_number || null,
    extracted.supplier_name || null,
    extracted.address || null,
    extracted.telephone_number ? "'" + extracted.telephone_number : null,
    extracted.contact_name || null,
    price || null,
    vat || null,
    extracted.grand_price || null,
    webhook.profile().displayName,
    fileUrl
  ])

  const grandPriceString = extracted.grand_price
    ? Number(extracted.grand_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-'

  const replyLines = [
    `📃 ข้อมูลใบเสร็จ`,
    `📅 วันที่บิล: ${extracted.payment_date ?? '-'}`,
    `🧾 เลขที่ใบแจ้งหนี้: ${extracted.invoice_number ?? '-'}`,
    `🏢 ผู้จำหน่าย: ${extracted.supplier_name ?? '-'}`,
    `📍 ที่อยู่: ${extracted.address ?? '-'}`,
    `📞 โทร: ${extracted.telephone_number ?? '-'}`,
    `👤 ผู้ติดต่อ: ${extracted.contact_name ?? '-'}`,
    `💰 ราคา: ${price ?? '-'} บาท`,
    `💵 VAT: ${vat ?? '-'} บาท`,
    `🧾 ยอดรวม: ${grandPriceString} บาท`,
    `🖼️ ดูรูปฉบับเต็ม: \n${fileUrl}`
  ]

  webhook.reply([replyLines.join('\n')])
}

function uploadToDrive(blob, filename, month) {
  const mainFolderID = '13AxFQXeEgmRAvF9iGA3hQ4__H3kl7zYh'
  const monthName = ['01_JAN', '02_FEB', '03_MAR', '04_APR', '05_MAY', '06_JUN', '07_JUL', '08_AUG', '09_SEP', '10_OCT', '11_NOV', '12_DEC']
  let mainFolder = DriveApp.getFolderById(mainFolderID)
  let monthFolder = mainFolder.getFoldersByName(monthName[month - 1])
  if (!monthFolder.hasNext()) {
    monthFolder = mainFolder.createFolder(monthName[month - 1])
  } else {
    monthFolder = monthFolder.next()
  }
  const file = monthFolder.createFile(blob.setName(filename))
  return file.getId()
}