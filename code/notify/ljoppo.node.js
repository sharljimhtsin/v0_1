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
var configManager = require("../config/configManager");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',JSON.stringify(postData)+"\n",'utf8');
    console.log("usaData......." + JSON.stringify(postData));
    if(jutil.postCheck(postData , "notifyId", "partnerOrder", "userId", "productName", "productDesc", "price", "count", "attach" , "sign") == false) {
        response.end(JSON.stringify({"ret" : -7 , "msg" : "參數錯誤"}), "utf-8");
        return;
    }
    var order_id = postData["notifyId"];
    var orderNo = postData["partnerOrder"];
    var productName = postData["productName"];
    var productDesc = postData["productDesc"];
    var price = postData["price"];
    var count = postData["count"];
    var attach = postData["attach"];
    var sign = postData["sign"];
    var platform_id = "ljoppo";
    var uin = postData["userId"];
    var signStr = "notifyId="+order_id+"&partnerOrder="+orderNo+"&productName="+productName+"&productDesc="+productDesc+"&price="+price+"&count="+count+"&attach="+attach;

    var publickey= 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmreYIkPwVovKR8rLHWlFVw7YDfm9uQOJKL89Smt6ypXGVdrAKKl0wNYc3/jecAoPi2ylChfa2iRu5gunJyNmpWZzlCNRIau55fxGW0XEu553IiprOZcaw5OuYGlf60ga8QT6qToP0/dpiL/ZbmNUO9kUhosIjEu22uFgR+5cYyQIDAQAB';
    var pem = chunk_split(publickey,64,"\n");
    pem = "-----BEGIN PUBLIC KEY-----\n"+pem+"-----END PUBLIC KEY-----\n";

//    var key = platformConfig[platform_id]["appKey"]; //密钥
    //var md5Sign = crypto.createVerify('RSA-SHA1').update(new Buffer(signStr)).verify(pem, sign, 'base64');
    //console.log("md5Sign:",signStr, sign, md5Sign);



    if(!crypto.createVerify('RSA-SHA1').update(new Buffer(signStr)).verify(pem, sign, 'base64')) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr, sign);
        response.end(JSON.stringify({"ret" : -5 , "msg" : "加密验证失败"}), "utf-8");
    }else {
        var sCode = attach.split("#");
        var userUid = sCode[0];
        var amount = sCode[1];
        var product_id = sCode[2];
        async.series([
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
            function(cb) {
                order.updateOrder(userUid, orderNo, platform_id, uin, 0, amount, 1, jutil.nowMillisecond(), product_id, JSON.stringify(postData), function(err,res){
                    console.log(err, res);
                    if (res == 1)
                        cb(null);
                    else
                        cb("fail");
                }, undefined, 0, order_id)
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


function chunk_split(body, chunklen, end) {
    chunklen = parseInt(chunklen, 10) || 76;
    end = end || '\r\n';
    if (chunklen < 1) {
        return false;
    }
    return body.match(new RegExp('.{0,' + chunklen + '}', 'g')).join(end);
}