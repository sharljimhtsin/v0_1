/******************************************************************************
 * 红缎带军团宝藏
 * Create by MR.Luo.
 * Create at 14-7-11.
 *****************************************************************************/

var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mysql = require("../alien/db/mysql");
var async = require("async");
var mail = require("../model/mail");

exports = module.exports = new function() {

    this.ACTIVITY_TYPE = activityData.REDRIBBON;
    this.ACTIVITY_CONFIG_NAME = "redRibbonTreasure";

    /**
     * 获取数据
     * @param userUid
     * @param activityStartTime
     * @param callbackFn
     */
    this.getData = function(userUid, activityStartTime, callbackFn) {
        activityData.getActivityData(userUid, this.ACTIVITY_TYPE, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = 0; // 内部积分，用于计算商品几率
                var dataTime = 0;
                var status = 0; // 外部积分
                var arg = {}; // {"rwWord":随机商品INDEX位表,
                              // "scoreMask":积分奖励标志,
                              // "rankMask":排行奖励标志,
                              // "dayGetNum":今天的领取次数}

                if (res) {
                    data = res["data"] - 0;
                    dataTime = res["dataTime"] - 0;
                    status = res["status"] - 0;
                    try {
                        arg = JSON.parse(res["arg"]);
                    } catch (e) {}
                }

                if (dataTime < activityStartTime) {
                    data = 0;
                    status = 0;
                    arg = {};
                }

                var dayGetNum = arg["dayGetNum"] || 0;
                if (!jutil.compTimeDay(jutil.now(), dataTime)) {
                    dayGetNum = 0;
                }

                callbackFn(null, {
                    "point" : data, // 玩家点数
                    "score" : status, // 积分
                    "rwWord" : arg["rwWord"] || 0, // 随机到的INDEX WORD，如果玩家在活动期间随机到物品，则其INDEX为1
                    "scoreMask" : arg["scoreMask"] || 0,  // 积分奖励标志
                    "rankMask" : arg["rankMask"] || 0, // 排行奖励标志
                    "dayGetNum" : dayGetNum // 每天的领取次数
                });
            }
        });
    };

    /**
     * 更新数据
     * @param userUid
     * @param activityStartTime
     * @param point
     * @param rIndex
     * @param callbackFn
     */
    this.updateData = function(userUid, activityStartTime, point, rIndex, callbackFn) {
        var mThis = this;
        this.getData(userUid, activityStartTime, function(err, res){
            if (err) callbackFn(err);
            else {
                var rwWord = res["rwWord"] - 0;
                rwWord = jutil.bitSetTrue(rwWord, (rIndex - 1));
                var score = res["score"] + 1; // 外部积分
                var dayGetNum = res["dayGetNum"] + 1;
                var scoreMask = res["scoreMask"];
                var rankMask = res["rankMask"];
                activityData.updateActivityData(userUid, mThis.ACTIVITY_TYPE, {
                    "data" : point,
                    "dataTime" : jutil.now(),
                    "status" : score,
                    "arg" : JSON.stringify({
                        "rwWord" : rwWord,
                        "scoreMask" : scoreMask,
                        "rankMask" : rankMask,
                        "dayGetNum" : dayGetNum
                    })
                }, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        // 更新排行榜
                        updateRankingList(userUid, score, activityStartTime, function(err){
                            callbackFn(null,{
                                "point" : point,
                                "score" : score,
                                "rwWord" : rwWord,
                                "scoreMask" : scoreMask,
                                "rankMask" : rankMask,
                                "dayGetNum" : dayGetNum
                            });
                        });
                    }
                });
            }
        });
    };


    /**
     * 更新数据
     * @param userUid
     * @param activityStartTime
     * @param point
     * @param rIndexArr
     * @param callbackFn
     */
    this.updateDataTen = function(userUid, activityStartTime, point, rIndexArr, callbackFn) {
        var mThis = this;
        this.getData(userUid, activityStartTime, function(err, res){
            if (err) callbackFn(err);
            else {
                var rwWord = res["rwWord"] - 0;
                for (var key in rIndexArr) {
                    if (rIndexArr.hasOwnProperty(key)) {
                        rwWord = jutil.bitSetTrue(rwWord, (rIndexArr[key] - 1));
                    }
                }

                var score = res["score"] + 10; // 外部积分
                var dayGetNum = res["dayGetNum"] + 10;
                var scoreMask = res["scoreMask"];
                var rankMask = res["rankMask"];
                activityData.updateActivityData(userUid, mThis.ACTIVITY_TYPE, {
                    "data" : point,
                    "dataTime" : jutil.now(),
                    "status" : score,
                    "arg" : JSON.stringify({
                        "rwWord" : rwWord,
                        "scoreMask" : scoreMask,
                        "rankMask" : rankMask,
                        "dayGetNum" : dayGetNum
                    })
                }, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        // 更新排行榜
                        updateRankingList(userUid, score, activityStartTime, function(err){
                            callbackFn(null,{
                                "point" : point,
                                "score" : score,
                                "rwWord" : rwWord,
                                "scoreMask" : scoreMask,
                                "rankMask" : rankMask,
                                "dayGetNum" : dayGetNum
                            });
                        });
                    }
                });
            }
        });
    };


    /**
     * 更新标志字
     * @param userUid
     * @param activityStartTime
     * @param isScoreMask
     * @param mask
     * @param callbackFn
     */
    this.updateMask = function(userUid, activityStartTime, isScoreMask, mask, callbackFn) {
        var mThis = this;
        this.getData(userUid, activityStartTime, function(err, res){
            if (err) callbackFn(err);
            else {
                var updateData = {
                    "rwWord" : res["rwWord"],
                    "scoreMask" : res["scoreMask"],
                    "rankMask" : res["rankMask"],
                    "dayGetNum" : res["dayGetNum"]
                };
                if (isScoreMask) {
                    updateData["scoreMask"] = mask;
                } else {
                    updateData["rankMask"] = 1; // 排行只有领取和未领取两种状态
                }
                activityData.updateActivityData(userUid, mThis.ACTIVITY_TYPE, {
                    "arg" : JSON.stringify(updateData)
                }, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        callbackFn(null,updateData);
                    }
                });
            }
        });
    };

    /**
     * 获取排行榜数据
     * @param userUid
     * @param activityStartTime
     * @param callbackFn
     */
    this.getRankingList = function(userUid, activityStartTime, callbackFn) {
        redis.domain(userUid).s("RedRibbonScoreRankingList").getObj(function(err, res){
            if (err) {
                console.error("getRankingList: " + err);
                callbackFn(err);
            } else {
                if (res) {
                    var sTime = res["sTime"] - 0;
                    if (sTime != activityStartTime) { // 数据已经过期
                        res = null;
                    }
                }

                if (res == null) {
                    // 从数据库中查找前三
                    var sql = "SELECT userUid,status AS score FROM activityData WHERE"
                        + " type=" + activityData.REDRIBBON
                        + " AND dataTime >= " + activityStartTime
                        + " ORDER BY status DESC"
                        + " LIMIT " + 3;

                    mysql.game(userUid).query(sql, function(err, res) {
                        if (err || res == null) callbackFn("dbError");
                        else {
                            redis.domain(userUid).s("RedRibbonScoreRankingList").setObj({
                                "sTime" : activityStartTime,
                                "list" : res
                            }, function(){
                                callbackFn(null, res);
                            });
                        }
                    });
                } else {
                    callbackFn(null, res["list"]);
                }
            }
        });
    };

    /**
     * 发送排名奖励
     * @param userUid
     * @param callbackFn
     */
    this.sendRankReward = function(userUid, callbackFn) {
        var mThis = this;
        var rewardConfig = null;
        var sTime = 0;
        var eTime = 0;
        var rank = 0;
        var rwInfo = null;
        async.series([
            function(cb) {
                activityConfig.getConfig(userUid, mThis.ACTIVITY_CONFIG_NAME, function(err, res){
                    if (err) cb(err);
                    else {
                        if (!res[0]) { // 活动已经结束
                            sTime = res[4];
                            eTime = res[5];
                            rewardConfig = res[2];
                            if (!rewardConfig) {
                                cb("configError");
                                return;
                            }
                            cb(null);
                        } else {
                            cb("activityisOpen");
                        }
                    }
                });
            },
            function(cb) { // 获取排行榜数据
                mThis.getRankingList(userUid, sTime, function(err, res){
                    if (err) cb(err);
                    else {
                        for (var key in res) {
                            if (res.hasOwnProperty(key)) {
                                var rankItem = res[key];
                                if (!rankItem) {
                                    continue;
                                }
                                if (rankItem["userUid"] == userUid) {
                                    rank = key - 0;
                                    cb(null);
                                    return;
                                }
                            }
                        }
                        cb("noRewardToGet");
                    }
                });
            },
            function(cb) { // 获取活动数据
                mThis.getData(userUid, sTime, function(err, res){
                    if (err) cb(err);
                    else {
                        var score = res["score"];
                        if (score < 70) { // 积分小于70没有奖励可以领取
                            cb("noRewardToGet");
                            return;
                        }

                        var rankMask = res["rankMask"];
                        if (rankMask == 0) {
                            cb(null);
                        } else {
                            cb("alreadyGet");
                        }
                    }
                });
            },
            function(cb) { // 获取奖励配置
                var rankReward = rewardConfig["rankReward"] || {};
                rwInfo = rankReward[rank + 1];
                if (!rwInfo) {
                    cb("configError");
                } else {
                    cb(null);
                }
            },
            function(cb) { // 更新标志
                mThis.updateMask(userUid, sTime, false, 1, function(err, res){
                    if (err) cb(err);
                    else {
                        cb(null);
                    }
                });
            },
            function(cb) { // 发邮件
                mail.addMail(userUid, -1, "The ranking rewards of hunt treasure", JSON.stringify(rwInfo), "22222", function (err, res) {
                    if (err) {
                        console.error("军团宝藏排行奖励发送失败", userUid, rwInfo);
                        cb(null);
                    } else {
                        cb(null);
                    }
                });//
            }
        ], function(err){
            callbackFn(err);
        });
    };

    /**
     * 更新排行榜
     * @param userUid
     * @param score
     * @param activityStartTime
     * @param callbackFn
     */
    function updateRankingList(userUid, score, activityStartTime, callbackFn) {
        redis.domain(userUid).s("RedRibbonScoreRankingList").getObj(function(err, res){
            if (err) {
                console.error(err);
                callbackFn(err);
            } else {
                if (res) {
                    var sTime = res["sTime"] - 0;
                    if (sTime != activityStartTime) { // 数据已经过期
                        res = null;
                    }
                }

                if (res == null) {
                    // 从数据库中查找前三
                    var sql = "SELECT userUid,status AS score FROM activityData WHERE"
                        + " type=" + activityData.REDRIBBON
                        + " AND dataTime >= " + activityStartTime
                        + " ORDER BY status DESC"
                        + " LIMIT " + 3;

                    mysql.game(userUid).query(sql, function(err, res) {
                        if (err || res == null) callbackFn("dbError");
                        else {
                            redis.domain(userUid).s("RedRibbonScoreRankingList").setObj({
                                "sTime" : activityStartTime,
                                "list" : res
                            }, function(){
                                callbackFn(null);
                            });
                        }
                    });
                } else {
                    // 直接更新缓存
                    var rankList = res["list"];
                    if (rankList.length > 0) {
                        // 从排行榜移除自己
                        for (var i= 0,j=rankList.length;i<j;++i) {
                            if (rankList[i] != null && rankList[i]["userUid"] == userUid) {
                                rankList.splice(i, 1);
                                break;
                            }
                        }

                        // 把自己插入排行榜
                        for (var i=0;i<3;++i) {
                            var rankItem = rankList[i];
                            if (rankItem) { // 当前排名有人
                                if (rankItem["score"] < score) { // 我分比他高
                                    switch (i) {
                                        case 0:
                                            rankList[2] = rankList[1];
                                            rankList[1] = rankList[0];
                                            rankList[0] = { // 我上去了
                                                "userUid" : userUid,
                                                "score" : score
                                            };
                                            break;
                                        case 1:
                                            rankList[2] = rankList[1];
                                            rankList[1] = { // 我上去了
                                                "userUid" : userUid,
                                                "score" : score
                                            };
                                            break;
                                        case 2:
                                            rankList[2] = { // 我上去了
                                                "userUid" : userUid,
                                                "score" : score
                                            };
                                            break;
                                    }
                                    break;
                                }
                            } else { // 当前排名没人
                                rankList[i] = { // 我上去了
                                    "userUid" : userUid,
                                    "score" : score
                                };
                                break;
                            }
                        }
                    } else {
                        rankList.push({
                            "userUid" : userUid,
                            "score" : score
                        });
                    }
                    redis.domain(userUid).s("RedRibbonScoreRankingList").setObj(res, function(){
                        callbackFn(null);
                    });
                }
            }
        });
    }
};