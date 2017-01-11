/**
 * Created by xiazhengxin on 2016/8/1.6:13
 *
 * MyCard 充值補發回調接口
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var fs = require('fs');
var async = require("async");
var redis = require("../alien/db/redis");
var http = require("http");
var urlParse = require("url").parse;

function start(postData, response, query) {
    var NAME = "MyCard";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "DATA") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var data = postData["DATA"];
    var obj = JSON.parse(data);
    if (jutil.postCheck(obj, "ReturnCode", "ReturnMsg", "FacServiceId", "FacTradeSeq", "TotalNum") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var ReturnCode = obj["ReturnCode"];
    var ReturnMsg = obj["ReturnMsg"];
    var FacServiceId = obj["FacServiceId"];
    var FacTradeSeq = obj["FacTradeSeq"];
    var TotalNum = obj["TotalNum"];
    var key = platformConfig[NAME]["SecretKey"];
    var appId = platformConfig[NAME]["AppID"];
    var country = platformConfig[NAME]["country"];
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (FacServiceId == key && ReturnCode == 1) {
        console.log("key matched");
        async.eachSeries(FacTradeSeq, function (item, processCb) {
            var args = item.split("_");
            var token;
            var checkUrl = platformConfig[NAME]["checkUrl"];
            var confirmUrl = platformConfig[NAME]["confirmUrl"];
            var money = 0;
            async.series([function (orderCb) {
                redis.login(country).s(NAME + item).getObj(function (err, res) {
                    money = res["Amount"];
                    orderCb(err);
                });
            }, function (orderCb) {
                order.updateOrder(args[1], args[0], NAME, appId, 1, money, 1, "", "", JSON.stringify(postData), function (err, res) {
                    if (res == 1) {
                        console.log("order update ok");
                        orderCb();
                    } else {
                        console.log("order update failed");
                        orderCb("ERROR");
                    }
                });
            }, function (orderCb) {
                redis.login(country).h("mycard").get(args[0], function (err, res) {
                    token = res;
                    orderCb(err);
                });
            }, function (orderCb) {
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
                        orderCb();
                    });
                });
                req.on("error", function (err) {
                    orderCb(err);
                });
                req.end();
            }, function (orderCb) {
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
                        orderCb();
                    });
                });
                req.on("error", function (err) {
                    orderCb(err);
                });
                req.end();
            }], function (err, res) {
                processCb(err);
            });
        }, function (err, res) {
            if (err) {
                console.log(err);
                response.end(JSON.stringify({"status": "success", "desc": "通知成功"}), "utf-8");
            } else {
                response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
            }
        });
    } else {
        console.log("key not match");
        response.end(JSON.stringify({"status": "failed", "desc": "数字签名错误"}), "utf-8");
    }
}

exports.start = start;