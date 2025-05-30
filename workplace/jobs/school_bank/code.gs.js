function doGet(e) {
    const action = e.parameter.action || '';
    const uid = e.parameter.uid || '';
    const templateName = 'index';
    let template;

    if (action === 'register_parent') {
        if (!uid) {
            return HtmlService.createTemplateFromFile('404')
                .evaluate()
                .setTitle('404 Not Found')
                .setSandboxMode(HtmlService.SandboxMode.IFRAME)
                .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
                .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        }

        template = HtmlService.createTemplateFromFile(templateName);
        template.uid = uid;
        template.isRegister = true;
        template.title = 'Smart School Bank - ลงทะเบียนผู้ปกครอง';
    } else {
        // Default case
        template = HtmlService.createTemplateFromFile(templateName);
        template.uid = uid;
        template.isRegister = false;
        template.title = 'Smart School Bank - ลงชื่อเข้าใช้งาน';
    }

    // Reuse common configuration settings
    return template.evaluate()
        .setTitle(template.title)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function checkUsername(username) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
    let userData = userSheet.getDataRange().getValues();
    let usernames = userData.map(row => row[2]);
    return !usernames.includes(username);
}

function registerUser(formData) {
    const { uid, fullname, phone, childname, role, std_class, username, password } = formData;
    const lock = LockService.getScriptLock();

    if (!lock.tryLock(30000)) {
        return JSON.stringify({
            success: false,
            message: "ไม่สามารถล็อคสคริปต์ได้ กรุณาลองใหม่ภายหลัง"
        });
    }

    try {
        if (!checkUsername(username)) {
            return JSON.stringify({
                success: false,
                message: "ชื่อผู้ใช้งานนี้มีอยู่แล้ว กรุณาเลือกชื่อผู้ใช้งานอื่น"
            });
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
        const newRow = [new Date(), fullname, "'" + phone, childname, role, std_class, "รอตรวจสอบ", uid, username, password];

        userSheet.appendRow(newRow);

        return JSON.stringify({
            success: true,
            message: "ลงทะเบียนผู้ใช้งานสำเร็จ"
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            message: "เกิดข้อผิดพลาดในการลงทะเบียน: " + e.message
        });
    } finally {
        lock.releaseLock();
    }
}

function loginUser(formData) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
    let userData = userSheet.getDataRange().getValues();
    let user = userData.find(row => row[7] == formData.username && row[8] == formData.password);
    if (user) {
        if (user[5] !== "อนุมัติ") {
            return JSON.stringify({ success: false, message: "บัญชีผู้ใช้งานนี้ยังไม่ได้รับการอนุมัติ" });
        }
        let userInfo = {
            name: user[1],
            role: user[4],
        };
        return JSON.stringify({ success: true, message: "เข้าสู่ระบบสำเร็จ", userInfo: userInfo });
    }
    return JSON.stringify({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
}

function getData(userID, role) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (role === 'parent') {
        let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
        let userData = userSheet.getDataRange().getValues();
        let user = userData.find(row => row[6] == userID);
        if (!user) {
            return JSON.stringify({ success: false, message: "ท่านไม่ได้ลงทะเบียนผู้ใช้งาน กรุณาลงทะเบียนก่อนใช้งาน" });
        }
        let childSheet = ss.getSheetByName("เก็บข้อมูลผู้ปกครอง");
        let summarysheet = ss.getSheetByName("คำนวณยอดสะสมล่าสุด");
        let summaryData = summarysheet.getDataRange().getValues();
        let childData = childSheet.getDataRange().getValues();
        let children = childData.filter(row => row[3] == userID).map(r => {
            let child = summaryData.find(s => s[0] == r[1]);
            return {
                id: r[1],
                name: child ? child[1] : undefined,
                class: child ? child[2] : undefined,
                no: child ? child[3] : undefined,
                balance: child ? child[4] : undefined,
                lastDeposit: child ? child[5] : undefined,
                countDeposit: child ? child[6] : undefined
            }
        }).reduce((acc, child) => {
            acc[child.id] = child;
            return acc;
        }, {});

        let childrenIds = Object.keys(children);
        if (childrenIds.length === 0) {
            return JSON.stringify({ success: false, message: "ท่านยังไม่ได้ลงทะเบียนบุตร กรุณาลงทะเบียนบุตรก่อนใช้งาน" });
        }
        let depositSheet = ss.getSheetByName("ข้อมูลสำหรับแสดงผล");
        let depositData = depositSheet.getDataRange().getValues();
        let deposits = depositData.filter(row => childrenIds.includes(row[2])).map(r => {
            return {
                date: r[1],
                std_id: r[2],
                class: r[3],
                no: r[4],
                amount: r[5],
                staff: r[6],
                remark: r[7],
                name: children[r[2]] ? children[r[2]].name : undefined
            }
        })
        return JSON.stringify({
            success: true,
            user: {
                fullname: user[1],
                phone: user[2],
                children: children,
                deposits: deposits
            }
        });
    } else if (role === 'admin') {
        let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
        let userData = userSheet.getDataRange().getValues();
        let user = userData.find(row => row[6] == userID);
        if (!user) {
            return JSON.stringify({ success: false, message: "ท่านไม่ได้ลงทะเบียนผู้ใช้งาน กรุณาลงทะเบียนก่อนใช้งาน" });
        }
        let childSheet = ss.getSheetByName("เก็บข้อมูลผู้ปกครอง");
        let summarysheet = ss.getSheetByName("คำนวณยอดสะสมล่าสุด");
        let summaryData = summarysheet.getDataRange().getValues();
        let childData = childSheet.getDataRange().getValues();
        let children = childData.map(r => {
            let child = summaryData.find(s => s[0] == r[1]);
            return {
                id: r[1],
                name: child ? child[1] : undefined,
                class: child ? child[2] : undefined,
                no: child ? child[3] : undefined,
                balance: child ? child[4] : undefined,
                lastDeposit: child ? child[5] : undefined,
                countDeposit: child ? child[6] : undefined
            }
        }).reduce((acc, child) => {
            acc[child.id] = child;
            return acc;
        }, {});

        let childrenIds = Object.keys(children);
        if (childrenIds.length === 0) {
            return JSON.stringify({ success: false, message: "ยังไม่มีรายการนักเรียนในระบบ กรุณาลงทะเบียนนักเรียนก่อนใช้งาน" });
        }
        let depositSheet = ss.getSheetByName("ข้อมูลสำหรับแสดงผล");
        let depositData = depositSheet.getDataRange().getValues();
        let deposits = depositData.filter(row => childrenIds.includes(row[2])).map(r => {
            return {
                date: r[1],
                std_id: r[2],
                class: r[3],
                no: r[4],
                amount: r[5],
                staff: r[6],
                remark: r[7],
                name: children[r[2]] ? children[r[2]].name : undefined
            }
        })
        return JSON.stringify({
            success: true,
            user: {
                fullname: user[1],
                phone: user[2],
                children: children,
                deposits: deposits
            }
        });
    } else if (role === 'teacher') {
        let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
        let userData = userSheet.getDataRange().getValues();
        let user = userData.find(row => row[6] == userID);
        if (!user) {
            return JSON.stringify({ success: false, message: "ท่านไม่ได้ลงทะเบียนผู้ใช้งาน กรุณาลงทะเบียนก่อนใช้งาน" });
        }
        let childSheet = ss.getSheetByName("เก็บข้อมูลผู้ปกครอง");
        let summarysheet = ss.getSheetByName("คำนวณยอดสะสมล่าสุด");
        let summaryData = summarysheet.getDataRange().getValues();
        let childData = childSheet.getDataRange().getValues().filter(r => r[4] == user[5]);
        let children = childData.map(r => {
            let child = summaryData.find(s => s[0] == r[1]);
            return {
                id: r[1],
                name: child ? child[1] : undefined,
                class: child ? child[2] : undefined,
                no: child ? child[3] : undefined,
                balance: child ? child[4] : undefined,
                lastDeposit: child ? child[5] : undefined,
                countDeposit: child ? child[6] : undefined
            }
        }).reduce((acc, child) => {
            acc[child.id] = child;
            return acc;
        }, {});
    }

}