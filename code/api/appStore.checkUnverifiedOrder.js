/**
 * Created by apple on 14-4-15.
 * 验证未验证的订单
 */

var order = require("../model/order");
var async = require("async");
var verify = require("../api/appStore.verify");
var jutil = require("../utils/jutil");
var user = require("../model/user");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var orders = null;
    var isSuccess = false;//是否有订单验证成功
    var userData = null;
    var idfa = postData == null ? "":postData["idfa"];
    async.series([
        function(cb) {//获取未验证的订单
            order.getUnverifiedOrders(userUid, function(err, res){
                if (err)
                    cb(err);
                else {
                    orders = res;
                    cb(null);
                }
            });
        },

        function(cb) {//验证未验证的订单
            if (orders != null && orders.length > 0) {
                console.log("order length:" + orders.length);
                var returnedNum = 0;
                for (var i = 0; i < orders.length; i++) {
                    var order = orders[i];
                    verifyOrder(order["backup"],order["orderNo"],order["userUid"], idfa, function(result){
                        returnedNum ++;
                        if (result["status"] == 1)
                            isSuccess = true;
                        if (returnedNum == orders.length)
                            cb(null);
                    });
                }
            } else
                cb(null);
        },

        function(cb) {//获取玩家数据
            if (isSuccess)
                user.getUser(userUid,function(err, res){
                    if (err)
                        cb(err);
                    else {
                        userData = res;
                        cb(null);
                    }
                });
            else
                cb(null);
        }
    ],function(err) {
        if (err) {
            response.echo("appStore.checkUnverifiedOrder",jutil.errorInfo(err));
        } else {
            if (userData) {
                var echoObj = {};
                echoObj["ingot"] = userData["ingot"];
                echoObj["gold"] = userData["gold"];
                echoObj["vip"] = userData["vip"];
                echoObj["cumulativePay"] = userData["cumulativePay"];
                response.echo("appStore.checkUnverifiedOrder",echoObj);
            } else
                response.echo("appStore.checkUnverifiedOrder",null);
        }
    });
}

function verifyOrder(receipt, orderNo, userUid, idfa, callback) {
    console.log("验证订单(receipt:" + receipt + " orderNo:" + orderNo + " userUid:" + userUid + ")");
    var a = {};
    a.echo = function(method,result) {
        console.log("订单 " + orderNo + " 验证结果：" + JSON.stringify(result));
        callback(result);
    };
    verify.start({"receipt":receipt,"orderNo":orderNo,"idfa":idfa},a,{"userUid":userUid})
}

exports.start = start;