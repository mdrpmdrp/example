function doPost(e) {
  if (e.parameter?.action) return hanDleAPI(e)
  Logger = BetterLog.useSpreadsheet()
  try {
    let webhook = LineBotWebhook.init(e, LINE_ACCESS_TOKEN)
    if (webhook.eventType == 'message' && webhook.messageType == 'text') {
      if (webhook.message == '/groupid') {
        webhook.reply(['Group ID ของกลุ่มนี้คือ', webhook.groupId])
      }
    }else if (webhook.eventType == 'message' && webhook.messageType == 'image') {
      handleImage(webhook)
    }
    return webhook.ok
  } catch (e) {
    Logger.log(e)
  }
}

function handleImage(webhook) {
  webhook.showLoading()
  let imageBlob = webhook.file()
  const GEMINI_TOKEN = "AIzaSyDky7SnBApC2CENBa1y26fazWTVjoJgguA"

  const prompt = `Extract the following fields from this receipt image and return a valid JSON object only, no extra text:
{
  "timestamp": "timestamp when the receipt was issued (ISO 8601 or as shown)",
  "payment_date": "payment or transaction date",
  "invoice_number": "invoice or receipt number",
  "supplier_name": "name of the supplier or store",
  "address": "address of the supplier or store",
  "telephone_number": "telephone number",
  "contact_name": "contact person name",
  "price": "subtotal price before VAT",
  "vat_includes": "VAT amount",
  "grand_price": "grand total / final amount",
  "line_id": "LINE ID if present"
}
If a field is not found, set its value to null.`

  const base64Image = Utilities.base64Encode(imageBlob.getBytes())
  const mimeType = imageBlob.getContentType() || 'image/jpeg'

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ]
  }

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${GEMINI_TOKEN}`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  )

  const result = JSON.parse(response.getContentText())
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  let extracted = {}
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0])
  } catch (err) {
    Logger.log('Failed to parse Gemini response: ' + err)
  }

  Logger.log(JSON.stringify(extracted))

  if (!extracted.invoice_number) {
    webhook.reply(['ไม่ใช่ภาพใบเสร็จ'])
    return
  }

  const replyLines = [
    `ข้อมูลใบเสร็จ`,
    `วันที่: ${extracted.payment_date ?? '-'}`,
    `Timestamp: ${extracted.timestamp ?? '-'}`,
    `เลขที่ใบแจ้งหนี้: ${extracted.invoice_number ?? '-'}`,
    `ผู้จำหน่าย: ${extracted.supplier_name ?? '-'}`,
    `ที่อยู่: ${extracted.address ?? '-'}`,
    `โทร: ${extracted.telephone_number ?? '-'}`,
    `ผู้ติดต่อ: ${extracted.contact_name ?? '-'}`,
    `ราคา: ${extracted.price ?? '-'}`,
    `VAT: ${extracted.vat_includes ?? '-'}`,
    `ยอดรวม: ${extracted.grand_price ?? '-'}`,
    `LINE ID: ${extracted.line_id ?? '-'}`
  ]

  webhook.reply([replyLines.join('\n')])
}