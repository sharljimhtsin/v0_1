var async = require("async");
var child_process = require("child_process")
var order = require("../model/order");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', "");
    fs.appendFile('payOrder.log', "itools:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');

    if (jutil.postCheck(postData, "notify_data", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }

    var notify_data = postData["notify_data"];
    var sign = postData["sign"];

    async.series([
        function (cb) {
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
                    cb(null);
                }
            });
        }
    ], function (err, value) {
        if (err) {
            console.log("签名验证失败");
            response.end(err, "utf-8");
        } else {
            var stringA = notify_data["order_id_com"] != null ? notify_data["order_id_com"].split("#") : [];
            
            if (stringA.length == 4) {
                var uid = stringA[0];
                var userUid = stringA[1];
                var orderNo = stringA[2];
                var productId = stringA[3];

                var orderMoney = notify_data["amount"];
                var count = 1;

                order.updateOrder(userUid, orderNo, "itools", uid, count, orderMoney, 1, "", productId, JSON.stringify(postData), function (err, res) {
                    console.log(err, res)
                    if (res == 1) {
                        console.log("itools_pay", "success");
                        response.end("success", "utf-8");
                    }
                    else {
                        console.log("itools_pay", "failed");
                        response.end("fail", "utf-8");
                    }
                });
            } else {
                console.log("itools_pay", "failed");
                response.end("fail", "utf-8");
            }
        }
    });
}
exports.start = start;