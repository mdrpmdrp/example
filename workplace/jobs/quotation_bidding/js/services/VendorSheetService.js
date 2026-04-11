function ensureSheets_() {
    Object.keys(APP_CONFIG.sheets).forEach(function (key) {
        const config = APP_CONFIG.sheets[key];
        ensureSheetWithHeaders_(config.name, config.headers);
    });
}

function ensureSettings_() {
    upsertSetting_('APP_NAME', APP_CONFIG.appName);
    upsertSetting_('PRIMARY_COLOR', '#20B2AA');
    upsertSetting_('SECONDARY_COLOR', '#D3D3D3');
    upsertSetting_('BACKGROUND_COLOR', '#F8F9FA');

    const ownerEmail = resolveOwnerWebAppEmail_();
    if (ownerEmail) {
        upsertSetting_('ADMIN_NOTIFICATION_EMAIL', ownerEmail);
    }

    const webAppUrl = getWebAppUrl_();
    if (webAppUrl) {
        upsertSetting_('WEBAPP_URL', webAppUrl);
    }
}

function seedAdminUser_() {
    const table = getTable_(APP_CONFIG.sheets.users.name);
    const existing = table.rows.find(function (row) { return normalizeUsername_(row.username) === 'admin'; });
    if (existing) {
        return existing;
    }

    const now = nowIso_();
    const admin = {
        userId: generateId_('USR'),
        role: 'admin',
        username: 'admin',
        passwordHash: hashPassword_('Admin123!'),
        displayName: 'System Admin',
        vendorName: '',
        vendorCode: '',
        email: 'admin@example.com',
        vendorSheetUrl: '',
        isActive: 'TRUE',
        mustChangePassword: 'TRUE',
        lastLoginAt: '',
        createdAt: now,
        updatedAt: now
    };

    appendRows_(APP_CONFIG.sheets.users.name, [admin]);
    appendActivity_({
        actorUserId: admin.userId,
        actorRole: 'admin',
        action: 'SEED_ADMIN',
        entityType: 'USER',
        entityId: admin.userId,
        detailJson: JSON.stringify({ username: 'admin' })
    });
    return admin;
}

function ensureSheetWithHeaders_(sheetName, headers) {
    const spreadsheet = getSpreadsheet_();
    let sheet = getSpreadsheetSheetByName_(spreadsheet, sheetName, true);

    const currentLastColumn = Math.max(sheet.getLastColumn(), headers.length);
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        return sheet;
    }

    const currentHeaders = currentLastColumn > 0 ? sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0] : [];
    const needsUpdate = headers.some(function (header, index) { return currentHeaders[index] !== header; });
    if (needsUpdate || currentHeaders.length < headers.length) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    sheet.setFrozenRows(1);
    return sheet;
}

function ensureVendorSheet_(sheetUrl, quotationDate) {
    const spreadsheet = openSpreadsheetByUrl_(sheetUrl);
    const sheetName = getVendorQuotationSheetName_(quotationDate);
    let sheet = getSpreadsheetSheetByName_(spreadsheet, sheetName, true);
    const headers = APP_CONFIG.vendorSheet.headers;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
        ensureSheetColumnAfterHeader_(sheet, 'Submitted Date', 'Quotation Date');
        const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
        const needsUpdate = headers.some(function (header, index) { return currentHeaders[index] !== header; });
        if (needsUpdate) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
    }
    sheet.setFrozenRows(1);
    return sheet;
}

function getVendorQuotationSheetName_(value) {
    const year = resolveQuotationYear_(value);
    return APP_CONFIG.vendorSheet.sheetNamePrefix + String(year);
}

function resolveQuotationYear_(value) {
    const normalized = value ? new Date(value) : new Date();
    const date = isNaN(normalized.getTime()) ? new Date() : normalized;
    return Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy');
}

function getVendorQuotationSheets_(spreadsheet) {
    return spreadsheet.getSheets().filter(function (sheet) {
        return isVendorQuotationSheetName_(sheet.getName());
    }).sort(function (left, right) {
        return left.getName().localeCompare(right.getName());
    });
}

function isVendorQuotationSheetName_(sheetName) {
    return new RegExp('^' + APP_CONFIG.vendorSheet.sheetNamePrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\d{4}$').test(String(sheetName || ''));
}

function getVendorQuotationIndexHeaders_() {
    return APP_CONFIG.vendorSheet.indexHeaders;
}

function ensureVendorQuotationIndexSheet_(spreadsheet) {
    let sheet = getSpreadsheetSheetByName_(spreadsheet, APP_CONFIG.vendorSheet.indexSheetName, true);
    const headers = getVendorQuotationIndexHeaders_();
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
        ensureSheetColumnAfterHeader_(sheet, 'Submitted Date', 'Quotation Date');
        const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
        const needsUpdate = headers.some(function (header, index) {
            return currentHeaders[index] !== header;
        });
        if (needsUpdate) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
    }
    sheet.setFrozenRows(1);
    sheet.hideSheet();
    return sheet;
}

function buildVendorQuotationIndexRowObject_(quotation, sheetName, rowIndex) {
    return {
        'Quotation number': String(quotation.quotationId || '').trim(),
        'work order number': String(quotation.workOrderNumber || '').trim(),
        'Quotation Date': quotation.quotationDate ? toIsoDate_(quotation.quotationDate) : '',
        'Submitted Date': buildVendorSheetSubmittedDateValue_(quotation.updatedAt || quotation.syncedAt || ''),
        __sheetName: String(sheetName || '').trim(),
        __rowIndex: Number(rowIndex) || ''
    };
}

function buildVendorQuotationIndexRowObjectFromRaw_(rawRow) {
    const quotationNumber = String(rawRow['Quotation number'] || '').trim();
    if (!quotationNumber) {
        return null;
    }
    return {
        'Quotation number': quotationNumber,
        'work order number': String(rawRow['work order number'] || '').trim(),
        'Quotation Date': rawRow['Quotation Date'] ? toIsoDate_(rawRow['Quotation Date']) : '',
        'Submitted Date': buildVendorSheetSubmittedDateValue_(rawRow['Submitted Date'] || rawRow.__updatedAt || ''),
        __sheetName: String(rawRow.__sheetName || '').trim(),
        __rowIndex: Number(rawRow.__rowIndex) || ''
    };
}

function getVendorQuotationRowsFromIndex_(spreadsheet) {
    const cacheKey = getSpreadsheetCacheKey_(spreadsheet);
    if (cacheKey && RUNTIME_CACHE_.vendorIndexRowsBySpreadsheetId[cacheKey]) {
        return RUNTIME_CACHE_.vendorIndexRowsBySpreadsheetId[cacheKey];
    }

    const sheet = ensureVendorQuotationIndexSheet_(spreadsheet);
    const lastRow = sheet.getLastRow();
    const headers = getVendorQuotationIndexHeaders_();
    if (lastRow <= 1) {
        if (cacheKey) {
            RUNTIME_CACHE_.vendorIndexRowsBySpreadsheetId[cacheKey] = [];
        }
        return [];
    }

    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const rows = values.map(function (rowValues, rowOffset) {
        if (!rowValues.some(function (cell) { return cell !== ''; })) {
            return null;
        }
        const objectRow = {};
        headers.forEach(function (header, headerIndex) {
            objectRow[header] = rowValues[headerIndex];
        });
        if (!String(objectRow['Quotation number'] || '').trim()) {
            return null;
        }
        objectRow.__sheetName = String(objectRow.__sheetName || '').trim();
        objectRow.__rowIndex = Number(objectRow.__rowIndex) || (rowOffset + 2);
        objectRow.__indexRowIndex = rowOffset + 2;
        return objectRow;
    }).filter(function (row) {
        return !!row;
    });

    if (cacheKey) {
        RUNTIME_CACHE_.vendorIndexRowsBySpreadsheetId[cacheKey] = rows;
    }
    return rows;
}

function getVendorQuotationIndexState_(spreadsheet) {
    const cacheKey = getSpreadsheetCacheKey_(spreadsheet);
    if (!cacheKey) {
        return buildVendorQuotationIndexState_(getVendorQuotationRowsFromIndex_(spreadsheet));
    }
    if (!RUNTIME_CACHE_.vendorIndexStateBySpreadsheetId[cacheKey]) {
        RUNTIME_CACHE_.vendorIndexStateBySpreadsheetId[cacheKey] = buildVendorQuotationIndexState_(getVendorQuotationRowsFromIndex_(spreadsheet));
    }
    return RUNTIME_CACHE_.vendorIndexStateBySpreadsheetId[cacheKey];
}

function buildVendorQuotationIndexState_(rows) {
    const state = {
        rows: rows || [],
        byQuotationId: {},
        byWorkOrderNumber: {}
    };

    state.rows.forEach(function (row) {
        const quotationId = String(row['Quotation number'] || '').trim();
        const workOrderNumber = String(row['work order number'] || '').trim();
        if (quotationId) {
            state.byQuotationId[quotationId] = row;
        }
        if (workOrderNumber) {
            if (!state.byWorkOrderNumber[workOrderNumber]) {
                state.byWorkOrderNumber[workOrderNumber] = [];
            }
            state.byWorkOrderNumber[workOrderNumber].push(row);
        }
    });

    return state;
}

function findVendorQuotationRowFromIndexById_(spreadsheet, quotationId) {
    const normalizedQuotationId = String(quotationId || '').trim();
    if (!normalizedQuotationId) {
        return null;
    }
    return getVendorQuotationIndexState_(spreadsheet).byQuotationId[normalizedQuotationId] || null;
}

function resolveVendorQuotationRowFromIndexEntry_(spreadsheet, entry) {
    return resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, entry ? [entry] : [])[0] || null;
}

function resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, entries) {
    const groupedEntries = {};
    const resolvedRows = [];

    (entries || []).forEach(function (entry) {
        const sheetName = String(entry && entry.__sheetName || '').trim();
        const rowIndex = Number(entry && entry.__rowIndex) || 0;
        if (!sheetName || rowIndex <= 1) {
            return;
        }
        if (!groupedEntries[sheetName]) {
            groupedEntries[sheetName] = [];
        }
        groupedEntries[sheetName].push(rowIndex);
    });

    Object.keys(groupedEntries).forEach(function (sheetName) {
        const sheet = getSpreadsheetSheetByName_(spreadsheet, sheetName, false);
        const rowIndexes = groupedEntries[sheetName].slice().sort(function (left, right) { return left - right; });
        if (!sheet || !rowIndexes.length) {
            return;
        }

        const minRowIndex = rowIndexes[0];
        const maxRowIndex = rowIndexes[rowIndexes.length - 1];
        const rowMatrix = sheet.getRange(minRowIndex, 1, maxRowIndex - minRowIndex + 1, APP_CONFIG.vendorSheet.headers.length).getValues();

        rowIndexes.forEach(function (rowIndex) {
            const rowValues = rowMatrix[rowIndex - minRowIndex];
            const rowObject = buildVendorSheetRowObjectFromValues_(sheetName, rowIndex, rowValues);
            if (rowObject) {
                resolvedRows.push(rowObject);
            }
        });
    });

    return resolvedRows;
}

function rebuildVendorQuotationIndex_(spreadsheet) {
    const indexSheet = ensureVendorQuotationIndexSheet_(spreadsheet);
    const headers = getVendorQuotationIndexHeaders_();
    const indexRows = [];

    getVendorQuotationSheets_(spreadsheet).forEach(function (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) {
            return;
        }
        const rowHeaders = APP_CONFIG.vendorSheet.headers;
        const values = sheet.getRange(2, 1, lastRow - 1, rowHeaders.length).getValues();
        values.forEach(function (rowValues, rowOffset) {
            if (!rowValues.some(function (cell) { return cell !== ''; })) {
                return;
            }
            const objectRow = {};
            rowHeaders.forEach(function (header, headerIndex) {
                objectRow[header] = rowValues[headerIndex];
            });
            objectRow.__sheetName = sheet.getName();
            objectRow.__rowIndex = rowOffset + 2;
            const indexRow = buildVendorQuotationIndexRowObjectFromRaw_(objectRow);
            if (indexRow) {
                indexRows.push(indexRow);
            }
        });
    });

    if (indexSheet.getMaxRows() > 1) {
        indexSheet.getRange(2, 1, indexSheet.getMaxRows() - 1, headers.length).clearContent();
    }
    if (indexRows.length) {
        const matrix = indexRows.map(function (row) {
            return headers.map(function (header) {
                return row[header] != null ? row[header] : '';
            });
        });
        indexSheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
    }

    invalidateVendorIndexRowsCache_(spreadsheet);

    return getVendorQuotationRowsFromIndex_(spreadsheet);
}

function findVendorQuotationIndexRowIndexByQuotationId_(sheet, quotationId) {
    const normalizedQuotationId = String(quotationId || '').trim();
    if (!normalizedQuotationId || !sheet) {
        return -1;
    }

    const spreadsheet = sheet.getParent();
    const entry = getVendorQuotationIndexState_(spreadsheet).byQuotationId[normalizedQuotationId];
    return entry ? (Number(entry.__indexRowIndex) || -1) : -1;
}

function upsertVendorQuotationIndexRecord_(sheetUrl, quotation, sheetName, rowIndex) {
    const spreadsheet = openSpreadsheetByUrl_(sheetUrl);
    const sheet = ensureVendorQuotationIndexSheet_(spreadsheet);
    const headers = getVendorQuotationIndexHeaders_();
    const rowObject = buildVendorQuotationIndexRowObject_(quotation, sheetName, rowIndex);
    const matrix = [headers.map(function (header) {
        return rowObject[header] != null ? rowObject[header] : '';
    })];
    const existingRowIndex = findVendorQuotationIndexRowIndexByQuotationId_(sheet, quotation.quotationId);
    if (existingRowIndex > 0) {
        sheet.getRange(existingRowIndex, 1, 1, headers.length).setValues(matrix);
    } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues(matrix);
    }
    invalidateVendorIndexRowsCache_(spreadsheet);
}

function upsertVendorQuotationIndexFromRawRow_(spreadsheet, rawRow) {
    const sheet = ensureVendorQuotationIndexSheet_(spreadsheet);
    const headers = getVendorQuotationIndexHeaders_();
    const rowObject = buildVendorQuotationIndexRowObjectFromRaw_(rawRow);
    const matrix = [headers.map(function (header) {
        return rowObject[header] != null ? rowObject[header] : '';
    })];
    const existingRowIndex = findVendorQuotationIndexRowIndexByQuotationId_(sheet, rowObject['Quotation number']);
    if (existingRowIndex > 0) {
        sheet.getRange(existingRowIndex, 1, 1, headers.length).setValues(matrix);
    } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues(matrix);
    }
    invalidateVendorIndexRowsCache_(spreadsheet);
}

function removeVendorQuotationIndexRecord_(sheetUrl, quotationId) {
    const spreadsheet = openSpreadsheetByUrl_(sheetUrl);
    const sheet = ensureVendorQuotationIndexSheet_(spreadsheet);
    const rowIndex = findVendorQuotationIndexRowIndexByQuotationId_(sheet, quotationId);
    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, getVendorQuotationIndexHeaders_().length).clearContent();
        invalidateVendorIndexRowsCache_(spreadsheet);
    }
}

function buildVendorSheetRow_(quotation) {
    const images = normalizeStoredFiles_(quotation.productImageJson);
    const firstImage = images.length ? (images[0].previewUrl || images[0].url || images[0].preview || '') : '';
    return [
        String(quotation.category || '').trim(),
        String(quotation.priceRange || '').trim(),
        String(quotation.customerProject || '').trim(),
        buildVendorSheetImageFormula_(firstImage),
        String(quotation.description || '').trim(),
        quotation.quantityPcs != null ? quotation.quantityPcs : '',
        quotation.cifBkk != null ? quotation.cifBkk : '',
        quotation.targetPrice != null ? quotation.targetPrice : '',
        String(quotation.leadTime || '').trim(),
        quotation.quotationDate ? toIsoDate_(quotation.quotationDate) : '',
        buildVendorSheetSubmittedDateValue_(quotation.updatedAt || quotation.syncedAt || ''),
        String(quotation.remark || '').trim(),
        String(quotation.sample || '').trim(),
        String(quotation.status || '').trim(),
        String(quotation.comment || '').trim(),
        String(quotation.quotationId || '').trim(),
        String(quotation.workOrderNumber || '').trim(),
        JSON.stringify(images),
        String(quotation.quotationFolderId || '').trim(),
        quotation.thaiPrice != null ? quotation.thaiPrice : '',
        String(quotation.adminNote || '').trim()
    ];
}

function buildVendorSheetRowObjectFromValues_(sheetName, rowIndex, rowValues) {
    if (!rowValues || !rowValues.some(function (value) { return value !== ''; })) {
        return null;
    }

    const objectRow = {};
    APP_CONFIG.vendorSheet.headers.forEach(function (header, index) {
        objectRow[header] = rowValues[index];
    });
    objectRow.__sheetName = sheetName;
    objectRow.__rowIndex = rowIndex;
    return objectRow;
}

function buildVendorSheetImageFormula_(imageUrl) {
    const normalized = String(imageUrl || '').trim();
    if (!normalized) {
        return '';
    }
    return '=IMAGE("' + normalized.replace(/"/g, '""') + '")';
}

function findVendorSheetRowIndexByQuotationId_(sheet, quotationId) {
    const normalized = String(quotationId || '').trim();
    if (!normalized || sheet.getLastRow() <= 1) {
        return -1;
    }
    const quotationColumn = APP_CONFIG.vendorSheet.headers.indexOf('Quotation number') + 1;
    if (quotationColumn <= 0) {
        return -1;
    }
    const values = sheet.getRange(2, quotationColumn, sheet.getLastRow() - 1, 1).getValues();
    for (let index = 0; index < values.length; index += 1) {
        if (String(values[index][0] || '').trim() === normalized) {
            return index + 2;
        }
    }
    return -1;
}

function parseVendorSheetRowId_(value) {
    const normalized = String(value || '').trim();
    const match = normalized.match(/^(Quotation \d{4})!(\d+)$/);
    if (!match) {
        return null;
    }
    return {
        sheetName: match[1],
        rowIndex: Number(match[2])
    };
}

function ensureSheetColumnAfterHeader_(sheet, headerName, afterHeaderName) {
    if (!sheet) {
        return;
    }

    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
        return String(value || '').trim();
    });

    if (headers.indexOf(headerName) !== -1) {
        return;
    }

    const afterHeaderIndex = headers.indexOf(afterHeaderName);
    if (afterHeaderIndex === -1) {
        sheet.insertColumnAfter(lastColumn);
        sheet.getRange(1, lastColumn + 1).setValue(headerName);
        return;
    }

    sheet.insertColumnAfter(afterHeaderIndex + 1);
    sheet.getRange(1, afterHeaderIndex + 2).setValue(headerName);
}

function buildVendorSheetSubmittedDateValue_(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
        return normalized;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return normalized;
    }
    return parsed.toISOString();
}

function getVendorSheetSubmittedDate_(row) {
    if (!row) {
        return '';
    }
    return buildVendorSheetSubmittedDateValue_(row['Submitted Date'] || row.__updatedAt || '');
}

function clearVendorSheetRow_(sheetUrl, location) {
    if (!location || !location.sheetName || !location.rowIndex) {
        return;
    }
    const spreadsheet = openSpreadsheetByUrl_(sheetUrl);
    const sheet = getSpreadsheetSheetByName_(spreadsheet, location.sheetName, false);
    if (!sheet || location.rowIndex <= 1 || location.rowIndex > sheet.getMaxRows()) {
        return;
    }
    sheet.getRange(location.rowIndex, 1, 1, APP_CONFIG.vendorSheet.headers.length).clearContent();
}

function deleteVendorSheetRow_(sheetUrl, location, quotationId) {
    const normalizedSheetUrl = String(sheetUrl || '').trim();
    if (!normalizedSheetUrl) {
        return;
    }

    const spreadsheet = openSpreadsheetByUrl_(normalizedSheetUrl);
    if (!spreadsheet) {
        return;
    }

    if (!location || !location.sheetName || !location.rowIndex) {
        removeVendorQuotationIndexRecord_(normalizedSheetUrl, quotationId);
        return;
    }

    const sheet = getSpreadsheetSheetByName_(spreadsheet, location.sheetName, false);
    const rowIndex = Number(location.rowIndex) || 0;
    if (!sheet || rowIndex <= 1 || rowIndex > sheet.getLastRow()) {
        removeVendorQuotationIndexRecord_(normalizedSheetUrl, quotationId);
        return;
    }

    sheet.deleteRow(rowIndex);
    rebuildVendorQuotationIndex_(spreadsheet);
}

function getSpreadsheetCacheKey_(spreadsheet) {
    if (!spreadsheet) {
        return '';
    }
    try {
        return String(spreadsheet.getId() || '').trim();
    } catch (error) {
        return '';
    }
}

function invalidateVendorIndexRowsCache_(spreadsheet) {
    const cacheKey = getSpreadsheetCacheKey_(spreadsheet);
    if (cacheKey) {
        delete RUNTIME_CACHE_.vendorIndexRowsBySpreadsheetId[cacheKey];
        delete RUNTIME_CACHE_.vendorIndexStateBySpreadsheetId[cacheKey];
    }
}
