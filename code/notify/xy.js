/**
 * Created by xiazhengxin on 2015/3/5 16:12.
 *
 * xy充值平台,充值购买验证.
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    console.log("xy......." + JSON.stringify(postData));
    console.log(JSON.stringify(query));
    if (jutil.postCheck(postData, "orderid", "uid", "serverid", "amount", "extra", "ts", "sign", "sig") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var orderid = postData["orderid"];
    var uid = postData["uid"];
    var serverid = postData["serverid"];
    var amount = postData["amount"];
    var extra = postData["extra"];
    var args = extra.split("#");//useruid # paymoney # id # orderid
    var ts = postData["ts"];
    var AppKey = platformConfig["xy"]["AppKey"];
    var PayKey = platformConfig["xy"]["PayKey"];
    var AppId = platformConfig["xy"]["AppId"];
    var sign = postData["sign"];
    var sig = postData["sig"];
    var string = PayKey + "amount=" + amount + "&extra=" + extra + "&orderid=" + orderid + "&serverid=" + serverid + "&ts=" + ts + "&uid=" + uid;
    var generateSign = crypto.createHash("md5").update(string).digest("hex");
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sig != generateSign) {
        console.log("sign not match");
        response.end("fail", "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(args[0], args[3], "xy", AppId, 1, args[1], 1, "", args[2], JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order update ok");
                response.end("success", "utf-8");
            }
            else {
                console.log("order update failed");
                response.end("fail", "utf-8");
            }
        });
    }
}

exports.start = start;