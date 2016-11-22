/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * 凯英支付验证
 * Date: 14-5-16
 * Time: 下午4:14
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
    console.log("kingnetData......." + JSON.stringify(postData));
    var resource = "1146095"; //私钥
    var key = "kingnetpay.kingnet.com"; //公钥
    if(jutil.postCheck(postData , "ts" , "sig" ,"kda" , "user_id" , "sid" , "number" , "amount" ,"role_id" , "order_id") == false) {
        response.end(JSON.stringify({"ret" : -7 , "msg" : "參數錯誤"}), "utf-8");
        return;
    }
    var ts = postData["ts"];
    var sig = postData["sig"];
    var kda = postData["kda"];
    var user_id = postData["user_id"];
    var sid = postData["sid"];
    var number = postData["number"] - 0;
    var amount = postData["amount"] - 0;
    var role_id = postData["role_id"];
    var order_id = postData["order_id"];
    var active1 = postData["app_extra1"];
    var stringA = active1 != null ? active1.split("#") : [];
    var signStr = key + user_id + sid + number + amount + role_id + order_id + ts + resource;
    var md5Sign = crypto.createHash('md5').update(signStr,"utf8").digest('hex');


    var platformName = "kingnet";
    if (sid >= 30000) {
        sid = sid - 30000;
        platformName = "kingnetenglish"
    } else if (sid >= 10000) {
        sid = sid - 10000;
        platformName = "kingnetios"
    }


    if(sig != md5Sign) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr);
        response.end(JSON.stringify({"ret" : -5 , "msg" : "加密验证失败"}), "utf-8");
    }else {
        if(postData["pay_ref"] != "kingnet_tw" && postData["pay_ref"] != "pay_admin") {
            order.updateOrder(role_id, stringA[0], platformName, user_id,number,amount,1,"",stringA[1],JSON.stringify(postData), function(err, res) {
                if (res == 1){
                    console.log("kingnet充值成功");
                    response.end(JSON.stringify({"ret" : 0 , "msg" : "充值成功"}), "utf-8");
                }
                else {
                    console.log("kingnet充值失敗");
                    response.end(JSON.stringify({"ret" : -7 , "msg" : "kingnet充值失敗"}), "utf-8");
                }
            }, undefined, kda, order_id);
        }else {
            var orderNo = jutil.guid();
            var userUid = "";
            var _udid;
            var _pUserId;
            var country = platformConfig[platformName]["country"];
            async.series([
                function(cb) {
                    mysql.loginDB(country).query('SELECT * FROM user WHERE pUserId=' + mysql.escape(user_id) + " OR udid=" + mysql.escape(user_id), function(err, res) {
                            if (err || res == null || res.length == 0) {
                                response.end(JSON.stringify({"ret":102,"info":"ERROR"}));
                                cb("ERR")
                                return;
                            }
                            _udid = res[0]["udid"];
                            _pUserId = res[0]["pUserId"];
                            if (_udid == "") _udid = _pUserId;
                        cb(null);
                    });
                },
                function(cb) {
                    var db = mysql.game(null, country, sid);
                    if (db.isNull == true) {
                        cb("分区不存在！");
                    } else {
                        var _sql = "SELECT userUid FROM user WHERE pUserId = " + mysql.escape(_pUserId) + " OR pUserId = " + mysql.escape(_udid);
                        db.query(_sql, function(err, res) {
                            if (err || res == null || res.length == 0) {
                                cb("数据获取错误",null);
                            } else {
                                userUid = res[0]["userUid"];
                                cb(null,null);
                            }
                        });
                    }
                },
                function(cb) {//addOrder
                    var _productId = 0;
                    if (postData["pay_ref"] == "pay_admin") {
                        _productId = 100;
                    } else {
                        _productId = 0;
                    }

                    order.addOrder(orderNo, userUid, _productId, function(err, res) {
                        if (err)
                            cb("数据获取错误",null);
                        else {
                            cb(null,null);
                        }
                    });
                },
                function(cb) {
                    order.updateOrderForKingNet(role_id, orderNo, user_id, amount, number, 1, jutil.now(), kda, function(err,res){
                        if (res == 1)
                            cb(null,null);
                        else
                            cb("fail",null);
                    },platformName, order_id)
                }
            ],function(err,res) {
                if (err)
                    response.end(JSON.stringify({"ret" : -8 , "msg" : err}), "utf-8");
                else
                    response.end(JSON.stringify({"ret" : 0 , "msg" : "充值成功"}), "utf-8");
            });

        }
    }
}
exports.start = start;