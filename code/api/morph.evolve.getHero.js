/**
 * Created by xiazhengxin on 2015/4/14 11:42.
 *
 * 异度空间 异度恶化 恶化操作
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var hero = require("../model/hero");
var formation = require("../model/formation");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var TAG = "morph.evolve.getHero";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData;
    var key;
    var costConfig;
    var rewardConfig;
    var heroList;
    var heroUid = postData["heroUid"];
    var costObj;
    var rewardObj;
    var userData = [];
    var rewardHeroList = [];
    var rewardHeroSoulList = [];
    var breakLimit = 0;
    async.series([function (cb) {
        morphData.getConfig(userUid, false, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
                costConfig = configData["cost"];
                rewardConfig = configData["reward"];
                breakLimit = configData["break"];
                cb();
            }
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            heroList = res;
            cb(err);
        });
    }, function (cb) {
        if (heroList && heroList[heroUid] && breakLimit[heroList[heroUid]["heroId"]] && heroList[heroUid]["break"] >= breakLimit[heroList[heroUid]["heroId"]]) {
            cb();
        } else {
            cb("hero invalid");
        }
    }, function (cb) {
        var heroObj = heroList[heroUid];
        if (costConfig.hasOwnProperty(heroObj["heroId"])) {
            costObj = costConfig[heroObj["heroId"]];
            rewardObj = rewardConfig[heroObj["heroId"]];
            cb();
        } else {
            cb("hero invalid");
        }
    }, function (cb) {
        async.eachSeries(costObj, function (item, eachCb) {
            morphData.checkIfEnough(userUid, item, function (err, res) {
                if (err) {
                    eachCb(err);
                } else if (res) {
                    eachCb();
                } else {
                    eachCb("not enough");
                }
            });
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        async.eachSeries(costObj, function (item, eachCb) {
            modelUtil.addDropItemToDB(item["id"], item["count"] * -1, userUid, 1, 1, function (err, res) {
                mongoStats.expendStats(item["id"], userUid, "127.0.0.1", null, mongoStats.MORPH_EVOLVE_GET, item["count"]);
                userData.push(res);
                eachCb(err);
            });
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        formation.getUserFormation(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                async.eachSeries(Object.keys(res), function (item, eachCb) {
                    if (res[item]["heroUid"] == heroUid) {
                        eachCb("hero invalid");
                    } else {
                        eachCb();
                    }
                }, function (err, res) {
                    cb(err);
                });
            }
        });
    }, function (cb) {
        hero.removeHero(userUid, heroUid, cb);
    }, function (cb) {
        if (heroList[heroUid]["break"] >= 31) {

        }
        cb();
    }, function (cb) {
        modelUtil.addDropItemToDB(rewardObj["id"], rewardObj["count"], userUid, 1, 1, function (err, res) {
            rewardHeroList.push(res);
            cb(err);
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "isOk": 1,
                "userData": userData,
                "hero": rewardHeroList,
                "heroSoul": rewardHeroSoulList
            });
        }
    });
}

exports.start = start;