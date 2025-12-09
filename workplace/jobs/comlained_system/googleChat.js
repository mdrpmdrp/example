/*
  * Sends a text message to a Google Chat space via webhook.
  * @param {string} message - The message text to send
  * @return {void}
  */
function sendGoogleChatText(payload) {
  const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAQAkVhSb3o/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=yaB6o1xAMKLbwhYidCGL15FveIF2Yi_pKeSJ8K-MNCk'; // <-- ของคุณ
  
  const res = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}