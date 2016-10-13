/**
 * Created by Romkij on 10/11/2016.
 */

// Additional functionality.
function currentTimeInSeconds() {
    var now = new Date();
    return Math.floor(now.getTime() / 1000);
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function getTitleData(key) {
    var titleData = server.GetTitleData({
        Keys: [key]
    });

    if (titleData.Data.hasOwnProperty(key))
        return JSON.parse(titleData.Data[key])
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0 && JSON.stringify(obj) === JSON.stringify({});
}


function getCalculationType(fullname, settings) {
    var statSettings = getSettingsByFullName(fullname, settings);

    if (typeof statSettings != "undefined") {
        return getCalculationTypeByFullName(fullname, statSettings.Info);
    }
}

function getSettingsByFullName(fullName, settings) {
    for (var i = 0; i < settings.length; i++) {
        var stat = settings[i];

        if (Contains(fullName, stat.Name))
            return stat;
    }
}

function getCalculationTypeByFullName(fullName, statInfo) {
    for (var i = 0; i < statInfo.length; i++) {
        var info = statInfo[i];

        if (Contains(fullName, info.CollectionType))
            return info.CalculateType;
    }
}

function Contains(a, b) {
    return a.indexOf(b) >= 0;
}

function isValid(action, message) {
    var data = message.Data;
    var hash = message.Hash;

    // log.debug(data);
    var timestamp = data.Timestamp;

    return isHashValid(data, hash) && checkTimestamp(action, timestamp);
}

function isHashValid(data, hash) {
    return hash === getHash(data);
}

function getHash(data) {
    if (typeof data !== 'string') {
        data = JSON.stringify(data);
    }

    var hash = CryptoJS.enc.Base64.stringify(CryptoJS.HmacMD5(data, currentPlayerId));

    return hash;
}

function getHashedResult(data) {
    var preparedData = {
        Payload: data,
        Timestamp: currentTimeInSeconds()
    };

    var result = {
        Data: {
            Payload: JSON.stringify(data),
            Timestamp: currentTimeInSeconds()
        }
    };

    result.Hash = getHash(result.Data);

    return result;
}

function checkTimestamp(action, clientTimestamp) {
    var serverTimestamp = 0;
    var SECURITY_KEY = "Security";

    var data = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["Security"]
    });

    if (data.Data.hasOwnProperty(SECURITY_KEY)) {
        data = JSON.parse(data.Data[SECURITY_KEY].Value);
        if (data.hasOwnProperty(action)) {
            serverTimestamp = parseInt(data[action]);
            clientTimestamp = parseInt(clientTimestamp);
        }
    } else {
        data = {};
    }

    if (clientTimestamp > serverTimestamp) {
        data[action] = clientTimestamp;
        server.UpdateUserInternalData({
            PlayFabId: currentPlayerId,
            Data: {
                "Security": JSON.stringify(data)
            }
        });
    } else {
        data[action] = serverTimestamp;
    }

    return data[action] != serverTimestamp;
}