/**
 * Created by xiazhengxin on 2017/4/27.
 */

var http = require("http");
var urlParse = require("url").parse;
var jutil = require("../utils/jutil");
var async = require("async");

function start(postData, response, query) {
    var NAME = "1sdk Login";
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "sdk", "app", "uin", "sess") == false) {
        response.end("1", "utf-8");
        return;
    }
    var sdk = query["sdk"];
    var app = query["app"];
    var uin = query["uin"];
    var sess = query["sess"];

    var url = "http://sync.1sdk.cn/login/check.html";
    url += "?sdk=" + sdk;
    url += "&app=" + app;
    url += "&uin=" + uin;
    url += "&sess=" + sess;
    var urlData = urlParse(url);

    var options = {
        hostname: urlData.hostname,
        port: urlData.port || 80,
        path: urlData.path,
        method: "GET",
        headers: {"Host": "sync.1sdk.cn", "Content-Length": 32}
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var mData = "";
        res.on('data', function (chunk) {
            mData += chunk;
        });
        res.on('end', function () {
            console.log(mData);
            if (mData == "0") {
                response.end("0", "utf-8");
            } else {
                response.end("1", "utf-8");
            }
        });
    });
    req.on("error", function (err) {
        response.end("1", "utf-8");
    });
    req.end();
}

exports.start = start;