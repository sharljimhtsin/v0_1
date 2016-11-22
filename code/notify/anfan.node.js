/**
 * Created by apple on 14-4-16.
 */
var crypto = require("crypto");
var jutil = require("../utils/jutil");
var platformConfig = require("../../config/platform");
var order = require("../model/order");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',"anfan:" + jutil.now() + " | " +JSON.stringify(postData)+"\n",'utf8');

    if (postData == null || postData["sign"] == undefined) {
        response.end("ERROR");
        return;
    }

    var sign = postData["sign"];
    var appKey = platformConfig["anfan"]["appKey"];
    var signData = getSignData(postData) + "&signKey=" + appKey;

    var generateSign = crypto.createHash('md5').update(signData,"utf8").digest('hex');
    if (generateSign == sign) {
        var stringA = postData["vorderid"] != null ? postData["vorderid"].split("#") : [];
        if (stringA.length == 3) {
            var userUid = stringA[2];
            var orderNo = stringA[0];
            var uid = postData["ucid"];
            var orderMoney = postData["fee"];
            var productId = stringA[1];
            order.updateOrder(userUid, orderNo, "anfan", uid, 1, orderMoney, 1, "", productId, JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("anfan_pay", "OK");
                    response.end("SUCCESS", "utf-8");
                }
                else {
                    console.log("anfan_pay", "ERROR");
                    response.end("ERROR", "utf-8");
                }
            });
        } else {
            response.end("ERROR", "utf-8");
        }
    }else{
        console.log("anfan_pay_签名", "failed");
        response.end("ERROR", "utf-8");
    }
}

//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    //console.log("keys:" + keys);
    var returnStr = "";
    for (var i = 0; i < keys.length; i ++) {
        var key = keys[i];
        if (key == "sign")
            continue;
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    //console.log("signData:" + returnStr);
    return returnStr;
}

exports.start = start;