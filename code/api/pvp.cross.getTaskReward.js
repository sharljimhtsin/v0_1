/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰領取任務獎勵
 */

var pvptop = require("../model/pvpTopCross");
var item = require("../model/item");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");
var TAG = "pvp.cross.getTaskReward";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var gUserData;
    var highestTop = 0;
    var rewardTop = 0;
    var returnData = {};
    var rankConfig = configData.getConfig("pvpRankCross");
    var rankRewardLiquid = rankConfig["rankRewardLiquid"];
    var isAll;
    var key;
    async.series([
        function (callBack) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    callBack();
                }
            });
        },
        function (callBack) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("dbError");
                } else {
                    gUserData = res;
                    callBack();
                }
            });
        },
        function (callBack) {
            pvptop.getTopTaskReward(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("pvpGetTaskRewardWrong");
                } else {
                    rewardTop = res - 0;
                    callBack();
                }
            });
        },
        function (callBack) {
            pvptop.getHighest(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("pvpGetTaskRewardWrong");
                } else {
                    highestTop = res - 0;
                    callBack();
                }
            });
        },
        function (callBack) {
            if (rewardTop != 0 && highestTop <= rewardTop) { //当前奖励正好是没有领的，那么可以领取
                var rewardId = rankRewardLiquid[rewardTop]["rewardId"];
                var rewardCount = rankRewardLiquid[rewardTop]["rewardCount"];
                item.updateItem(userUid, rewardId, rewardCount, function (err, res) {
                    if (err || res == null) {
                        callBack("pvpGetTaskRewardWrong");
                    } else {
                        returnData["getReward"] = res;
                        returnData["rewardCount"] = rewardCount;
                        mongoStats.dropStats(rewardId, userUid, "127.0.0.1", gUserData, mongoStats.PVP_TASK, rewardCount);
                        callBack();
                    }
                });
            } else {
                callBack("pvpGetTaskRewardWrong");
            }
        },
        function (callBack) { //获取奖励
            var nextRewardTop = rankRewardLiquid[rewardTop]["nextRank"];
            if (nextRewardTop == 0) {
                nextRewardTop = -1;//所有的奖励都领取完毕
            }
            userVariable.setVariable(userUid, "pvpTaskRewardCross", nextRewardTop, function (err, res) {
                if (err || res == null) {
                    callBack("pvpGetTaskRewardWrong");
                } else {
                    returnData["rewardTop"] = nextRewardTop;
                    callBack();
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;