/**
 * Created by xiazhengxin on 2015/4/14 11:42.
 *
 * 异度空间 异度恶化 预获取恶化数据
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var hero = require("../model/hero");
var TAG = "morph.evolve.previewHero";

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
    var isOk = true;
    var rewardHero;
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
        if (heroList && heroList[heroUid] && heroList[heroUid]["break"] >= breakLimit[heroList[heroUid]["heroId"]]) {
            cb();
        } else {
            cb("hero error");
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
                    isOk = isOk && true;
                    eachCb();
                } else {
                    isOk = isOk && false;
                    eachCb();
                }
            });
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        var heroConfig = configManager.createConfig(userUid).getConfig("hero");
        rewardHero = heroConfig[rewardObj["id"]];
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"hero": rewardHero, "cost": costObj, "isOk": isOk, "reward": rewardObj});
        }
    });
}

exports.start = start;