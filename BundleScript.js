/**
 * Created by Romkij on 8/3/2016.
 */

handlers.getManifest = function (args) {
    var key = "AssetBundles";
    var clientVersion = args.ClientVersion;

    var internalData = server.GetTitleInternalData({
        Keys: [key]
    });

    if (internalData.Data.hasOwnProperty(key)) {
        internalData = JSON.parse(internalData.Data[key]);
        var currentTimestamp = currentTimeInSeconds();

        var manifests = internalData.Manifests.filter(function (manifest) {
            return manifest.ClientVersion == clientVersion && (manifest.CreatedTimestamp) + internalData.LiveOffset <= currentTimestamp;
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
            var manifestKey = internalData.TemplatePath.replace('%client_version%', clientVersion).replace('%revision%', manifest.Revision);

            var url = server.GetContentDownloadUrl({
                Key: manifestKey,
                ThruCDN: false
            });

            return url;
        }
        else {
            return null;
        }
    }
};
