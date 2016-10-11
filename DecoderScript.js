/**
 * Created by Romkij on 10/11/2016.
 */

handlers.testEncryption = function (args) {
    var json = JSON.stringify(args.data);

    var words = CryptoJS.HmacMD5(JSON.stringify(args.data), currentPlayerId);
    var hash = CryptoJS.enc.Base64.stringify(words);


    var fdss = CryptoJS.enc.Base64.parse(hash);

    return {
        before: words,
        after: fdss
    };

    if (hash === args.hash);

    return true;
};