/**
 * Created by xiazhengxin on 2015/2/9 11:26.
 *
 * 游路支付通知接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    console.log("ljyoulu...POST...." + JSON.stringify(postData));
    console.log("ljyoulu...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "transaction", "payType", "userId", "serverNo", "amount", "cardPoint", "gameUserId", "transactionTime", "gameExtend", "platform", "status", "currency", "_sign") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var transaction = postData["transaction"];
    var payType = postData["payType"];
    var userId = postData["userId"];
    var serverNo = postData["serverNo"];
    var amount = postData["amount"];
    var cardPoint = postData["cardPoint"];
    var gameUserId = postData["gameUserId"];
    var transactionTime = postData["transactionTime"];
    var gameExtend = postData["gameExtend"];
    var args = gameExtend.split("|");
    var platform = postData["platform"];
    var status = postData["status"];
    var currency = postData["currency"];
    var _sign = postData["_sign"];
    var appKey = platformConfig["ljyoulu"]["AppSecret"];
    var appId = platformConfig["ljyoulu"]["AppID"];
    postData["gameExtend"] = encodeURIComponent(gameExtend);
    var signStr = getSignData(postData);
    var generateSign = md5_chs(signStr);
    generateSign = md5_chs(generateSign + appKey);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (_sign != generateSign) {
        console.log("sign not match");
        response.end(JSON.stringify({"status": "1"}), "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(args[0], args[1], "ljyoulu", appId, 1, amount, 1, "", "", JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end(JSON.stringify({"status": "0"}), "utf-8");
            } else {
                console.log("order update failed");
                response.end(JSON.stringify({"status": "1"}), "utf-8");
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

//获取待签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (["_sign"].indexOf(key) >= 0) {
            continue;
        }
        if (i == 1)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

exports.start = start;