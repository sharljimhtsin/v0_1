/******************************************************************************
 * 每日活跃度
 * 奖励领取
 * Create by MR.Luo.
 * Create at 14-8-1.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var vitality = require("../model/vitality");
var configManager = require("../config/configManager");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");

exports.start = function(postData, response, query) {

    if (jutil.postCheck(postData, "needPoint") == false) {
        response.echo("vitality.reward", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var needPoint = postData["needPoint"];
    var gRes = {"updateList":[]};

    var configMgr = configManager.createConfig(userUid);
    var configData = configMgr.getConfig("vitality") || {};
    var rewardConfig = configData["reward"] || {}; // 奖励配置

    var vitalityData = null; // 玩家的活动数据
    var userData = null; // 玩家的数据

    var rwCfg = null; // 发给玩家的奖励配置

    async.series([
        function(cb) { // 取玩家数据
            user.getUser(userUid, function(err, res){
                if (err) cb(err);
                else {
                    userData = res;
                    cb(null);
                }
            });
        },
        function(cb) { // 获取活动数据
            vitality.getData(userUid, function(err, res){
                if (err) cb(err);
                else {
                    vitalityData = res;
                    cb(null);
                }
            });
        },
        function(cb) { // 判断能否领奖
            var data = vitalityData["data"];
            var score = vitalityData["score"];
            var rewardListAttr = data["rewardListAttr"] || {};
            var rwMask = rewardListAttr[needPoint] || 0;

            if (rwMask == 1) {
                cb(null);
            } else {
                if (rwMask == 2) {
                    cb("alreadyGet");
                } else {
                    cb("noRewardToGet");
                }
            }
        },
        function(cb) { // 获取奖励配置
            for (var key in rewardConfig) {
                if (rewardConfig.hasOwnProperty(key)) {
                    var subCfg = rewardConfig[key];
                    if (subCfg["needPoint"] == needPoint) {
                        rwCfg = subCfg["reward"];
                        break;
                    }
                }
            }

            if (rwCfg == null) {
                cb("configError");
            } else {
                cb(null);
            }
        },
        function(cb) { // 更新数据
            var data = vitalityData["data"];
            var score = vitalityData["score"];
            var rewardListAttr = data["rewardListAttr"] || {};
            rewardListAttr[needPoint] = 2; // 标记为已经领取
            data["rewardListAttr"] = rewardListAttr;
            vitality.updateData(userUid, score, data, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        },
        function(cb) { // 发奖
            async.eachSeries(Object.keys(rwCfg), function(key, esCb){
                var rwItem = rwCfg[key];
                __rwHandler(userUid, rwItem["id"], rwItem["count"], function(err, res){
                    if (err) console.error(err);
                    else {
                        gRes.updateList.push(res);
                    }
                    esCb(null);
                });
            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            response.echo("vitality.reward",  jutil.errorInfo(err));
        } else {
            response.echo("vitality.reward",  gRes);
        }
    });
};

function __rwHandler(userUid, id, count, cb) {
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.VITALITY, count);
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