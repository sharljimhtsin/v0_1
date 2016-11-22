/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-7-11
 * Time: 下午 15:55
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var integral = require("../model/integralBattle");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "count") == false) {
        response.echo("integralBattle.buyBattleTimes", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var buyCount = postData["count"] - 0;//购买战斗次数
    var sTime;
    var currentConfig;
    var payConfig;
    var userData = {};
    var userPay = 0;
    var limit = 0;
    var key = "";
    var battleTimes = 0;
    var number = 0;
    var returnData = {};
    var statusTime = 0;
    var eTime = 0;
    var isAll = 0;
    async.series([function (cb) {
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                currentConfig = res[2];
                eTime = res[1];
                if (currentConfig["payList"] == undefined || currentConfig["buyTimesLimit"] == undefined || currentConfig["key"] == undefined) {
                    cb("configError");
                } else {
                    var endTime = eTime - 86400;
                    var leTime = jutil.todayTime() + 900;
                    if ((jutil.now() >= endTime && jutil.now() <= eTime) || (jutil.now() >= jutil.todayTime() && jutil.now() <= leTime)) {//1.活动结束 2.刷新数据脚本 0:00,0:15
                        cb("Not match,please re-login!");//notOpen
                    } else {
                        key = currentConfig["key"];
                        payConfig = currentConfig["payList"];
                        limit = currentConfig["buyTimesLimit"];
                        isAll = parseInt(res[2]["isAll"]) || 0;
                        cb(null);
                    }
                }
            }
        });
    }, function (cb) {
        integral.getUserData(userUid, sTime, function (err, res) {
            if (err)cb(err);
            else {
                userData = res;
                if (userData["statusTime"] == undefined) {
                    cb("dbError");
                } else {
                    statusTime = userData["statusTime"] - 0;
                    cb(null);
                }
            }
        });
    }, function (cb) {
        integral.getBattleTimes(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                battleTimes = res - 0;
                if (res + buyCount > limit) {
                    cb("timesNotEnough");//次数上限
                } else {
                    number = res - 0;
                    cb(null);
                }
            }
        });
    }, function (cb) {
        payConfig = currentConfig["payList"];
        for (var i = 1; i <= buyCount; i++) {
            number++;
            for (var p in payConfig) {
                if (payConfig[p]["s"] <= number && number <= payConfig[p]["e"]) {
                    userPay += payConfig[p]["pay"];
                    break;
                }
            }
        }
        cb(null);
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res["ingot"] - userPay < 0) {
                    cb("ingotNotEnough");
                } else {
                    var newCt = res["ingot"] - userPay;
                    returnData["residueItem"] = {"ingot": newCt};
                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE9, userPay);//积分擂台赛金币消耗
                    user.updateUser(userUid, {"ingot": newCt}, cb);
                }
            }
        });
    }, function (cb) {
        userData["statusTime"] = statusTime + buyCount;
        returnData["userData"] = {
            "winTimes": userData["data"],
            "dataTime": sTime,
            "eTime": eTime,
            "point": userData["status"],
            "battleTimes": userData["statusTime"],
            "residueTimesList": userData["arg"]["residueTimesList"]
        };
        integral.setUserData(userUid, userData, cb);
    }, function (cb) {
        var nowTimes = battleTimes + buyCount;
        returnData["buyBattleTimes"] = nowTimes - 0;
        integral.setBattleTimes(userUid, key, isAll, nowTimes, cb);
    }], function (err) {
        if (err) {
            response.echo("integralBattle.buyBattleTimes", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.buyBattleTimes", returnData);
        }
    });
}

exports.start = start;