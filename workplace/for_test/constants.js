// Spreadsheet and Folder IDs
const SPREADSHEET_ID = '1sW7WMWXYtmo87XiweRdyEL5hNhtQc1jH_Eu2vdX3H-Q';
const ACHIVE_FOLDER_ID = '1aIS4IF_FWu9WgAsMb2fV6XtGqn9Dap9F';
const UPLOAD_FOLDER_ID = '1Gu3yiv7EbOrP-XBEHr6xe1vWKT8HMEna';
const ALL_FILES_FOLDER = '1DbVOZa02GmYjI957eQA56pzWl_hAT2l6';
const ACHIVE_DISCOUNT_BILL_FOLDER_ID = '1myVym_eCPMb3EhcnWQ-g2gsMavInzkVA';
const DISCOUNT_BILL_WAITING_PAY_FOLDER_ID = '1A4LPApesK5kYjDWpPIsl8Rs3Fu5Tkj8t';

// Sheet Names
const SHEET_MASTER = 'ใบส่งของ_สรุปลูกค้า';
const SHEET_PAID = 'ลูกค้าจ่ายเงิน';
const SHEET_DISCOUNT_BILL = 'ใบค้างส่วนลด';
const SHEET_YEAR = 'ใบส่งของ_รายปี';
const SHEET_PAID_SUMMARY_YEARLY = 'สรุปใบส่งของ';
const SHEET_DAILY_RECORD_SUMMARY = 'สรุปยอด';
const SHEET_LISTS = 'List';
const SHEET_DAILY_RECORD = 'DAILY_RECORD';

// Column Indices (1-based)
const COL_CODE = 1;
const COL_NAME = 2;
const COL_MONTH = 3;
const COL_YEAR = 4;
const COL_INVOICE = 5;
const COL_AMOUNT = 6;
const COL_FILEURL = 7;
const COL_PAIDFLAG = 8;
const COL_FILEID = 9;

// Month Names
const monthShortNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const monthHeaderMap = {
    'ม.ค.': 'มกราคม',
    'ก.พ.': 'กุมภาพันธ์',
    'มี.ค.': 'มีนาคม',
    'เม.ย.': 'เมษายน',
    'พ.ค.': 'พฤษภาคม',
    'มิ.ย.': 'มิถุนายน',
    'ก.ค.': 'กรกฎาคม',
    'ส.ค.': 'สิงหาคม',
    'ก.ย.': 'กันยายน',
    'ต.ค.': 'ตุลาคม',
    'พ.ย.': 'พฤศจิกายน',
    'ธ.ค.': 'ธันวาคม'
};
