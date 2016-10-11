/**
 * Created by Romkij on 10/11/2016.
 */

handlers.testEncryption = function (args) {
    //return m;;
    return args.data;
    return CryptoJS.HmacMD5(JSON.stringify(args.data), currentPlayerId);
};