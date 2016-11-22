/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-1
 * Time: 下午12:25
 * To change this template use File | Settings | File Templates.
 */
var order = require("../model/order");
var async = require("async");
var http = require("http");
var urlParse = require("url").parse;
var user = require("../model/user");
var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var verifyOrderUrl = "http://i.game.weibo.cn/appsvc/distsvc/1/pay/query?appkey=3675576059&cporderid=";
function start(postData,response,query) {
    var userUid = query["userUid"];
    var orders = null;
    var isSuccess = false;//是否有订单验证成功
    var userData = null;
    async.series([
        function(cb) {//获取未验证的订单
            order.getUnverifiedOrdersForAndroid(userUid, function(err, res){
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
                    verifyOrder(userUid, order["orderNo"], order["productId"], function(result){
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
            response.echo("android.checkUnverifiedOrder",jutil.errorInfo(err));
        } else {
            if (userData) {
                var echoObj = {};
                echoObj["ingot"] = userData["ingot"];
                echoObj["gold"] = userData["gold"];
                echoObj["vip"] = userData["vip"];
                echoObj["cumulativePay"] = userData["cumulativePay"];
                response.echo("android.checkUnverifiedOrder",echoObj);
            } else
                response.echo("android.checkUnverifiedOrder",null);
        }
    });
}

function verifyOrder(userUid, orderNo, goodsId, callback) {
    console.log("验证订单(orderNo:" + orderNo + ")");
    var requestUrl = verifyOrderUrl + orderNo;
    var urlData = urlParse(requestUrl);
    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"GET"
    };

    var body = '';
    var req = http.request(options, function(res) {
        console.log("Got response: " + res.statusCode);
        res.on('data',function(d){
            body += d;
        }).on('end', function () {
                console.log("body:" + body);
                try {
                    body = JSON.parse(body);
                } catch(err) {
                    callback(0);//验证失败
                }
                var code = body["code"];
                if (code == 1) {//支付成功
                    order.updateOrder(userUid, orderNo, "android", body["uid"], 1, body["amount"] / 100, 1, body["addtime"], goodsId, "", function (err, res) {
                        callback(1);
                    });
                }
                else if (code == -1 || code == -2) {//-1:支付失败: -2:订单不存在
                    verifyFail(orderNo, -1, userUid, function() {
                        callback(0);
                    });
                } else if (code == 0) {//0:未收到回调
                    callback(0);
                }
            });
    }).on('error', function(e) {
            console.log("Got error: " + e.message);
            callback(0);
    });
    req.end();
}

function verifyFail(orderNo, status, userUid, callBack) {
    var sql = "UPDATE payOrder SET ? WHERE orderNo = " + mysql.escape(orderNo);
    var newData = {"status":status};
    mysql.game(userUid).query(sql,newData,function(err,res) {
        callBack();
    });
}

exports.start = start;