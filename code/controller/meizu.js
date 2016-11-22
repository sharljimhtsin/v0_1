/**
 * Created by xiazhengxin on 2015/2/6 18:08.
 *
 * 魅族登录验证接口
 */

var http = require("http");
var urlParse = require("url").parse;
var jutil = require("../utils/jutil");
var crypto = require("crypto");
var platformConfig = require("../../config/platform");

function genSign(paraList, key) {
    var string = "";
    for (var para in para) {
        var value = paraList[para];
        if (para == "sign" || para == "sign_type" || value == "") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 2);
    return crypto.createHash('md5').update(string + ":" + key).digest('hex');
}

function check(platformUserId, info, callbackFn) {
    var session_id = info["session_id"];
    var uid = info["uid"];
    var app_id = "";
    var ts = jutil.now();
    var sign_type = "md5";
    var key = platformConfig["meizu"]["AppSecret"];
    var url = "https://api.game.meizu.com/game/security/checksession";
    var urlData = urlParse(url);
    var postData = {
        "app_id": app_id,
        "session_id": session_id,
        "ts": ts,
        "uid": uid,
        "sign_type": sign_type,
        "sign": sign
    };
    var sign = genSign(postData, key);
    postData["sign"] = sign;

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "POST",
        headers: {"Host": "api.game.meizu.com", "Content-Length": 32}
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
            resultData["code"] = mDataObj["code"]
            resultData["message"] = mDataObj["message"];
            resultData["value"] = mDataObj["value"];
            console.log(mDataObj);
            console.log(resultData);
            var msg = {"198001": "invalidApp", "198005": "invalidAccount", "100000": "timeout"};
            if (mDataObj && mDataObj["code"] == "200")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn(msg[mDataObj["code"]]);
        });
    });

    req.on("error", function (err) {
        callbackFn(err);
    });

    req.write(postData + "\n");
    req.end();
}

exports.check = check;
