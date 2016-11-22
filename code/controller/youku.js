/**
 * Created by xiazhengxin on 2015/2/9 12:22.
 *
 * youku 登录验证接口
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
    return crypto.createHmac('md5', key).update(string).digest("hex");
}

function check(platformUserId, info, callbackFn) {
    var sessionid = info["sessionid"];
    var appkey = platformConfig["youku"]["AppKey"];
    var payKey = platformConfig["youku"]["PayKey"];
    var url = "http://sdk.api.gamex.mobile.youku.com/game/user/infomation";
    var urlData = urlParse(url);
    var postData = {
        "appkey": appkey,
        "sessionid": sessionid
    };
    var sign = genSign(postData, payKey);
    postData["sign"] = sign;

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "POST",
        headers: {"Host": "sdk.api.gamex.mobile.youku.com", "Content-Length": 32}
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
            resultData["uid"] = mDataObj["uid"];
            console.log(mDataObj);
            console.log(resultData);
            if (mStatusCode == "200")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn(null);
        });
    });

    req.on("error", function (err) {
        callbackFn(err);
    });

    req.write(postData + "\n");
    req.end();
}

exports.check = check;
