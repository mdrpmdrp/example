const LINE_ACCESS_TOKEN = 'TmO6zZ4elwE/LvZosHZFM8nYx+KaiMBssRi/VFo2JQFffrdfuq1vRyPhGfAPWPpfw+Plm6Bm5IDFnsm9VJ1TBcMCg57RSTQBsNtgEjOJrObUCNGF6W5VjcMuqqe3P790Hug/3U+RNbmSkaYxhrCd9AdB04t89/1O/w1cDnyilFU='
const SPREADSHEET_ID = '1o8s_15wSiKxaQBU8ZQHbn9Mo5jNzjo-Q5hESFXiFIrI'
// const LINE_ACCESS_TOKEN = '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU='
// const SPREADSHEET_ID = '1DQER6qqsqLV-vA7W4DBotDfCzKS1ZxwITjNGBMoQw7o'
function doPost(e) {
  if (e.parameter?.action) return hanDleAPI(e)

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
    Logger = BetterLog.useSpreadsheet(SPREADSHEET_ID)
    imageWebhooks.forEach(wh => wh.showLoading())

    // Fetch all blobs and fire all Gemini requests in parallel
    const items = imageWebhooks.map(wh => ({ webhook: wh, blob: wh.file() }))
    const geminiResponses = UrlFetchApp.fetchAll(items.map(({ blob }) => buildGeminiRequest(blob)))

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
    const receiptSheet = ss.getSheetByName('Receipts')
    const idCardSheet = ss.getSheetByName('ID_Cards')
    const lalaMoveSheet = ss.getSheetByName('LALAMOVE')
    items.forEach(({ webhook, blob }, i) => {
      try {
        const extractedData = parseGeminiResponse(geminiResponses[i].getContentText())
        Logger.log(JSON.stringify(extractedData))
        if (!extractedData || ['RECEIPT', 'ID_CARD', 'LALAMOVE_RECEIPT'].indexOf(extractedData.document_type) === -1) {
          webhook.replyToline(['❌ ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น'], true)
          return
        }
        if (extractedData.document_type === 'RECEIPT') {
          processReceipt(webhook, blob, extractedData.data, receiptSheet)
        } else if (extractedData.document_type === 'LALAMOVE_RECEIPT') {
          processLalaMoveReceipt(webhook, blob, extractedData.data, lalaMoveSheet)
        } else if (extractedData.document_type === 'ID_CARD') {
          processIDCard(webhook, blob, extractedData.data, idCardSheet)
        }
      } catch (err) {
        err = (typeof err === 'string') ? new Error(err) : err;
        Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"', err.name || '',
          err.message || '', err.lineNumber || '', err.fileName || '', err.stack || '');
      }
    })
  }

  return ContentService.createTextOutput('OK')
}


const GEMINI_TOKEN = PropertiesService.getScriptProperties().getProperty('GEMINI_TOKEN')

const GEMINI_PROMPT = `You are an expert Document Classifier and OCR AI specializing in Thai and English documents. Your task is to identify the document type and extract data into a structured JSON format.

### STEP 1: CLASSIFICATION LOGIC
1. ID_CARD: Look for "Thai National ID Card", "บัตรประจำตัวประชาชน", 13-digit number, and a person's photo.
2. RECEIPT: Look for "Receipt", "Tax Invoice", "ใบเสร็จรับเงิน", "ใบกำกับภาษี", list of items, and prices.
3. LALAMOVE_RECEIPT: Look for "LalaMove", "ลาลามูฟ", delivery details, order number, and prices.
4. UNKNOWN: If it doesn't match the above.

### STEP 2: EXTRACTION RULES
- Dates: Must be strictly YYYY-MM-DD.
- Year Conversion: If a date is in Buddhist Era (BE), convert to Anno Domini (AD) by subtracting 543 (e.g., 2567 -> 2024).
- Numbers: Remove currency symbols and commas. Use numeric strings or numbers.
- Privacy: Extract ID Card data only if document_type is ID_CARD.
- For receipts from LalaMove, its needs to have order number, otherwise it will be classified as RECEIPT, not LALAMOVE_RECEIPT.
- Null Handling: Set any missing or unreadable fields to null.

### STEP 3: OUTPUT FORMAT
Return ONLY a valid JSON object without markdown blocks, without backticks, and without any explanatory text.

{
  "document_type": "ID_CARD | RECEIPT | LALAMOVE_RECEIPT | UNKNOWN",
  "confidence_score": "0.0 - 1.0",
  "data": {
    /* Fields for ID_CARD (do not include if document_type is RECEIPT) */
    "id_number": "13-digit ID number, stripped of spaces or dashes",
    "prefix": "Title (e.g., นาย, นางสาว, Mr., Ms.)",
    "first_name_th": "First name in Thai",
    "last_name_th": "Last name in Thai",
    "first_name_en": "First name in English",
    "last_name_en": "Last name in English",
    "date_of_birth": "Date of birth in YYYY-MM-DD format (convert from BE if needed)",
    "address": "Full address as appearing on card",
    "issue_date": "Date of issue in YYYY-MM-DD format (convert from BE if needed)",
    "expiry_date": "Date of expiry in YYYY-MM-DD format (convert from BE if needed)",

    /* Fields for RECEIPT (do not include if document_type is ID_CARD) */
    "payment_date": "Date of transaction. You MUST format this strictly as YYYY-MM-DD (e.g., 2024-12-31). Convert other formats. (if available, else null)",
    "invoice_number": "Invoice, Receipt, or Tax Invoice number as a string (keep all leading zeros), exclude labels like 'No.'",
    "supplier_name": "Full name of the supplier, store, or company",
    "address": "Full address of the supplier",
    "telephone_number": "Phone number(s), stripped of extra text",
    "contact_name": "Name of the buyer/contact person, if specified",
    "price": "Subtotal price before VAT (number or numeric string)",
    "vat_includes": "VAT or tax amount (number or numeric string)",
    "grand_price": "Grand total / final amount (number or numeric string)",

    /* Fields for LALAMOVE_RECEIPT (do not include if document_type is ID_CARD or RECEIPT) */
    "order_number": "LalaMove order number as a string (keep all leading zeros), exclude labels",
    "delivery_date": "Date of delivery in YYYY-MM-DD format (convert from BE if needed)",
    "delivery_time": "Time of delivery in HH:MM format (24-hour, convert if in 12-hour format)",
    "delivery_address": "Full delivery address", (if multiple addresses are present, choose first one that appears on the receipt).
    "receiver_name": "Name of the receiver within the delivery address section, if specified",
    "delivery_fee": "Delivery fee amount (number or numeric string)",

  }
}`

function buildGeminiRequest(blob) {
  const mimeType = blob.getContentType() || 'image/jpeg'
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_TOKEN}`,
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{
        parts: [
          { text: GEMINI_PROMPT },
          { inline_data: { mime_type: mimeType, data: Utilities.base64Encode(blob.getBytes()) } }
        ]
      }]
    }),
    muteHttpExceptions: true
  }
}

function parseGeminiResponse(rawText) {
  Logger.log('Gemini raw response: %s', rawText)
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
  const grand = Number(grandPrice.replace(/[^0-9.-]+/g, ""))
  const vat = grand / 1.07 * 0.07
  return { price: fmt(grand - vat), vat: fmt(vat) }
}

function processReceipt(webhook, blob, extracted, sheet) {

  if (!extracted.invoice_number) {
    try { webhook.replyToline(['❌ ไม่พบข้อมูลที่จำเป็นบนใบเสร็จ กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น'], true) } catch (replyErr) {
      Logger.log('Failed to send LINE reply: ' + replyErr)
    }
    return
  }

  // Check for duplicate invoice number (invoice_number is in column 4)
  const lastRow = sheet.getLastRow()
  if (lastRow > 1) {
    const existingInvoices = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().flat()
    if (existingInvoices.includes(extracted.invoice_number.toString())) {
      try { webhook.replyToline([`⚠️ เลขที่ใบแจ้งหนี้ ${extracted.invoice_number} ซ้ำกับที่มีอยู่แล้ว ไม่มีการบันทึกข้อมูล`], true) } catch (replyErr) {
        Logger.log('Failed to send LINE reply: ' + replyErr)
      }
      return
    }
  }

  const { price, vat } = calculatePrice(extracted.grand_price, extracted.vat_includes, extracted.price)
  const grandPriceString = extracted.grand_price
    ? Number(extracted.grand_price.replace(/[^0-9.-]+/g, "")).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-'
  // Cache profile (HTTP call) before replying
  const displayName = webhook.profile().displayName

  // Reply immediately — before the slow Drive upload so user gets instant feedback
  const replyLines = [
    `📃 ข้อมูลใบเสร็จ`,
    `📅 วันที่บิล: ${extracted.payment_date ?? '-'}`,
    `🧾 เลขที่ใบแจ้งหนี้: ${extracted.invoice_number ?? '-'}`,
    `🏢 ผู้จำหน่าย: ${extracted.supplier_name ?? '-'}`,
    `📍 ที่อยู่: ${extracted.address ?? '-'}`,
    `📞 โทร: ${extracted.tel ?? '-'}`,
    `👤 ผู้ติดต่อ: ${extracted.contact_name ?? '-'}`,
    `💰 ราคา: ${price ?? '-'} บาท`,
    `💵 VAT: ${vat ?? '-'} บาท`,
    `🧾 ยอดรวม: ${grandPriceString} บาท`
  ]
  try {
    webhook.replyToline([replyLines.join('\n')], true)
  } catch (replyErr) {
    Logger.log('Failed to send LINE reply: ' + replyErr)
  }

  // Upload to Drive and save to sheet after reply (user already has their data)
  const receiptMonth = extracted.payment_date ? new Date(extracted.payment_date).getMonth() + 1 : null
  const file_ext = blob.getContentType().split('/').pop() || 'jpg'
  const fileName = `receipt_${extracted.invoice_number || Date.now()}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}.${file_ext}`
  const fileUrl = uploadToDropbox(blob, fileName, receiptMonth, "Receipts")

  sheet.appendRow([
    '=row()-1',
    new Date(),
    extracted.payment_date ? new Date(extracted.payment_date) : null,
    extracted.invoice_number || null,
    extracted.supplier_name || null,
    extracted.supplier_name_addr || null,
    extracted.telephone_number ? "'" + extracted.telephone_number : null,
    extracted.contact_name || null,
    price || null,
    vat || null,
    extracted.grand_price ? extracted.grand_price.replace(/[^0-9.-]+/g, "") : null,
    displayName,
    fileUrl,
  ])
}

function processIDCard(webhook, blob, extracted, sheet) {
  if (!extracted.id_number) {
    try { webhook.replyToline(['❌ ไม่พบข้อมูลที่จำเป็นบนบัตรประชาชน กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น'], true) } catch (replyErr) {
      Logger.log('Failed to send LINE reply: ' + replyErr)
    }
    return
  }

  // Check for duplicate ID number (id_number is in column 3)
  const lastRow = sheet.getLastRow()
  if (lastRow > 1) {
    const existingIDNumbers = sheet.getRange(2, 3, lastRow - 1, 1).getValues().flat()
    if (existingIDNumbers.includes(extracted.id_number)) {
      try { webhook.replyToline([`⚠️ เลขที่บัตรประชาชน ${extracted.id_number} ซ้ำกับที่มีอยู่แล้ว ไม่มีการบันทึกข้อมูล`], true) } catch (replyErr) {
        Logger.log('Failed to send LINE reply: ' + replyErr)
      }
      return
    }
  }

  const displayName = webhook.profile().displayName

  const replyLines = [
    `🪪 ข้อมูลบัตรประชาชน`,
    `🆔 เลขที่บัตรประชาชน: ${extracted.id_number ?? '-'}`,
    `👤 ชื่อ: ${extracted.prefix ?? ''} ${extracted.first_name_th ?? ''} ${extracted.last_name_th ?? ''}`.trim(),
    `👤 ชื่อ (อังกฤษ): ${extracted.first_name_en ?? ''} ${extracted.last_name_en ?? ''}`.trim(),
    `📅 วันเกิด: ${extracted.date_of_birth ?? '-'}`,
    `🏠 ที่อยู่: ${extracted.address ?? '-'}`,
    `📅 วันออกบัตร: ${extracted.issue_date ?? '-'}`,
    `📅 วันหมดอายุ: ${extracted.expiry_date ?? '-'}`
  ]
  try {
    webhook.replyToline([replyLines.join('\n')], true)
  } catch (replyErr) {
    Logger.log('Failed to send LINE reply: ' + replyErr)
  }
  const file_ext = blob.getContentType().split('/').pop() || 'jpg'
  const fileName = `idcard_${extracted.id_number || Date.now()}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}.${file_ext}`
  const fileUrl = uploadToDropbox(blob, fileName, new Date().getMonth() + 1, "ID_Cards")
  sheet.appendRow([
    '=row()-1',
    new Date(),
    extracted.id_number || null,
    extracted.prefix || null,
    extracted.first_name_th || null,
    extracted.last_name_th || null,
    extracted.first_name_en || null,
    extracted.last_name_en || null,
    extracted.date_of_birth ? new Date(extracted.date_of_birth) : null,
    extracted.address || null,
    extracted.issue_date ? new Date(extracted.issue_date) : null,
    extracted.expiry_date ? new Date(extracted.expiry_date) : null,
    displayName,
    fileUrl,
  ])
}

function processLalaMoveReceipt(webhook, blob, extracted, sheet) {
  if (!extracted.order_number) {
    try { webhook.replyToline(['❌ ไม่พบข้อมูลที่จำเป็นบนใบเสร็จ กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น'], true) } catch (replyErr) {
      Logger.log('Failed to send LINE reply: ' + replyErr)
    }
    return
  }

  // Check for duplicate order number (order_number is in column 4)
  const lastRow = sheet.getLastRow()
  if (lastRow > 1) {
    const existingOrders = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().flat()
    if (existingOrders.includes(extracted.order_number.toString())) {
      try { webhook.replyToline([`⚠️ เลขที่คำสั่งซื้อ ${extracted.order_number} ซ้ำกับที่มีอยู่แล้ว ไม่มีการบันทึกข้อมูล`], true) } catch (replyErr) {
        Logger.log('Failed to send LINE reply: ' + replyErr)
      }
      return
    }
  }

  const price = extracted.delivery_fee ? Number(extracted.delivery_fee.replace(/[^0-9.-]+/g, "")).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
  // Cache profile (HTTP call) before replying
  const displayName = webhook.profile().displayName
  const delevertDateTime = extracted.delivery_date && extracted.delivery_time? new Date(`${extracted.delivery_date}T${extracted.delivery_time.length <= 5 ? extracted.delivery_time + ':00' : extracted.delivery_time}`)
    : null
  // Reply immediately — before the slow Drive upload so user gets instant feedback
  const replyLines = [
    `📃 ข้อมูลใบเสร็จ LalaMove`,
    `🧾 เลขที่ Order: ${extracted.order_number ?? '-'}`,
    `📅 วันจัดส่ง: ${extracted.delivery_date ?? '-'}`,
    `⏰ เวลาจัดส่ง: ${extracted.delivery_time ?? '-'}`,
    `📍 ที่อยู่จัดส่ง: ${extracted.delivery_address ?? '-'}`,
    `👤 ผู้รับ: ${extracted.receiver_name ?? '-'}`,
    `💰 ค่าจัดส่ง: ${price} บาท`,
  ]
  try {
    webhook.replyToline([replyLines.join('\n')], true)
  } catch (replyErr) {
    Logger.log('Failed to send LINE reply: ' + replyErr)
  }

  // Upload to Drive and save to sheet after reply (user already has their data)
  const receiptMonth = extracted.delivery_date ? new Date(extracted.delivery_date).getMonth() + 1 : null
  const file_ext = blob.getContentType().split('/').pop() || 'jpg'
  const fileName = `${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}_${extracted.order_number || Date.now()}.${file_ext}`
  const fileUrl = uploadToDropbox(blob, fileName, receiptMonth, "LalaMove")

  sheet.appendRow([
    '=row()-1',
    new Date(),
    delevertDateTime,
    extracted.order_number || null,
    extracted.delivery_address || null,
    extracted.receiver_name || null,
    price || null,
    displayName,
    fileUrl,
  ])
}

function uploadToDrive(blob, filename, month, folderName) {
  if (folderName === "Receipts") {
    let mainFolderID = '13AxFQXeEgmRAvF9iGA3hQ4__H3kl7zYh' // Receipts folder ID
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
  } else if (folderName === "ID_Cards") {
    let mainFolderID = '15PpmjgWpa1_vbBewQIiI7d60eBE-6lFc' // ID Cards folder ID
    let mainFolder = DriveApp.getFolderById(mainFolderID)
    const file = mainFolder.createFile(blob.setName(filename))
    return file.getId()
  }
}

function getDropboxAccessToken() {
  let prop = PropertiesService.getScriptProperties()
  const url = 'https://api.dropbox.com/oauth2/token';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {
      grant_type: 'refresh_token',
      refresh_token: prop.getProperty('DROPBOX_REFRESH_TOKEN'),
      client_id: prop.getProperty('DROPBOX_CLIENT_ID'),
      client_secret: prop.getProperty('DROPBOX_CLIENT_SECRET')
    }
  });

  const result = JSON.parse(response.getContentText());
  return result.access_token;
}

function uploadToDropbox(blob, fileName, month, folderName, accessToken) {
  accessToken = accessToken || getDropboxAccessToken();
  const url = 'https://content.dropboxapi.com/2/files/upload';
  let path = `/${folderName}/`

  const monthName = ['01_JAN', '02_FEB', '03_MAR', '04_APR', '05_MAY', '06_JUN', '07_JUL', '08_AUG', '09_SEP', '10_OCT', '11_NOV', '12_DEC']
  if (folderName === "Receipts") {
    path += monthName[month - 1] + '/' + fileName
  } else if (folderName === "ID_Cards") {
    path += monthName[month - 1] + '/' + fileName
  } else if (folderName === "LalaMove") {
    path += monthName[month - 1] + '/' + fileName
  }

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/octet-stream',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Dropbox-API-Arg': JSON.stringify({
        path: path,
        mode: 'add',
        autorename: true
      })
    },
    payload: blob
  });
  const result = JSON.parse(response.getContentText());
  const linkResponse = UrlFetchApp.fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    payload: JSON.stringify({ path: result.path_lower })
  });

  const linkData = JSON.parse(linkResponse.getContentText());
  return linkData.url
}


function moveFileToDropbox(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const accessToken = getDropboxAccessToken()
  const summary = {
    receipts: { moved: 0, skipped: 0, failed: 0 },
    idCards: { moved: 0, skipped: 0, failed: 0 }
  }

  // Receipts: payment_date=col3, invoice_number=col4, file_ref/url=col13
  migrateSheetFilesToDropbox({
    sheet: ss.getSheetByName('Receipts'),
    fileRefCol: 13,
    folderName: 'Receipts',
    dateCol: 3,
    nameCol: 4,
    targetSummary: summary.receipts,
    accessToken: accessToken
  })

  // ID_Cards: id_number=col3, file_ref/url=col14
  migrateSheetFilesToDropbox({
    sheet: ss.getSheetByName('ID_Cards'),
    fileRefCol: 14,
    folderName: 'ID_Cards',
    dateCol: null,
    nameCol: 3,
    targetSummary: summary.idCards,
    accessToken: accessToken
  })

  Logger.log('moveFileToDropbox summary: %s', JSON.stringify(summary))
  return summary
}

function migrateSheetFilesToDropbox(options) {
  const sheet = options.sheet
  if (!sheet) return

  const fileRefCol = options.fileRefCol
  const folderName = options.folderName
  const dateCol = options.dateCol
  const nameCol = options.nameCol
  const targetSummary = options.targetSummary
  const accessToken = options.accessToken

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) return

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues()

  values.forEach((row, index) => {
    const rowNumber = index + 2
    const fileRef = row[fileRefCol - 1]

    if (!fileRef) {
      targetSummary.skipped++
      return
    }

    const fileRefText = String(fileRef).trim()

    // Already migrated rows keep a Dropbox URL in the file column.
    if (/^https?:\/\/.*dropbox\.com\//i.test(fileRefText)) {
      targetSummary.skipped++
      return
    }

    try {
      const driveFileId = extractDriveFileId(fileRefText)
      if (!driveFileId) {
        targetSummary.failed++
        Logger.log('Cannot parse Drive file reference at row %s in sheet %s: %s', rowNumber, sheet.getName(), fileRefText)
        return
      }

      const driveFile = DriveApp.getFileById(driveFileId)
      const blob = driveFile.getBlob()

      const nameSeedRaw = row[nameCol - 1] ? String(row[nameCol - 1]).trim() : String(Date.now())
      const nameSeed = sanitizeFileNamePart(nameSeedRaw)
      const ext = inferExtensionFromMime(blob.getContentType())
      const fileName = `${folderName.toLowerCase()}_${nameSeed}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}${ext}`

      let month = new Date().getMonth() + 1
      if (folderName === 'Receipts' && dateCol && row[dateCol - 1] instanceof Date) {
        month = row[dateCol - 1].getMonth() + 1
      }

      const dropboxUrl = uploadToDropbox(blob, fileName, month, folderName, accessToken)
      sheet.getRange(rowNumber, fileRefCol).setValue(dropboxUrl)

      // Move semantics: after successful Dropbox upload and sheet update, trash Drive file.
      driveFile.setTrashed(true)
      targetSummary.moved++
    } catch (err) {
      targetSummary.failed++
      Logger.log('Failed to move row %s in sheet %s: %s', rowNumber, sheet.getName(), err)
    }
  })
}

function inferExtensionFromMime(mimeType) {
  if (!mimeType) return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/gif') return '.gif'
  if (mimeType === 'application/pdf') return '.pdf'
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

function extractDriveFileId(fileRef) {
  if (!fileRef) return null
  const value = String(fileRef).trim()

  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value

  const idFromPath = value.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (idFromPath && idFromPath[1]) return idFromPath[1]

  const idFromQuery = value.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idFromQuery && idFromQuery[1]) return idFromQuery[1]

  return null
}

function sanitizeFileNamePart(value) {
  const clean = String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()
  return clean || String(Date.now())
}

function onOpen() {
  // check if some sheet has files that are not yet moved to Dropbox, and if so, add a menu item to trigger the migration
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  const receiptsSheet = ss.getSheetByName('Receipts')
  const idCardsSheet = ss.getSheetByName('ID_Cards')
  let hasPendingFiles = false

  if (receiptsSheet) {
    const lastRow = receiptsSheet.getLastRow()
    if (lastRow > 1) {
      const fileRefs = receiptsSheet.getRange(2, 13, lastRow - 1, 1).getValues().flat()
      if (fileRefs.some(ref => ref && !/^https?:\/\/.*dropbox\.com\//i.test(String(ref).trim()))) {
        hasPendingFiles = true
      }
    }
  }
  if (idCardsSheet) {
    const lastRow = idCardsSheet.getLastRow()
    if (lastRow > 1) {
      const fileRefs = idCardsSheet.getRange(2, 14, lastRow - 1, 1).getValues().flat()
      if (fileRefs.some(ref => ref && !/^https?:\/\/.*dropbox\.com\//i.test(String(ref).trim()))) {
        hasPendingFiles = true
      }
    }
  }
  if (hasPendingFiles) {
    SpreadsheetApp.getUi().createMenu('File Migration')
      .addItem('Move files to Dropbox', 'moveFileToDropbox')
      .addToUi()
  }
}