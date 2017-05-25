/**
 * Created by xiazhengxin on 2017/5/16.
 */

var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var async = require("async");
var yearCard = require("../model/yearCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var backItems;
    var sTime;
    var reward = [];
    var currentConfig;
    var userVip = 0;
    async.series([function (cb) {//取得用户月卡奖励领取情况
        userVariable.getVariableTime(userUid, 'yearCardForVipS', function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    if (res['value'] == -1) {
                        cb('Already received awards');
                    } else {
                        cb();
                    }
                } else {
                    cb();
                }
            }
        });
    }, function (cb) {//取得用户月卡奖励领取情况
        userVariable.getVariableTime(userUid, 'yearCardForVip', function (err, res) {
            if (err || res == null) {
                cb('dbError');
            } else {
                userVip = res["value"] - 0;
                cb();
            }
        });
    }, function (cb) {
        yearCard.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                currentConfig = res[2];
                if (currentConfig == null || currentConfig["vipReward"] == undefined || currentConfig["vipReward"][userVip] == undefined) {
                    cb("configError");
                } else {
                    reward = currentConfig["vipReward"][userVip];
                    cb();
                }
            }
        });
    }, function (cb) {
        yearCard.reward(userUid, reward, function (err, res) {
            backItems = res;
            cb(err);
        }, true);
    }], function (err, res) {
        if (err) {
            response.echo("yearCard.vipReward", jutil.errorInfo(err));
        } else {
            response.echo('yearCard.vipReward', backItems);
        }
    });
}

exports.start = start;