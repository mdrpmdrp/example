const CONFIG = {
  spreadsheetName: 'Erawan Interfood Applications',
  rootFolderName: 'Erawan Interfood Applications',
  tempFolderName: 'Temp Uploads',
  recordsFolderName: 'Records',
  sheets: {
    th: 'THAI_APPLICATIONS',
    my: 'MYANMAR_APPLICATIONS',
    config: 'CONFIG',
  },
}

function doGet(e) {
  return handleRequest_(e)
}

function doPost(e) {
  return handleRequest_(e)
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
  const spreadsheet = getOrCreateSpreadsheet_()
  const sheets = {
    th: ensureSheet_(spreadsheet, CONFIG.sheets.th, thaiHeaders_()),
    my: ensureSheet_(spreadsheet, CONFIG.sheets.my, myanmarHeaders_()),
    config: ensureSheet_(spreadsheet, CONFIG.sheets.config, ['key', 'value', 'updatedAt']),
  }

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
  const deleted = []
  fileIds.forEach((id) => {
    if (!id) return
    try {
      DriveApp.getFileById(String(id)).setTrashed(true)
      deleted.push(String(id))
    } catch (error) {
      console.warn(`Failed to delete file ${id}: ${error && error.message ? error.message : error}`)
    }
  })
  return jsonResponse_({
    ok: true,
    data: { deletedIds: deleted },
  })
}

function upsertRecord_(payload) {
  const record = payload && payload.record ? payload.record : null
  if (!record) {
    throw new Error('record is required')
  }

  const spreadsheet = getOrCreateSpreadsheet_()
  const language = record.language === 'my' ? 'my' : 'th'
  const lock = LockService.getScriptLock()
  lock.waitLock(30000)

  try {
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
  } finally {
    lock.releaseLock()
  }

  return jsonResponse_({
    ok: true,
    data: {
      recordId: record.recordId,
      sheetName: language === 'th' ? CONFIG.sheets.th : CONFIG.sheets.my,
    },
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
  ]
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
