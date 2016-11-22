var fs = require("fs");
var resolve = require("path").resolve;

var appJSON = {
    "verCode": 3,
    "verName": "dragonball",
    "size":64603054,
    "downUrl":"http://dragonballsrc.gametrees.com/p91/v1405test/dragonball.apk"
}
var echoString = JSON.stringify(appJSON, null,2);

var whitelist = null;

var stringCache = {};
var _time = 0;


function start(postData, response, query) {

    var udid = String(query["udid"]).toLocaleUpperCase();
    var p = query["p"];
    if (Date.now() - _time > 120000) {
        _time = Date.now();
        clear();
    }

    var echoString = null;
    try {
        var pName = "a91";
        if (udid != null && whitelist.indexOf(udid) != -1) {
            pName = p + "_test";
        } else {
            pName = p == null ? pName : p;
        }

        if (stringCache[pName] != null) {
            echoString = stringCache[pName];
        } else {
            var mPath = resolve(__dirname, "../../config/version/" + pName + "_apk.json");
            echoString = fs.readFileSync(mPath, "utf-8");
            if(pName == "kingnetUpdate" && query["packetName"]) {
                var echoObj = JSON.parse(echoString);
                var packetName = query["packetName"];
                var item = (packetName != null && echoObj[packetName] != null)? echoObj[packetName] : echoObj["default"];
                echoString = JSON.stringify(item);
            }
            stringCache[pName] = echoString;
        }
    } catch (err) {
        console.log(err);
    }
    response.end(echoString, "utf-8");
}

function clear() {
    var mPath = resolve(__dirname, "../../config/version/whitelist.json");
    var whitelistFile = fs.readFileSync(mPath, "utf-8");
    whitelist = JSON.parse(whitelistFile);
    stringCache = {};
}

exports.start = start;