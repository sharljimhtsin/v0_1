/**
 * Created by xiazhengxin on 2015/2/6 18:08.
 *
 * lj快用登录验证接口
 */

var http = require("http");
var urlParse = require("url").parse;
var jutil = require("../utils/jutil");
var crypto = require("crypto");
var platformConfig = require("../../config/platform");

function genSign(string, key) {
    return crypto.createHash('md5').update(string + key).digest('hex');
}

function check(platformUserId, info, callbackFn) {
    console.log("info is " + JSON.stringify(info));
    var session = info["seesion"];
    var AppKey = platformConfig["ljkuaiyong"]["AppKey"];
    var url = "http://f_signin.bppstore.com/loginCheck.php";
    var sign = genSign(AppKey, session);
    url += "?tokenKey=" + session + "&sign=" + sign;
    console.log("url is " + url);
    var urlData = urlParse(url);

    var options = {
        hostname: urlData.hostname,
        port: urlData.port,
        path: urlData.path,
        method: "GET",
        headers: {}
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var mData = '';
        res.on('data', function (chunk) {
            mData = chunk;
        });
        res.on('end', function () {
            var resultData = {};
            try {
                console.log(mData);
                var mDataObj = JSON.parse(mData);
            } catch (err) {
                var mDataObj = {};
            }
            resultData["code"] = mDataObj["code"];
            resultData["msg"] = mDataObj["msg"];
            resultData["data"] = mDataObj["data"];
            console.log(resultData);
            var msg = {"1": "param err", "2": "invalid tokenKey", "3": "timeout", "4": "app err", "5": "sign err"};
            if (mDataObj && mDataObj["code"] == "0") {//验证成功
                resultData["platformUserId"] = mDataObj["data"]["guid"];
                callbackFn(null, resultData);
            } else {
                callbackFn(msg[mDataObj["code"]]);
            }
        });
    });

    req.on("error", function (err) {
        callbackFn(err);
    });
    req.end();
}

exports.check = check;
