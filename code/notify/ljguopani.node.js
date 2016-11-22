/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-28
 * Time: 下午4:25
 * LJ guopan IOS调用
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', "ljguopani:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("ljguopani...POST...." + JSON.stringify(postData));
    console.log("ljguopani...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "trade_no", "serialNumber", "money", "status", "t", "sign") == false) {
        response.end("failed", "utf-8");
        return;
    }
    var trade_no = postData["trade_no"];
    var serialNumber = postData["serialNumber"];
    var money = postData["money"];
    var status = postData["status"];
    var t = postData["t"];
    var sign = postData["sign"];
    var appid = postData["appid"];
    var item_id = postData["item_id"];
    var item_price = postData["item_price"];
    var item_count = postData["item_count"];
    var reserved = postData["reserved"];
    var args = reserved.split("|");
    var appSecret = platformConfig["ljguopani"]["appSecret"];
    var toSignStr = serialNumber + money + status + t + appSecret;
    var md5Sign = crypto.createHash('md5').update(toSignStr, "utf8").digest('hex');
    if (sign != md5Sign) {
        console.log("sign not match");
        response.end("failed", "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(args[0], serialNumber, "ljguopani", args[3], args[1], money, 1, "", args[2],JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end("success", "utf-8");
            } else {
                console.log("order update fail");
                response.end("failed", "utf-8");
            }
        });
    }
}
exports.start = start;