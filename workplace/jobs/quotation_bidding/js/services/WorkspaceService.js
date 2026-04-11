function getBootstrapData(token) {
    const profile = createProfileTimer_('getBootstrapData');
    const session = requireSession_(token);
    addProfileSegment_(profile, 'requireSession');
    if (session.role === 'admin') {
        const response = {
            ok: true,
            role: 'admin',
            user: session,
            data: getAdminBootstrap_(session)
        };
        addProfileSegment_(profile, 'buildAdminBootstrap');
        logProfileTimer_(profile, { role: 'admin', userId: session.userId });
        return response;
    }

    const response = {
        ok: true,
        role: 'vendor',
        user: session,
        data: getVendorBootstrap_(session)
    };
    addProfileSegment_(profile, 'buildVendorBootstrap');
    logProfileTimer_(profile, { role: 'vendor', userId: session.userId });
    return response;
}

function getDriveUploadAuthContext(token, payload) {
    const session = requireSession_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['scope']);
    validateUploadScope_(session, input.scope);

    return {
        ok: true,
        accessToken: ScriptApp.getOAuthToken(),
        folderId: ensureTempUploadFolder_()
    };
}

function deleteUploadedFile(token, payload) {
    requireSession_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['fileId']);

    trashDriveFileById_(input.fileId);
    return {
        ok: true,
        fileId: String(input.fileId)
    };
}

function saveWorkOrder(token, payload) {
    const session = requireAdmin_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['briefDate', 'deadlineToQuote', 'briefFromCustomer']);

    const table = getTable_(APP_CONFIG.sheets.workOrders.name);
    const now = nowIso_();
    const existingAttachments = normalizeStoredFiles_(input.existingAttachments);
    const uploadedAttachments = normalizeStoredFiles_(input.newAttachments);
    const rowInfo = input.workOrderId ? findRowByField_(table, 'workOrderId', input.workOrderId) : null;
    const previousAttachments = rowInfo ? normalizeStoredFiles_(rowInfo.row.attachmentJson) : [];
    const workOrderId = input.workOrderId || generateId_('WO');
    const workOrderNumber = input.workOrderId
        ? String((rowInfo && rowInfo.row.workOrderNumber) || input.workOrderNumber || '').trim()
        : nextWorkOrderNumber_();
    const allAttachments = existingAttachments.concat(uploadedAttachments);
    if (allAttachments.length > 10) {
        throw new Error('Maximum 10 files are allowed.');
    }

    const row = {
        workOrderId: workOrderId,
        workOrderNumber: workOrderNumber,
        briefDate: toIsoDate_(input.briefDate),
        deadlineToQuote: toIsoDate_(input.deadlineToQuote),
        briefFromCustomer: String(input.briefFromCustomer || '').trim(),
        volumeValue: normalizeNumber_(input.volumeValue),
        volumeUnit: String(input.volumeUnit || '').trim(),
        budgetRmb: normalizeNumber_(input.budgetRmb),
        material: String(input.material || '').trim(),
        size: String(input.size || '').trim(),
        printing: String(input.printing || '').trim(),
        packing: String(input.packing || '').trim(),
        remarks: String(input.remarks || '').trim(),
        status: String(input.status || 'OPEN').trim().toUpperCase(),
        createdBy: input.createdBy || session.userId,
        createdAt: input.createdAt || now,
        updatedAt: now,
        closedAt: String(input.status || '').trim().toUpperCase() === 'CLOSED' ? now : '',
        attachmentJson: JSON.stringify(allAttachments),
        workOrderFolderId: rowInfo ? String(rowInfo.row.workOrderFolderId || '').trim() : '',
        quotationCount: rowInfo ? (normalizeNumber_(rowInfo.row.quotationCount) || 0) : 0,
        selectedQuotationId: rowInfo ? String(rowInfo.row.selectedQuotationId || '').trim() : ''
    };

    if (input.workOrderId) {
        if (!rowInfo) {
            throw new Error('Work order not found.');
        }
        row.createdBy = rowInfo.row.createdBy;
        row.createdAt = rowInfo.row.createdAt;
        if (String(rowInfo.row.status || '').toUpperCase() === 'CLOSED' && row.status !== 'CLOSED') {
            row.closedAt = '';
        }
        updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, rowInfo.rowIndex, row);
    } else {
        appendRows_(APP_CONFIG.sheets.workOrders.name, [row]);
    }

    return {
        ok: true,
        workOrder: mapWorkOrderForUi_(row, 0),
        finalizeJob: {
            workOrderId: row.workOrderId,
            previousAttachments: previousAttachments,
            currentAttachments: allAttachments,
            action: input.workOrderId ? 'UPDATE_WORK_ORDER' : 'CREATE_WORK_ORDER'
        }
    };
}

function sendWorkOrderNotificationEmails(token, workOrderId) {
    requireAdmin_(token);
    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', workOrderId);
    return {
        ok: true,
        workOrderId: workOrder.workOrderId,
        workOrderNumber: workOrder.workOrderNumber,
        notificationSummary: notifySuppliersOfNewWorkOrder_(workOrder)
    };
}

function finalizeWorkOrderSave(token, payload) {
    const session = requireAdmin_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['workOrderId']);

    const table = getTable_(APP_CONFIG.sheets.workOrders.name);
    const rowInfo = findRowByField_(table, 'workOrderId', input.workOrderId);
    if (!rowInfo) {
        throw new Error('Work order not found.');
    }

    const previousAttachments = normalizeStoredFiles_(input.previousAttachments);
    const currentAttachments = normalizeStoredFiles_(input.currentAttachments || rowInfo.row.attachmentJson);
    const finalizedResult = finalizeWorkOrderFiles_(currentAttachments, rowInfo.row.workOrderNumber, rowInfo.row.workOrderFolderId);
    const finalizedAttachments = finalizedResult.files;
    deleteRemovedFiles_(previousAttachments, finalizedAttachments);

    updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, rowInfo.rowIndex, {
        attachmentJson: JSON.stringify(finalizedAttachments),
        workOrderFolderId: finalizedResult.workOrderFolderId
    });

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: String(input.action || 'UPDATE_WORK_ORDER'),
        entityType: 'WORK_ORDER',
        entityId: rowInfo.row.workOrderId,
        detailJson: JSON.stringify({ workOrderNumber: rowInfo.row.workOrderNumber, status: rowInfo.row.status })
    });

    return {
        ok: true,
        workOrder: mapWorkOrderForUi_(Object.assign({}, rowInfo.row, {
            attachmentJson: JSON.stringify(finalizedAttachments),
            workOrderFolderId: finalizedResult.workOrderFolderId
        }), 0)
    };
}

function saveUserAccess(token, payload) {
    const session = requireAdmin_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['userId']);

    const table = getTable_(APP_CONFIG.sheets.users.name);
    const rowInfo = findRowByField_(table, 'userId', input.userId);
    if (!rowInfo) {
        throw new Error('User not found.');
    }

    const nextRole = normalizeManagedUserRole_(input.role != null ? input.role : rowInfo.row.role);
    const nextIsActive = input.isActive != null ? !!input.isActive : String(rowInfo.row.isActive).toUpperCase() === 'TRUE';
    ensureAdminAccessSafety_(table.rows, rowInfo.row, {
        role: nextRole,
        isActive: nextIsActive
    }, session);

    const now = nowIso_();
    const patch = {
        role: nextRole,
        displayName: input.displayName != null ? String(input.displayName).trim() : rowInfo.row.displayName,
        vendorName: input.vendorName != null ? String(input.vendorName).trim() : rowInfo.row.vendorName,
        email: input.email != null ? String(input.email).trim().toLowerCase() : rowInfo.row.email,
        vendorSheetUrl: input.vendorSheetUrl != null ? String(input.vendorSheetUrl).trim() : rowInfo.row.vendorSheetUrl,
        isActive: booleanToSheet_(nextIsActive),
        updatedAt: now
    };

    updateRowByIndex_(APP_CONFIG.sheets.users.name, rowInfo.rowIndex, patch);
    if (patch.vendorSheetUrl) {
        ensureVendorSheet_(patch.vendorSheetUrl);
    }

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'UPDATE_USER_ACCESS',
        entityType: 'USER',
        entityId: input.userId,
        detailJson: JSON.stringify({ role: patch.role, isActive: patch.isActive, vendorSheetUrl: patch.vendorSheetUrl })
    });

    return {
        ok: true,
        data: getAdminBootstrap_(session)
    };
}

function getQuotationComparison(token, workOrderId) {
    requireAdmin_(token);
    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', workOrderId);
    const quotationIds = getWorkOrderQuotationRefs_(workOrder);
    const selectedQuotationId = String(workOrder.selectedQuotationId || '').trim();
    const quotations = [];

    getVendorUsersWithSheets_().forEach(function (vendorUser) {
        getVendorQuotationRowsByWorkOrder_(vendorUser, workOrder.workOrderNumber, quotationIds).forEach(function (row) {
            const quotation = mapVendorSheetQuotationForUi_(row, workOrder, vendorUser);
            quotation.isSelected = quotation.quotationId === selectedQuotationId;
            quotations.push(quotation);
        });
    });

    quotations.sort(function (left, right) {
        return Number(Boolean(right.isSelected)) - Number(Boolean(left.isSelected))
            || String(left.vendorName || '').localeCompare(String(right.vendorName || ''))
            || String(right.quotationDate || '').localeCompare(String(left.quotationDate || ''))
            || String(right.quotationId || '').localeCompare(String(left.quotationId || ''));
    });

    return {
        ok: true,
        workOrder: workOrder,
        quotations: quotations
    };
}

function saveQuotationThaiPrice(token, payload) {
    const session = requireAdmin_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['quotationId']);

    const quotationRecord = findVendorQuotationRecordAcrossUsers_(input.quotationId);
    if (!quotationRecord) {
        throw new Error('Quotation not found.');
    }

    const updatedRow = Object.assign({}, quotationRecord.row, {
        thaiPrice: normalizeNumber_(input.thaiPrice),
        adminNote: String(input.adminNote || '').trim(),
        updatedAt: nowIso_()
    });
    syncQuotationToVendorSheet_(quotationRecord.user, updatedRow);

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'SAVE_THAI_PRICE',
        entityType: 'QUOTATION',
        entityId: input.quotationId,
        detailJson: JSON.stringify({ thaiPrice: normalizeNumber_(input.thaiPrice) })
    });

    return {
        ok: true,
        data: getAdminBootstrap_(session)
    };
}

function saveSelectedQuotation(token, payload) {
    const session = requireAdmin_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['workOrderId', 'quotationId']);

    const normalizedWorkOrderId = String(input.workOrderId || '').trim();
    const normalizedQuotationId = String(input.quotationId || '').trim();
    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    const workOrderRowInfo = findRowByField_(workOrdersTable, 'workOrderId', normalizedWorkOrderId);
    if (!workOrderRowInfo) {
        throw new Error('Work order not found.');
    }

    const quotationRecord = findVendorQuotationRecordAcrossUsers_(normalizedQuotationId);
    if (!quotationRecord) {
        throw new Error('Quotation not found.');
    }

    if (String(quotationRecord.row.workOrderId || '').trim() !== normalizedWorkOrderId) {
        throw new Error('Quotation does not belong to this work order.');
    }

    const quotationRefs = getWorkOrderQuotationRefs_(workOrderRowInfo.row);
    if (quotationRefs.indexOf(normalizedQuotationId) === -1) {
        throw new Error('Quotation is not linked to this work order.');
    }

    updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, workOrderRowInfo.rowIndex, {
        selectedQuotationId: normalizedQuotationId,
        updatedAt: nowIso_()
    });

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'SELECT_QUOTATION',
        entityType: 'WORK_ORDER',
        entityId: normalizedWorkOrderId,
        detailJson: JSON.stringify({
            workOrderNumber: workOrderRowInfo.row.workOrderNumber,
            quotationId: normalizedQuotationId
        })
    });

    return {
        ok: true,
        workOrderId: normalizedWorkOrderId,
        quotationId: normalizedQuotationId,
        data: getAdminBootstrap_(session)
    };
}

function saveVendorQuotation(token, payload) {
    const session = requireVendor_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['workOrderId', 'category']);

    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', input.workOrderId);
    const now = nowIso_();
    const rowInfo = input.quotationId ? findVendorQuotationRecordById_(session.userId, input.quotationId) : null;
    const previousWorkOrderId = rowInfo ? String(rowInfo.row.workOrderId || '').trim() : '';
    const quotationId = input.quotationId || nextQuotationNumber_(input.quotationDate || now);

    const existingImages = normalizeStoredFiles_(input.existingImages);
    const uploadedImages = normalizeStoredFiles_(input.newImages);
    const previousImages = rowInfo ? normalizeStoredFiles_(rowInfo.row.productImageJson) : [];
    const allImages = existingImages.concat(uploadedImages);
    if (allImages.length > 10) {
        throw new Error('Maximum 10 images are allowed.');
    }

    const row = {
        quotationId: quotationId,
        workOrderId: workOrder.workOrderId,
        workOrderNumber: workOrder.workOrderNumber,
        vendorUserId: session.userId,
        vendorCode: session.vendorCode,
        vendorName: session.vendorName,
        category: String(input.category || '').trim(),
        priceRange: String(input.priceRange || '').trim(),
        customerProject: String(workOrder.briefFromCustomer || '').trim(),
        productImageJson: JSON.stringify(allImages),
        description: String(input.description || '').trim(),
        quantityPcs: String(input.quantityPcs || '').trim(),
        cifBkk: String(input.cifBkk || '').trim(),
        targetPrice: normalizeNumber_(input.targetPrice),
        leadTime: String(input.leadTime || '').trim(),
        quotationDate: toIsoDate_(input.quotationDate || now),
        remark: String(input.remark || '').trim(),
        sample: String(input.sample || '').trim(),
        status: String(input.status || 'SUBMITTED').trim().toUpperCase(),
        comment: String(input.comment || '').trim(),
        thaiPrice: rowInfo ? rowInfo.row.thaiPrice : '',
        adminNote: rowInfo ? rowInfo.row.adminNote : '',
        source: 'WEBAPP',
        vendorSheetRowId: rowInfo ? rowInfo.row.vendorSheetRowId : '',
        quotationFolderId: rowInfo ? String(rowInfo.row.quotationFolderId || '').trim() : '',
        createdAt: rowInfo ? rowInfo.row.createdAt : now,
        updatedAt: now,
        syncedAt: ''
    };

    const user = session;
    if (!user || !String(user.vendorSheetUrl || '').trim()) {
        throw new Error('Supplier Google Sheet is not configured. Please contact admin.');
    }
    const syncResult = syncQuotationToVendorSheet_(user, row);
    if (syncResult && syncResult.rowId) {
        row.vendorSheetRowId = syncResult.rowId;
        row.syncedAt = now;
    }
    if (previousWorkOrderId && previousWorkOrderId !== workOrder.workOrderId) {
        removeWorkOrderQuotationReference_(previousWorkOrderId, row.quotationId);
    }
    updateWorkOrderQuotationReference_(workOrder.workOrderId, row.quotationId);

    return {
        ok: true,
        quotation: mapQuotationForUi_(row, workOrder),
        finalizeJob: {
            quotationId: row.quotationId,
            previousImages: previousImages,
            currentImages: allImages,
            action: rowInfo ? 'UPDATE_QUOTATION' : 'CREATE_QUOTATION'
        }
    };
}

function finalizeVendorQuotationSave(token, payload) {
    const session = requireVendor_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['quotationId']);

    const rowInfo = findVendorQuotationRecordById_(session.userId, input.quotationId);
    if (!rowInfo) {
        throw new Error('Quotation not found.');
    }

    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', rowInfo.row.workOrderId);
    const previousImages = normalizeStoredFiles_(input.previousImages);
    const currentImages = normalizeStoredFiles_(input.currentImages || rowInfo.row.productImageJson);
    const finalizedResult = finalizeQuotationFiles_(
        currentImages,
        rowInfo.row.workOrderNumber,
        rowInfo.row.quotationId,
        workOrder.workOrderFolderId,
        rowInfo.row.quotationFolderId
    );
    const finalizedImages = finalizedResult.files;
    deleteRemovedFiles_(previousImages, finalizedImages);

    const now = nowIso_();
    const patch = {
        productImageJson: JSON.stringify(finalizedImages),
        quotationFolderId: finalizedResult.quotationFolderId,
        updatedAt: now,
        syncedAt: ''
    };
    const rowForSync = Object.assign({}, rowInfo.row, patch);
    const user = session;
    if (!user || !String(user.vendorSheetUrl || '').trim()) {
        throw new Error('Supplier Google Sheet is not configured. Please contact admin.');
    }
    const syncResult = syncQuotationToVendorSheet_(user, rowForSync);
    if (syncResult && syncResult.rowId) {
        patch.vendorSheetRowId = syncResult.rowId;
        patch.syncedAt = now;
    }
    updateWorkOrderQuotationReference_(workOrder.workOrderId, rowInfo.row.quotationId);

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: String(input.action || 'UPDATE_QUOTATION'),
        entityType: 'QUOTATION',
        entityId: rowInfo.row.quotationId,
        detailJson: JSON.stringify({ workOrderNumber: rowInfo.row.workOrderNumber })
    });

    if (String(input.action || '').trim().toUpperCase() === 'CREATE_QUOTATION') {
        try {
            notifyWorkOrderOwnerOfNewQuotation_(workOrder, Object.assign({}, rowInfo.row, patch), session);
        } catch (error) {
            Logger.log('New quotation admin notification failed for ' + rowInfo.row.quotationId + ': ' + error);
        }
    }

    return {
        ok: true,
        quotation: mapQuotationForUi_(Object.assign({}, rowInfo.row, patch), workOrder)
    };
}

function deleteVendorQuotation(token, payload) {
    const session = requireVendor_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['quotationId']);

    const quotationRecord = findVendorQuotationRecordById_(session.userId, input.quotationId);
    if (!quotationRecord) {
        throw new Error('Quotation not found.');
    }

    const quotation = quotationRecord.row;
    const user = quotationRecord.user || session;
    deleteVendorSheetRow_(user.vendorSheetUrl, parseVendorSheetRowId_(quotation.vendorSheetRowId), quotation.quotationId);
    deleteRemovedFiles_(normalizeStoredFiles_(quotation.productImageJson), []);
    trashDriveFolderById_(quotation.quotationFolderId);
    removeWorkOrderQuotationReference_(quotation.workOrderId, quotation.quotationId);

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'DELETE_QUOTATION',
        entityType: 'QUOTATION',
        entityId: quotation.quotationId,
        detailJson: JSON.stringify({ workOrderId: quotation.workOrderId, workOrderNumber: quotation.workOrderNumber })
    });

    return {
        ok: true,
        quotationId: quotation.quotationId,
        workOrderId: quotation.workOrderId,
        workOrderNumber: quotation.workOrderNumber
    };
}

function getVendorQuotationsForWorkOrder(token, workOrderId) {
    const session = requireVendor_(token);
    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', workOrderId);
    const quotationIds = getWorkOrderQuotationRefs_(workOrder);
    const quotations = getVendorQuotationRowsByWorkOrder_(session.userId, workOrder.workOrderNumber, quotationIds).map(function (row) {
        return mapVendorSheetQuotationForUi_(row, workOrder, session);
    }).sort(function (left, right) {
        return String(right.quotationDate || '').localeCompare(String(left.quotationDate || '')) || String(right.quotationId || '').localeCompare(String(left.quotationId || ''));
    });

    return {
        ok: true,
        workOrder: mapWorkOrderForUi_(workOrder, quotations.length),
        quotations: quotations
    };
}

function getVendorQuotations(token) {
    const session = requireVendor_(token);
    return {
        ok: true,
        quotations: getVendorQuotations_(session)
    };
}

function syncVendorSheetAsAdmin(token, userId) {
    const session = requireAdmin_(token);
    syncVendorSheetInternal_(userId);
    return {
        ok: true,
        data: getAdminBootstrap_(session)
    };
}

function getAdminVendorUsers(token) {
    requireAdmin_(token);
    return {
        ok: true,
        users: getAdminVendorUsers_()
    };
}

function getAdminBootstrap_(session) {
    const profile = createProfileTimer_('getAdminBootstrap_');
    const workOrders = getTable_(APP_CONFIG.sheets.workOrders.name).rows;
    addProfileSegment_(profile, 'loadWorkOrders');
    const users = getTable_(APP_CONFIG.sheets.users.name).rows;
    addProfileSegment_(profile, 'loadUsers');

    const summary = {
        total: workOrders.length,
        withoutQuote: 0,
        quoted: 0,
        closed: 0,
        other: 0,
        vendorUsers: 0,
        activeVendors: 0,
        totalQuotations: 0
    };

    users.forEach(function (row) {
        if (row.role !== 'vendor') {
            return;
        }
        summary.vendorUsers += 1;
        if (String(row.isActive).toUpperCase() === 'TRUE') {
            summary.activeVendors += 1;
        }
    });
    addProfileSegment_(profile, 'countUsers');

    const mappedWorkOrders = workOrders
        .map(function (row) {
            const status = String(row.status || '').toUpperCase();
            const quotationRefs = getWorkOrderQuotationRefs_(row);
            const quoteCount = quotationRefs.length || (normalizeNumber_(row.quotationCount) || 0);
            summary.totalQuotations += quoteCount;
            if (status === 'CLOSED') {
                summary.closed += 1;
            } else if (quoteCount > 0) {
                summary.quoted += 1;
            } else if (!status || status === 'OPEN' || status === 'PUBLISHED') {
                summary.withoutQuote += 1;
            } else {
                summary.other += 1;
            }
            return mapWorkOrderForUi_(row, quoteCount);
        })
        .sort(compareWorkOrdersNewestFirst_);
    addProfileSegment_(profile, 'mapWorkOrders');

    logProfileTimer_(profile, {
        role: 'admin',
        userId: session.userId,
        workOrders: workOrders.length,
        users: users.length
    });

    return {
        summary: summary,
        workOrders: mappedWorkOrders,
        me: session
    };
}

function getAdminVendorUsers_() {
    return getTable_(APP_CONFIG.sheets.users.name).rows
        .map(function (row) { return sanitizeUser_(row); })
        .sort(function (left, right) {
            return String(left.role || '').localeCompare(String(right.role || ''))
                || String(left.vendorName || left.displayName || left.username || '').localeCompare(String(right.vendorName || right.displayName || right.username || ''))
                || String(left.username || '').localeCompare(String(right.username || ''));
        });
}

function normalizeManagedUserRole_(value) {
    const normalizedRole = String(value || '').trim().toLowerCase();
    if (normalizedRole !== 'admin' && normalizedRole !== 'vendor') {
        throw new Error('Role must be admin or vendor.');
    }
    return normalizedRole;
}

function ensureAdminAccessSafety_(rows, currentUser, nextValues, session) {
    const currentUserId = String(currentUser && currentUser.userId || '').trim();
    const nextRole = String(nextValues && nextValues.role || '').trim().toLowerCase();
    const nextIsActive = !!(nextValues && nextValues.isActive);
    const sessionUserId = String(session && session.userId || '').trim();
    const activeAdminCount = (rows || []).reduce(function (count, row) {
        const isAdmin = String(row && row.role || '').trim().toLowerCase() === 'admin';
        const isActive = String(row && row.isActive || '').toUpperCase() === 'TRUE';
        return count + (isAdmin && isActive ? 1 : 0);
    }, 0);
    const isCurrentUserAdmin = String(currentUser && currentUser.role || '').trim().toLowerCase() === 'admin'
        && String(currentUser && currentUser.isActive || '').toUpperCase() === 'TRUE';
    const remainsActiveAdmin = nextRole === 'admin' && nextIsActive;

    if (currentUserId && currentUserId === sessionUserId) {
        if (nextRole !== 'admin') {
            throw new Error('You cannot remove your own admin role.');
        }
        if (!nextIsActive) {
            throw new Error('You cannot disable your own access.');
        }
    }

    if (isCurrentUserAdmin && !remainsActiveAdmin && activeAdminCount <= 1) {
        throw new Error('At least one active admin must remain in the system.');
    }
}

function getVendorBootstrap_(session, vendorQuotationRows) {
    const profile = createProfileTimer_('getVendorBootstrap_');
    const workOrders = getTable_(APP_CONFIG.sheets.workOrders.name).rows;
    addProfileSegment_(profile, 'loadWorkOrders');
    const vendorUser = session;
    addProfileSegment_(profile, 'loadVendorUser');
    const spreadsheet = vendorUser && vendorUser.vendorSheetUrl ? openSpreadsheetByUrl_(vendorUser.vendorSheetUrl) : null;
    addProfileSegment_(profile, 'openVendorSpreadsheet');
    const quotationRows = Array.isArray(vendorQuotationRows) ? vendorQuotationRows : [];
    const indexEntries = quotationRows.length
        ? quotationRows.map(function (row) { return buildVendorQuotationIndexRowObjectFromRaw_(row); }).filter(function (entry) { return !!entry; })
        : (spreadsheet ? getVendorQuotationRowsFromIndex_(spreadsheet) : []);
    addProfileSegment_(profile, 'loadVendorIndex');
    const quotationCountByWorkOrderNumber = {};

    indexEntries.forEach(function (entry) {
        const workOrderNumber = String(entry['work order number'] || '').trim();
        if (!workOrderNumber) {
            return;
        }
        quotationCountByWorkOrderNumber[workOrderNumber] = (quotationCountByWorkOrderNumber[workOrderNumber] || 0) + 1;
    });
    addProfileSegment_(profile, 'countVendorQuotations');

    const summary = {
        total: 0,
        pendingQuote: 0,
        submitted: 0,
        closed: 0,
        other: 0
    };

    const openWorkOrders = workOrders
        .filter(function (row) { return String(row.status || 'OPEN').toUpperCase() !== 'ARCHIVED'; })
        .map(function (row) {
            const quoteCount = quotationCountByWorkOrderNumber[String(row.workOrderNumber || '').trim()] || 0;
            summary.total += 1;
            if (String(row.status || '').toUpperCase() === 'CLOSED') {
                summary.closed += 1;
            } else if (quoteCount > 0) {
                summary.submitted += 1;
            } else if (!row.status || String(row.status).toUpperCase() === 'OPEN' || String(row.status).toUpperCase() === 'PUBLISHED') {
                summary.pendingQuote += 1;
            } else {
                summary.other += 1;
            }
            return Object.assign(mapWorkOrderForUi_(row, 0), {
                myQuotationCount: quoteCount
            });
        })
        .sort(compareWorkOrdersNewestFirst_);
    addProfileSegment_(profile, 'mapOpenWorkOrders');

    logProfileTimer_(profile, {
        role: 'vendor',
        userId: session.userId,
        workOrders: workOrders.length,
        indexEntries: indexEntries.length
    });

    return {
        summary: summary,
        workOrders: openWorkOrders,
        me: session
    };
}

function getVendorQuotations_(session, vendorQuotationRows) {
    const vendorUser = session;
    const spreadsheet = vendorUser && vendorUser.vendorSheetUrl ? openSpreadsheetByUrl_(vendorUser.vendorSheetUrl) : null;
    if (!spreadsheet && !(Array.isArray(vendorQuotationRows) && vendorQuotationRows.length)) {
        return [];
    }

    const workOrders = getTable_(APP_CONFIG.sheets.workOrders.name).rows;
    const workOrdersByNumber = buildWorkOrderMapByNumber_(workOrders);
    const quotationRows = Array.isArray(vendorQuotationRows) ? vendorQuotationRows : [];
    const indexEntries = quotationRows.length
        ? quotationRows.map(function (row) { return buildVendorQuotationIndexRowObjectFromRaw_(row); }).filter(function (entry) { return !!entry; })
        : (spreadsheet ? getVendorQuotationRowsFromIndex_(spreadsheet) : []);
    const recentRows = quotationRows.length
        ? quotationRows
        : (spreadsheet ? resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, indexEntries
            .slice()
            .sort(function (left, right) {
                return String(right['Submitted Date'] || right['Quotation Date'] || '').localeCompare(String(left['Submitted Date'] || left['Quotation Date'] || ''))
                    || String(right['Quotation number'] || '').localeCompare(String(left['Quotation number'] || ''));
            })) : []);

    return recentRows
        .map(function (row) {
            const workOrderNumber = String(row['work order number'] || '').trim();
            const workOrder = workOrdersByNumber[workOrderNumber] || null;
            return mapVendorSheetQuotationForUi_(row, workOrder, vendorUser);
        })
        .sort(function (left, right) { return String(right.updatedAt).localeCompare(String(left.updatedAt)); });
}

function syncVendorSheetInternal_(userId) {
    const user = getUserById_(userId);
    if (!user || !user.vendorSheetUrl) {
        return [];
    }

    const rows = getAllVendorQuotationRows_(userId);
    syncWorkOrderQuotationRefsForVendorRows_(rows);
    return rows;
}

function syncWorkOrderQuotationCountsForIds_(workOrderIds) {
    const uniqueWorkOrderIds = (workOrderIds || []).filter(function (value, index, list) {
        return value && list.indexOf(value) === index;
    });
    if (!uniqueWorkOrderIds.length) {
        return;
    }

    const targetIds = uniqueWorkOrderIds.reduce(function (accumulator, workOrderId) {
        accumulator[workOrderId] = true;
        return accumulator;
    }, {});

    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    workOrdersTable.rows.forEach(function (row, index) {
        const workOrderId = String(row.workOrderId || '').trim();
        if (!targetIds[workOrderId]) {
            return;
        }
        const quotationRefs = getWorkOrderQuotationRefs_(row);
        updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, index + 2, {
            quotationCount: quotationRefs.length,
            Quotations: quotationRefs.join(', ')
        });
    });
}

function syncQuotationToVendorSheet_(user, quotation) {
    if (!user || !user.vendorSheetUrl) {
        return null;
    }

    const spreadsheet = openSpreadsheetByUrl_(user.vendorSheetUrl);
    const targetSheet = ensureVendorSheet_(user.vendorSheetUrl, quotation.quotationDate || quotation.updatedAt);
    const vendorRow = buildVendorSheetRow_(quotation);
    const indexedLocation = findVendorQuotationRowFromIndexById_(spreadsheet, quotation.quotationId);
    const previousLocation = indexedLocation
        ? { sheetName: String(indexedLocation.__sheetName || '').trim(), rowIndex: Number(indexedLocation.__rowIndex) || 0 }
        : parseVendorSheetRowId_(quotation.vendorSheetRowId);
    let existingRowIndex = previousLocation && previousLocation.sheetName === targetSheet.getName()
        ? Number(previousLocation.rowIndex) || -1
        : -1;

    if (existingRowIndex > 1) {
        const existingRow = buildVendorSheetRowObject_(targetSheet, existingRowIndex);
        if (!existingRow || String(existingRow['Quotation number'] || '').trim() !== String(quotation.quotationId || '').trim()) {
            existingRowIndex = -1;
        }
    }

    if (previousLocation && previousLocation.sheetName !== targetSheet.getName()) {
        clearVendorSheetRow_(user.vendorSheetUrl, previousLocation);
    }

    if (existingRowIndex < 0) {
        existingRowIndex = findVendorSheetRowIndexByQuotationId_(targetSheet, quotation.quotationId);
    }

    if (existingRowIndex > 1) {
        targetSheet.getRange(existingRowIndex, 1, 1, vendorRow.length).setValues([vendorRow]);
        upsertVendorQuotationIndexRecord_(user.vendorSheetUrl, quotation, targetSheet.getName(), existingRowIndex);
        return { rowId: targetSheet.getName() + '!' + String(existingRowIndex) };
    }

    targetSheet.appendRow(vendorRow);
    upsertVendorQuotationIndexRecord_(user.vendorSheetUrl, quotation, targetSheet.getName(), targetSheet.getLastRow());
    return { rowId: targetSheet.getName() + '!' + String(targetSheet.getLastRow()) };
}

function getVendorQuotationRowsByWorkOrder_(userOrUserId, workOrderNumber, quotationIds) {
    const user = normalizeVendorUserInput_(userOrUserId);
    if (!user || !user.vendorSheetUrl) {
        return [];
    }

    const spreadsheet = openSpreadsheetByUrl_(user.vendorSheetUrl);
    const normalizedWorkOrderNumber = String(workOrderNumber || '').trim();
    const normalizedQuotationIds = Array.isArray(quotationIds) && quotationIds.length ? quotationIds.reduce(function (accumulator, quotationId) {
        const normalizedQuotationId = String(quotationId || '').trim();
        if (normalizedQuotationId) {
            accumulator[normalizedQuotationId] = true;
        }
        return accumulator;
    }, {}) : null;
    let indexState = getVendorQuotationIndexState_(spreadsheet);
    if (!indexState.rows.length) {
        rebuildVendorQuotationIndex_(spreadsheet);
        indexState = getVendorQuotationIndexState_(spreadsheet);
    }
    return resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, (indexState.byWorkOrderNumber[normalizedWorkOrderNumber] || []).filter(function (entry) {
        if (String(entry['work order number'] || '').trim() !== normalizedWorkOrderNumber) {
            return false;
        }
        if (!normalizedQuotationIds) {
            return true;
        }
        return !!normalizedQuotationIds[String(entry['Quotation number'] || '').trim()];
    }));
}

function mapVendorSheetQuotationForUi_(row, workOrder, vendorUser) {
    const images = normalizeStoredFiles_(row['attachmentJson'] || '[]');
    const updatedAt = getVendorSheetSubmittedDate_(row) || String(row.__updatedAt || row['Quotation Date'] || '').trim();
    return {
        quotationId: String(row['Quotation number'] || '').trim(),
        workOrderId: workOrder ? workOrder.workOrderId : '',
        workOrderNumber: String(row['work order number'] || (workOrder ? workOrder.workOrderNumber : '') || '').trim(),
        vendorUserId: vendorUser ? vendorUser.userId : '',
        vendorCode: vendorUser ? vendorUser.vendorCode : '',
        vendorName: vendorUser ? vendorUser.vendorName : '',
        category: String(row['Category'] || '').trim(),
        priceRange: String(row['Price Range'] || '').trim(),
        customerProject: String(row['Customer/Project'] || '').trim(),
        images: images,
        description: String(row['Description'] || '').trim(),
        quantityPcs: String(row['Quantity(pcs)'] || '').trim(),
        cifBkk: String(row['CIF BKK'] || '').trim(),
        targetPrice: normalizeNumber_(row['Target price']),
        leadTime: String(row['Lead time'] || '').trim(),
        quotationDate: normalizeDateFieldForUi_(row['Quotation Date']),
        remark: String(row['Remark'] || '').trim(),
        sample: String(row['Sample'] || '').trim(),
        status: String(row['Status'] || 'SUBMITTED').trim().toUpperCase(),
        comment: String(row['Comment'] || '').trim(),
        thaiPrice: normalizeNumber_(row['Thai Price']),
        adminNote: String(row['Admin Note'] || '').trim(),
        source: 'VENDOR_SHEET',
        updatedAt: updatedAt || normalizeDateFieldForUi_(row['Quotation Date']),
        quotationFolderId: String(row['quotationFolderId'] || '').trim(),
        vendorSheetRowId: row.__sheetName + '!' + String(row.__rowIndex),
        workOrder: workOrder ? mapWorkOrderForUi_(workOrder, 0) : null
    };
}

function normalizeVendorUserInput_(userOrUserId) {
    if (!userOrUserId) {
        return null;
    }
    if (typeof userOrUserId === 'string') {
        return getUserById_(userOrUserId);
    }
    return userOrUserId;
}

function getVendorUsersWithSheets_() {
    return getTable_(APP_CONFIG.sheets.users.name).rows.filter(function (row) {
        return row.role === 'vendor' && String(row.vendorSheetUrl || '').trim();
    });
}

function buildWorkOrderMapByNumber_(workOrders) {
    return (workOrders || []).reduce(function (accumulator, row) {
        const workOrderNumber = String(row && row.workOrderNumber || '').trim();
        if (workOrderNumber && !accumulator[workOrderNumber]) {
            accumulator[workOrderNumber] = row;
        }
        return accumulator;
    }, {});
}

function getActiveSupplierUsers_() {
    return getTable_(APP_CONFIG.sheets.users.name).rows.filter(function (row) {
        return row.role === 'vendor'
            && String(row.isActive).toUpperCase() === 'TRUE'
            && String(row.email || '').trim();
    });
}

function notifySuppliersOfNewWorkOrder_(workOrder) {
    if (!workOrder || !String(workOrder.workOrderId || '').trim()) {
        return {
            recipientCount: 0,
            notifiedCount: 0,
            failedCount: 0
        };
    }

    const recipients = getActiveSupplierUsers_();
    if (!recipients.length) {
        return {
            recipientCount: 0,
            notifiedCount: 0,
            failedCount: 0
        };
    }

    const appUrl = getWebAppUrl_();
    const subject = APP_CONFIG.appName + ' new work order ' + String(workOrder.workOrderNumber || '').trim();
    const detailRows = [
        ['Work Order', workOrder.workOrderNumber],
        ['Brief Date', workOrder.briefDate],
        ['Deadline To Quote', workOrder.deadlineToQuote],
        ['Customer Brief', workOrder.briefFromCustomer],
        ['Material', workOrder.material],
        ['Size', workOrder.size],
        ['Printing', workOrder.printing],
        ['Packing', workOrder.packing],
        ['Remarks', workOrder.remarks]
    ].filter(function (entry) {
        return String(entry[1] || '').trim();
    }).map(function (entry) {
        return '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">'
            + escapeHtml_(entry[0])
            + '</td><td style="padding:8px 12px;border:1px solid #dbe4e8">'
            + escapeHtml_(entry[1])
            + '</td></tr>';
    }).join('');

    let notifiedCount = 0;
    let failedCount = 0;

    recipients.forEach(function (user) {
        const htmlBody = [
            '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#16323a">',
            '<h2 style="margin:0 0 12px;color:#20B2AA">New work order available</h2>',
            '<p style="margin:0 0 12px">Hello ' + escapeHtml_(user.displayName || user.vendorName || 'Supplier') + ',</p>',
            '<p style="margin:0 0 12px">A new work order is ready for quotation. Please review the details below and submit your quotation in the web app.</p>',
            '<table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:640px">',
            detailRows,
            '</table>',
            (appUrl
                ? '<p style="margin:0 0 16px"><a href="' + escapeHtml_(appUrl) + '" style="display:inline-block;border-radius:999px;background:#20B2AA;color:#ffffff;text-decoration:none;padding:10px 18px;font-weight:600">Open Web App</a></p>'
                : ''),
            '<p style="margin:0;color:#64748b;font-size:12px">This notification was generated automatically when a new work order was created.</p>',
            '</div>'
        ].join('');

        try {
            MailApp.sendEmail({
                to: String(user.email || '').trim(),
                subject: subject,
                htmlBody: htmlBody
            });
            notifiedCount += 1;
        } catch (error) {
            failedCount += 1;
            Logger.log('Supplier work order notification failed for ' + user.email + ': ' + error);
        }
    });

    return {
        recipientCount: recipients.length,
        notifiedCount: notifiedCount,
        failedCount: failedCount
    };
}

function notifyWorkOrderOwnerOfNewQuotation_(workOrder, quotationRow, vendorUser) {
    const normalizedCreatedBy = String(workOrder && workOrder.createdBy || '').trim();
    if (!normalizedCreatedBy) {
        return false;
    }

    const ownerUser = getUserById_(normalizedCreatedBy);
    if (!ownerUser) {
        Logger.log('New quotation notification skipped: owner user not found for work order ' + String(workOrder && workOrder.workOrderId || ''));
        return false;
    }

    const ownerEmail = String(ownerUser.email || '').trim();
    if (!ownerEmail) {
        Logger.log('New quotation notification skipped: owner email missing for user ' + ownerUser.userId);
        return false;
    }

    const appUrl = getWebAppUrl_();
    const quotationId = String(quotationRow && quotationRow.quotationId || '').trim();
    const workOrderNumber = String(workOrder && workOrder.workOrderNumber || '').trim();
    const subject = APP_CONFIG.appName + ' new quotation ' + quotationId + ' for ' + workOrderNumber;
    const detailRows = [
        ['Work Order', workOrderNumber],
        ['Quotation ID', quotationId],
        ['Supplier', vendorUser && (vendorUser.vendorName || vendorUser.displayName) || quotationRow && quotationRow.vendorName],
        ['Supplier Code', vendorUser && vendorUser.vendorCode || quotationRow && quotationRow.vendorCode],
        ['Category', quotationRow && quotationRow.category],
        ['Quotation Date', quotationRow && quotationRow.quotationDate],
        ['Target Price', quotationRow && quotationRow.targetPrice !== '' && quotationRow && quotationRow.targetPrice !== null && quotationRow && quotationRow.targetPrice !== undefined
            ? String(quotationRow.targetPrice) + ' RMB'
            : ''],
        ['Status', quotationRow && quotationRow.status],
        ['Submitted At', quotationRow && quotationRow.updatedAt],
        ['Customer Brief', workOrder && workOrder.briefFromCustomer]
    ].filter(function (entry) {
        return String(entry[1] || '').trim();
    }).map(function (entry) {
        return '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">'
            + escapeHtml_(entry[0])
            + '</td><td style="padding:8px 12px;border:1px solid #dbe4e8">'
            + escapeHtml_(entry[1])
            + '</td></tr>';
    }).join('');

    const htmlBody = [
        '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#16323a">',
        '<h2 style="margin:0 0 12px;color:#20B2AA">New quotation submitted</h2>',
        '<p style="margin:0 0 12px">Hello ' + escapeHtml_(ownerUser.displayName || ownerUser.username || 'Admin') + ',</p>',
        '<p style="margin:0 0 12px">A supplier has submitted a new quotation for the work order you created. Review the details below in the admin workspace.</p>',
        '<table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:640px">',
        detailRows,
        '</table>',
        (appUrl
            ? '<p style="margin:0 0 16px"><a href="' + escapeHtml_(appUrl) + '" style="display:inline-block;border-radius:999px;background:#20B2AA;color:#ffffff;text-decoration:none;padding:10px 18px;font-weight:600">Open Web App</a></p>'
            : ''),
        '<p style="margin:0;color:#64748b;font-size:12px">This notification was generated automatically when a supplier submitted a new quotation.</p>',
        '</div>'
    ].join('');

    MailApp.sendEmail({
        to: ownerEmail,
        subject: subject,
        htmlBody: htmlBody
    });
    return true;
}

function getWorkOrderQuotationRefs_(row) {
    const seen = {};
    return String((row && row.Quotations) || '')
        .split(',')
        .map(function (value) { return String(value || '').trim(); })
        .filter(function (value) {
            if (!value || seen[value]) {
                return false;
            }
            seen[value] = true;
            return true;
        });
}

function updateWorkOrderQuotationReference_(workOrderId, quotationId) {
    const normalizedWorkOrderId = String(workOrderId || '').trim();
    const normalizedQuotationId = String(quotationId || '').trim();
    if (!normalizedWorkOrderId || !normalizedQuotationId) {
        return null;
    }

    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    const rowInfo = findRowByField_(workOrdersTable, 'workOrderId', normalizedWorkOrderId);
    if (!rowInfo) {
        return null;
    }

    const quotationRefs = getWorkOrderQuotationRefs_(rowInfo.row);
    if (quotationRefs.indexOf(normalizedQuotationId) === -1) {
        quotationRefs.push(normalizedQuotationId);
    }

    const nextSerialized = quotationRefs.join(', ');
    const currentSerialized = getWorkOrderQuotationRefs_(rowInfo.row).join(', ');
    const nextCount = quotationRefs.length;
    const currentCount = normalizeNumber_(rowInfo.row.quotationCount) || 0;

    if (currentSerialized !== nextSerialized || currentCount !== nextCount) {
        updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, rowInfo.rowIndex, {
            Quotations: nextSerialized,
            quotationCount: nextCount
        });
    }

    return Object.assign({}, rowInfo.row, {
        Quotations: nextSerialized,
        quotationCount: nextCount
    });
}

function removeWorkOrderQuotationReference_(workOrderId, quotationId) {
    const normalizedWorkOrderId = String(workOrderId || '').trim();
    const normalizedQuotationId = String(quotationId || '').trim();
    if (!normalizedWorkOrderId || !normalizedQuotationId) {
        return null;
    }

    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    const rowInfo = findRowByField_(workOrdersTable, 'workOrderId', normalizedWorkOrderId);
    if (!rowInfo) {
        return null;
    }

    const nextRefs = getWorkOrderQuotationRefs_(rowInfo.row).filter(function (value) {
        return value !== normalizedQuotationId;
    });
    const nextSerialized = nextRefs.join(', ');
    const currentSerialized = getWorkOrderQuotationRefs_(rowInfo.row).join(', ');
    const nextCount = nextRefs.length;
    const currentCount = normalizeNumber_(rowInfo.row.quotationCount) || 0;
    const nextSelectedQuotationId = String(rowInfo.row.selectedQuotationId || '').trim() === normalizedQuotationId
        ? ''
        : String(rowInfo.row.selectedQuotationId || '').trim();
    const currentSelectedQuotationId = String(rowInfo.row.selectedQuotationId || '').trim();

    if (currentSerialized !== nextSerialized || currentCount !== nextCount || currentSelectedQuotationId !== nextSelectedQuotationId) {
        updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, rowInfo.rowIndex, {
            Quotations: nextSerialized,
            quotationCount: nextCount,
            selectedQuotationId: nextSelectedQuotationId
        });
    }

    return Object.assign({}, rowInfo.row, {
        Quotations: nextSerialized,
        quotationCount: nextCount,
        selectedQuotationId: nextSelectedQuotationId
    });
}

function syncWorkOrderQuotationRefsForVendorRows_(vendorRows) {
    const quotationRefsByWorkOrderNumber = {};
    (vendorRows || []).forEach(function (row) {
        const workOrderNumber = String(row['work order number'] || '').trim();
        const quotationId = String(row['Quotation number'] || '').trim();
        if (!workOrderNumber || !quotationId) {
            return;
        }
        if (!quotationRefsByWorkOrderNumber[workOrderNumber]) {
            quotationRefsByWorkOrderNumber[workOrderNumber] = [];
        }
        if (quotationRefsByWorkOrderNumber[workOrderNumber].indexOf(quotationId) === -1) {
            quotationRefsByWorkOrderNumber[workOrderNumber].push(quotationId);
        }
    });

    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
    workOrdersTable.rows.forEach(function (row, index) {
        const existingRefs = getWorkOrderQuotationRefs_(row);
        const syncedRefs = quotationRefsByWorkOrderNumber[String(row.workOrderNumber || '').trim()] || [];
        const mergedRefs = existingRefs.slice();
        syncedRefs.forEach(function (quotationId) {
            if (mergedRefs.indexOf(quotationId) === -1) {
                mergedRefs.push(quotationId);
            }
        });
        const nextSerialized = mergedRefs.join(', ');
        const currentSerialized = existingRefs.join(', ');
        const nextCount = mergedRefs.length;
        const currentCount = normalizeNumber_(row.quotationCount) || 0;
        const currentSelectedQuotationId = String(row.selectedQuotationId || '').trim();
        const nextSelectedQuotationId = mergedRefs.indexOf(currentSelectedQuotationId) >= 0 ? currentSelectedQuotationId : '';

        if (currentSerialized !== nextSerialized || currentCount !== nextCount || currentSelectedQuotationId !== nextSelectedQuotationId) {
            updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, index + 2, {
                Quotations: nextSerialized,
                quotationCount: nextCount,
                selectedQuotationId: nextSelectedQuotationId
            });
        }
    });
}

function buildVendorSheetRowObject_(sheet, rowIndex) {
    if (!sheet || rowIndex <= 1 || rowIndex > sheet.getLastRow()) {
        return null;
    }
    const rowValues = sheet.getRange(rowIndex, 1, 1, APP_CONFIG.vendorSheet.headers.length).getValues()[0];
    return buildVendorSheetRowObjectFromValues_(sheet.getName(), rowIndex, rowValues);
}

function buildVendorQuotationRecord_(user, rawRow) {
    if (!user || !rawRow) {
        return null;
    }
    const workOrderNumber = String(rawRow['work order number'] || '').trim();
    const workOrder = findOptionalByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderNumber', workOrderNumber);
    const createdAt = rawRow['Quotation Date'] ? toIsoDate_(rawRow['Quotation Date']) : nowIso_();
    const updatedAt = getVendorSheetSubmittedDate_(rawRow) || String(rawRow.__updatedAt || createdAt).trim();
    return {
        quotationId: String(rawRow['Quotation number'] || '').trim(),
        workOrderId: workOrder ? workOrder.workOrderId : '',
        workOrderNumber: workOrderNumber,
        vendorUserId: user.userId,
        vendorCode: user.vendorCode,
        vendorName: user.vendorName,
        category: String(rawRow['Category'] || '').trim(),
        priceRange: String(rawRow['Price Range'] || '').trim(),
        customerProject: String(rawRow['Customer/Project'] || '').trim(),
        productImageJson: String(rawRow['attachmentJson'] || '[]'),
        description: String(rawRow['Description'] || '').trim(),
        quantityPcs: String(rawRow['Quantity(pcs)'] || '').trim(),
        cifBkk: String(rawRow['CIF BKK'] || '').trim(),
        targetPrice: normalizeNumber_(rawRow['Target price']),
        leadTime: String(rawRow['Lead time'] || '').trim(),
        quotationDate: rawRow['Quotation Date'] ? toIsoDate_(rawRow['Quotation Date']) : '',
        remark: String(rawRow['Remark'] || '').trim(),
        sample: String(rawRow['Sample'] || '').trim(),
        status: String(rawRow['Status'] || 'SUBMITTED').trim().toUpperCase(),
        comment: String(rawRow['Comment'] || '').trim(),
        thaiPrice: normalizeNumber_(rawRow['Thai Price']),
        adminNote: String(rawRow['Admin Note'] || '').trim(),
        source: 'VENDOR_SHEET',
        vendorSheetRowId: rawRow.__sheetName + '!' + String(rawRow.__rowIndex),
        quotationFolderId: String(rawRow['quotationFolderId'] || '').trim(),
        createdAt: createdAt,
        updatedAt: updatedAt,
        syncedAt: updatedAt
    };
}

function getAllVendorQuotationRows_(userOrUserId) {
    const user = normalizeVendorUserInput_(userOrUserId);
    if (!user || !user.vendorSheetUrl) {
        return [];
    }

    const spreadsheet = openSpreadsheetByUrl_(user.vendorSheetUrl);
    const indexState = getVendorQuotationIndexState_(spreadsheet);
    if (indexState.rows.length) {
        return resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, indexState.rows);
    }
    return resolveVendorQuotationRowsFromIndexEntries_(spreadsheet, rebuildVendorQuotationIndex_(spreadsheet));
}

function findVendorQuotationRecordById_(userOrUserId, quotationId) {
    const user = normalizeVendorUserInput_(userOrUserId);
    const normalizedQuotationId = String(quotationId || '').trim();
    if (!user || !user.vendorSheetUrl || !normalizedQuotationId) {
        return null;
    }

    const spreadsheet = openSpreadsheetByUrl_(user.vendorSheetUrl);
    let indexEntry = findVendorQuotationRowFromIndexById_(spreadsheet, normalizedQuotationId);
    let rawRow = indexEntry ? resolveVendorQuotationRowFromIndexEntry_(spreadsheet, indexEntry) : null;
    if (!rawRow) {
        rebuildVendorQuotationIndex_(spreadsheet);
        indexEntry = findVendorQuotationRowFromIndexById_(spreadsheet, normalizedQuotationId);
        rawRow = indexEntry ? resolveVendorQuotationRowFromIndexEntry_(spreadsheet, indexEntry) : null;
    }

    if (!rawRow) {
        const sheets = getVendorQuotationSheets_(spreadsheet);
        for (let index = 0; index < sheets.length; index += 1) {
            const rowIndex = findVendorSheetRowIndexByQuotationId_(sheets[index], normalizedQuotationId);
            if (rowIndex > 0) {
                rawRow = buildVendorSheetRowObject_(sheets[index], rowIndex);
                if (rawRow) {
                    upsertVendorQuotationIndexFromRawRow_(spreadsheet, rawRow);
                }
                break;
            }
        }
    }

    if (!rawRow) {
        return null;
    }

    return {
        user: user,
        rawRow: rawRow,
        row: buildVendorQuotationRecord_(user, rawRow)
    };
}

function findVendorQuotationRecordAcrossUsers_(quotationId) {
    const vendors = getVendorUsersWithSheets_();
    for (let index = 0; index < vendors.length; index += 1) {
        const record = findVendorQuotationRecordById_(vendors[index], quotationId);
        if (record) {
            return record;
        }
    }
    return null;
}

