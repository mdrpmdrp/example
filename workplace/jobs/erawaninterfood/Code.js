const CONFIG = {
  spreadsheetName: 'Erawan Interfood Applications',
  rootFolderName: 'Erawan Interfood Applications',
  tempFolderName: 'Temp Uploads',
  recordsFolderName: 'Records',
  sheets: {
    th: 'THAI_APPLICATIONS',
    my: 'MYANMAR_APPLICATIONS',
    statusLog: 'STATUS_LOG',
    config: 'CONFIG',
    interviewControl: 'INTERVIEW_CALLER',
  },
}

const STATUS_OPTIONS = [
  '1. รับใบสมัครแล้ว',
  '02. เรียกสัมภาษณ์',
  'ผ่านสัมภาษณ์',
  'ไม่ผ่านสัมภาษณ์',
  'ตรวจสุขภาพ',
  'ผลตรวจสุขภาพผ่าน',
  'ผลตรวจสุขภาพไม่ผ่าน',
  'รอยืนยัน',
  'ยืนยัน',
  'ยกเลิก',
]

const STATUS_LOG_HEADERS = [
  'editedAt',
  'sheetName',
  'recordId',
  'fromStatus',
  'toStatus',
  'editorEmail',
]

const INTERVIEW_CONTROL_HEADERS = [
  'field',
  'value',
  'note',
]

const INTERVIEW_LINE_TOKEN_KEYS = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_PUSH_ACCESS_TOKEN',
]

const INTERVIEW_CONTROL_CELLS = {
  nationality: 'B5',
  gender: 'B6',
  interviewDate: 'B7',
  interviewTime: 'B8',
}

const FLEX_THEME = {
  header: '#1c2e77',
  headerSoft: '#dbe4ff',
  bodyText: '#0f172a',
  mutedText: '#5b6788',
}

function doGet(e) {
  return handleRequest_(e)
}

function doPost(e) {
  return handleRequest_(e)
}

function onOpen() {
  const ui = SpreadsheetApp.getUi()
  ui.createMenu('Erawan Interview')
    .addItem('ตั้งค่าชีทเรียกสัมภาษณ์', 'setupInterviewCallerSheet')
    .addItem('เรียกผู้สมัครคนถัดไป', 'callInterviewCandidate')
    .addToUi()
}

function handleRequest_(e) {
  Logger = BetterLog.useSpreadsheet();
  try {
    const request = parseRequest_(e)
    return routeAction_(request.action, request.payload)
  } catch (e) {
     e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'');
    return jsonResponse_({
      ok: false,
      error: e && e.message ? e.message : String(e),
    })
  }
}

function parseRequest_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents)
    } catch (error) {
      throw new Error('Invalid JSON body')
    }
  }

  const action = e && e.parameter && e.parameter.action ? String(e.parameter.action) : ''
  const payload = e && e.parameter && e.parameter.payload ? safeJsonParse_(e.parameter.payload) : {}
  return { action, payload }
}

function routeAction_(action, payload) {
  switch (action) {
    case 'initSheets':
      return initAllSheets()
    case 'getUploadAuth':
      return getUploadAuth()
    case 'deleteFiles':
      return deleteFiles_(payload)
    case 'upsertRecord':
      return upsertRecord_(payload)
    case 'movefilestorecordfolder':
      return moveFilesToRecordFolder_(payload)
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

function initAllSheets() {
  return withScriptLock_(30000, () => {
    const spreadsheet = getOrCreateSpreadsheet_()
    const sheets = {
      th: ensureSheet_(spreadsheet, CONFIG.sheets.th, thaiHeaders_()),
      my: ensureSheet_(spreadsheet, CONFIG.sheets.my, myanmarHeaders_()),
      statusLog: ensureSheet_(spreadsheet, CONFIG.sheets.statusLog, STATUS_LOG_HEADERS),
      config: ensureSheet_(spreadsheet, CONFIG.sheets.config, ['key', 'value', 'updatedAt']),
      interviewControl: ensureInterviewControlSheet_(spreadsheet),
    }

    applyStatusValidation_(sheets.th, thaiHeaders_().length)
    applyStatusValidation_(sheets.my, myanmarHeaders_().length)
    ensureStatusEditTrigger_()

    const folders = ensureFolders_()
    writeConfigValue_('spreadsheetId', spreadsheet.getId())
    writeConfigValue_('rootFolderId', folders.root.getId())
    writeConfigValue_('tempFolderId', folders.temp.getId())
    writeConfigValue_('recordsFolderId', folders.records.getId())

    return jsonResponse_({
      ok: true,
      data: {
        spreadsheetId: spreadsheet.getId(),
        sheetNames: Object.values(CONFIG.sheets),
        folders: {
          rootFolderId: folders.root.getId(),
          tempFolderId: folders.temp.getId(),
          recordsFolderId: folders.records.getId(),
        },
      },
    })
  })
}

function setupInterviewCallerSheet() {
  return withScriptLock_(10000, () => {
    const spreadsheet = getOrCreateSpreadsheet_()
    const sheet = ensureInterviewControlSheet_(spreadsheet)
    spreadsheet.setActiveSheet(sheet)

    showSpreadsheetAlert_(
      'ตั้งค่าชีทเรียกสัมภาษณ์แล้ว',
      'กรุณาเลือกสัญชาติ เพศ และวันที่ในชีท INTERVIEW_CALLER แล้วกดปุ่มเรียกสัมภาษณ์',
    )

    return true
  })
}

function ensureInterviewControlSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.sheets.interviewControl)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.sheets.interviewControl)
  }

  sheet.setHiddenGridlines(true)
  sheet.getRange('A1:F20').breakApart()
  sheet.getRange('D2:F12').clearContent().clearFormat()

  const maxColumns = Math.max(sheet.getMaxColumns(), 6)
  if (sheet.getMaxColumns() < maxColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), maxColumns - sheet.getMaxColumns())
  }

  sheet.getRange('A1:F1').merge()
  sheet.getRange('A1').setValue('INTERVIEW CALLER')
  sheet.getRange('A1:F1').setBackground('#1c2e77').setFontColor('#ffffff').setFontWeight('bold').setFontSize(16)
  sheet.getRange('A1').setHorizontalAlignment('center').setVerticalAlignment('middle')

  sheet.getRange('A2:C2').merge()
  sheet.getRange('A2').setValue('เลือกสัญชาติ เพศ และวันที่สัมภาษณ์ แล้วกดปุ่มเรียกผู้สมัครคนถัดไป')
    .setBackground('#dbe4ff')
    .setFontColor('#1c2e77')
    .setFontWeight('bold')
    .setWrap(true)
  sheet.getRange('A2:C2').setBorder(true, true, true, true, true, true, '#bac8ff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)

  sheet.getRange('A4:C4').merge()
  sheet.getRange('A4').setValue('ส่วนกรองผู้สมัคร')
    .setBackground('#f8f9fc')
    .setFontWeight('bold')
    .setFontColor('#243b63')
  sheet.getRange('A5').setValue('Nationality')
    .setBackground('#f1f3f9')
    .setFontWeight('bold')
    .setFontColor('#1f2937')
    .setHorizontalAlignment('center')
  sheet.getRange('B5').setValue('ไทย')
    .setBackground('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
  sheet.getRange('C5').setValue('เลือก ไทย / เมียนมา')
    .setFontColor('#667085')

  sheet.getRange('A6').setValue('Gender')
    .setBackground('#f1f3f9')
    .setFontWeight('bold')
    .setFontColor('#1f2937')
    .setHorizontalAlignment('center')
  sheet.getRange('B6').setValue('ชาย')
    .setBackground('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
  sheet.getRange('C6').setValue('เลือก ชาย / หญิง')
    .setFontColor('#667085')

  sheet.getRange('A7').setValue('Interview date')
    .setBackground('#f1f3f9')
    .setFontWeight('bold')
    .setFontColor('#1f2937')
    .setHorizontalAlignment('center')
  sheet.getRange('B7').setValue(new Date())
    .setBackground('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
  sheet.getRange('C7').setValue('ระบุวันที่จะเรียกสัมภาษณ์')
    .setFontColor('#667085')

  sheet.getRange('A8').setValue('Interview time')
    .setBackground('#f1f3f9')
    .setFontWeight('bold')
    .setFontColor('#1f2937')
    .setHorizontalAlignment('center')
  sheet.getRange('B8').setValue(new Date())
    .setBackground('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
  sheet.getRange('C8').setValue('ระบุเวลานัดสัมภาษณ์')
    .setFontColor('#667085')

  sheet.getRange('A9:C9').merge()
  sheet.getRange('A9').setValue('โซนปุ่มกด')
    .setBackground('#f8f9fc')
    .setFontWeight('bold')
    .setFontColor('#243b63')

  sheet.getRange('A10:C11').merge()
  sheet.getRange('A10').setValue(
    'กดเมนู Erawan Interview > เรียกผู้สมัครคนถัดไป\nหรือ assign script: callInterviewCandidate',
  ).setWrap(true).setVerticalAlignment('middle')
    .setBackground('#e7f5ff')
    .setFontColor('#0c4a6e')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#a5d8ff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)

  if (!sheet.getRange(INTERVIEW_CONTROL_CELLS.nationality).getValue()) {
    sheet.getRange(INTERVIEW_CONTROL_CELLS.nationality).setValue('ไทย')
  }
  if (!sheet.getRange(INTERVIEW_CONTROL_CELLS.gender).getValue()) {
    sheet.getRange(INTERVIEW_CONTROL_CELLS.gender).setValue('ชาย')
  }
  if (!sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewDate).getValue()) {
    sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewDate).setValue(new Date())
  }
  if (!sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewTime).getValue()) {
    sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewTime).setValue(new Date())
  }

  sheet.getRange('A5:C8').setVerticalAlignment('middle').setWrap(true)

  sheet.setFrozenRows(1)
  sheet.setRowHeights(1, 11, 34)
  sheet.setRowHeights(10, 2, 42)
  sheet.setColumnWidths(1, 3, 240)
  sheet.setColumnWidths(4, 3, 40)

  const nationalityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ไทย', 'เมียนมา'], true)
    .setAllowInvalid(false)
    .build()

  const genderRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ชาย', 'หญิง'], true)
    .setAllowInvalid(false)
    .build()

  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build()
  const timeValidationBuilder = SpreadsheetApp.newDataValidation()
  const timeRule = typeof timeValidationBuilder.requireTime === 'function'
    ? timeValidationBuilder.requireTime().setAllowInvalid(false).build()
    : null

  sheet.getRange(INTERVIEW_CONTROL_CELLS.nationality).setDataValidation(nationalityRule)
  sheet.getRange(INTERVIEW_CONTROL_CELLS.gender).setDataValidation(genderRule)
  sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewDate).setDataValidation(dateRule)
  if (timeRule) {
    sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewTime).setDataValidation(timeRule)
  }
  sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewDate).setNumberFormat('dd/MM/yyyy')
  sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewTime).setNumberFormat('hh:mm')
  sheet.setTabColor('#1c2e77')

  return sheet
}

function readInterviewCriteria_(sheet) {
  const nationality = String(sheet.getRange(INTERVIEW_CONTROL_CELLS.nationality).getValue() || '').trim()
  const gender = String(sheet.getRange(INTERVIEW_CONTROL_CELLS.gender).getValue() || '').trim()
  const interviewDate = normalizeInterviewDate_(sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewDate).getValue())
  const interviewTime = normalizeInterviewTime_(sheet.getRange(INTERVIEW_CONTROL_CELLS.interviewTime).getValue())

  if (!nationality) {
    throw new Error('กรุณาเลือกสัญชาติ')
  }
  if (!gender) {
    throw new Error('กรุณาเลือกเพศ')
  }
  if (!interviewDate) {
    throw new Error('กรุณาเลือกวันที่สัมภาษณ์')
  }
  if (!interviewTime) {
    throw new Error('กรุณาเลือกเวลาสัมภาษณ์')
  }

  return {
    nationality,
    gender,
    interviewDate,
    interviewTime,
  }
}

function normalizeInterviewDate_(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return date
}

function normalizeInterviewTime_(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return date
}

function findNextInterviewCandidate_(spreadsheet, criteria) {
  const selection = normalizeNationalitySelection_(criteria.nationality)
  const sheet = spreadsheet.getSheetByName(selection.sheetName)
  if (!sheet) {
    throw new Error(`ไม่พบชีท ${selection.sheetName}`)
  }

  const lastRow = sheet.getLastRow()
  const lastColumn = sheet.getLastColumn()
  if (lastRow <= 1 || lastColumn <= 0) return null

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
  const statusColumnIndex = getColumnIndexByHeader_(headers, 'status')
  const genderColumnIndex = getColumnIndexByHeader_(headers, 'gender')
  const nationalityColumnIndex = getColumnIndexByHeader_(headers, 'nationality')
  const recordIdColumnIndex = getColumnIndexByHeader_(headers, 'recordId')
  const userIdColumnIndex = getColumnIndexByHeader_(headers, 'userId')
  const displayNameColumnIndex = getColumnIndexByHeader_(headers, 'displayName')
  const fullNameColumnIndex = getColumnIndexByHeader_(headers, 'fullName')
  const myNameColumnIndex = getColumnIndexByHeader_(headers, 'name')
  const thaiPhotoUrlColumnIndex = getColumnIndexByHeader_(headers, 'thaiPhotoUrl')
  const myPhotoUrlColumnIndex = getColumnIndexByHeader_(headers, 'myPhotoUrl')

  for (let i = 0; i < values.length; i++) {
    const row = values[i]
    const status = statusColumnIndex > 0 ? row[statusColumnIndex - 1] : ''
    if (!isApplicationReceivedStatus_(status)) continue

    const genderValue = genderColumnIndex > 0 ? row[genderColumnIndex - 1] : ''
    if (normalizeGenderCode_(genderValue) !== normalizeGenderCode_(criteria.gender)) continue

    if (selection.sheetName === CONFIG.sheets.th && nationalityColumnIndex > 0) {
      const nationalityValue = String(row[nationalityColumnIndex - 1] || '').trim()
      if (nationalityValue) {
        const normalizedNationality = normalizeNationalityValue_(nationalityValue)
        if (normalizedNationality !== 'TH') continue
      }
    }

    const rowIndex = i + 2
    const recordId = recordIdColumnIndex > 0 ? String(row[recordIdColumnIndex - 1] || '').trim() : ''
    const userId = userIdColumnIndex > 0 ? String(row[userIdColumnIndex - 1] || '').trim() : ''
    if (!recordId || !userId) continue

    const fullName = fullNameColumnIndex > 0 ? String(row[fullNameColumnIndex - 1] || '').trim() : ''
    const displayName = displayNameColumnIndex > 0 ? String(row[displayNameColumnIndex - 1] || '').trim() : ''
    const myName = myNameColumnIndex > 0 ? String(row[myNameColumnIndex - 1] || '').trim() : ''
    const photoUrl = selection.language === 'th'
      ? (thaiPhotoUrlColumnIndex > 0 ? String(row[thaiPhotoUrlColumnIndex - 1] || '').trim() : '')
      : (myPhotoUrlColumnIndex > 0 ? String(row[myPhotoUrlColumnIndex - 1] || '').trim() : '')

    return {
      sheet,
      sheetName: selection.sheetName,
      rowIndex,
      recordId,
      userId,
      displayName,
      fullName,
      name: myName,
      photoUrl,
      gender: genderValue,
      language: selection.language,
      nationality: selection.displayName,
      status,
      statusColumnIndex,
    }
  }

  return null
}

function normalizeNationalitySelection_(value) {
  const normalized = normalizeTextValue_(value)
  if (['ไทย', 'thai', 'th', 'thailand'].includes(normalized)) {
    return {
      sheetName: CONFIG.sheets.th,
      language: 'th',
      displayName: 'ไทย',
    }
  }

  if (['เมียนมา', 'myanmar', 'my', 'မြန်မာ'].includes(normalized)) {
    return {
      sheetName: CONFIG.sheets.my,
      language: 'my',
      displayName: 'เมียนมา',
    }
  }

  throw new Error('กรุณาเลือกสัญชาติให้ถูกต้อง')
}

function normalizeNationalityValue_(value) {
  const normalized = normalizeTextValue_(value)
  if (['ไทย', 'thai', 'th', 'thailand'].includes(normalized)) return 'TH'
  if (['เมียนมา', 'myanmar', 'my', 'မြန်မာ'].includes(normalized)) return 'MY'
  return normalized.toUpperCase()
}

function normalizeTextValue_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function getColumnIndexByHeader_(headers, headerName) {
  if (!Array.isArray(headers) || !headers.length) return 0
  const target = String(headerName || '').trim().toLowerCase()
  const index = headers.findIndex((header) => String(header || '').trim().toLowerCase() === target)
  return index >= 0 ? index + 1 : 0
}

function isApplicationReceivedStatus_(value) {
  return normalizeStatusLabel_(value) === 'รับใบสมัครแล้ว'
}

function normalizeStatusLabel_(value) {
  return String(value || '')
    .trim()
    .replace(/^\d+\s*[\.\)]?\s*/, '')
}

function buildInterviewInstructionText_(language, interviewDateText, interviewTimeText) {
  if (language === 'my') {
    return [
      'အင်တာဗျူးဖိတ်ကြားချက်',
      `အင်တာဗျူးရက် - ${interviewDateText}`,
      `အချိန် - ${interviewTimeText}`,
      '\n\n',
      'ကျေးဇူးပြု၍ အတည်ပြုရန် ပြန်လည်ဆက်သွယ်ပေးပါ သို့မဟုတ် မလာနိုင်ပါက ကြိုတင်အသိပေးပါ။',
      'အောက်ပါ Flex message ကို အင်တာဗျူးနေ့တွင် ကုမ္ပဏီဝန်ထမ်းထံ ပြသပေးပါ။',
    ].join('\n')
  }

  return [
    'แจ้งเรียกสัมภาษณ์',
    `กำหนดวันสัมภาษณ์: ${interviewDateText}`,
    `เวลา: ${interviewTimeText}`,
    '\n\n',
    'กรุณาติดต่อกลับเพื่อยืนยันนัดหมาย หรือแจ้งหากไม่สะดวกเข้าสัมภาษณ์',
    'กรุณาแสดง Flex message นี้ให้เจ้าหน้าที่บริษัทในวันสัมภาษณ์',
  ].join('\n')
}

function buildInterviewAltText_(match, interviewDateText) {
  const name = match.fullName || match.name || match.displayName || match.recordId
  return `${match.recordId} ${name} ${interviewDateText}`
}

function buildInterviewFlexMessage_(match, interviewDateText, interviewTimeText) {
  if (match.language === 'my') {
    return buildInterviewFlexMessageMyanmar_(match, interviewDateText, interviewTimeText)
  }

  return buildInterviewFlexMessageThai_(match, interviewDateText, interviewTimeText)
}

function buildInterviewFlexMessageThai_(match, interviewDateText, interviewTimeText) {
  const name = match.fullName || match.displayName || match.recordId
  const photoUrl = match.photoUrl || getDefaultInterviewPhotoUrl_()
  return {
    type: 'bubble',
    size: 'giga',
    hero: {
      type: 'image',
      url: photoUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        uri: photoUrl,
      },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            { type: 'text', text: 'เรียกสัมภาษณ์', weight: 'bold', size: 'xl', color: FLEX_THEME.bodyText, wrap: true },
            { type: 'text', text: 'กรุณาแสดง Flex นี้ให้เจ้าหน้าที่บริษัทในวันสัมภาษณ์', size: 'sm', color: FLEX_THEME.mutedText, wrap: true },
          ],
        },
        {
          type: 'separator',
          margin: 'md',
        },
        buildInterviewFlexRow_('record id', match.recordId),
        buildInterviewFlexRow_('ชื่อ', name),
        buildInterviewFlexRow_('กำหนดวันสัมภาษณ์', interviewDateText),
        buildInterviewFlexRow_('เวลา', interviewTimeText),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'กรุณาติดต่อกลับเพื่อยืนยันนัดหมาย หรือแจ้งหากไม่สะดวกเข้าสัมภาษณ์',
          size: 'xs',
          color: FLEX_THEME.mutedText,
          wrap: true,
          align: 'center',
        },
      ],
    },
  }
}

function buildInterviewFlexMessageMyanmar_(match, interviewDateText, interviewTimeText) {
  const name = match.name || match.displayName || match.recordId
  const photoUrl = match.photoUrl || getDefaultInterviewPhotoUrl_()
  return {
    type: 'bubble',
    size: 'giga',
    hero: {
      type: 'image',
      url: photoUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        uri: photoUrl,
      },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            { type: 'text', text: 'အင်တာဗျူးခေါ်ဆိုမှု', weight: 'bold', size: 'xl', color: FLEX_THEME.bodyText, wrap: true },
            { type: 'text', text: 'အင်တာဗျူးနေ့တွင် ကုမ္ပဏီဝန်ထမ်းထံ ပြသပေးပါ', size: 'sm', color: FLEX_THEME.mutedText, wrap: true },
          ],
        },
        {
          type: 'separator',
          margin: 'md',
        },
        buildInterviewFlexRow_('record id', match.recordId),
        buildInterviewFlexRow_('အမည်', name),
        buildInterviewFlexRow_('အင်တာဗျူးရက်', interviewDateText),
        buildInterviewFlexRow_('အချိန်', interviewTimeText),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'ကျေးဇူးပြု၍ ပြန်လည်ဆက်သွယ်ကာ ချိန်းဆိုချက်ကို အတည်ပြုပါ သို့မဟုတ် မလာနိုင်ပါက ကြိုတင်အသိပေးပါ',
          size: 'xs',
          color: FLEX_THEME.mutedText,
          wrap: true,
          align: 'center',
        },
      ],
    },
  }
}

function buildInterviewFlexRow_(label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: label,
        size: 'sm',
        color: FLEX_THEME.mutedText,
        flex: 2,
      },
      {
        type: 'text',
        text: value || '-',
        size: 'sm',
        color: FLEX_THEME.bodyText,
        weight: 'bold',
        wrap: true,
        align: 'end',
        flex: 3,
      },
    ],
  }
}

function getDefaultInterviewPhotoUrl_() {
  return 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png'
}

function formatInterviewDateText_(value, language) {
  const date = normalizeInterviewDate_(value)
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch (error) {
    return Utilities.formatDate(date, 'Asia/Bangkok', 'd MMM yyyy')
  }
}

function formatInterviewTimeText_(value) {
  const date = normalizeInterviewTime_(value)
  if (!date) return '-'

  try {
    return `${Utilities.formatDate(date, 'Asia/Bangkok', 'HH:mm')} น.`
  } catch (error) {
    return `${Utilities.formatDate(date, 'Asia/Bangkok', 'HH:mm')} น.`
  }
}

function combineInterviewDateTime_(interviewDate, interviewTime) {
  const datePart = normalizeInterviewDate_(interviewDate)
  const timePart = normalizeInterviewTime_(interviewTime)
  if (!datePart || !timePart) return datePart || timePart || null

  const combined = new Date(datePart)
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0)
  return combined
}

function getLineChannelAccessToken_() {
  const props = PropertiesService.getScriptProperties()
  for (let i = 0; i < INTERVIEW_LINE_TOKEN_KEYS.length; i++) {
    const key = INTERVIEW_LINE_TOKEN_KEYS[i]
    const token = String(props.getProperty(key) || '').trim()
    if (token) return token
  }

  throw new Error('กรุณาตั้งค่า Script Property ชื่อ LINE_CHANNEL_ACCESS_TOKEN')
}

function pushLineMessages_(channelAccessToken, toUserId, messages) {
  if (!channelAccessToken) {
    throw new Error('LINE channel access token is required')
  }
  if (!toUserId) {
    throw new Error('LINE userId is required')
  }
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('LINE messages are required')
  }

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify({
      to: toUserId,
      messages,
    }),
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
  })

  const status = response.getResponseCode()
  if (status < 200 || status >= 300) {
    throw new Error(`LINE push failed (${status}): ${response.getContentText()}`)
  }
}

function updateCandidateStatus_(match, toStatus) {
  const fromStatus = String(match.status || '').trim()
  match.sheet.getRange(match.rowIndex, match.statusColumnIndex).setValue(toStatus)

  const editedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm:ss',
  )
  const editorEmail = Session.getEffectiveUser().getEmail()
  appendStatusLogRow_(match.sheet.getParent(), [
    editedAt,
    match.sheetName,
    match.recordId,
    fromStatus,
    toStatus,
    editorEmail || 'script',
  ])
}

function showSpreadsheetAlert_(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK)
  } catch (error) {
    console.log(`${title}: ${message}`)
  }
}

function callInterviewCandidate() {
  return withScriptLock_(30000, () => {
    const spreadsheet = getOrCreateSpreadsheet_()
    const controlSheet = ensureInterviewControlSheet_(spreadsheet)
    const criteria = readInterviewCriteria_(controlSheet)
    const match = findNextInterviewCandidate_(spreadsheet, criteria)

    if (!match) {
      showSpreadsheetAlert_(
        'ไม่พบข้อมูล',
        'ไม่พบผู้สมัครที่มีสถานะ 1. รับใบสมัครแล้ว ตามสัญชาติและเพศที่เลือก',
      )
      return jsonResponse_({
        ok: false,
        error: 'No matching candidate found',
      })
    }

    const lineToken = getLineChannelAccessToken_()
    const interviewDateTime = combineInterviewDateTime_(criteria.interviewDate, criteria.interviewTime)
    const interviewDateText = formatInterviewDateText_(interviewDateTime, match.language)
    const interviewTimeText = formatInterviewTimeText_(interviewDateTime)
    const textMessage = buildInterviewInstructionText_(match.language, interviewDateText, interviewTimeText)
    const flexMessage = buildInterviewFlexMessage_(match, interviewDateText, interviewTimeText)
    const messages = [
      {
        type: 'flex',
        altText: buildInterviewAltText_(match, interviewDateText),
        contents: flexMessage,
      },
      {
        type: 'text',
        text: textMessage,
      },
    ]

    pushLineMessages_(lineToken, match.userId, messages)

    const updatedStatus = '02. เรียกสัมภาษณ์'
    updateCandidateStatus_(match, updatedStatus)

    showSpreadsheetAlert_(
      'ส่งข้อมูลแล้ว',
      `เรียกสัมภาษณ์ผู้สมัคร ${match.displayName || match.fullName || match.name || match.recordId} เรียบร้อยแล้ว`,
    )

  })
}

function handleStatusEdit_(e) {
  if (!e || !e.range || !e.source) return

  const range = e.range
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return

  const sheet = range.getSheet()
  const sheetName = String(sheet.getName() || '')
  if (![CONFIG.sheets.th, CONFIG.sheets.my].includes(sheetName)) return
  if (range.getRow() === 1) return

  const statusColumnIndex = getStatusColumnIndex_(sheet)
  if (!statusColumnIndex || range.getColumn() !== statusColumnIndex) return

  const newStatus = String(range.getValue() || '').trim()
  const oldStatus = typeof e.oldValue === 'undefined' ? '' : String(e.oldValue || '').trim()
  if (newStatus === oldStatus) return

  const recordId = String(sheet.getRange(range.getRow(), 1).getValue() || '').trim()
  const editedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm:ss',
  )
  const editorEmail = getEditorEmail_(e)

  appendStatusLogRow_(e.source, [editedAt, sheetName, recordId, oldStatus, newStatus, editorEmail])
}

function getUploadAuth() {
  const folders = ensureFolders_()
  return jsonResponse_({
    accessToken: ScriptApp.getOAuthToken(),
    folderId: folders.temp.getId(),
  })
}

function deleteFiles_(payload) {
  const fileIds = Array.isArray(payload && payload.fileIds) ? payload.fileIds : []
  const deleted = deleteFilesWithBatchRequest_(fileIds)
  return jsonResponse_({
    ok: true,
    data: { deletedIds: deleted },
  })
}

function deleteFilesWithBatchRequest_(fileIds) {
  const ids = (Array.isArray(fileIds) ? fileIds : [])
    .map((fileId) => String(fileId || '').trim())
    .filter(Boolean)

  if (!ids.length) return []

  if (typeof BatchRequest !== 'undefined' && BatchRequest && typeof BatchRequest.EDo === 'function') {
    const batchPath = typeof BatchRequest.getBatchPath === 'function'
      ? BatchRequest.getBatchPath('drive', 'v3')
      : 'batch/drive/v3'

    const requests = ids.map((fileId) => ({
      method: 'DELETE',
      endpoint: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      accessToken: ScriptApp.getOAuthToken(),
    }))

    BatchRequest.EDo({
      batchPath,
      requests,
      accessToken: ScriptApp.getOAuthToken(),
    })
    return ids
  }

  const deleted = []
  ids.forEach((fileId) => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true)
      deleted.push(fileId)
    } catch (error) {
      console.warn(`Failed to delete file ${fileId}: ${error && error.message ? error.message : error}`)
    }
  })
  return deleted
}

function upsertRecord_(payload) {
  const record = payload && payload.record ? payload.record : null
  if (!record) {
    throw new Error('record is required')
  }

  if (record.language === 'my') {
    normalizeMyanmarRecord_(record)
  }

  return withScriptLock_(30000, () => {
    const spreadsheet = getOrCreateSpreadsheet_()
    const language = record.language === 'my' ? 'my' : 'th'
    if (!String(record.status || '').trim()) {
      record.status = '1. รับใบสมัครแล้ว'
    }

    if (!isGeneratedRecordId_(record.recordId)) {
      record.recordId = generateRecordId_(spreadsheet, language, record.applicant || {})
    }

    const sheet = ensureSheet_(spreadsheet, language === 'th' ? CONFIG.sheets.th : CONFIG.sheets.my, language === 'th' ? thaiHeaders_() : myanmarHeaders_())
    const row = language === 'th' ? recordToThaiRow_(record) : recordToMyanmarRow_(record)
    const rowIndex = findRowIndexByRecordId_(sheet, record.recordId)

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row])
    } else {
      sheet.appendRow(row)
    }
    return jsonResponse_({
      ok: true,
      data: {
        recordId: record.recordId,
        sheetName: language === 'th' ? CONFIG.sheets.th : CONFIG.sheets.my,
      },
    })
  })
}

function generateRecordId_(spreadsheet, language, applicant) {
  const prefix = language === 'my' ? 'MY' : 'TH'
  const genderCode = normalizeGenderCode_(applicant && applicant.gender)
  const nextSequence = getNextRecordSequence_(spreadsheet, prefix, genderCode)
  return `${prefix}-${genderCode}-${String(nextSequence).padStart(5, '0')}`
}

function getNextRecordSequence_(spreadsheet, prefix, genderCode) {
  const sheet = ensureSheet_(spreadsheet, prefix === 'MY' ? CONFIG.sheets.my : CONFIG.sheets.th, prefix === 'MY' ? myanmarHeaders_() : thaiHeaders_())
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return 1

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
  const pattern = new RegExp(`^${prefix}-${genderCode}-(\\d{5})$`)
  let maxSequence = 0

  values.forEach((row) => {
    const recordId = String(row[0] || '')
    const match = recordId.match(pattern)
    if (!match) return
    maxSequence = Math.max(maxSequence, Number(match[1]))
  })

  return maxSequence + 1
}

function normalizeGenderCode_(genderValue) {
  const value = String(genderValue || '').trim().toLowerCase()
  if (['f', 'female', 'หญิง', 'หญิงสาว', 'မိန်းမ'].includes(value)) return 'F'
  if (['m', 'male', 'ชาย', 'ကျား'].includes(value)) return 'M'
  return 'M'
}

function isGeneratedRecordId_(recordId) {
  return /^(TH|MY)-(M|F)-\d{5}$/.test(String(recordId || ''))
}

function moveFilesToRecordFolder_(payload) {
  const recordId = payload && payload.recordId ? String(payload.recordId) : ''
  const attachments = Array.isArray(payload && payload.attachments) ? payload.attachments : []
  if (!recordId) {
    throw new Error('recordId is required')
  }
  if (!attachments.length) {
    return jsonResponse_({
      ok: true,
      data: { recordId, movedIds: [] },
    })
  }

  const folders = ensureFolders_()
  const recordsFolder = folders.records
  const recordFolder = getOrCreateChildFolder_(recordsFolder, recordId)
  const movedIds = moveFilesWithBatchRequest_(attachments, folders.temp.getId(), recordFolder.getId())

  return jsonResponse_({
    ok: true,
    data: {
      recordId,
      folderId: recordFolder.getId(),
      movedIds,
    },
  })
}

function moveFilesWithBatchRequest_(attachments, sourceFolderId, destinationFolderId) {
  const fileIds = (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => String(attachment && attachment.id ? attachment.id : '').trim())
    .filter(Boolean)

  if (!fileIds.length) return []

  if (typeof BatchRequest !== 'undefined' && BatchRequest && typeof BatchRequest.EDo === 'function') {
    const batchPath = typeof BatchRequest.getBatchPath === 'function'
      ? BatchRequest.getBatchPath('drive', 'v3')
      : 'batch/drive/v3'

    const requests = fileIds.map((fileId) => ({
      method: 'PATCH',
      endpoint: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(destinationFolderId)}&removeParents=${encodeURIComponent(sourceFolderId)}&fields=id,parents`,
      accessToken: ScriptApp.getOAuthToken(),
    }))

    BatchRequest.EDo({
      batchPath,
      requests,
      accessToken: ScriptApp.getOAuthToken(),
    })
    return fileIds
  }

  fileIds.forEach((fileId) => {
    try {
      const file = DriveApp.getFileById(fileId)
      DriveApp.getFolderById(destinationFolderId).addFile(file)
      try {
        DriveApp.getFolderById(sourceFolderId).removeFile(file)
      } catch (error) {
        // The file may already have been removed from the source folder.
      }
    } catch (error) {
      console.warn(`Failed to move file ${fileId}: ${error && error.message ? error.message : error}`)
    }
  })

  return fileIds
}

function ensureFolders_() {
  const props = PropertiesService.getScriptProperties()
  const rootId = props.getProperty('ROOT_FOLDER_ID')
  const tempId = props.getProperty('TEMP_FOLDER_ID')
  const recordsId = props.getProperty('RECORDS_FOLDER_ID')

  const root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.createFolder(CONFIG.rootFolderName)
  const temp = tempId ? DriveApp.getFolderById(tempId) : getOrCreateChildFolder_(root, CONFIG.tempFolderName)
  const records = recordsId ? DriveApp.getFolderById(recordsId) : getOrCreateChildFolder_(root, CONFIG.recordsFolderName)

  props.setProperty('ROOT_FOLDER_ID', root.getId())
  props.setProperty('TEMP_FOLDER_ID', temp.getId())
  props.setProperty('RECORDS_FOLDER_ID', records.getId())

  return { root, temp, records }
}

function getOrCreateSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName)
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns())
  }

  const currentHeader = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : []
  const headerMatches = currentHeader.length === headers.length && headers.every((header, index) => String(currentHeader[index] || '') === String(header))

  if (sheet.getLastRow() === 0 || !headerMatches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
    const extraColumns = sheet.getLastColumn() - headers.length
    if (extraColumns > 0) {
      sheet.getRange(1, headers.length + 1, 1, extraColumns).clearContent()
    }
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  }

  return sheet
}

function thaiHeaders_() {
  return [
    'recordId',
    'createdAt',
    'userId',
    'displayName',
    'gender',
    'fullName',
    'dob',
    'age',
    'nationality',
    'cardNumber',
    'education',
    'experience',
    'specialSkill',
    'position',
    'shiftAble',
    'phone',
    'thaiPhotoUrl',
    'thaiIdCardUrl',
    'thaiHouseholdUrl',
    'thaiEducationCertUrl',
    'thaiWorkCertUrl',
    'attachmentsJson',
    'rawJson',
    'status',
  ]
}

function myanmarHeaders_() {
  return [
    'recordId',
    'createdAt',
    'userId',
    'displayName',
    'name',
    'gender',
    'cardNumber',
    'shiftAble',
    'workHistory',
    'myPhotoUrl',
    'myPassportUrl',
    'myPinkCardUrl',
    'attachmentsJson',
    'rawJson',
    'status',
  ]
}

function attachmentKeys_() {
  return [
    'thaiPhoto',
    'thaiIdCard',
    'thaiHousehold',
    'thaiEducationCert',
    'thaiWorkCert',
    'myPhoto',
    'myPassport',
    'myPinkCard',
  ]
}

function recordToThaiRow_(record) {
  const applicant = record.applicant || {}
  const attachmentMap = buildAttachmentMap_(record.attachments)
  return [
    record.recordId || '',
    record.createdAt || '',
    record.userId || '',
    record.displayName || '',
    applicant.gender || '',
    applicant.fullName || '',
    applicant.dob || '',
    applicant.age || '',
    applicant.nationality || '',
    applicant.cardNumber || '',
    applicant.education || '',
    applicant.experience || '',
    applicant.specialSkill || '',
    applicant.position || '',
    applicant.shiftAble || '',
    applicant.phone || '',
    attachmentUrl_(attachmentMap, 'thaiPhoto'),
    attachmentUrl_(attachmentMap, 'thaiIdCard'),
    attachmentUrl_(attachmentMap, 'thaiHousehold'),
    attachmentUrl_(attachmentMap, 'thaiEducationCert'),
    attachmentUrl_(attachmentMap, 'thaiWorkCert'),
    JSON.stringify(record.attachments || []),
    JSON.stringify(record),
    record.status || '',
  ]
}

function recordToMyanmarRow_(record) {
  const applicant = record.applicant || {}
  const attachmentMap = buildAttachmentMap_(record.attachments)
  return [
    record.recordId || '',
    record.createdAt || '',
    record.userId || '',
    record.displayName || '',
    applicant.name || '',
    applicant.gender || '',
    applicant.cardNumber || '',
    applicant.shiftAble || '',
    applicant.workHistory || '',
    attachmentUrl_(attachmentMap, 'myPhoto'),
    attachmentUrl_(attachmentMap, 'myPassport'),
    attachmentUrl_(attachmentMap, 'myPinkCard'),
    JSON.stringify(record.attachments || []),
    JSON.stringify(record),
    record.status || '',
  ]
}

function normalizeMyanmarRecord_(record) {
  const applicant = record.applicant || (record.applicant = {})
  const genderMap = {
    'ကျား': 'ชาย',
    'မိန်းမ': 'หญิง',
  }
  const shiftMap = {
    'ရပါတယ်': 'ได้',
    'မရပါဘူး': 'ไม่ได้',
  }

  if (genderMap[applicant.gender]) applicant.gender = genderMap[applicant.gender]
  if (shiftMap[applicant.shiftAble]) applicant.shiftAble = shiftMap[applicant.shiftAble]
  return record
}

function buildAttachmentMap_(attachments) {
  const map = {}
  ;(Array.isArray(attachments) ? attachments : []).forEach((attachment) => {
    if (!attachment || !attachment.id) return
    const key = String(attachment.fieldKey || '').trim()
    if (!key) return
    map[key] = attachment
  })
  return map
}

function attachmentUrl_(attachmentMap, fieldKey) {
  const attachment = attachmentMap && attachmentMap[fieldKey]
  return attachment && attachment.url ? String(attachment.url) : ''
}

function applyStatusValidation_(sheet, statusColumnIndex) {
  if (!sheet || !statusColumnIndex) return

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build()

  const rowCount = Math.max(sheet.getMaxRows() - 1, 1)
  sheet.getRange(2, statusColumnIndex, rowCount, 1).setDataValidation(rule)
}

function ensureStatusEditTrigger_() {
  const triggers = ScriptApp.getProjectTriggers()
  const existing = triggers.some((trigger) =>
    trigger.getHandlerFunction() === 'handleStatusEdit_' &&
    trigger.getEventType() === ScriptApp.EventType.ON_EDIT,
  )

  if (!existing) {
    ScriptApp.newTrigger('handleStatusEdit_')
      .forSpreadsheet(getOrCreateSpreadsheet_())
      .onEdit()
      .create()
  }
}

function getStatusColumnIndex_(sheet) {
  const lastColumn = sheet.getLastColumn()
  if (lastColumn <= 0) return 0

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
  const index = headers.findIndex((header) => String(header || '').trim() === 'status')
  return index >= 0 ? index + 1 : 0
}

function getEditorEmail_(e) {
  const eventEmail = e && e.user && typeof e.user.getEmail === 'function' ? String(e.user.getEmail() || '').trim() : ''
  if (eventEmail) return eventEmail

  const activeUserEmail = Session.getActiveUser().getEmail()
  if (activeUserEmail) return String(activeUserEmail).trim()

  const effectiveUserEmail = Session.getEffectiveUser().getEmail()
  return effectiveUserEmail ? String(effectiveUserEmail).trim() : ''
}

function appendStatusLogRow_(spreadsheet, row) {
  if (!spreadsheet || !Array.isArray(row)) return

  return withScriptLock_(10000, () => {
    const sheet = ensureSheet_(spreadsheet, CONFIG.sheets.statusLog, STATUS_LOG_HEADERS)
    sheet.appendRow(row)
  })
}

function findRowIndexByRecordId_(sheet, recordId) {
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return -1
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(recordId)) {
      return i + 2
    }
  }
  return -1
}

function getOrCreateChildFolder_(parentFolder, childName) {
  const folders = parentFolder.getFoldersByName(childName)
  if (folders.hasNext()) return folders.next()
  return parentFolder.createFolder(childName)
}

function writeConfigValue_(key, value) {
  const spreadsheet = getOrCreateSpreadsheet_()
  const sheet = ensureSheet_(spreadsheet, CONFIG.sheets.config, ['key', 'value', 'updatedAt'])
  const lastRow = sheet.getLastRow()
  const now = new Date().toISOString()
  if (lastRow <= 1) {
    sheet.appendRow([key, String(value), now])
    return
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(key)) {
      sheet.getRange(i + 2, 1, 1, 3).setValues([[key, String(value), now]])
      return
    }
  }
  sheet.appendRow([key, String(value), now])
}

function withScriptLock_(timeoutMs, fn) {
  const lock = LockService.getScriptLock()
  lock.waitLock(timeoutMs || 30000)

  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

function safeJsonParse_(value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return {}
  }
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON)
}
