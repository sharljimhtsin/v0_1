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
    if(jutil.postCheck(postData , "notify_data", "sign") == false) {
        response.end("failed", "utf-8");
        return;
    }
    var notify_data = postData["notify_data"];
    var sign = postData["sign"];
    var platform_id = "ljitools";
    var sCode = [];

    async.series([
        function(cb) {
            var phpexec = "/usr/local/php/bin/php";
            var path = require.resolve("./information.node");
            path = require("path").dirname(path)+"/";
            var phpfile = fs.realpathSync(path+"../libs/ItoolsForPHP/notify_url.php");
            var phpargs = JSON.stringify(notify_data)+" " + JSON.stringify(sign);
            var cmd = phpexec + " " + phpfile + " " + phpargs;
            child_process.exec(cmd, function (err, stdout, stderr) {
                var pResult = JSON.parse(stdout);
                if (pResult["code"] == "fail") {
                    cb("fail");
                } else {
                    notify_data = pResult["notify_data"];
                    sCode = notify_data["order_id_com"] != null ? notify_data["order_id_com"].split("|") : [];
                    cb(null);
                }
            });
        },
        function(cb) {
            if (sCode.length == 4) {
                cb(null);
            } else {
                cb("postError");
            }
        },
        function(cb) {//过滤订单号
            if(notify_data["order_id"] == ""){
                cb("noOrderId");
                return;
            }
            var sql = "SELECT * FROM payOrder WHERE order_id=" + mysql.escape(notify_data["order_id"]);
            mysql.game(sCode[0]).query(sql, function(err, res) {
                if (err) {console.log("userUid: " + sCode[0] + "notExist!");cb("dbError"); }
                else if(res.length == 0){
                    cb(null);
                } else {
                    cb("isPayOff");
                }
            });
        },
        function(cb) {
            order.updateOrder(sCode[0], sCode[1], platform_id, notify_data["user_id"], sCode[2], notify_data["amount"], 1, jutil.nowMillisecond(), sCode[3], JSON.stringify(postData), function(err,res){
                if (res == 1)
                    cb(null);
                else
                    cb("fail");
            }, undefined, 0, notify_data["order_id"])
        }
    ],function(err,res) {
        if (err)
            response.end("failed", "utf-8");
        else
            response.end("success", "utf-8");
    });
}
exports.start = start;