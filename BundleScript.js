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
        var manifests = JSON.parse(internalData.Data[key]).Manifests.filter(function (manifest) {
            return manifest.ClientVersion == clientVersion;
        });

        manifests.sort(function (a, b) {
            if (a.Revision > b.Revision)
                return 1;
            if (a.Revision < b.Revision)
                return -1;
            return 0;
        });

        return manifests;

        // manifests.some(function (manifest, i, array) {
        //
        // })
    }
};