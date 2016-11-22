/**
 * Created by xiazhengxin on 2015/1/30 21:16.
 *
 * 登录验证 爱思服务器
 */

var http = require("http");
var urlParse = require("url").parse;

function check(platformUserId, info, callbackFn) {
    var token = info["token"];
    //https://pay.i4.cn/member_third.action?token=b6ed01d7414945aa81e17cf607b3f5fb
    var url = "https://pay.i4.cn/member_third.action?token=" + token;
    var urlData = urlParse(url);

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "GET",
        headers: {"Host": "pay.i4.cn", "Content-Length": 32}
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
            resultData["status"] = mDataObj["status"]
            resultData["username"] = mDataObj["username"];
            resultData["platformUserId"] = mDataObj["userid"];
            console.log(mDataObj);
            console.log(resultData);
            var msg = {1: "invalidToken", 2: "invalidAccount", 3: "timeout"};
            if (mDataObj && mDataObj["status"] == "0")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn(msg[mDataObj["status"]]);
        });
    });
    req.on("error", function (err) {
        callbackFn(err);
    });

    req.end(token);
}

exports.check = check;