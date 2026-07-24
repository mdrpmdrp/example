// Logger = BetterLog.useSpreadsheet()
function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  Logger.log(JSON.stringify(e))
  let action = e.parameter.action
  if (action == 'bed') {
    return updateBed(e)
  }
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh = ss.getSheetByName('ชีต1')
  let finder = []
  let lock = LockService.getScriptLock()
  lock.tryLock(5000)
  if (lock.hasLock()) {
    try {
      let dept = e.parameter.dept
      let team = e.parameter.team
      let uid = e.parameter.uid
      let displayName = e.parameter.displayName
      let remark = e.parameter.remark
      let arr = JSON.parse(e.parameter.arr)
      // let arr = e.parameter.arr
      let date = new Date()
      arr = arr.map(a => {
        return [date, a, team, dept, remark, uid, displayName]
      })
      sh.getRange(sh.getLastRow() + 1, 1, arr.length, arr[0].length).setValues(arr)
      let today = Utilities.formatDate(new Date(), 'GPT+7', 'dd/MM/yyyy')
      finder = sh.createTextFinder(today).matchEntireCell(true).findAll()
      finder = finder.filter(range => range.getColumn() == 9).map(range => range.offset(0, -7).getValue())
      finder = [...new Set(finder)]
      Logger.log(finder)
    } catch (error) {
      Logger.log(error)
    } finally {
      lock.releaseLock()
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: finder.length })).setMimeType(ContentService.MimeType.JSON)
}

function doGet(e) {
  let opt = e.parameter.opt
  if (opt == 'searchlocationdata') return getLocation(e.parameter.id)
}

function getLocation(id = '03166') {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh = ss.getSheetByName('ชีต1')
  let data = sh.getDataRange().getValues()
  let regex = new RegExp('.*' + id + '$')
  let res = data.filter(r => {
    return regex.test(r[1])
  }).map(r => [r[0], r[3], r[4], r[6]])
  // sort by date as index 0
  res.sort((a, b) => {
    return b[0] - a[0]
  })
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: res }))
}

function getfirebaseLocation(id = 'PYT3_03166') {
  const props = PropertiesService.getScriptProperties(); // Or .getScriptProperties() if stored in Script Properties
  const [email, key, projectId] = [props.getProperty('client_email'), props.getProperty('private_key'), props.getProperty('project_id')];
  const firestore = FirestoreApp.getFirestore(email, key, projectId);
  let ids
  // let doc = firestore.getDocuments(`PYT3/${id}/location`).orderBy('timestamp', 'desc').limit(1).get()[0]
  let doc = firestore.query(`PYT3/${id}/location`).OrderBy('timestamp', 'desc').Limit(1).Execute()
  let data = doc.reduce((acc, d) => {
    let row = {};
    Object.keys(d.fields).forEach(key => {
      row[key] = d.fields[key].stringValue || d.fields[key].integerValue || d.fields[key].doubleValue || d.fields[key].booleanValue || d.fields[key].timestampValue;
    });
    acc.push(row);
    return acc;
  }, []);
  let dept = data[0].dept || ''
  let remark = data[0].remark || ''
  return [[dept, remark]]
}


function test() {
  let prop = PropertiesService.getScriptProperties()
  prop.setProperty('project_id', 'minion-location')
  prop.setProperty('client_email', 'firebase-adminsdk-oum7b@minion-location.iam.gserviceaccount.com')
  prop.setProperty('private_key', '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC681Be60xNRk5R\nWdKDenXX9evSSbd1HMVcCK0yHrhLNjaZyCfopcGYf56LOZw4IjB7XXcUcgMgq2D8\nAL5Ys87CHhPjjYa4ROdbN3mOB2VQG2I6hfldA3T7K8nXQqS703boU4rhKEk/KwXO\nkxdzqnGFxTQxfJpCgYCDXN3DVy2DZHs4blQKvu5G3e7+cLYJAGtk07186ME8/Izr\n0J1Ko21x28oBTyEcZGaxIfzHSgkIVSwiMK+7HsZgv55+MsGGfFLvCFUpeTfDBk3y\nqoRPp1rcu63hl1osvInglNdVtOoKddZAHO0aWiF0SQXVVOjXdEeqUQ4UHYFQ01Er\nTAKfblvHAgMBAAECggEABel44q+NN6pgAqmVAyxluqEfxoQnRZBV22240GtxR4uc\n2Wsfe/d18lUi1eNKAepu3w/bGq3qVGenBwEdA+AXy0K5PUp19rDTIirUcL3iIdDj\n39bpxlu8IM9HMEP+wqPS0FEIBMvJ2TIKmnhDVxiOQ30zg9cdZ7oBruXKa4l/unZu\nqlmP1fcL+J26XuPQly2H0BcJOmrtv3PqFmzSWi5P+SKtWN6yW4aFdGY69m4sUv20\nt7EPm1ov4F0+bzivSgNWoeNmw12qG+w6TqiLWvOWnJUV1wusMryqMPAavqac7a2x\nIPZUblBNuFYBGmrqYCY+0k5neG1JpOCzliIY33emJQKBgQDe45eQHgW2P/rV7vRz\nograC+5FHFH/i8KAWuLSqEhaQVhdnpjEmgw8189pY8dKS0lr9y/czDJpDv7gG/Yx\ns/WuzxuJVQazuzO3PkFqdP4JGOApu2wCakSPTY8k5aOuhuumv3hrOeoqwElTk2rw\nw2kebnE9E3PEi9fOjmzUtMkWKwKBgQDWuPzJiqlK2AwrsqKtX5g/b+PjC2afzNBe\n6eBLGNrmyigUrc752WF96mhVLOWnrmegIGhcTQLRPRwdAZDNf1FikXAU7AyNGUJo\n5FsEjAvh5P+3w+femG0eItPVTSDJV9wayyG13KQV/7C2GKe5kWdfwzoTubq2gtr3\nbG2pXoG+1QKBgCKzNhZmxibggRGrWP1jneLidp7l0NJDFO3cuHFpZ5I9mB9DIK+C\n+CLEynKy6QTlAbJAUoBCfhqjDgUf9U05oicr8TKJPTjgDSYbGB4VxrLt34A/wIoD\nt1bEEWQCKGB0et2D86Bl7NHpC8FqMvz2vzfQo+qJS72us9Nhkwnud1vvAoGAXkVH\nTqDfJKnn5gN+oomWyTsxnQvzWXNNhG4/+BiIes0Efde1SEJlKCgS+FpG1bCfdFDm\nIKf69axTvHRkg6RDMfhScg0UkZomavDe+QcXbGzizGZpVXQsbA+0WzCKlXtKekT2\nnuao77ObfMckVDd/YC7RP7nKPLkEs55aIwMICaUCgYA3wuUzZYEw1Lil3u1nSAg4\nw8laOXcor5DXYKKVhlZSUek8aPPqJ3n9U8xxPFkMcrMVmHu0lqtb24bV5x3v0Jkh\nejFWtez0chvLRrX6um6x8jkXM1cEkwqZGm5/4YIzMYolNdTqmjF+QgIBJGFdqVBY\ndxHpGSaszwz40NL0nTfqBw==\n-----END PRIVATE KEY-----\n')

}

function updateData(client, id, data) {
  Logger.log(id)
  const props = PropertiesService.getScriptProperties(); // Or .getScriptProperties() if stored in Script Properties
  const [email, key, projectId] = [props.getProperty('client_email'), props.getProperty('private_key'), props.getProperty('project_id')];
  const firestore = FirestoreApp.getFirestore(email, key, projectId);
  firestore.createDocument(`${client}/${id}/location`, data, true);
}

function moveDataToFirebase() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh = ss.getSheetByName('manual update')
  let data = sh.getRange(2, 1, sh.getLastRow(), sh.getLastColumn()).getValues()
  data.forEach(row => {
    if (row[5] == "") return
    let obj = {
      timestamp: row[0],
      code: row[5],
      team: "team PM",
      dept: row[3],
      remark: row[4],
      uid: "Ua5445b23f13ae232bcfaab18d42a2956", //mdrp
      line: 'm.drp',
      name: 'team PM'
    }
    updateData('PYT3', obj.code, obj, true)
  })
}

function updateBed(e) {
  let code = e.parameter.bedId
  let location = e.parameter.roomId
  let name = e.parameter.recorderName
  let obj = {
    timestamp: new Date(),
    code: code,
    team: "แม่บ้าน",
    dept: "",
    remark: location,
    uid: "maid",
    line: name,
    name: name
  }
  updateData('PYT3', code, obj, true)
  return ContentService.createTextOutput(JSON.stringify('ok')).setMimeType(ContentService.MimeType.JSON)
}


function onOpen() {
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Update Location')
    .addItem('Update Data', 'moveDataToFirebase')
    .addToUi();
}