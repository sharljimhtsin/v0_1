/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-28
 * Time: 下午4:25
 * LJ xiongmaowan 调用
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(query) + "\n", 'utf8');
    console.log("ljxiongmao...POST...." + JSON.stringify(postData));
    console.log("ljxiongmao...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "serial", "amount", "status", "app_order_id", "app_user_id", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    var serial = postData["serial"];
    var amount = postData["amount"];
    var status = postData["status"];
    var app_order_id = postData["app_order_id"];
    var app_user_id = postData["app_user_id"];
    var sign = postData["sign"];
    var app_subject = postData["app_subject"];
    var app_description = postData["app_description"];
    var app_ext1 = postData["app_ext1"];
    var app_ext2 = postData["app_ext2"];
    var appSecret = platformConfig["ljxiongmao"]["appSecret"];
    var toSignStr = getSignData(postData) + "&client_secret=" + appSecret;
    var md5Sign = crypto.createHash('md5').update(toSignStr, "utf8").digest('hex');
    if (sign != md5Sign) {
        console.log("sign not match");
        response.end("fail", "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(app_user_id, app_order_id, "ljxiongmao", "", "", amount, 1, "", "", JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end("success", "utf-8");
            } else {
                console.log("order update fail");
                response.end("fail", "utf-8");
            }
        });
    }
}

function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key == "sign")
            continue;
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    return returnStr;
}

exports.start = start;