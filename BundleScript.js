/**
 * Created by Romkij on 8/3/2016.
 */


handlers.getManifest = function (args) {
    var clientVersion = args.ClientVersion;

    var internalData = server.GetTitleInternalData({
        Keys: ["AssetBundles"]
    });

    return internalData;
};
