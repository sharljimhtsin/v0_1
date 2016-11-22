/**
 * Created by xiazhengxin on 2016/3/16 6:46.
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var NAME = "yuenanlumi";
    var NAMEALT = "yuenanlumiAlt";
    var NAMECUS = "yuenanlumiCus";
    var types = ["VIETTEL", "VINA", "MOBI"];
    var fs = require('fs');
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "orderid", "userid", "currency", "roleid", "rolename", "game", "server", "amount", "gold", "paytype", "info", "timestamp", "pvc", "sign") == false) {
        response.end(JSON.stringify({"code": "3008", "error": "PARAMETER_NOT_LEGAL"}), "utf-8");
        return;
    }
    var orderid = postData["orderid"];
    var userid = postData["userid"];
    var currency = postData["currency"];
    var roleid = postData["roleid"];
    var rolename = postData["rolename"];
    var game = postData["game"];
    var server = postData["server"];
    var amount = postData["amount"];
    var gold = postData["gold"];
    var paytype = postData["paytype"];
    var info = postData["info"];
    if (info == "") {
        response.end(JSON.stringify({"code": "3008", "error": "PARAMETER_NOT_LEGAL"}), "utf-8");
        return;
    }
    var timestamp = postData["timestamp"];
    var pvc = postData["pvc"];
    var agent_oid = postData["agent_oid"];
    var args = info.split("#");
    NAME = game == "longzhu" ? NAME : NAMEALT;
    var AppID = platformConfig[NAME]["AppID"];
    var PayKey = platformConfig[NAME]["PayKey"];
    var sign = postData["sign"];
    var string = getSignData(postData) + PayKey;
    var generateSign = crypto.createHash('md5').update(string, "utf8").digest('hex');
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign.toLowerCase()) {
        console.log("sign not match");
        response.end(JSON.stringify({"code": "3003", "error": "SIGN_NOT_MATCH"}), "utf-8");
    } else {
        console.log("sign matched");
        NAME = types.indexOf(paytype) >= 0 ? NAMECUS : NAME;
        var money = parseInt(args[2]) - 0;
        if (NAME == NAMECUS) {
            money = parseInt(amount) - 0;
            money = money * 100;
        }
        order.updateOrder(args[1], args[0], NAME, userid, gold, money, 1, "", args[3], function (err, res) {
            if (res == 1) {
                console.log("order update ok");
                response.end(JSON.stringify({"code": "3", "error": "SUCCESS"}), "utf-8");
            }
            else {
                console.log("order update failed");
                response.end(JSON.stringify({"code": "3005", "error": "FAILURE"}), "utf-8");
            }
        });
    }
}

//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    console.log("keys:" + keys);
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key == "sign")
            continue;
        returnStr += (key + "=" + postData[key]);
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

exports.start = start;