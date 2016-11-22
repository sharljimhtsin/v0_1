/**
 * Created by xiazhengxin on 2016/8/1.6:13
 *
 * MyCard 交易成功資料之差異比對接口
 */

var platformConfig = require("../../config/platform");
var order = require("../model/order");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var fs = require('fs');
var async = require("async");

function start(postData, response, query) {
    var NAME = "MyCard";
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "MyCardTradeNo") == false && jutil.postCheck(postData, "StartDateTime", "EndDateTime") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var MyCardTradeNo = postData["MyCardTradeNo"];
    var StartDateTime = postData["StartDateTime"];
    var EndDateTime = postData["EndDateTime"];
    var country = platformConfig[NAME]["country"];
    var startTime = StartDateTime ? Date.parse(StartDateTime) / 1000 : jutil.now();
    var endTime = EndDateTime ? Date.parse(EndDateTime) / 1000 : jutil.now();
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (MyCardTradeNo) {
        redis.login(country).s(NAME + MyCardTradeNo).get(function (err, res) {
            if (err || res == null) {
                response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
            } else {
                var args = res.split("_");
                order.getOrder(args[1], args[0], function (err, res) {
                    if (err || res == null) {
                        response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
                    } else if (res.length == 0) {
                        response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
                    } else {
                        var payContent = JSON.parse(res[0]["payContent"]);
                        response.end(payContent["PaymentType"] + payContent["MyCardTradeNo"] + payContent["FacTradeSeq"] + payContent["CustomerId"] + payContent["Amount"] + payContent["Currency"] + jutil.todayTime(), "utf-8");
                    }
                });
            }
        });
    } else {
        redis.login(country).z(NAME + "ORDER").rangeByScore(startTime, endTime, function (err, res) {
            if (err) {
                response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
            } else {
                var body = "";
                var c = 0;
                async.eachSeries(res, function (item, eachCb) {
                    c++;
                    if (c % 2 == 0) {
                        eachCb();//skip on timestamp
                    } else {
                        var args = item.split("_");
                        order.getOrder(args[1], args[0], function (err, res) {
                            if (err || res == null) {
                                eachCb(null);
                            } else if (res.length == 0) {
                                eachCb(null);
                            } else {
                                var payContent = JSON.parse(res[0]["payContent"]);
                                body += (payContent["PaymentType"] + payContent["MyCardTradeNo"] + payContent["FacTradeSeq"] + payContent["CustomerId"] + payContent["Amount"] + payContent["Currency"] + jutil.todayTime());
                            }
                        });
                    }
                }, function (err, res) {
                    if (err) {
                        response.end(JSON.stringify({"status": "failed", "desc": "未找到订单"}), "utf-8");
                    } else {
                        response.end(body.toString, "utf-8");
                    }
                });
            }
        });
    }
}

exports.start = start;