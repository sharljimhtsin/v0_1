/**
 * Created by xiazhengxin on 2017/5/15.
 */

var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var yearCard = require("../model/yearCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var yearCardConfig = {};
    var returnData = {};
    var nowVip = 0;
    async.series([function (cb) {//取得用户基本信息
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else {
                nowVip = res["vip"];
                cb();
            }
        });
    }, function (cb) {//记录充值数
        userVariable.getVariableTime(userUid, "yearCardD", function (err, res) {
            if (res != null && res["value"] != undefined && res["time"] == jutil.day()) {
                returnData["yearCardD"] = res["value"];
                cb();
            } else {
                returnData["yearCardD"] = 0;
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCardTAB', function (err, res) {
            if (err) {
                cb(err);
            } else if (res != null && res['value'] == "360") {
                returnData["yearCardStatus"] = 1;
                returnData["yearCardBuyTime"] = res["time"];
                cb();
            } else {
                returnData["yearCardStatus"] = 0;
                returnData["yearCardBuyTime"] = 0;
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCard', function (err, res) {
            if (err) {
                cb(err);
            } else if (res != null) {
                if (res['time'] > jutil.todayTime()) {
                    returnData["yearCardTodayStatus"] = 1;
                    cb();
                } else {
                    returnData["yearCardTodayStatus"] = 0;
                    cb();
                }
            } else {
                returnData["yearCardTodayStatus"] = 0;
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCardForVip', function (err, res) {
            if (err) {
                cb(err);
            } else if (res != null && res["value"] != undefined) {
                returnData["beforeVip"] = res["value"];
                cb();
            } else {
                returnData["beforeVip"] = nowVip;
                cb();
            }
        });
    }, function (cb) {
        userVariable.getVariableTime(userUid, 'yearCardForVipS', function (err, res) {
            if (err) {
                cb(err);
            } else if (res != null && res["value"] != undefined) {
                if (res["value"] == -1) {
                    returnData["vipRewardStatus"] = 1;
                    cb();
                } else {
                    returnData["vipRewardStatus"] = 0;
                    cb();
                }
            } else {
                returnData["vipRewardStatus"] = 0;
                cb();
            }
        });
    }, function (cb) {
        yearCard.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res[2] == undefined) {
                    returnData["yearCardConfig"] = yearCardConfig;
                } else {
                    returnData["yearCardConfig"] = res[2];
                }
                cb();
            }
        });
    }], function (err, res) {
        if (err) {
            response.echo("yearCard.get", jutil.errorInfo(err));
        } else {
            response.echo('yearCard.get', returnData);
        }
    });
}

exports.start = start;