/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-3-20
 * Time: 下午4:50
 * To change this template use File | Settings | File Templates.
 */
var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var qs = require("querystring");

function check(platformUserId, info, callbackFn) {
    var appId = platformConfig["pp"]["appId"];
    var appKey = platformConfig["pp"]["appKey"];
    var token = info["token"];

    var url = "http://passport_i.25pp.com:8080/index?tunnel-command=2852126756";
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"POST",
        headers:{"Host":"passport_i.25pp.com", "Content-Length":32}
    };

    var req = http.request(options, function(res) {
        var mStatusCode = res.statusCode;
        res.setEncoding('utf8');
        var mData = '';
        res.on('data', function(chunk) {
            mData = "{" + chunk + "}";
        });
        res.on('end', function() {
            var resultData = {};
            try {
                var mDataObj = JSON.parse(mData);
            } catch(err) {
                var mDataObj = {};
            }
        resultData["status"] = mDataObj["status"]
        resultData["username"] = mDataObj["username"];
        resultData["platformUserId"] = mDataObj["userid"];
        console.log(mDataObj);
        console.log(resultData);
            if (mDataObj && mDataObj["status"] == "0")//验证成功
                callbackFn(null, resultData);
            else
                callbackFn("invalidAccount");
        });
    });
    req.on("error", function(err) {
        callbackFn(err);
    });

    req.end(token);
}

exports.check = check;