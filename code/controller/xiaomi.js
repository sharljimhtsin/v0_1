/**
 * Created by xiazhengxin on 2015/5/20 11:21.
 *
 * 小米登录验证接口
 */

var http = require("http");
var urlParse = require("url").parse;
var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var Buffer = require('buffer').Buffer;

function check(platformUserId, info, callbackFn) {
    var appId = info["appId"];
    var session = info["session"];
    var uid = info["uid"];
    var url = "http://mis.migc.xiaomi.com/api/biz/service/verifySession.do";
    var appIdd = platformConfig["xiaomi"]["appId"];
    var appKey = platformConfig["xiaomi"]["appKey"];
    var app_secret = platformConfig["xiaomi"]["app_secret"];
    var string = "appId=" + appId + "&session=" + session + "&uid=" + uid;
    var generateSign = crypto.createHmac('sha1', app_secret).update(new Buffer(string)).digest('hex');
    var urlData = urlParse(url + "?" + string + "&signature=" + generateSign);

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "GET",
        headers: {"Host": "mis.migc.xiaomi.com", "Content-Length": 32}
    };

    var req = http.request(options, function (res) {
        var mStatusCode = res.statusCode;
        res.setEncoding('utf8');
        var mData = '';
        res.on('data', function (chunk) {
            mData = "{" + chunk + "}";
        });
        res.on('end', function () {
            var resultData = {};
            try {
                var mDataObj = JSON.parse(mData);
            } catch (err) {
                var mDataObj = {};
            }
            resultData["errcode"] = mDataObj["errcode"]
            resultData["errMsg"] = mDataObj["errMsg"];
            console.log(mDataObj);
            console.log(resultData);
            var msg = {1515: "appId err", 1516: "uid err", 1520: "session err", 1525: "signature err"};
            if (mDataObj && mDataObj["errcode"] == "200")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn(msg[mDataObj["errcode"]]);
        });
    });
    req.on("error", function (err) {
        callbackFn(err);
    });

    req.end();
}

exports.check = check;