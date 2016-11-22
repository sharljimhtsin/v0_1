/**
 * Created by xiazhengxin on 2015/1/30 21:28.
 *
 * 华为充值平台,充值购买验证.
 */
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require("crypto");

function start(postData, response, query) {
    fs.appendFile('payOrder.log', JSON.stringify(postData)+"\n", 'utf8');
    console.log("ljhuawei...POST...." + JSON.stringify(postData));
    if (jutil.postCheck(postData, "result", "userName", "productName", "payType", "amount", "orderId", "notifyTime", "requestId", "extReserved", "sign") == false) {
        response.end(JSON.stringify({"result": 98}), "utf-8");
        return;
    }
    var result = postData["result"];
    var userName = postData["userName"];
    var productName = postData["productName"];
    var payType = postData["payType"];
    var amount = postData["amount"];
    var orderId = postData["orderId"];
    var notifyTime = postData["notifyTime"];
    var requestId = postData["requestId"];
    var extReserved = postData["extReserved"];
    var args = extReserved.split("#");
    var sign = postData["sign"];
    var signStr = getSignData(postData);
    var publicKey = platformConfig["ljhuawei"]["PubKey"];//公钥
    var AppID = platformConfig["ljhuawei"]["AppID"];//公钥
    var pem = chunk_split(publicKey, 64, "\n");
    pem = "-----BEGIN PUBLIC KEY-----\n" + pem + "-----END PUBLIC KEY-----\n";
    if (!crypto.createVerify('RSA-SHA1').update(new Buffer(signStr)).verify(pem, sign, 'base64')) {
        console.log("签名验证失败");
        response.end(JSON.stringify({"result": 1}), "utf-8");
    } else {
        console.log("签名验证成功");
        order.updateOrder(args[0], args[1], "ljhuawei", AppID, 1, amount, 1, "", 0, JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("result:success");
                response.end(JSON.stringify({"result": 0}), "utf-8");
            } else {
                console.log("result:failed");
                response.end(JSON.stringify({"result": 3}), "utf-8");
            }
        });
    }
}

//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (["sign"].indexOf(key) >= 0)
            continue;
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

function chunk_split(body, chunklen, end) {
    chunklen = parseInt(chunklen, 10) || 76;
    end = end || '\r\n';
    if (chunklen < 1) {
        return false;
    }
    return body.match(new RegExp('.{0,' + chunklen + '}', 'g')).join(end);
}

exports.start = start;