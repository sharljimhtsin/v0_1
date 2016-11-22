/**
 * Created by xiazhengxin on 2015/4/14 11:42.
 *
 * 异度空间 异度恶化 首页列表
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var hero = require("../model/hero");
var TAG = "morph.evolve.heroList";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData;
    var key;
    var costConfig;
    var heroList;
    var heroSelectedList = {};
    async.series([function (cb) {
        morphData.getConfig(userUid, false, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
                costConfig = configData["cost"];
                cb();
            }
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            heroList = res;
            cb(err);
        });
    }, function (cb) {
        for (var uid in heroList) {
            var hero = heroList[uid];
            if (hero["break"] >= 30) {
                heroSelectedList[uid] = hero;
            }
        }
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"list": heroSelectedList, "config": costConfig});
        }
    });
}

exports.start = start;