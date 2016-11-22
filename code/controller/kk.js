/**
 * Created by apple on 14-4-30.
 */
var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var jutil = require("../utils/jutil");
var platformConfig = require("../../config/platform");


function check(platformUserId, info, callbackFn) {
    console.log(platformUserId, info)

    if (info == null || info["token"] == null) {
        callbackFn("invalidAccount1", 0);
        console.log("kk", "invalidAccount");
        return;
    }

    var appKey = platformConfig["kk"]["appKey"];
    var oauth_token = info["token"];
    var oauth_nonce = jutil.now()*Math.ceil(Math.random()*10);
    var url = "http://thapi.nearme.com.cn/account/GetUserInfoByGame?oauth_consumer_key=" + appKey + "&oauth_nonce=" + oauth_nonce + "&oauth_token="+oauth_token+"&oauth_signature_method=HMAC-SHA1&oauth_timestam=" + jutil.now() + "&oauth_version=1.0";
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"GET"
    };

    var req = http.request(options, function(res) {
        var mStatusCode = res.statusCode;
        res.setEncoding('utf8');
        var mData = '';
        var sTime = Date.now();

        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            var mTime = Date.now() - sTime;
            try {
                var mDataObj = JSON.parse(mData);

                if (mDataObj && mDataObj["BriefUser"] != undefined && mDataObj["BriefUser"]["id"] == platformUserId)//验证成功
                    callbackFn(null, null);
                else
                    callbackFn("invalidAccount");
            }catch(e) {
                callbackFn("invalidAccount");
            }
        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    req.end();
}

exports.check = check;