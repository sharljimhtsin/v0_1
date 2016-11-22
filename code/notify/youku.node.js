/**
 * Created by xiazhengxin on 2015/2/9 14:23.
 *
 * youku 支付通知验证接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    console.log("youku......." + JSON.stringify(postData));
    console.log(JSON.stringify(query));
    if (jutil.postCheck(postData, "apporderID", "uid", "price", "passthrough", "sign") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var apporderID = postData["apporderID"];
    var uid = postData["uid"];
    var price = postData["price"];
    var passthrough = postData["passthrough"];
    var args = passthrough.split("#");//总价#商品编号#通知地址#用户编号
    var result = postData["result"];
    var success_amount = postData["success_amount"];
    var key = platformConfig["youku"]["PayKey"];
    var appId = platformConfig["youku"]["AppID"];
    var sign = postData["sign"];
    var string = args[2] + "?apporderID=" + apporderID + "&price=" + price + "&uid=" + uid;
    var generateSign = crypto.createHmac('md5', key).update(string).digest("hex");
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign) {
        console.log("sign not match");
        response.end(JSON.stringify({"status": "failed", "desc": "数字签名错误"}), "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(args[3], apporderID, "youku", appId, 1, args[0], 1, "", args[1], JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order update ok");
                response.end(JSON.stringify({"status": "success", "desc": "通知成功"}), "utf-8");
            }
            else {
                console.log("order update failed");
                response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
            }
        });
    }
}

exports.start = start;