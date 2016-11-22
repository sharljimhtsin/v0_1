/**
 * Created by xiayanxin on 2016/9/2.
 *
 * 帮趣游戏充值SDK（台湾）
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var fs = require('fs');
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var NAME = "bangqu";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "userUid", "userId", "serverId", "orderNo", "money", "goodsId", "sign") == false) {
        response.end("-2", "utf-8");
        return;
    }
    var userUid = postData["userUid"];
    var userId = postData["userId"];
    var serverId = postData["serverId"];
    var orderNo = postData["orderNo"];
    var money = postData["money"];
    var goodsId = postData["goodsId"];
    var sign = postData["sign"];
    var appKey = platformConfig[NAME]["privateKey"];
    // 计算签名
    var generateSign = genSign(postData, appKey).toUpperCase();
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign) {
        response.end("-1", "utf-8");
    } else {
        order.updateOrder(userUid, orderNo, NAME, userId, 1, money, 1, "", goodsId, JSON.stringify(postData), function (err, res) {
            if (res == 1)
                response.end("1", "utf-8");
            else
                response.end("0", "utf-8");
        });
    }
}

function md5_chs(data) {
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string + key);
}

exports.start = start;
