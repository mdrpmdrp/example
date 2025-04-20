// Google Apps Script Web App URL - replace with your actual deployed web app URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqS2yBlpOE7IVtx856bOPAxQ1ZzDk6wMk8PipwH067xmj-bKcOjJb5fBTm_kkz5KDWRg/exec";
// Automatically select the standard room (the only room type)
const RoomOptions = {
    type: "standard",
    price: 1200,
    available: 0 // Will be updated from Google Sheets
};
// Update booking summary immediately to show default selection
document.addEventListener('DOMContentLoaded', function () {
    NProgress.start();
    NProgress.inc()
    // Initialize date pickers
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    moment.locale('th');
    const checkInPicker = flatpickr("#checkInDate", {
        minDate: "today",
        dateFormat: "Y-m-d",
        defaultDate: today,
        locale: "th",
        onChange: function (selectedDates, dateStr) {
            // When check-in date changes, update check-out date minimum
            const nextDay = moment(dateStr, 'YYYY-MM-DD').add(1, 'days').format('YYYY-MM-DD');
            const checkOutDate = checkOutPicker.selectedDates[0];
            // Set minimum check-out date to the day after check-in
            checkOutPicker.set('minDate', nextDay);
            // If current check-out date is before new check-in date, update it
            if (moment(checkOutDate, 'YYYY-MM-DD').isBefore(nextDay)) {
                checkOutPicker.setDate(nextDay);
            }
        }
    });
    const checkOutPicker = flatpickr("#checkOutDate", {
        minDate: tomorrow,
        dateFormat: "Y-m-d",
        defaultDate: tomorrow,
        locale: "th"
    });
    $('#specialRequests').on('input', function () {
        updateBookingSummary();
    });
});
window.addEventListener('load', function () {
    NProgress.done();
});
document.getElementById('roomQuantity').addEventListener('change', function () {
    const selectedRoomQuantity = parseInt(this.value);
    const adultsSelect = document.getElementById('adults');
    const childrenSelect = document.getElementById('children');
    let adult = parseInt(adultsSelect.value);
    let child = parseInt(childrenSelect.value);
    // Clear previous options
    adultsSelect.innerHTML = '';
    childrenSelect.innerHTML = '';
    // Populate adults and children select options based on room quantity
    let maxPerRoom = 2; // Default max adults per room
    for (let i = 0; i <= selectedRoomQuantity * maxPerRoom; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i + ' ' + 'คน'
        childrenSelect.appendChild(option.cloneNode(true));
        if (1 === 0) continue
        adultsSelect.appendChild(option);
    }
    adultsSelect.value = adult < selectedRoomQuantity ? selectedRoomQuantity : (adult > selectedRoomQuantity * maxPerRoom ? selectedRoomQuantity * maxPerRoom : adult);
    childrenSelect.value = child > selectedRoomQuantity * maxPerRoom ? selectedRoomQuantity * maxPerRoom : child;
});
// Handle availability check form submission
document.getElementById('checkAvailabilityForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const checkInDate = $('#checkInDate').val();
    const checkOutDate = $('#checkOutDate').val();
    const roomQuantity = $('#roomQuantity').val();
    if (!checkInDate || !checkOutDate) {
        Swal.fire({
            icon: 'error',
            title: 'กรุณาเลือกวันที่',
            text: 'กรุณาเลือกวันที่เข้าพักและวันที่ออก',
            confirmButtonText: 'ตกลง',
            customClass: { popup: 'rounded-3' }
        });
        return;
    }
    // Show loading state
    Swal.fire({
        icon: 'info',
        title: 'กำลังตรวจสอบห้องว่าง...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        customClass: { popup: 'rounded-3' },
        didOpen: () => {
            Swal.showLoading();
        }
    });
    // Call the Google Apps Script to check availability
    checkAvailability(checkInDate, checkOutDate, roomQuantity);
});
// Function to check availability using Google Apps Script
function checkAvailability(checkInDate, checkOutDate, roomQuantity) {
    // Prepare the data to send to Google Apps Script
    const data = {
        action: 'checkAvailability',
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        roomQuantity: roomQuantity,
    };
    // Make the AJAX request to Google Apps Script
    NProgress.start();
    NProgress.inc()
    $.ajax({
        url: GOOGLE_SCRIPT_URL,
        method: 'GET',
        data: data,
        dataType: 'jsonp',
        success: function (response) {
            Swal.close(); // Close loading dialog
            // Check if the response is valid
            if (response && response.success) {
                // Update available rooms count
                RoomOptions.available = response.availableRooms || 0;
                RoomOptions.price = response.roomPrice || 0;
                RoomOptions.type = response.roomType || 'Standard Room';
                RoomOptions.description = response.roomDescription || 'Standard Room with all amenities';
                if (RoomOptions.available > 0) {
                    // Show availability status
                    $('#available-rooms-count').text(RoomOptions.available);
                    // Show booking form
                    $('#bookingForm').fadeIn(500);
                    // Render room options
                    renderRoomOptions();
                    // Update booking summary
                    updateBookingSummary();
                    // Scroll to booking form
                    $('html, body').animate({
                        scrollTop: $('#bookingForm').offset().top - 20
                    }, 500);
                    // Ensure the availability status is visible after scrolling
                    setTimeout(() => {
                        $('#availability-status').addClass('animate__animated animate__pulse animate__infinite');
                        $('#availability-status').show();
                        setTimeout(() => {
                            $('#availability-status').removeClass('animate__animated animate__pulse animate__infinite');
                        }, 5000);
                    }, 1000);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่มีห้องว่าง',
                        text: 'ขออภัย ไม่มีห้องว่างในช่วงวันที่คุณเลือก',
                        confirmButtonText: 'ตกลง',
                        customClass: { popup: 'rounded-3' }
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: response.message || 'ไม่สามารถตรวจสอบห้องว่างได้ กรุณาลองอีกครั้ง',
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3' }
                });
            }
        },
        error: function () {
            Swal.close(); // Close loading dialog
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองอีกครั้ง',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
        },
        complete: function () {
            NProgress.done();
        }
    });
}
// Update booking summary
function updateBookingSummary() {
    const checkInDate = $('#checkInDate').val();
    const checkOutDate = $('#checkOutDate').val();
    const specialRequests = $('#specialRequests').val();
    const roomQuantity = $('#roomQuantity').val();
    if (!checkInDate || !checkOutDate) {
        return;
    }
    // Calculate number of nights
    const timeDiff = moment(checkOutDate).diff(moment(checkInDate));
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    // Set values in summary
    $('#summaryCheckIn').text(moment(checkInDate).format('YYYY-MM-DD'));
    $('#summaryCheckOut').text(moment(checkOutDate).format('YYYY-MM-DD'));
    $('#summaryNights').text(nights + ' คืน');
    $('#summaryGuests').text(
        $('#adults').val() + ' ผู้ใหญ่, ' +
        $('#children').val() + ' เด็ก'
    );
    $('#summaryRoomQuantity').text(roomQuantity + ' ห้อง');
    $('#summaryPrice').text('฿' + RoomOptions.price.toLocaleString());
    $('#summaryTotal').text('฿' + (RoomOptions.price * nights * roomQuantity).toLocaleString());
    // Update special requests section
    if (specialRequests && specialRequests.trim() !== '') {
        $('#summarySpecialRequest').text(specialRequests);
    } else {
        $('#summarySpecialRequest').text('ไม่มี');
    }
    // Show summary
    $('#bookingSummary').show();
}
// Render room options
function renderRoomOptions() {
    const roomTemplate = $('#roomTemplate')
    const roomContainer = $('#roomOptions');
    // Clear existing room options
    roomContainer.empty();
    let roomCard = roomTemplate.html();
    roomCard = roomCard.replace(/{{roomType}}/g, RoomOptions.type);
    roomCard = roomCard.replace(/{{price}}/g, RoomOptions.price.toLocaleString());
    roomCard = roomCard.replace(/{{available}}/g, RoomOptions.available);
    roomCard = roomCard.replace(/{{image}}/g, "https://img2.pic.in.th/pic/30ba58d5-91ba-44cd-8ee5-1dd666b18703.jpg");
    roomCard = roomCard.replace(/{{description}}/g, RoomOptions.description);
    roomContainer.append(roomCard);
}
// Handle booking form submission
document.getElementById('bookingForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!verifyRecaptcha()) {
        Swal.fire({
            icon: 'error',
            title: 'การยืนยันล้มเหลว',
            text: 'กรุณายืนยันตัวตนด้วย reCAPTCHA',
            confirmButtonText: 'ตกลง',
            customClass: { popup: 'rounded-3' }
        });
        return;
    }
    let stay = moment($('#checkOutDate').val(), 'YYYY-MM-DD').diff(moment($('#checkInDate').val(), 'YYYY-MM-DD'), 'days');
    if (stay < 0) {
        Swal.fire({
            icon: 'error',
            title: 'วันที่ไม่ถูกต้อง',
            text: 'กรุณาเลือกวันที่เข้าพักและวันที่ออกให้ถูกต้อง',
            confirmButtonText: 'ตกลง',
            customClass: { popup: 'rounded-3' }
        });
        return;
    }
    // Show loading state
    Swal.fire({
        title: 'กำลังดำเนินการจอง...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        customClass: { popup: 'rounded-3' },
        didOpen: () => {
            Swal.showLoading();
        }
    });
    const formData = {
        action: 'createBooking',
        checkInDate: $('#checkInDate').val(),
        checkOutDate: $('#checkOutDate').val(),
        adults: $('#adults').val(),
        children: $('#children').val(),
        firstName: $('#firstName').val(),
        lastName: $('#lastName').val(),
        email: $('#email').val(),
        phone: $('#phone').val(),
        specialRequests: $('#specialRequests').val(),
        roomQuantity: $('#roomQuantity').val(),
        roomType: RoomOptions.type,
        roomPrice: RoomOptions.price,
        room_detail: RoomOptions.description,
        stay: stay,
        'g-recaptcha-response': grecaptcha.getResponse(),
        'check-booking-endpoint': location.href.replace('/index.html', '/check-booking.html')
    };
    // Make the AJAX request to Google Apps Script to create the booking
    NProgress.start();
    NProgress.inc()
    $.ajax({
        url: GOOGLE_SCRIPT_URL,
        method: 'POST',
        data: formData,
        success: function (response) {
            Swal.close(); // Close loading dialog
            if (response && response.success) {
                // Show success message with booking ID
                Swal.fire({
                    icon: 'success',
                    title: 'จองสำเร็จ!',
                    html: `
                                <p>หมายเลขการจองของคุณคือ: <strong>${response.bookingId}</strong></p>
                                <p>เราได้ส่งรายละเอียดการจองไปยังอีเมล์ของคุณแล้ว</p>
                            `,
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3' }
                }).then((result) => {
                    // Redirect to check booking page with the booking ID
                    window.location.href = `check-booking.html?id=${response.bookingId}`;
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: response.message || 'ไม่สามารถทำการจองได้ กรุณาลองอีกครั้ง',
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3' }
                });
            }
        },
        error: function () {
            Swal.close(); // Close loading dialog
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองอีกครั้ง',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-3' }
            });
        },
        complete: function () {
            NProgress.done();
        }
    });
});
// Update guest selection
document.getElementById('adults').addEventListener('change', updateBookingSummary);
document.getElementById('children').addEventListener('change', updateBookingSummary);
// Initialize and configure the advertisement carousel
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the carousel with Bootstrap's carousel method
    const adsCarousel = new bootstrap.Carousel(document.getElementById('adsCarousel'), {
        interval: 5000,  // Change slides every 5 seconds
        wrap: true,      // Cycle continuously
        touch: true,     // Allow touch swipe on mobile
        pause: 'hover'   // Pause on mouse hover
    });
});
function verifyRecaptcha() {
    const recaptchaResponse = grecaptcha.getResponse();
    if (recaptchaResponse.length === 0) {
        return false; // reCAPTCHA not verified
    }
    return true; // reCAPTCHA verified
}
function onRecaptchaSuccess(token) {
    $('.btn-book').show();
}
