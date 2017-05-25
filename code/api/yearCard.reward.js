/**
 * Created by xiazhengxin on 2017/5/16.
 */

var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var yearCard = require("../model/yearCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var yearCardTime = 0;
    var backItems;
    var times = 360;
    var sTime;
    var quarterData = {};
    var reward = [];
    var userData = {};
    var currentConfig;
    var yearCardTAB;
    async.series([function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else {
                userData = res;
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCardTAB', function (err, res) {
            yearCardTAB = res;
            cb(err);
        });
    }, function (cb) {
        yearCard.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                currentConfig = res[2];
                if (currentConfig == null || currentConfig["buy"]["back"] == undefined) {
                    cb("configError");
                } else {
                    reward = currentConfig["buy"]["back"];
                    cb();
                }
            }
        });
    }, function (cb) {
        yearCard.getUserData(userUid, sTime, function (err, res) {
            if (err) {
                cb(err);
            } else {
                quarterData = res;
                if (yearCardTAB == null || yearCardTAB["value"] == undefined || yearCardTAB["time"] <= jutil.now()) {
                    cb("Have no yearCard!");
                } else {
                    yearCardTime = quarterData["data"];
                    cb();
                }
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCard', function (err, res) {
            if (err || res == null) {
                cb('dbError');
            } else if (res['time'] > jutil.todayTime()) {
                cb('Already received awards');
            } else {
                times = res['value'];
                if (times - 1 == 0) {
                    userData["cumulativePay"] = 0;
                    user.updateUser(userUid, {'cumulativePay': userData["cumulativePay"]}, cb);
                } else {
                    cb();
                }
            }
        });
    }, function (cb) {
        userVariable.setVariableTime(userUid, 'yearCard', times - 1, jutil.todayTime() + 86400, cb);
    }, function (cb) {
        yearCard.reward(userUid, reward, function (err, res) {
            backItems = res;
            times--;
            cb(err);
        });
    }, function (cb) {
        if (times > 0 && yearCardTime == jutil.todayTime() + 86400) {
            //调用一个方法，发放剩余所有奖励到邮箱
            yearCard.rewardToMail(userUid, times, reward, 0, cb);
        } else {
            cb();
        }
    }], function (err, res) {
        if (err) {
            response.echo("yearCard.reward", jutil.errorInfo(err));
        } else {
            response.echo('yearCard.reward', backItems);
        }
    });
}

exports.start = start;