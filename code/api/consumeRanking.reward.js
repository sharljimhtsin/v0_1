/******************************************************************************
 * 消费排行榜奖励领取接口--za
 * Create at 14-12-29.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var consumeRanking = require("../model/consumeRanking");
exports.start = function(postData, response, query){
    if (jutil.postCheck(postData) == false) {
        response.echo("consumeRanking.reward",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var key = "1"; // 当前活动配置
    var currentConfig;
    var rewardList = [];
    var reward = "";
    var sTime = 0;
    var isAll = 0;
    var limit = 0;//消费界限
    async.series([
        // 判断USER IF VALID
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },
        // 获取活动配置数据
        function(cb) {
            consumeRanking.getConfig(userUid, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    sTime = res[0];
                    if(res[1] - jutil.now() > 86400*2){
                        cb("notRwardTime");
                        return ;
                    }
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    isAll = parseInt(currentConfig["isAll"]);
                    limit = currentConfig["limit"]-0;
                    cb(null);
                }
            });
        },
        //获取领取奖励状态
        function(cb) {
            consumeRanking.getRewardStatus(userUid, sTime, function(err, res){
                if(err){
                    cb(err);
                } else if(res == 1){
                    cb("haveReceive");
                } else {
                    cb(null);
                }
            })
        },
        function(cb) {//获取充值数
            consumeRanking.getNumber(userUid, key,isAll, function(err, res){
                if (err) cb(err);
                else {
                    if(res == null || res-0 < limit)
                        cb("needMoreConsume");//消费金额不足
                    else
                        cb(null);
                }
            });
        },
        function(cb) {
            consumeRanking.getTop(userUid, key,isAll, function(err, res){
                if (err) cb(err);
                else {
                    var top = 0;
                    if(res != null)
                        top = res-0+1;
                    //cb(null);
                    for(var i in currentConfig["reward"]){
                        if(top == currentConfig["reward"][i]["top"]){
                            reward = currentConfig["reward"][i]["reward"];
                        }
                    }
                    if(reward){
                        cb(null);
                    } else {
                        cb("noReward");
                    }
                }
            });
        },
        function(cb) {
            var userIP = "127.0.0.1";
            async.eachSeries(reward, function(item,forCb) {
                mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.E_CONSUMERANKING, item["count"], item["level"], item["isPatch"]);
                modelUtil.addDropItemToDB(item["id"],item["count"],userUid,item["isPatch"], item["level"], function(err,res) {
                    if (err) {
                        forCb(err);
                        console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                    } else {
                        if(res instanceof Array){
                            for(var i in res){
                                rewardList.push(res[i]);
                            }
                        } else {
                            rewardList.push(res);
                        }
                        forCb(null);
                    }
                });
            }, function(err, res){
                cb(err, res);
            });
        },
        function(cb){
            consumeRanking.setRewardStatus(userUid, cb);
        },
        function(cb){
            consumeRanking.setAnalytic(userUid, sTime, currentConfig, cb);
        }
    ], function(err){
        if (err) {
            response.echo("consumeRanking.reward",  jutil.errorInfo(err));
        } else {
            response.echo("consumeRanking.reward",{"rewardList":rewardList});//rewardList,"mStatus":mStatus
        }
    });
};