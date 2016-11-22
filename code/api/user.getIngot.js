/**
 * Created by apple on 14-2-12.
 */

var user = require("../model/user");
var async = require("async");
var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"orderNo") == false) {
        response.echo("user.getIngot",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var orderNo = postData["orderNo"];
    var orderStatus = 0;

    async.series([
        function(cb) {//获取订单状态
            var sql = "SELECT * FROM payOrder WHERE orderNo=" + mysql.escape(orderNo);
            mysql.game(userUid).query(sql, function(err, res) {
                if (err) cb("dbError");
                else {
                    var res1 = res[0];
                    if (res1) {
                        orderStatus = res1["status"];
                        cb(null);
                    } else {
                        cb("dbError");
                    }
                }
            });
        },

        function(callbackFn) {
            user.getUser(userUid,callbackFn);
        }
    ],function(err,res) {
        if (err) {
            response.echo("user.getIngot",jutil.errorInfo("getUserError"));
        } else {
            var echoObj = {};
            echoObj["ingot"] = res[1]["ingot"];
            echoObj["gold"] = res[1]["gold"];
            echoObj["vip"] = res[1]["vip"];
            echoObj["cumulativePay"] = res[1]["cumulativePay"];
            echoObj["orderStatus"] = orderStatus;
            response.echo("user.getIngot",echoObj);
        }
    });
}

exports.start = start;