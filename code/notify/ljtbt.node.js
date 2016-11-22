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
    fs.appendFile('payOrder.log',JSON.stringify(query)+"\n",'utf8');
    console.log("usaData.......tbt:" + JSON.stringify(query));
    if(jutil.postCheck(query , "source", "trade_no", "amount", "partner", "paydes", "tborder", "sign") == false) {
        response.end(JSON.stringify({"ret" : -7 , "msg" : "參數錯誤", "status":"error"}), "utf-8");
        return;
    }
    var source = query["source"];
    var trade_no = query["trade_no"];//我们的订单号
    var amount = query["amount"];
    var partner = query["partner"];
    var paydes = query["paydes"];
    var tborder = query["tborder"];
    var debug = query["debug"];
    var sign = query["sign"];
    var signStr = "source="+source+"&trade_no="+trade_no+"&amount="+amount+"&partner="+partner+"&paydes="+paydes+"&debug="+debug+"&tborder="+tborder;

	var platform_id = "ljtbt";

    var key = platformConfig[platform_id]["appKey"]; //密钥
	signStr += "&key="+key;
    var md5Sign = crypto.createHash('md5').update(signStr,"utf8").digest('hex');
    amount = Math.floor(amount/100);

    var sCode = paydes.split("|");
    var userUid = sCode[0];
    var uin = sCode[1];
    var product_id = sCode[2];
    var number = sCode[3];



    if(sign != md5Sign) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr, md5Sign);
        response.end(JSON.stringify({"ret" : -5 , "msg" : "加密验证失败", "status":"error"}), "utf-8");
    }else {
        async.series([
            function(cb) {//过滤订单号
                if(tborder == ""){
                    cb("noOrderId");
                    return;
                }
                var sql = "SELECT * FROM payOrder WHERE order_id=" + mysql.escape(tborder);
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
                order.updateOrder(userUid, trade_no, platform_id, partner, number, amount, 1, jutil.nowMillisecond(), product_id, JSON.stringify(query), function(err,res){
                    console.log(err, res);
                    if (res == 1)
                        cb(null);
                    else
                        cb("fail");
                }, undefined, 0, tborder)
            }
        ],function(err,res) {
            if (err && err != "isPayOff")
                response.end(JSON.stringify({"ret" : -8 , "msg" : err, "status":"error"}), "utf-8");
            else
                response.end(JSON.stringify({"ret" : 0 , "msg" : "充值成功", "status":"success"}), "utf-8");
        });
    }
}
exports.start = start;
