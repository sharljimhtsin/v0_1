/**
 * 取PVP排名列表
 * User: liyuluan
 * Date: 13-11-12
 * Time: 上午10:37
 */
var pvptop = require("../model/pvptop");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var async = require("async");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var userUid = query["userUid"];
//    pvptop.addNewUser(userUid,0,function(err,res) {
//        response.echo("pvp.topList",{"res":res});
//    });
//    return;
    var configData = configManager.createConfig(userUid);

    var pvpRankConfig = configData.getConfig("pvpRank");

    var mUserTop = null;//当前用户的排名
    var userTopList = null;//可挑战列表
    var topInfoList = null;//可挑战列表的详细信息
    var counterList = null;//可反击列表
    var top10 = null;//排名前10的玩家
    var rewardTop = null;
    var highest = 0;
    var currentPointInfo = null;//当前玩家的积分
    var pvpChangeTime = null;//今天挑战次数

    async.series([
        function(cb) { //取当前用户的排名
            pvptop.getUserTop(userUid,function(err,res) {
                if (err) cb("dbError");
                else if (res == null) {
                    console.error(userUid, "pvp.topList");
                    cb("dbError");

                    pvptop.addNewUser(userUid,0,function(err,res) {
                    });
                } else {
                    mUserTop = res["top"];
                    cb(null);
                }
            });
        },
        function(cb) { //取可挑战的玩家列表
            var rankWatchCount = pvpRankConfig["rankWatchCount"] - 0;
            var rankWatchRatio = pvpRankConfig["rankWatchRatio"] - 0;
            var mTopList = [];
            var preTop = mUserTop;//上一个排名
            for (var i = 0; i < rankWatchCount; i++) {
                preTop = Math.floor(preTop * rankWatchRatio);
                if (preTop > 0) mTopList.push(preTop);
            }
            pvptop.getUserTopList(userUid, mTopList,function(err,res) {
                if (err) cb("dbError");
                else {
                    userTopList = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取可挑战玩家的详细列表
            if (userTopList == null || userTopList.length == 0) {
                topInfoList = [];
                cb(null);
            } else {
                topInfoList = [];
                async.forEach(userTopList,function(item,forCb) {
                    var topUserUid = item["userUid"];
                    var isRobot = item["robot"];
                    if (isRobot == 1) {
                        var pvpRankFakeDataConfig = configData.getConfig("pvpRankFakeData");
                        var pvpRankFakeDataConfigItem = pvpRankFakeDataConfig[topUserUid];
                        var userInfo = {};
                        userInfo["top"] = item["top"];
                        userInfo["robot"] = item["robot"];
                        userInfo["userName"] = jutil.toBase64(pvpRankFakeDataConfigItem["playerName"]);
                        userInfo["userLevel"] = pvpRankFakeDataConfigItem["playerLevel"];
                        userInfo["userUid"] = topUserUid;
                        userInfo["heroIdList"] = pvpRankFakeDataConfigItem["heros"];
                        topInfoList.push(userInfo);
                        forCb(null);
                    } else {
                        pvptop.getPvpUserInfo(topUserUid,function(err,res) {
                            if (err) forCb("dbError");
                            else {
                                if (res != null) {
                                    var userInfo = res;
                                    userInfo["top"] = item["top"];
                                    userInfo["robot"] = item["robot"];
                                    topInfoList.push(userInfo);
                                }
                                forCb(null);
                            }
                        });
                    }
                },function(err,res) {
                    if (err) cb(err);
                    else cb(null);
                });
            }
        },
        function(cb) { //取反击列表
            pvptop.getCounterList(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    var mArr = res;
                    counterList = [];
                    async.forEach(mArr,function(item,forCb) {
                        pvptop.getPvpUserInfo(item,function(err,res) {
                            if (err || res == null) forCb("dbError");
                            else {
                                var userInfo = res;
                                pvptop.getUserTop(item,function(err,res) {
                                    if (err || res == null) forCb("dbError");
                                    else {
                                        userInfo["top"] = res["top"];
                                        userInfo["robot"] = 0;
                                        counterList.push(userInfo);
                                        forCb(null);
                                    }
                                });
                            }
                        });
                    },function(err) {
                        cb(null);
                    });
                }
            });
        },
        function(cb) {
            pvptop.getTop10(userUid, function(err,res) {
                if(err) cb("dbError");
                else {
                    top10 = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取当前积分点
            pvptop.getCurrentPoint(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    currentPointInfo = res;
                    cb(null);
                }
            });
        },
        function(cb){ //当前任务奖励
                pvptop.getTopTaskReward(userUid,function(err,res){
                    if(err){
                        cb(err);
                    }else{
                        if(res == null){
                            var rankConfig = configData.getConfig("pvpRank");
                            var rankRewardLiquid = rankConfig["rankRewardLiquid"];
                            var smallestTop = 0;
                            for(var key in rankRewardLiquid){
                                var item = rankRewardLiquid[key];
                                if(smallestTop < item["rank"]){
                                    smallestTop = item["rank"];
                                }
                            }
                            userVariable.setVariable(userUid,"pvpTaskReward",smallestTop,function(err,res){
                                if(err || res == null){
                                    cb("taskRewardInitWrong");
                                }else{
                                    rewardTop = res;
                                    cb(null);
                                }
                            })
                        }else{
                            rewardTop = res;
                            cb(null);
                        }
                    }
                });
        },
        function(cb){ //历史最高纪录
            pvptop.getHighest(userUid,function(err,res){
                if (err) cb("dbError");
                else {
                    if(res == null){
                        highest = 0;
                    }else{
                        highest = res;
                    }
                    cb(null);
                }
            });
        },
        function(cb) { //取总挑战次数
            userVariable.getVariableTime(userUid,"pvpChangeTime", function(err, res) {
                pvpChangeTime = res;
                cb(null);
            });
        }
    ],function(err,res) {
        if (err) response.echo("pvp.topList",jutil.errorInfo(err));
        else {
            var resultData = {};
            resultData["challengerList"] = topInfoList;
            resultData["counterList"] = counterList;
            resultData["top10"] = top10;
            resultData["rewardTop"] = rewardTop;
            resultData["highest"] = highest;
            resultData["userTop"] = mUserTop;
            resultData["currentPointInfo"] = currentPointInfo;
            resultData["pvpChangeTime"] = pvpChangeTime;
            response.echo("pvp.topList", resultData);
        }
    });
}

exports.start = start;