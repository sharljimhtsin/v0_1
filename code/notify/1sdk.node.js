/**
 * Created by xiazhengxin on 2017/4/20.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "1sdk";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "app", "cbi", "ct", "fee", "pt", "sdk", "ssid", "st", "tcd", "uid", "ver", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    var app = query["app"];
    var cbi = query["cbi"];
    var ct = query["ct"];
    var fee = query["fee"];
    var pt = query["pt"];
    var sdk = query["sdk"];
    var ssid = query["ssid"];
    var st = query["st"];
    var tcd = query["tcd"];
    var uid = query["uid"];
    var ver = query["ver"];
    var sign = query["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var md5Sign = genSign(query, key);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign && st == "1") {//是否成功标志，1标示成功，其余都表示失败
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(uid, ssid, NAME, appId, 1, fee / 100, 1, "", cbi, JSON.stringify(query), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("SUCCESS");
                }
            }, null, null, tcd);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end("fail", "utf-8");
            } else {
                response.end("SUCCESS", "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end("fail", "utf-8");
    }
}

function md5_chs(data) {
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    paraList.sort();//按照a-z排序
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string + key);//最后拼接&，再拼接签名密钥后进行MD5计算。
}

exports.start = start;