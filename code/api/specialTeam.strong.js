/**
 * 特战队强化
 * User: joseppe
 * Date: 14-4-22
 * Time: 下午15:45
 */

var specialTeam = require("../model/specialTeam");
var item = require("../model/item");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    var userUid = query["userUid"];

    if (jutil.postCheck(postData, "position") == false) {
        response.echo("specialTeam.strong", jutil.errorInfo("postError"));
        return false;
    }

    var position = postData["position"];
    var count = postData["count"] ? postData["count"] : 1;
    var configData = configManager.createConfig(userUid);
    var levelUpCost;
    var levelUpConfig;
    var specialTeamData;
    var itemId;
    if(position<=10){
        itemId = 152401;
    }else if(position>10&&position<=20){
        itemId = 153501;
    }else if(position>20&&position<=30){
        itemId = 155401;
    }else{// if(position>30&&position<=40)
        itemId = 155701;
    }

    var itemData;
    var _posId = position; // 位置ID
    var _oldStrong = 0; // 旧等级
    var _newStrong = 0; // 新等级

    async.series([
        function(callbackFn){//取得位置信息
            specialTeam.getByPosition(userUid, position, function(err, res){
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn('isLocked');
                } else {
                    specialTeamData = res;
                    _oldStrong = specialTeamData["strong"] - 0;
                    callbackFn(null);
                }
            });
        },
        function (callbackFn) {
            async.timesSeries(count, function (n, nextCb) {
                async.series([function (oneCb) {//根据位置取配置表信息
                    var config = configData.getConfig("specialTeam");
                    if (config["levelUpCost"] == undefined) {
                        oneCb('postError');
                    } else if (config["level"][specialTeamData.level] == undefined) {
                        oneCb('postError');
                    } else if (config["level"][specialTeamData.level]['levelUpProb'][specialTeamData['times'] + 1] == undefined) {
                        oneCb('strongest');
                    } else {
                        levelUpCost = config["levelUpCost"];
                        levelUpConfig = config["level"][specialTeamData.level];
                        oneCb();
                    }
                }, function (oneCb) {
                    item.getItem(userUid, itemId, function (err, res) {
                        if (err || res == null) {
                            oneCb("propsNotExist");
                        } else if (res['number'] < levelUpCost) {
                            oneCb("propsNotExist");
                        } else {
                            oneCb();
                        }
                    });
                }, function (oneCb) {//计算强化后数据
                    var len = levelUpConfig["randomValue"].length;
                    //是否升级
                    var r = Math.floor(Math.random() * len);
                    specialTeamData['times']++;
                    if (levelUpConfig['levelUpProb'][specialTeamData['times']] != undefined && specialTeamData['strong'] == levelUpConfig["randomValue"][r]) {
                        if (levelUpConfig["randomValue"][r + 1] != undefined)
                            r++;
                        else if (levelUpConfig["randomValue"][r - 1] != undefined)
                            r--;
                    }
                    specialTeamData['strong'] = levelUpConfig["randomValue"][r];
                    if (levelUpConfig['levelUpProb'][specialTeamData['times']] != undefined && Math.random() <= levelUpConfig['levelUpProb'][specialTeamData['times']]) {
                        //升级
                        specialTeamData['times'] = 0;
                        specialTeamData['level']++;
                    }
                    _newStrong = specialTeamData['strong'];
                    oneCb();
                }, function (oneCb) {//更新勋章
                    item.updateItem(userUid, itemId, 0 - levelUpCost, function (err, res) {
                        if (err || res == null) {
                            oneCb("propsNotExist");
                        } else {
                            itemData = res;
                            oneCb();
                        }
                    });
                }], nextCb);
            }, callbackFn);
        },
        function(callbackFn){//更新特战队数据
            specialTeam.updateByPosition(userUid, position, specialTeamData, function (err, res) {
                //TODO: 根据 position 分支
                stats.recordWithLevelIndex(position, [mongoStats.specialTeamStrong1, mongoStats.specialTeamStrong2, mongoStats.specialTeamStrong3, mongoStats.specialTeamStrong4, mongoStats.specialTeamStrong5,
                    mongoStats.specialTeamStrong6, mongoStats.specialTeamStrong7, mongoStats.specialTeamStrong8, mongoStats.specialTeamStrong9, mongoStats.specialTeamStrong10, mongoStats.specialTeamStrong11,
                    mongoStats.specialTeamStrong12, mongoStats.specialTeamStrong13, mongoStats.specialTeamStrong14, mongoStats.specialTeamStrong15, mongoStats.specialTeamStrong16, mongoStats.specialTeamStrong17,
                    mongoStats.specialTeamStrong18, mongoStats.specialTeamStrong19, mongoStats.specialTeamStrong20,mongoStats.specialTeamStrong21,mongoStats.specialTeamStrong22, mongoStats.specialTeamStrong23,
                    mongoStats.specialTeamStrong24,mongoStats.specialTeamStrong25, mongoStats.specialTeamStrong26, mongoStats.specialTeamStrong27,mongoStats.specialTeamStrong28, mongoStats.specialTeamStrong29,
                    mongoStats.specialTeamStrong30,mongoStats.specialTeamStrong31,mongoStats.specialTeamStrong32, mongoStats.specialTeamStrong33,mongoStats.specialTeamStrong34,mongoStats.specialTeamStrong35,
                    mongoStats.specialTeamStrong36, mongoStats.specialTeamStrong37,mongoStats.specialTeamStrong38, mongoStats.specialTeamStrong39,mongoStats.specialTeamStrong40], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                callbackFn(err, null);
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("specialTeam.strong", jutil.errorInfo(err));
        } else {
            achievement.specialTeamLevelUp(userUid, _newStrong, function () {
            });
            timeLimitActivityReward.specialTeamLevelUp(userUid, _posId, _oldStrong, _newStrong, function () {
                response.echo("specialTeam.strong", {'specialTeamData': specialTeamData, 'itemData': itemData});
            });
        }
    });
}

exports.start = start;