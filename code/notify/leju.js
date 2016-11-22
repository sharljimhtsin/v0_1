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
    if(jutil.postCheck(postData , "amount", "number", "product_id", "platform_id", "order_id", "uin", "server_id" , "sign", "extent") == false) {
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
    var extent = postData["extent"];
    var signStr = "amount="+amount+"&number="+number+"&product_id="+product_id+"&platform_id="+platform_id+"&order_id="+order_id+"&uin="+uin+"&server_id="+server_id;


    var key = platformConfig[platform_id]["appKey"]; //密钥
    var md5Sign = crypto.createHash('md5').update(signStr,"utf8").digest('hex');
    md5Sign = crypto.createHash('md5').update(md5Sign+key,"utf8").digest('hex');
    amount = amount - 0;
    number = number - 0;

    var sCode = extent.split("#");
    var userUid = sCode[0];
    var orderNo = sCode[3];



    if(sign != md5Sign) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr, md5Sign);
        response.end(JSON.stringify({"ret" : -5 , "msg" : "加密验证失败"}), "utf-8");
    }else {
        product_id = product_id=="0"?1:product_id;
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
                var ingot = number;
                if(number == 0){
                    ingot = undefined;
                    var configData = configManager.createConfig(userUid);
                    var payConfig = configData.getConfig("pay");
                    var goodsConfig = payConfig["ios"][product_id];
                    if(goodsConfig != undefined){
                        number = goodsConfig["getImegga"] + goodsConfig["getMoreImegga"];
                    }
                }
                console.log(number);
                order.updateOrder(userUid, orderNo, platform_id, uin, number, amount, 1, jutil.nowMillisecond(), product_id,JSON.stringify(postData), function(err,res){
                    console.log(err, res);
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