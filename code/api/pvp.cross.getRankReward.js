/**
 * Created by xiayanxin on 2016/9/21.
 *
 * 跨服激戰 領取積分排行獎勵
 */

var pvptop = require("../model/pvpTopCross");
var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var TAG = "pvp.cross.getRankReward";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};
    var isAll;
    var key;
    var currentConfig;
    var sTime;
    var eTime;
    var reward;
    var rewardList = [];
    var top = 0;
    var userData;
    async.series([
        function (callBack) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    currentConfig = res[2];
                    sTime = res[0];
                    eTime = res[1];
                    callBack();
                }
            });
        },
        function (callBack) {
            var rewardTimeLine = eTime - 60 * 60 * 24 * 2;
            var now = jutil.now();
            if (now >= rewardTimeLine) {
                callBack();
            } else {
                callBack("timeOut");
            }
        },
        function (callBack) {
            pvptop.getRewardStatus(userUid, function (err, res) {
                if (err) {
                    callBack(err);
                } else if (res.toString() == "1") {
                    callBack("got yet");
                } else {
                    callBack();
                }
            });
        },
        function (callBack) {
            pvptop.getRank(userUid, isAll, key, function (err, res) {
                top = res + 1;//top based on 1
                callBack(err);
            });
        },
        function (callBack) {
            // 獎勵配置格式參考累計充值 BY:運營
            for (var i in currentConfig["rankRewardList"]) {
                if (top == currentConfig["rankRewardList"][i]["top"]) {
                    reward = currentConfig["rankRewardList"][i]["reward"];
                    break;
                }
            }
            callBack();
        },
        function (callBack) {
            pvptop.setRewardStatus(userUid, callBack);
        },
        function (callBack) {
            user.getUser(userUid, function (err, res) {
                userData = res;
                callBack(err);
            });
        },
        function (callBack) { //获取奖励
            async.eachSeries(reward, function (item, giveCb) {
                mongoStats.dropStats(item["id"], userUid, "127.0.0.1", userData, mongoStats.PVPTOPCROSS2, item["count"], item["level"], item["isPatch"]);
                modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                    if (res instanceof Array) {
                        for (var i in res) {
                            rewardList.push(res[i]);
                        }
                    } else {
                        rewardList.push(res);
                    }
                    giveCb(err);
                }, null, true);
            }, callBack);
        },
        function (callBack) {
            returnData["rankReward"] = reward;
            returnData["rewardList"] = rewardList;
            callBack();
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