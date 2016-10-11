/**
 * Created by Romkij on 10/11/2016.
 */

handlers.testEncryption = function (args) {
    //return m;;
    // return args.data;
    var json = JSON.stringify(args.data);
    log.debug(json);
    log.debug(currentPlayerId);
    var hash = CryptoJS.HmacMD5(JSON.stringify(args.data), currentPlayerId);

    return hash.hash;
};