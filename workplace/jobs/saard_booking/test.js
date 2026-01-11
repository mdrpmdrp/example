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
      'Facebook Name': ['TestZaa'],
      'รหัสไปรษณีย์': ['12345'],
      'ช่องทางการติดต่อ': ['Line']
    },
    range: SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange('A271')
  };
  onFormSubmit(mockEvent);
}

function testWithLastSubmit(){
  const form = FormApp.openById('18RkwtVLYVUwQVgREB6psdjvjOIv2kngYhY-HSrtIN_Q');
  const responses = form.getResponses();
  const lastResponse = responses[responses.length - 1];
  const mockEvent = {
    namedValues: lastResponse.getItemResponses().reduce((acc, itemResponse) => {
      acc[itemResponse.getItem().getTitle()] = [itemResponse.getResponse()];
      return acc;
    }, {}),
    range: SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange('A' + (responses.length + 1))
  };
  onFormSubmit(mockEvent);
  
}

function testEditEvent(){
    onEventEdit({
      range: SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange('A271')
    });
}