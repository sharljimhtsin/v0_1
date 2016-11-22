/******************************************************************************
 * 军团奖励
 * 领取积分奖励
 * Create by MR.Luo.
 * Create at 14-7-16.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var redRibbon = require("../model/redRibbon");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var stats = require("../model/stats");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var scoreToGet = postData["score"];

    if (scoreToGet == null || scoreToGet == undefined) {
        response.echo("redRibbon.scoreReward", jutil.errorInfo("postError"));
        return;
    }

    scoreToGet = Math.max(0, scoreToGet - 0);
    var redRibbonData = null;
    var rewardConfig = null;
    var newScoreMask = 0;
    var rwInfo = null;

    var sTime = 0;
    var gRes = {};

    async.series([
        function(cb) { // 取配置
            activityConfig.getConfig(userUid, redRibbon.ACTIVITY_CONFIG_NAME, function(err, res){
                if (err) cb(err);
                else {
                    var eTime = res[5];
                    var endTime = eTime + 60 * 60 * 24 * 1; // 推迟一天
                    if ((jutil.now() > res[4]) && (jutil.now() < endTime)) {
                        sTime = res[4];
                        var actConfig = res[2] || {};
                        rewardConfig = actConfig["timeReward"]; // 动态配置，奖励数据
                        if (!rewardConfig) {
                            cb("configError");
                            return;
                        }
                        cb(null);
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },
        function(cb) { // 取数据
            redRibbon.getData(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    redRibbonData = res;
                    cb(null);
                }
            });
        },
        function(cb) { // 判断玩家积分是否符合
            var scoreHas = redRibbonData["score"];
            if (scoreHas < scoreToGet) {
                cb("noRewardToGet");
                return;
            }
            cb(null);
        },
        function(cb) { // 检查奖励配置
            var idx = 0;
            // 计算领取的奖励索引
            for (var key in rewardConfig) {
                if (rewardConfig.hasOwnProperty(key)) {
                    if ((key - 0) == scoreToGet) {
                        rwInfo = rewardConfig[key];
                        break;
                    }
                    ++idx;
                }
            }

            if (idx >= Object.keys(rewardConfig).length) { // 没有找到要领取的奖励
                cb("noRewardToGet");
                return;
            }

            var scoreMask = redRibbonData["scoreMask"];
            if (jutil.bitGet(scoreMask, idx)) { // 奖励已经领取
                cb("noRewardToGet");
                return;
            }

            newScoreMask = jutil.bitSetTrue(scoreMask, idx);
            cb(null);
        },
        function(cb) { // 更新标志
            redRibbon.updateMask(userUid, sTime, true, newScoreMask, function(err, res){
                if (err) cb(err);
                else {
                    gRes["score"] = redRibbonData["score"];
                    gRes["scoreMask"] = newScoreMask;
                    cb(null);
                }
            });
        },
        function(cb) { // 发奖
            var updateList = [];
            async.eachSeries(Object.keys(rwInfo), function(key, esCb){
                var rwItem = rwInfo[key];
                __rwHandler(userUid, rwItem["id"], rwItem["count"], function(err, res){
                    if (err) console.error(err);
                    else {
                        updateList.push(res);
                    }
                    esCb(null);
                });
            }, function(err){
                gRes["updateList"] = updateList;
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            response.echo("redRibbon.scoreReward", jutil.errorInfo(err));
        } else {
            //TODO: 根据 scoreToGet 分支
            activityConfig.getConfig(userUid, "redRibbonTreasure", function (err, res) {
                if (err || res[0] != true) {
                    return;
                }
                stats.recordWithLevel(scoreToGet, res[2]["timeReward"], false, "", "", [mongoStats.redRibbon1, mongoStats.redRibbon2, mongoStats.redRibbon3], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                }, "", "");
            });
            response.echo("redRibbon.scoreReward", gRes);
        }
    });
};

function __rwHandler(userUid, id, count, cb) {
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.RED_RIBBON, count);
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) cb(err);
                else {
                    cb(null, res);
                }
            });
            break;
    }
}