function testOnce() {
  const mockEvent = {
    namedValues: {
      'Booking ID': ['B12345'],
      'ชื่อ-นามสกุล': ['คุณทดสอบ ระบบ'],
      'จำนวนทีมงาน (คน)': ['5'],
      'วันที่ให้บริการ': ['20/1/2026'],
      'เวลาที่ให้บริการ (เริ่มงาน)': ['09:00:00'],
      'เวลาที่ให้บริการ (เลิกงาน)': ['15:00:00'],
      'สถานที่ / ที่อยู่': ['โครงการบ้านตัวอย่าง'],
      'ลิงก์ Google Maps': ['https://maps.app.goo.gl/xxxx'],
      'เบอร์โทร': ['0812345678'],
      'หมายเหตุเพิ่มเติม': ['งานทดสอบระบบ Calendar'],
      'Facebook Name': ['TestZaa']
    },
    range: SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange('A13')
  };
  onFormSubmit(mockEvent);
}

function testEditEvent(){
    onEventEdit({
      range: SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange('A13')
    });
}