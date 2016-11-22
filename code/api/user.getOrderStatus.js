/**
* Created by apple on 14-2-12.
    */

var user = require("../model/user");
var async = require("async");
var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var userVariable = require("../model/userVariable");
/**
 * 请求订单状态，判断是否所有订单已完成
 * 若有，则返回1，前端停止请求
 * 若无，则返回0，前端会每隔一分钟再次请求；
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {

    var userUid = query["userUid"];
    var orderStatus = 0;
    var chargeSuccessFlag = 0;
    var userInfo = {};

    async.series([
        function(cb) {//查询在有效时间内的，未完成的订单
            var sql = "SELECT * FROM payOrder WHERE userUid = " + mysql.escape(userUid) +
                " AND createTime > " + mysql.escape(jutil.nowMillisecond() * 0.001 - 5 * 60) + //5min
                " AND status = 0";
            console.log("sql: " + sql);
            mysql.game(userUid).query(sql, function(err, res) {
                if (err) cb("dbError");
                else {
                    if (res) {
                        orderStatus = res.length <= 0 ? 1 : 0;//无未完成订单
                        cb(null);
                    } else {
                        cb("dbError");
                    }
                }
            });
        },
        function(cb){//查询充值成功标识
            userVariable.getVariable(userUid,"chargeSuccessFlag",function(err,res){
                if(err) cb("dbError");
                else{
                    if(res == null){
                        chargeSuccessFlag = 0;
                        cb(null);
                    }
                    else{
                        chargeSuccessFlag = res;
                        if(chargeSuccessFlag == 1){//重置
                            userVariable.setVariableTime(userUid,"chargeSuccessFlag",0,jutil.now(),function(err,res){
                                if (err) console.error(userUid, 0, jutil.now(), err.stack);
                                cb(null);
                            });
                        }
                        else{
                            cb(null);
                        }
                    }
                }
            });
        },
        function(cb) { //取玩家的伊美加币
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    userInfo["ingot"] = res["ingot"];
                    userInfo["gold"] = res["gold"];
                    userInfo["vip"] = res["vip"];
                    userInfo["cumulativePay"] = res["cumulativePay"];
                    cb(null);
                }
            });
        }
    ],function(err,res) {
        if (err) {
            response.echo("user.getOrderStatus",jutil.errorInfo("getUserError"));
        } else {
            response.echo("user.getOrderStatus",{"orderStatus":orderStatus,"chargeSuccessFlag":chargeSuccessFlag,"userInfo":userInfo});
        }
    });
}

exports.start = start;