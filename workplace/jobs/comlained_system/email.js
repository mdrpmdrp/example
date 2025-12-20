

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
// ดึงแถวเฉพาะช่วง 7 วันที่ผ่านมา (รวมถึงเมื่อวาน) — weekly summary
function getWeekRows() {
  const sheet = getOrCreateSheet(); // Use cached sheet
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = values[0];
  const data = values.slice(1);

  // Calculate end = yesterday, start = 6 days before yesterday (7-day window)
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const pad2 = (n) => String(n).padStart(2, '0');
  const startStr = Utilities.formatDate(start, TZ, 'yyyy-MM-dd');
  const endStr = Utilities.formatDate(end, TZ, 'yyyy-MM-dd');

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
      const onlyDate = s.split(/[ ,]/)[0];
      const mIso = onlyDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (mIso) {
        const [_, y, mo, d] = mIso;
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
      const mTh = onlyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mTh) {
        const [_, d, mo, y] = mTh;
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }
    return null;
  };

  const weekRows = [];
  for (let i = 0; i < data.length; i++) {
    const cell = data[i][DATE_COL - 1];
    const ymd = normalizeDateToYmd(cell);
    if (ymd && ymd >= startStr && ymd <= endStr) {
      weekRows.push(data[i]);
    }
  }

  console.log(`พบ ${weekRows.length} แถวระหว่าง ${startStr} - ${endStr}`);

  if (weekRows.length === 0) {
    return [header];
  }

  return [header, ...weekRows];
}

// ส่งอีเมลสรุป + ปุ่มลิงก์เข้าหน้าระบบ + แนบ CSV
function emailWeeklySummary() {
  // Range: last 7 days ending yesterday
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const startStr = Utilities.formatDate(start, TZ, 'yyyy-MM-dd');
  const endStr = Utilities.formatDate(end, TZ, 'yyyy-MM-dd');

  const rows = getWeekRows(); // [header, ...data]
  const noData = rows.length <= 1;

  const subject = noData
    ? `สรุป Complain (${startStr} - ${endStr}) — ไม่มีรายการ`
    : `สรุป Complain (${startStr} - ${endStr}) — ${rows.length - 1} รายการ`;

  let bodyText, htmlBody;
  if (noData) {
    bodyText = `ช่วง (${startStr} - ${endStr}) ไม่มีรายการร้องเรียน/เคลม\n\nเข้าหน้าระบบ: ${SYSTEM_URL}`;
    htmlBody = htmlShell(`
      <h3>สรุป Complain (${startStr} - ${endStr})</h3>
      <p>ไม่มีรายการ</p>
      ${linkButton(SYSTEM_URL, 'เปิดหน้าระบบ')}
    `);
  } else {
    const [header, ...data] = rows;
    bodyText = `สรุป Complain (${startStr} - ${endStr}) จำนวน ${data.length} รายการ\n\nเข้าหน้าระบบ: ${SYSTEM_URL}`;
    const statusCounts = data.reduce((acc, row) => {
      const st = row[13] == null || row[13] === '' ? 'ไม่ระบุ' : String(row[13]);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    const statusHtml = Object.keys(statusCounts).map(st => {
      const count = statusCounts[st];
      const lower = st.toLowerCase();
      const badgeColor = lower.includes('open') || lower.includes('ใหม่') ? '#ef4444'
        : lower.includes('closed') || lower.includes('ปิด') || lower.includes('เสร็จ') ? '#10b981'
        : '#0b57d0';
      return `<span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:${badgeColor};color:#fff;font-weight:600;margin-right:8px;margin-bottom:8px;">
                ${escapeHtml(st)} <span style="margin-left:8px;background:rgba(255,255,255,0.15);padding:2px 6px;border-radius:8px;font-weight:700;">${count}</span>
              </span>`;
    }).join('');

    htmlBody = htmlShell(`
      <div style="padding:8px 0;">
        <h3 style="margin:0 0 6px 0;">สรุป Complain (${startStr} - ${endStr})</h3>
        <p style="margin:0 0 12px 0;color:#555;">จำนวนรายการ: <strong>${data.length}</strong></p>

        <div style="margin-bottom:12px;">
          ${statusHtml}
        </div>

        <div style="margin-bottom:12px;color:#666;font-size:13px;">
          <strong>หมายเหตุ:</strong> รายละเอียดตามตารางด้านล่าง (ไฟล์ CSV แนบในอีเมล)
        </div>

        ${tableHtml(header, data)}

        <div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:nowrap;">
          ${linkButton(SYSTEM_URL, 'เปิดหน้าระบบ')}
        </div>
      </div>
    `);
  }

  const attachments = [];
  if (!noData) {
    const csvBlob = rowsToCsvBlob(rows, `Complain_${startStr}_to_${endStr}.csv`);
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

  console.log(`Weekly email sent: ${subject} -> ${RECIPIENTS.join(',')}`);
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
    `<tr>${r.map((c, j) => {
      let text = "";
      if (c instanceof Date) {
        // ถ้าเป็น Date → format สวยงาม
        text = Utilities.formatDate(c, TZ, "dd/MM/yyyy");
      } else {
        if (header[j] === 'แนวทางแก้ไข') {
          // ถ้าเป็นคอลัมน์ "แนวทางแก้ไข" → แปลง JSON เป็นข้อความลิสต์
          try {
            const sols = JSON.parse(c);
            if (Array.isArray(sols) && sols.length > 0) {
              text = sols.map((s, idx) => `${idx + 1}. ${s.text}`).join('<br>');
            } else {
              text = "";
            }
          } catch (e) {
            text = String(c);
          }
        } else {
          // ค่าอื่นๆ → แปลงเป็นสตริงปกติ
          text = c == null ? "" : String(c);

        }
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
function test_getWeekRows() {
  const rows = getWeekRows();
  Logger.log(rows);
}

