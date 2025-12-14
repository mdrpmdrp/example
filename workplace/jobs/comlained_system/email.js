

/***** CONFIG *****/
const SPREADSHEET_ID = '1Id3ZJ0RkgQUNIgbE3cqk3yzdLBS7tCAu0NhPwKawE4g';
const SHEET_NAME = 'ComplainData';
const DATE_COL = 2;                 // คอลัมน์ "วันที่" (B = 2)
const TZ = 'Asia/Bangkok';

// const RECIPIENTS = ["info@freshconnect.in.th"]; // <-- เปลี่ยนเป็นอีเมลผู้รับจริง (คั่นด้วยคอมมาถ้ามีหลายคน)
const RECIPIENTS = [
  "info@freshconnect.in.th",
  "ta.kitivat@gmail.com",
  "Chingthong.n@freshconnect.in.th",
  "Kosit.c@freshconnect.in.th",
  "Sales@freshconnect.in.th",
  "Sales2@freshconnect.in.th",
  "Sales3@freshconnect.in.th",
  "Panchu.p@freshconnect.in.th",
  "El@freshconnect.in.th",
  "Sourcing@freshconnect.in.th",
  "Leungdee.w@freshconnect.in.th",
  "Support2@freshconnect.in.th",
  "Storeconnect@freshconnect.in.th",
  "Finance@freshconnect.in.th",
  "Adsatroo.s@freshconnect.in.th",
  "Wattana.p@freshconnect.in.th",
  "Songkhong.a@freshconnect.in.th",
  "Chookham.w@freshconnect.in.th",
  "Ckk@freshconnect.in.th"
];

const CC = [];   // เช่น ["manager@example.com"]
const BCC = [];  // เช่น ["audit@example.com"]

// ลิงก์เข้าหน้าระบบ (เช่น Web App URL)
const SYSTEM_URL = "https://script.google.com/a/*/macros/s/" + ScriptApp.getScriptId() + "/exec";

/***** CORE *****/
// ดึงแถวเฉพาะ "วันนี้"
function getTodayRows() {
  const sheet = getOrCreateSheet(); // Use cached sheet
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = values[0];
  const data = values.slice(1);

  // Calculate yesterday's date once
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = Utilities.formatDate(yesterday, TZ, 'yyyy-MM-dd');

  // Helper in same scope - defined once
  const pad2 = (n) => String(n).padStart(2, '0');

  const normalizeDateToYmd = (cell) => {
    if (cell instanceof Date) {
      return Utilities.formatDate(cell, TZ, 'yyyy-MM-dd');
    }
    if (typeof cell === 'number') {
      const d = new Date(Math.round((cell - 25569) * 86400 * 1000));
      return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
    }
    if (typeof cell === 'string') {
      const s = cell.trim();
      if (!s) return null;

      // ตัดเฉพาะส่วนวันที่ (รองรับที่มีเวลาต่อท้ายเช่น "28/9/2025, 15:50:43")
      const onlyDate = s.split(/[ ,]/)[0];

      // yyyy-mm-dd
      const mIso = onlyDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (mIso) {
        const [_, y, mo, d] = mIso;
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }

      // dd/mm/yyyy หรือ d/m/yyyy
      const mTh = onlyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mTh) {
        const [_, d, mo, y] = mTh;
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }
    return null;
  };

  // Use for loop for better performance with large datasets
  const todayRows = [];
  for (let i = 0; i < data.length; i++) {
    const cell = data[i][DATE_COL - 1];
    const ymd = normalizeDateToYmd(cell);
    if (ymd === todayStr) {
      todayRows.push(data[i]);
    }
  }

  console.log(`พบ ${todayRows.length} แถวของวันที่ ${todayStr}`);

  if (todayRows.length === 0) {
    return [header];
  }

  return [header, ...todayRows];
}

// ส่งอีเมลสรุป + ปุ่มลิงก์เข้าหน้าระบบ + แนบ CSV
function emailTodaySummary() {
  // Calculate date once
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = Utilities.formatDate(yesterday, TZ, 'yyyy-MM-dd');

  const rows = getTodayRows(); // [header, ...data]
  const noData = rows.length <= 1;

  const subject = noData
    ? `สรุป Complain วันที่ (${todayStr}) — ไม่มีรายการ`
    : `สรุป Complain วันที่ (${todayStr}) — ${rows.length - 1} รายการ`;

  let bodyText, htmlBody;
  if (noData) {
    bodyText = `วันที่ (${todayStr}) ไม่มีรายการร้องเรียน/เคลม\n\nเข้าหน้าระบบ: ${SYSTEM_URL}`;
    htmlBody = htmlShell(`
      <h3>สรุป Complain วันที่ (${todayStr})</h3>
      <p>ไม่มีรายการ</p>
      ${linkButton(SYSTEM_URL, 'เปิดหน้าระบบ')}
    `);
  } else {
    const [header, ...data] = rows;
    bodyText = `สรุป Complain วันที่ (${todayStr}) จำนวน ${data.length} รายการ\n\nเข้าหน้าระบบ: ${SYSTEM_URL}`;
    htmlBody = htmlShell(`
      <h3>สรุป Complain วันที่ (${todayStr})</h3>
      ${tableHtml(header, data)}
      <div style="margin-top:16px;">${linkButton(SYSTEM_URL, 'เปิดหน้าระบบ')}</div>
    `);
  }

  const attachments = [];
  if (!noData) {
    const csvBlob = rowsToCsvBlob(rows, `Complain_${todayStr}.csv`);
    attachments.push(csvBlob);
  }

  MailApp.sendEmail({
    to: RECIPIENTS.join(','),
    cc: CC.join(','),
    bcc: BCC.join(','),
    subject,
    body: bodyText,  // fallback text
    htmlBody,
    attachments
  });

  console.log(`Email sent: ${subject} -> ${RECIPIENTS.join(',')}`);
}

/***** HELPERS *****/
function htmlShell(innerHtml) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
    ${innerHtml}
  </div>`;
}

function linkButton(url, label) {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  return `
  <a href="${safeUrl}" target="_blank"
     style="display:inline-block;background:#0b57d0;color:#fff;
            padding:10px 16px;border-radius:8px;text-decoration:none;">
     ${safeLabel}
  </a>`;
}

function tableHtml(header, data) {
  const thead = `<tr>${header.map(h => `<th style="border:1px solid #e5e7eb;padding:8px;background:#f8fafc;text-align:left;">${escapeHtml(h)}</th>`).join('')
    }</tr>`;

  const tbody = data.map(r =>
    `<tr>${r.map(c => {
      let text = "";
      if (c instanceof Date) {
        // ถ้าเป็น Date → format สวยงาม
        text = Utilities.formatDate(c, TZ, "dd/MM/yyyy");
      } else {
        text = c == null ? "" : String(c);
      }
      return `<td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">${escapeHtml(text)}</td>`;
    }).join('')
    }</tr>`
  ).join('');

  return `
  <table style="border-collapse:collapse;border:1px solid #e5e7eb;min-width:800px;">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>`;
}


function rowsToCsvBlob(rows, filename) {
  const csv = rows.map(row =>
    row.map(val => {
      const s = val == null ? '' : String(val);
      const needQuote = /[",\n]/.test(s);
      const esc = s.replace(/"/g, '""');
      return needQuote ? `"${esc}"` : esc;
    }).join(',')
  ).join('\n');
  return Utilities.newBlob(csv, 'text/csv', filename);
}

function escapeHtml(value) {
  const s = value == null ? '' : String(value);
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/***** QUICK TEST *****/
// รันทดสอบการดึงข้อมูล (ไม่ส่งเมล)
function test_getTodayRows() {
  const rows = getTodayRows();
  Logger.log(rows);
}

