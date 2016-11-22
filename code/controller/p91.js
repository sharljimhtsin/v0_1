/**
 * Created by apple on 14-2-9.
 */
var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    var appId = platformConfig["p91"]["appId"];
    var appKey = platformConfig["p91"]["appKey"];
    var rawStr = appId + "4" + platformUserId + info["session"] + appKey;
    var sign = crypto.createHash('md5').update(rawStr).digest('hex');
//    console.log(sign);
    var url = "http://service.sj.91.com/usercenter/AP.aspx?AppId=" + appId + "&Act=4&Uin=" + platformUserId + "&sessionId=" + info["session"] + "&Sign=" + sign;
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
            } catch(err){
                callbackFn("invalidAccount");
                return;
            }

            console.log("time:" + mTime);
//            console.log(mData);
            //ErrorCode:(0=失败,1=成功(SessionId 有效),2= AppId 无效,3= Act 无效,4=参数无效,5= Sign 无效,11=SessionId 无效)
            if (mDataObj && mDataObj["ErrorCode"] == "1")//验证成功
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