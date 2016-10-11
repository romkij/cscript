/**
 * Created by Romkij on 10/11/2016.
 */

handlers.testEncryption = function (args) {
    //return m;;
    return CryptoJS.HmacMD5(JSON.parse(args.data), currentPlayerId);
};