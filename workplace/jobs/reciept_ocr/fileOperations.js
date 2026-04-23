// Folder cache to avoid repeated API calls
const FOLDER_MAP = {};

/**
 * Get or create folder with caching
 * @param {string} folderName - Name of folder to get/create
 * @param {string} parentFolderId - Parent folder ID
 * @returns {GoogleAppsScript.Drive.Folder} Folder object
 */
function getFolder(folderName, parentFolderId) {
    // Initialize parent folder cache if not exists
    if (!FOLDER_MAP[parentFolderId]) {
        FOLDER_MAP[parentFolderId] = {
            _folder: DriveApp.getFolderById(parentFolderId)
        };
    }
    
    let parentFolderCache = FOLDER_MAP[parentFolderId];
    
    // Return cached folder if exists
    if (parentFolderCache[folderName]) {
        return parentFolderCache[folderName];
    }
    
    // Search for existing folder
    let folderIterator = parentFolderCache._folder.getFoldersByName(folderName);
    let folder;
    
    if (folderIterator.hasNext()) {
        folder = folderIterator.next();
    } else {
        folder = parentFolderCache._folder.createFolder(folderName);
    }
    
    // Cache the folder
    parentFolderCache[folderName] = folder;
    return folder;
}

/**
 * Move multiple files to folders using batch API
 * @param {Array} files - Array of {id, parent, target} objects
 */
function moveFilesToFolder(files) {
    if (files.length < 1) return;
    
    const requests = {
        batchPath: "batch/drive/v3",
        requests: files.map(file => ({
            method: "PATCH",
            endpoint: `https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${file.target}&removeParents=${file.parent}`
        })),
        accessToken: ScriptApp.getOAuthToken()
    };

    let result = BatchRequest.EDo(requests);
    Logger.log(result);
}

/**
 * Delete multiple files using batch API
 * @param {Array} fileIds - Array of file IDs to delete
 * @returns {Object} Batch operation result
 */
function deleteFiles(fileIds) {
    if (fileIds.length === 0) return null;
    
    const requests = {
        batchPath: "batch/drive/v3",
        requests: fileIds.map(fileId => ({
            method: "DELETE",
            endpoint: `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`
        })),
        accessToken: ScriptApp.getOAuthToken()
    };
    
    let result = BatchRequest.EDo(requests);
    Logger.log(result);
    return result;
}

/**
 * Process files from a folder and extract invoice data
 * @param {string} folderId - Folder ID to process files from
 * @param {Function} processCallback - Callback function to process each file
 * @returns {Array} Array of processed file data
 */
function processFilesFromFolder(folderId, processCallback) {
    let folder = DriveApp.getFolderById(folderId);
    if (!folder) {
        Logger.log("ไม่พบโฟลเดอร์เก็บเอกสาร");
        throw new Error("ไม่พบโฟลเดอร์เก็บเอกสาร");
    }
    
    let files = folder.getFiles();
    let results = [];
    
    while (files.hasNext()) {
        let file = files.next();
        let result = processCallback(file);
        if (result) {
            results.push(result);
        }
    }
    
    return results;
}
