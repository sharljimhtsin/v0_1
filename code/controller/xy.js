/**
 * Created by xiazhengxin on 2015/3/4 21:24.
 *
 * xy 登录验证接口
 */

var http = require("http");
var urlParse = require("url").parse;
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    var token = info["token"];
    var uid = info["uid"];
    var appid = platformConfig["xy"]["AppId"];
    var url = "http://passport.xyzs.com/checkLogin.php";
    var urlData = urlParse(url);
    var postData = {
        "uid": uid,
        "appid": appid,
        "token": token
    };

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "POST",
        headers: {"Host": "passport.xyzs.com", "Content-Length": 32}
    };

    var req = http.request(options, function (res) {
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
            resultData["ret"] = mDataObj["ret"]
            resultData["error"] = mDataObj["error"];
            console.log(mDataObj);
            console.log(resultData);
            var msg = {2: "invalidUid", 20: "invalidAppId", 997: "invalidToken", 999: "invalidCode"};
            if (mDataObj && mDataObj["ret"] == "0")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn(msg[mDataObj["ret"]]);
        });
    });
    req.on("error", function (err) {
        callbackFn(err);
    });

    req.write(postData + "\n");
    req.end();
}

exports.check = check;
