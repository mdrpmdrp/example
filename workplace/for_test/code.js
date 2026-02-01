const LINE_ACCESS_TOKEN = "19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU="
const GEMINI_API_KEY = "AIzaSyD6fNo8sHy7-3mPwXp0DWFR8sdwJezKGBw";
const SHEET_ID = "1fqrI-XEOflI76NqolzuagMCJPxazn-EhaUC3hZgk7TA";
const SHEET_NAME = "AIread";
function doPost(e) {
    Logger = BetterLog.useSpreadsheet()
    LineBotWebhook.init(e, LINE_ACCESS_TOKEN, true).forEach(function (webhook) {
        try {
            if (webhook.eventType !== "message" || webhook.messageType !== "text" || !webhook.message || webhook.message.toString().trim() === "") {
                return webhook.ok
            }

            let rawText = webhook.message.toString().trim();
            let chatTime = formatBangkokTime_(webhook.timestamp);
            let parsed = callGeminiToParse_(chatTime, rawText);
            let row = normalizeToRow_(parsed, chatTime, rawText);
            appendRow_(row);

            return webhook.replyToline(["Save to sheet completed. Thank you!"],true);
        }
        catch (e) { //with stack tracing if your exceptions bubble up to here
            e = (typeof e === 'string') ? new Error(e) : e;
            Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
                e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
            throw e;
        }
    })
}

// ====== TIME ======
function formatBangkokTime_(unixMs) {
    return Utilities.formatDate(new Date(unixMs), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
}

// ====== GEMINI ======
function callGeminiToParse_(chatTime, rawText) {
    const apiKey = GEMINI_API_KEY;
    const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" +
        encodeURIComponent(apiKey);

    const branchList = getBranchListText_();

    const instruction =
        `Return JSON only. No markdown. No explanation.
Keys exactly:
chat_time, appointment_date, owner_branch, appointment_branch, program, channel, customer_type, phone_text, notes

Rules:
- appointment_date must be M/D/2026 only. Use year 2026 only.
- If date uses BE year like 69 or 2569, treat it as 2026.
- Remove appointment time from appointment_date.
- appointment_branch must be full branch name using the branch list.
- owner_branch: if owner contains an L# code, map to full branch name using the branch list.
- phone_text: digits only (remove '-') OR email/HN if no phone; always prefix with a single quote (').
- notes: include other instructions such as reschedule/change time/change branch/add program; else empty string.

Branch list:
${branchList}
`;

    const prompt =
        `chat_time: ${chatTime}
text:
${rawText}`;

    const req = {
        contents: [
            {
                role: "user",
                parts: [{ text: instruction + "\n\n" + prompt }]
            }
        ],
        generationConfig: {
            temperature: 0
        }
    };

    const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(req),
        muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const txt = res.getContentText();
    if (code < 200 || code >= 300) throw new Error("Gemini API error " + code + ": " + txt);

    const data = JSON.parse(txt);
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) throw new Error("Gemini returned empty content: " + txt);

    // Strip markdown code blocks if present
    let jsonText = out.trim();
    if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    }

    // Must be JSON
    return JSON.parse(jsonText);
}

// ====== NORMALIZE TO YOUR RULES ======
function normalizeToRow_(obj, chatTime, rawText) {
    const safe = (v) => (v === null || v === undefined) ? "" : String(v).trim();

    // Date -> enforce M/D/2026 from either obj or rawText
    let appointmentDate = safe(obj.appointment_date);
    appointmentDate = normalizeDateTo2026_(appointmentDate, rawText);

    // Branch mapping
    let ownerBranch = normalizeBranch_(safe(obj.owner_branch));
    let apptBranch = normalizeBranch_(safe(obj.appointment_branch));

    let program = safe(obj.program);
    let channel = safe(obj.channel);
    let ctype = safe(obj.customer_type);

    // Phone text
    let phone = normalizePhoneText_(safe(obj.phone_text));

    // Notes
    let notes = safe(obj.notes);
    if (!notes) {
        // If raw contains change keywords, keep full raw as notes
        const keywords = ["เลื่อน", "ขยับ", "เพิ่มโปรแกรม", "เปลี่ยนสาขา", "ย้ายสาขา", "เลื่อนเวลา", "เลื่อนวัน", "เลื่อนวันและเวลา"];
        if (keywords.some(k => rawText.includes(k))) notes = rawText;
    }

    // Output row order:
    // Chat Time | วันที่นัด | ผู้ดูแล | นัดสาขา | โปรแกรม | ช่องทาง | ประเภท | เบอร์โทร | หมายเหตุ
    return [
        chatTime,
        appointmentDate,
        ownerBranch,
        apptBranch,
        program,
        channel,
        ctype,
        phone,
        notes
    ];
}

function normalizeDateTo2026_(dateText, rawText) {
    // If already M/D/2026
    if (/^\d{1,2}\/\d{1,2}\/2026$/.test(dateText)) return dateText;

    // Try find in raw: DD/MM/YY or DD/MM/YYYY (BE)
    const m = rawText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        const dd = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        return `${mm}/${dd}/2026`;
    }

    // If Gemini gave DD/MM/.., convert
    const m2 = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m2) {
        const dd = parseInt(m2[1], 10);
        const mm = parseInt(m2[2], 10);
        return `${mm}/${dd}/2026`;
    }

    return dateText || "";
}

function normalizePhoneText_(v) {
    if (!v) return "";

    let s = String(v).trim();

    //   if email or HN, keep as-is (after normalizing apostrophe and removing hyphens/spaces)
    const isEmail = s.includes("@");
    const isHN = /HN/i.test(s);

    if (isEmail || isHN) {
        return s
    }
    // else digits only
    else {
        // Normalize curly apostrophe to plain
        s = s.replace(/\D/g, "");
        return "'" + s;
    }
}

function normalizeBranch_(text) {
    if (!text) return "";

    const map = getBranchMap_();

    // If contains L#
    const m = text.match(/(L\d{1,2})/i);
    if (m) {
        const code = m[1].toUpperCase();
        return map[code] || text;
    }

    // Match by Thai name substring
    const keys = Object.keys(map);
    for (const k of keys) {
        const full = map[k];
        const thai = full.replace(/^L\d{1,2}\s+/, "");
        if (thai && text.includes(thai)) return full;
    }

    return text;
}

// ====== APPEND TO SHEET ======
function appendRow_(row) {

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) throw new Error("Sheet not found: " + SHEET_NAME);

    sh.appendRow(row);
}

// ====== BRANCH LIST ======
function getBranchMap_() {
    return {
        "L1": "L1 สยามสแควร์วัน",
        "L2": "L2 เซ็นทรัลพระราม 9",
        "L3": "L3 เซ็นทรัลเวสเกต",
        "L4": "L4 สีลมคอมเพล็กซ์",
        "L5": "L5 เซ็นทรัลปิ่นเกล้า",
        "L6": "L6 เซ็นทรัลลาดพร้าว",
        "L7": "L7 มาร์เช่ ทองหล่อ",
        "L8": "L8 ฟิวเจอร์พาร์ค รังสิต",
        "L9": "L9 เซ็นทรัลพระราม 2",
        "L10": "L10 เซ็นทรัลพัทยาบีช",
        "L12": "L12 เดอะมอลล์ บางกะปิ",
        "L13": "L13 เดอะมอลล์ บางแค",
        "L14": "L14 เซ็นทรัลเวสต์วิลล์",
        "L15": "L15 พรอมานาด",
        "L16": "L16 เอสพลานาด รัชดา",
        "L17": "L17 ซีคอนสแควร์ ศรีนครินทร์",
        "L20": "L20 ซีคอนบางแค",
        "L21": "L21 เมกาบางนา",
        "L22": "L22 แจ้งวัฒนะ",
        "L23": "L23 One Bangkok",
        "L24": "L24 เทอมินอล อโศก",
        "L25": "L25 เดอะมอลล์งามวงศ์วาน",
        "L26": "L26 เซ็นทรัลขอนแก่น",
        "L27": "L27 เซ็นทรัลเวิลด์",
        "L28": "L28 เอ็มควอเทียร์",
        "L29": "L29 ชิดลม",
        "L30": "L30 เซ็นทรัลอีสวิลล์"
    };
}

function getBranchListText_() {
    const map = getBranchMap_();
    return Object.keys(map)
        .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
        .map(k => map[k])
        .join("\n");
}

// ====== PROPERTIES ======
function getProp_(key) {
    const v = PropertiesService.getScriptProperties().getProperty(key);
    if (!v) throw new Error("Missing Script Property: " + key);
    return v;
}

// ====== LINE SIGNATURE (optional) ======
function verifyLineSignature_(body, signature) {
    const secret = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_SECRET");
    if (!secret || !signature) return false;

    const mac = Utilities.computeHmacSha256Signature(body, secret);
    const computed = Utilities.base64Encode(mac);
    return computed === signature;
}

function getHeader_(e, name) {
    try {
        if (e && e.headers && e.headers[name]) return e.headers[name];
        if (e && e.headers) {
            // try case-insensitive
            const key = Object.keys(e.headers).find(k => k.toLowerCase() === name.toLowerCase());
            if (key) return e.headers[key];
        }
    } catch (_) { }
    return null;
}
