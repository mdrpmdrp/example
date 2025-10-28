const EMPLOYEE_STATUS_COL = 2; // Column B
const PREFIX_NAME_COL = 16; // Column O
const NAME_COL = 19; // Column S
const EMAIL_COL = 21; // Column U
const DATE_SENT_COL = 27; // Column AA
const EMPLOYEE_EMAIL_STATUS_COL = 28; // Column AB
const MANAGER_EMAIL_STATUS_COL = 31; // Column AC
function autoSendEmail() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("EmailData");
    let dataRange = sheet.getDataRange();
    let data = dataRange.getValues();
    let timezone = 'GMT+7';
    let today = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");
    for (let i = 1; i < data.length; i++) {
        let row = data[i];
        let dateSent = row[DATE_SENT_COL - 1];
        if (!(dateSent instanceof Date) || Utilities.formatDate(dateSent, timezone, "yyyy-MM-dd") !== today) {
            continue;
        }
        let employeeStatus = row[EMPLOYEE_STATUS_COL - 1];

        let name = row[PREFIX_NAME_COL - 1] + " " + row[NAME_COL - 1];
        let email = row[EMAIL_COL - 1];
        let employeeEmailStatus = row[EMPLOYEE_EMAIL_STATUS_COL - 1];
        let managerEmailStatus = row[MANAGER_EMAIL_STATUS_COL - 1];
        if (employeeStatus !== "Active" || dateSent == "" || email === "" || (employeeEmailStatus === "Sent" && managerEmailStatus === "Sent")) {
            continue;
        }

        if (employeeEmailStatus !== "Sent") {
            let isSent = sendEmployeeEmail(email, name);
            if (isSent) {
                sheet.getRange(i + 1, EMPLOYEE_EMAIL_STATUS_COL).setValue("Sent");
            }
        }
        if (managerEmailStatus !== "Sent") {
            let isSent = sendManagerEmail(email, name);
            if (isSent) {
                sheet.getRange(i + 1, MANAGER_EMAIL_STATUS_COL).setValue("Sent");
            }
        }
    }
}


function sendEmployeeEmail(email, name) {
    const googleFormLink = "https://forms.gle/hxa3QzEYAXC5qjG3A"; // Replace with actual Google Form link  
    try {
        let subject = "30-Day Self Evaluation Form";
        let html_body = `Dear <b>${name}</b>,<br><br>

Kindly help complete the Self Evaluation Form for your first 30 days at work.<br><br>

This evaluation will help your manager and the HR team better understand your reflections, strengths, and areas for further development in your role.
Please provide honest and thoughtful responses to help make the evaluation process most valuable for your professional growth.<br><br>

🔗 Evaluation Form Link:
👉 <a href="${googleFormLink}" style="color: #4285f4; text-decoration: none; font-weight: bold;">Google Form</a>

<p style="color: #d93025; font-weight: bold;">Please submit your response within 2 working days.</p>

If you have any questions, feel free to contact the HR Department.<br><br>
Thank you for your time and cooperation.<br><br>
We're glad to have you as part of our team!
<br><br>
<i>Best regards,<br>
Human Resources Department</i>`;
        MailApp.sendEmail(email, subject, "", {htmlBody: html_body, name: 'Human Resources Department'});
        return true
    } catch (e) {
        Logger.log("Error sending email to employee: " + e.message);
        return false
    }

}

function sendManagerEmail(email, name) {
    const googleFormLink = "https://forms.gle/BWWZFjg1afoZKbSh6"; // Replace with actual Google Form link
    try {
        let subject = "30-Day Probation Evaluation Form (Manager Assessment)";
        let html_body = `Dear Manager,<br><br>

The HR Department kindly requests your cooperation in completing the Manager Evaluation Form for <b>${name}</b>, who has now completed their first 30 days of probation.<br><br>

Please assess the employee's performance based on your direct observations and interactions during this period.
Your feedback will support the HR team and management in making informed decisions and providing the right development path for the employee.<br><br>

🔗 Evaluation Form Link: 
👉 <a href="${googleFormLink}" style="color: #4285f4; text-decoration: none; font-weight: bold;">Google Form</a>

<p style="color: #d93025; font-weight: bold;">Please complete the evaluation within 2 working days.</p>

Should you have any questions, please contact the HR Department.<br><br>
Thank you for your time and valuable input in supporting our people development process.
<br><br>
<i>Best regards,<br>
Human Resources Department</i>`;

        MailApp.sendEmail(email, subject, "", {htmlBody: html_body, name: 'Human Resources Department'});
        return true
    } catch (e) {
        Logger.log("Error sending email to manager: " + e.message);
        return false
    }
}
