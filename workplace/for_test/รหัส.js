const sheet_name = 'DEMO ALL'
const ss = SpreadsheetApp.getActiveSpreadsheet()
const sheet = ss.getSheetByName(sheet_name)
function manual_get_folders_url() {
    if (!sheet) create_sheet()
    let data = sheet.getRange('H5:H').getValues().map(e => e[0].toLowerCase().trim())
    let folders_arr = new Array(data.length).fill('')

    let main_folder = DriveApp.getFolderById('1WJan1ofFtP3qxNIbfmltKHf5n2Kz6eJf')
    let folders = main_folder.getFolders()
    while (folders.hasNext()) {
        let folder = folders.next()
        let name = folder.getName().toLowerCase().trim()
        let index = data.indexOf(name)
        if (index > -1) {
            folders_arr[index] = `=HYPERLINK("${folder.getUrl()}","View Files")`
        }
    }
    let last_col = sheet.getLastColumn()
    sheet.getRange(5, last_col, data.length, 1).setValues(folders_arr.map(e => [e]))
}

function get_id() {
    if (!sheet) create_sheet()
    let month = Utilities.formatDate(new Date(), "GMT+7", "MMM").toUpperCase()
    let last_row = SuperScript.getRealLastRow('A', sheet)
    let last_num = sheet.getRange('A' + last_row).getValue()
    let last_id = sheet.getRange('C' + SuperScript.getRealLastRow('C', sheet)).getValue()
    let [last_month, last_id_num] = last_id.split('_')
    let obj = {}
    if (last_month === month) {
        obj.month_id = month + '_' + (parseInt(last_id_num).toString().padStart(3, '0'))
    } else {
        obj.month_id = month + '_001'
    }
    obj.row_id = Number(last_num) + 1
    return obj
}

function get_demo_code() {
    if (!sheet) create_sheet()
    let last_code = sheet.getRange('H' + SuperScript.getRealLastRow('H', sheet)).getValue()
    return 'DEMO_' + (parseInt(last_code.split('_')[1]) + 1).toString().padStart(6, '0')
}

function reserve_new_demo_code() {
    if (!sheet) create_sheet()
    let lock = LockService.getScriptLock()
    if (!lock.tryLock(5000)) return ContentService.createTextOutput(JSON.stringify({ status: false })).setMimeType(ContentService.MimeType.JSON)
    let last_row = SuperScript.getRealLastRow('H', sheet)
    let data = dispatchEvent.getRange('H5:J' + last_row).getValues()
    let expired_reserve = data.findIndex(e => {
        let one_day = 24 * 60 * 60 * 1000
        let today = new Date().getTime()
        let reserve_date
        try {
            reserve_date = new Date(e[2]).getTime()
        } catch (e) {
            return false
        }
        return (today - reserve_date) > one_day && e[1] === 'Reserved'

    })
    if (expired_reserve > -1) {
        return data[expired_reserve][0]
    }
    let last_code = get_demo_code()
    sheet.getRange('H' + (last_row + 1) + ':J' + (last_row + 1)).setValues([[last_code, 'Reserved', new Date()]])
    lock.releaseLock()
    return ContentService.createTextOutput(JSON.stringify({ status: true, code: last_code })).setMimeType(ContentService.MimeType.JSON)
}

function get_folder(name = "demo_000616") {
    if (!sheet) create_sheet()
    let main_folder = DriveApp.getFolderById('1WJan1ofFtP3qxNIbfmltKHf5n2Kz6eJf')
    let folders = main_folder.getFoldersByName(name)
    if (folders.hasNext()) {
        return folders.next()
    }
    return main_folder.createFolder(name)
}

function get_auth() {
    return ScriptApp.getOAuthToken()
}

function create_sheet() {
    let sheet = ss.getSheets()[0]
    sheet.copyTo(ss).setName(sheet_name)
    sheet.getRange('A5:Y').clear()
}

function doGet(e) {
    let action = e.parameter.action
    switch (action) {
        case 'reserve_new_demo_code':
            return reserve_new_demo_code()
        case 'get_auth':
            return ContentService.createTextOutput(JSON.stringify(get_auth())).setMimeType(ContentService.MimeType.JSON)
        case 'get_folder':
            return ContentService.createTextOutput(JSON.stringify(get_folder(e.parameter.name))).setMimeType(ContentService.MimeType.JSON)
        default:
            return ContentService.createTextOutput(JSON.stringify({ status: false })).setMimeType(ContentService.MimeType.JSON)
    }
}

function hideSheet() {
    let sheets = ss.getSheets()
    sheets.forEach(sh => {
        if (sh.getName() != sheet_name) {
            sh.hideSheet()
        }
    })
}

function onChange(e) {
    let range = e.range
    let sheet = range.getSheet()
    let col = range.getColumn()
    let row = range.getRow()
    if (sheet.getName() === sheet_name && row > 2) {
        switch (col) {
            case 1:
                autoFillId(range, row, sheet)
                break
            case 9:
                update_folder_url(range, row, sheet)
                break
        }

    }
}

function autoFillId(range, row, sheet) {
    let value = range.getValue()
    if(isNaN(value) || value === '') return

    let [month, year] = Utilities.formatDate(new Date(), "GMT+7", "MMM yyyy").toUpperCase().split(' ')
    let id = sheet.getRange(row, 3).getValue()
    if (!id || id === '') {
        let last_id = sheet.getRange('D' + SuperScript.getRealLastRow('D', sheet)).getValue()
        let [last_month, last_id_num] = last_id.split('_')
        let new_id_num
        if (last_month === month) {
            new_id_num = (parseInt(last_id_num) + 1).toString().padStart(3, '0')
        } else {
            new_id_num = '001'
        }
        sheet.getRange(row, 3,1,2).setValues([[year, month + '_' + new_id_num]])
    }
}

function update_folder_url(range, row, sheet) {
    let value = range.getValue()
    if (/demo_\d{6}/i.test(value.toLowerCase())) {
        let folder = get_folder(value)
        sheet.getRange(row, 27).setValue('=HYPERLINK("' + folder.getUrl() + '","View Files")')
    }
}