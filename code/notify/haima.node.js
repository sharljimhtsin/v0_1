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
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var child_process = require("child_process")
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',"haima:" + jutil.now() + " | " +JSON.stringify(postData)+"\n",'utf8');

    if(jutil.postCheck(postData , "transdata" , "sign" ) == false) {
		response.end("FAILURE", "utf-8");
        return;
    }

    var appKey = "QjUwQkE1NEU2RjNEN0JBNDBGNDA5OEI4MTU1ODdDMEZFQTczQzQxOU1UUTNOemsxTXpBNE56QTVNVGM1T0RnM05qRXJNVGMyTkRNMk5qazRNRFkxT1Rrek16a3pPVGd3TWpNeU5qTXdPREkwTVRjME9EazNOelV4";
	var sign = postData["sign"];
    var transdata = postData["transdata"];

    async.series([
        function(cb) {
            var phpexec = "/usr/local/php/bin/php";
            var path = require.resolve("./information.node");
            path = require("path").dirname(path)+"/";
            var phpfile = fs.realpathSync(path+"../libs/IApppayCpSyncForPHP/IappDecryptDemo.php");
            var phpargs = JSON.stringify(appKey)+" " + JSON.stringify(transdata) + " " + JSON.stringify(sign);
            var cmd = phpexec + " " + phpfile + " " + phpargs;
            child_process.exec(cmd,function(err,stdout,stderr){
                if(stdout=="FAILED"){
                    cb("FAILURE");
                }else{
                    cb(null);
                }
            });
        }
    ],function(err,value) {
        if(err){
            console.log("签名验证失败");
            response.end("FAILURE", "utf-8");
        }else{
            transdata = JSON.parse(postData["transdata"]);
            var orderNo = transdata["exorderno"];
            var count = transdata["count"];
            var orderMoney = (transdata["money"]-0) / 100;
            var result = transdata["result"];

            var cpprivate = transdata["cpprivate"];
            var stringA = cpprivate != null ? cpprivate.split("#") : [];
            var uid =  stringA[0];
            var userUid =  stringA[1];
            var productId =  stringA[2];

            if(result != 0) {
                console.log("haima.node", "result is not successful. result Code " + result);
                response.end("FAILURE", "utf-8");
            }else{
                order.updateOrder(userUid, orderNo, "haima", uid, count, orderMoney, 1, "", productId, JSON.stringify(postData), function (err, res) {
                    if (res == 1) {
                        console.log("haima","result:success");
                        response.end("SUCCESS", "utf-8");
                    }
                    else {
                        console.log("haima","result:failed",err);
                        response.end("FAILURE", "utf-8");
                    }
                });
            }
            console.log("签名验证成功");
        }
    });
}

exports.start = start;