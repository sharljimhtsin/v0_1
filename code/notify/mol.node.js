/**
 * Created by xiayanxin on 2016/6/1.
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var NAME = "MOL";
    var fs = require('fs');
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "applicationCode","referenceId","paymentId","version","amount","currencyCode","paymentStatusCode","paymentStatusDate","customerId") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var applicationCode = postData["applicationCode"];
    var referenceId = postData["referenceId"];
    var paymentId = postData["paymentId"];
    var version = postData["version"];
    var amount = postData["amount"];
    var currencyCode = postData["currencyCode"];
    var paymentStatusCode = postData["paymentStatusCode"];
    var paymentStatusDate = postData["paymentStatusDate"];
    var customerId = postData["customerId"];
    var channelId = postData["channelId"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (verifyPayment(postData,key)) {
        console.log("sign not match");
        response.end(JSON.stringify({"status": "failed", "desc": "数字签名错误"}), "utf-8");
    } else {
        console.log("sign matched");
        amount = amount / 100;
        order.updateOrder(customerId, referenceId, NAME, appId, 1, amount, 1, "", paymentId, JSON.stringify(postData), function (err, res) {
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

//验证
function verifyPayment(data,secretKey){
    var param = {};
    param['applicationCode'] = data['applicationCode'];
    param['referenceId'] = data['referenceId'];
    param['paymentId'] = data['paymentId'];
    param['version'] = data['version'];
    param['amount'] = data['amount'];
    param['currencyCode'] = data['currencyCode'];
    param['paymentStatusCode'] = data['paymentStatusCode'];
    param['paymentStatusDate'] = data['paymentStatusDate'];
    if(data.hasOwnProperty("channelId")){
        param['channelId'] = data['channelId'];
    }
    param['customerId'] = data['customerId'];
    var keys = Object.keys(param);
    var sigStr = '';
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        sigStr += param[key];
    }
    sigStr += secretKey;
    var generateSign = crypto.createHash('md5').update(sigStr, "utf8").digest('hex');
    if(data['signature'] == generateSign){
        //amount base on 1 cents.
        return true;
    }else{
        return false;
    }

}

exports.start = start;
