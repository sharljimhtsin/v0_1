/**
 * Created by xiazhengxin on 2015/5/20 11:21.
 *
 * 小米支付验证接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(query) + "\n", 'utf8');
    console.log("ljxiaomi...POST...." + JSON.stringify(postData));
    console.log("ljxiaomi...GET...." + JSON.stringify(query));
    if (jutil.postCheck(query, "appId", "cpOrderId", "uid", "orderId", "orderStatus", "payFee", "productCode", "productName", "productCount", "payTime", "signature") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var appId = query["appId"];
    var cpOrderId = query["cpOrderId"];
    var cpUserInfo = query["cpUserInfo"];
    var uid = query["uid"];
    var orderId = query["orderId"];
    var orderStatus = query["orderStatus"];
    var payFee = query["payFee"];
    var productCode = query["productCode"];
    var productName = query["productName"];
    var productCount = query["productCount"];
    var payTime = query["payTime"];
    var signature = query["signature"];
    var appIdd = platformConfig["ljxiaomi"]["appId"];
    var appKey = platformConfig["ljxiaomi"]["appKey"];
    var app_secret = platformConfig["ljxiaomi"]["app_secret"];
    var string = getSignData(query);
    console.log(string);
    //var generateSign = crypto.createHmac('md5', app_secret).update(new Buffer(string)).digest("hex");
    var generateSign = crypto.createHmac('sha1', app_secret).update(new Buffer(string)).digest('hex');
    console.log(generateSign);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (signature != generateSign) {
        console.log("sign not match");
        response.end(JSON.stringify({"errcode": "1525", "errMsg": ""}), "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(cpUserInfo, cpOrderId, "ljxiaomi", uid, 1, productCount, 1, "", "", JSON.stringify(query), function (err, res) {
            if (res == 1) {
                console.log("order update ok");
                response.end(JSON.stringify({"errcode": "200", "errMsg": ""}), "utf-8");
            }
            else {
                console.log("order update failed");
                response.end(JSON.stringify({"errcode": "3515", "errMsg": ""}), "utf-8");
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
        if (key == "signature")
            continue;
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    return returnStr;
}

exports.start = start;