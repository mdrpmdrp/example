// quotation-app.js
// Handles reading two Excel files, generating a placeholder quotation, and previewing/downloading it

let file1Data = file1Workbook = null;
let templateData = templateWorkbook = null;
let quotationData = [];
let template_file = null;
// Style storage
let file1Fills = []; // parallel to file1Data rows -> array of arrays of fill objects
let quotationFills = []; // filtered fills matching quotationData rows

// Column settings (0-based indices). Defaults based on previous hard-coded usage
let columnSettings = {
    his: 3,
    nhs: 4,
    lab: 5,
    remark: 28
};

let setting = null;


$(document).ready(function () {
    $('#file1').on('change', async function (e) {
        const file = e.target.files[0];
        if (file) {
            file1Fills = [];
            quotationFills = [];
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'xlsx' && window.ExcelJS) {
                await readExcelXlsxWithStyles(file).then(res => {
                    file1Data = res.rows;
                }).catch(err => {
                    console.error('ExcelJS read error (falling back to SheetJS):', err);
                });
            }
            if (!file1Data || !file1Data.length) {
                await readExcel(file, data => {
                    file1Data = data?.json || [];
                    file1Workbook = data?.workbook || null;
                });
            }
            col_his = col_filter = col_nhs = col_lab = col_remark = null;
            console.log('File1 data:', file1Data);
            let site = file1Data[2] ? file1Data[2][2] : 'Not Found';
            // Find site from the third row, third column
            site = site ? site.trim() : '';
            if (!site) {
                Swal.fire({
                    title: 'Site not found',
                    text: 'Please check the file format.',
                    icon: 'error',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'OK',
                });
                return;
            }
            // Find site settings
            // let siteSettings = JSON.parse(localStorage.getItem('siteSettings')) || [];
            fetch(`./excel_templates/template_${site}.xlsx`)
                .then(response => {
                    if (!response.ok) throw new Error('Template file not found');
                    return response.blob();
                }).then(blob => {
                    const file = new File([blob], `template_${site}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    try {
                        // Attempt to read the template file
                        if (window.ExcelJS) {
                            return readExcelXlsxWithStyles(file).then(res => {
                                console.log('Template file data:', res);
                                templateData = res.rows;
                                templateWorkbook = res.workbook;
                            });
                        }
                    } catch (e) {
                        console.error('Error reading template with ExcelJS:', e);
                        return readExcel(file, data => {
                            if (data) {
                                console.log('Template file data:', data);
                                templateData = data?.json || [];
                                templateWorkbook = data?.workbook || null;
                            } else {
                                throw new Error('Failed to read template file');
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error('Error fetching template file:', error);
                    Swal.fire({
                        title: 'Template file not found',
                        text: 'Please check the template file for the selected site.',
                        icon: 'error',
                        customClass: {
                            popup: 'rounded-4'
                        },
                        confirmButtonColor: '#3085d6',
                        confirmButton: 'OK',
                    });
                });
            // Read the template file
            if (!site) {
                Swal.fire({
                    title: 'Site not found',
                    text: 'Please check the file format.',
                    icon: 'error',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'OK',
                });
                return;
            }
            // Find site settings
            setting = siteSettings.find(s => s.name === site);
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
            quotationData = [];
            file1Data.forEach((row, idx) => {
                if (row && (row[col_filter] == 'Lab Code' || row[col_filter] === 'Extend Code')) {
                    quotationData.push(row);
                }
            });
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
            const data = e.target.result
            const workbook = XLSX.read(data, {
                cellFormula: true,
                cellHTML: true,
                cellNF: true,
                cellStyles: true,
                cellText: true,
                cellDates: true,
                dateNF: 'yyyy-mm-dd',
                sheetStubs: true,
                sheetRows: 100
            });
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                Swal.fire({
                    title: 'No Sheets Found',
                    text: 'The selected file does not contain any sheets.',
                    icon: 'warning',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'OK',
                });
                reject('No sheets found in the file');
                return;
            }
            console.log('Sheet Names:', workbook.SheetNames);
            console.log('First Sheet:', workbook.Sheets[workbook.SheetNames[0]]);
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', range: 'A1:CZ100' });
            if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
                Swal.fire({
                    title: 'No Data Found',
                    text: 'The selected file does not contain valid data.',
                    icon: 'warning',
                    customClass: {
                        popup: 'rounded-4'
                    },
                    confirmButtonColor: '#3085d6',
                    confirmButton: 'OK',
                });
                reject('No data found in the file');
                return;
            }
            resolve(callback({ json: jsonData, workbook: workbook }));
        };
        reader.readAsArrayBuffer(file);
        reader.onerror = function () {
            alert('Error reading file. Please try again.');
            reject(reader.error);
        };
    });

}

// ExcelJS reader for .xlsx capturing fills
async function readExcelXlsxWithStyles(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const buffer = e.target.result;
                const wb = new ExcelJS.Workbook();
                await wb.xlsx.load(buffer);
                const ws = wb.worksheets[0];
                const rows = [];
                // Collect rows and fills
                ws.eachRow({ includeEmpty: true }, (row, rIdx) => {
                    const v = [];
                    row.eachCell({ includeEmpty: true }, (cell, cIdx) => {
                        v[cIdx - 1] = cell.value;
                        if (!quotationData.length) {
                            if (!quotationFills[rIdx - 1]) quotationFills[rIdx - 1] = [];
                            quotationFills[rIdx - 1][cIdx - 1] = cell.fill || null;
                        }
                    });
                    rows.push(v);
                });
                resolve({ rows, workbook: wb });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

let col_filter, col_his, col_nhs, col_lab, col_remark, col_type;
function renderPreview() {
    quotationData = Object.groupBy(quotationData, row => row[col_type]);
    console.log('Rendering preview with data:', quotationData);
    const preview = document.getElementById('preview');
    if (!quotationData || !Object.keys(quotationData).length) {
        preview.innerHTML = '<em>No data to preview.</em>';
        return;
    }
    let table = $('<table class="table table-bordered table-striped table-hover">').attr('id', 'quotationTable');
    let thead = $('<thead>');
    let tbody = $('<tbody>');
    thead.append('<tr><th class="text-center text-nowrap">No</th><th class="text-center text-nowrap">HIS code</th><th class="text-center text-nowrap">NH code</th><th class="text-center text-nowrap">Test Name</th><th>Item Group</th><th>Subcontract Price</th><th>Service Fee</th><th>Total Price</th><th class="text-center text-nowrap">Remark</th></tr>');
    Object.entries(quotationData).forEach(([type, rows]) => {
        rows.forEach((row, i) => {
            const getText = (cell, valueDefault) => {
                if (!cell) return valueDefault || '';
                if (typeof cell === 'string' || typeof cell === 'number') return cell;
                if (cell.richText && Array.isArray(cell.richText)) {
                    return cell.richText.map(rt => rt.text).join('');
                }
                if (cell.text) return cell.text;
                return valueDefault || '';
            }
            let col_his_text = getText(row[col_his], '');
            let col_nhs_text = getText(row[col_nhs], '<input type="text" class="form-control rounded-3" style="width: 100%; min-width:120px;" />');
            let col_lab_text = getText(row[col_lab], '') === "" ? getText(row[col_lab - 2], '') : getText(row[col_lab], '');
            let col_remark_text = getText(row[col_remark], '');
            let tr = $('<tr>');
            tr.append('<td class="text-left">' + (i + 1) + '</td>');
            tr.append('<td class="text-left">' + col_his_text + '</td>');
            tr.append('<td class="text-left">' + col_nhs_text + '</td>');
            tr.append('<td class="text-left">' + col_lab_text + '</td>');
            for (let j = 0; j < 4; j++) {
                tr.append('<td class="text-left"></td>'); // Placeholder for extra columns
            }
            // Editable remark
            tr.append('<td class="text-left"><textarea rows="3" style="min-width:300px;" class="form-control rounded-3 remark-input" data-row="' + i + '">' + col_remark_text + '</textarea></td>');
            tr.append('<td class="text-left" style="display:none;">' + row[col_type] + '</td>'); // Hidden Item Group for grouping
            tbody.append(tr);
        });
    });
    // quotationData.forEach((row, i) => {
    //     const getText = (cell, valueDefault) => {
    //         if (!cell) return valueDefault || '';
    //         if (typeof cell === 'string' || typeof cell === 'number') return cell;
    //         if (cell.richText && Array.isArray(cell.richText)) {
    //             return cell.richText.map(rt => rt.text).join('');
    //         }
    //         if (cell.text) return cell.text;
    //         return valueDefault || '';
    //     }


    //     let col_his_text = getText(row[col_his], '');
    //     let col_nhs_text = getText(row[col_nhs], '<input type="text" class="form-control rounded-3" style="width: 100%;" />');
    //     let col_lab_text = getText(row[col_lab], '') === "" ? getText(row[col_lab - 2], '') : getText(row[col_lab], '');
    //     let col_remark_text = getText(row[col_remark], '');
    //     let tr = $('<tr>');
    //     tr.append('<td class="text-left">' + (i + 1) + '</td>');
    //     tr.append('<td class="text-left">' + col_his_text + '</td>');
    //     tr.append('<td class="text-left">' + col_nhs_text + '</td>');
    //     tr.append('<td class="text-left">' + col_lab_text + '</td>');
    //     for (let j = 0; j < 4; j++) {
    //         tr.append('<td class="text-left"></td>'); // Placeholder for extra columns
    //     }
    //     // Editable remark
    //     tr.append('<td class="text-left"><textarea rows="3" style="min-width:300px;" class="form-control rounded-3 remark-input" data-row="' + i + '">' + col_remark_text + '</textarea></td>');
    //     tr.append('<td class="text-left">' + row[col_type] + '</td>');
    //     tbody.append(tr);
    // });
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
            { targets: 8, className: 'text-left' },
            { targets: 9, className: 'text-left', visible: false } // Item Group hidden
        ],
        dom: 'Bfrtip',
        rowGroup: {
            dataSrc: 9 // Group by Item Group column
        },
        buttons: [
            // {
            //     text: '<i class="fa fa-file-excel"></i> Export to Excel',
            //     className: 'btn btn-primary mb-2',
            //     action: function (e, dt, node, config) {
            //         generateQuatationExcel();
            //     }
            // },
            // copy csv to clipboard button
            {
                text: '<i class="fa fa-copy"></i> Copy',
                className: 'btn btn-secondary mb-2',
                extend: 'copy',
                exportOptions: {
                    columns: ':visible,:hidden'
                }
            }
        ],
    });
    $('#preview').removeClass('d-none');
}

function generateQuatationExcel() {
    if (!quotationData || !Object.keys(quotationData).length) return;
    console.log('Quatation data:', quotationData);
    if (quotationFills.length && window.ExcelJS) {
        if (!templateWorkbook) {
            Swal.fire({
                title: 'Template Missing',
                text: 'Cannot export without template workbook.',
                icon: 'error',
                customClass: { popup: 'rounded-4' },
                confirmButtonColor: '#3085d6',
                confirmButton: 'OK'
            });
            return;
        }
        console.log('Generating Excel with styles using ExcelJS');
        // Use ExcelJS to create a new workbook and apply styles
        const wb_template = templateWorkbook;
        const ws = wb_template.worksheets[0] || wb_template.addWorksheet('Quotation');
        console.log('Using template workbook:', wb_template);
        // Zero-based column indexes
        // Prepare data for export
        // const quotationDataForExport = quotationData.map((row, i) => {
        //     return [
        //         i + 1, // No
        //         row[col_his] || '', // HIS code
        //         row[col_nhs] || '', // NHS code
        //         row[col_lab] || '', // Lab code
        //         '', '', '', '', // These will be filled later if needed
        //         row[col_remark] || '' // Remark
        //     ]
        // });
        // console.log('Quotation data for export:', quotationDataForExport);
        let quotationDataForExport = [];
        Object.entries(quotationData).forEach(([type, rows]) => {
            quotationDataForExport.push([
                '', // Empty cell for type group row
                '', '', '', '', '', '', '', '', ''
            ]);
            quotationDataForExport.push([
                type, // Insert the type as a group header
                '', '', '', '', '', '', '', '', ''
            ]);
            rows.forEach((row, i) => {
                quotationDataForExport.push([
                    quotationDataForExport.length + 1, // No
                    row[col_his] || '', // HIS code
                    row[col_nhs] || '', // NHS code
                    row[col_lab] || '', // Lab code
                    '', '', '', '', // These will be filled later if needed
                    row[col_remark] || '' // Remark
                ]);
            });
        });
        console.log('Quotation data for export:', quotationDataForExport);
        ws.insertRows(15, quotationDataForExport, 'i+'); // Insert at row 14 to keep headers intact
        // quotationFills = [
        //     ...quotationFills.slice(0, 15), // Ensure fills match the new data length
        //     ...new Array(quotationDataForExport.length).fill(new Array(30).fill(null)), // New rows with no fills
        //     ...quotationFills.slice(15) // Keep existing fills after row 14
        // ]
        // console.log('Quotation fills after adjustment:', quotationFills);


        // // // Apply styles from file1Fills to quotationFills
        // quotationFills.forEach((fills, i) => {
        //     if (fills && fills.length) {
        //         fills.forEach((fill, j) => {
        //             if (fill && fill.fgColor) {
        //                 const cell = ws.getCell(i+1, j+1); // ExcelJS is 1-based
        //                 cell.fill = fill;
        //             }
        //         });
        //     }
        // });
        if (ws.rowCount > 200) {
            ws.spliceRows(201, ws.rowCount - 200);
        }
        // // Set column widths based on template
        // ws.columns.forEach((col, idx) => {
        //     if (col.width) {
        //         col.width = col.width; // Use existing width from template
        //     } else {
        //         col.width = 15; // Default width if not set
        //     }
        // });
        // Write the workbook to a buffer and trigger download
        console.log('Writing workbook to buffer');
        wb_template.xlsx.writeBuffer().then(buf => {
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'quotation.xlsx';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Swal.fire({
                title: 'Quotation Exported',
                text: 'Styles applied where available.',
                icon: 'success',
                customClass: { popup: 'rounded-4' },
                confirmButtonColor: '#3085d6',
                confirmButton: 'OK'
            });
        }).catch(err => {
            console.error('ExcelJS export failed, falling back to SheetJS', err);
            fallbackExport();
        });
    } else {
        fallbackExport();
    }
}

function fallbackExport() {
    if (!templateWorkbook) {
        Swal.fire({
            title: 'Template Missing',
            text: 'Cannot export without template workbook.',
            icon: 'error',
            customClass: { popup: 'rounded-4' },
            confirmButtonColor: '#3085d6',
            confirmButton: 'OK'
        });
        return;
    }
    // Simple SheetJS export without styles
    let worksheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]];
    let newRowData = quotationData.map((row, i) => {
        let emptyColumns = new Array(4).fill('');
        return [
            i + 1,
            row[col_his] || '',
            row[col_nhs] || '',
            row[col_lab] || '',
            ...emptyColumns,
            row[col_remark] || ''
        ];
    });
    const insertRow = 13;
    let ref = 'A1:Z100';
    const range = XLSX.utils.decode_range(ref);
    for (let R = range.e.r; R >= insertRow; --R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const oldCellRef = XLSX.utils.encode_cell({ r: R, c: C });
            const newCellRef = XLSX.utils.encode_cell({ r: R + 1, c: C });
            worksheet[newCellRef] = worksheet[oldCellRef];
        }
    }
    XLSX.utils.sheet_add_aoa(worksheet, newRowData, { origin: insertRow });
    range.e.r++;
    worksheet['!ref'] = XLSX.utils.encode_range(range);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Quotation');
    XLSX.writeFile(wb, 'quotation.xlsx');
    Swal.fire({
        title: 'Quotation Exported',
        text: 'Exported without style preservation.',
        icon: 'success',
        customClass: { popup: 'rounded-4' },
        confirmButtonColor: '#3085d6',
        confirmButton: 'OK'
    });
}