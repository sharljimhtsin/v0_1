/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-11
 * Time: 下午8:41
 * To change this template use File | Settings | File Templates.
 */
//pve.buyPhysical
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");
var achievement = require("../model/achievement");
var stats = require("../model/stats");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var times; //次数
    var time;//时间
    var main = configManager.createConfig(userUid).getConfig("main");
    var vip = configManager.createConfig(userUid).getConfig("vip");
    var costIngot;
    var getPower;
    var currentVip;
    var returnData;
    var userData;
    async.series([
        function (cb) {
            user.getUser(userUid, function (err, res) {//判断是否可以购买
                if (err) {
                    cb(err, null);
                } else {
                    if (res == null) {
                        cb("noThisUser", null);
                        return;
                    }
                    userData = res;
                    currentVip = vip["" + res["vip"]];
                    cb(null, null);
                }
            });
        },
        function (cb) {
            userVariable.getVariableTime(userUid, "buyPhysical", function (err, res) {//判断是否可以购买
                if (err) {
                    cb(err, null);
                } else {
                    if (res == null || jutil.compTimeDay((res["time"] - 0), jutil.now()) == false) {
                        times = 1;
                        time = jutil.now();
                    } else {
                        times = (res["value"] - 0) + 1;
                        time = res["time"];
                    }
                    var pvePower = main["PowerBuy"];
                    var pvePowerConfig = pvePower["" + times];
                    costIngot = pvePowerConfig["cost"];
                    getPower = pvePowerConfig["buyPoint"];
                    if (userData["ingot"] < costIngot) {
                        cb("ingotNotEnough", null);
                    } else if (times > currentVip["powerBuyMaxTime"]) {
                        cb("timesNotEnough", null);
                    } else {
                        cb(null, null);
                    }
                }
            });
        },
        function (cb) { //updateUser
            var newData = configManager.createConfig(userUid).getPvePower(userData["pvePower"] - 0, userData["lastRecoverPvePower"] - 0, jutil.now());
            var needUpdate = {};
            needUpdate["pvePower"] = newData[0] + getPower;
            needUpdate["lastRecoverPvePower"] = newData[1];
            needUpdate["ingot"] = userData["ingot"] - costIngot;
            user.updateUser(userUid, needUpdate, function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    returnData = needUpdate;
                    cb(null, null);
                }
            });
        },
        function (cb) {//设置购买结果
            userVariable.setVariableTime(userUid, "buyPhysical", times, jutil.now(), function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, null);
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("pve.buyPhysical", jutil.errorInfo(err));
        } else {
            achievement.powerBuyTime(userUid, 1, function(){}); // 购买体力

            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
            response.echo("pve.buyPhysical", returnData);
            mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_PVE_POWER, costIngot);
            //TODO: 根据 times 分支
            stats.recordWithLevelIndex(times, [mongoStats.buyPhysical1, mongoStats.buyPhysical2, mongoStats.buyPhysical3,mongoStats.buyPhysical4,mongoStats.buyPhysical5,mongoStats.buyPhysical6,mongoStats.buyPhysical7,mongoStats.buyPhysical8,mongoStats.buyPhysical9,mongoStats.buyPhysical10,mongoStats.buyPhysical11,mongoStats.buyPhysical12,mongoStats.buyPhysical13,mongoStats.buyPhysical14,mongoStats.buyPhysical15,mongoStats.buyPhysical16,mongoStats.buyPhysical17,mongoStats.buyPhysical18,mongoStats.buyPhysical19,mongoStats.buyPhysical20,mongoStats.buyPhysical21,mongoStats.buyPhysical22,mongoStats.buyPhysical23,mongoStats.buyPhysical24,mongoStats.buyPhysical25,mongoStats.buyPhysical26,mongoStats.buyPhysical27,mongoStats.buyPhysical28,mongoStats.buyPhysical29,mongoStats.buyPhysical30,mongoStats.buyPhysical31,mongoStats.buyPhysical32,mongoStats.buyPhysical33,mongoStats.buyPhysical34,mongoStats.buyPhysical35,mongoStats.buyPhysical36,mongoStats.buyPhysical37,mongoStats.buyPhysical38,mongoStats.buyPhysical39,mongoStats.buyPhysical40,mongoStats.buyPhysical41,mongoStats.buyPhysical42,mongoStats.buyPhysical43,mongoStats.buyPhysical44,mongoStats.buyPhysical45,mongoStats.buyPhysical46], function (tag) {
                stats.events(userUid, "127.0.0.1", null, tag);
            }, "", "");
        }
    })
}
exports.start = start;