// quotation-app.js
// Handles reading two Excel files, generating a placeholder quotation, and previewing/downloading it

let file1Data = null;
let file2Data = null;
let quotationData = [];

// Column settings (0-based indices). Defaults based on previous hard-coded usage
let columnSettings = {
    his: 3,
    nhs: 4,
    lab: 5,
    remark: 28
};


$(document).ready(function () {
    $('#file1').on('change', async function (e) {
        const file = e.target.files[0];
        if (file) {
            await readExcel(file, data => { file1Data = data || []; });
            col_his = col_filter = col_nhs = col_lab = col_remark = null;
            console.log('File1 data:', file1Data);
            let site = file1Data[2] ? file1Data[2][2] : 'Not Found';
            let setting = siteSettings.find(s => s.name === site);
            if (setting) {
                col_type = convertLetterToColumnNumber(setting.col_type);
                col_filter = convertLetterToColumnNumber(setting.col_filter);
                col_his = convertLetterToColumnNumber(setting.col_his);
                col_nhs = convertLetterToColumnNumber(setting.col_nhs);
                col_lab = convertLetterToColumnNumber(setting.col_lab);
                col_remark = convertLetterToColumnNumber(setting.col_remark);
            } else {
                Swal.fire({
                    title: 'ยังไม่ได้ตั้งค่าคอลัมน์',
                    text: `กรุณาตั้งค่าคอลัมน์สำหรับ site : ${site} ก่อน`,
                    icon: 'warning',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'ตกลง',
                });
                return;
            }
            quotationData = file1Data.filter(row => row[col_filter] == 'Lab Code' || row[col_filter] === 'Extend Code');
            let types = [...new Set(quotationData.map(row => row[col_type]).filter(Boolean))];
            $('#site-name').text(site);
            $('#found-datas').text(quotationData.length);
            $('#item-group-list').empty();
            if (types.length) {
                types.forEach(type => {
                    $('#item-group-list').append(`<li class="text-bold">${type}   :  ${quotationData.filter(row => row[col_type] === type).length} รายการ</li>`);
                });
            } else {
                $('#item-group-list').append('<li class="text-muted">No types found</li>');
            }
            $('#file1Info').removeClass('d-none');
            renderPreview();
        } else {
            Swal.fire({
                title: 'No File Selected',
                text: 'Please select an Excel file.',
                icon: 'warning',
                customClass: {
                    popup: 'rounded-4'
                },
                confirmButtonColor: '#3085d6',
                confirmButton: 'OK',
            });
        }
    });

    $('#file2').on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            readExcel(file, data => { file2Data = data; });
        }
    });

    $('#generateBtn').on('click', function () {
        if (!file1Data || !file2Data) {
            alert('Please select both Excel files.');
            return;
        }
        quotationData = [
            ['Quotation Placeholder'],
            ['File 1 Headers:', ...header1],
            ['File 2 Headers:', ...header2],
            // Add more rows as needed in the future
        ];
        renderPreview();
        $('#downloadBtn').show();
    });

    $('#downloadBtn').on('click', function () {
        if (!quotationData.length) return;
        const ws = XLSX.utils.aoa_to_sheet(quotationData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
        XLSX.writeFile(wb, 'quotation.xlsx');
    });
});

function convertLetterToColumnNumber(input) {
    if (input == null || input === '') return null;
    let ref = String(input).trim().toUpperCase();
    // If user passes a pure number assume 1-based column index
    if (/^\d+$/.test(ref)) return parseInt(ref, 10) - 1;
    // Accept references like "A", "AB", "C5" -> take leading letters
    const m = ref.match(/^[A-Z]+/);
    if (!m) return null;
    let letters = m[0];
    let value = 0;
    for (let i = 0; i < letters.length; i++) {
        value = value * 26 + (letters.charCodeAt(i) - 64);
    }
    return value - 1; // Convert to zero-based index
}

    function readExcel(file, callback) {
        return new Promise((resolve, reject) => {
            if (!file || !file.name.split('.').pop().toLowerCase().indexOf('xls') === -1) {
                Swal.fire({
                    title: 'Invalid File',
                    text: 'Please select a valid Excel file (.xlsx).',
                    icon: 'error',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'เลือกไฟล์ใหม่',

                });
                reject('Invalid file type');
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                resolve(callback(jsonData));
            };
            reader.readAsArrayBuffer(file);
            reader.onerror = function () {
                alert('Error reading file. Please try again.');
                reject(reader.error);
            };
        });

    }

    let col_filter, col_his, col_nhs, col_lab, col_remark;
    function renderPreview() {
        console.log("🚀 ~ col_remark:", col_remark)
        console.log("🚀 ~ col_lab:", col_lab)
        console.log("🚀 ~ col_nhs:", col_nhs)
        console.log("🚀 ~ col_his:", col_his)
        console.log("🚀 ~ col_filter:", col_filter)
        console.log('Rendering preview with data:', quotationData);
        const preview = document.getElementById('preview');
        if (!quotationData.length) {
            preview.innerHTML = '<em>No data to preview.</em>';
            return;
        }
        let table = $('<table class="table table-bordered table-striped table-hover">').attr('id', 'quotationTable');
        let thead = $('<thead>');
        let tbody = $('<tbody>');
        thead.append('<tr><th class="text-center text-nowrap">No</th><th class="text-center text-nowrap">HIS code</th><th class="text-center text-nowrap">NH code</th><th class="text-center text-nowrap">Test Name</th><th>Item Group</th><th>Subcontract Price</th><th>Service Fee</th><th>Total Price</th><th class="text-center text-nowrap">Remark</th></tr>');
        quotationData.forEach((row, i) => {
            console.log('Row data:', row);
            let tr = $('<tr>');
            tr.append('<td class="text-left">' + (i + 1) + '</td>');
            tr.append('<td class="text-left">' + (row[col_his] || '') + '</td>');
            tr.append('<td class="text-left">' + (row[col_nhs] || '<input type="text" class="form-control rounded-3" style="width: 100%;" />') + '</td>');
            tr.append('<td class="text-left">' + (row[col_lab] || '') + '</td>');
            for (let j = 0; j < 4; j++) {
                tr.append('<td class="text-left"></td>'); // Placeholder for extra columns
            }
            // Editable remark
            tr.append('<td class="text-left"><textarea rows="3" style="min-width:300px;" class="form-control rounded-3 remark-input" data-row="' + i + '">' + (row[col_remark] || '') + '</textarea></td>');
            tbody.append(tr);
        });
        table.append(thead).append(tbody);
        preview.innerHTML = '';
        preview.appendChild(table[0]);
        // Insert extra column before export (e.g., "Extra Info")
        $('#quotationTable').DataTable({
            paging: false,
            searching: false,
            info: false,
            scrollX: true,
            order: [[0, 'asc']],
            columnDefs: [
                { targets: 0, className: 'text-center', orderable: false, searchable: false },
                { targets: 1, className: 'text-left' },
                { targets: 2, className: 'text-left' },
                { targets: 3, className: 'text-left' },
                { targets: 4, className: 'text-left', visible: false },
                { targets: 5, className: 'text-left', visible: false },
                { targets: 6, className: 'text-left', visible: false },
                { targets: 7, className: 'text-left', visible: false },
                { targets: 4, className: 'text-left' }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: '<i class="fa fa-file-excel"></i> Export to Excel',
                    className: 'btn btn-primary mb-2',
                    title: 'Quotation',
                    exportOptions: {
                        columns: ':visible,:hidden'
                    }

                },
                {
                    extend: 'csvHtml5',
                    text: '<i class="fa fa-file-csv"></i> Export to CSV',
                    className: 'btn btn-primary mb-2',
                    title: 'Quotation',
                    exportOptions: {
                        columns: ':visible,:hidden'
                    }
                }
            ],
        });
        $('#preview').removeClass('d-none');
    }
