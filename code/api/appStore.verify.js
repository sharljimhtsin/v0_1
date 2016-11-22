/**
 * Created by apple on 14-3-18.
 */
var http = require("http");
var urlParse = require("url").parse;
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var order = require("../model/order");
var https = require('https');
var async = require("async");
var mysql = require("../alien/db/mysql");
function start(postData, response, query) {
    if (!postData) {
        console.log("postError...");
        response.echo("appStoreVerify",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var receipt = postData["receipt"];
    var orderNo = postData["orderNo"];
    var idfa = postData["idfa"];
    var status = 0;//未验证状态
    var returnData = null;
    var amount = 0;
    var isTW = true;//是否是台湾appstore

    async.series([
        function(cb) {//去apple服务器验证订单
            var post_data = JSON.stringify({
                "receipt-data" : receipt
            });

            console.log("postData:" + post_data);

            requestAppStore("buy.itunes.apple.com", post_data, true, function(data) {
                status = 1;//验证成功
                returnData = data;
                cb(null);
            }, function(error) {
                if (error == "chargeFailed")
                    status = 2;//验证失败状态为2
                cb(null);
            });
        },

        function(cb) {//验证该笔订单是否已经验证成功过
            if (status == 1) {
                var transactionId = returnData["receipt"]["transaction_id"];
                console.log("transactionId:" + transactionId);
                var sql = "SELECT * FROM payOrderUid WHERE uid=" + mysql.escape(transactionId);
                mysql.loginDBFromUserUid(userUid).query(sql, function(err, res) {
                    if (err) {
                        status = 4;
                        cb(err);
                    }
                    else {
                        if (res == null || res.length == 0) cb(null);
                        else {
                            status = 4;
                            cb("error");
                        }
                    }
                });
            }
        },

        function(cb) {//更新订单状态
            if (status == 1) {//验证成功
                var configData = configManager.createConfig(userUid);
                var payConfig = configData.getConfig("pay");
                var goodsId = returnData["receipt"]["product_id"];
                if (goodsId == "lz_tw_060" || goodsId == "lz_us_120" || goodsId == "point0.99")
                    goodsId = "1";
                else if (goodsId == "lz_tw_315" || goodsId == "lz_us_315" || goodsId == "point2.99")
                    goodsId = "2";
                else if (goodsId == "lz_tw_530" || goodsId == "lz_us_530" || goodsId == "point4.99")
                    goodsId = "3";
                else if (goodsId == "lz_tw_1145" || goodsId == "lz_us_1145" || goodsId == "point9.99")
                    goodsId = "4";
                else if (goodsId == "lz_tw_2405" || goodsId == "lz_us_2405" || goodsId == "point19.99")
                    goodsId = "5";
                else if (goodsId == "lz_tw_3530" || goodsId == "lz_us_3530" || goodsId == "point49.99")
                    goodsId = "6";
                else if (goodsId == "point99.99")
                    goodsId = "7";
                else
                    isTW = false;
                var goodsConfig = payConfig["ios"][goodsId];
                if (!goodsConfig) {
                    status = 3;//乱七八糟的原因造成的问题状态为3
                    verifyFail(orderNo, receipt, status, userUid, function(err) {
                        if (err)
                            cb(err);
                        else
                            cb(null);
                    });
                    return;
                }
                amount = goodsConfig["payMoney"];
                order.updateOrder(userUid, orderNo, "ios", userUid, returnData["receipt"]["quantity"], goodsConfig["payMoney"], 1, returnData["receipt"]["purchase_date_ms"], goodsId, "", function (err, res) {
                    if (res == 1)
                        cb(null);
                    else {
                        cb("dbError");
                    }
                }, undefined, "USD%230%7c0%7c0%7c0", returnData["receipt"]["transaction_id"]);
            } else {//验证失败或由于网络问题未验证
                verifyFail(orderNo, receipt, status, userUid, function(err) {
                    if (err)
                        cb(err);
                    else
                        cb(null);
                });
            }
        },

        function(cb) {//更新该笔订单验证状态
            if (status == 1) {
                var transactionId = returnData["receipt"]["transaction_id"];
                var sql = "INSERT INTO payOrderUid SET ?";
                var data = {"uid":transactionId,"orderNo":orderNo};
                mysql.loginDBFromUserUid(userUid).query(sql, data, function(err, res) {
                    if (err) cb(err);
                    else cb(null);
                });
            }
        },

        function(cb) {//通知微游戏支付成功
            if (status == 1 && !isTW) {//国内appStore通知微游戏
                var url = "http://wyxioschannel.appsina.com/api/charge?appId=833424544&ifa=" + idfa + "&amount=" + amount;
                var urlData = urlParse(url);

                var options = {
                    hostname:urlData.hostname,
                    port:urlData.port || 80,
                    path:urlData.path,
                    method:"GET"
                };

                var req = http.request(options, function(res) {
                });

                req.on("error", function(err) {
                });

                req.end();
                console.log("idfa:" + idfa + " amount:" + amount);
            }
            cb(null);
        }
    ],function(err) {
        response.echo("appStore.verify",{"status":status});
    });
}

function verifyFail(orderNo, receipt, status, userUid, callBack) {
    var sql = "UPDATE payOrder SET ? WHERE orderNo = " + mysql.escape(orderNo);
    var newData = {"backup":receipt,"status":status};
    mysql.game(userUid).query(sql,newData,function(err,res) {
        if (err)
            callBack(err);
        else
            callBack(null);
    });
}

function requestAppStore(host, post_data, isRecursion, callBack, failBack) {
    var options = {
        host: host,
        port: 443,
        path: '/verifyReceipt',
        method: 'POST'
    };

    var req = https.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            var returnData = JSON.parse(chunk);
            if (returnData["status"] == 0) {
                callBack(returnData);
            } else {
                if (isRecursion)
                    requestAppStore("sandbox.itunes.apple.com", post_data, false, callBack, failBack);
                else
                    failBack("chargeFailed");
            }
        });
    });

// write data to request body
    req.write(post_data);
    req.end();
    req.on('error', function(e) {
        console.error("appStoreRequestError:" + e);
        failBack("netError");
    });
}

exports.start = start;