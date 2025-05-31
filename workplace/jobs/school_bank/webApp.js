function doGet(e) {
    let action = e.parameter.action
    let uid = e.parameter.uid
    let templateName = 'index';
    let template;

    if (action === 'register_parent') {
        if (!uid) {
            return HtmlService.createTemplateFromFile('404')
                .evaluate()
                .setTitle('404 Not Found')
                .setSandboxMode(HtmlService.SandboxMode.IFRAME)
                .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
                .addMetaTag('viewport', 'width=device-width, initial-scale=1')
                .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/bda990b9-b514-4e87-9f65-149b3c16a3b8.png');
        }

        template = HtmlService.createTemplateFromFile(templateName);
        template.uid = uid;
        template.isRegister = true;
        template.SCHOOL_NAME = SCHOOL_NAME
        template.title = SCHOOL_NAME;
    } else {
        // Default case
        template = HtmlService.createTemplateFromFile(templateName);
        template.uid = uid;
        template.isRegister = false;
        template.SCHOOL_NAME = SCHOOL_NAME
        template.title = SCHOOL_NAME;
    }

    // Reuse common configuration settings
    return template.evaluate()
        .setTitle(template.title)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/bda990b9-b514-4e87-9f65-149b3c16a3b8.png');
}

function checkUsername(username) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
    let userData = userSheet.getDataRange().getValues();
    let usernames = userData.map(row => row[2]);
    return !usernames.includes(username);
}

function registerUser(formData) {
    let { uid, fullname, phone, childname, role, std_class, username, password } = formData;
    let lock = LockService.getScriptLock();

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

        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
        let newRow = [new Date(), fullname, "'" + phone, childname, role, std_class, "รอตรวจสอบ", uid, username, password];

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
    let user = userData.find(row => row[8] == formData.username && row[9] == formData.password);
    if (user) {
        if (user[6] !== "อนุมัติ") {
            return JSON.stringify({ success: false, message: "บัญชีผู้ใช้งานนี้ยังไม่ได้รับการอนุมัติ" });
        }
        let userInfo = {
            name: user[1],
            role: user[4],
            uid: user[7],
            std_class: user[5],
        };
        return JSON.stringify({ success: true, message: "เข้าสู่ระบบสำเร็จ", userInfo: userInfo });
    }
    return JSON.stringify({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
}

function getData(userID = 'Ua55431b2d9be5d104c316ccb8ef54e81', role = 'Teacher') {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName("ลงทะเบียนผู้ใช้งาน");
    let userData = userSheet.getDataRange().getValues();

    // Find user based on role
    let user = userData.find(row => row[7] == userID);

    if (!user) {
        return JSON.stringify({
            success: false,
            message: "ท่านไม่ได้ลงทะเบียนผู้ใช้งาน กรุณาลงทะเบียนก่อนใช้งาน"
        });
    }

    // Load common data sheets
    let childSheet = ss.getSheetByName("เก็บข้อมูลผู้ปกครอง");
    let summarySheet = ss.getSheetByName("คำนวณยอดสะสมล่าสุด");
    let summaryData = summarySheet.getDataRange().getValues().slice(1).filter(r => r[0] != '')
    let childData = childSheet.getDataRange().getValues();



    summaryData = summaryData.map(r => {
        return {
            id: r[0],
            name: r[1],
            std_class: r[2],  // Normalized field name
            std_number: r[3],
            balance: r[4],
            lastDeposit: r[5],
            countDeposit: r[6]
        };
    })

    let childrenIds = [];
    if (role === 'Parent') {
        // For Parent role, filter children based on userID
        childrenIds = childData
            .filter(row => row[3] == userID)
            .map(row => row[1]);
    } else if (role === 'Teacher') {
        // For Teacher role, filter children based on class
        let classId = user[5]; // Assuming class ID is stored in user[5]
        childrenIds = summaryData
            .filter(row => row.std_class == classId)
            .map(row => row.id);
    } else if (role === 'Admin') {
        // For Admin role, get all children
        childrenIds = summaryData.map(row => row.id);
    } else {
        return JSON.stringify({ success: false, message: "ระดับผู้ใช้งานไม่ถูกต้อง" });
    }

    if (childrenIds.length === 0) {
        let message = role === 'Admin'
            ? "ยังไม่มีรายการนักเรียนในระบบ กรุณาลงทะเบียนนักเรียนก่อนใช้งาน"
            : role === 'Teacher'
                ? "ท่านยังไม่ได้ลงทะเบียนนักเรียนในชั้นเรียนนี้ กรุณาลงทะเบียนนักเรียนก่อนใช้งาน"
                : "ท่านยังไม่ได้ลงทะเบียนบุตร กรุณาลงทะเบียนบุตรก่อนใช้งาน";

        return JSON.stringify({ success: false, message });
    }

    // Get deposit data
    let depositSheet = ss.getSheetByName("ข้อมูลสำหรับแสดงผล");
    let depositData = depositSheet.getDataRange().getValues();
    let deposits = depositData
        .filter(row => childrenIds.includes(row[2]))
        .map(r => ({
            date: r[1],
            std_id: r[2],
            std_class: r[3],
            std_number: r[4],
            amount: r[5],
            staff: r[6],
            remark: r[7],
            name: summaryData.find(s => s.id === r[2])?.name || ''
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return JSON.stringify({
        success: true,
        user: {
            fullname: user[1],
            phone: user[2],
            deposits
        }
    });
}
