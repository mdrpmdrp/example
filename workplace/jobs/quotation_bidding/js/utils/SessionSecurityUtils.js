function escapeHtml_(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function requireSession_(token) {
    if (!token) {
        throw new Error('Session expired. Please login again.');
    }
    const secret = getAppSecret_(true);
    const parts = String(token).split('.');
    if (parts.length !== 2) {
        throw new Error('Invalid session token.');
    }

    const payload = parts[0];
    const expectedSignature = signString_(payload, secret);
    if (parts[1] !== expectedSignature) {
        throw new Error('Invalid session signature.');
    }

    const session = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString());
    if (session.exp < Date.now()) {
        throw new Error('Session expired. Please login again.');
    }

    const user = getUserById_(session.userId);
    if (!user || String(user.isActive).toUpperCase() !== 'TRUE') {
        throw new Error('User is not allowed to access the system.');
    }

    return sanitizeUser_(user);
}

function requireAdmin_(token) {
    const session = requireSession_(token);
    if (session.role !== 'admin') {
        throw new Error('Admin access required.');
    }
    return session;
}

function requireVendor_(token) {
    const session = requireSession_(token);
    if (session.role !== 'vendor') {
        throw new Error('Supplier access required.');
    }
    return session;
}

function createSessionToken_(user) {
    const payload = {
        userId: user.userId,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        vendorName: user.vendorName,
        vendorCode: user.vendorCode,
        email: user.email,
        exp: Date.now() + APP_CONFIG.sessionHours * 60 * 60 * 1000
    };
    const encoded = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
    const secret = getAppSecret_(true);
    return encoded + '.' + signString_(encoded, secret);
}

function signString_(value, secret) {
    const signatureBytes = Utilities.computeHmacSha256Signature(value, secret);
    return Utilities.base64EncodeWebSafe(signatureBytes);
}

function hashPassword_(plainText) {
    const salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    return salt + '$' + computeHashWithSecret_(plainText, salt, getAppSecret_(true));
}

function verifyPassword_(plainText, storedHash) {
    const parts = String(storedHash || '').split('$');
    if (parts.length !== 2) {
        return false;
    }
    const currentSecret = getAppSecret_(false);
    const currentHash = computeHashWithSecret_(plainText, parts[0], currentSecret || '');
    if (currentHash === parts[1]) {
        return true;
    }
    if (currentSecret) {
        return computeHashWithSecret_(plainText, parts[0], '') === parts[1];
    }
    return false;
}

function computeHash_(plainText, salt) {
    return computeHashWithSecret_(plainText, salt, getAppSecret_(false) || '');
}

function computeHashWithSecret_(plainText, salt, secret) {
    const raw = salt + '|' + plainText + '|' + (secret || '');
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
    return Utilities.base64EncodeWebSafe(digest);
}

function getScriptProperties_() {
    if (!RUNTIME_CACHE_.scriptProperties) {
        RUNTIME_CACHE_.scriptProperties = PropertiesService.getScriptProperties();
    }
    return RUNTIME_CACHE_.scriptProperties;
}

function getAppSecret_(createIfMissing) {
    if (RUNTIME_CACHE_.appSecret) {
        return RUNTIME_CACHE_.appSecret;
    }
    const scriptProperties = getScriptProperties_();
    let secret = scriptProperties.getProperty('APP_SECRET');
    if (!secret && createIfMissing) {
        secret = Utilities.getUuid() + Utilities.getUuid();
        scriptProperties.setProperty('APP_SECRET', secret);
    }
    RUNTIME_CACHE_.appSecret = secret || '';
    return RUNTIME_CACHE_.appSecret;
}

function getUserById_(userId) {
    return findOptionalByField_(APP_CONFIG.sheets.users.name, 'userId', userId);
}

function findRequiredByField_(sheetName, field, value) {
    const row = findOptionalByField_(sheetName, field, value);
    if (!row) {
        throw new Error(field + ' not found.');
    }
    return row;
}

function findOptionalByField_(sheetName, field, value) {
    const table = getTable_(sheetName);
    const rowInfo = findRowByField_(table, field, value);
    return rowInfo ? rowInfo.row : null;
}

function findRowByField_(table, field, value) {
    const stringValue = String(value);
    table._indexes = table._indexes || {};
    if (!table._indexes[field]) {
        const indexMap = {};
        table.rows.forEach(function (row, index) {
            const key = String(row[field]);
            if (!Object.prototype.hasOwnProperty.call(indexMap, key)) {
                indexMap[key] = index;
            }
        });
        table._indexes[field] = indexMap;
    }
    const rowIndex = Object.prototype.hasOwnProperty.call(table._indexes[field], stringValue)
        ? table._indexes[field][stringValue]
        : -1;
    if (rowIndex === -1) {
        return null;
    }
    return {
        row: Object.assign({}, table.rows[rowIndex], { _rowIndex: rowIndex }),
        rowIndex: rowIndex + 2
    };
}


function nextWorkOrderNumber_() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const scriptProperties = PropertiesService.getScriptProperties();
        const period = Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyyMM');
        const key = 'WORK_ORDER_SEQ_' + period;
        const nextValue = Number(scriptProperties.getProperty(key) || '0') + 1;
        scriptProperties.setProperty(key, String(nextValue));
        return 'WO-' + period + '-' + Utilities.formatString('%04d', nextValue);
    } finally {
        lock.releaseLock();
    }
}

function nextQuotationNumber_(value) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const scriptProperties = PropertiesService.getScriptProperties();
        const period = Utilities.formatDate(new Date(value || new Date()), APP_CONFIG.timezone, 'yyyyMM');
        const key = 'QUOTATION_SEQ_' + period;
        const nextValue = Number(scriptProperties.getProperty(key) || '0') + 1;
        scriptProperties.setProperty(key, String(nextValue));
        return 'QT-' + period + '-' + Utilities.formatString('%04d', nextValue);
    } finally {
        lock.releaseLock();
    }
}

function generateId_(prefix) {
    return prefix + '-' + Utilities.getUuid();
}

function generateOtp_() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function mapWorkOrderForUi_(row, quoteCount) {
    const normalizedQuoteCount = quoteCount != null ? normalizeNumber_(quoteCount) : normalizeNumber_(row.quotationCount);
    return {
        workOrderId: row.workOrderId,
        workOrderNumber: row.workOrderNumber,
        briefDate: normalizeDateFieldForUi_(row.briefDate),
        deadlineToQuote: normalizeDateFieldForUi_(row.deadlineToQuote),
        briefFromCustomer: row.briefFromCustomer,
        volumeValue: row.volumeValue,
        volumeUnit: row.volumeUnit,
        budgetRmb: row.budgetRmb,
        material: row.material,
        size: row.size,
        printing: row.printing,
        packing: row.packing,
        remarks: row.remarks,
        status: row.status,
        attachments: normalizeStoredFiles_(row.attachmentJson),
        quoteCount: normalizedQuoteCount || 0,
        quotations: String(row.Quotations || '').split(',').map(function (item) { return String(item || '').trim(); }).filter(Boolean),
        selectedQuotationId: String(row.selectedQuotationId || '').trim(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        hasTHB: String(row.hasTHB || '').split(',').map(function (item) { return String(item || '').trim(); }).filter(Boolean)
    };
}

function compareWorkOrdersNewestFirst_(left, right) {
    const leftCreatedAt = normalizeWorkOrderSortValue_(left && left.createdAt);
    const rightCreatedAt = normalizeWorkOrderSortValue_(right && right.createdAt);
    const leftBriefDate = normalizeWorkOrderSortValue_(left && left.briefDate);
    const rightBriefDate = normalizeWorkOrderSortValue_(right && right.briefDate);
    const leftUpdatedAt = normalizeWorkOrderSortValue_(left && left.updatedAt);
    const rightUpdatedAt = normalizeWorkOrderSortValue_(right && right.updatedAt);

    return String(rightCreatedAt).localeCompare(String(leftCreatedAt))
        || String(rightBriefDate).localeCompare(String(leftBriefDate))
        || String(rightUpdatedAt).localeCompare(String(leftUpdatedAt))
        || String(right && right.workOrderNumber || '').localeCompare(String(left && left.workOrderNumber || ''));
}

function normalizeWorkOrderSortValue_(value) {
    return String(value || '').trim();
}

function mapQuotationForUi_(row, workOrder) {
    return {
        quotationId: row.quotationId,
        workOrderId: row.workOrderId,
        workOrderNumber: row.workOrderNumber,
        vendorUserId: row.vendorUserId,
        vendorCode: row.vendorCode,
        vendorName: row.vendorName,
        category: row.category,
        priceRange: row.priceRange,
        customerProject: row.customerProject,
        images: normalizeStoredFiles_(row.productImageJson),
        description: row.description,
        quantityPcs: row.quantityPcs,
        cifBkk: row.cifBkk,
        targetPrice: row.targetPrice,
        leadTime: row.leadTime,
        quotationDate: normalizeDateFieldForUi_(row.quotationDate),
        remark: row.remark,
        sample: row.sample,
        status: row.status,
        comment: row.comment,
        thaiPrice: row.thaiPrice,
        adminNote: row.adminNote,
        source: row.source,
        updatedAt: row.updatedAt,
        workOrder: workOrder ? mapWorkOrderForUi_(workOrder, 0) : null
    };
}

function sanitizeUser_(row) {
    return {
        userId: row.userId,
        role: row.role,
        username: row.username,
        displayName: row.displayName,
        vendorName: row.vendorName,
        vendorCode: row.vendorCode,
        email: row.email,
        vendorSheetUrl: row.vendorSheetUrl,
        isActive: String(row.isActive).toUpperCase() === 'TRUE',
        mustChangePassword: String(row.mustChangePassword).toUpperCase() === 'TRUE',
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

function normalizeUsername_(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeNumber_(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : '';
}

function normalizeCellValue_(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}

function normalizeDateFieldForUi_(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }
    const matched = normalized.match(/^\d{4}-\d{2}-\d{2}/);
    if (matched) {
        return matched[0];
    }
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return normalized;
    }
    return Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd');
}

function sanitizeObject_(payload) {
    return payload && typeof payload === 'object' ? payload : {};
}

function validateRequired_(payload, fields) {
    fields.forEach(function (field) {
        if (payload[field] === null || payload[field] === undefined || String(payload[field]).trim() === '') {
            throw new Error(field + ' is required.');
        }
    });
}

function parseJsonArray_(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function normalizeStoredFiles_(value) {
    return parseJsonArray_(value)
        .map(function (file) {
            return {
                fileId: String(file && file.fileId || '').trim(),
                name: String(file && file.name || '').trim(),
                url: String(file && file.url || '').trim(),
                previewUrl: String(file && file.previewUrl || '').trim() || buildDrivePreviewUrl_(file && file.fileId),
                contentType: String(file && (file.contentType || file.type) || '').trim(),
                sizeBytes: normalizeNumber_(file && file.sizeBytes),
                isTemp: file && (file.isTemp === true || String(file.isTemp).toUpperCase() === 'TRUE'),
                scope: String(file && file.scope || '').trim().toUpperCase()
            };
        })
        .filter(function (file) {
            return file.name || file.url;
        });
}

function validateUploadScope_(session, scope) {
    const normalizedScope = String(scope || '').trim().toUpperCase();
    if (normalizedScope === 'WORK_ORDER' && session.role !== 'admin') {
        throw new Error('Admin access required for work order uploads.');
    }
    if (normalizedScope === 'QUOTATION' && session.role !== 'vendor') {
        throw new Error('Supplier access required for quotation uploads.');
    }
    if (normalizedScope !== 'WORK_ORDER' && normalizedScope !== 'QUOTATION') {
        throw new Error('Invalid upload scope.');
    }
}

function finalizeWorkOrderFiles_(files, workOrderNumber, workOrderFolderId) {
    const workOrderFolder = ensureWorkOrderFolder_(workOrderNumber, workOrderFolderId);
    return {
        files: finalizeUploadedFiles_(files, workOrderFolder, 'WORK_ORDER'),
        workOrderFolderId: workOrderFolder.getId()
    };
}

function finalizeQuotationFiles_(files, workOrderNumber, quotationId, workOrderFolderId, quotationFolderId) {
    const quotationFolder = ensureQuotationFolder_(workOrderNumber, quotationId, workOrderFolderId, quotationFolderId);
    return {
        files: finalizeUploadedFiles_(files, quotationFolder, 'QUOTATION'),
        quotationFolderId: quotationFolder.getId()
    };
}

function finalizeUploadedFiles_(files, targetFolder, scope) {
    const normalizedFiles = normalizeStoredFiles_(files);
    const tempFiles = normalizedFiles.filter(function (file) {
        return file.fileId && file.isTemp;
    });
    const tempFolderId = tempFiles.length ? ensureTempUploadFolder_() : '';

    if (tempFiles.length) {
        try {
            const movedById = batchMoveDriveFiles_(tempFiles, targetFolder.getId(), tempFolderId);
            return normalizedFiles.map(function (file) {
                return buildStoredFileFromBatchResult_(file, movedById[file.fileId], scope);
            });
        } catch (error) {
            Logger.log('Batch move failed. Falling back to DriveApp.moveTo(): ' + error);
        }
    }

    return finalizeUploadedFilesLegacy_(normalizedFiles, targetFolder, scope);
}

function finalizeUploadedFilesLegacy_(files, targetFolder, scope) {
    return normalizeStoredFiles_(files).map(function (file) {
        if (!file.fileId) {
            return file;
        }
        const driveFile = DriveApp.getFileById(file.fileId);
        if (file.isTemp) {
            driveFile.moveTo(targetFolder);
        }
        return {
            fileId: driveFile.getId(),
            name: driveFile.getName(),
            url: driveFile.getUrl(),
            previewUrl: buildDrivePreviewUrl_(driveFile.getId()),
            contentType: file.contentType || driveFile.getMimeType(),
            sizeBytes: file.sizeBytes || driveFile.getSize(),
            isTemp: false,
            scope: String(scope || file.scope || '').toUpperCase()
        };
    });
}

function deleteRemovedFiles_(previousFiles, currentFiles) {
    const currentById = {};
    normalizeStoredFiles_(currentFiles).forEach(function (file) {
        if (file.fileId) {
            currentById[file.fileId] = true;
        }
    });
    const removedFileIds = normalizeStoredFiles_(previousFiles).filter(function (file) {
        return file.fileId && !currentById[file.fileId];
    }).map(function (file) {
        return file.fileId;
    });

    if (!removedFileIds.length) {
        return;
    }

    try {
        batchTrashDriveFiles_(removedFileIds);
    } catch (error) {
        Logger.log('Batch trash failed. Falling back to DriveApp.setTrashed(): ' + error);
        removedFileIds.forEach(function (fileId) {
            trashDriveFileById_(fileId);
        });
    }
}

function trashDriveFileById_(fileId) {
    try {
        DriveApp.getFileById(String(fileId)).setTrashed(true);
    } catch (error) {
        Logger.log('Unable to trash file ' + fileId + ': ' + error);
    }
}

function trashDriveFolderById_(folderId) {
    const normalizedFolderId = String(folderId || '').trim();
    if (!normalizedFolderId) {
        return;
    }
    try {
        DriveApp.getFolderById(normalizedFolderId).setTrashed(true);
    } catch (error) {
        Logger.log('Unable to trash folder ' + normalizedFolderId + ': ' + error);
    }
}

function buildStoredFileFromBatchResult_(file, batchResult, scope) {
    if (!file.fileId) {
        return file;
    }
    return {
        fileId: file.fileId,
        name: String((batchResult && batchResult.name) || file.name || '').trim(),
        url: String((batchResult && batchResult.webViewLink) || file.url || buildDriveFileUrl_(file.fileId)).trim(),
        previewUrl: buildDrivePreviewUrl_(file.fileId),
        contentType: String((batchResult && batchResult.mimeType) || file.contentType || '').trim(),
        sizeBytes: normalizeNumber_((batchResult && batchResult.size) || file.sizeBytes),
        isTemp: false,
        scope: String(scope || file.scope || '').toUpperCase()
    };
}

function buildDriveFileUrl_(fileId) {
    const normalized = String(fileId || '').trim();
    return normalized ? ('https://drive.google.com/open?id=' + encodeURIComponent(normalized)) : '';
}

function batchMoveDriveFiles_(files, targetFolderId, sourceFolderId) {
    const requests = normalizeStoredFiles_(files).filter(function (file) {
        return file.fileId && file.isTemp;
    }).map(function (file) {
        return {
            method: 'PATCH',
            endpoint: 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.fileId) + '?addParents=' + encodeURIComponent(targetFolderId) + '&removeParents=' + encodeURIComponent(sourceFolderId) + '&fields=id,name,mimeType,size,webViewLink',
            requestBody: {}
        };
    });

    const responses = executeDriveBatchRequests_(requests, 'move files');
    return responses.reduce(function (accumulator, item, index) {
        const fileId = requests[index].endpoint.match(/files\/([^?]+)/)[1];
        accumulator[decodeURIComponent(fileId)] = item;
        return accumulator;
    }, {});
}

function batchTrashDriveFiles_(fileIds) {
    const requests = (fileIds || []).filter(function (fileId) {
        return String(fileId || '').trim();
    }).map(function (fileId) {
        return {
            method: 'PATCH',
            endpoint: 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?fields=id,trashed',
            requestBody: { trashed: true }
        };
    });

    executeDriveBatchRequests_(requests, 'trash files');
}

function executeDriveBatchRequests_(requests, actionLabel) {
    if (!requests || !requests.length) {
        return [];
    }

    const responses = EDo({
        batchPath: APP_CONFIG.driveBatchPath,
        requests: requests,
        useFetchAll: true,
        accessToken: ScriptApp.getOAuthToken()
    });

    responses.forEach(function (item) {
        if (!item || typeof item !== 'object' || item.error) {
            throw new Error('Unable to ' + actionLabel + ': ' + JSON.stringify(item));
        }
    });
    return responses;
}

function buildDrivePreviewUrl_(fileId) {
    const normalized = String(fileId || '').trim();
    return normalized ? ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(normalized) + '&sz=w1600') : '';
}

function createVendorCode_(vendorName) {
    const prefix = String(vendorName || 'VENDOR').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'VENDOR';
    return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function booleanToSheet_(value) {
    if (value === true || String(value).toUpperCase() === 'TRUE') {
        return 'TRUE';
    }
    return 'FALSE';
}

function toIsoDate_(value) {
    if (!value) {
        return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd');
}

function nowIso_() {
    return new Date().toISOString();
}

function syncWorkOrderQuotationCount_(workOrderId) {
    const normalizedWorkOrderId = String(workOrderId || '').trim();
    if (!normalizedWorkOrderId) {
        return 0;
    }

    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    const workOrderRowInfo = findRowByField_(workOrdersTable, 'workOrderId', normalizedWorkOrderId);
    if (!workOrderRowInfo) {
        return 0;
    }

    const quotationRefs = getWorkOrderQuotationRefs_(workOrderRowInfo.row);
    const quotationCount = quotationRefs.length;

    updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, workOrderRowInfo.rowIndex, {
        quotationCount: quotationCount,
        Quotations: quotationRefs.join(', ')
    });

    return quotationCount;
}

function backfillWorkOrderQuotationCounts() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        ensureSheets_();

        const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);

        let updatedWorkOrders = 0;
        let unchangedWorkOrders = 0;

        workOrdersTable.rows.forEach(function (row, index) {
            const workOrderId = String(row.workOrderId || '').trim();
            const quotationRefs = getWorkOrderQuotationRefs_(row);
            const nextQuotationCount = quotationRefs.length;
            const currentQuotationCount = normalizeNumber_(row.quotationCount) || 0;
            const currentQuotationRefs = String(row.Quotations || '').trim();
            const nextQuotationRefs = quotationRefs.join(', ');

            if (currentQuotationCount === nextQuotationCount && currentQuotationRefs === nextQuotationRefs) {
                unchangedWorkOrders += 1;
                return;
            }

            updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, index + 2, {
                quotationCount: nextQuotationCount,
                Quotations: nextQuotationRefs
            });
            updatedWorkOrders += 1;
        });

        return {
            ok: true,
            totalWorkOrders: workOrdersTable.rows.length,
            totalQuotations: workOrdersTable.rows.reduce(function (accumulator, row) {
                return accumulator + getWorkOrderQuotationRefs_(row).length;
            }, 0),
            updatedWorkOrders: updatedWorkOrders,
            unchangedWorkOrders: unchangedWorkOrders
        };
    } finally {
        lock.releaseLock();
    }
}
