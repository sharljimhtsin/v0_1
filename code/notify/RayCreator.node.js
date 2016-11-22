/**
 * Created by xiazhengxin on 2016/3/3 5:45.
 *
 * RayCreator SDK
 服务端接入文档
 *
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");
var user = require("../model/user");

function start(postData, response, query) {
    var NAME = "RayCreator";
    var fs = require('fs');
    fs.appendFile('payOrder.log', NAME + ":" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log(NAME + "...POST...." + JSON.stringify(postData));
    console.log(NAME + "...GET...." + JSON.stringify(query));
    if (jutil.postCheck(postData, "userId", "appId", "serverId", "cpOrderId", "orderId", "goodsId", "goodsCount", "price", "priceUnit", "extParams", "createdTime", "finishTime", "sign") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    var userId = postData["userId"];
    var appId = postData["appId"];
    var serverId = postData["serverId"];
    var cpOrderId = postData["cpOrderId"];
    var orderId = postData["orderId"];
    var goodsId = postData["goodsId"];
    var goodsCount = postData["goodsCount"];
    var price = postData["price"];
    var priceUnit = postData["priceUnit"];
    var extParams = postData["extParams"];
    var createdTime = postData["createdTime"];
    var finishTime = postData["finishTime"];
    var args = extParams.split("|");
    var AppID = platformConfig[NAME]["AppID"];
    var PayKey = platformConfig[NAME]["PayKey"];
    var country = platformConfig[NAME]["country"];
    var sign = postData["sign"];
    var string = getSignData(postData) + PayKey;
    var generateSign = crypto.createHash('md5').update(string, "utf8").digest('hex');
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    if (sign != generateSign) {
        console.log("sign not match");
        response.end(JSON.stringify({"errorCode": "-1", "errorMessage": "数字签名错误"}), "utf-8");
    } else {
        console.log("sign matched");
        if (cpOrderId) {
            var userUid = 0;
            var result = null;
            async.series([function (cb) {
                user.pUserIdToUserUid(country, serverId, userId, function (err, res) {
                    if (err == null && res != null && typeof res == "object" && res.length != 0) {
                        userUid = res[0]["userUid"];
                    } else {
                        err = "NULL";
                    }
                    cb(err);
                });
            }, function (cb) {
                order.updateOrder(userUid, cpOrderId, NAME, appId, 1, args[1], 1, "", goodsId, function (err, res) {
                    result = res;
                    cb(err);
                });
            }], function (err, res) {
                if (result == 1) {
                    console.log("order update ok");
                    response.end(JSON.stringify({"errorCode": "0", "errorMessage": "ok"}), "utf-8");
                }
                else {
                    console.log("order update failed");
                    response.end(JSON.stringify({"errorCode": "-2", "errorMessage": "未找到订单"}), "utf-8");
                }
            });
        } else {//平台直充
            var orderNo = jutil.guid();
            var userUid = 0;
            var result = 0;
            //缩减字段长度 适配数据库
            goodsId = goodsId.length > 4 ? "1" : goodsId;
            async.series([function (cb) {
                user.pUserIdToUserUid(country, serverId, userId, function (err, res) {
                    if (err == null && res != null && typeof res == "object" && res.length != 0) {
                        userUid = res[0]["userUid"];
                    } else {
                        err = "NULL";
                    }
                    cb(err);
                });
            }, function (cb) {
                order.addOrder(orderNo, userUid, goodsId, function (err, res) {
                    cb(err);
                }, orderId);
            }, function (cb) {
                order.updateOrder(userUid, orderNo, NAME + "_cus", appId, goodsCount, price, 1, "", goodsId, function (err, res) {
                    result = res;
                    cb(err);
                });
            }], function (err, res) {
                if (result == 1 && err == undefined) {
                    console.log("order update ok");
                    response.end(JSON.stringify({"errorCode": "0", "errorMessage": "ok"}), "utf-8");
                }
                else {
                    console.log("order update failed");
                    response.end(JSON.stringify({"errorCode": "-2", "errorMessage": "未找到订单"}), "utf-8");
                }
            });
        }
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
        returnStr += postData[key];
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

exports.start = start;
