// Form Handler - Handle form submission and event creation

/**
 * Main form submission handler
 */
function onFormSubmit(e) {
  try {
    const payload = buildPayload(e);
    if (!payload) return;

    const { title, description, location, start, end, sheet, row } = payload;

    if (start >= end) {
      Logger.log('❌ เวลาเริ่มต้องน้อยกว่าสิ้นสุด');
      return;
    }

    const eventId = createCalendarEvent(title, start, end, description, location);
    updateSheetWithEventId(sheet, row, eventId);
    Logger.log(`✅ Event สร้างสำเร็จ: ${title}`);
  } catch (err) {
    Logger.log('❌ ERROR: ' + err);
    throw err;
  }
}

/**
 * Build event payload from form submission
 */
function buildPayload(e) {
  if (!e?.namedValues) {
    Logger.log('❌ ไม่พบข้อมูลจากฟอร์ม');
    return null;
  }

  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  let data = e.namedValues;
  Object.keys(data).forEach(key => {
    data[key.trim()] = data[key];
    if (key.trim() !== key) delete data[key];
  })
  const name = getVal(data, 'ชื่อ-นามสกุล');
  const dateStr = getVal(data, 'วันที่ให้บริการ');
  const startTime = getVal(data, 'เวลาที่ให้บริการ (เริ่มงาน)');
  const endTime = getVal(data, 'เวลาที่ให้บริการ (เลิกงาน)');
  const facebookName = getVal(data, 'Facebook Name');
  const staffQuantity = getVal(data, 'จำนวนทีมงาน (คน)');
  const contact = getVal(data, 'ช่องทางการติดต่อ')

  const bookingId = e.range.getSheet().getRange(row, getSheetHeader(sheet).indexOf('Booking ID') + 1).getValue();

  const start = parseDateTime(dateStr, startTime);
  const end = parseDateTime(dateStr, endTime);
  if (!start || !end) {
    Logger.log(`❌ แปลงวันเวลาไม่สำเร็จ: ${dateStr}`);
    return null;
  }

  const description = formatDescription(data);
  const location = buildLocation(data);
  const title = `${staffQuantity} ${bookingId} ${name} ${contact}:${facebookName}`.trim();

  return { title, description, location, start, end, sheet, row };
}

/**
 * Build location string from sheet data
 */
function buildLocation(data) {
  return [getVal(data, 'สถานที่ / ที่อยู่'), getVal(data, 'ลิงก์ Google Maps')]
    .filter(Boolean)
    .join(' ');
}

/**
 * Format event description from form data
 */
function formatDescription(data) {
  //   return `ชื่อ-นามสกุล: ${getVal(data, 'ชื่อ-นามสกุล')}
  // เบอร์ติดต่อ: ${getVal(data, 'เบอร์ติดต่อ')}
  // ช่องทางการติดต่อ: ${getVal(data, 'ช่องทางการติดต่อ')}
  // Facebook Name: ${getVal(data, 'Facebook Name')}
  // จำนวนทีมงาน (คน): ${getVal(data, 'จำนวนทีมงาน (คน)')}
  // วันที่ให้บริการ: ${getVal(data, 'วันที่ให้บริการ')}
  // เวลาที่ให้บริการ (เริ่มงาน): ${getVal(data, 'เวลาที่ให้บริการ (เริ่มงาน)')}
  // เวลาที่ให้บริการ (เลิกงาน): ${getVal(data, 'เวลาที่ให้บริการ (เลิกงาน)')}
  // สถานที่ / ที่อยู่: ${getVal(data, 'สถานที่ / ที่อยู่')}
  // ลิงก์ Google Maps: ${getVal(data, 'ลิงก์ Google Maps')}
  // รายละเอียดเพิ่มเติม: ${getVal(data, 'รายละเอียดเพิ่มเติม')}`;

  return `Booking ID : ${getVal(data, 'Booking ID')} 👈\n` +
    `ชื่อ : ${getVal(data, 'ชื่อ-นามสกุล')}\n` +
    `เบอร์ : ${getVal(data, 'เบอร์โทร')}\n` +
    `ช่องทางการติดต่อ : ${getVal(data, 'ช่องทางการติดต่อ')} | ${getVal(data, 'Facebook Name')}\n` +
    `จำนวนทีมงาน : ${getVal(data, 'จำนวนทีมงาน (คน)')} คน\n` +
    `วันที่  : ${getVal(data, 'วันที่ให้บริการ')}\n` +
    `เวลา  : ${getVal(data, 'เวลาที่ให้บริการ (เริ่มงาน)')} - ${getVal(data, 'เวลาที่ให้บริการ (เลิกงาน)')} น.\n` +
    `สถานที่: ${getVal(data, 'สถานที่ / ที่อยู่')}\n` +
    `Maps : ${getVal(data, 'ลิงก์ Google Maps')}\n` +
    `หมายเหตุ :\n ${getVal(data, 'หมายเหตุเพิ่มเติม')}`;
}