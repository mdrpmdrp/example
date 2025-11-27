function onFormSubmit(e) {
    Logger = BetterLog.useSpreadsheet();
    let formData = e.namedValues;
    Logger.log("Form submitted with data: " + JSON.stringify(formData));
    switch(formData['หมวดที่ต้องการรายงาน'][0]){
        case "Clinical Chemistry":
            createMessageClinicalChemistry(formData);
            break;
        case "Hematology":
            createMessageHematology(formData);
            break;
        case "Microbiology":
            createMessageMicrobiology(formData);
            break;
    }
}

function sendTelegram(message) {
    Logger.log("Sending Telegram message: " + message);
}

function createMessageClinicalChemistry(formData) {
    formData = {"ค่า Clinical chemistry ที่รายงาน":["2343534"],"ค่าที่รายงาน เชื้อดื้อยา":[""],"ผู้รับรายงานผล":["คุณวรัญญู สิริเพชรสมบัติ (พี่ปุ๋ม), คุณปราณี วรวงษ์ศา (พี่ปุ๋ม), คุณฐิตาภรณ์ พลทอง (พี่นุ้ย), คุณเพชร ร่มเย็น (พี่เพชร), คุณนิตยา สานอก (น้องกระจง), คุณสายฝน พันธ์พิกุลพิมย์ (พี่เก๋), คุณหนึ่งฤทัย ภิรมศรี (น้องหนึ่ง)"],"หมวดที่ต้องการรายงาน":["Clinical Chemistry"],"รายการ Clinical chemistry ที่ต้องการรายงาน":["Sodium(normal=135-145 mMol/L ), HighSen Troponin I (normal=0.00-0.08 ng/ml), Hematocrit(Newborn)critical น้อยกว่า 33 เปอร์เซ็นต์, มากกว่า 70 เปอร์เซ็นต์, DTX (์NPO)(Normal=70-115 mg/dl), DTX (Random) (Normal = <140 mg/dl)"],"HN":["123455"],"ค่าที่รายงาน Hemoculture / CSF culture":[""],"รายการ Microbiology ที่ต้องการรายงาน":[""],"ประทับเวลา":["27/11/2025, 15:28:40"],"ชื่อ-สกุล คนไข้":["testttt"],"รายงานไปยัง":["IC"],"รายการ Hematology ที่ต้องการรายงาน":[""],"ผู้รายงานผล":["คุณกิติพันธ์ ใบโพธิ์"],"ค่า Hematology ที่รายงาน":[""],"ค่า AFB ที่รายงาน":[""]}
    let message = "แจ้งเตือนค่าวิกฤต - Clinical Chemistry\n";
    message += "ชื่อผู้ป่วย : " + formData['ชื่อ-สกุล คนไข้'][0] + "\n";
    message += "HN : " + formData['HN'][0] + "\n\n";
    message += "<blockquote>";
    message += "รายการที่แจ้ง:\n";
    formData["รายการ Clinical chemistry ที่ต้องการรายงาน"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "\n";
    message += "ค่าที่แจ้ง:\n";
    formData["ค่า Clinical chemistry ที่รายงาน"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "</blockquote>\n\n";
    message += "ผู้รับรายงานผล:\n";
    formData["ผู้รับรายงานผล"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "ผู้รายงานผล: " + formData['ผู้รายงานผล'][0] + "\n";
    sendTelegram(message);
}

function createMessageHematology(formData) {
    let message = "แจ้งเตือนค่าวิกฤต - Hematology\n";
    message += "ชื่อผู้ป่วย : " + formData['ชื่อ-สกุล คนไข้'][0] + "\n";
    message += "HN : " + formData['HN'][0] + "\n\n";
    message += "<blockquote>";
    message += "รายการที่แจ้ง:\n";
    formData["รายการ Hematology ที่ต้องการรายงาน"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "\n";
    message += "ค่าที่แจ้ง:\n";
    formData["ค่า Hematology ที่รายงาน"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "</blockquote>\n\n";
    message += "ผู้รับรายงานผล:\n";
    formData["ผู้รับรายงานผล"][0].split(",").forEach(item => {
        message += "- " + item.trim() + "\n";
    });
    message += "ผู้รายงานผล: " + formData['ผู้รายงานผล'][0] + "\n";
    sendTelegram(message);
}

function createMessageMicrobiology(formData) {
    let message = "แจ้งเตือนค่าวิกฤต - Microbiology\n";
    message += "ชื่อผู้ป่วย : " + formData['ชื่อ-สกุล คนไข้'][0] + "\n";
    message += "HN : " + formData['HN'][0] + "\n\n";
    message += "<blockquote>";
}