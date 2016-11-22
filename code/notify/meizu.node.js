/**
 * Created by xiazhengxin on 2015/2/9 11:26.
 *
 * 魅族支付通知接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    console.log("meizu......." + JSON.stringify(postData));
    console.log(JSON.stringify(query));
    if (jutil.postCheck(postData, "notify_time", "notify_id", "order_id", "app_id", "uid", "partner_id", "cp_order_id", "product_id", "product_unit", "buy_amount", "product_per_price", "total_price", "trade_status", "create_time", "pay_time", "pay_type", "user_info", "sign", "sign_type") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var notify_time = postData["notify_time"];
    var notify_id = postData["notify_id"];
    var order_id = postData["order_id"];
    var app_id = postData["app_id"];
    var uid = postData["uid"];
    var partner_id = postData["partner_id"];
    var cp_order_id = postData["cp_order_id"];
    var product_id = postData["product_id"];
    var product_unit = postData["product_unit"];
    var buy_amount = postData["buy_amount"];
    var product_per_price = postData["product_per_price"];
    var total_price = postData["total_price"];
    var trade_status = postData["trade_status"];
    var create_time = postData["create_time"];
    var pay_time = postData["pay_time"];
    var pay_type = postData["pay_type"];
    var user_info = postData["user_info"];
    var appKey = platformConfig["meizu"]["AppSecret"];
    var sign = postData["sign"];
    var sign_type = postData["sign_type"];
    var data = {
        "app_id": app_id,
        "buy_amount": buy_amount,
        "cp_order_id": cp_order_id,
        "create_time": create_time,
        "notify_id": notify_id,
        "notify_time": notify_time,
        "order_id": order_id,
        "partner_id": partner_id,
        "pay_time": pay_time,
        "pay_type": pay_type,
        "product_id": product_id,
        "product_per_price": product_per_price,
        "product_unit": product_unit,
        "total_price": total_price,
        "trade_status": trade_status,
        "uid": uid,
        "user_info": user_info,
        "sign": sign,
        "sign_type": sign_type
    };
    var generateSign = genSign(data, appKey);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign) {
        console.log("sign not match");
        response.end(JSON.stringify({"code": "900000"}), "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(user_info, cp_order_id, "meizu", app_id, buy_amount, total_price, 1, create_time, 0, JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end(JSON.stringify({"code": "200"}), "utf-8");
            }
            else {
                console.log("order update failed");
                response.end(JSON.stringify({"code": "120014"}), "utf-8");
            }
        });
    }
}

function md5_chs(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    var crypto = require("crypto");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign" || para == "sign_type") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string + ":" + key);
}

exports.start = start;