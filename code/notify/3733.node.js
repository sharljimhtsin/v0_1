/**
 * Created by xiazhengxin on 2017/3/24.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "3733";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    postData = JSON.parse(Object.keys(postData)[0]);// 处理特殊 HTTP_RAW_POST_DATA 数据
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "order_id", "mem_id", "app_id", "money", "order_status", "paytime", "attach", "sign") == false) {
        response.end("FAILURE", "utf-8");
        return;
    }
    var order_id = postData["order_id"];
    var mem_id = postData["mem_id"];
    var app_id = postData["app_id"];
    var money = postData["money"];
    var order_status = postData["order_status"];
    var paytime = postData["paytime"];
    var attach = postData["attach"];
    var sign = postData["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var md5Sign = genSign(postData, key);
    var args = attach.split("_");//UserUid_订单号_档位
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign && order_status == "2") {//1  未 支付 2 成功支付 3 支付失败
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(args[0], args[1], NAME, appId, 1, money, 1, "", args[2], JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, order_id);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end("FAILURE", "utf-8");
            } else {
                response.end("SUCCESS", "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end("FAILURE", "utf-8");
    }
}

function md5_chs(data) {
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    paraList["app_key"] = key;
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string);
}

exports.start = start;