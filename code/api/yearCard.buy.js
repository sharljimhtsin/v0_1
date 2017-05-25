/**
 * Created by xiazhengxin on 2017/5/16.
 */

var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var async = require("async");
var yearCard = require("../model/yearCard");
var monthCard = require("../model/monthCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var yearCardConfig = {};
    var userData = {};
    var returnData = {};
    var sTime;
    var quarterData = {};
    var userCumulativePay = 0;
    async.series([function (cb) {//取得用户基本信息
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else {
                userData = res;
                cb();
            }
        });
    }, function (cb) {//取得用户季卡奖励领取情况
        userVariable.getVariableTime(userUid, 'yearCardForVip', function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null && res["value"] != undefined) {
                    returnData["beforeVip"] = res["value"];
                    cb();
                } else {
                    returnData["beforeVip"] = userData["vip"];
                    cb();
                }
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, "yearCardD", function (err, res) {
            if (res != null && res["time"] == jutil.day()) {
                userCumulativePay = parseInt(res["value"]);
                cb();
            } else {
                cb("needMoreRecharge");
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCardTAB', function (err, res) {
            if (res != null && res['value'] == "360" && res['time'] > jutil.todayTime()) {
                cb("alreadyHaveQuarterCard");
            } else {
                cb();//可以买
            }
        });
    }, function (cb) {
        yearCard.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                yearCardConfig = res[2]["buy"];
                cb();
            }
        });
    }, function (cb) {
        yearCard.getUserData(userUid, sTime, function (err, res) {
            if (err) {
                cb(err);
            } else {
                quarterData = res;
                cb();
            }
        });
    }, function (cb) {//判断是否已经拥有月卡
        if (userData["ingot"] < yearCardConfig["ingot"]) {//ingot不足购买当前种类月卡
            cb('ingotNotEnough');
        } else if (userCumulativePay < yearCardConfig["payAll"]) {
            cb('needMoreRecharge');
        } else {
            userCumulativePay = userData["cumulativePay"] - yearCardConfig["payAll"];
            cb();
        }
    }, function (cb) {//判断上次未领取奖励
        userVariable.getVariableTime(userUid, 'yearCard', function (err, res) {
            if (res == null || res['value'] <= 0) {
                cb();
            } else {
                yearCard.rewardToMail(userUid, res['value'], yearCardConfig["back"], 0, cb);
            }
        });
    }, function (cb) {//允许购买
        //1.扣除ingot 2.重置用户累计充值数 3.修改用户季卡类型
        userData["ingot"] = userData["ingot"] - yearCardConfig["ingot"];
        quarterData["data"] = jutil.todayTime() + 86400 * 30 * 12;//过期时间
        monthCard.isWork(userUid, function (err, res, obj) {
            if (res) {
                returnData["userData"] = {'ingot': userData["ingot"], 'cumulativePay': userCumulativePay};
            } else {
                returnData["userData"] = {'ingot': userData["ingot"]};
            }
            user.updateUser(userUid, returnData["userData"], function (err, res) {
                if (err)
                    cb("dbError");
                else {//統計累消
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', userData, mongoStats.E_QUARTERCARD, yearCardConfig["ingot"]);
                    cb();
                }
            });
        });
    }, function (cb) {//重置领取奖励数据
        returnData["buyTime"] = quarterData["data"];
        userVariable.setVariableTime(userUid, 'yearCardTAB', "360", quarterData["data"], cb);
    }, function (cb) {//重置领取奖励数据
        userVariable.setVariableTime(userUid, 'yearCardForVip', userData["vip"], jutil.todayTime(), cb);
    }, function (cb) {
        yearCard.setUserData(userUid, quarterData, cb);
    }, function (cb) {//重置领取奖励数据
        userVariable.setVariableTime(userUid, 'yearCard', 360, jutil.todayTime(), cb);
    }, function (cb) {
        userVariable.delVariable(userUid, "yearCardForVipS", cb);
    }], function (err, res) {
        if (err) {
            response.echo("yearCard.buy", jutil.errorInfo(err));
        } else {
            response.echo('yearCard.buy', returnData);
        }
    });
}

exports.start = start;