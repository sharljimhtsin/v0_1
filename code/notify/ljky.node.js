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
var child_process = require("child_process")
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
    if(jutil.postCheck(postData , "notify_data", "orderid", "dealseq", "uid", "subject", "v", "sign") == false) {
        response.end("failed", "utf-8");
        return;
    }
    var notify_data = postData["notify_data"];
    var orderid = postData["orderid"];
    var dealseq = postData["dealseq"];
    var uid = postData["uid"];
    var subject = postData["subject"];
    var v = postData["v"];
    var sign = postData["sign"];
    var signStr = "dealseq="+dealseq+"&notify_data="+notify_data+"&orderid="+orderid+"&subject="+subject+"&uid="+uid+"&v="+v;
    var platform_id = "ljky";
    var fee = 0;

    var publickey = platformConfig[platform_id]["appSecret"]; //密钥

    var pem = chunk_split(publickey,64,"\n");
    pem = "-----BEGIN PUBLIC KEY-----\n"+pem+"-----END PUBLIC KEY-----\n";

    var sCode = dealseq.split("|");
    var userUid = sCode[0];
    var orderNo = sCode[1];
    var number = sCode[2];
    var product_id = sCode[3];

    if(!crypto.createVerify('RSA-SHA1').update(new Buffer(signStr)).verify(pem, sign, 'base64')) { //MD5校验成功
        console.log("Md5驗證失敗");
        console.log("md5Sign:" + signStr, sign);
        response.end("failed", "utf-8");
    }else {
        async.series([
            function(cb) {
                var phpexec = "/usr/local/php/bin/php";
                var path = require.resolve("./information.node");
                path = require("path").dirname(path)+"/";
                var phpfile = fs.realpathSync(path+"../libs/RSA_Notify_example/notify.php");
                var phpargs = publickey+" "+notify_data;
                var cmd = phpexec + " " + phpfile + " " + phpargs;
                child_process.exec(cmd, function (err, stdout, stderr) {
                    var pResult;
                    try{
                        pResult = JSON.parse(stdout);
                    } catch (e){
                        pResult = {};
                    }
                    if(pResult["dealseq"] == dealseq && pResult["payresult"] != "0"){
                        fee = pResult["fee"];
                        cb(null);
                    } else {
                        cb("payError");
                    }
                });
            },
            function(cb) {//过滤订单号
                if(orderid == ""){
                    cb("noOrderId");
                    return;
                }
                var sql = "SELECT * FROM payOrder WHERE order_id=" + mysql.escape(orderid);
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
                order.updateOrder(userUid, orderNo, platform_id, uid, number, fee, 1, jutil.nowMillisecond(), product_id, JSON.stringify(postData), function(err,res){
                    if (res == 1)
                        cb(null);
                    else
                        cb("fail");
                }, undefined, 0, orderid)
            }
        ],function(err,res) {
            if (err)
                response.end("failed", "utf-8");
            else
                response.end("success", "utf-8");
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