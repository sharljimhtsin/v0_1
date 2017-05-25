/**
 * Created by xiazhengxin on 2017/3/24.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "cc";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "transactionNo", "partnerTransactionNo", "statusCode", "productId", "orderPrice", "packageId", "productName", "extParam", "userId", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    var transactionNo = postData["transactionNo"];
    var partnerTransactionNo = postData["partnerTransactionNo"];
    var statusCode = postData["statusCode"];
    var productId = postData["productId"];
    var orderPrice = postData["orderPrice"];
    var packageId = postData["packageId"];
    var productName = postData["productName"];
    var extParam = postData["extParam"];
    var userId = postData["userId"];
    var sign = postData["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var md5Sign = genSign(postData, key);
    var args = extParam.split("_");//UserUid_订单号_档位
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign && statusCode == "0000") {//订单状态（0000表示支付成功，0002表示支付失败）
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(args[0], partnerTransactionNo, NAME, appId, 1, orderPrice, 1, "", args[1], JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, transactionNo);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end("fail", "utf-8");
            } else {
                response.end("success", "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end("fail", "utf-8");
    }
}

function md5_chs(data) {
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, keyWord) {
    var keys = [];
    for (var k in paraList) {
        keys.push(k);
    }
    keys.sort();//按照a-z排序
    console.log("keys:" + keys);
    var string = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key == "sign" || paraList[key] == "")//注意：空字符串的参数不要拼接上，不参与签名。
            continue;
        string = string + key + "=" + paraList[key] + "&";
    }
    //string = string.substr(0, string.length - 1);
    return md5_chs(string + keyWord);//最后拼接&，再拼接签名密钥后进行MD5计算。
}

exports.start = start;