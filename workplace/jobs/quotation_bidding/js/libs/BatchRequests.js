/**
 * GitHub  https://github.com/tanaikech/BatchRequest<br>
 * Run BatchRequest<br>
 * @param {Object} Object Object
 * @return {Object} Return Object
 */
function Do(object) {
    return new BatchRequest(object).Do();
}

/**
 * Run enhanced "Do" method of BatchRequest. Requests more than 100 can be used and the result values are parsed.<br>
 * @param {Object} Object Object
 * @return {Object} Return Object
 */
function EDo(object) {
    return new BatchRequest(object).EDo();
}

/**
 * Get batch path for using batch requests. On August 12, 2020, in order to use batch requests, the batch path is required to be used to the endpoint of the batch requests..<br>
 * @param {string} name Name of Google API you want to use. For example, when you want to use Drive API, please put "drive".
 * @param {string} version Version of Google API you want to use. For example, when you want to use Drive API v2, please put "v2". When this is not used, the latest version is used as the default.
 * @return {Object} Return Object
 */
function getBatchPath(name, version) {
    return new BatchRequest('getBatchPath').getBatchPath(name, version);
}

(function (root) {
    var BatchRequest;
    BatchRequest = (function () {
        var createRequest, parser, parserAsBinary, splitByteArrayBySearchData;

        BatchRequest.name = 'BatchRequest';

        function BatchRequest(p_) {
            var batchPath, batchPathInput;
            if (typeof p_ === 'object') {
                if (!p_.hasOwnProperty('requests')) {
                    throw new Error("'requests' property was not found in object.");
                }
                this.p = p_.requests.slice();
                this.url = 'https://www.googleapis.com/batch';
                if (p_.batchPath) {
                    batchPathInput = p_.batchPath.trim();
                    batchPath = '';
                    if (~batchPathInput.indexOf('batch/')) {
                        batchPath = batchPathInput.replace('batch', '');
                    } else {
                        batchPath = batchPathInput.slice(0, 1) === '/' ? batchPathInput : '/' + batchPathInput;
                    }
                    this.url += batchPath;
                }
                this.at = p_.accessToken || ScriptApp.getOAuthToken();
                this.lb = '\r\n';
                this.boundary = 'xxxxxxxxxx';
                this.useFetchAll = 'useFetchAll' in p_ ? p_.useFetchAll : false;
                this.exportDataAsBlob = 'exportDataAsBlob' in p_ ? p_.exportDataAsBlob : false;
            }
        }

        BatchRequest.prototype.Do = function () {
            var errorHolder, params, response;
            try {
                params = createRequest.call(this, this.p);
                response = UrlFetchApp.fetch(this.url, params);
            } catch (error) {
                errorHolder = error;
                throw new Error(errorHolder);
            }
            return response;
        };

        BatchRequest.prototype.EDo = function () {
            var errorHolder, i, limit, params, requests, response, responses, splitCount;
            try {
                if (this.useFetchAll) {
                    limit = 100;
                    splitCount = Math.ceil(this.p.length / limit);
                    requests = [];
                    for (i = 0; i < splitCount; i += 1) {
                        params = createRequest.call(this, this.p.splice(0, limit));
                        params.url = this.url;
                        requests.push(params);
                    }
                    responses = UrlFetchApp.fetchAll(requests);
                    response = responses.reduce(function (accumulator, item) {
                        var parsed;
                        if (item.getResponseCode() !== 200) {
                            accumulator.push(item.getContentText());
                        } else {
                            parsed = this.exportDataAsBlob ? parserAsBinary.call(this, item) : parser.call(this, item.getContentText());
                            accumulator = accumulator.concat(parsed);
                        }
                        return accumulator;
                    }.bind(this), []);
                } else {
                    limit = 100;
                    splitCount = Math.ceil(this.p.length / limit);
                    response = [];
                    for (i = 0; i < splitCount; i += 1) {
                        params = createRequest.call(this, this.p.splice(0, limit));
                        responses = UrlFetchApp.fetch(this.url, params);
                        if (responses.getResponseCode() !== 200) {
                            response.push(responses.getContentText());
                        } else {
                            response = response.concat(this.exportDataAsBlob ? parserAsBinary.call(this, responses) : parser.call(this, responses.getContentText()));
                        }
                    }
                }
            } catch (error) {
                errorHolder = error;
                throw new Error(errorHolder);
            }
            return response;
        };

        BatchRequest.prototype.getBatchPath = function (name, version) {
            var batchPath, discoveryRestUrl, response1, response2, url, values1, values2;
            version = version === void 0 ? '' : version;
            if (!name) {
                throw new Error('Please set API name you want to search.');
            }
            url = 'https://www.googleapis.com/discovery/v1/apis?preferred=' + (version ? 'false' : 'true') + '&name=' + encodeURIComponent(name.toLowerCase());
            response1 = UrlFetchApp.fetch(url, {
                muteHttpExceptions: true
            });
            if (response1.getResponseCode() !== 200) {
                throw new Error('Batch path cannot be found.');
            }
            values1 = JSON.parse(response1.getContentText());
            if (!values1.items) {
                throw new Error('Batch path cannot be found.');
            }
            discoveryRestUrl = ((version.toString() === '' ? values1.items[0] : values1.items.filter(function (item) {
                return item.version === version;
            })[0]) || {}).discoveryRestUrl;
            if (!discoveryRestUrl) {
                throw new Error('Batch path cannot be found.');
            }
            response2 = UrlFetchApp.fetch(discoveryRestUrl, {
                muteHttpExceptions: true
            });
            if (response2.getResponseCode() !== 200) {
                throw new Error('Batch path cannot be found.');
            }
            values2 = JSON.parse(response2.getContentText());
            batchPath = values2.batchPath;
            return batchPath;
        };

        parser = function (content) {
            var regex, temp;
            temp = content.split('--batch');
            regex = /{[\S\s]+}/g;
            if (!content.match(regex)) {
                return content;
            }
            return temp.slice(1, temp.length - 1).map(function (item) {
                if (regex.test(item)) {
                    return JSON.parse(item.match(regex)[0]);
                }
                return item;
            });
        };

        splitByteArrayBySearchData = function (baseData_, searchData_) {
            var byteLength, index, result, search;
            search = searchData_.join('');
            byteLength = searchData_.length;
            result = [];
            index = 0;
            while (index !== -1) {
                index = baseData_.findIndex(function (_, i, values) {
                    return Array(byteLength).fill(null).map(function (_, j) {
                        return values[j + i];
                    }).join('') === search;
                });
                if (index !== -1) {
                    result.push(baseData_.splice(0, index));
                    baseData_.splice(0, byteLength);
                } else {
                    result.push(baseData_.splice(0));
                }
            }
            return result;
        };

        parserAsBinary = function (response) {
            var baseData, blobs, check, parsed, search, searchData;
            check = response.getContentText().match(/--batch.*/);
            if (!check) {
                throw new Error('Valid response value is not returned.');
            }
            search = check[0];
            baseData = response.getContent();
            searchData = Utilities.newBlob(search).getBytes();
            parsed = splitByteArrayBySearchData.call(this, baseData, searchData);
            parsed.shift();
            parsed.pop();
            blobs = parsed.map(function (item, index) {
                var chunks, data, dataSize, metadata;
                chunks = splitByteArrayBySearchData.call(this, item, [13, 10, 13, 10]);
                data = chunks.pop();
                metadata = Utilities.newBlob(chunks.flat()).getDataAsString();
                dataSize = Number(metadata.match(/Content-Length:(.*)/)[1]);
                return Utilities.newBlob(data.splice(0, dataSize)).setName('blob' + (index + 1));
            }, this);
            return blobs;
        };

        createRequest = function (requests) {
            var contentId, data, errorHolder, params;
            try {
                contentId = 0;
                data = '--' + this.boundary + this.lb;
                requests.forEach(function (request) {
                    data += 'Content-Type: application/http' + this.lb;
                    data += 'Content-ID: ' + (++contentId) + this.lb + this.lb;
                    data += request.method + ' ' + request.endpoint + this.lb;
                    data += request.accessToken ? 'Authorization: Bearer ' + request.accessToken + this.lb : '';
                    data += request.requestBody ? 'Content-Type: application/json; charset=utf-8' + this.lb + this.lb : this.lb;
                    data += request.requestBody ? JSON.stringify(request.requestBody) + this.lb : '';
                    data += '--' + this.boundary + this.lb;
                }, this);
                params = {
                    muteHttpExceptions: true,
                    method: 'post',
                    contentType: 'multipart/mixed; boundary=' + this.boundary,
                    payload: Utilities.newBlob(data).getBytes(),
                    headers: {
                        Authorization: 'Bearer ' + this.at
                    }
                };
            } catch (error) {
                errorHolder = error;
                throw new Error(errorHolder);
            }
            return params;
        };

        return BatchRequest;
    })();

    root.BatchRequest = BatchRequest;
})(this);