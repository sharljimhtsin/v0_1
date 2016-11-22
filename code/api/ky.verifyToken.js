/**
 * Created by apple on 14-4-11.
 */

var jutil = require("../utils/jutil");
var urlParse = require("url").parse;
var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var http = require("http");
var redis = require("../alien/db/redis");
var platformConfig = require("../../config/platform");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"token") == false) {
        response.echo("ky.verifyToken",jutil.errorInfo("postError"));
        return;
    }
    var token = postData["token"];
    var appKey = platformConfig["ky"]["appKey"];
    var rawStr = appKey + token;
    var sign = crypto.createHash('md5').update(rawStr).digest('hex');
    var platformId = postData["platformId"] || "ky";
    if (platformConfig[platformId] == null) {
        response.echo("ky.verifyToken",jutil.errorInfo("postError"));
        return;
    }
    var country = platformConfig[platformId]["country"];

    var url = "http://f_signin.bppstore.com/loginCheck.php?tokenKey=" + token + "&sign=" + sign;
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
            console.log(mData);
            try {
                var returnObj = JSON.parse(mData);//{"code":0,"msg":"\u53c2\u6570\u9519\u8bef", "data":{"guid":"s1234567890","username":"testUser"}}
            } catch (err) {
                var returnObj = {};
            }
            if (returnObj["data"] == null) returnObj["data"] = {};
            var platformToken = jutil.randomString();
            redis.login(country).s("platformToken:" + returnObj["data"]["guid"]).set(platformToken);
            returnObj["platformToken"] = platformToken;
            response.echo("ky.verifyToken",returnObj);
        });
    });

    req.on("error", function(err) {
        response.echo("ky.verifyToken",{"code":1000});
    });

    req.end();
}

exports.start = start;