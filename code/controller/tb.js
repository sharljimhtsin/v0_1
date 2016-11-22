/**
 * Created by apple on 14-2-9.
 */
var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    var appId = platformConfig["tb"]["appId"];
    var sessionId = info["session"];

    var url = "http://tgi.tongbu.com/checkv2.aspx?k=" + sessionId;
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"GET"
    };

    var req = http.request(options, function(res) {
        console.log("options: " + JSON.stringify(options));
        res.setEncoding('utf8');
        var mData;
        var resultData = {};

        res.on('data', function(chunk) {
            mData = chunk;
        });
        res.on('end', function() {
            if (mData > 0)//验证成功
            {
                resultData["platformUserId"] = mData;
                callbackFn(null, resultData);
            }else if(mData == 0){
                callbackFn("invalidAccount");
            }else{
                console.log("token格式错误");
                callbackFn(null);
            }

        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    req.end();
}

exports.check = check;