const PENDING_FOLDER_ID = '1KtdIXNnmGBQb2riPm-DAZViNK5I0ssW5';
const COMPLETED_FOLDER_ID = '1-UJ_RO9GV_-K1i1WyJIUZkzHIvlxDzF6';

function onOpen(){
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('OCR')
    .addItem('Open OCR', 'openOCR')
    .addToUi();
}

function openOCR() {
    let ui = SpreadsheetApp.getUi();
    // open modal dialog
    let html = HtmlService.createTemplateFromFile('OCR').evaluate()
                .setWidth(1280)
                .setHeight(720);
    ui.showModalDialog(html, 'OCR');
}

function listFilesInFolder(folderId) {
    folderId = folderId || PENDING_FOLDER_ID;

    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const result = [];

    while (files.hasNext()) {
        const file = files.next();
        result.push({
            id: file.getId(),
            name: file.getName(),
            mimeType: file.getMimeType()
        });
    }

    return result;
}

function processFilesBatch(folderId, fileIds) {
    folderId = folderId || PENDING_FOLDER_ID;
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        throw new Error('fileIds is required.');
    }

    const payload = [];
    const fileMeta = {};

    fileIds.forEach(function(fileId) {
        try {
            const file = DriveApp.getFileById(fileId);
            payload.push(buildGeminiFileInput_(file));
            fileMeta[fileId] = {
                fileName: file.getName()
            };
        } catch (err) {
            fileMeta[fileId] = {
                error: err && err.message ? err.message : String(err)
            };
        }
    });

    if (payload.length === 0) {
        return fileIds.map(function(fileId) {
            return {
                fileId: fileId,
                error: (fileMeta[fileId] && fileMeta[fileId].error) || 'Unable to read file.'
            };
        });
    }

    const geminiResultsByFileId = callGeminiBulkExtract_(payload);

    return fileIds.map(function(fileId) {
        if (fileMeta[fileId] && fileMeta[fileId].error) {
            return {
                fileId: fileId,
                error: fileMeta[fileId].error
            };
        }

        const item = geminiResultsByFileId[fileId];
        if (!item) {
            return {
                fileId: fileId,
                error: 'No result returned by Gemini.'
            };
        }

        return {
            fileId: fileId,
            fileName: (fileMeta[fileId] && fileMeta[fileId].fileName) || '',
            Stage: safeText_(item.Stage),
            No: safeText_(item.No),
            Time: safeText_(item.Time),
            Name: safeText_(item.Name),
            PD: safeText_(item.PD),
            HNT: safeText_(item.HNT),
            PE: safeText_(item.PE),
            FP: safeText_(item.FP),
            FTDR: safeText_(item.FTDR),
            message: 'อ่านค่าเรียบร้อย'
        };
    });
}

function renameAndMoveBatch(items) {
    if (!items || !Array.isArray(items)) {
        throw new Error('items is required.');
    }

    return items.map(function(item) {
        if (!item || !item.fileId) {
            return {
                fileId: '',
                error: 'Invalid item.'
            };
        }
        if (item.error) {
            return item;
        }

        try {
            const postProcessed = renameAndMoveToCompleted_(item.fileId, item.Stage, item.No);
            item.fileName = postProcessed.newFileName;
            item.originalFileName = postProcessed.originalFileName;
            item.message = 'เปลี่ยนชื่อและย้ายไฟล์สำเร็จ';
            return item;
        } catch (err) {
            return {
                fileId: item.fileId,
                fileName: item.fileName || '',
                error: 'เปลี่ยนชื่อ/ย้ายไฟล์ไม่สำเร็จ: ' + (err && err.message ? err.message : String(err))
            };
        }
    });
}

function saveResultsBatch(items) {
    if (!items || !Array.isArray(items)) {
        throw new Error('items is required.');
    }

    const successItems = items.filter(function(item) {
        return item && item.fileId && !item.error;
    });

    if (successItems.length === 0) {
        return items;
    }

    try {
        appendResultsToOcrSheet_(successItems);
        return items.map(function(item) {
            if (!item || item.error) {
                return item;
            }
            item.message = 'ดำเนินการเรียบร้อย';
            return item;
        });
    } catch (err) {
        return items.map(function(item) {
            if (!item || item.error) {
                return item;
            }
            return {
                fileId: item.fileId,
                fileName: item.fileName || '',
                error: 'บันทึกชีท OCR ไม่สำเร็จ: ' + (err && err.message ? err.message : String(err))
            };
        });
    }
}

function callGeminiBulkExtract_(filesPayload) {
    const apiKey = getGeminiApiKey_();
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=' + encodeURIComponent(apiKey);

    const prompt = buildGeminiPrompt_(filesPayload);
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: buildGeminiParts_(prompt, filesPayload)
            }
        ],
        generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json'
        }
    };

    const response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify(requestBody)
    });

    const statusCode = response.getResponseCode();
    const raw = response.getContentText();
    if (statusCode >= 400) {
        throw new Error('Gemini API error ' + statusCode + ': ' + raw);
    }

    const outer = JSON.parse(raw);
    const text = extractGeminiText_(outer);
    const parsed = parseGeminiJson_(text);

    const output = {};
    (parsed || []).forEach(function(item) {
        if (item && item.fileId) {
            output[item.fileId] = item;
        }
    });

    return output;
}

function buildGeminiPrompt_(filesPayload) {
    const schemaGuide = [
        'Read each file content and extract only these fields:',
        'Stage | No. | Time | Name | PD | HNT | PE | FP | FTDR',
        'Return JSON array only. No markdown.',
        'Output format for each file:',
        '{"fileId":"...","Stage":"","No":"","Time":"","Name":"","PD":"","HNT":"","PE":"","FP":"","FTDR":""}',
        'If a value cannot be found, use empty string.',
        'Keep original text format where possible.',
        '',
        'Files:'
    ].join('\n');

    const filesText = filesPayload.map(function(file, index) {
        return [
            '### File ' + (index + 1),
            'fileId: ' + file.fileId,
            'fileName: ' + file.fileName,
            'mimeType: ' + file.mimeType,
            file.textPreview ? 'textPreview:' : 'textPreview: [none]',
            file.textPreview || '',
            ''
        ].join('\n');
    }).join('\n');

    return schemaGuide + '\n' + filesText;
}

function buildGeminiParts_(prompt, filesPayload) {
    const parts = [{ text: prompt }];

    filesPayload.forEach(function(file, index) {
        if (!file.inlineData) {
            return;
        }
        parts.push({
            text: 'Binary content for File ' + (index + 1) + ' (fileId: ' + file.fileId + ')' 
        });
        parts.push({
            inlineData: {
                mimeType: file.inlineData.mimeType,
                data: file.inlineData.data
            }
        });
    });

    return parts;
}

function extractGeminiText_(outerResponse) {
    const candidate = outerResponse && outerResponse.candidates && outerResponse.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    if (!parts || !parts.length || !parts[0].text) {
        throw new Error('Gemini response does not contain text output.');
    }
    return parts[0].text;
}

function parseGeminiJson_(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const clean = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
        return JSON.parse(clean);
    }
}

function getGeminiApiKey_() {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key) {
        throw new Error('Missing GEMINI_API_KEY in Script Properties.');
    }
    return key;
}

function buildGeminiFileInput_(file) {
    const fileId = file.getId();
    const fileName = file.getName();
    const mimeType = file.getMimeType();
    const maxBinaryBytes = 1500000;

    if (mimeType === MimeType.GOOGLE_DOCS) {
        const doc = DocumentApp.openById(fileId);
        return {
            fileId: fileId,
            fileName: fileName,
            mimeType: mimeType,
            textPreview: truncate_(doc.getBody().getText(), 45000)
        };
    }

    const blob = file.getBlob();
    const bytes = blob.getBytes();

    if (isInlineOcrMime_(mimeType) && bytes.length <= maxBinaryBytes) {
        return {
            fileId: fileId,
            fileName: fileName,
            mimeType: mimeType,
            textPreview: '',
            inlineData: {
                mimeType: mimeType,
                data: Utilities.base64Encode(bytes)
            }
        };
    }

    return {
        fileId: fileId,
        fileName: fileName,
        mimeType: mimeType,
        textPreview: readFileText_(file)
    };
}

function readFileText_(file) {
    const maxChars = 45000;
    const mime = file.getMimeType();

    if (mime === MimeType.PLAIN_TEXT || mime === MimeType.CSV || mime === MimeType.HTML) {
        return truncate_(file.getBlob().getDataAsString('UTF-8'), maxChars);
    }

    if (mime === MimeType.GOOGLE_DOCS) {
        const doc = DocumentApp.openById(file.getId());
        return truncate_(doc.getBody().getText(), maxChars);
    }

    try {
        const text = file.getBlob().getDataAsString('UTF-8');
        if (text && text.trim()) {
            return truncate_(text, maxChars);
        }
    } catch (e) {
        // Fallback below.
    }

    return truncate_('[Unsupported or empty text format] ' + file.getName(), maxChars);
}

function isInlineOcrMime_(mimeType) {
    return mimeType === MimeType.PDF ||
        mimeType.indexOf('image/') === 0;
}

function truncate_(text, maxChars) {
    if (!text) return '';
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '\n...[truncated]';
}

function safeText_(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function renameAndMoveToCompleted_(fileId, stageValue, noValue) {
    const file = DriveApp.getFileById(fileId);
    const originalFileName = file.getName();
    const extension = extractFileExtension_(originalFileName);
    const targetBaseName = buildStageNoBaseName_(stageValue, noValue);
    const newFileName = extension ? targetBaseName + '.' + extension : targetBaseName;

    file.setName(newFileName);
    const completedFolder = DriveApp.getFolderById(COMPLETED_FOLDER_ID);
    file.moveTo(completedFolder);

    return {
        originalFileName: originalFileName,
        newFileName: newFileName
    };
}

function appendResultsToOcrSheet_(results) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        throw new Error('Cannot access active spreadsheet.');
    }

    let sheet = ss.getSheetByName('OCR');
    if (!sheet) {
        sheet = ss.insertSheet('OCR');
    }

    const headers = [
        'Timestamp',
        'File ID',
        'File Name',
        'Stage',
        'No.',
        'Time',
        'Name',
        'PD',
        'HNT',
        'PE',
        'FP',
        'FTDR'
    ];

    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const now = new Date();
    const rows = results.map(function(item) {
        return [
            now,
            item.fileId,
            "=HYPERLINK(\"https://lh3.googleusercontent.com/" + item.fileId + "\", \"" + (item.fileName || 'View File') + "\")",
            sheetValue_(item.Stage),
            sheetValue_(item.No),
            sheetValue_(item.Time),
            sheetValue_(item.Name),
            sheetValue_(item.PD),
            sheetValue_(item.HNT),
            sheetValue_(item.PE),
            sheetValue_(item.FP),
            sheetValue_(item.FTDR)
        ];
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}

function buildStageNoBaseName_(stageValue, noValue) {
    const stagePart = sanitizeFileNamePart_(stageValue || 'STAGE');
    const noPart = sanitizeFileNamePart_(noValue || 'NO');
    return stagePart + '_' + noPart;
}

function sanitizeFileNamePart_(value) {
    const safe = safeText_(value)
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return safe || 'NA';
}

function extractFileExtension_(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === fileName.length - 1) {
        return '';
    }
    return fileName.substring(lastDot + 1);
}

function sheetValue_(value) {
    const text = safeText_(value);
    return text === '-' ? '' : text;
}