; (function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const LIFF_ID = '1655873446-MpmBPPzl'
  const LANGUAGE_KEY = 'erawan-interfood-language'
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzvS3ejPR7NYSniz8EeNpmMflKCOGhAkZlB6ccriWMLd4Mr5JqTyJVjUQyQ8q3rTyE/exec'
  const REQUEST_TIMEOUT_MS = 30000
  const THAI_YEAR_OFFSET = 543

  const UPLOAD_DEFINITIONS = {
    th: {
      thaiPhoto: { label: 'รูปถ่าย' },
      thaiIdCard: { label: 'สำเนาบัตรประชาชน' },
      thaiHousehold: { label: 'สำเนาทะเบียนบ้าน' },
      thaiEducationCert: { label: 'ใบวุฒิการศึกษา' },
      thaiWorkCert: { label: 'หนังสือรับรองการทำงานเกี่ยวข้องกับประสบการณ์ที่ทำมา' },
    },
    my: {
      myPhoto: { label: 'ဓာတ်ပုံ', labelTh: 'รูปถ่าย' },
      myPassport: { label: 'နိုင်ငံကူးလက်မှတ်', labelTh: 'หนังสือเดินทาง' },
      myPinkCard: { label: 'ပန်းရောင် မှတ်ပုံတင်ကတ် / အလုပ်သမားလက်မှတ်', labelTh: 'บัตรสีชมพู / บัตรแรงงาน' },
    },
  }

  const UPLOAD_FIELD_KEYS = {
    th: Object.keys(UPLOAD_DEFINITIONS.th),
    my: Object.keys(UPLOAD_DEFINITIONS.my),
  }

  const FLEX_THEME = {
    header: '#1c2e77',
    headerSoft: '#dbe4ff',
    bodyText: '#0f172a',
    mutedText: '#5b6788',
  }

  const state = {
    lang: null,
    liffReady: false,
    userId: '',
    displayName: '',
    pictureUrl: '',
    uploadAuth: null,
    uploads: {},
    uploadRenderFrame: 0,
    uploadRenderQueue: new Set(),
    isSubmitting: false,
    submissionResult: null,
  }

  const appText = {
    th: {
      title: 'ใบสมัคร บริษัท เอราวัณอินเตอร์ฟู้ด จำกัด',
      subtitle: 'กรอกข้อมูลให้ครบถ้วน',
      back: 'กลับหน้าเลือกสัญชาติ / နိုင်ငံသားရွေးချယ်ရန်',
      status: 'สัญชาติไทย',
      save: 'บันทึกใบสมัคร',
      saving: 'กำลังบันทึก...',
      clear: 'ล้างไฟล์ทั้งหมด',
      userId: 'UserID ของ LIFF',
      fileNote: 'อัปโหลดไฟล์แนบแต่ละรายการให้ครบถ้วน',
      intro: 'ข้อมูลใบสมัครของท่านจะถูกตรวจสอบโดยเจ้าหน้าที่',
      section: 'ข้อมูลผู้สมัคร',
      uploadSection: 'เอกสารแนบ',
      otherLabel: 'อื่นๆ โปรดระบุ',
      idCardNumber: 'เลขบัตรประชาชน',
      dobHint: 'เลือกวันเกิดเป็น พ.ศ.',
      commonRequired: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ',
      uploadPending: 'ยังมีไฟล์ที่กำลังอัปโหลดอยู่ กรุณารอให้เสร็จก่อน',
      uploadError: 'มีไฟล์อัปโหลดไม่สำเร็จ กรุณาลบหรืออัปโหลดใหม่',
      saveOk: 'บันทึกใบสมัครเรียบร้อย',
      saveErr: 'บันทึกไม่สำเร็จ',
      successTitle: 'บันทึกเรียบร้อย',
      successDesc: 'ระบบบันทึกใบสมัครของคุณแล้ว',
      successNote: 'เก็บเลขที่สมัครนี้ไว้สำหรับอ้างอิง',
      applicationId: 'เลขที่สมัคร',
      uploadAuthErr: 'ยังไม่ได้ตั้งค่า Google Apps Script backend',
      replacePrompt: 'ไฟล์นี้มีอยู่แล้ว ต้องการแทนที่หรือไม่',
      confirmDelete: 'ต้องการลบไฟล์แนบหรือไม่',
      confirmDeleteAll: 'ต้องการลบไฟล์แนบทั้งหมดหรือไม่',
      deletingFile: 'กำลังลบไฟล์...',
      deletedFile: 'ลบไฟล์แล้ว',
      deletingFiles: 'กำลังลบไฟล์ทั้งหมด...',
      deletedFiles: 'ลบไฟล์ทั้งหมดแล้ว',
      loadingUpload: 'กำลังอัปโหลด',
      uploaded: 'อัปโหลดแล้ว',
      uploadReady: 'พร้อมอัปโหลด',
      uploadFailed: 'ผิดพลาด',
      saveConfirm: 'ยืนยันการบันทึกใบสมัคร',
      saveConfirmDesc: 'เมื่อบันทึกแล้วจะไม่สามารถแก้ไขข้อมูลได้อีก',
      saveConfirmBtn: 'ยืนยันบันทึก',
      saveCancelBtn: 'ยกเลิก',
      saveInprogress: 'กำลังบันทึกใบสมัคร กรุณารอสักครู่...',
      saveInprogressDesc: 'หากปิดหน้าต่างนี้ก่อนบันทึกเสร็จ ข้อมูลอาจไม่ถูกบันทึก กรุณารอสักครู่',
    },
    my: {
      title: 'Erawaninterfood co.,LTD',
      subtitle: 'ဖြည့်စွက်ပြီးလျှင် ဖောင်ကို သိမ်းဆည်းပါ',
      back: 'ပြန်သွားရန် / ဘာသာရွေးရန်',
      status: 'မြန်မာ',
      save: 'ဖောင်တင်မည်',
      saving: 'သိမ်းဆည်းနေသည်...',
      clear: 'ဖိုင်အားလုံး ဖျက်မည်',
      userId: 'LIFF အသုံးပြုသူ ID',
      fileNote: 'လိုအပ်သောဖိုင်များကို အပ်လုဒ်လုပ်ပါ',
      intro: 'ဖောင်အချက်အလက်နှင့် ဖိုင်များကို LIFF အသုံးပြုသူ ID ဖြင့် Google Sheets ထဲသို့ သိမ်းမည်',
      section: 'လျှောက်ထားသူအချက်အလက်',
      uploadSection: 'စာရွက်စာတမ်းများ',
      otherLabel: 'အခြား (ဖြည့်ပါ)',
      idCardNumber: 'ကတ်နံပါတ် / Passport နံပါတ်',
      dobHint: '',
      commonRequired: 'ကြယ်ပွင့် (*) ပါသော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်ပါ',
      uploadPending: 'ဖိုင်အချို့ကို အပ်လုဒ်လုပ်နေဆဲဖြစ်ပါတယ်။ စောင့်ပေးပါ',
      uploadError: 'ဖိုင်အပ်လုဒ် မအောင်မြင်ပါ။ ဖျက်ပြီး ထပ်မံအပ်လုဒ်လုပ်ပါ',
      saveOk: 'ဖောင်ကို အောင်မြင်စွာ သိမ်းပြီးပါပြီ',
      saveErr: 'သိမ်းဆည်းမှု မအောင်မြင်ပါ',
      successTitle: 'အောင်မြင်စွာ သိမ်းပြီးပါပြီ',
      successDesc: 'သင့်လျှောက်လွှာကို စနစ်ထဲသို့ သိမ်းပြီးပါပြီ',
      successNote: 'ကိုးကားရန်အတွက် လျှောက်လွှာနံပါတ်ကို သိမ်းထားပါ',
      applicationId: 'လျှောက်လွှာနံပါတ်',
      uploadAuthErr: 'Google Apps Script backend ကို မချိတ်ဆက်ရသေးပါ',
      replacePrompt: 'ဒီဖိုင်ရှိပြီးသားဖြစ်ပါတယ်။ အစားထိုးမလား',
      confirmDelete: 'ဖိုင်ကို ဖျက်မည်လား',
      confirmDeleteAll: 'ဖိုင်အားလုံးကို ဖျက်မည်လား',
      deletingFile: 'ဖိုင် ဖျက်နေသည်...',
      deletedFile: 'ဖိုင် ဖျက်ပြီးပါပြီ',
      deletingFiles: 'ဖိုင်အားလုံး ဖျက်နေသည်...',
      deletedFiles: 'ဖိုင်အားလုံး ဖျက်ပြီးပါပြီ',
      loadingUpload: 'အပ်လုဒ်လုပ်နေသည်',
      uploaded: 'အပ်လုဒ်ပြီးပြီ',
      uploadReady: 'အပ်လုဒ်လုပ်ရန် အဆင်သင့်',
      uploadFailed: 'အပ်လုဒ် မအောင်မြင်ပါ',
      saveConfirm: 'ဖောင်တင်မည်လား',
      saveConfirmDesc: 'တင်ပြီးနောက် အချက်အလက်များကို ပြန်ပြင်၍ မရတော့ပါ',
      saveConfirmBtn: 'ဖောင်တင်မည်',
      saveCancelBtn: 'မတင်တော့ပါ',
      saveInprogress: 'ဖောင်ကို သိမ်းနေဆဲဖြစ်ပါတယ်။ စောင့်ပေးပါ',
      saveInprogressDesc: 'သိမ်းခြင်း မပြီးမချင်း ဤဝင်းဒိုးကို မပိတ်ပါနှင့်',
    },
  }

  const thaiEducationOptions = [
    { value: 'ป.3', label: 'ป.3' },
    { value: 'ป.6', label: 'ป.6' },
    { value: 'ม.3', label: 'ม.3' },
    { value: 'ม.6', label: 'ม.6' },
    { value: 'ปวช.', label: 'ปวช.' },
    { value: 'ปวส.', label: 'ปวส.' },
    { value: 'ปริญญาตรี', label: 'ปริญญาตรี' },
    { value: 'other', label: 'อื่นๆ' },
  ]

  const thaiExperienceOptions = [
    { value: '', label: 'เลือกประสบการณ์ทำงาน' },
    { value: 'ไม่มีประสบการณ์', label: 'ไม่มีประสบการณ์' },
    { value: 'น้อยกว่า 1 ปี', label: 'น้อยกว่า 1 ปี' },
    { value: '1-3 ปี', label: '1-3 ปี' },
    { value: '3-5 ปี', label: '3-5 ปี' },
    { value: 'มากกว่า 5 ปี', label: 'มากกว่า 5 ปี' },
  ]

  const thaiPositionOptions = [
    { value: 'ฝ่ายผลิต', label: 'ฝ่ายผลิต' },
    { value: 'ฝ่ายบัญชีการเงิน', label: 'ฝ่ายบัญชีการเงิน' },
    { value: 'ฝ่ายทรัพยากรบุคคล', label: 'ฝ่ายทรัพยากรบุคคล' },
    { value: 'QC', label: 'QC' },
    { value: 'QA', label: 'QA' },
    { value: 'ช่างแม่พิมพ์/ช่างตั้งเครื่อง', label: 'ช่างแม่พิมพ์/ช่างตั้งเครื่อง' },
    { value: 'ช่างซ่อมบำรุงทางกายภาพ (ออนไลน์)', label: 'ช่างซ่อมบำรุงทางกายภาพ (ออนไลน์)' },
    { value: 'ช่างซ่อมบำรุงทางกายภาพ (ออฟไลน์/ประจำโรงงาน)', label: 'ช่างซ่อมบำรุงทางกายภาพ (ออฟไลน์/ประจำโรงงาน)' },
    { value: 'other', label: 'อื่นๆ' },
  ]

  const thaiYesNo = [
    { value: 'ได้', label: 'ได้' },
    { value: 'ไม่ได้', label: 'ไม่ได้' },
  ]

  const myGenderOptions = [
    { value: 'ကျား', label: 'ကျား' },
    { value: 'မိန်းမ', label: 'မိန်းမ' },
    { value: 'other', label: 'အခြား:' },
  ]

  const myShiftOptions = [
    { value: 'ရပါတယ်', label: 'ရပါတယ်' },
    { value: 'မရပါဘူး', label: 'မရပါဘူး' },
  ]

  let heroTitleResizeObserver = null
  let heroTitleFitFrame = 0

  document.addEventListener('DOMContentLoaded', bootstrap)

  async function bootstrap() {
    const root = document.getElementById('app')
    if (!root) return

    state.lang = resolveLanguage()
    document.documentElement.lang = state.lang === 'my' ? 'my' : 'th'

    renderApp()
    bindGlobalEvents()
    void warmUploadAuth()

    try {
      await initLiffSession()
    } catch (error) {
      console.warn('LIFF init failed:', error)
    }

    window.addEventListener('resize', scheduleHeroTitleFit, { passive: true })
    window.initApp()
  }

  function resolveLanguage() {
    return null
  }

  function renderApp() {
    const root = document.getElementById('app')
    const copy = state.lang ? appText[state.lang] : null
    const headerAccent = state.lang === 'my' ? 'မြန်မာ' : state.lang === 'th' ? 'สัญชาติไทย' : 'Application'
    const heroTitle = state.lang === 'my'
      ? 'Erawan Interfood ဖောင်လျှောက်လွှာ'
      : 'ใบสมัคร บริษัท เอราวัณอินเตอร์ฟู้ด จำกัด'
    const heroCopy = state.lang === 'my'
      ? 'အောက်ပါဖောင်ကို ဖြည့်စွက်ပြီး ဆက်လက်လုပ်ဆောင်ပါ'
      : 'กรุณากรอกข้อมูลในแบบฟอร์มให้ครบถ้วน'
    const appLogoUrl = 'https://drive.google.com/thumbnail?id=10nWcbPfta83dLZjPN7NE5a6NFo0VlO6G&sz=w512'
    const splashMarkup = state.liffReady
      ? ''
      : `
        <div class="liff-splash" role="status" aria-live="polite" aria-busy="true">
          <div class="liff-splash__card">
            <img class="liff-splash__logo" src="${escapeAttribute(appLogoUrl)}" alt="Erawan Interfood logo" />
            <div class="liff-splash__ring" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <h2 class="liff-splash__title">Erawan Interfood</h2>
          </div>
        </div>
      `
    const formMarkup = state.lang && state.liffReady
      ? `
        <div id="form-section" class="form-shell p-4 sm:p-6">
          <div class="flex flex-col gap-2">
            <p class="status-pill w-fit" data-tone="cool">${state.lang === 'th' ? 'ฟอร์มสัญชาติไทย' : 'မြန်မာဖောင်'}</p>
            <h3 class="section-title">${state.lang === 'th' ? 'กรอกข้อมูลการสมัคร' : 'လျှောက်လွှာအချက်အလက် ဖြည့်ရန်'}</h3>
            <p class="help-text">${state.lang === 'th' ? 'กรอกข้อมูลและอัปโหลดไฟล์ให้ครบก่อนกดบันทึก' : 'အချက်အလက်နှင့် ဖိုင်များကို ပြည့်စုံစွာ ဖြည့်ပြီး သိမ်းပါ'}</p>
          </div>
          <div class="mt-4 flex justify-start">
            <button type="button" data-back-language class="btn-secondary">
              ${state.lang === 'th' ? appText.th.back : appText.my.back}
            </button>
          </div>
          <form id="application-form" class="mt-5 grid gap-6" novalidate>
            ${state.lang === 'th' ? renderThaiForm(copy || appText.th) : renderMyanmarForm(copy || appText.my)}
            <div class="field-card p-4 sm:p-6">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="section-title">${state.lang === 'th' ? 'เอกสารแนบ' : 'စာရွက်စာတမ်းများ'}</p>
                  <p class="help-text">${state.lang === 'th' ? 'อัปโหลดไฟล์แนบแต่ละรายการ ให้ครบถ้วน' : 'လိုအပ်သောဖိုင်များကို အပ်လုဒ်လုပ်ပါ'}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" id="clear-all-files" class="btn-danger">${state.lang === 'th' ? 'ล้างไฟล์ทั้งหมด' : 'ဖိုင်အားလုံးဖົກມညີ'}</button>
                </div>
              </div>
              <div class="mt-5 grid gap-4">
                ${renderUploadField({
                  key: state.lang === 'th' ? 'thaiPhoto' : 'myPhoto',
                  label: state.lang === 'th' ? 'รูปถ่าย' : 'ဓာတ်ပုံ',
                  labelSecondary: state.lang === 'th' ? '' : 'รูปถ่าย',
                  accept: 'image/*',
                })}
                ${state.lang === 'th'
        ? `
                    ${renderUploadField({ key: 'thaiIdCard', label: 'สำเนาบัตรประชาชน', accept: 'image/*,application/pdf' })}
                    ${renderUploadField({ key: 'thaiHousehold', label: 'สำเนาทะเบียนบ้าน', accept: 'image/*,application/pdf' })}
                    ${renderUploadField({ key: 'thaiEducationCert', label: 'ใบวุฒิการศึกษา', accept: 'image/*,application/pdf' })}
                    ${renderUploadField({ key: 'thaiWorkCert', label: 'หนังสือรับรองการทำงานเกี่ยวข้องกับประสบการณ์ที่ทำมา', accept: 'image/*,application/pdf' })}
                  `
        : `
                    ${renderUploadField({ key: 'myPassport', label: 'နိုင်ငံကူးလက်မှတ်', labelSecondary: 'หนังสือเดินทาง', accept: 'image/*,application/pdf' })}
                    ${renderUploadField({ key: 'myPinkCard', label: 'ပန်းရောင် မှတ်ပုံတင်ကတ် / အလုပ်သမားလက်မှတ်', labelSecondary: 'บัตรสีชมพู / บัตรแรงงาน', accept: 'image/*,application/pdf' })}
                  `}
              </div>
            </div>
              <div class="flex justify-end">
                <button type="submit" id="submit-btn" class="btn-primary">${state.lang === 'th' ? 'บันทึกใบสมัคร' : 'ဖောင်တင်မည်'}</button>
              </div>
          </form>
        </div>
      `
      : ''
    const bodyMarkup = state.lang && state.liffReady
      ? (state.submissionResult ? renderSuccessSection(copy || appText.th) : formMarkup)
      : ''
    root.innerHTML = `
      <main class="app-frame">
        <div class="app-card overflow-hidden">
          <div class="hero-panel px-5 py-5 sm:px-6">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <div class="app-brand">
                  <img class="app-brand__logo" src="${escapeAttribute(appLogoUrl)}" alt="Erawan Interfood logo" />
                  <div class="app-brand__copy">
                    <p class="app-brand__name">Erawan Interfood</p>
                  </div>
                </div>
                <p class="status-pill status-pill--inverse w-fit">${headerAccent}</p>
                <h1 class="hero-title mt-4" data-auto-fit-title data-max-font-size="38">${escapeHtml(heroTitle)}</h1>
                <p class="hero-copy mt-3">${escapeHtml(heroCopy)}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <div class="profile-chip">
                  <div class="profile-avatar">
                    ${state.pictureUrl
        ? `<img src="${escapeAttribute(state.pictureUrl)}" alt="${escapeAttribute(state.displayName || 'LINE profile')}" />`
        : `<span class="profile-initials">${escapeHtml(getUserInitials(state.displayName))}</span>`}
                  </div>
                  <div class="min-w-0">
                    ${state.liffReady ? '' : '<p class="profile-meta">Initializing LIFF</p>'}
                    <p class="profile-name truncate">${escapeHtml(state.displayName || 'LINE User')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-2 py-6 md:px-6 lg:px-8">
            <section class="grid gap-6">
              <div class="field-card p-4 sm:p-6 ${state.lang ? 'hidden' : ''}">
                <h3 class="section-title">เลือกสัญชาติ / ဘာသာရွေးရန်</h3>
                <p class="help-text mt-2">เลือกสัญชาติไทยหรือพม่าเพื่อแสดงฟอร์มด้านล่าง / အောက်ဖော်ပြပါဖောင်ကို ကြည့်ရန် ဘာသာစကားရွေးပါ</p>
                <div class="mt-6 grid gap-4">
                  <button type="button" data-lang-select="th" aria-pressed="${state.lang === 'th' ? 'true' : 'false'}" class="language-option group ${state.lang === 'th' ? 'is-active' : ''}" ${state.liffReady ? '' : 'disabled'}>
                    <span class="language-badge">สัญชาติไทย</span>
                    <span class="language-copy">
                      <strong>สัญชาติไทย</strong>
                      <span>ใบสมัคร บริษัท เอราวัณอินเตอร์ฟู้ด จำกัด</span>
                    </span>
                  </button>
                  <button type="button" data-lang-select="my" aria-pressed="${state.lang === 'my' ? 'true' : 'false'}" class="language-option group ${state.lang === 'my' ? 'is-active' : ''}" ${state.liffReady ? '' : 'disabled'}>
                    <span class="language-badge">မြန်မာ</span>
                    <span class="language-copy">
                      <strong>မြန်မာ</strong>
                      <span>Erawan Interfood ဖောင်လျှောက်လွှာ</span>
                    </span>
                  </button>
                </div>
              </div>
              ${bodyMarkup}
            </section>
          </div>
        </div>
      </main>
      ${splashMarkup}
    `
    bindHeroTitleAutoFit()
  }

  function bindHeroTitleAutoFit() {
    const title = document.querySelector('[data-auto-fit-title]')
    if (!title) {
      if (heroTitleResizeObserver) {
        heroTitleResizeObserver.disconnect()
        heroTitleResizeObserver = null
      }
      return
    }

    const container = title.closest('.max-w-3xl') || title.parentElement
    if (!container) return

    if (heroTitleResizeObserver) {
      heroTitleResizeObserver.disconnect()
    }

    heroTitleResizeObserver = new ResizeObserver(() => {
      scheduleHeroTitleFit()
    })
    heroTitleResizeObserver.observe(container)
    scheduleHeroTitleFit()

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleHeroTitleFit).catch(() => {})
    }
  }

  function scheduleHeroTitleFit() {
    cancelAnimationFrame(heroTitleFitFrame)
    heroTitleFitFrame = window.requestAnimationFrame(fitHeroTitle)
  }

  function fitHeroTitle() {
    const title = document.querySelector('[data-auto-fit-title]')
    if (!title) return

    const container = title.closest('.max-w-3xl') || title.parentElement
    if (!container) return

    const availableWidth = container.clientWidth
    if (!availableWidth) return

    const maxSize = Number.parseFloat(title.dataset.maxFontSize || '38')
    const minSize = Number.parseFloat(title.dataset.minFontSize || '14')

    title.style.whiteSpace = 'nowrap'
    title.style.overflow = 'hidden'
    title.style.textOverflow = 'clip'
    title.style.maxWidth = 'none'

    const baselineSize = Math.min(maxSize, Number.parseFloat(window.getComputedStyle(title).fontSize) || maxSize)
    title.style.fontSize = `${baselineSize}px`

    const naturalWidth = title.scrollWidth
    if (!naturalWidth || naturalWidth <= availableWidth) {
      return
    }

    const scaledSize = Math.max(minSize, Math.floor(baselineSize * (availableWidth / naturalWidth)))
    title.style.fontSize = `${scaledSize}px`

    if (title.scrollWidth > availableWidth && scaledSize > minSize) {
      title.style.fontSize = `${Math.max(minSize, scaledSize - 1)}px`
    }
  }

  function renderSuccessSection(copy) {
    const recordId = state.submissionResult?.recordId || '-'
    return `
      <div class="field-card p-6 sm:p-8">
        <div class="grid gap-5">
          <div class="flex flex-col gap-2">
            <p class="status-pill w-fit" data-tone="success">${copy.successTitle}</p>
            <h3 class="section-title">${copy.successDesc}</h3>
            <p class="help-text">${copy.successNote}</p>
          </div>
          <div class="record-card">
            <p class="record-label">${copy.applicationId}</p>
            <p class="record-value">${escapeHtml(recordId)}</p>
          </div>
          <div class="notice-card">
            ${state.lang === 'th'
        ? 'ระบบบันทึกข้อมูลเรียบร้อยแล้ว สามารถใช้เลขที่สมัครนี้ติดตามงานกับเจ้าหน้าที่ได้'
        : 'သင့်လျှောက်လွှာကို သိမ်းပြီးပါပြီ။ လျှောက်လွှာနံပါတ်ကို ကိုးကားရန် အသုံးပြုနိုင်ပါသည်'}
          </div>
        </div>
      </div>
    `
  }

  function renderThaiForm(copy) {
    return `
      <div class="field-card p-4 sm:p-6">
        <h3 class="section-title">ข้อมูลส่วนตัว</h3>
        <div class="mt-5 grid gap-5">
          ${renderRadioGroup({
      name: 'thai-gender',
      label: 'เพศ',
      required: true,
      options: [
        { value: 'ชาย', label: 'ชาย' },
        { value: 'หญิง', label: 'หญิง' },
      ],
    })}
          ${renderTextField({ id: 'thai-fullName', label: 'ชื่อ-นามสกุล', required: true, placeholder: 'กรอกชื่อ-นามสกุล' })}
          ${renderTextField({ id: 'thai-cardNumber', label: copy.idCardNumber, required: true, placeholder: 'กรอกเลขบัตรประชาชน' })}
          ${renderDateField({ id: 'thai-dob', label: 'วัน เดือน ปีเกิด (พ.ศ.)', hint: copy.dobHint })}
          ${renderTextField({ id: 'thai-age', label: 'อายุ', required: true, type: 'number', readonly: true, placeholder: 'ระบบคำนวณให้อัตโนมัติ' })}
        </div>
      </div>

      <div class="field-card p-4 sm:p-6">
        <h3 class="section-title">การศึกษาและประสบการณ์</h3>
        <div class="mt-5 grid gap-5">
          ${renderSelectField({
      id: 'thai-education',
      label: 'วุฒิการศึกษา',
      required: true,
      options: thaiEducationOptions,
      otherInput: { id: 'thai-education-other', placeholder: copy.otherLabel },
    })}
          ${renderSelectField({
      id: 'thai-experience',
      label: 'ประสบการณ์ทำงาน',
      required: true,
      options: thaiExperienceOptions,
    })}
          ${renderTextareaField({ id: 'thai-skill', label: 'ความสามารถพิเศษ', required: true, placeholder: 'ระบุทักษะหรือความสามารถพิเศษ' })}
        </div>
      </div>

      <div class="field-card p-4 sm:p-6">
        <h3 class="section-title">ข้อมูลการสมัครงาน</h3>
        <div class="mt-5 grid gap-5">
          ${renderSelectField({
      id: 'thai-position',
      label: 'สนใจสมัครงานในตำแหน่งใด',
      required: true,
      options: thaiPositionOptions,
      otherInput: { id: 'thai-position-other', placeholder: copy.otherLabel },
    })}
          ${renderRadioGroup({
      name: 'thai-shift',
      label: 'สามารถทำงานเป็นกะได้หรือไม่',
      required: true,
      options: thaiYesNo,
    })}
          ${renderTextField({ id: 'thai-phone', label: 'เบอร์โทรติดต่อกลับ', required: true, type: 'tel', placeholder: 'เช่น 08x-xxx-xxxx' })}
        </div>
      </div>
    `
  }

  function renderMyanmarForm(copy) {
    return `
      <div class="field-card p-4 sm:p-6">
        <h3 class="section-title">လျှောက်ထားသူအချက်အလက်</h3>
        <div class="mt-5 grid gap-5">
          ${renderTextField({ id: 'my-name', label: 'အမည်', labelSecondary: 'ชื่อ', required: true, placeholder: 'အမည်ထည့်ပါ' })}
          ${renderTextField({ id: 'my-cardNumber', label: copy.idCardNumber, labelSecondary: 'เลขบัตรประชาชน / เลขพาสปอร์ต', required: true, placeholder: 'နံပါတ်ထည့်ပါ' })}
          ${renderRadioGroup({
      name: 'my-gender',
      label: 'ကျား/မ',
      labelSecondary: 'เพศ',
      required: true,
      options: myGenderOptions,
      otherInput: { id: 'my-gender-other', placeholder: 'အခြားကို ဖြည့်ပါ' },
    })}
          ${renderRadioGroup({
      name: 'my-shift',
      label: 'အလှည့်ကျ အလုပ်လုပ်နိုင်ပါသလား',
      labelSecondary: 'ทำงานเป็นกะได้หรือไม่',
      required: true,
      options: myShiftOptions,
    })}
        </div>
      </div>

      <div class="field-card p-4 sm:p-6">
        <h3 class="section-title">အလုပ်အတွေ့အကြုံ</h3>
        <div class="mt-5 grid gap-5">
          ${renderTextareaField({ id: 'my-work-history', label: 'အလုပ်အတွေ့အကြုံ', labelSecondary: 'ประสบการณ์ทำงาน', required: true, placeholder: 'အလုပ်အတွေ့အကြုံကို ထည့်ပါ' })}
        </div>
      </div>
    `
  }

  function renderLabelContent(label, labelSecondary = '', required = false) {
    const requiredMark = required ? ` ${renderRequiredMark()}` : ''
    const secondaryLabel = labelSecondary ? `<span class="form-label-secondary">${escapeHtml(labelSecondary)}</span>` : ''
    return `
      <span class="form-label-stack">
        <span class="form-label-main">${escapeHtml(label)}${requiredMark}</span>
        ${secondaryLabel}
      </span>
    `
  }

  function renderTextField({ id, label, labelSecondary = '', type = 'text', placeholder = '', required = false, readonly = false }) {
    return `
      <label class="grid gap-2">
        ${renderLabelContent(label, labelSecondary, required)}
        <input id="${id}" name="${id}" type="${type}" class="form-control" placeholder="${escapeHtml(placeholder)}" ${readonly ? 'readonly' : ''} ${required ? 'required' : ''} />
      </label>
    `
  }

  function renderTextareaField({ id, label, labelSecondary = '', placeholder = '', required = false }) {
    return `
      <label class="grid gap-2">
        ${renderLabelContent(label, labelSecondary, required)}
        <textarea id="${id}" name="${id}" class="form-control min-h-[7rem] resize-y" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''}></textarea>
      </label>
    `
  }

  function renderSelectField({ id, label, labelSecondary = '', options, required = false, otherInput = null }) {
    const renderedOptions = id === 'thai-experience'
      ? [
        { value: '', label: 'เลือกประสบการณ์ทำงาน', disabled: true, selected: true },
        { value: 'ไม่มีประสบการณ์', label: 'ไม่มีประสบการณ์' },
        { value: 'น้อยกว่า 1 ปี', label: 'น้อยกว่า 1 ปี' },
        { value: '1-3 ปี', label: '1-3 ปี' },
        { value: '3-5 ปี', label: '3-5 ปี' },
        { value: 'มากกว่า 5 ปี', label: 'มากกว่า 5 ปี' },
      ]
      : options
    return `
      <label class="grid gap-2">
        ${renderLabelContent(label, labelSecondary, required)}
        <select id="${id}" name="${id}" class="form-control" data-other-trigger="${otherInput ? 'true' : 'false'}" ${required ? 'required' : ''}>
          ${renderedOptions
        .map((option) => `<option value="${escapeAttribute(option.value)}"${option.disabled ? ' disabled' : ''}${option.selected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`)
        .join('')}
        </select>
        ${otherInput ? `<input id="${otherInput.id}" type="text" class="form-control hidden" placeholder="${escapeHtml(otherInput.placeholder || '')}" />` : ''}
      </label>
    `
  }

  function renderDateField({ id, label, labelSecondary = '', hint = '' }) {
    return `
      <label class="grid gap-2">
        ${renderLabelContent(label, labelSecondary, true)}
        <input id="${id}" name="${id}" type="text" class="form-control" placeholder="เลือกวันเกิด" readonly />
        ${hint ? `<span class="help-text">${escapeHtml(hint)}</span>` : ''}
      </label>
    `
  }

  function renderRadioGroup({ name, label, labelSecondary = '', options, required = false, otherInput = null }) {
    return `
      <fieldset class="grid gap-3">
        <legend class="form-label">${renderLabelContent(label, labelSecondary, required)}</legend>
        <div class="radio-group">
          ${options
        .map((option, index) => {
          const optionId = `${name}-${index}`
          const isOther = option.value === 'other'
          return `
                <label class="radio-pill" for="${optionId}">
                  <input id="${optionId}" type="radio" name="${name}" value="${escapeAttribute(option.value)}" data-other-trigger="${isOther ? 'true' : 'false'}" ${required ? 'required' : ''} />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `
        })
        .join('')}
        </div>
        ${otherInput ? `<input id="${otherInput.id}" type="text" class="form-control hidden" placeholder="${escapeHtml(otherInput.placeholder || '')}" />` : ''}
      </fieldset>
    `
  }

  function renderUploadField({ key, label, labelSecondary = '', accept = 'image/*' }) {
    return `
      <div class="upload-zone" data-upload-zone="${key}">
        <div class="upload-zone-head">
          <div class="upload-zone-label">
            ${renderLabelContent(label, labelSecondary, true)}
            <p class="upload-zone-note">${state.lang === 'th' ? 'หนึ่งช่องต่อหนึ่งไฟล์แนบ' : 'တစ်ช่องလျှင် ဖိုင်တစ်ဖိုင်'}</p>
          </div>
          <div class="file-actions">
            <button type="button" class="btn-secondary" data-pick-file="${key}">${state.lang === 'th' ? 'เลือกไฟล์' : 'ဖိုင်ရွေးမည်'}</button>
            <button type="button" class="btn-danger hidden" data-remove-file="${key}">${state.lang === 'th' ? 'ลบไฟล์' : 'ဖျက်မည်'}</button>
          </div>
        </div>
        <input id="${key}-input" type="file" class="hidden" accept="${accept}" data-file-input="${key}" />
        <div class="upload-slot" id="${key}-slot"></div>
      </div>
    `
  }

  function bindGlobalEvents() {
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('change', onDocumentChange)
    document.addEventListener('submit', onFormSubmit)
  }

  function hydrateLanguageSwitch() {
    document.querySelectorAll('[data-lang-switch]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextLang = button.getAttribute('data-lang-switch')
        if (!nextLang) return
        localStorage.setItem(LANGUAGE_KEY, nextLang)
        const url = new URL(window.location.href)
        url.searchParams.set('lang', nextLang)
        window.location.href = url.toString()
      })
    })
  }

  async function initLiffSession() {
    const statusEl = document.getElementById('li-status')
    if (!window.liff || typeof liff.init !== 'function') {
      if (statusEl) statusEl.textContent = 'liff sdk missing'
      return
    }

    if (statusEl) statusEl.textContent = 'initializing'
    await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })

    if (!liff.isLoggedIn()) {
      const target = `${window.location.origin}${window.location.pathname}${window.location.search}`
      liff.login({ redirectUri: target })
      return
    }

    try {
      if (!liff.isInClient()) {
        const friendship = await liff.getFriendship()
        if (friendship && friendship.friendFlag === false && typeof liff.requestFriendship === 'function') {
          await liff.requestFriendship()
        }
      }
    } catch (error) {
      console.warn('Friendship check failed:', error)
    }

    try {
      const profile = await liff.getProfile()
      state.displayName = profile?.displayName || ''
      state.pictureUrl = profile?.pictureUrl || ''
    } catch (error) {
      console.warn('Profile fetch failed:', error)
    }

    try {
      const context = liff.getContext?.()
      state.userId = context?.userId || ''
    } catch (error) {
      console.warn('Context fetch failed:', error)
    }

    state.liffReady = true
    renderApp()
    if (state.lang) initFormEnhancements()
    refreshUserPanel()
  }

  function initFormEnhancements() {
    if (!state.lang) return
    if (state.lang === 'th') {
      initThaiDobPicker()
    }
    hydrateOtherInputs()
    hydrateUploadSlots()
    hydrateFormState()
    refreshUserPanel()
  }

  function getUploadDefinitions() {
    return UPLOAD_DEFINITIONS[state.lang === 'my' ? 'my' : 'th']
  }

  function getUploadFieldKeys() {
    return UPLOAD_FIELD_KEYS[state.lang === 'my' ? 'my' : 'th']
  }

  function renderAllUploadSlots() {
    getUploadFieldKeys().forEach((key) => renderUploadSlot(key))
  }

  function scheduleUploadSlotRender(fieldKey) {
    if (!fieldKey) return
    state.uploadRenderQueue.add(fieldKey)
    if (state.uploadRenderFrame) return

    state.uploadRenderFrame = window.requestAnimationFrame(() => {
      state.uploadRenderFrame = 0
      const keys = Array.from(state.uploadRenderQueue)
      state.uploadRenderQueue.clear()
      keys.forEach((key) => renderUploadSlot(key))
    })
  }

  window.initApp = function initApp() {
    initFormEnhancements()
  }

  function initThaiDobPicker() {
    const el = document.getElementById('thai-dob')
    if (!el || typeof flatpickr !== 'function') return

    const instance = flatpickr(el, {
      allowInput: false,
      clickOpens: true,
      animate: false,
      altInput: true,
      altFormat: 'd/m/Y',
      dateFormat: 'Y-m-d',
      disableMobile: true,
      maxDate: 'today',
      locale: flatpickr.l10ns.th,
      formatDate: (date, format, locale) => {
        if (format === 'd/m/Y') {
          return formatThaiBuddhistDate(date)
        }
        return flatpickr.formatDate(date, format, locale)
      },
      parseDate: (dateStr, format) => {
        if (format === 'd/m/Y') {
          return parseThaiBuddhistDate(dateStr)
        }
        return flatpickr.parseDate(dateStr, format)
      },
      onReady: (_, __, instance) => {
        syncThaiDobDisplay(instance)
      },
      onChange: (_, __, instance) => {
        syncThaiDobDisplay(instance)
        syncThaiAge(instance.selectedDates[0])
      },
    })

    syncThaiYearHeader(instance)
    instance.config.onReady.push(() => syncThaiYearHeader(instance))
    instance.config.onMonthChange.push(() => syncThaiYearHeader(instance))
    instance.config.onYearChange.push(() => syncThaiYearHeader(instance))
  }

  function syncThaiDobDisplay(instance) {
    if (!instance || !instance.altInput) return
    instance.altInput.placeholder = 'เลือกวันเกิด'
    instance.altInput.readOnly = true
  }

  function syncThaiYearHeader(instance) {
    if (!instance || !instance.currentYearElement) return

    const yearInput = instance.currentYearElement
    yearInput.value = String(Number(instance.currentYear || 0) + THAI_YEAR_OFFSET)

    if (yearInput.dataset.beBound === 'true') return
    yearInput.dataset.beBound = 'true'

    const commitYear = () => {
      const beYear = Number.parseInt(yearInput.value, 10)
      if (Number.isNaN(beYear)) return
      const ceYear = beYear - THAI_YEAR_OFFSET
      if (ceYear > 0) {
        instance.changeYear(ceYear)
      }
    }

    yearInput.addEventListener('change', commitYear)
    yearInput.addEventListener('blur', commitYear)
    yearInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') commitYear()
    })
  }

  function hydrateOtherInputs() {
    document.querySelectorAll('input[type="radio"][data-other-trigger]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const fieldset = radio.closest('fieldset')
        if (!fieldset) return
        const otherInput = fieldset.querySelector('input.form-control.hidden')
        if (!otherInput) return
        const shouldShow = radio.checked && radio.getAttribute('data-other-trigger') === 'true'
        otherInput.classList.toggle('hidden', !shouldShow)
        if (!shouldShow) otherInput.value = ''
      })
    })

    document.querySelectorAll('select[data-other-trigger="true"]').forEach((select) => {
      select.addEventListener('change', () => {
        const wrapper = select.closest('label')
        if (!wrapper) return
        const otherInput = wrapper.querySelector('input.form-control.hidden')
        if (!otherInput) return
        const shouldShow = select.value === 'other'
        otherInput.classList.toggle('hidden', !shouldShow)
        if (!shouldShow) otherInput.value = ''
      })
    })
  }

  function hydrateUploadSlots() {
    renderAllUploadSlots()
  }

  function hydrateFormState() {
    if (!state.lang) return
    if (state.lang === 'th') {
      const dob = document.getElementById('thai-dob')
      if (dob && dob._flatpickr && dob._flatpickr.selectedDates[0]) {
        syncThaiAge(dob._flatpickr.selectedDates[0])
      }
    }
    renderAllUploadSlots()
  }

  function refreshUserPanel() {
    const userIdEl = document.getElementById('li-userid')
    const statusEl = document.getElementById('li-status')
    const backendStatus = document.getElementById('backend-status')
    if (userIdEl) userIdEl.textContent = state.userId || '-'
    if (statusEl) statusEl.textContent = state.liffReady ? 'ready' : 'not available'
    if (backendStatus) backendStatus.textContent = BACKEND_URL ? 'ready' : 'not configured'
  }

  function onDocumentClick(event) {
    const langButton = event.target.closest('[data-lang-select]')
    if (langButton) {
      const nextLang = langButton.getAttribute('data-lang-select')
      if (nextLang === 'th' || nextLang === 'my') {
        state.lang = nextLang
        state.submissionResult = null
        localStorage.setItem(LANGUAGE_KEY, nextLang)
        document.documentElement.lang = nextLang === 'my' ? 'my' : 'th'
        renderApp()
        initFormEnhancements()
      }
      return
    }

    if (event.target.closest('[data-back-language]')) {
      state.lang = null
      state.submissionResult = null
      localStorage.removeItem(LANGUAGE_KEY)
      document.documentElement.lang = 'th'
      renderApp()
      setTimeout(() => {
        document.querySelector('[data-lang-select]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return
    }

    const pickButton = event.target.closest('[data-pick-file]')
    if (pickButton) {
      const key = pickButton.getAttribute('data-pick-file')
      const input = document.querySelector(`[data-file-input="${key}"]`)
      if (input) input.click()
      return
    }

    const removeButton = event.target.closest('[data-remove-file]')
    if (removeButton) {
      const key = removeButton.getAttribute('data-remove-file')
      void removeAttachment(key)
      return
    }

    if (event.target.closest('#clear-all-files')) {
      void clearAllAttachments()
    }
  }

  function onDocumentChange(event) {
    const fileInput = event.target.closest('[data-file-input]')
    if (fileInput) {
      const key = fileInput.getAttribute('data-file-input')
      handleFileSelection(key, fileInput.files)
      fileInput.value = ''
      return
    }
  }

  async function onFormSubmit(event) {
    event.preventDefault()
    if (state.isSubmitting) return

    const copy = appText[state.lang] || appText.th
    const validation = validateForm()
    if (!validation.ok) {
      await showAlert('warning', copy.commonRequired, validation.message)
      validation.focus?.()
      return
    }

    const attachmentCheck = validateAttachments()
    if (!attachmentCheck.ok) {
      await showAlert('warning', copy.commonRequired, attachmentCheck.message)
      return
    }

    state.isSubmitting = true
    setSubmitBusy(true)
    try {
      const confirmed = await confirmDialog(copy.saveConfirm, copy.saveConfirmDesc)
      if (!confirmed) return

      showLoadingDialog(copy.saveInprogress, copy.saveInprogressDesc)

      const record = buildRecord()
      const result = await postApi('upsertRecord', { record })
      const recordId = result?.recordId || record.recordId
      if (attachmentCheck.attachments.length) {
        postApi('movefilestorecordfolder', {
          recordId,
          language: state.lang,
          attachments: attachmentCheck.attachments,
        })
      }

      await sendSubmissionFlexMessage(recordId, record)

      state.submissionResult = {
        recordId,
        sheetName: result?.sheetName || '',
      }
      state.uploads = {}
      closeLoadingDialog()
      renderApp()
    } catch (error) {
      console.error(error)
      closeLoadingDialog()
      await showAlert('error', appText[state.lang].saveErr, normalizeErrorMessage(error))
    } finally {
      state.isSubmitting = false
      setSubmitBusy(false)
    }
  }

  function validateForm() {
        const requiredFields = state.lang === 'th'
          ? ['thai-gender', 'thai-fullName', 'thai-cardNumber', 'thai-dob', 'thai-age', 'thai-education', 'thai-experience', 'thai-skill', 'thai-position', 'thai-shift', 'thai-phone']
          : ['my-name', 'my-cardNumber', 'my-gender', 'my-shift', 'my-work-history']
        const labels = state.lang === 'th'
          ? {
            'thai-gender': 'เพศ',
            'thai-fullName': 'ชื่อ-นามสกุล',
            'thai-cardNumber': 'เลขบัตรประชาชน',
            'thai-dob': 'วัน เดือน ปีเกิด',
            'thai-age': 'อายุ',
            'thai-education': 'วุฒิการศึกษา',
            'thai-experience': 'ประสบการณ์ทำงาน',
            'thai-skill': 'ความสามารถพิเศษ',
            'thai-position': 'ตำแหน่งที่สนใจ',
            'thai-shift': 'การทำงานเป็นกะ',
            'thai-phone': 'เบอร์โทรติดต่อกลับ',
          }
          : {
            'my-name': 'အမည်',
            'my-cardNumber': 'ကတ်နံပါတ် / Passport နံပါတ်',
            'my-gender': 'ကျား/မ',
            'my-shift': 'အလှည့်ကျ အလုပ်လုပ်နိုင်မှု',
            'my-work-history': 'အလုပ်အတွေ့အကြုံ',
          }

        for (const field of requiredFields) {
          const isRadio = ['thai-gender', 'thai-shift', 'my-gender', 'my-shift'].includes(field)
          const value = isRadio ? getRadioValue(field) : getValue(field)
          if (!value) {
            return { ok: false, message: `โปรดกรอกข้อมูล: ${labels[field] || field}`, focus: focusField(field) }
          }
        }

        if (state.lang === 'th') {
          if ((getValue('thai-education') === 'other' || getRadioValue('thai-education') === 'other') && !getValue('thai-education-other')) {
            return { ok: false, message: 'โปรดระบุวุฒิการศึกษาในช่องอื่นๆ', focus: focusField('thai-education-other') }
          }
          if (getValue('thai-position') === 'other' && !getValue('thai-position-other')) {
            return { ok: false, message: 'โปรดระบุตำแหน่งที่สนใจในช่องอื่นๆ', focus: focusField('thai-position-other') }
          }
        }

        if (state.lang === 'my' && getRadioValue('my-gender') === 'other' && !getValue('my-gender-other')) {
            return { ok: false, message: 'ကျား/မ အခြားကို ဖြည့်ပါ', focus: focusField('my-gender-other') }
          }

        return { ok: true }
      }

  function validateAttachments() {
        const requiredKeys = state.lang === 'th'
          ? ['thaiPhoto', 'thaiIdCard', 'thaiHousehold', 'thaiEducationCert', 'thaiWorkCert']
          : ['myPhoto', 'myPassport', 'myPinkCard']

        const attachments = []
        for (const key of requiredKeys) {
          const item = state.uploads[key]
          if (!item) {
            return { ok: false, message: state.lang === 'th'
              ? `กรุณาแนบไฟล์: ${getUploadDefinitions()[key]?.label || key}`
              : `ဖိုင်ကို အပ်လုဒ်လုပ်ပါ: ${getUploadDefinitions()[key]?.label || key}` }
          }
          if (item.uploadStatus === 'PENDING' || item.uploadStatus === 'UPLOADING') {
            return { ok: false, message: appText[state.lang].uploadPending }
          }
          if (item.uploadStatus === 'ERROR') {
            return { ok: false, message: appText[state.lang].uploadError }
          }
          attachments.push({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType || item.type || '',
            size: item.size || 0,
            fieldKey: item.fieldKey,
            url: item.url || '',
          })
        }
        return { ok: true, attachments }
      }

  function buildRecord() {
        const createdAt = new Date().toISOString()
        const attachments = Object.values(state.uploads)
          .filter((item) => item && item.uploadStatus === 'UPLOADED' && item.id)
          .map((item) => ({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType || item.type || '',
            size: item.size || 0,
            fieldKey: item.fieldKey,
            url: item.url || '',
          }))

        if (state.lang === 'th') {
          return {
            language: 'th',
            createdAt,
            userId: state.userId,
            displayName: state.displayName,
            applicant: {
              gender: getRadioValue('thai-gender'),
              fullName: getValue('thai-fullName'),
              cardNumber: getValue('thai-cardNumber'),
              dob: getValue('thai-dob'),
              age: Number(getValue('thai-age')) || null,
              nationality: state.lang === 'th' ? 'ไทย' : 'မြန်မာ',
              education: getSelectedOtherAwareValue('thai-education', 'thai-education-other'),
              experience: getValue('thai-experience'),
              specialSkill: getValue('thai-skill'),
              position: getSelectedOtherAwareValue('thai-position', 'thai-position-other'),
              shiftAble: getRadioValue('thai-shift'),
              phone: getValue('thai-phone'),
            },
            attachments,
          }
        }

        return {
          language: 'my',
          createdAt,
          userId: state.userId,
          displayName: state.displayName,
          applicant: {
            name: getValue('my-name'),
            cardNumber: getValue('my-cardNumber'),
            gender: getSelectedOtherAwareValue('my-gender', 'my-gender-other'),
            shiftAble: getRadioValue('my-shift'),
            workHistory: getValue('my-work-history'),
          },
          attachments,
        }
      }

  function handleFileSelection(fieldKey, fileList) {
        const files = Array.from(fileList || [])
        if (!files.length) return

        const file = files[0]
        const previous = state.uploads[fieldKey]
        if (previous && previous.uploadStatus === 'UPLOADING') {
          abortUpload(previous)
        }
        if (previous && previous.uploadStatus === 'UPLOADED') {
          void removeAttachment(fieldKey, { silent: true })
        }

        const uploadFile = {
          fieldKey,
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          uploadStatus: 'PENDING',
          progress: 0,
          id: '',
          url: '',
          mimeType: file.type,
          uploadHandle: null,
        }
        state.uploads[fieldKey] = uploadFile
        renderUploadSlot(fieldKey)
        void uploadFileToDrive(uploadFile)
      }

  async function uploadFileToDrive(uploadFile) {
        try {
          await uploadFileToDriveOnce(uploadFile, false)
        } catch (error) {
          if (isUploadCancelled(error)) {
            delete state.uploads[uploadFile.fieldKey]
            renderUploadSlot(uploadFile.fieldKey)
            return
          }

          if (isUploadAuthExpired(error)) {
            state.uploadAuth = null
            try {
              await uploadFileToDriveOnce(uploadFile, true)
              return
            } catch (retryError) {
              error = retryError
            }
          }

          uploadFile.uploadStatus = 'ERROR'
          uploadFile.progress = 0
          uploadFile.uploadHandle = null
          renderUploadSlot(uploadFile.fieldKey)
          await showAlert('error', state.lang === 'th' ? 'อัปโหลดไฟล์ไม่สำเร็จ' : 'ဖိုင်အပ်လုဒ် မအောင်မြင်ပါ', normalizeErrorMessage(error))
        }
      }

  async function uploadFileToDriveOnce(uploadFile, forceRefreshAuth) {
        try {
          const auth = await getUploadAuth({ forceRefresh: forceRefreshAuth })
          const initXhr = new XMLHttpRequest()
          uploadFile.uploadHandle = { aborted: false, initXhr, uploadXhr: null }
          uploadFile.uploadStatus = 'UPLOADING'
          renderUploadSlot(uploadFile.fieldKey)

          const sessionUrl = await new Promise((resolve, reject) => {
            initXhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,mimeType,size')
            initXhr.setRequestHeader('Authorization', `Bearer ${auth.accessToken}`)
            initXhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
            initXhr.setRequestHeader('X-Upload-Content-Type', uploadFile.type || 'application/octet-stream')
            initXhr.setRequestHeader('X-Upload-Content-Length', String(uploadFile.size || 0))
            initXhr.onload = () => {
              if (initXhr.status >= 200 && initXhr.status < 300) {
                const location = initXhr.getResponseHeader('Location')
                if (!location) {
                  reject(new Error('Missing resumable upload location'))
                  return
                }
                resolve(location)
                return
              }
              reject(new Error(`Upload init failed (${initXhr.status})`))
            }
            initXhr.onerror = () => reject(new Error('Upload init network error'))
            initXhr.onabort = () => reject(Object.assign(new Error('Upload cancelled'), { code: 'UPLOAD_CANCELLED' }))
            initXhr.send(JSON.stringify({
              name: uploadFile.name,
              mimeType: uploadFile.type || 'application/octet-stream',
              parents: [auth.folderId],
            }))
          })

          const uploadXhr = new XMLHttpRequest()
          uploadFile.uploadHandle.uploadXhr = uploadXhr

          const response = await new Promise((resolve, reject) => {
            uploadXhr.open('PUT', sessionUrl)
            uploadXhr.setRequestHeader('Content-Type', uploadFile.type || 'application/octet-stream')
            uploadXhr.setRequestHeader('Content-Range', `bytes 0-${uploadFile.size - 1}/${uploadFile.size}`)
            uploadXhr.upload.onprogress = (event) => {
              if (!event.lengthComputable) return
              uploadFile.progress = Math.round((event.loaded / event.total) * 100)
              scheduleUploadSlotRender(uploadFile.fieldKey)
            }
            uploadXhr.onload = () => {
              if (uploadXhr.status === 200 || uploadXhr.status === 201) {
                try {
                  resolve(JSON.parse(uploadXhr.responseText || '{}'))
                } catch (error) {
                  reject(error)
                }
                return
              }
              if (uploadXhr.status === 308) {
                reject(new Error('Upload incomplete'))
                return
              }
              reject(new Error(`Upload failed (${uploadXhr.status})`))
            }
            uploadXhr.onerror = () => reject(new Error('Upload network error'))
            uploadXhr.onabort = () => reject(Object.assign(new Error('Upload cancelled'), { code: 'UPLOAD_CANCELLED' }))
            uploadXhr.send(uploadFile.file)
          })

          uploadFile.id = response.id || ''
          if (isPublicPhotoUpload(uploadFile.fieldKey) && uploadFile.id) {
            await makeDriveFilePublic(uploadFile.id, auth.accessToken)
            uploadFile.url = buildPublicDriveImageUrl(uploadFile.id)
          } else {
            uploadFile.url = response.webViewLink || ''
          }

          uploadFile.uploadStatus = 'UPLOADED'
          uploadFile.progress = 100
          uploadFile.mimeType = response.mimeType || uploadFile.type || ''
          uploadFile.size = Number(response.size || uploadFile.size || 0)
          uploadFile.uploadHandle = null
          renderUploadSlot(uploadFile.fieldKey)
        } catch (error) {
          if (isUploadCancelled(error)) {
            delete state.uploads[uploadFile.fieldKey]
            renderUploadSlot(uploadFile.fieldKey)
            return
          }
          if (isUploadAuthExpired(error)) {
            throw error
          }
          uploadFile.uploadStatus = 'ERROR'
          uploadFile.progress = 0
          uploadFile.uploadHandle = null
          renderUploadSlot(uploadFile.fieldKey)
          await showAlert('error', state.lang === 'th' ? 'อัปโหลดไฟล์ไม่สำเร็จ' : 'ဖိုင်အပ်လုဒ် မအောင်မြင်ပါ', normalizeErrorMessage(error))
        }
      }

  async function removeAttachment(fieldKey, options = {}) {
        const item = state.uploads[fieldKey]
        if (!item) return

        if (item.uploadStatus === 'UPLOADING' || item.uploadStatus === 'PENDING') {
          abortUpload(item)
          delete state.uploads[fieldKey]
          renderUploadSlot(fieldKey)
          return
        }

        if (item.uploadStatus === 'ERROR' || !item.id) {
          delete state.uploads[fieldKey]
          renderUploadSlot(fieldKey)
          return
        }

        if (!options.silent) {
          const ok = await confirmDialog(appText[state.lang].confirmDelete, `"${item.name}"`)
          if (!ok) return
        }

        const hasRemoteFile = Boolean(item.id && item.uploadStatus === 'UPLOADED')
        if (!options.silent && hasRemoteFile) {
          void showToast({
            icon: 'info',
            title: appText[state.lang].deletingFile,
            loading: true,
          })
        }

        try {
          if (hasRemoteFile) {
            await postApi('deleteFiles', { fileIds: [item.id] })
          }
        } catch (error) {
          console.warn('Delete file failed:', error)
          closeLoadingDialog()
          if (!options.silent) {
            await showToast({
              icon: 'error',
              title: state.lang === 'th' ? 'ลบไฟล์ไม่สำเร็จ' : 'ဖိုင်ဖျက်မရပါ',
              text: normalizeErrorMessage(error),
            })
          }
          return
        }

        delete state.uploads[fieldKey]
        renderUploadSlot(fieldKey)

        if (!options.silent) {
          closeLoadingDialog()
          await showToast({
            icon: 'success',
            title: appText[state.lang].deletedFile,
          })
        }
      }

  async function clearAllAttachments() {
        const items = Object.values(state.uploads).filter(Boolean)
        if (!items.length) return

        const ok = await confirmDialog(appText[state.lang].confirmDeleteAll, '')
        if (!ok) return

        const uploadedIds = items.filter((item) => item.uploadStatus === 'UPLOADED' && item.id).map((item) => item.id)
        items
          .filter((item) => item.uploadStatus === 'UPLOADING' || item.uploadStatus === 'PENDING')
          .forEach((item) => abortUpload(item))

        const hasRemoteFiles = uploadedIds.length > 0
        if (hasRemoteFiles) {
          void showToast({
            icon: 'info',
            title: appText[state.lang].deletingFiles,
            loading: true,
          })
        }

        if (uploadedIds.length) {
          try {
            await postApi('deleteFiles', { fileIds: uploadedIds })
          } catch (error) {
            console.warn('Batch delete failed:', error)
            closeLoadingDialog()
            await showToast({
              icon: 'error',
              title: state.lang === 'th' ? 'ลบไฟล์ไม่สำเร็จ' : 'ဖိုင်ဖျက်မရပါ',
              text: normalizeErrorMessage(error),
            })
            return
          }
        }

        if (hasRemoteFiles) {
          closeLoadingDialog()
        }
        state.uploads = {}
        renderAllUploadSlots()

        if (items.length) {
          await showToast({
            icon: 'success',
            title: appText[state.lang].deletedFiles,
          })
        }
      }

  function abortUpload(item) {
        if (!item || !item.uploadHandle) return
        item.uploadHandle.aborted = true
        try {
          item.uploadHandle.initXhr?.abort()
        } catch (error) {
          console.warn(error)
        }
        try {
          item.uploadHandle.uploadXhr?.abort()
        } catch (error) {
          console.warn(error)
        }
        item.uploadHandle = null
      }

  function renderUploadSlot(fieldKey) {
        const slot = document.getElementById(`${fieldKey}-slot`)
        const removeButton = document.querySelector(`[data-remove-file="${fieldKey}"]`)
        const item = state.uploads[fieldKey]
        if (!slot) return
        if (!item) {
          slot.innerHTML = `<div class="file-empty">${state.lang === 'th' ? 'ยังไม่มีไฟล์แนบ' : 'ဖိုင်မရှိသေးပါ'}</div>`
          if (removeButton) removeButton.classList.add('hidden')
          return
        }

        if (removeButton) removeButton.classList.remove('hidden')

        const uploadProgress = Math.max(0, Math.min(100, item.progress || 0))
        const labels = {
          PENDING: appText[state.lang].uploadReady,
          UPLOADING: state.lang === 'th'
            ? `กำลังอัปโหลด ${uploadProgress}%`
            : `${appText[state.lang].loadingUpload} ${uploadProgress}%`,
          UPLOADED: appText[state.lang].uploaded,
          ERROR: appText[state.lang].uploadFailed,
        }

        slot.innerHTML = `
      <div class="upload-file">
        <div class="upload-meta">
          <div class="min-w-0 upload-file-main">
            <p class="upload-file-name truncate">${escapeHtml(item.name)}</p>
            <div class="upload-file-meta">
              <span>${formatBytes(item.size || 0)}</span>
              ${item.url ? `<a class="accent-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${state.lang === 'th' ? 'เปิดไฟล์' : 'ဖိုင်ဖွင့်ကြည့်ရန်'}</a>` : ''}
            </div>
          </div>
          <span class="status-pill shrink-0" data-tone="${item.uploadStatus === 'ERROR' ? 'danger' : item.uploadStatus === 'UPLOADED' ? 'success' : item.uploadStatus === 'UPLOADING' ? 'cool' : 'warning'}">${labels[item.uploadStatus] || item.uploadStatus}</span>
        </div>
        <div class="upload-progress" aria-hidden="true">
          <span style="--progress: ${uploadProgress / 100}"></span>
        </div>
      </div>
    `
      }


  function renderRequiredMark() {
        return '<span class="required-mark" aria-hidden="true">*</span>'
      }

  function buildSubmissionFlexMessage(recordId, record) {
    const applicant = record?.applicant || {}
    const profileImage = getSubmissionPhotoUrl(record)
    const submittedAt = formatSubmissionDate_(record?.createdAt)
    if (state.lang === 'my') {
      return buildSubmissionFlexMessageMyanmar_(recordId, applicant, profileImage, submittedAt)
    }
    return buildSubmissionFlexMessageThai_(recordId, applicant, profileImage, submittedAt)
  }

  function getSubmissionPhotoUrl(record) {
    const photoKey = state.lang === 'my' ? 'myPhoto' : 'thaiPhoto'
    const attachments = Array.isArray(record && record.attachments) ? record.attachments : []
    const attachment = attachments.find((item) => item && item.fieldKey === photoKey && item.id)
    if (attachment && attachment.url) return String(attachment.url)
    if (attachment && attachment.id) return buildPublicDriveImageUrl(attachment.id)
    return state.pictureUrl || 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png'
  }

  function buildPublicDriveImageUrl(fileId) {
    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(String(fileId || '').trim())}`
  }

  function buildSubmissionFlexMessageThai_(recordId, applicant, profileImage, submittedAt) {
    const name = applicant.fullName || '-'
    const cardNumber = applicant.cardNumber || '-'
    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: FLEX_THEME.header,
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: 'บันทึกใบสมัครเรียบร้อย',
            color: '#ffffff',
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: 'ระบบได้รับข้อมูลและบันทึกไว้เรียบร้อยแล้ว',
            color: '#d1fae5',
            size: 'sm',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      hero: {
        type: 'image',
        url: profileImage,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: 'https://liff.line.me/' + LIFF_ID,
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: 'เลขที่สมัคร',
                size: 'sm',
                color: FLEX_THEME.mutedText,
              },
              {
                type: 'text',
                text: recordId,
                weight: 'bold',
                size: 'xl',
                color: FLEX_THEME.bodyText,
                wrap: true,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'none',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ชื่อผู้สมัคร', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
                  { type: 'text', text: name, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เลขบัตร', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
                  { type: 'text', text: cardNumber, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่บันทึก', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
              { type: 'text', text: submittedAt, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'เก็บเลขที่สมัครนี้ไว้สำหรับติดต่อกับเจ้าหน้าที่',
            size: 'xs',
            color: FLEX_THEME.mutedText,
            wrap: true,
            adjustMode: 'shrink-to-fit',
            align: 'center',
          },
        ],
      },
    }
  }

  function buildSubmissionFlexMessageMyanmar_(recordId, applicant, profileImage, submittedAt) {
    const name = applicant.name || '-'
    const cardNumber = applicant.cardNumber || '-'
    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: FLEX_THEME.header,
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: 'ဖောင်တင်ပြီးပါပြီ',
            color: '#ffffff',
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: 'သင့်လျှောက်လွှာကို စနစ်ထဲသို့ သိမ်းပြီးပါပြီ',
            color: FLEX_THEME.headerSoft,
            size: 'sm',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      hero: {
        type: 'image',
        url: profileImage,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: 'https://liff.line.me/' + LIFF_ID,
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: 'လျှောက်လွှာနံပါတ်',
                size: 'sm',
                color: FLEX_THEME.mutedText,
              },
              {
                type: 'text',
                text: recordId,
                weight: 'bold',
                size: 'xl',
                color: FLEX_THEME.bodyText,
                wrap: true,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'none',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'လျှောက်ထားသူအမည်', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
                  { type: 'text', text: name, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ကတ်နံပါတ်', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
                  { type: 'text', text: cardNumber, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'သိမ်းသည့်နေ့စွဲ', size: 'sm', color: FLEX_THEME.mutedText, flex: 2 },
              { type: 'text', text: submittedAt, size: 'sm', color: FLEX_THEME.bodyText, weight: 'bold', align: 'end', flex: 3, wrap: true },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'နံပါတ်ကို သိမ်းထားပြီး HR နဲ့ ဆက်သွယ်ရာမှာ အသုံးပြုပါ',
            size: 'xs',
            color: FLEX_THEME.mutedText,
            wrap: true,
          },
        ],
      },
    }
  }

  async function sendSubmissionFlexMessage(recordId, record) {
    if (!window.liff || typeof liff.sendMessages !== 'function') return false
    if (typeof liff.isInClient === 'function' && !liff.isInClient()) return false

    const message = buildSubmissionFlexMessage(recordId, record)
    console.log('Sending LINE message:', message )
    try {
      await liff.sendMessages([
        {
          type: 'flex',
          altText: state.lang === 'th'
            ? `บันทึกใบสมัครเรียบร้อย ${recordId}`
            : `ဖောင်တင်ပြီးပါပြီ ${recordId}`,
          contents: message,
        },
      ])
      return true
    } catch (error) {
      console.warn('Failed to send LINE message:', error)
      return false
    }
  }

  function formatSubmissionDate_(value) {
    const date = value ? new Date(value) : new Date()
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-'

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const lookup = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
    const day = lookup.day || '00'
    const month = lookup.month || '00'
    const year = String(Number(lookup.year || '0') + (state.lang === 'th' ? THAI_YEAR_OFFSET : 0))
    const hour = lookup.hour || '00'
    const minute = lookup.minute || '00'
    return `${day}/${month}/${year} ${hour}:${minute}`
  }

  async function warmUploadAuth() {
        try {
          await getUploadAuth({ forceRefresh: true })
        } catch (error) {
          console.warn('Upload auth preload failed:', error)
        }
      }

  async function getUploadAuth(options = {}) {
        if (state.uploadAuth && !options.forceRefresh) return state.uploadAuth
        if (!BACKEND_URL) throw new Error(appText[state.lang].uploadAuthErr)
        const result = await postApi('getUploadAuth', {})
        state.uploadAuth = result
        return result
      }

  function buildUploadAuthError(status, message) {
        const error = new Error(message)
        error.status = status
        if (status === 401 || status === 403) {
          error.code = 'UPLOAD_AUTH_EXPIRED'
        }
        return error
      }

  function isUploadAuthExpired(error) {
        if (!error) return false
        if (error.code === 'UPLOAD_AUTH_EXPIRED') return true
        const status = Number(error.status || 0)
        if (status === 401 || status === 403) return true
        const message = String(error.message || '')
        return /unauthoriz|forbidden|invalid_grant|token/i.test(message)
      }

  function isUploadCancelled(error) {
        return Boolean(error && (error.code === 'UPLOAD_CANCELLED' || String(error.message || '').includes('cancel')))
      }

  function isPublicPhotoUpload(fieldKey) {
        return fieldKey === 'thaiPhoto' || fieldKey === 'myPhoto'
      }

  function buildPublicDriveImageUrl(fileId) {
        return `https://lh3.googleusercontent.com/d/${encodeURIComponent(String(fileId || '').trim())}`
      }

  async function makeDriveFilePublic(fileId, accessToken) {
        if (!fileId || !accessToken) return false
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
            allowFileDiscovery: false,
          }),
        })
        if (!response.ok) {
          throw new Error(`Permission update failed (${response.status})`)
        }
        return true
      }

  async function postApi(action, payload) {
        if (!BACKEND_URL) throw new Error(appText[state.lang].uploadAuthErr)
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        try {
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({ action, payload }),
            signal: controller.signal,
            cache: 'no-store',
          })
          const text = await response.text()
          let data = {}
          if (text) {
            try {
              data = JSON.parse(text)
            } catch (error) {
              throw new Error(text)
            }
          }
          if (!response.ok || data.ok === false) {
            throw new Error(data.error || `Request failed (${response.status})`)
          }
          return data.data || data
        } catch (error) {
          if (error && error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.')
          }
          throw error
        } finally {
          window.clearTimeout(timeout)
        }
      }

  function resetFormState() {
        state.uploads = {}
        const form = document.getElementById('application-form')
        if (form) {
          form.reset()
          form.querySelectorAll('input.form-control.hidden').forEach((input) => {
            input.classList.add('hidden')
            input.value = ''
          })
        }

        const dob = document.getElementById('thai-dob')
        if (dob && dob._flatpickr) {
          dob._flatpickr.clear()
        }

        renderAllUploadSlots()
        refreshUserPanel()
      }

  function setSubmitBusy(isBusy) {
        const button = document.getElementById('submit-btn')
        if (!button) return
        button.disabled = isBusy
        button.textContent = isBusy ? appText[state.lang].saving : appText[state.lang].save
      }

  function showLoadingDialog(title, text) {
        if (window.Swal && typeof Swal.fire === 'function') {
          return Swal.fire({
            icon: 'info',
            title,
            text,
            buttonsStyling: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            customClass: getSweetAlertClasses({
              popup: 'app-swal app-swal--loading',
              title: 'app-swal__title',
              htmlContainer: 'app-swal__text',
              actions: 'app-swal__actions',
            }),
            didOpen: () => {
              if (typeof Swal.showLoading === 'function') {
                Swal.showLoading()
              }
            },
          })
        }
        return Promise.resolve()
      }

  function showToast(options = {}) {
        if (window.Swal && typeof Swal.fire === 'function') {
          return Swal.fire({
            toast: true,
            position: 'top-end',
            icon: options.icon || 'info',
            title: options.title || '',
            text: options.text || '',
            showConfirmButton: false,
            timer: options.loading ? undefined : (options.timer || 2000),
            timerProgressBar: !options.loading,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            buttonsStyling: false,
            customClass: getSweetAlertClasses({
              popup: 'app-swal app-swal--toast',
              title: 'app-swal__title',
              htmlContainer: 'app-swal__text',
              loader: 'app-swal__loader',
            }),
            didOpen: () => {
              if (options.loading && typeof Swal.showLoading === 'function') {
                Swal.showLoading()
              }
            },
          })
        }
        return Promise.resolve()
      }

  function closeLoadingDialog() {
        if (window.Swal && typeof Swal.close === 'function') {
          Swal.close()
        }
      }

  function validateThaiAgeFromDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
        const now = new Date()
        let age = now.getFullYear() - date.getFullYear()
        const month = now.getMonth() - date.getMonth()
        if (month < 0 || (month === 0 && now.getDate() < date.getDate())) {
          age -= 1
        }
        return age >= 0 ? String(age) : ''
      }

  function syncThaiAge(date) {
        const ageInput = document.getElementById('thai-age')
        if (ageInput) ageInput.value = validateThaiAgeFromDate(date)
      }

  function formatThaiBuddhistDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        return `${day}/${month}/${date.getFullYear() + THAI_YEAR_OFFSET}`
      }

  function parseThaiBuddhistDate(dateStr) {
        if (typeof dateStr !== 'string') return null
        const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (!match) return null

        const day = Number(match[1])
        const month = Number(match[2])
        const year = Number(match[3])
        const normalizedYear = year >= 2400 ? year - THAI_YEAR_OFFSET : year
        const date = new Date(normalizedYear, month - 1, day)

        if (
          date.getFullYear() !== normalizedYear ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          return null
        }

        return date
      }

  function focusField(field) {
        const map = {
          'thai-gender': 'thai-gender-0',
          'thai-fullName': 'thai-fullName',
          'thai-cardNumber': 'thai-cardNumber',
          'thai-dob': 'thai-dob',
          'thai-age': 'thai-age',
          'thai-education': 'thai-education',
          'thai-education-other': 'thai-education-other',
          'thai-experience': 'thai-experience',
          'thai-skill': 'thai-skill',
          'thai-position': 'thai-position',
          'thai-position-other': 'thai-position-other',
          'thai-shift': 'thai-shift-0',
          'thai-phone': 'thai-phone',
          'my-name': 'my-name',
          'my-cardNumber': 'my-cardNumber',
          'my-gender': 'my-gender-0',
          'my-gender-other': 'my-gender-other',
          'my-shift': 'my-shift-0',
          'my-work-history': 'my-work-history',
        }
        const el = document.getElementById(map[field] || field)
        if (!el || typeof el.focus !== 'function') return null
        return () => el.focus({ preventScroll: false })
      }

  function getValue(id) {
        const el = document.getElementById(id)
        return el && typeof el.value === 'string' ? el.value.trim() : ''
      }

  function getRadioValue(name) {
        const selected = document.querySelector(`input[name="${name}"]:checked`)
        return selected ? selected.value : ''
      }

  function getSelectedOtherAwareValue(groupName, otherId) {
        const selected = getRadioValue(groupName) || getValue(groupName)
        if (!selected) return ''
        if (selected !== 'other') return selected
        return getValue(otherId)
      }

  function confirmDialog(title, text) {
        if (window.Swal && typeof Swal.fire === 'function') {
          return Swal.fire({
            icon: 'question',
            title,
            text,
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: state.lang === 'th' ? 'ยืนยัน' : 'အတည်ပြုမည်',
            cancelButtonText: state.lang === 'th' ? 'ยกเลิก' : 'မလုပ်တော့ပါ',
            reverseButtons: true,
            focusCancel: true,
            customClass: getSweetAlertClasses({
              popup: 'app-swal',
              title: 'app-swal__title',
              htmlContainer: 'app-swal__text',
              actions: 'app-swal__actions',
              confirmButton: 'app-swal__button app-swal__button--primary',
              cancelButton: 'app-swal__button app-swal__button--secondary',
            }),
          }).then((result) => Boolean(result.isConfirmed))
        }
        return Promise.resolve(window.confirm(`${title}\n${text || ''}`))
      }

  function showAlert(icon, title, text) {
        if (window.Swal && typeof Swal.fire === 'function') {
          return Swal.fire({
            icon,
            title,
            text,
            buttonsStyling: false,
            confirmButtonText: 'OK',
            customClass: getSweetAlertClasses({
              popup: 'app-swal',
              title: 'app-swal__title',
              htmlContainer: 'app-swal__text',
              actions: 'app-swal__actions',
              confirmButton: 'app-swal__button app-swal__button--primary',
            }),
          })
        }
        window.alert(`${title}\n${text || ''}`)
        return Promise.resolve()
      }

  function getSweetAlertClasses(classes) {
        return {
          popup: classes.popup || 'app-swal',
          title: classes.title || 'app-swal__title',
          htmlContainer: classes.htmlContainer || 'app-swal__text',
          actions: classes.actions || 'app-swal__actions',
          confirmButton: classes.confirmButton || 'app-swal__button app-swal__button--primary',
          cancelButton: classes.cancelButton || 'app-swal__button app-swal__button--secondary',
          loader: classes.loader || 'app-swal__loader',
        }
      }

  function normalizeErrorMessage(error) {
        if (!error) return ''
        if (typeof error === 'string') return error
        if (error.message) return error.message
        return JSON.stringify(error)
      }

  function formatBytes(bytes) {
        const value = Number(bytes || 0)
        if (value < 1024) return `${value} B`
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
        return `${(value / (1024 * 1024)).toFixed(1)} MB`
      }

  function escapeHtml(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      }

  function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;')
      }

  function getUserInitials(name) {
        const trimmed = String(name || '').trim()
        if (!trimmed) return 'LINE'

        const parts = trimmed.split(/\s+/).filter(Boolean)
        if (parts.length === 1) {
          return parts[0].slice(0, 2).toUpperCase()
        }

        return parts
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join('')
          .toUpperCase()
      }
}) ()
