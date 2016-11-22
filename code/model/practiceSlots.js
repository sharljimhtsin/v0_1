/**
 * Created with JetBrains WebStorm.
 * 新拉霸model
 * User: za
 * Date: 15-11-27 预计两周
 * Time: 下午17:53
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var bitUtil = require("../alien/db/bitUtil");
var mysql = require("../alien/db/mysql");

var mongoStats = require("../model/mongoStats");
var gsData = require("../model/gsData");


var ACTIVITY_CONFIG_NAME = "slots";
//获取配置
function getConfig(userUid, callbackFn) {
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function (err, res) {
        if (err || res == null)callbackFn("CannotgetConfig");
        else {
            if (res[0]) {
                var sTime = res[4] - 0;
                var eTime = sTime + 604800;//7天一期
                if (jutil.now() >= eTime) {
                    callbackFn("notOpen");
                } else {
                    var activityArg = parseInt(res[1]);
                    if (isNaN(activityArg))activityArg = 0;
                    var currentConfig = null;
                    if (activityArg == -1) {
                        // 取数据库配置，如果配置不存在取默认配置
                        currentConfig = res[2] || res[3]["1"];
                    }
                    else {
                        // 取指定配置，如果配置不存在取默认配置
                        currentConfig = res[3][activityArg] || res[3]["1"];
                    }
                    if (!currentConfig) {
                        callbackFn("configError");
                    } else {
                        callbackFn(null, [sTime, eTime, currentConfig]);
                    }
                }
            } else {
                callbackFn("notOpen");
            }
        }
    });
}
//获取全平台数据
function getServerData(userUid, isAll, key, sTime, callbackFn) {
    var mCounrty = bitUtil.parseUserUid(userUid);
    var crty = mCounrty[0];
    var gData = {};
    redis[isAll ? "loginFromUserUid" : "domain"](userUid).s("slots:" + key).get(function (err, res) {
        gsData.getGSDataList(crty, ACTIVITY_CONFIG_NAME, function (err, res) {
            if (err)callbackFn(err);
            else {
                if (res[0] == undefined) {
                    gData = {"data": 0, "status": 1};
                    gsData.addGSDataInfo(userUid,ACTIVITY_CONFIG_NAME,sTime,gData,callbackFn);
                } else {
                    gData = res[0]["data"];
                    callbackFn(null, gData);
                }
                redis[isAll ? "loginFromUserUid" : "domain"](userUid).s("slots:" + key).setex(604800, gData, function(){});
            }
        });
    });
}
//设置全平台数据
function setServerData(userUid, isAll, key, sTime, eTime, point, callbackFn) {
    redis[isAll ? "loginFromUserUid" : "domain"](userUid).s("slots:" + key).set(point, function (err, res) {
        var gData = {};
        if (eTime <= jutil.now()) {
            gData = {"data": point, "status": 2};
        } else {
            gData = {"data": point, "status": 1};
        }
        gsData.updateGSDataInfo(userUid, ACTIVITY_CONFIG_NAME, sTime, gData, callbackFn);
    });
}
//获取大奖数据
function getCDKey(userUid, key, isAll, callbackFn) {
    redis[isAll ? "loginFromUserUid" : "domain"](userUid).h("slotsCDKey:" + key).getAllJSON(callbackFn);
}
//设置大奖数据
function setCDKey(userUid, key, isAll, cList, callbackFn) {
    redis[isAll ? "loginFromUserUid" : "domain"](userUid).h("slotsCDKey:" + key).setAllJSON(cList, callbackFn);
}
//获取领取奖励状态
function getRewardData(userUid, sTime, eTime, callbackFn) {//sTime
    var returnData = {"data": 0, "dataTime": sTime, "status": 0, "statusTime": eTime, "arg": {}};
    var statusList = [0, 0, 0, 0, 0, 0, 0];
    var rewardDataLog = [];
    var rewardKeyLog = [];
    var isNew = true;//验证是否是新的一期活动
    async.series([function (cb) {
        activityData.getActivityData(userUid, activityData.PRACTICE_SLOTS, function (err, res) {
            if (res != null && res["dataTime"] == sTime) {//判断是否同一期活动
                returnData["data"] = res["data"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["dataTime"] = sTime - 0;
                returnData["statusTime"] = eTime - 0;
                isNew = false;
            }
            cb(err);
        });
    }, function (cb) {
        redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).getObj(function (err, res) {
            if (isNew) {
                var arg = {};
                arg["statusList"] = statusList;
                arg["rewardDataLog"] = rewardDataLog;
                arg["rewardKeyLog"] = rewardKeyLog;
                returnData["arg"] = arg;
                redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).setObjex(604800, arg, cb);
            } else {
                returnData["arg"] = res;
                cb(err);
            }
        });
    }], function (err, res) {
        callbackFn(err, returnData);
    });
}
//设置领取奖励状态
function setRewardData(userUid, data, callbackFn) {
    var arg = data["arg"];
//    delete data["arg"];
    activityData.updateActivityData(userUid, activityData.PRACTICE_SLOTS, data, function (err, res) {
        redis.user(userUid).s("practice:" + ACTIVITY_CONFIG_NAME).setObj(arg, callbackFn);//setObjex
    });
}

exports.getConfig = getConfig;//获取配置
exports.getRewardData = getRewardData;//获取领取奖励数据
exports.setRewardData = setRewardData;//设置领取奖励数据
exports.getServerData = getServerData;//获取全平台数据
exports.setServerData = setServerData;//设置全平台数据

exports.getCDKey = getCDKey;//获取大奖数据
exports.setCDKey = setCDKey;//设置大奖数据
