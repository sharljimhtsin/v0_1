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
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {//1.免费刷新：每天有10次,扣次数，2.手动刷新：扣金币，3.自动刷新：免费
    if (jutil.postCheck(postData, "type", "fight") == false) {
        response.echo("integralBattle.refresh", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var freshType = postData["type"];
    var fight = postData["fight"];
    var sTime;
    var currentConfig;
    var userIngot = 0;
    var refreshPay = 0;
    var key = "";
    var returnData = {};
    var freshTimes = 0;
    var isAll = 0;
    var eTime = 0;
    async.series([function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res["ingot"] == undefined) {
                    cb("dbError");
                } else {
                    userIngot = res["ingot"] - 0;
                    cb(null);
                }
            }
        });
    }, function (cb) {
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                eTime = res[1];
                currentConfig = res[2];
                if (currentConfig == undefined || currentConfig["refreshPay"] == undefined) {
                    cb("configError");
                } else {
                    var endTime = eTime - 86400;
                    var leTime = jutil.todayTime() + 900;
                    if ((jutil.now() >= endTime && jutil.now() <= eTime) || (jutil.now() >= jutil.todayTime() && jutil.now() <= leTime)) {//1.活动结束 2.刷新数据脚本 0:00,0:15
                        cb("Not match,please re-login!");//notOpen
                    } else {
                        refreshPay = currentConfig["refreshPay"];
                        key = currentConfig["key"];
                        isAll = parseInt(res[2]["isAll"]) || 0;
                        cb(null);
                    }
                }
            }
        });
    }, function (cb) {
        integral.getFreshTimes(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                freshTimes = res - 0;
                cb(null);
            }
        });
    }, function (cb) {
        if (freshType == "0") {//手动刷新
            if (freshTimes == undefined) {//刷新次数
                cb("dbError");
            } else {
                if (freshTimes - 1 < 0) {//次数不够，花钱买次数
                    if (userIngot - refreshPay <= 0) {
                        cb("ingotNotEnough");
                    } else {
                        var newCt = userIngot - refreshPay;
                        returnData["residueItem"] = {"ingot": newCt};
                        mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE9, refreshPay);//积分擂台赛金币消耗
                        user.updateUser(userUid, {"ingot": userIngot - refreshPay}, cb);//扣钱
                    }
                } else {//次数够
                    freshTimes--;
                    cb(null);
                }
            }
        } else if (freshType == "1") {//自动刷新（战胜3个boss）
            cb(null);
        } else {
            cb("typeError");
        }
    }, function (cb) {//刷新战斗力列表
        integral.freshFightList(userUid, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["FightList"] = res;
                cb(null);
            }
        });
    }, function (cb) {//取用户方战斗力
        integral.freshFight(userUid, fight, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["myFight"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        returnData["freshTimes"] = freshTimes;
        stats.events(userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE2);//积分擂台赛对手刷新次数
        integral.setFreshTimes(userUid, key, isAll, freshTimes, cb);
    }], function (err) {
        if (err) {
            response.echo("integralBattle.refresh", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.refresh", returnData);
        }
    });
}

exports.start = start;