const TELEGRAM_BOT_TOKEN = "";
const TELEGRAM_CHAT_ID = "";

const SHEET_WRITTEN_TEST = "แบบทดสอบข้อเขียน";
const SHEET_DRIVING_TEST = "แบบทดสอบขับรถ";

function onFormSubmit(e) {
	if (!e || !e.range) {
		throw new Error("onFormSubmit must be called by installable trigger.");
	}

	const sheet = e.range.getSheet();
	const sheetName = sheet.getName();
	const rowIndex = e.range.getRow();
	const lastCol = sheet.getLastColumn();

	const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
	const rowValues = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

	let message = "";
	if (isWrittenTestSheet(sheetName)) {
		message = buildWrittenTestMessage(headers, rowValues, rowIndex, sheetName);
	} else if (isDrivingTestSheet(sheetName)) {
		message = buildDrivingTestMessage(headers, rowValues, rowIndex, sheetName);
	} else {
		return;
	}

	sendTelegramMessage(message);
}

function createOnFormSubmitTrigger() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	ScriptApp.newTrigger("onFormSubmit")
		.forSpreadsheet(ss)
		.onFormSubmit()
		.create();
}

function isWrittenTestSheet(sheetName) {
	return sheetName === SHEET_WRITTEN_TEST || sheetName.indexOf("ข้อเขียน") !== -1;
}

function isDrivingTestSheet(sheetName) {
	return sheetName === SHEET_DRIVING_TEST || sheetName.indexOf("ขับรถ") !== -1;
}

function buildWrittenTestMessage(headers, rowValues, rowIndex, sheetName) {
	const examineeCode = getByHeaders(headers, rowValues, ["รหัสผู้สอบ"]);
	const fullName = getByHeaders(headers, rowValues, ["ชื่อ-นามสกุล"]);
	const examDate = getByHeaders(headers, rowValues, ["วันที่ที่ทดสอบ"]);
	const company = getByHeaders(headers, rowValues, ["บริษัท"]);

	const x = toNumber(getByColumnLetter(rowValues, "U"));
	const z = toNumber(getByColumnLetter(rowValues, "AG"));

	const part1Max = 15;
	const part2Max = 10;
	const totalMax = 25;

	const part1Percent = percent(x, part1Max);
	const part2Percent = percent(z, part2Max);
	const total = x + z;

	const passed = x > 12 && z > 8;

	return [
		"📋 รายงานผลแบบทดสอบข้อเขียน",
		"รหัสผู้สอบ: <b>" + htmlEscape(textOrDash(examineeCode)) + "</b>",
		"ชื่อ-สกุลผู้สอบ: <b>" + htmlEscape(textOrDash(fullName)) + "</b>",
		"วันที่สอบ: <b>" + htmlEscape(formatDateValue(examDate)) + "</b>",
		"บริษัท: <b>" + htmlEscape(textOrDash(company)) + "</b>",
		"",
		"Part 1: <b>" + htmlEscape(x + "/" + part1Max + " (" + part1Percent + "%)") + "</b>",
		"Part 2: <b>" + htmlEscape(z + "/" + part2Max + " (" + part2Percent + "%)") + "</b>",
		"",
		"คะแนนรวม: <b>" + htmlEscape(total + "/" + totalMax) + "</b>",
		"ผลการทดสอบ: <b>" + htmlEscape(passed ? "ผ่าน ✅" : "ไม่ผ่าน ❌") + "</b>",
        "เกณฑ์: ต้องได้ Part 1 มากกว่า 12 คะแนน และ Part 2 มากกว่า 8 คะแนน"
	].join("\n");
}

function buildDrivingTestMessage(headers, rowValues, rowIndex, sheetName) {
	const testerCode = getByHeaders(headers, rowValues, ["รหัสพนักงานผู้ทดสอบ"]);
	const examineeCode = getByHeaders(headers, rowValues, ["รหัสผู้สอบ"]);
	const fullName = getByHeaders(headers, rowValues, ["ชื่อ-สกุล"]);
	const testDate = getByHeaders(headers, rowValues, ["วันที่ทดสอบ"]);
	const company = getByHeaders(headers, rowValues, ["บริษัท"]);

	const groupDefs = [
		{ label: "กลุ่ม 1 การเตรียมความพร้อม", score: toNumber(getByColumnLetter(rowValues, "J")), max: 25 },
		{ label: "กลุ่ม 2 การดูแลรักษายาง", score: toNumber(getByColumnLetter(rowValues, "K")), max: 5 },
		{ label: "กลุ่ม 3 การดูแลรักษาช่วงล่าง", score: toNumber(getByColumnLetter(rowValues, "L")), max: 5 },
		{ label: "กลุ่ม 4 การใช้สัญญาณไฟ", score: toNumber(getByColumnLetter(rowValues, "O")), max: 10 },
		{ label: "กลุ่ม 5 การถอด-ต่อหาง", score: toNumber(getByColumnLetter(rowValues, "P")), max: 5 },
		{ label: "กลุ่ม 6 การขับขี่", score: toNumber(getByColumnLetter(rowValues, "V")), max: 25 }
	];

	const totalMax = 75;
	const total = groupDefs.reduce(function (sum, group) {
		return sum + group.score;
	}, 0);
	const totalPercent = percent(total, totalMax);
	const passed = totalPercent > 65 || total > 49;

	const groupLines = groupDefs.map(function (group) {
		return htmlEscape(group.label) + ": <b>" + htmlEscape(group.score + "/" + group.max + " (" + percent(group.score, group.max) + "%)") + "</b>";
	});


	return [
		"🚗 รายงานผลแบบทดสอบขับรถ",
		"รหัสผู้ทดสอบ: <b>" + htmlEscape(textOrDash(testerCode)) + "</b>",
		"รหัสผู้สอบ: <b>" + htmlEscape(textOrDash(examineeCode)) + "</b>",
		"ชื่อ-สกุลผู้สอบ: <b>" + htmlEscape(textOrDash(fullName)) + "</b>",
		"วันที่ทดสอบ: <b>" + htmlEscape(formatDateValue(testDate)) + "</b>",
		"บริษัท: <b>" + htmlEscape(textOrDash(company)) + "</b>",
		"",
		groupLines.join("\n"),
		"",
		"คะแนนรวม: <b>" + htmlEscape(total + "/" + totalMax ) + "</b>",
		"ผลการทดสอบ: <b>" + htmlEscape(passed ? "ผ่าน ✅" : "ไม่ผ่าน ❌") + "</b>",
		"เกณฑ์: มากกว่า 65% หรือ มากกว่า 49 คะแนน"
	].join("\n");
}

function getByHeaders(headers, rowValues, aliases) {
	for (var i = 0; i < aliases.length; i += 1) {
		var headerName = aliases[i];
		var index = headers.indexOf(headerName);
		if (index !== -1) {
			return rowValues[index];
		}
	}
	return "";
}

function getByColumnLetter(rowValues, letter) {
	var index = columnLetterToIndex(letter);
	if (index < 0 || index >= rowValues.length) {
		return "";
	}
	return rowValues[index];
}

function columnLetterToIndex(letter) {
	var result = 0;
	var normalized = String(letter).trim().toUpperCase();

	for (var i = 0; i < normalized.length; i += 1) {
		var code = normalized.charCodeAt(i);
		if (code < 65 || code > 90) {
			throw new Error("Invalid column letter: " + letter);
		}
		result = result * 26 + (code - 64);
	}

	return result - 1;
}

function toNumber(value) {
	var n = Number(value);
	return isNaN(n) ? 0 : n;
}

function percent(score, max) {
	if (!max) {
		return "0.00";
	}
	return ((score / max) * 100).toFixed(2);
}

function textOrDash(value) {
	return value === null || value === undefined || value === "" ? "-" : String(value);
}

function htmlEscape(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function formatDateValue(value) {
	if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
		return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
	}
	return textOrDash(value);
}

function sendTelegramMessage(message) {
	if (
		!TELEGRAM_BOT_TOKEN ||
		!TELEGRAM_CHAT_ID
	) {
		throw new Error("Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID before use.");
	}

	var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
	var payload = {
		chat_id: TELEGRAM_CHAT_ID,
		text: message,
		parse_mode: "HTML"
	};

	UrlFetchApp.fetch(url, {
		method: "post",
		contentType: "application/json",
		payload: JSON.stringify(payload),
		muteHttpExceptions: true
	});
}
