/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰 更新 redeemPoint
 */

var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var item = require("../model/item");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvpTopCross");
var mongoStats = require("../model/mongoStats");
var TAG = "pvp.cross.redeemPoints";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var exchangeNum = postData["type"];
    if (exchangeNum <= 0) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var pointInfo = {};   //积分信息
    var brothNum;//培养液
    var returnData = {};
    var currentUserTop;
    var configData = configManager.createConfig(userUid);
    var gUserData;
    var isAll;
    var key;
    async.series([
        function (callback) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    callback();
                }
            });
        },
        function (callback) {
            pvptop.getUserData(userUid, function (err, res) {
                pointInfo = res["arg"];
                callback(err);
            });
        },
        function (callback) { //取userId
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callback("dbError");
                } else {
                    gUserData = res;
                    callback();
                }
            });
        },
        function (callback) { ///取用户当前排名
            pvptop.getUserTop(userUid, isAll, function (err, res) {
                if (err || res == null) {
                    callback("dateError");
                } else {
                    currentUserTop = res["top"];
                    callback();
                }
            });
        },
        function (callback) {//获取培养丹的数量
            item.getItem(userUid, "150901", function (err, res) {
                brothNum = res == null ? 0 : res["number"];
                callback(err);
            });
        },
        function (callback) {
            var pvpRankConfig = configData.getConfig("pvpRankCross");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for (var key in rankRewardPoint) {
                var item = rankRewardPoint[key];
                if (currentUserTop >= item["highestRank"] && currentUserTop <= item["lowestRank"]) {
                    rankItem = item;
                    break;
                }
            }
            var pastTime = jutil.now() - (pointInfo["time"] - 0);
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"];
            if ((exchangeNum * 200) > pureValue) {//不够
                callback("pointNotEnough");
            } else {
                pointInfo["value"] = pureValue - exchangeNum * 200;
                brothNum += exchangeNum;
                pointInfo["time"] = (pointInfo["time"] - 0) + pastTimeByRewardTime * pvpRankConfig["pointRewardTime"];
                callback();
            }
        },
        function (callback) {//更新培养丹
            item.updateItem(userUid, "150901", exchangeNum, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    mongoStats.dropStats("150901", userUid, "127.0.0.1", gUserData, mongoStats.PVP_REDEEMPOINTS, exchangeNum);
                    callback();
                }
            });
        },
        function (callback) {
            var newData = {"arg": JSON.stringify(pointInfo)};
            pvptop.setUserData(userUid, newData, callback);
        }
    ], function (err) {
        returnData["brothNum"] = brothNum;
        returnData["currentPoint"] = pointInfo;
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    })
}

exports.start = start;