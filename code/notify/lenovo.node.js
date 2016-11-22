/**
 * Created by xiazhengxin on 2015/2/12 14:45.
 *
 * lenovo 支付验证接口
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var jutil = require("../utils/jutil");
var fs = require('fs');
var child_process = require("child_process")

function start(postData, response, query) {
    fs.appendFile('payOrder.log', JSON.stringify(postData) + "\n", 'utf8');
    console.log("lenovo......." + JSON.stringify(postData));
    console.log(JSON.stringify(query));
    if (jutil.postCheck(postData, "transdata", "sign") == false) {
        response.end(JSON.stringify({"ret": -7, "msg": "參數錯誤"}), "utf-8");
        return;
    }
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    var transdata = postData["transdata"];
    var transdataObj = JSON.parse(transdata);
    var exorderno = transdataObj["exorderno"];
    var transid = transdataObj["transid"];
    var appid = transdataObj["appid"];
    var waresid = transdataObj["waresid"];
    var feetype = transdataObj["feetype"];
    var money = transdataObj["money"];
    var count = transdataObj["count"];
    var result = transdataObj["result"];
    var transtype = transdataObj["transtype"];
    var transtime = transdataObj["transtime"];
    var cpprivate = transdataObj["cpprivate"];
    var cpVars = cpprivate.split("#");
    var paytype = transdataObj["paytype"];
    var sign = postData["sign"];
    var appKey = platformConfig["lenovo"]["AppSecret"];
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});
    callNativeVerify(transdata, sign, appKey, function (err, res) {
        if (err) {
            console.log("sign not match");
            response.end("FAILED", "utf-8");
        } else {
            console.log("sign matched");
            order.updateOrder(cpVars[0], exorderno, "lenovo", appid, count, cpVars[1], 1, transtime, cpVars[2],JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("order updated");
                    response.end("SUCCESS", "utf-8");
                }
                else {
                    console.log("order update failed");
                    response.end("FAILED", "utf-8");
                }
            });
        }
    });
}

function callNativeVerify(arg1, arg2, arg3, cb) {
    var phpexec = "/usr/local/php/bin/php";
    var path = require.resolve("./information.node");
    path = require("path").dirname(path) + "/";
    var phpfile = fs.realpathSync(path + "../libs/IApppayCpSyncForPHP_Lenovo/IappDecryptDemo.php");
    var phparg1 = new Buffer(arg1);
    var phparg2 = new Buffer(arg2);
    var cmd = phpexec + " " + phpfile + " " + phparg1.toString("base64") + " " + phparg2.toString("base64") + " " + arg3;
    console.log(cmd);
    child_process.exec(cmd, function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        if (stdout == "FAILED") {
            cb("err");
        } else {
            cb(null);
        }
    });
}

exports.start = start;