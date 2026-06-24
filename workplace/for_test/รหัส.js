

function LINEUPDATE(reqId = "1782132") {
    Logger = BetterLog.useSpreadsheet()
    const firestore = FirestoreApp.getFirestore(serviceAccount.client_email, serviceAccount.private_key, serviceAccount.project_id);
    let subCollectionPath = `jobdata/${reqId}/update`;
    let data = firestore.query(subCollectionPath).OrderBy("timestamp", "asc").Execute();
    data = data.reduce((acc, d) => {
        let row = {};
        Object.keys(d.fields).forEach(key => {
            row[key] = d.fields[key].stringValue || d.fields[key].integerValue || d.fields[key].doubleValue || d.fields[key].booleanValue || d.fields[key].timestampValue;
        });
        acc.push(row);
        return acc;
    }, []);
    data = data.map(d => {
        d.timestamp = Utilities.formatDate(new Date(d.timestamp), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm (EEEE)")
        let text = `${LanguageApp.translate(d.timestamp, 'en', 'th').replace('วัน', '')}\n${d.update.replace(/\n\n/g, "\n")}\n#${d.name}`
        return text
    })
    return data.join("\n\n")
}

function batchLINEUPDATE() {
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheet = ss.getSheetByName("งานค้าง")
    let data = sheet.getDataRange().getValues()
    data.shift()
    for (let i = 0; i < data.length; i++) {
        let reqId = data[i][0]
        if (!reqId || reqId === "") {
            continue
        }
        let updates = LINEUPDATE(reqId)
        if (!updates || updates === "") {
            continue
        }
        // savve to col T
        data[i][19] = updates
        // write back to sheet
        sheet.getRange(i + 2, 20).setValue(updates)
        Utilities.sleep(100)
    }
}