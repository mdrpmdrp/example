(function () {
    var forms = document.querySelectorAll('.needs-validation')
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    $(form).find(":invalid").first().focus();
                    event.stopPropagation()
                    form.classList.add('was-validated')
                } else {
                    $(form).removeClass('was-validated')
                    onFormSubmit(form)
                }
            }, false)
        })
})()

function onFormSubmit(form) {
    let id = $(form).attr('id')
    if (id == 'demographic-form') {
        demographicFormSubmit()
    } else {
        followupFormSubmit()
    }
}

function demographicFormSubmit() {
    event.preventDefault();
    var form = $('#demographic-form');
    form.submit()

    form[0].reset()
    return false;
}

function followupFormSubmit() {
    event.preventDefault();
    var form = $('#followup-form');
    form.submit()

    form[0].reset()
    return false;
}
