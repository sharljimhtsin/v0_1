/**
 * Created by xiazhengxin on 2015/6/23 17:57.
 *
 * ljhaima ios pay SDK
 */

var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', "ljhaimai:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("ljhaimai...POST...." + JSON.stringify(postData));
    console.log("ljhaimai...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "notify_time", "appid", "out_trade_no", "total_fee", "subject", "body", "trade_status", "sign", "user_param") == false) {
        response.end("failed", "utf-8");
        return;
    }
    var notify_time = postData["notify_time"];
    var appid = postData["appid"];
    var out_trade_no = postData["out_trade_no"];
    var total_fee = postData["total_fee"];
    var subject = postData["subject"];
    var body = postData["body"];
    var trade_status = postData["trade_status"];
    var sign = postData["sign"];
    var user_param = postData["user_param"];
    var args = user_param.split("|");// useruid|uin|goodsCount|goodsId
    var appKey = platformConfig["ljhaimai"]["appKey"];
    var toSignStr = getSignData(postData) + appKey;
    var md5Sign = crypto.createHash('md5').update(toSignStr, "utf8").digest('hex');
    if (sign != md5Sign) {
        console.log("sign not match");
        response.end("failed", "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(args[0], out_trade_no, "ljhaimai", args[1], args[2], total_fee, 1, "", args[3],JSON.stringify(postData), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end("success", "utf-8");
            } else {
                console.log("order update fail");
                response.end("failed", "utf-8");
            }
        });
    }
}

//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        if (["sign", "user_param"].indexOf(k) >= 0) {
            continue;
        }
        keys.push(k);
    }
    //keys.sort();
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (i == 0)
            returnStr += key + "=" + urlEncode(postData[key]);
        else
            returnStr += "&" + key + "=" + urlEncode(postData[key]);
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

function urlEncode(str) {
    var tmp = encodeURIComponent(str);
    return tmp.replace("%20", "+");
}

exports.start = start;