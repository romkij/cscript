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

function isValid(data, hash) {
    return hash === getHash(data);
}

function getHash(data) {
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacMD5(JSON.stringify(data), currentPlayerId));
}

function getHashedResult(data) {
    return JSON.stringify({
        Data: data,
        Hash: getHash(data)
    });
}