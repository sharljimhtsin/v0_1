/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * 泰文支付验证
 * Date: 14-12-18
 * Time: 下午2:49
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
    console.log("thaiData......." + JSON.stringify(postData));
    if(jutil.postCheck(postData , "amount", "number", "product_id", "platform_id", "order_id", "uin", "server_id" , "sign") == false) {
        response.end(JSON.stringify({"ret" : -7 , "msg" : "參數錯誤"}), "utf-8");
        return;
    }
    var amount = postData["amount"];
    var number = postData["number"];
    var product_id = postData["product_id"];
    var platform_id = postData["platform_id"];
    var order_id = postData["order_id"];
    var uin = postData["uin"];
    var server_id = postData["server_id"];
    var sign = postData["sign"];
    var signStr = "amount="+amount+"&number="+number+"&product_id="+product_id+"&platform_id="+platform_id+"&order_id="+order_id+"&uin="+uin+"&server_id="+server_id;

    var key = platformConfig[platform_id]["appKey"]; //密钥
    var md5Sign = crypto.createHash('md5').update(signStr,"utf8").digest('hex');
    md5Sign = crypto.createHash('md5').update(md5Sign+key,"utf8").digest('hex');
    amount = amount - 0;
    number = number - 0;

    if(sign != md5Sign) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr);
        response.end(JSON.stringify({"ret" : -5 , "msg" : "加密验证失败"}), "utf-8");
    }else {
        var orderNo = jutil.guid();
        var userUid = "";
        var _udid;
        var _pUserId;
        var country = platformConfig[platform_id]["country"];
        product_id = product_id=="0"?1:product_id;
        async.series([
            function(cb) {
                mysql.loginDB(country).query('SELECT * FROM user WHERE pUserId=' + mysql.escape(uin) + " OR udid=" + mysql.escape(uin), function(err, res) {
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
                    var _sql = "SELECT userUid FROM user WHERE pUserId = " + mysql.escape(_pUserId) + " OR pUserId = " + mysql.escape(_udid);
                    db.query(_sql, function(err, res) {
                        if (err || res == null || res.length == 0) {
                            cb("数据获取错误");
                        } else {
                            userUid = res[0]["userUid"];
                            cb(null);
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
                    if (err) {console.log("userUid: " + userUid + "notExist!");cb("dbError"); }
                    else if(res.length == 0){
                        cb(null);
                    } else {
                        cb("isPayOff");
                    }
                });
            },
            function(cb) {//addOrder
                order.addOrder(orderNo, userUid, product_id, function(err, res) {
                    if (err)
                        cb("数据获取错误");
                    else {
                        cb(null);
                    }
                });
            },
            function(cb) {
                var ingot = number == 0?undefined:number;
                order.updateOrder(userUid, orderNo, platform_id, uin, number, amount, 1, jutil.nowMillisecond(), product_id, JSON.stringify(postData), function(err,res){
                    if (res == 1)
                        cb(null);
                    else
                        cb("fail");
                }, ingot, 0, order_id)
            }
        ],function(err,res) {
            if (err)
                response.end(JSON.stringify({"ret" : -8 , "msg" : err}), "utf-8");
            else
                response.end(JSON.stringify({"ret" : 0 , "msg" : "充值成功"}), "utf-8");
        });
    }
}
exports.start = start;