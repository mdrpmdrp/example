const APP_CONFIG = {
    appName: 'Quotation Bidding Hub',
    logo: {
        horizontal: 'https://img2.pic.in.th/logo-kv.png',
        square: 'https://img2.pic.in.th/logo-kv-square.png'
    },
    timezone: 'Asia/Bangkok',
    sessionHours: 12,
    otpMinutes: 15,
    uploadFolderName: 'QuotationBiddingUploads',
    tempUploadFolderName: '_temp',
    driveBatchPath: 'batch/drive/v3',
    sheets: {
        users: {
            name: 'Users',
            headers: [
                'userId',
                'role',
                'username',
                'passwordHash',
                'displayName',
                'vendorName',
                'vendorCode',
                'email',
                'vendorSheetUrl',
                'isActive',
                'mustChangePassword',
                'lastLoginAt',
                'createdAt',
                'updatedAt'
            ]
        },
        workOrders: {
            name: 'WorkOrders',
            headers: [
                'workOrderId',
                'workOrderNumber',
                'briefDate',
                'deadlineToQuote',
                'briefFromCustomer',
                'volumeValue',
                'volumeUnit',
                'budgetRmb',
                'material',
                'size',
                'printing',
                'packing',
                'remarks',
                'status',
                'createdBy',
                'createdAt',
                'updatedAt',
                'closedAt',
                'attachmentJson',
                'workOrderFolderId',
                'quotationCount'
            ]
        },
        quotations: {
            name: 'Quotations',
            headers: [
                'quotationId',
                'workOrderId',
                'workOrderNumber',
                'vendorUserId',
                'vendorCode',
                'vendorName',
                'category',
                'priceRange',
                'customerProject',
                'productImageJson',
                'description',
                'quantityPcs',
                'cifBkk',
                'targetPrice',
                'leadTime',
                'quotationDate',
                'remark',
                'sample',
                'status',
                'comment',
                'thaiPrice',
                'adminNote',
                'source',
                'vendorSheetRowId',
                'quotationFolderId',
                'createdAt',
                'updatedAt',
                'syncedAt'
            ]
        },
        passwordResets: {
            name: 'PasswordResets',
            headers: [
                'resetId',
                'userId',
                'username',
                'email',
                'otpHash',
                'expiresAt',
                'usedAt',
                'createdAt'
            ]
        },
        activityLogs: {
            name: 'ActivityLogs',
            headers: [
                'logId',
                'actorUserId',
                'actorRole',
                'action',
                'entityType',
                'entityId',
                'detailJson',
                'createdAt'
            ]
        },
        settings: {
            name: 'Settings',
            headers: ['key', 'value', 'updatedAt']
        }
    },
    vendorSheet: {
        sheetName: 'VendorQuotations',
        headers: [
            'quotationId',
            'workOrderId',
            'workOrderNumber',
            'category',
            'priceRange',
            'customerProject',
            'productImageJson',
            'description',
            'quantityPcs',
            'cifBkk',
            'targetPrice',
            'leadTime',
            'quotationDate',
            'remark',
            'sample',
            'status',
            'comment',
            'updatedAt'
        ]
    }
};

function doGet() {
    let html = HtmlService.createTemplateFromFile('Index')
    html.logo = APP_CONFIG.logo.square;
    return html
        .evaluate()
        .setTitle(APP_CONFIG.appName)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
}

function AppInit() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (!spreadsheet) {
            throw new Error('AppInit must be run from a spreadsheet-bound Apps Script project.');
        }

        const scriptProperties = PropertiesService.getScriptProperties();
        scriptProperties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
        ensureSecret_();
        const uploadFolderId = ensureUploadFolder_();
        scriptProperties.setProperty('UPLOAD_FOLDER_ID', uploadFolderId);
        scriptProperties.setProperty('TEMP_UPLOAD_FOLDER_ID', ensureTempUploadFolder_());
        ensureSheets_();
        ensureSettings_();
        const adminUser = seedAdminUser_();

        return {
            ok: true,
            spreadsheetId: spreadsheet.getId(),
            spreadsheetUrl: spreadsheet.getUrl(),
            uploadFolderId: uploadFolderId,
            adminUsername: adminUser.username,
            defaultPassword: 'Admin123!'
        };
    } finally {
        lock.releaseLock();
    }
}

function getPublicBootstrap() {
    return {
        ok: true,
        appName: APP_CONFIG.appName,
        registrationRequiresApproval: true,
        primaryColor: '#20B2AA'
    };
}

function checkRegistrationAvailability(payload) {
    const input = sanitizeObject_(payload);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const normalizedUsername = normalizeUsername_(input.username);
    const normalizedEmail = String(input.email || '').trim().toLowerCase();

    const usernameExists = normalizedUsername
        ? usersTable.rows.some(function (row) { return normalizeUsername_(row.username) === normalizedUsername; })
        : false;
    const emailExists = normalizedEmail
        ? usersTable.rows.some(function (row) { return String(row.email || '').trim().toLowerCase() === normalizedEmail; })
        : false;

    return {
        ok: true,
        usernameAvailable: normalizedUsername ? !usernameExists : true,
        emailAvailable: normalizedEmail ? !emailExists : true,
        usernameMessage: normalizedUsername
            ? (usernameExists ? 'This username is already in use.' : 'This username is available.')
            : '',
        emailMessage: normalizedEmail
            ? (emailExists ? 'This email is already in use.' : 'This email is available.')
            : ''
    };
}

function registerVendor(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['username', 'password', 'displayName', 'vendorName', 'email']);

    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const normalizedUsername = normalizeUsername_(input.username);
    const normalizedEmail = String(input.email || '').trim().toLowerCase();

    if (usersTable.rows.some(function (row) { return normalizeUsername_(row.username) === normalizedUsername; })) {
        throw new Error('Username already exists.');
    }
    if (usersTable.rows.some(function (row) { return String(row.email || '').trim().toLowerCase() === normalizedEmail; })) {
        throw new Error('Email already exists.');
    }

    const now = nowIso_();
    const row = {
        userId: generateId_('USR'),
        role: 'vendor',
        username: normalizedUsername,
        passwordHash: hashPassword_(input.password),
        displayName: String(input.displayName || '').trim(),
        vendorName: String(input.vendorName || '').trim(),
        vendorCode: createVendorCode_(input.vendorName),
        email: normalizedEmail,
        vendorSheetUrl: '',
        isActive: 'FALSE',
        mustChangePassword: 'FALSE',
        lastLoginAt: '',
        createdAt: now,
        updatedAt: now
    };

    appendRows_(APP_CONFIG.sheets.users.name, [row]);
    appendActivity_({
        actorUserId: row.userId,
        actorRole: 'vendor',
        action: 'REGISTER',
        entityType: 'USER',
        entityId: row.userId,
        detailJson: JSON.stringify({ username: row.username, email: row.email })
    });

    try {
        sendAdminRegistrationNotification_(row);
    } catch (error) {
        Logger.log('Registration notification failed: ' + error);
    }

    return {
        ok: true,
        message: 'Registration submitted. Please wait for admin approval before login.'
    };
}

function loginUser(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['username', 'password']);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const username = normalizeUsername_(input.username);
    const rowInfo = findRowByField_(usersTable, 'username', username);
    if (!rowInfo) {
        throw new Error('Invalid username or password.');
    }

    const user = rowInfo.row;
    if (String(user.isActive).toUpperCase() !== 'TRUE') {
        throw new Error('This account is not active yet. Please contact admin.');
    }
    if (!verifyPassword_(input.password, user.passwordHash)) {
        throw new Error('Invalid username or password.');
    }

    const sessionToken = createSessionToken_(user);

    return {
        ok: true,
        token: sessionToken,
        role: user.role,
        user: sanitizeUser_(user)
    };
}

function finalizeLoginSession(token) {
    const session = requireSession_(token);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const rowInfo = findRowByField_(usersTable, 'userId', session.userId);
    if (!rowInfo) {
        throw new Error('User not found.');
    }

    const now = nowIso_();
    updateRowByIndex_(APP_CONFIG.sheets.users.name, rowInfo.rowIndex, {
        lastLoginAt: now,
        updatedAt: now
    });

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'LOGIN',
        entityType: 'SESSION',
        entityId: session.userId,
        detailJson: JSON.stringify({ username: session.username })
    });

    return {
        ok: true,
        user: sanitizeUser_(Object.assign({}, rowInfo.row, {
            lastLoginAt: now,
            updatedAt: now
        }))
    };
}

function requestPasswordReset(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email']);
    const email = String(input.email || '').trim().toLowerCase();
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const rowInfo = usersTable.rows
        .map(function (row, index) { return { row: row, rowIndex: index + 2 }; })
        .find(function (entry) {
            return String(entry.row.email || '').trim().toLowerCase() === email;
        });

    if (!rowInfo) {
        throw new Error('This email address was not found in the system.');
    }

    const user = rowInfo.row;
    const otp = generateOtp_();
    const now = nowIso_();
    const expiresAt = new Date(Date.now() + APP_CONFIG.otpMinutes * 60 * 1000).toISOString();

    appendRows_(APP_CONFIG.sheets.passwordResets.name, [{
        resetId: generateId_('RST'),
        userId: user.userId,
        username: user.username,
        email: user.email,
        otpHash: hashPassword_(otp),
        expiresAt: expiresAt,
        usedAt: '',
        createdAt: now
    }]);

    MailApp.sendEmail({
        to: user.email,
        subject: APP_CONFIG.appName + ' password reset OTP',
        htmlBody: [
            '<div style="font-family:Arial,sans-serif;line-height:1.6">',
            '<h2 style="color:#20B2AA">Password Reset OTP</h2>',
            '<p>Your one-time password is:</p>',
            '<p style="font-size:24px;font-weight:bold;letter-spacing:4px">' + otp + '</p>',
            '<p>This code expires in ' + APP_CONFIG.otpMinutes + ' minutes.</p>',
            '</div>'
        ].join('')
    });

    appendActivity_({
        actorUserId: user.userId,
        actorRole: user.role,
        action: 'REQUEST_PASSWORD_RESET',
        entityType: 'USER',
        entityId: user.userId,
        detailJson: JSON.stringify({ email: user.email })
    });

    return {
        ok: true,
        message: 'OTP has been sent to your registered email address.'
    };
}

function verifyPasswordResetOtp(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email', 'otp']);

    const candidate = findLatestPasswordResetRequest_(String(input.email || '').trim().toLowerCase());
    validatePasswordResetOtp_(candidate, input.otp);

    return {
        ok: true,
        message: 'OTP verified successfully.'
    };
}

function resetPasswordWithOtp(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email', 'otp', 'newPassword']);

    const candidate = findLatestPasswordResetRequest_(String(input.email || '').trim().toLowerCase());
    validatePasswordResetOtp_(candidate, input.otp);

    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const userRow = findRowByField_(usersTable, 'userId', candidate.row.userId);
    if (!userRow) {
        throw new Error('User not found.');
    }

    const now = nowIso_();
    updateRowByIndex_(APP_CONFIG.sheets.users.name, userRow.rowIndex, {
        passwordHash: hashPassword_(input.newPassword),
        mustChangePassword: 'FALSE',
        updatedAt: now
    });
    updateRowByIndex_(APP_CONFIG.sheets.passwordResets.name, candidate.rowIndex, {
        usedAt: now
    });

    appendActivity_({
        actorUserId: userRow.row.userId,
        actorRole: userRow.row.role,
        action: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: userRow.row.userId,
        detailJson: JSON.stringify({ username: userRow.row.username })
    });

    return { ok: true };
}

function findLatestPasswordResetRequest_(email) {
    const resetTable = getTable_(APP_CONFIG.sheets.passwordResets.name);
    const candidate = resetTable.rows
        .map(function (row, index) { return { row: row, rowIndex: index + 2 }; })
        .filter(function (entry) {
            return String(entry.row.email || '').trim().toLowerCase() === email && !entry.row.usedAt;
        })
        .sort(function (left, right) { return String(right.row.createdAt).localeCompare(String(left.row.createdAt)); })[0];

    if (!candidate) {
        throw new Error('OTP not found or already used.');
    }

    return candidate;
}

function validatePasswordResetOtp_(candidate, otp) {
    if (new Date(candidate.row.expiresAt).getTime() < Date.now()) {
        throw new Error('OTP has expired.');
    }
    if (!verifyPassword_(otp, candidate.row.otpHash)) {
        throw new Error('OTP is incorrect.');
    }
}

function getBootstrapData(token) {
    const session = requireSession_(token);
    if (session.role === 'admin') {
        return {
            ok: true,
            role: 'admin',
            user: session,
            data: getAdminBootstrap_(session)
        };
    }

    return {
        ok: true,
        role: 'vendor',
        user: session,
        data: getVendorBootstrap_(session)
    };
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
        quotationCount: rowInfo ? (normalizeNumber_(rowInfo.row.quotationCount) || 0) : 0
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

    const now = nowIso_();
    const patch = {
        displayName: input.displayName != null ? String(input.displayName).trim() : rowInfo.row.displayName,
        vendorName: input.vendorName != null ? String(input.vendorName).trim() : rowInfo.row.vendorName,
        email: input.email != null ? String(input.email).trim().toLowerCase() : rowInfo.row.email,
        vendorSheetUrl: input.vendorSheetUrl != null ? String(input.vendorSheetUrl).trim() : rowInfo.row.vendorSheetUrl,
        isActive: booleanToSheet_(input.isActive != null ? input.isActive : rowInfo.row.isActive),
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
        detailJson: JSON.stringify({ isActive: patch.isActive, vendorSheetUrl: patch.vendorSheetUrl })
    });

    return {
        ok: true,
        data: getAdminBootstrap_(session)
    };
}

function getQuotationComparison(token, workOrderId) {
    requireAdmin_(token);
    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', workOrderId);
    const quotations = getTable_(APP_CONFIG.sheets.quotations.name).rows
        .filter(function (row) { return row.workOrderId === workOrderId; })
        .map(function (row) { return mapQuotationForUi_(row, workOrder); });

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

    const table = getTable_(APP_CONFIG.sheets.quotations.name);
    const rowInfo = findRowByField_(table, 'quotationId', input.quotationId);
    if (!rowInfo) {
        throw new Error('Quotation not found.');
    }

    updateRowByIndex_(APP_CONFIG.sheets.quotations.name, rowInfo.rowIndex, {
        thaiPrice: normalizeNumber_(input.thaiPrice),
        adminNote: String(input.adminNote || '').trim(),
        updatedAt: nowIso_()
    });

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

function saveVendorQuotation(token, payload) {
    const session = requireVendor_(token);
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['workOrderId', 'category', 'customerProject']);

    const workOrder = findRequiredByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', input.workOrderId);
    const table = getTable_(APP_CONFIG.sheets.quotations.name);
    const now = nowIso_();
    const rowInfo = input.quotationId ? findRowByField_(table, 'quotationId', input.quotationId) : null;
    const quotationId = input.quotationId || generateId_('QTN');
    if (rowInfo && rowInfo.row.vendorUserId !== session.userId) {
        throw new Error('You can edit only your own quotations.');
    }

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
        customerProject: String(input.customerProject || '').trim(),
        productImageJson: JSON.stringify(allImages),
        description: String(input.description || '').trim(),
        quantityPcs: normalizeNumber_(input.quantityPcs),
        cifBkk: normalizeNumber_(input.cifBkk),
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

    if (rowInfo) {
        updateRowByIndex_(APP_CONFIG.sheets.quotations.name, rowInfo.rowIndex, row);
    } else {
        appendRows_(APP_CONFIG.sheets.quotations.name, [row]);
    }

    syncWorkOrderQuotationCount_(row.workOrderId);

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

    const table = getTable_(APP_CONFIG.sheets.quotations.name);
    const rowInfo = findRowByField_(table, 'quotationId', input.quotationId);
    if (!rowInfo) {
        throw new Error('Quotation not found.');
    }
    if (rowInfo.row.vendorUserId !== session.userId) {
        throw new Error('You can edit only your own quotations.');
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
    const user = getUserById_(session.userId);
    const syncResult = syncQuotationToVendorSheet_(user, rowForSync);
    if (syncResult && syncResult.rowId) {
        patch.vendorSheetRowId = syncResult.rowId;
        patch.syncedAt = now;
    }

    updateRowByIndex_(APP_CONFIG.sheets.quotations.name, rowInfo.rowIndex, patch);

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: String(input.action || 'UPDATE_QUOTATION'),
        entityType: 'QUOTATION',
        entityId: rowInfo.row.quotationId,
        detailJson: JSON.stringify({ workOrderNumber: rowInfo.row.workOrderNumber })
    });

    return {
        ok: true,
        quotation: mapQuotationForUi_(Object.assign({}, rowInfo.row, patch), workOrder)
    };
}

function syncCurrentVendorSheet(token) {
    const session = requireVendor_(token);
    syncVendorSheetInternal_(session.userId);
    return {
        ok: true,
        data: getVendorBootstrap_(session)
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

function getAdminBootstrap_(session) {
    const workOrders = getTable_(APP_CONFIG.sheets.workOrders.name).rows;
    const quotations = getTable_(APP_CONFIG.sheets.quotations.name).rows;
    const users = getTable_(APP_CONFIG.sheets.users.name).rows;
    const quoteCountByWorkOrderId = {};

    quotations.forEach(function (row) {
        quoteCountByWorkOrderId[row.workOrderId] = (quoteCountByWorkOrderId[row.workOrderId] || 0) + 1;
    });

    const summary = {
        total: workOrders.length,
        withoutQuote: 0,
        quoted: 0,
        closed: 0,
        other: 0,
        vendorUsers: users.filter(function (row) { return row.role === 'vendor'; }).length,
        activeVendors: users.filter(function (row) { return row.role === 'vendor' && String(row.isActive).toUpperCase() === 'TRUE'; }).length,
        totalQuotations: quotations.length
    };

    const mappedWorkOrders = workOrders
        .map(function (row) {
            const status = String(row.status || '').toUpperCase();
            const quoteCount = quoteCountByWorkOrderId[row.workOrderId] || 0;
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
        .sort(function (left, right) { return String(right.briefDate).localeCompare(String(left.briefDate)); });

    const mappedUsers = users
        .filter(function (row) { return row.role === 'vendor'; })
        .map(function (row) { return sanitizeUser_(row); })
        .sort(function (left, right) { return String(left.vendorName || '').localeCompare(String(right.vendorName || '')); });

    return {
        summary: summary,
        workOrders: mappedWorkOrders,
        users: mappedUsers,
        me: sanitizeUser_(getUserById_(session.userId))
    };
}

function getVendorBootstrap_(session) {
    const workOrders = getTable_(APP_CONFIG.sheets.workOrders.name).rows;
    const quotations = getTable_(APP_CONFIG.sheets.quotations.name).rows.filter(function (row) { return row.vendorUserId === session.userId; });
    const quoteByWorkOrderId = {};
    quotations.forEach(function (row) {
        quoteByWorkOrderId[row.workOrderId] = row;
    });

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
            const quote = quoteByWorkOrderId[row.workOrderId] || null;
            summary.total += 1;
            if (String(row.status || '').toUpperCase() === 'CLOSED') {
                summary.closed += 1;
            } else if (quote) {
                summary.submitted += 1;
            } else if (!row.status || String(row.status).toUpperCase() === 'OPEN' || String(row.status).toUpperCase() === 'PUBLISHED') {
                summary.pendingQuote += 1;
            } else {
                summary.other += 1;
            }
            return Object.assign(mapWorkOrderForUi_(row, 0), {
                myQuotation: quote ? mapQuotationForUi_(quote, row) : null
            });
        })
        .sort(function (left, right) { return String(right.briefDate).localeCompare(String(left.briefDate)); });

    return {
        summary: summary,
        workOrders: openWorkOrders,
        quotations: quotations.map(function (row) {
            return mapQuotationForUi_(row, findOptionalByField_(APP_CONFIG.sheets.workOrders.name, 'workOrderId', row.workOrderId));
        }).sort(function (left, right) { return String(right.updatedAt).localeCompare(String(left.updatedAt)); }),
        me: sanitizeUser_(getUserById_(session.userId))
    };
}

function syncVendorSheetInternal_(userId) {
    const user = getUserById_(userId);
    if (!user || !user.vendorSheetUrl) {
        return;
    }

    const vendorSheet = ensureVendorSheet_(user.vendorSheetUrl);
    const values = vendorSheet.getDataRange().getValues();
    if (values.length <= 1) {
        return;
    }

    const headers = values[0];
    const rows = values.slice(1).map(function (row, index) {
        const objectRow = {};
        headers.forEach(function (header, headerIndex) {
            objectRow[header] = row[headerIndex];
        });
        objectRow.__rowIndex = index + 2;
        return objectRow;
    });

    const centralTable = getTable_(APP_CONFIG.sheets.quotations.name);
    const centralById = {};
    centralTable.rows.forEach(function (row, index) {
        centralById[row.quotationId] = { row: row, rowIndex: index + 2 };
    });
    const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);

    rows.forEach(function (row) {
        const workOrder = row.workOrderId
            ? findRowByField_(workOrdersTable, 'workOrderId', row.workOrderId)
            : findRowByField_(workOrdersTable, 'workOrderNumber', row.workOrderNumber);
        if (!workOrder) {
            return;
        }

        const now = nowIso_();
        const mapped = {
            quotationId: row.quotationId || generateId_('QTN'),
            workOrderId: workOrder.row.workOrderId,
            workOrderNumber: workOrder.row.workOrderNumber,
            vendorUserId: user.userId,
            vendorCode: user.vendorCode,
            vendorName: user.vendorName,
            category: String(row.category || '').trim(),
            priceRange: String(row.priceRange || '').trim(),
            customerProject: String(row.customerProject || '').trim(),
            productImageJson: String(row.productImageJson || '[]'),
            description: String(row.description || '').trim(),
            quantityPcs: normalizeNumber_(row.quantityPcs),
            cifBkk: normalizeNumber_(row.cifBkk),
            targetPrice: normalizeNumber_(row.targetPrice),
            leadTime: String(row.leadTime || '').trim(),
            quotationDate: toIsoDate_(row.quotationDate || now),
            remark: String(row.remark || '').trim(),
            sample: String(row.sample || '').trim(),
            status: String(row.status || 'SUBMITTED').trim().toUpperCase(),
            comment: String(row.comment || '').trim(),
            thaiPrice: centralById[row.quotationId] ? centralById[row.quotationId].row.thaiPrice : '',
            adminNote: centralById[row.quotationId] ? centralById[row.quotationId].row.adminNote : '',
            source: 'SHEET_SYNC',
            vendorSheetRowId: String(row.__rowIndex),
            quotationFolderId: centralById[row.quotationId] ? centralById[row.quotationId].row.quotationFolderId : '',
            createdAt: centralById[row.quotationId] ? centralById[row.quotationId].row.createdAt : now,
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : now,
            syncedAt: now
        };

        if (centralById[mapped.quotationId]) {
            updateRowByIndex_(APP_CONFIG.sheets.quotations.name, centralById[mapped.quotationId].rowIndex, mapped);
        } else {
            appendRows_(APP_CONFIG.sheets.quotations.name, [mapped]);
        }

        syncWorkOrderQuotationCount_(mapped.workOrderId);
    });
}

function syncQuotationToVendorSheet_(user, quotation) {
    if (!user || !user.vendorSheetUrl) {
        return null;
    }

    const vendorSheet = ensureVendorSheet_(user.vendorSheetUrl);
    const values = vendorSheet.getDataRange().getValues();
    const headers = values.length ? values[0] : APP_CONFIG.vendorSheet.headers;
    const existingRowIndex = values.slice(1).findIndex(function (row) { return row[0] === quotation.quotationId; });
    const vendorRow = APP_CONFIG.vendorSheet.headers.map(function (header) {
        if (header === 'updatedAt') {
            return nowIso_();
        }
        return quotation[header] != null ? quotation[header] : '';
    });

    if (existingRowIndex >= 0) {
        vendorSheet.getRange(existingRowIndex + 2, 1, 1, headers.length).setValues([vendorRow]);
        return { rowId: String(existingRowIndex + 2) };
    }

    vendorSheet.appendRow(vendorRow);
    return { rowId: String(vendorSheet.getLastRow()) };
}

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
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
    }

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

function ensureVendorSheet_(sheetUrl) {
    const spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
    let sheet = spreadsheet.getSheetByName(APP_CONFIG.vendorSheet.sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(APP_CONFIG.vendorSheet.sheetName);
    }
    const headers = APP_CONFIG.vendorSheet.headers;
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
        const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
        const needsUpdate = headers.some(function (header, index) { return currentHeaders[index] !== header; });
        if (needsUpdate) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
    }
    sheet.setFrozenRows(1);
    return sheet;
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
    const scriptProperties = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
    if (spreadsheetId) {
        return SpreadsheetApp.openById(spreadsheetId);
    }
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
        return activeSpreadsheet;
    }
    throw new Error('Spreadsheet not configured. Run AppInit first.');
}

function getTable_(sheetName) {
    const sheet = ensureSheetWithHeaders_(sheetName, getSheetHeaders_(sheetName));
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) {
        return { headers: [], rows: [], sheet: sheet };
    }

    const headers = values[0];
    const rows = values.slice(1).filter(function (row) {
        return row.some(function (cell) { return cell !== ''; });
    }).map(function (row) {
        const objectRow = {};
        headers.forEach(function (header, index) {
            objectRow[header] = normalizeCellValue_(row[index]);
        });
        return objectRow;
    });
    return { headers: headers, rows: rows, sheet: sheet };
}

function getSheetHeaders_(sheetName) {
    const config = Object.keys(APP_CONFIG.sheets)
        .map(function (key) { return APP_CONFIG.sheets[key]; })
        .find(function (item) { return item.name === sheetName; });
    if (!config) {
        throw new Error('Unknown sheet: ' + sheetName);
    }
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
}

function updateRowByIndex_(sheetName, rowIndex, patch) {
    const headers = getSheetHeaders_(sheetName);
    const sheet = ensureSheetWithHeaders_(sheetName, headers);
    const rowValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const rowObject = {};
    headers.forEach(function (header, index) {
        rowObject[header] = normalizeCellValue_(rowValues[index]);
    });
    const updated = Object.assign({}, rowObject, patch);
    const matrix = [headers.map(function (header) {
        return updated[header] != null ? updated[header] : '';
    })];
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues(matrix);
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
    const subject = APP_CONFIG.appName + ' new vendor registration approval required';
    const htmlBody = [
        '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#16323a">',
        '<h2 style="margin:0 0 12px;color:#20B2AA">New account pending approval</h2>',
        '<p style="margin:0 0 12px">A new vendor account has been created and is waiting for admin approval.</p>',
        '<table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:560px">',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Contact Name</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.displayName) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Vendor Name</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.vendorName) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Username</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.username) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Email</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.email) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Vendor Code</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.vendorCode) + '</td></tr>',
        '<tr><td style="padding:8px 12px;border:1px solid #dbe4e8;background:#f8f9fa;font-weight:600">Created At</td><td style="padding:8px 12px;border:1px solid #dbe4e8">' + escapeHtml_(userRow.createdAt) + '</td></tr>',
        '</table>',
        '<p style="margin:0 0 12px">Open the admin workspace and approve this vendor from the Vendor Access section.</p>',
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
        throw new Error('Vendor access required.');
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

function getAppSecret_(createIfMissing) {
    const scriptProperties = PropertiesService.getScriptProperties();
    let secret = scriptProperties.getProperty('APP_SECRET');
    if (!secret && createIfMissing) {
        secret = Utilities.getUuid() + Utilities.getUuid();
        scriptProperties.setProperty('APP_SECRET', secret);
    }
    return secret || '';
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
    const rowIndex = table.rows.findIndex(function (row) { return String(row[field]) === stringValue; });
    if (rowIndex === -1) {
        return null;
    }
    return {
        row: table.rows[rowIndex],
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
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
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
        throw new Error('Vendor access required for quotation uploads.');
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

    const quotationCount = getTable_(APP_CONFIG.sheets.quotations.name).rows.filter(function (row) {
        return String(row.workOrderId) === normalizedWorkOrderId;
    }).length;

    updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, workOrderRowInfo.rowIndex, {
        quotationCount: quotationCount
    });

    return quotationCount;
}

function backfillWorkOrderQuotationCounts() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        ensureSheets_();

        const workOrdersTable = getTable_(APP_CONFIG.sheets.workOrders.name);
        const quotations = getTable_(APP_CONFIG.sheets.quotations.name).rows;
        const quotationCountByWorkOrderId = quotations.reduce(function (accumulator, row) {
            const workOrderId = String(row.workOrderId || '').trim();
            if (!workOrderId) {
                return accumulator;
            }
            accumulator[workOrderId] = (accumulator[workOrderId] || 0) + 1;
            return accumulator;
        }, {});

        let updatedWorkOrders = 0;
        let unchangedWorkOrders = 0;

        workOrdersTable.rows.forEach(function (row, index) {
            const workOrderId = String(row.workOrderId || '').trim();
            const nextQuotationCount = quotationCountByWorkOrderId[workOrderId] || 0;
            const currentQuotationCount = normalizeNumber_(row.quotationCount) || 0;

            if (currentQuotationCount === nextQuotationCount) {
                unchangedWorkOrders += 1;
                return;
            }

            updateRowByIndex_(APP_CONFIG.sheets.workOrders.name, index + 2, {
                quotationCount: nextQuotationCount
            });
            updatedWorkOrders += 1;
        });

        return {
            ok: true,
            totalWorkOrders: workOrdersTable.rows.length,
            totalQuotations: quotations.length,
            updatedWorkOrders: updatedWorkOrders,
            unchangedWorkOrders: unchangedWorkOrders
        };
    } finally {
        lock.releaseLock();
    }
}
