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
        response.end(JSON.stringify({"ret": 1, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var platformId = "ljxyzs";
    var orderid = postData["orderid"];
    var uid = postData["uid"];
    var serverid = postData["serverid"];
    var amount = postData["amount"];
    var extra = postData["extra"];
    var args = extra.split("|");//useruid # paymoney # id # orderid
    var ts = postData["ts"];
    var AppKey = platformConfig[platformId]["appKey"];
    var PayKey = platformConfig[platformId]["payKey"];
    var AppId = platformConfig[platformId]["appId"];
    var sign = postData["sign"];
    var sig = postData["sig"];
    var string = PayKey + "amount=" + amount + "&extra=" + extra + "&orderid=" + orderid + "&serverid=" + serverid + "&ts=" + ts + "&uid=" + uid;
    var generateSign = crypto.createHash("md5").update(string).digest("hex");
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sig != generateSign) {
        response.end(JSON.stringify({"ret" : 6 , "msg" : "加密验证失败"}), "utf-8");
    } else {
        order.updateOrder(args[0], args[3], platformId, uid, args[1], amount, 1, ts, args[2], JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order update ok");
                response.end(JSON.stringify({"ret" : 0 , "msg" : "充值成功"}), "utf-8");
            }
            else {
                console.log("order update failed");
                response.end(JSON.stringify({"ret" : 8 , "msg" : err}), "utf-8");
            }
        });
    }
}

exports.start = start;