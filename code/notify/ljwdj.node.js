/**
 * Created by xiazhengxin on 2015/1/30 21:28.
 *
 * 豌豆夹充值平台,充值购买验证.
 */
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require("crypto");

function start(postData, response, query) {
    fs.appendFile('payOrder.log', "ljwdj:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("ljwdj...POST...." + JSON.stringify(postData));
    console.log("ljwdj...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "content", "signType", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    var content = postData["content"];
    var signType = postData["signType"];
    var sign = postData["sign"];
    sign = sign.replace(/ /g, "+");
    var AppID = platformConfig["ljwdj"]["appID"];
    var publicKey = platformConfig["ljwdj"]["appSecret"];
    var pem = chunk_split(publicKey, 64, "\n");
    pem = "-----BEGIN PUBLIC KEY-----\n" + pem + "-----END PUBLIC KEY-----\n";
    if (!crypto.createVerify('RSA-SHA1').update(new Buffer(content)).verify(pem, sign, 'base64')) {
        console.log("签名验证失败");
        response.end("fail", "utf-8");
    } else {
        console.log("签名验证成功");
        try {
            var contentObj = JSON.parse(content);
        } catch (e) {
            content = null;
        } finally {
            if (content == null) {
                console.log("result:failed");
                response.end("fail", "utf-8");
                return;
            }
            var timeStamp = contentObj["timeStamp"];
            var orderId = contentObj["orderId"];
            var money = contentObj["money"];
            var chargeType = contentObj["chargeType"];
            var appKeyId = contentObj["appKeyId"];
            var buyerId = contentObj["buyerId"];
            var out_trade_no = contentObj["out_trade_no"];
            var args = out_trade_no.split("|"); //useruid|orderid|uin|goodsCount|goodsId|payMoney
            order.updateOrder(args[0], args[1], "ljwdj", args[2], args[3], args[5], 1, "", args[4], JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("result:success");
                    response.end("success", "utf-8");
                } else {
                    console.log("result:failed");
                    response.end("fail", "utf-8");
                }
            });
        }
    }
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