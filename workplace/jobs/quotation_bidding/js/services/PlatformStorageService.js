function createProfileTimer_(label) {
    return {
        label: label,
        startedAt: Date.now(),
        lastMarkAt: Date.now(),
        segments: []
    };
}

function logProfileTimer_(profile, meta) {
    if (!profile) {
        return;
    }
    const totalMs = Date.now() - profile.startedAt;
    const payload = {
        label: profile.label,
        totalMs: totalMs,
        segments: profile.segments,
        meta: meta || {}
    };
    Logger.log('[PROFILE] ' + JSON.stringify(payload));
}

function addProfileSegment_(profile, name) {
    if (!profile) {
        return;
    }
    const now = Date.now();
    profile.segments.push({
        name: name,
        elapsedMs: now - profile.lastMarkAt,
        totalMs: now - profile.startedAt
    });
    profile.lastMarkAt = now;
}

function ensureUploadFolder_() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const existingFolderId = scriptProperties.getProperty('UPLOAD_FOLDER_ID');
    if (existingFolderId) {
        try {
            DriveApp.getFolderById(existingFolderId);
            return existingFolderId;
        } catch (error) {
            scriptProperties.deleteProperty('UPLOAD_FOLDER_ID');
        }
    }

    const folders = DriveApp.getFoldersByName(APP_CONFIG.uploadFolderName);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(APP_CONFIG.uploadFolderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    scriptProperties.setProperty('UPLOAD_FOLDER_ID', folder.getId());
    return folder.getId();
}

function ensureTempUploadFolder_() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const existingFolderId = scriptProperties.getProperty('TEMP_UPLOAD_FOLDER_ID');
    if (existingFolderId) {
        try {
            DriveApp.getFolderById(existingFolderId);
            return existingFolderId;
        } catch (error) {
            scriptProperties.deleteProperty('TEMP_UPLOAD_FOLDER_ID');
        }
    }

    const folderId = ensureChildFolder_(DriveApp.getFolderById(ensureUploadFolder_()), APP_CONFIG.tempUploadFolderName).getId();
    scriptProperties.setProperty('TEMP_UPLOAD_FOLDER_ID', folderId);
    return folderId;
}

function ensureWorkOrderFolder_(workOrderNumber, existingFolderId) {
    const existingFolder = getDriveFolderByIdSafe_(existingFolderId);
    if (existingFolder) {
        return existingFolder;
    }
    return ensureChildFolder_(DriveApp.getFolderById(ensureUploadFolder_()), String(workOrderNumber));
}

function ensureQuotationFolder_(workOrderNumber, quotationId, workOrderFolderId, existingFolderId) {
    const existingFolder = getDriveFolderByIdSafe_(existingFolderId);
    if (existingFolder) {
        return existingFolder;
    }
    const workOrderFolder = ensureWorkOrderFolder_(workOrderNumber, workOrderFolderId);
    return ensureChildFolder_(workOrderFolder, String(quotationId));
}

function ensureChildFolder_(parentFolder, folderName) {
    const folders = parentFolder.getFoldersByName(folderName);
    const folder = folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
    return folder;
}

function getDriveFolderByIdSafe_(folderId) {
    const normalizedFolderId = String(folderId || '').trim();
    if (!normalizedFolderId) {
        return null;
    }
    try {
        return DriveApp.getFolderById(normalizedFolderId);
    } catch (error) {
        return null;
    }
}

function ensureSecret_() {
    return getAppSecret_(true);
}

function getSpreadsheet_() {
    if (RUNTIME_CACHE_.spreadsheet) {
        return RUNTIME_CACHE_.spreadsheet;
    }
    const scriptProperties = getScriptProperties_();
    const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
    if (spreadsheetId) {
        RUNTIME_CACHE_.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        return RUNTIME_CACHE_.spreadsheet;
    }
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
        RUNTIME_CACHE_.spreadsheet = activeSpreadsheet;
        return RUNTIME_CACHE_.spreadsheet;
    }
    throw new Error('Spreadsheet not configured. Run AppInit first.');
}

function openSpreadsheetByUrl_(sheetUrl) {
    const normalizedSheetUrl = String(sheetUrl || '').trim();
    if (!normalizedSheetUrl) {
        return null;
    }
    if (!RUNTIME_CACHE_.spreadsheetsByUrl[normalizedSheetUrl]) {
        RUNTIME_CACHE_.spreadsheetsByUrl[normalizedSheetUrl] = SpreadsheetApp.openByUrl(normalizedSheetUrl);
    }
    return RUNTIME_CACHE_.spreadsheetsByUrl[normalizedSheetUrl];
}

function getSpreadsheetSheetCacheBucket_(spreadsheet) {
    const cacheKey = getSpreadsheetCacheKey_(spreadsheet);
    if (!cacheKey) {
        return null;
    }
    if (!RUNTIME_CACHE_.sheetsBySpreadsheetId[cacheKey]) {
        RUNTIME_CACHE_.sheetsBySpreadsheetId[cacheKey] = {};
    }
    return RUNTIME_CACHE_.sheetsBySpreadsheetId[cacheKey];
}

function getSpreadsheetSheetByName_(spreadsheet, sheetName, createIfMissing) {
    if (!spreadsheet || !sheetName) {
        return null;
    }

    const cacheBucket = getSpreadsheetSheetCacheBucket_(spreadsheet);
    if (cacheBucket && cacheBucket[sheetName]) {
        return cacheBucket[sheetName];
    }

    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet && createIfMissing) {
        sheet = spreadsheet.insertSheet(sheetName);
    }
    if (sheet && cacheBucket) {
        cacheBucket[sheetName] = sheet;
    }
    return sheet;
}

function getTable_(sheetName) {
    if (RUNTIME_CACHE_.tablesBySheetName[sheetName]) {
        return RUNTIME_CACHE_.tablesBySheetName[sheetName];
    }
    const headers = getSheetHeaders_(sheetName);
    const sheet = ensureSheetWithHeaders_(sheetName, headers);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        RUNTIME_CACHE_.tablesBySheetName[sheetName] = { headers: headers, rows: [], sheet: sheet, _indexes: {} };
        return RUNTIME_CACHE_.tablesBySheetName[sheetName];
    }

    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const rows = values.filter(function (row) {
        return row.some(function (cell) { return cell !== ''; });
    }).map(function (row) {
        const objectRow = {};
        headers.forEach(function (header, index) {
            objectRow[header] = normalizeCellValue_(row[index]);
        });
        return objectRow;
    });
    RUNTIME_CACHE_.tablesBySheetName[sheetName] = { headers: headers, rows: rows, sheet: sheet, _indexes: {} };
    return RUNTIME_CACHE_.tablesBySheetName[sheetName];
}

function getSheetHeaders_(sheetName) {
    if (RUNTIME_CACHE_.sheetConfigsByName[sheetName]) {
        return RUNTIME_CACHE_.sheetConfigsByName[sheetName].headers;
    }
    const config = Object.keys(APP_CONFIG.sheets)
        .map(function (key) { return APP_CONFIG.sheets[key]; })
        .find(function (item) { return item.name === sheetName; });
    if (!config) {
        throw new Error('Unknown sheet: ' + sheetName);
    }
    RUNTIME_CACHE_.sheetConfigsByName[sheetName] = config;
    return config.headers;
}

function appendRows_(sheetName, rows) {
    if (!rows || !rows.length) {
        return;
    }
    const headers = getSheetHeaders_(sheetName);
    const sheet = ensureSheetWithHeaders_(sheetName, headers);
    const matrix = rows.map(function (row) {
        return headers.map(function (header) {
            return row[header] != null ? row[header] : '';
        });
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, matrix.length, headers.length).setValues(matrix);

    const cachedTable = RUNTIME_CACHE_.tablesBySheetName[sheetName];
    if (cachedTable) {
        rows.forEach(function (row) {
            const objectRow = {};
            headers.forEach(function (header) {
                objectRow[header] = row[header] != null ? normalizeCellValue_(row[header]) : '';
            });
            cachedTable.rows.push(objectRow);
        });
        cachedTable.sheet = sheet;
        invalidateTableIndexes_(cachedTable);
    }
}

function updateRowByIndex_(sheetName, rowIndex, patch) {
    const table = getTable_(sheetName);
    const headers = table.headers;
    const sheet = table.sheet || ensureSheetWithHeaders_(sheetName, headers);
    const zeroBasedRowIndex = rowIndex - 2;
    const rowObject = zeroBasedRowIndex >= 0 && zeroBasedRowIndex < table.rows.length
        ? table.rows[zeroBasedRowIndex]
        : {};
    const updated = Object.assign({}, rowObject, patch);
    const matrix = [headers.map(function (header) {
        return updated[header] != null ? updated[header] : '';
    })];
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues(matrix);

    if (zeroBasedRowIndex >= 0) {
        table.rows[zeroBasedRowIndex] = updated;
        table.sheet = sheet;
        invalidateTableIndexes_(table);
    }
}

function invalidateTableIndexes_(table) {
    if (table) {
        table._indexes = {};
    }
}

function appendActivity_(entry) {
    appendRows_(APP_CONFIG.sheets.activityLogs.name, [{
        logId: generateId_('LOG'),
        actorUserId: entry.actorUserId || '',
        actorRole: entry.actorRole || '',
        action: entry.action || '',
        entityType: entry.entityType || '',
        entityId: entry.entityId || '',
        detailJson: entry.detailJson || '',
        createdAt: nowIso_()
    }]);
}

function upsertSetting_(key, value) {
    const table = getTable_(APP_CONFIG.sheets.settings.name);
    const rowInfo = findRowByField_(table, 'key', key);
    if (rowInfo) {
        updateRowByIndex_(APP_CONFIG.sheets.settings.name, rowInfo.rowIndex, {
            key: key,
            value: value,
            updatedAt: nowIso_()
        });
    } else {
        appendRows_(APP_CONFIG.sheets.settings.name, [{
            key: key,
            value: value,
            updatedAt: nowIso_()
        }]);
    }
}

function getSettingValue_(key) {
    const row = findOptionalByField_(APP_CONFIG.sheets.settings.name, 'key', key);
    return row ? String(row.value || '').trim() : '';
}

function resolveOwnerWebAppEmail_() {
    const candidates = [];

    try {
        candidates.push(Session.getEffectiveUser().getEmail());
    } catch (error) { }

    try {
        candidates.push(Session.getActiveUser().getEmail());
    } catch (error) { }

    candidates.push(getSettingValue_('ADMIN_NOTIFICATION_EMAIL'));

    const email = candidates
        .map(function (value) { return String(value || '').trim().toLowerCase(); })
        .find(function (value) { return value; });

    return email || '';
}

function getWebAppUrl_() {
    try {
        return String(ScriptApp.getService().getUrl() || '').trim();
    } catch (error) {
        return getSettingValue_('WEBAPP_URL');
    }
}

function sendAdminRegistrationNotification_(userRow) {
    const adminEmail = resolveOwnerWebAppEmail_();
    if (!adminEmail) {
        Logger.log('Registration notification skipped: no owner/admin email available.');
        return;
    }

    const appUrl = getWebAppUrl_();
    const subject = APP_CONFIG.appName + ' new supplier registration approval required';
    const htmlBody = [
        '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#16323a">',
        '<h2 style="margin:0 0 12px;color:#20B2AA">New account pending approval</h2>',
        '<p style="margin:0 0 12px">A new supplier account has been created and is waiting for admin approval.</p>',
        '<table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:560px">',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Contact Name</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.displayName) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Supplier Name</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.vendorName) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Username</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.username) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Email</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.email) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Supplier Code</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.vendorCode) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Created At</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.createdAt) + '</td></tr>',
        '</table>',
        '<p style="margin:0 0 12px">Open the admin workspace and approve this supplier from the Manage Suppliers section.</p>',
        (appUrl
            ? '<p style="margin:0 0 16px"><a href="' + escapeHtml_(appUrl) + '" style="display:inline-block;border-radius:999px;background:#20B2AA;color:#ffffff;text-decoration:none;padding:10px 18px;font-weight:600">Open Web App</a></p>'
            : ''),
        '<p style="margin:0;color:#64748b;font-size:12px">This notification was sent by the Apps Script web app owner account.</p>',
        '</div>'
    ].join('');

    MailApp.sendEmail({
        to: adminEmail,
        subject: subject,
        htmlBody: htmlBody
    });
}

