// const DROPBOX_CLIENT_ID = '364w0ljehwtkhao';
// const DROPBOX_CLIENT_SECRET = '31g0rnod5tkrn9n';
// const DROPBOX_REFRESH_TOKEN = 'HcAHgsV_ygkAAAAAAAAAAQnV3R-Jpds0TKS4b-KEjdlzW-5WTwnAmjFXpkHVv91N';

function getDropboxAccessToken() {
  const prop = PropertiesService.getScriptProperties();
  const DROPBOX_CLIENT_ID = prop.getProperty('DROPBOX_CLIENT_ID');
  const DROPBOX_CLIENT_SECRET = prop.getProperty('DROPBOX_CLIENT_SECRET');
  const DROPBOX_REFRESH_TOKEN = prop.getProperty('DROPBOX_REFRESH_TOKEN');
  const url = 'https://api.dropbox.com/oauth2/token';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {
      grant_type: 'refresh_token',
      refresh_token: DROPBOX_REFRESH_TOKEN,
      client_id: DROPBOX_CLIENT_ID,
      client_secret: DROPBOX_CLIENT_SECRET
    }
  });

  const result = JSON.parse(response.getContentText());
  return result.access_token;
}

function uploadToDropbox(blob, fileName) {
  const accessToken = getDropboxAccessToken(); // ดึง Token ใหม่เสมอ
  const url = 'https://content.dropboxapi.com/2/files/upload';

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/octet-stream',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Dropbox-API-Arg': JSON.stringify({
        path: '/test/' + fileName,
        mode: 'add',
        autorename: true
      })
    },
    payload: blob.getBytes()
  });

  const linkResponse = UrlFetchApp.fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    payload: JSON.stringify({ path: '/test/' + fileName })
  });

  const linkData = JSON.parse(linkResponse.getContentText());
  // เปลี่ยน dl=0 เป็น dl=1 เพื่อให้รูปแสดงผลในเว็บทันที (หรือทิ้งไว้ 0 เพื่อให้กดเข้าเว็บ Dropbox)
  Logger.log(linkData.url.replace('dl=0', 'dl=1'))
  return linkData.url.replace('dl=0', 'dl=1');
  Logger.log(JSON.stringify(JSON.parse(response.getContentText()), null, 2));
}

function getLineContent(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU=' }
  });
  return response.getBlob();
}

function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  try {
    const json = JSON.parse(e.postData.contents);
    const { event, data } = json;
    Logger.log('Received event: ' + event);
    Logger.log('Received data: ' + JSON.stringify(data));
  } catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
  }
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

}