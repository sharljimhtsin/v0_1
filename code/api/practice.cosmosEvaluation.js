/**
 * 宇宙第一排行榜
 * User: za
 * Date: 15-1-8
 * Time: 下午14:32
 */
var jutil = require("../utils/jutil");
var cosmosEvaluation = require("../model/cosmosEvaluation");
var async = require("async");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var modelUtil = require("../model/modelUtil");
var activityData = require("../model/activityData");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var returnData = {};
    var currentConfig;
    var sTime = 0;
    var key = '';
    var isAll = 0;
    var cTypes = [];
    switch(action){
        //1.调用get接口获取参数
        //需要获取到排行榜和彩票个数，活动节点，活动开始和结束时间，消耗金币的个数
        case "get"://获取排行
            async.series([
                function(cb){
                    cosmosEvaluation.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0]-0;
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = res[1]-0;
                            returnData["cTypes"] = {};
                            currentConfig = res[2];
                            for(var i in currentConfig["reward"]){
                                cTypes.push(i);
                                returnData["cTypes"][i] = {"reward":currentConfig["reward"][i]["more"]};
                            }
                            returnData["config"] = currentConfig;
                            key = currentConfig["key"];
                            isAll = parseInt(currentConfig["isAll"]) || 0;
                            cb(null);
                        }
                    });
                },
                function(cb){
                    async.eachSeries(cTypes, function(cType, esCb){
                        cosmosEvaluation.getRewardStatus(userUid, sTime, cType, '1', function(err, res){
                            returnData["cTypes"][cType]["status1"] = res;
                            esCb(err);
                        })
                    }, cb);
                },
                function(cb){
                    async.eachSeries(cTypes, function(cType, esCb){
                        cosmosEvaluation.getRewardStatus(userUid, sTime, cType, '2', function(err, res){
                            returnData["cTypes"][cType]["status2"] = res;
                            esCb(err);
                        })
                    }, cb);
                },
                function(cb){
                    async.eachSeries(cTypes, function(cType, esCb){
                        cosmosEvaluation.getTopList(userUid, key, isAll, cType, function(err, res){
                            returnData["cTypes"][cType]["topList"] = res;
                            esCb(err);
                        });
                    }, cb);
                },
                function(cb) {//获取玩家当前的消费数 1.比较时间（当前时间在哪一个领奖时间段）2.获取消费金额
                    async.eachSeries(cTypes, function (cType, esCb) {
                        cosmosEvaluation.getNumber(userUid, key, isAll, cType, function (err, res) {
                            returnData["cTypes"][cType]["number"] = res - 0;
                            esCb(err);
                        });
                    }, cb);
                },
                function(cb){
                    async.eachSeries(cTypes, function(cType, esCb){
                        async.eachSeries(returnData["cTypes"][cType]["topList"], function(item, callback){
                            user.getUser(item["userUid"], function(err, res){
                                if(err){
                                    callback(err);
                                } else {
                                    item["userName"] = res["userName"];
                                    callback(null);
                                }
                            });
                        }, esCb);
                    }, cb);
                }
            ], function(err, res){
                echo(err, returnData);
            });
            break;
        //2.调用rewardEva接口获取参数
        //需要获取到排行榜和彩票个数，活动节点，活动开始和结束时间，消耗金币的个数
        case "reward"://领取奖励
//            var cType = 0;//记录时间点，0--初始值;1--12点；2--21点；3--24点
//            var cStatus = 0;//记录这个时间点奖励的状态标记 0--未领取 1--已领取
            if (jutil.postCheck(postData, "cType", "type") == false) {
                echo("postError");
                return false;
            }
            var cType = postData["cType"];
            var type = postData["type"];
            var rewardList = [];
            var reward = [];
            var number = 0;
            var limit;
            async.series([
                // 获取活动配置数据
                function(cb) {
                    cosmosEvaluation.getConfig(userUid, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            sTime = res[0] - 0;
                            if(jutil.now() < sTime + (cType-0)*3600)
                                cb("timeOut");
                            else {
                                currentConfig = res[2];
                                var cTypes = [];
                                for(var i in currentConfig["reward"]){
                                    cTypes.push(i);
                                }
                                key = currentConfig["key"];
                                isAll = parseInt(currentConfig["isAll"]);
                                limit = currentConfig["limit"] - 0;
                                if(cTypes.indexOf(cType) == -1){
                                    cb("postError");
                                } else {
                                    cb(null);
                                }
                            }
                        }
                    });
                },
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
                //获取领取奖励状态
                function(cb) {
                    cosmosEvaluation.getRewardStatus(userUid, sTime, cType, type, function(err, res){
                        if(err){
                            cb(err);
                        } else if(res == 1){
                            cb("haveReceive");
                        } else {
                            cb(null);
                        }
                    });
                },
                function(cb) {//获取消费数
                    cosmosEvaluation.getNumber(userUid, key, isAll, cType, function(err, res){
                        if (err) cb(err);
                        else if(res == null || (type == '1' && res-0 < limit)) {//彩票数大于50000才能领奖
                            cb("lotteryNotEnough");//彩票数不足
                        } else {
                            number = res-0;
                            cb(null);
                        }
                    });
                },
                function(cb) {
                    if(type == '1'){//status1
                        cosmosEvaluation.getTop(userUid, key, isAll, cType, function(err, res){
                            if (err) cb(err);
                            else {
                                var top = 0;
                                if(res != null)
                                    top = res-0+1;
                                var moreReward = currentConfig["reward"][cType]["more"];
                                for(var i in moreReward){
                                    if(top == moreReward[i]["top"]){
                                        for(var j in moreReward[i]["reward"]){
                                            reward.push(moreReward[i]["reward"][j]);
                                        }
                                    }
                                }
                                if(reward.length>0){
                                    cb(null);
                                } else {
                                    cb("noReward");
                                }
                            }
                        });
                    } else {//status2
                        var allhasReward = currentConfig["reward"][cType]["allhas"];//undefined
                        if(allhasReward != null ||allhasReward != undefined){//如果没有奖励配置里没有allhas这个字段，只读取more
                            for(var i in allhasReward){
                                var _reward = {"id":allhasReward[i]["id"]};
                                _reward["count"] = allhasReward[i].hasOwnProperty("count")?allhasReward[i]["count"]:Math.ceil((allhasReward[i]["percent"]-0) * (number-0));
                                reward.push(_reward);
                            }
                            if(reward.length > 0){
                                cb(null);
                            } else {
                                cb("noReward");
                            }
                        }else{
                            //allhas为空的情况
                            cb(null);
                        }
                    }
                },
                function(cb) {
                    var userIP = "127.0.0.1";
                    async.eachSeries(reward, function(item,forCb) {
                        mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.E_PRACTICECOSMOS, item["count"], item["level"], item["isPatch"]);
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
                    cosmosEvaluation.setRewardStatus(userUid, cType, type, cb);
                },
                function(cb){
                    cosmosEvaluation.setAnalytic(userUid, sTime, currentConfig,cType, cb);
                }
            ], function(err,res){
                echo(err,{"rewardList":rewardList});
            });
            break;
    }
    function echo(err, res){
        if(err)
            response.echo("practice.cosmosEvaluation", jutil.errorInfo(err));
        else
            response.echo("practice.cosmosEvaluation",res);
    }
}

exports.start = start;