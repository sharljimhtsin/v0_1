/**
 * Created by xiazhengxin on 2017/4/20.
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");

function start(postData, response, query) {
    var NAME = "damai";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "orderid", "username", "appid", "roleid", "serverid", "amount", "paytime", "attach", "productname", "sign") == false) {
        response.end("error", "utf-8");
        return;
    }
    var orderid = postData["orderid"];
    var username = postData["username"];
    var appid = postData["appid"];
    var roleid = postData["roleid"];
    var serverid = postData["serverid"];
    var amount = postData["amount"];
    var paytime = postData["paytime"];
    var attach = postData["attach"];
    var productname = postData["productname"];
    var sign = postData["sign"];
    var key = platformConfig[NAME]["key"];
    var appId = platformConfig[NAME]["id"];
    var country = platformConfig[NAME]["country"];
    var keys = ["orderid", "username", "appid", "roleid", "serverid", "amount", "paytime", "attach", "productname"];
    var signStr = "";
    for (var k in keys) {
        signStr += (keys[k] + "=" + jutil.urlEncodePhpStyle(postData[keys[k]]) + "&");
    }
    signStr += ("appkey=" + key);
    var md5Sign = crypto.createHash('md5').update(signStr, "utf8").digest('hex');
    var args = attach.split("_");//订单号_档位
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (md5Sign == sign) {
        console.log("sign matched");
        async.series([function (cb) {
            order.updateOrder(roleid, args[0], NAME, appId, 1, amount, 1, "", args[1], JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, orderid);
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end("error", "utf-8");
            } else {
                response.end("success", "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end("errorSign", "utf-8");
    }
}

exports.start = start;