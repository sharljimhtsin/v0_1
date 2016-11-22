/**
 * Created by xiayanxin on 2016/10/26.
 */

var jutil = require("../code/utils/jutil");
var userVariable = require("../code/model/userVariable");
var user = require("../code/model/user");
var async = require("async");
var quarterCard = require("../code/model/quarterCard");
var achievement = require("../code/model/achievement");
var monthCard = require("../code/model/monthCard");

var userUid = "26004692763";
var quarterCardConfig = {};
var userData = {};
var returnData = {};
var sTime;
var quarterData = {};
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
    userVariable.getVariableTime(userUid, 'quarterCardTAB', function (err, res) {
        if (res != null && res['value'] == "ninety" && res['time'] > jutil.todayTime()) {
            cb("alreadyHaveQuarterCard");
        } else {
            cb();//可以买
        }
    });
}, function (cb) {
    quarterCard.getConfig(userUid, function (err, res) {
        if (err) cb(err);
        else {
            sTime = res[0];
            quarterCardConfig = res[2]["buy"];
            cb();
        }
    });
}, function (cb) {
    quarterCard.getUserData(userUid, sTime, function (err, res) {
        if (err) cb(err);
        else {
            quarterData = res;
            cb();
        }
    });
}, function (cb) {//允许购买
    quarterData["data"] = jutil.todayTime() + 86400 * 30 * 3;//过期时间
    cb();
}, function (cb) {//重置领取奖励数据
    returnData["buyTime"] = quarterData["data"];
    userVariable.setVariableTime(userUid, 'quarterCardTAB', "ninety", quarterData["data"], cb);
}, function (cb) {//重置领取奖励数据
    userVariable.setVariableTime(userUid, 'quarterCardForVip', userData["vip"], jutil.todayTime(), cb);
}, function (cb) {
    quarterCard.setUserData(userUid, quarterData, cb);
}, function (cb) {//重置领取奖励数据
    userVariable.setVariableTime(userUid, 'quarterCard', 90, jutil.todayTime(), cb);
}], function (err, res) {
    if (err) {
        console.log('error:' + err);
    } else {
        achievement.quarterCardBuy(userUid, function () {
            console.log('ok:');
        });
    }
});