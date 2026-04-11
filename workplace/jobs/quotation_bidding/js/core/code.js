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
                'quotationCount',
                'Quotations',
                'selectedQuotationId'
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
        sheetNamePrefix: 'Quotation ',
        indexSheetName: '_QuotationIndex',
        indexHeaders: ['Quotation number', 'work order number', 'Quotation Date', 'Submitted Date', '__sheetName', '__rowIndex'],
        headers: [
            'Category',
            'Price Range',
            'Customer/Project',
            'Product pic',
            'Description',
            'Quantity(pcs)',
            'CIF BKK',
            'Target price',
            'Lead time',
            'Quotation Date',
            'Submitted Date',
            'Remark',
            'Sample',
            'Status',
            'Comment',
            'Quotation number',
            'work order number',
            'attachmentJson',
            'quotationFolderId',
            'Thai Price',
            'Admin Note'
        ]
    }
};

const RUNTIME_CACHE_ = {
    scriptProperties: null,
    appSecret: null,
    spreadsheet: null,
    spreadsheetsByUrl: {},
    sheetConfigsByName: {},
    sheetsBySpreadsheetId: {},
    tablesBySheetName: {},
    vendorIndexRowsBySpreadsheetId: {},
    vendorIndexStateBySpreadsheetId: {}
};

const HTML_INCLUDE_FILE_MAP_ = {
    AdminHead: 'html/admin/AdminHead',
    AdminBody: 'html/admin/AdminBody',
    AdminScript: 'html/admin/AdminScript',
    VendorHead: 'html/vendor/VendorHead',
    VendorBody: 'html/vendor/VendorBody',
    VendorScript: 'html/vendor/VendorScript',
    SharedTableUtils: 'html/shared/SharedTableUtils'
};

function doGet() {
    let html = HtmlService.createTemplateFromFile('Index');
    html.logo = APP_CONFIG.logo.square;
    return html
        .evaluate()
        .setTitle(APP_CONFIG.appName)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function include(filename, templateData) {
    const template = HtmlService.createTemplateFromFile(resolveHtmlIncludeFilename_(filename));
    const data = templateData && typeof templateData === 'object' ? templateData : {};
    Object.keys(data).forEach(function (key) {
        template[key] = data[key];
    });
    return template.evaluate().getContent();
}

function resolveHtmlIncludeFilename_(filename) {
    const normalized = String(filename || '').trim();
    return HTML_INCLUDE_FILE_MAP_[normalized] || normalized;
}

function renderWorkspacePage(token) {
    const session = requireSession_(token);
    const template = HtmlService.createTemplateFromFile(session.role === 'admin' ? 'admin' : 'vendor');
    template.logo = APP_CONFIG.logo.square;
    template.initialRole = session.role;
    template.authUrl = getWebAppUrl_();
    return {
        ok: true,
        role: session.role,
        html: template.evaluate().getContent()
    };
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
