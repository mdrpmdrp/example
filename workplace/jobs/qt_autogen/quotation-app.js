// quotation-app.js
// Handles reading two Excel files, generating a placeholder quotation, and previewing/downloading it

let file1Data = null;
let file2Data = null;
let quotationData = [];

$(document).ready(function() {
    // Initialize file inputs and buttons
    $('#file1').on('change',async function(e) {
        const file = e.target.files[0];
        if (file) {
            await readExcel(file, data => { file1Data = data || []; });
            console.log('File1 data:', file1Data);
            let site = file1Data[2] ? file1Data[2][2] : 'Not Found';
            quotationData = file1Data.filter(row => row[2] == 'Lab Code')
            $('#site-name').text(site);
            $('#found-datas').text(quotationData.length);
            $('#file1Info').removeClass('d-none');
            renderPreview();
        }else{
            Swal.fire({
                title: 'No File Selected',
                text: 'Please select an Excel file.',
                icon: 'warning',
                customClass:{
                    popup: 'rounded-4'
                },
                confirmButtonColor: '#3085d6',
                confirmButton: 'OK',
            });
        }
    });

    $('#file2').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            readExcel(file, data => { file2Data = data; });
        }
    });

    $('#generateBtn').on('click', function() {
        if (!file1Data || !file2Data) {
            alert('Please select both Excel files.');
            return;
        }
        // Placeholder: just combine headers from both files for now
        const header1 = file1Data[0] || [];
        const header2 = file2Data[0] || [];
        quotationData = [
            ['Quotation Placeholder'],
            ['File 1 Headers:', ...header1],
            ['File 2 Headers:', ...header2],
            // Add more rows as needed in the future
        ];
        renderPreview();
        $('#downloadBtn').show();
    });

    $('#downloadBtn').on('click', function() {
        if (!quotationData.length) return;
        const ws = XLSX.utils.aoa_to_sheet(quotationData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
        XLSX.writeFile(wb, 'quotation.xlsx');
    });
});

function readExcel(file, callback) {
    return new Promise((resolve, reject) => {
        if (!file || !file.name.split('.').pop().toLowerCase().indexOf('xls') === -1) {
            Swal.fire({
                title: 'Invalid File',
                text: 'Please select a valid Excel file (.xlsx).',
                icon: 'error',
                customClass:{
                    popup: 'rounded-4'
                },
                confirmButtonColor: '#3085d6',
                confirmButton: 'เลือกไฟล์ใหม่',
                
            });
            reject('Invalid file type');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            resolve(callback(jsonData));
        };
        reader.readAsArrayBuffer(file);
        reader.onerror = function() {
            alert('Error reading file. Please try again.');
            reject(reader.error);
        };
    });

}


function renderPreview() {
    console.log('Rendering preview with data:', quotationData);
    const preview = document.getElementById('preview');
    if (!quotationData.length) {
        preview.innerHTML = '<em>No data to preview.</em>';
        return;
    }
    let table = $('<table class="table table-bordered table-striped">');
    let thead = $('<thead>');
    let tbody = $('<tbody>');
    thead.append('<tr><th class="text-center text-nowrap">No</th><th class="text-center text-nowrap">HIS code</th><th class="text-center text-nowrap">NHS code</th><th class="text-center text-nowrap">Lab name</th><th class="text-center text-nowrap">Remark</th></tr>');
    quotationData.forEach((row, i) => {
        let tr = $('<tr>');
        tr.append('<td class="text-left">' + (i+1) + '</td>');
        tr.append('<td class="text-left">' + (row[3] || '') + '</td>');
        tr.append('<td class="text-left">' + (row[4] || '') + '</td>');
        tr.append('<td class="text-left">' + (row[5] || '') + '</td>');
        tr.append('<td class="text-left">' + (row[29] || '') + '</td>');
        tbody.append(tr);
    });
    table.append(thead).append(tbody);
    preview.innerHTML = '';
    preview.appendChild(table[0]);
    $('#preview').removeClass('d-none');
    $('#downloadBtn').show();
    $('#generateBtn').hide();
}
