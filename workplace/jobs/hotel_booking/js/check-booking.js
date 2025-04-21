var booking_data
document.addEventListener("DOMContentLoaded", function () {
    AOS.init() 
    NProgress.start();
    NProgress.inc()
});
window.addEventListener("load", function () {
    NProgress.done();
});
$(document).ready(function () {
    moment.locale('th');
    // Google Apps Script URL - Replace with your actual deployed script URL
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqS2yBlpOE7IVtx856bOPAxQ1ZzDk6wMk8PipwH067xmj-bKcOjJb5fBTm_kkz5KDWRg/exec";
    // Handle search form submission
    $('#searchForm').on('submit', function (e) {
        e.preventDefault();
        const email = $('#email').val().trim();
        if (!email) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกอีเมล',
                text: 'โปรดกรอกอีเมลที่ใช้ในการจอง',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
            return;
        }
        $('#noResults').hide();
        $('#bookingsList').hide();
        $('#bookingDetails').hide();
        // Show loading message
        Swal.fire({
            title: 'กำลังค้นหา...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            customClass: { popup: 'rounded-3' },
            didOpen: () => {
                Swal.showLoading();
            }
        });
        // Prepare data to send to Google Script
        const data = {
            action: 'searchBookingByEmail',
            email: email
        };
        // Send request to Google Script
        NProgress.start();
        NProgress.inc();
        $.ajax({
            url: GOOGLE_SCRIPT_URL,
            type: 'GET',
            data: data,
            dataType: 'jsonp',
            success: function (response) {
                Swal.close(); // Close loading dialog
                if (response && response.success && response.data && response.data.length > 0) {
                    booking_data = response.data;
                    displayBookingsList();
                } else {
                    showNoResults();
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบข้อมูลการจอง',
                        text: 'ไม่พบข้อมูลการจองที่ตรงกับอีเมลที่คุณระบุ',
                        confirmButtonText: 'ตกลง',
                        customClass: { popup: 'rounded-3' }
                    });
                }
            },
            error: function () {
                NProgress.done();
                Swal.close(); // Close loading dialog
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3' }
                });
            },
            complete: function () {
                NProgress.done();
            }
        });
    });
    // Handle search again button
    $('#searchAgain').on('click', function () {
        $('#email').val('').focus();
        $('#noResults').fadeOut(300);
    });
    // Handle print button
    $('#printButton').on('click', function () {
        // Prepare print-friendly version
        prepareForPrinting();
        // Print
        window.print();
        // Restore after printing
        setTimeout(restoreAfterPrinting, 500);
    });
    // Function to prepare the page for printing
    function prepareForPrinting() {
        // Create print-only header if it doesn't exist
        if ($('#printHeader').length === 0) {
            $('body').prepend(`
                <div id="printHeader" class="d-none">
                    <div class="text-center py-2">
                        <img src="https://img5.pic.in.th/file/secure-sv1/Asset-4f4db280d314ea126.png" alt="Hotel Logo" style="width: 60px; height: 60px;">
                        <h2 class="mt-2 mb-0">รายละเอียดการจองห้องพัก</h2>
                        <p class="small mb-0">${moment().format('YYYY-MM-DD')}</p>
                    </div>
                </div>
            `);
        }
        // Show print header and hide unneeded elements
        $('#printHeader').removeClass('d-none');
        // Create or update compact print layout
        if ($('#printLayout').length === 0) {
            let bookingStatus = $('#bookingStatus').text();
            let statusClass = '';
            if ($('#bookingStatus').hasClass('status-confirmed')) {
                statusClass = 'text-success';
            } else if ($('#bookingStatus').hasClass('status-pending')) {
                statusClass = 'text-warning';
            } else if ($('#bookingStatus').hasClass('status-cancelled')) {
                statusClass = 'text-danger';
            }
            let printContent = `
                <div id="printLayout" class="d-none">
                    <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px; text-align: center;">
                        <p style="margin: 0; font-weight: bold;">โปรดแสดงหมายเลขการจอง: ${$('#displayBookingId').text()} เมื่อเช็คอิน</p>
                        <p style="margin: 0; font-size: 9pt;">พิมพ์เมื่อ: ${moment().format('DD/MM/YYYY HH:mm:ss')}</p>
                    </div>
                </div>
            `;
            $('body').append(printContent);
        } else {
            // Update existing print layout with current data
            $('#printLayout #printBookingId').text($('#displayBookingId').text());
        }
        // Show print layout
        $('#printLayout').removeClass('d-none');
    }
    // Function to restore the page after printing
    function restoreAfterPrinting() {
        // Hide print-specific elements
        $('#printHeader').addClass('d-none');
        $('#printLayout').addClass('d-none');
    }
    // Handle back to list button
    $('#backToListButton').on('click', function () {
        $('#bookingDetails').hide();
        $('#bookingsList').fadeIn(500);
        $('html, body').animate({
            scrollTop: $('#bookingsList').offset().top - 20
        }, 500);
    });
    // Handle cancel booking button
    $('#cancelBookingButton').on('click', function () {
        // Get the current booking ID and check-in date
        const bookingId = $('#displayBookingId').text();
        const checkInDate = moment($('#checkIn').text(), 'YYYY-MM-DD');
        const today = moment();
        // Check if already cancelled
        if ($('#bookingStatus').hasClass('status-cancelled')) {
            Swal.fire({
                icon: 'info',
                title: 'การจองถูกยกเลิกแล้ว',
                text: 'การจองนี้ได้ถูกยกเลิกไปแล้ว',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
            return;
        }
        // Check if at least 1 day before check-in
        const daysDiff = checkInDate.get('dayOfYear') - today.get('dayOfYear');
        if (daysDiff < 1) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถยกเลิกได้',
                text: 'ต้องยกเลิกการจองล่วงหน้าอย่างน้อย 1 วันก่อนวันเช็คอิน',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
            return;
        }
        // Check if check-in date has passed
        if (!checkInDate.isValid() || checkInDate.get('dayOfYear') < today.get('dayOfYear')) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถยกเลิกได้',
                text: 'ไม่สามารถยกเลิกการจองที่ผ่านวันเช็คอินไปแล้ว',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
            return;
        }
        // Confirm cancellation
        Swal.fire({
            icon: 'warning',
            title: 'ยืนยันการยกเลิก?',
            html: `
                <p>คุณต้องการยกเลิกการจองหมายเลข <strong>${bookingId}</strong> ใช่หรือไม่?</p>
                <p>การยกเลิกการจองไม่สามารถเปลี่ยนแปลงได้</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการยกเลิก',
            cancelButtonText: 'ไม่ยกเลิก',
            confirmButtonColor: '#dc3545',
            customClass: { popup: 'rounded-3' }
        }).then((result) => {
            if (result.isConfirmed) {
                cancelBooking(bookingId);
            }
        });
    });
    // Function to cancel booking
    function cancelBooking(bookingId) {
        // Show loading
        Swal.fire({
            title: 'กำลังยกเลิกการจอง...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            customClass: { popup: 'rounded-3' },
            didOpen: () => {
                Swal.showLoading();
            }
        });
        // Send cancel request to Google Script
        const data = {
            action: 'cancelBooking',
            bookingId: bookingId
        };
        NProgress.start();
        NProgress.inc();
        $.ajax({
            url: GOOGLE_SCRIPT_URL,
            type: 'POST',
            data: data,
            success: function (response) {
                Swal.close();
                if (response && response.success) {
                    // Update UI to show cancelled status
                    $('#bookingStatus').removeClass('status-confirmed status-pending')
                        .addClass('status-cancelled')
                        .text('ยกเลิกแล้ว');
                    // Show success message
                    Swal.fire({
                        icon: 'success',
                        title: 'ยกเลิกการจองสำเร็จ',
                        text: 'การจองของคุณได้ถูกยกเลิกเรียบร้อยแล้ว',
                        confirmButtonText: 'ตกลง',
                        customClass: { popup: 'rounded-3' }
                    });
                    let bookings = JSON.parse(JSON.stringify(booking_data));
                    booking = bookings.find(b => b.bookingId === bookingId);
                    if (booking) {
                        booking.status = 'cancelled';
                    }
                    booking_data = JSON.parse(JSON.stringify(bookings));
                    $('#bookingDetails').hide();
                    $('#bookingsList').fadeIn(500);
                    $('#bookingsContainer').empty();
                    $('#noResults').hide();
                    displayBookingsList();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        text: response.message || 'ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่อีกครั้ง',
                        confirmButtonText: 'ตกลง',
                        customClass: { popup: 'rounded-3' }
                    });
                }
            },
            error: function () {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3' }
                });
            },
            complete: function () {
                NProgress.done();
            }
        });
    }
    // Function to display bookings list
    function displayBookingsList() {
        let bookings = JSON.parse(JSON.stringify(booking_data));
        if (bookings.length === 0) {
            showNoResults();
            return;
        }
        $('#noResults').hide();
        $('#bookingsList').fadeIn(500);
        $('#bookingsContainer').empty();
        // Group bookings by status
        const groupedBookings = {
            confirmed: [],
            pending: [],
            cancelled: [],
            history: []
        };
        // Categorize bookings by status
        bookings.forEach(booking => {
            const checkInDate = moment(booking.checkInDate);
            const today = moment();
            const isPastBooking = checkInDate.isBefore(today, 'day');
            if (isPastBooking) {
                groupedBookings.history.push(booking);
            } else {
                groupedBookings[booking.status.toLowerCase()].push(booking);
            }
        });
        groupedBookings.confirmed.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        groupedBookings.pending.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        groupedBookings.cancelled.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        groupedBookings.history.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        // Display status groups in desired order
        if (groupedBookings.pending.length > 0) {
            appendBookingGroup('รอการยืนยัน', 'text-warning', groupedBookings.pending);
        }
        if (groupedBookings.confirmed.length > 0) {
            appendBookingGroup('ยืนยันแล้ว', 'text-success', groupedBookings.confirmed);
        }
        if (groupedBookings.cancelled.length > 0) {
            appendBookingGroup('ยกเลิกแล้ว', 'text-danger', groupedBookings.cancelled);
        }
        if (groupedBookings.history.length > 0) {
            appendBookingGroup('ประวัติการจอง', 'text-secondary', groupedBookings.history);
        }
        $('html, body').animate({
            scrollTop: $('#bookingsList').offset().top - 20
        }, 500);
    }
    // Function to append a group of bookings with header
    let booking_count = 1
    function appendBookingGroup(groupTitle, titleClass, bookings) {
        // Create unique ID for this group
        const groupId = `booking-group-${titleClass.replace('text-', '')}`;
        // Add group header with collapse functionality
        $('#bookingsContainer').append(`
            <div class="col-12">
                <div class="d-flex align-items-center mb-2 mt-3 group-header cursor-pointer" 
                     data-bs-toggle="collapse" data-bs-target="#${groupId}" aria-expanded="true">
                    <div class=" me-2 ${titleClass.replace('text-', 'bg-')}" 
                         style="width: 5px; height: 24px; border-radius: 3px;"></div>
                    <h4 class="mb-0 ${titleClass}">${groupTitle}</h4>
                    <span class="ms-2 badge ${titleClass.replace('text-', 'bg-')} rounded-pill">${bookings.length}</span>
                    <i class="bi bi-chevron-down ms-auto"></i>
                </div>
            </div>
            <div class="col-12 collapse ${$('.group-header').length == 0 ? 'show' : ''}" id="${groupId}">
                <div class="d-flex">
                    <div class=" me-2 ${titleClass.replace('text-', 'bg-')}" 
                        style="width: 5px; border-radius: 3px;"></div>
                    <div class="row booking-items w-100"></div>
                </div>
            </div>
            <div class="col-12 mt-3">
                <hr>
            </div>
        `);
        // Add bookings for this group
        
        bookings.forEach(booking => {
            const bookingElement = $(document.importNode($('#bookingCardTemplate').get(0).content, true));
            bookingElement.attr('id', `booking-${booking.bookingId}`);
          
            
            // Set booking ID and created date
            bookingElement.find('.booking-id').text(booking.bookingId);
            bookingElement.find('.created-date').text(moment(booking.createdAt).format('YYYY-MM-DD'));
            // Set check-in date as header
            const checkInDate = moment(booking.checkInDate);
            bookingElement.find('.check-in-header').text(checkInDate.format('YYYY-MM-DD'));
            // Set status with color indicator
            const statusElement = bookingElement.find('.booking-status');
            const statusIndicator = bookingElement.find('.booking-status-indicator');
            statusIndicator.removeClass('bg-success bg-warning bg-danger');
            statusElement.removeClass('bg-success bg-warning bg-danger text-white');
            booking.status = booking.status.toLowerCase();
            if (booking.status === 'confirmed') {
                statusElement.text('ยืนยันแล้ว')
                statusIndicator.addClass('bg-success').css({ 'width': '10px', 'height': '40px', 'border-radius': '3px' });
            } else if (booking.status === 'pending') {
                statusElement.text('รอการยืนยัน')
                statusIndicator.addClass('bg-warning').css({ 'width': '10px', 'height': '40px', 'border-radius': '3px' });
            } else if (booking.status === 'cancelled') {
                statusElement.text('ยกเลิกแล้ว')
                statusIndicator.addClass('bg-danger').css({ 'width': '10px', 'height': '40px', 'border-radius': '3px' });
            }
            const checkOutDate = moment(booking.checkOutDate);
            const nights = checkOutDate.get('dayOfYear') - checkInDate.get('dayOfYear');
            // Fill card body information
            const cardBody = bookingElement.find('.card-body');
            booking.totalPrice = booking.pricePerNight.split('\n').map(room => parseInt(room.split(':')[1].trim())).reduce((a, b) => a + b, 0) * booking.roomQuantity
            cardBody.html(`
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-calendar-check text-primary me-2 fs-5"></i>
                            <div>
                                <small class="text-muted d-block">วันที่เข้าพัก</small>
                                <strong>${checkInDate.format('YYYY-MM-DD')}</strong>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-calendar-x text-danger me-2 fs-5"></i> 
                            <div>
                                <small class="text-muted d-block">วันที่ออก</small>
                                <strong>${checkOutDate.format('YYYY-MM-DD')}</strong>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-moon-stars text-info me-2 fs-5"></i>
                            <div>
                                <small class="text-muted d-block">จำนวนคืน</small>
                                <strong>${nights} คืน</strong> 
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-people text-success me-2 fs-5"></i>
                            <div>
                                <small class="text-muted d-block">ผู้เข้าพัก</small>
                                <strong>${booking.adults} ผู้ใหญ่${booking.children > 0 ? ', ' + booking.children + ' เด็ก' : ''}</strong>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-buildings text-secondary me-2 fs-5"></i>
                            <div>
                                <small class="text-muted d-block">จำนวนห้อง</small>
                                <strong>${booking.roomQuantity} ห้อง</strong>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-cash-stack text-success me-2 fs-5"></i>
                            <div>
                                <small class="text-muted d-block">ราคารวม</small>
                                <strong class="text-danger fw-bold">฿${booking.totalPrice.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-3 text-end">
                    <button class="btn btn-sm btn-search view-details-btn rounded-pill px-3">
                        <i class="bi bi-eye me-1 text-light"></i> ดูรายละเอียด
                    </button>
                </div>
            `);
            // Add event handler for view details button
            bookingElement.find('.view-details-btn').on('click', function () {
                displayBookingDetails(booking);
            });
            $(`#${groupId} .booking-items`).append(bookingElement);
        });
        $(`#${groupId} .booking-items .col-md-12`).each((index, element) => {
            console.log(index, element);
            if(index % 2 === 0) {
                $(element).attr('data-aos', 'fade-right');
            }else{
                $(element).attr('data-aos', 'fade-left');
            }
        })
        // Add event listener for group header icon rotation
        $(`.group-header[data-bs-target="#${groupId}"]`).on('click', function () {
            const icon = $(this).find('i.bi');
            if ($(this).attr('aria-expanded') === 'true') {
                icon.removeClass('bi-chevron-down').addClass('bi-chevron-right');
                $(this).attr('aria-expanded', 'false');
            } else {
                icon.removeClass('bi-chevron-right').addClass('bi-chevron-down');
                $(this).attr('aria-expanded', 'true');
            }
        });
    }
    // Function to display booking details
    function displayBookingDetails(booking) {
        $('#bookingsList').hide();
        $('#bookingDetails').fadeIn(500);
        $('#displayBookingId').text(booking.bookingId);
        $('#guestName').text(`${booking.firstName} ${booking.lastName}`);
        const statusElement = $('#bookingStatus');
        statusElement.removeClass('status-confirmed status-pending status-cancelled');
        if (booking.status === 'confirmed') {
            statusElement.text('ยืนยันแล้ว').addClass('status-confirmed');
        } else if (booking.status === 'pending') {
            statusElement.text('รอการยืนยัน').addClass('status-pending');
        } else if (booking.status === 'cancelled') {
            statusElement.text('ยกเลิกแล้ว').addClass('status-cancelled');
        }
        const checkInDate = moment(booking.checkInDate);
        const checkOutDate = moment(booking.checkOutDate);
        const nights = checkOutDate.get('dayOfYear') - checkInDate.get('dayOfYear');
        $('#checkIn').text(checkInDate.format('YYYY-MM-DD'));
        $('#checkOut').text(checkOutDate.format('YYYY-MM-DD'));
        $('#nights').text(nights + ' คืน');
        let guestsText = `${booking.adults} ผู้ใหญ่`;
        if (booking.children > 0) {
            guestsText += `, ${booking.children} เด็ก`;
        }
        $('#guests').text(guestsText);
        $('#roomType').text(booking.roomType || 'Standard');
        $('#pricePerNight').html(booking.pricePerNight.split('\n').map(room => room.split(':')).map(e =>{
            let date = moment(e[0].trim(), 'YYYY-MM-DD').format('YYYY-MM-DD');
            let price = e[1].trim().replace('฿', '').replace(',', '');
            return `<li class="list-group-item"><div class="d-flex justify-content-between"><span>${date}</span><span>฿${Number(price).toLocaleString()}</span></div></li>`;
        }).join(''))
        $('#roomQuantity').text(booking.roomQuantity + ' ห้อง');
        $('#totalPrice').text(`฿${parseInt(booking.totalPrice).toLocaleString()}`);
        $('#email').text(booking.email);
        $('#phone').text(booking.phone);
        $('#specialRequests').text(booking.specialRequests && booking.specialRequests.trim() !== '' ?
            booking.specialRequests : 'ไม่มี');
        if (booking.status === 'cancelled') {
            $('#cancelBookingButton').hide();
        } else {
            $('#cancelBookingButton').show();
        }
        $('html, body').animate({
            scrollTop: $('#bookingDetails').offset().top - 20
        }, 500);
    }
    // Function to show no results message
    function showNoResults() {
        $('#bookingsList').hide();
        $('#bookingDetails').hide();
        $('#noResults').fadeIn(500);
        $('html, body').animate({
            scrollTop: $('#noResults').offset().top - 20
        }, 500);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('s');
    if (emailParam) {
        $('#email').val(emailParam);
        $('#searchForm').submit();
    }
});