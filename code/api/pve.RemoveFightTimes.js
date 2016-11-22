/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-23
 * Time: 下午8:32
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var map = require("../model/map");
var battleModel = require("../model/battle");
var configManager = require("../config/configManager");
var achievement = require("../model/achievement");
var mongoStats = require("../model/mongoStats");


function start(postData, response, query) {
    if (jutil.postCheck(postData, "mapId") == false) {
        response.echo("pvp.RemoveFightTimes", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var postMode = (postData["mode"]==undefined)? 'easy':postData["mode"];
    var mapId = postData["mapId"];
    var userData = {};
    var mapData = {};
    var needGold = 0;
    var returnData = {};
    var vipConfig = configManager.createConfig(userUid).getConfig("vip");
    async.auto({
        "userData": function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("noThisUser");
                } else {
                    userData = res;
                    var vipLevel = userData["vip"];
                    var vipItem = vipConfig[vipLevel];
                    if (vipItem["canClearMapLimit"] == 0) {
                        cb("vipNotEnough");
                    } else {
                        cb(null);
                    }
                }
            })
        },
        "mapDataCom": function (cb) {
            map.getMapItem(userUid, mapId, function (err, res) {
                if (err || res == null) {
                    cb("thisMapNotOpen");
                } else {
                    mapData = res;
                    cb(null);
                }
            });
        },
        "updateMap": ["userData", "mapDataCom", function (cb) {
            if (mapData["number"] == 0) {
                cb("noFightNumber");
            } else {
                var vipConfig = configManager.createConfig(userUid).getConfig("vip");
                var mainConfig = configManager.createConfig(userUid).getConfig("main");
                var mapConfig = configManager.createConfig(userUid).getConfig(battleModel.getModeMap(postMode));
                var clearMapCost = mainConfig["clearMapCost"];
                //console.log(battleModel.getModeMap(postMode),mapId,mapConfig[mapId])
                needGold = clearMapCost[mapConfig[mapId]["elite"]];
                var vipItem = vipConfig[userData["vip"]];
                if ((vipItem["canClearMapLimit"] - 0) == 0) {
                    cb("vipNotEnough");
                } else if (needGold > userData["ingot"]) {
                    cb("ingotNotEnough");
                } else {
                    var mapDataUpdate = {};
                    mapDataUpdate["number"] = 0;
                    map.updateMap(userUid, mapId, mapDataUpdate, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            mapDataUpdate["mapId"] = mapId;
                            returnData["updateMap"] = mapDataUpdate;
                            cb(null)
                        }
                    })
                }
            }
        }],
        "updateUser": ["updateMap", function (cb) {
            var upDateUser = {};
            upDateUser["ingot"] = userData["ingot"] - needGold;
            user.updateUser(userUid, upDateUser, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', userData, mongoStats.E_CLEAR_MAP,needGold);
                    returnData["updateUser"] = upDateUser;
                    cb(null);
                }
            })
        }]
    }, function (err) {
        if (err) {
            response.echo("pve.RemoveFightTimes", jutil.errorInfo(err));
        } else {
            achievement.clearMapTime(userUid, 1, function(){});
            response.echo("pve.RemoveFightTimes", returnData);
        }
    });
}
exports.start = start;