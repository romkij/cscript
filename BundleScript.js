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
        var internalData = JSON.parse(internalData.Data[key]);
        var liveOffset = internalData.LiveOffset;

        var manifests = internalData.Manifests.filter(function (manifest) {
            return manifest.ClientVersion == clientVersion && (manifest.CreatedTimestamp) + liveOffset <= currentTimeInSeconds();
        });

        manifests.sort(function (a, b) {
            if (a.Revision > b.Revision)
                return 1;
            if (a.Revision < b.Revision)
                return -1;
            return 0;
        });

        if (manifests.length > 0)
            return manifests[manifests.length - 1];
        else
            return null;
    }
};