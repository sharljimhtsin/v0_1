/**
 * Created by xiazhengxin on 2017/4/21.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "pyw";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    postData = JSON.parse(Object.keys(postData)[0]);// 处理特殊 HTTP_RAW_POST_DATA 数据
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "tid", "gamekey", "channel", "cp_orderid", "ch_orderid", "amount", "cp_param", "sign") == false) {
        response.end(JSON.stringify({"ack": "0", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var ver = postData["ver"];
    var tid = postData["tid"];
    var gamekey = postData["gamekey"];
    var channel = postData["channel"];
    var cp_orderid = postData["cp_orderid"];
    var ch_orderid = postData["ch_orderid"];
    var amount = postData["amount"];
    var cp_param = postData["cp_param"];
    var sign = postData["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var signStr = key + "" + cp_orderid + "" + ch_orderid + "" + amount;
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    var args = JSON.parse(cp_param);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign) {
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(args["uid"], cp_orderid, NAME, appId, 1, amount, 1, "", args["pid"], JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, ch_orderid);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"ack": "3", "msg": "未找到订单"}), "utf-8");
            } else {
                response.end(JSON.stringify({"ack": "200", "msg": "OK"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"ack": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;