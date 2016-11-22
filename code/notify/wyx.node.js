/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * 泰文支付验证
 * Date: 15-2-3
 * Time: 下午6:26
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");
function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',JSON.stringify(postData)+"\n",'utf8');
    console.log("wyxData......." + JSON.stringify(postData));
    if(jutil.postCheck(postData , "subject", "trade_no", "order_no", "user_id", "app_id", "trade_status", "total_fee", "create_time", "notify_time", "payment_time", "addition", "server_id", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    var trade_status = postData["trade_status"];
    if(trade_status != "FINISHED"){
        response.end("fail", "utf-8");
        return;
    }
    var order_id = postData["trade_no"];
    var orderNo = postData["order_no"];
    var uin = postData["user_id"];
    var amount = postData["total_fee"];
    var server_id = postData["server_id"];
    var extend = postData["addition"];
    var sign = postData["sign"];
    var signStr = "addition="+postData["addition"]+"&app_id="+postData["app_id"]+"&create_time="+postData["create_time"]+"&notify_time="+postData["notify_time"]+"&order_no="+postData["order_no"]+"&payment_time="+postData["payment_time"]+"&server_id="+postData["server_id"]+"&subject="+postData["subject"]+"&total_fee="+postData["total_fee"]+"&trade_no="+postData["trade_no"]+"&trade_status="+postData["trade_status"]+"&user_id="+postData["user_id"];

    var key = platformConfig["wyx"]["access_secret"]; //密钥
    var md5Sign = crypto.createHash('md5').update(signStr+key,"utf8").digest('hex');
    amount = amount - 0;
    var number = 0;

    if(sign != md5Sign) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr);
        response.end("fail", "utf-8");
    }else {
        var country = platformConfig["wyx"]["country"];
        var _udid;
        var _pUserId;
        var product_id = 1;
        var userUid;
        async.series([
            function(cb) {
                //console.log('SELECT * FROM user WHERE (pUserId=' + mysql.escape(uin) + " OR udid=" + mysql.escape(uin) + ") AND platformId='wyx'");
                mysql.loginDB(country).query('SELECT * FROM user WHERE (pUserId=' + mysql.escape(uin) + " OR udid=" + mysql.escape(uin) + ") AND platformId='wyx'", function(err, res) {
                    if (err || res == null || res.length == 0) {
                        cb("noUser")
                        return;
                    }
                    _udid = res[0]["udid"];
                    _pUserId = res[0]["pUserId"];
                    if (_udid == "") _udid = _pUserId;
                    cb(null);
                });
            },
            function(cb) {
                var db = mysql.game(null, country, server_id);
                if (db.isNull == true) {
                    cb("分区不存在！");
                } else {
                    var _sql = "SELECT userUid FROM user WHERE pUserId=" + mysql.escape(uin) + " AND platformId='wyx'";
                    db.query(_sql, function(err, res) {
                        console.log(err, res);
                        if (!err && res != null && res.length > 0) {
                            userUid = res[0]["userUid"];
                            cb(null);
                        } else {
                            cb("noUser");
                        }
                    });
                }
            },
            function(cb) {//过滤订单号
                if(order_id == ""){
                    cb("noOrderId");
                    return;
                }
                var sql = "SELECT * FROM payOrder WHERE order_id=" + mysql.escape(order_id);
                mysql.game(userUid).query(sql, function(err, res) {
                    if (err) {
                        cb(err);
                    } else if(res.length == 0){
                        cb(null);
                    } else {
                        cb("isPayOff");
                    }
                });
            },
            function(cb) {
                order.updateOrder(userUid, orderNo, "wyx", uin, number, amount, 1, jutil.nowMillisecond(), product_id, JSON.stringify(postData), function(err,res){
                    if (res == 1)
                        cb(null);
                    else
                        cb("fail",null);
                }, undefined, 0, order_id);
            }
        ],function(err,res) {
            if (err)
                response.end("fail", "utf-8");
            else
                response.end("success", "utf-8");
        });
    }
}
exports.start = start;
