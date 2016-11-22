/**
 * Created by xiazhengxin on 2015/9/29 16:19.
 *
 * mo9 支付通知接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var fs = require('fs');
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    fs.appendFile('payOrder.log', "mo9:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("mo9...POST...." + JSON.stringify(postData));
    console.log("mo9...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "pay_to_email", "payer_id", "trade_no", "trade_status", "sign", "amount", "currency", "req_amount", "req_currency", "item_name", "lc", "invoice", "app_id") == false) {
        response.end("FAIL", "utf-8");
        return;
    }
    var pay_to_email = postData["pay_to_email"];
    var payer_id = postData["payer_id"];
    var trade_no = postData["trade_no"];
    var trade_status = postData["trade_status"];
    var sign = postData["sign"];
    var amount = postData["amount"];
    var currency = postData["currency"];
    var req_amount = postData["req_amount"];
    var req_currency = postData["req_currency"];
    var item_name = postData["item_name"];
    var lc = postData["lc"];
    var invoice = postData["invoice"];
    var extra_param = postData["extra_param"];
    var app_id = postData["app_id"];
    var appKey = platformConfig["mo9"]["privateKey"];
    // 计算签名
    var generateSign = genSign(postData, appKey).toUpperCase();
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign) {
        response.end("ILLEGAL SIGN", "utf-8");
    } else {
        order.updateOrder(payer_id, invoice, "mo9", pay_to_email, 1, amount, 1, "", item_name, JSON.stringify(postData), function (err, res) {
            if (res == 1)
                response.end("OK", "utf-8");
            else
                response.end("交易失败.invoice:" + invoice, "utf-8");
        });
    }
}

function md5_chs(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign" || para == "sign_type") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string + key);
}

exports.start = start;