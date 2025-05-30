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
    const { uid, fullname, phone, childname, role, username, password } = formData;
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
        const newRow = [new Date(), fullname, "'" + phone, childname, role, "รอตรวจสอบ", uid, username, password];

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