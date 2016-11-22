/**
 * Created by xiazhengxin on 2015/1/30 21:28.
 *
 * ljHTC充值平台,充值购买验证.
 */
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require("crypto");

function start(postData, response, query) {
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    if (jutil.postCheck(postData, "sign_type", "sign", "order") == false) {
        response.end("failed", "utf-8");
        return;
    }
    var sign_type = postData["sign_type"].substring(1, postData["sign_type"].length - 1);
    var sign = postData["sign"].substring(1, postData["sign"].length - 1);
    sign = sign.replace(/ /g, "+");
    var orderStr = postData["order"].substring(1, postData["order"].length - 1);
    var publicKey = platformConfig["ljhtc"]["AppSecret"];//公钥
    var AppID = platformConfig["ljhtc"]["AppID"];//公钥
    var pem = chunk_split(publicKey, 64, "\n");
    pem = "-----BEGIN PUBLIC KEY-----\n" + pem + "-----END PUBLIC KEY-----\n";

    console.log(pem, orderStr, sign);
    if (!crypto.createVerify('RSA-SHA1').update(new Buffer(orderStr)).verify(pem, sign, 'base64')) {
        console.log("签名验证失败");
        response.end("failed", "utf-8");
    } else {
        console.log("签名验证成功");
        var original = decodeURI(orderStr);
        var originalObj = JSON.parse(original);
        var args = originalObj["game_order_id"].split("#");
        console.log(args);
        order.updateOrder(args[0], args[1], "ljhtc", AppID, 1, args[2], 1, "", 0, JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("result:success");
                response.end("success", "utf-8");
            } else {
                console.log("result:failed");
                response.end("failed", "utf-8");
            }
        });
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