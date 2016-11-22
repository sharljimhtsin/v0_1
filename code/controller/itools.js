var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var qs = require("querystring");

function check(platformUserId, info, callbackFn) {
    if (info == null || info["platformToken"] == undefined) {
        callbackFn("invalidAccount", 0);
        console.log("itools_login", "invalidAccount");
        return;
    }

    console.log("itools_login", JSON.stringify(info));

    var appId = platformConfig["itools"]["appId"];
    var sessionid = info["platformToken"];

    var rawStr = "appid="+appId+"&sessionid="+sessionid;
    var sign = crypto.createHash('md5').update(rawStr).digest('hex');
    var url = "https://pay.slooti.com/?r=auth/verify&appid="+appId+"&sessionid="+sessionid+"&sign="+sign;
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"GET"
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');

        var mData = '';
        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            try {
                var mDataObj = JSON.parse(mData);
            } catch(err){
                callbackFn("invalidAccount");
                return;
            }

            console.log("itools_login",mData);

            if (mDataObj &&  mDataObj["status"]!=undefined && mDataObj["status"] == "success")
                callbackFn(null, null);
            else
                callbackFn("invalidAccount");
        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    req.end();
}

exports.check = check;