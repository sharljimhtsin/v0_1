/**
 * Created by xiazhengxin on 2016/8/1.7:22
 *
 * MyCard 充值回調接口
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var fs = require('fs');
var crypto = require('crypto');
var async = require("async");
var http = require("http");
var urlParse = require("url").parse;

function start(postData, response, query) {
    var NAME = "MyCard";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "ReturnCode", "ReturnMsg", "PayResult", "FacTradeSeq", "PaymentType", "Amount", "Currency", "MyCardTradeNo", "Hash") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var ReturnCode = postData["ReturnCode"];
    var ReturnMsg = postData["ReturnMsg"];
    var PayResult = postData["PayResult"];
    var FacTradeSeq = postData["FacTradeSeq"];
    var PaymentType = postData["PaymentType"];
    var Amount = postData["Amount"];
    var Currency = postData["Currency"];
    var MyCardTradeNo = postData["MyCardTradeNo"];
    var MyCardType = postData["MyCardType"] ? postData["MyCardType"] : "";
    var PromoCode = postData["PromoCode"];
    var Hash = postData["Hash"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    var signStr = ReturnCode + PayResult + FacTradeSeq + PaymentType + Amount + Currency + MyCardTradeNo + MyCardType + PromoCode + key;
    signStr = encodeURIComponent(signStr);
    var hash = crypto.createHash('sha256').update(signStr).digest('hex');
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    var token;
    var checkUrl = platformConfig[NAME]["checkUrl"];
    var confirmUrl = platformConfig[NAME]["confirmUrl"];
    if (hash == Hash && ReturnCode == 1 && PayResult == 3) {
        console.log("sign matched");
        async.series([function (cb) {
            redis.login(country).h("myCardOrder").get(FacTradeSeq, function (err, res) {
                FacTradeSeq = res;
                cb(err);
            });
        }, function (cb) {
            var args = FacTradeSeq.split("_");
            order.updateOrder(args[1], args[0], NAME, appId, Amount, Amount, 1, "", "", JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order update ok");
                    redis.login(country).s(NAME + MyCardTradeNo).set(FacTradeSeq, function (err, res) {
                        console.log("order to redis", MyCardTradeNo, FacTradeSeq);
                    });
                    redis.login(country).s(NAME + FacTradeSeq).setObj(postData, function (err, res) {
                        console.log("order to redis", FacTradeSeq, MyCardTradeNo);
                    });
                    redis.login(country).z(NAME + "ORDER").add(jutil.now(), FacTradeSeq, function (err, res) {
                        console.log("order to redis", FacTradeSeq, jutil.now());
                    });
                    cb();
                } else {
                    console.log("order update failed");
                    cb("ERROR");
                }
            }, null, null, MyCardTradeNo);
        }, function (cb) {
            redis.login(country).h("mycard").get(args[0], function (err, res) {
                token = res;
                cb(err);
            });
        }, function (cb) {
            var url = checkUrl + token;
            var urlData = urlParse(url);
            var options = {
                hostname: urlData.hostname,
                port: urlData.port || 80,
                path: urlData.path,
                method: "GET"
            };
            var req = http.request(options, function (res) {
                var mData = '';
                res.on('data', function (chunk) {
                    mData += chunk;
                });
                res.on('end', function () {
                    var mDataObj;
                    try {
                        mDataObj = JSON.parse(mData);
                    } catch (err) {
                        mDataObj = {};
                    }
                    console.log(NAME + "...checkUrl...." + JSON.stringify(mDataObj));
                    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(mDataObj) + "\n", 'utf8');
                    cb();
                });
            });
            req.on("error", function (err) {
                cb(err);
            });
            req.end();
        }, function (cb) {
            var url = confirmUrl + token;
            var urlData = urlParse(url);
            var options = {
                hostname: urlData.hostname,
                port: urlData.port || 80,
                path: urlData.path,
                method: "GET"
            };
            var req = http.request(options, function (res) {
                var mData = '';
                res.on('data', function (chunk) {
                    mData += chunk;
                });
                res.on('end', function () {
                    var mDataObj;
                    try {
                        mDataObj = JSON.parse(mData);
                    } catch (err) {
                        mDataObj = {};
                    }
                    console.log(NAME + "...confirmUrl...." + JSON.stringify(mDataObj));
                    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(mDataObj) + "\n", 'utf8');
                    cb();
                });
            });
            req.on("error", function (err) {
                cb(err);
            });
            req.end();
        }], function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
            } else {
                response.end(JSON.stringify({"status": "success", "desc": "通知成功"}), "utf-8");
            }
        });
    } else {
        console.log("sign not match");
        response.end(JSON.stringify({"status": "failed", "desc": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;