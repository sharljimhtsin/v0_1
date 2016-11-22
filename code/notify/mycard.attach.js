/**
 * Created by xiayanxin on 2016/9/7.
 */

var platformConfig = require("../../config/platform");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var fs = require('fs');

function start(postData, response, query) {
    var NAME = "MyCard";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "MyCardTradeNo", "token") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var MyCardTradeNo = postData["MyCardTradeNo"];
    var token = postData["token"];
    var country = platformConfig[NAME]["country"];
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    redis.login(country).h("mycard").set(MyCardTradeNo, token, function (err, res) {
        if (err) {
            response.end(JSON.stringify({"ret": 0, "msg": "DBERR"}), "utf-8");
        } else {
            response.end(JSON.stringify({"ret": 1, "msg": "OK"}), "utf-8");
        }
    });
}

exports.start = start;