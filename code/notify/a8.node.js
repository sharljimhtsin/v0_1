/**
 * Created by xiazhengxin on 2017/3/21.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "a8";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "order_no", "game_order_no", "uid", "pay_money", "service_id", "pid", "paystatus", "time", "sign") == false) {
        response.end(JSON.stringify({"code": "0", "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var order_no = query["order_no"];
    var game_order_noAndLv = query["game_order_no"];
    var uid = query["uid"];
    var pay_money = query["pay_money"];
    var service_id = query["service_id"];
    var pid = query["pid"];
    var paystatus = query["paystatus"];
    var time = query["time"];
    var sign = query["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var signStr = order_no + "" + game_order_noAndLv + "" + uid + "" + pay_money + "" + service_id + "" + pid + "" + time + "" + paystatus + "" + key;
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    var args = game_order_noAndLv.split("_");//订单号_档位_userUid
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign && paystatus == "1") {
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(args[2], args[0], NAME, appId, 1, pay_money, 1, "", args[1], JSON.stringify(query), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, order_no);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"code": "3", "msg": "未找到订单"}), "utf-8");
            } else {
                response.end(JSON.stringify({"code": "1", "msg": "通知成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"code": "2", "msg": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;
