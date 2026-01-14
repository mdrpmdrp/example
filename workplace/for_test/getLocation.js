let email = 'firebase-adminsdk-oum7b@minion-location.iam.gserviceaccount.com'
let projectId = 'minion-location'
let key = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDe1at5ta29A9X0\n4YQ54W7+frve843fNL9ezBysNtP0hIalJg34goOd2bJaWSfl/HiDk6b/od9mjac0\nb6Abi9LQKhbFZBlEucja/qTei4Iv+iA1FB1H6SjDoNxYVsR8qDJyTtFL5kUKF9wO\n6Nq/ad5QgH+10Mg/2Iq3QPBpnZguH+pnRAwYHclN6H/L1YVqah3p65GNWEe0vWbK\n2PDrQDmE9dboa40oRHhDh3iPoWwt1rGtoNJ/UJKSVO446XDmuj6AjKoVCNcLAJdq\n95nGdEGgUEy7UihdfD8+Yx1x4mWteEdaAa91B0nYbMnpBqYlGKzwSpG6UvIwktgq\nsb1+CmrhAgMBAAECggEADJI21Iyykr+A5koDtOU6Jwrcy/DnD9DQvAcdVfzY28pP\nM0lwj9TDGphhtrWhadjirp+ZlAHckdNLe8qRWIR8nehF9RhW0Zj+kxY7FF//9fdx\nMjViioBFn7W3QJeSiarOf8LhDVxeCDn83O13i8Vr+JQrQEVZSrrLZpe4CGlO4Mkq\nsE+cQUhUq6BRFnVc0pSi61BOkqvJP/Ahv5ddgTRzjmjrUoz3Igrr2lVz05KQBFlg\nGIjUBHUC1ZSyYdfSE/d9AHK8O2MRgVbIfks0DedBIiYnIt6RVbgd1IWAvDMpQ3Ch\nbZvTxybkEpMItzZY7Do6MhssEs7lO96zWci7fzGtfQKBgQD2zhYVwLkw1KvaFHG7\nY8+PePiRiCzbFl3Z0wzocGHejoTscNXeOYLAkQX4m6wUDwGSG2A+soaP+apGR31U\nhWe2XwtNGIHfb79UP/J/jY1I1Axx/slV4acnpuhpg6ScKJvVi2mA4THNbLKSr89R\n/XSbF+gHlQg8543llA7IegevfQKBgQDnIvcMw/TTvx5xjyE6vHeXA2CmhzactUP2\ncM3yqg8idF/MH98ZrxGg5kJpFaJjQcoIBLZaIyozKYzv4Z8T04wtQcW51GYV2o43\nuH/k2P/3F0R5pGhD0/8VTBZ5/y2JFWQYm8V9kLBoz5Cmt/CA5X0F9va8n5uLL5Py\n6xq5VddONQKBgHiZS4FloxiRU0hFJS4EH7Bj1FKI0CJeU43U60HJaIlv6tP+bwMf\n5xxhwSEyMGu8yW+zoNwCMG65+NJOrJdYeM1MtCEAELY1zLBGbyCU8qzbsRki/w7Q\nLPXbQUYN5anIzh0S+oLXh5ZxvvCeqBfQWeJPVDogQN5B57x/FJoxxv+hAoGBANyF\nWI2eW/S2UFZqB3shmzvCJjFbqfgjXT8/6s4OADiQLWH0OognprsLVOsrj+4BM78o\nt84R5M5BY0zuxzZETGZVbU9Z3TgWeD+jUKpHexcE5PjlqfCkz6dDG+KzWn+CoCh2\nXhrps9Wby1e1AMoJqZnKQSg/Y0iNUSufsbSHuM7NAoGBAKC46JBEVRFOdLLSmvAz\ngnJfGUL+aEiMYtPLQjIgSLdTEIeGnUwRX3bKG9+tkOV2hrgTEm7doSVpQsRFVmhZ\nXH7adjdOsE4Hmoh7bC4J5Xs3jTxxdRXH25S6Tvy6zo5WNXeISX0HQ6XH+QzckBDt\nbU47VWFEq5R/lZD5+CbMcK1c\n-----END PRIVATE KEY-----\n`
const firestore = FirestoreApp.getFirestore(email, key, projectId);
function collectionGroup(firestore, id, code) {
    const query = firestore.query();
    query.from = [{ collectionId: id, allDescendants: true }];
    query.where = {
        compositeFilter: {
            op: "AND",
            filters: [
                {
                    fieldFilter: {
                        field: { fieldPath: "code" },
                        op: "GREATER_THAN_OR_EQUAL",
                        value: { stringValue: "PYT3" }
                    }
                },
                {
                    fieldFilter: {
                        field: { fieldPath: "code" },
                        op: "EQUAL",
                        value: { stringValue: code }
                    }
                }
            ]
        }
    }
    return query;
}

function getKeyData(d, key) {
    let stringValue = d.fields[key].stringValue
    let integerValue = d.fields[key].integerValue
    let doubleValue = d.fields[key].doubleValue
    if (stringValue) return stringValue
    else if (integerValue) return integerValue
    else if (doubleValue) return doubleValue
}

function LASTSEEN(code = "PYT3_07732") {
    let data = collectionGroup(firestore, 'location', code)
        .Execute();
    if(data.length <= 0) return ""
    data = data.map(d => {
        return {
            dept: getKeyData(d, 'dept'),
            remark: getKeyData(d, 'remark'),
            timeStamp: d.createTime,
        }
    }).sort((a, b) => b.timeStamp - a.timeStamp)

    data = data[0]
    return `${data.dept} - ${data.remark}`
}