/**
 * Created by Romkij on 8/3/2016.
 */

handlers.getManifest = function (args) {
    if (!isValid("getManifest", args)) {
        return getHashedResult();
    }

    var data = JSON.parse(args.Data.Payload);

    var key = "AssetBundles";
    var clientVersion = data.ClientVersion;
    var isDebug = data.IsDebug;
    var platform = data.Platform;
    var subTarget = data.SubTarget;

    log.debug(subTarget);

    var internalData = server.GetTitleInternalData({
        Keys: [key]
    });

    if (internalData.Data.hasOwnProperty(key)) {
        internalData = JSON.parse(internalData.Data[key]);
        var currentTimestamp = currentTimeInSeconds();

        var manifests = internalData.Manifests.filter(function (manifest) {
            if (manifest.Platform != platform)
                return false;
            if (manifest.SubTarget != subTarget)
                return false;

            if (isDebug) {
                return manifest.ClientVersion == clientVersion;
            }
            else {
                return manifest.ClientVersion == clientVersion && (manifest.CreatedTimestamp) + internalData.LiveOffset <= currentTimestamp;
            }
        });

        manifests.sort(function (a, b) {
            if (a.Revision > b.Revision)
                return 1;
            if (a.Revision < b.Revision)
                return -1;
            return 0;
        });

        if (manifests.length > 0) {
            var manifest = manifests[manifests.length - 1];
            var manifestKey = internalData.TemplatePath_v2.replace('%client_version%', clientVersion).replace('%platform%', platform).replace('%revision%', manifest.Revision).replace('%subtarget%', subTarget);
            log.debug(manifestKey);

            var url = server.GetContentDownloadUrl({
                Key: manifestKey,
                ThruCDN: false
            }).URL;

            var request = http.request(url, "get", "", "application/json");
            return getHashedResult(JSON.parse(request));
        }
        else {
            return getHashedResult(null);
        }
    }
};