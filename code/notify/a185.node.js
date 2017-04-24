/**
 * Created by xiazhengxin on 2017/2/27.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "185";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "username", "amount", "rmb", "serverid", "product_id", "orderno", "sign") == false) {
        response.end(JSON.stringify({"errcode": "1", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var username = query["username"];
    var amount = query["amount"];
    var rmb = query["rmb"];
    var serverid = query["serverid"];
    var product_id = query["product_id"];
    var orderno = query["orderno"];
    var sign = query["sign"];
    var type3 = query["type3"];//订单号
    var type4 = query["type4"];//userUid
    var type5 = query["type5"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = username + "" + amount + "" + rmb + "" + serverid + "" + orderno + "" + product_id + key;
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign) {
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(type4, type3, NAME, appId, amount, rmb, 1, "", product_id, JSON.stringify(query), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, orderno);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"errcode": "4", "msg": "未找到订单"}), "utf-8");
            } else {
                response.end(JSON.stringify({"errcode": "0", "msg": "通知成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"errcode": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;
