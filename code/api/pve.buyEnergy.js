/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-11
 * Time: 下午8:41
 * To change this template use File | Settings | File Templates.
 */
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
    var addMax = 0;
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
            userVariable.getVariableTime(userUid, "buyEnergy", function (err, res) {//判断是否可以购买
                if (err) {
                    cb(err, null);
                } else {
                    if (res == null || jutil.compTimeDay((res["time"] - 0), jutil.now()) == false) {
                        times = 1;
                        time = jutil.now();
                    } else {
                        times = (res["value"] - 0) + 1;
                        time = res["time"] - 0;
                    }
                    var pvpPower = main["manaBuy"];
                    var pvpPowerConfig = pvpPower["" + times];
                    costIngot = pvpPowerConfig["cost"];
                    getPower = pvpPowerConfig["buyPoint"];

                    if (userData["ingot"] < costIngot) {
                        cb("ingotNotEnough", null);
                    } else if (times > currentVip["manaBuyMaxTime"]) {
                        cb("timesNotEnough", null);
                    } else {
                        cb(null, null);
                    }
                }
            });
        },
        function (cb) { //updateUser
            if(userData["monthCard"] == "fifty"){
                addMax = 18;
            }else{
                addMax = 0;
            }
            var newData = configManager.createConfig(userUid).getPvpPower(userData["pvpPower"] - 0, userData["lastRecoverPvpPower"] - 0, jutil.now(), addMax);
            var needUpdate = {};
            needUpdate["pvpPower"] = newData[0] + getPower;
            needUpdate["lastRecoverPvpPower"] = newData[1];
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
            userVariable.setVariableTime(userUid, "buyEnergy", times, jutil.now(), function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, null);
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("pve.buyEnergy", jutil.errorInfo(err));
        } else {
            achievement.manaBuyTime(userUid, 1, function(){}); // 购买精力

            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
            response.echo("pve.buyEnergy", returnData);
            mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_PVP_POWER, costIngot);
            //TODO: 根据 times 分支
            stats.recordWithLevelIndex(times, [mongoStats.buyEnergy1, mongoStats.buyEnergy2, mongoStats.buyEnergy3,mongoStats.buyEnergy4,mongoStats.buyEnergy5,mongoStats.buyEnergy6,mongoStats.buyEnergy7,mongoStats.buyEnergy8,mongoStats.buyEnergy9,mongoStats.buyEnergy10,mongoStats.buyEnergy11,mongoStats.buyEnergy12,mongoStats.buyEnergy13,mongoStats.buyEnergy14,mongoStats.buyEnergy15,mongoStats.buyEnergy16,mongoStats.buyEnergy17,mongoStats.buyEnergy18,mongoStats.buyEnergy19,mongoStats.buyEnergy20,mongoStats.buyEnergy21,mongoStats.buyEnergy22,mongoStats.buyEnergy23,mongoStats.buyEnergy24,mongoStats.buyEnergy25,mongoStats.buyEnergy26,mongoStats.buyEnergy27,mongoStats.buyEnergy28,mongoStats.buyEnergy29,mongoStats.buyEnergy30,mongoStats.buyEnergy31,mongoStats.buyEnergy32,mongoStats.buyEnergy33,mongoStats.buyEnergy34,mongoStats.buyEnergy35,mongoStats.buyEnergy36,mongoStats.buyEnergy37,mongoStats.buyEnergy38,mongoStats.buyEnergy39,mongoStats.buyEnergy40,mongoStats.buyEnergy41,mongoStats.buyEnergy42,mongoStats.buyEnergy43,mongoStats.buyEnergy44,mongoStats.buyEnergy45,mongoStats.buyEnergy46], function (tag) {
                stats.events(userUid, "127.0.0.1", null, tag);
            }, "", "");
        }
    })
}
exports.start = start;