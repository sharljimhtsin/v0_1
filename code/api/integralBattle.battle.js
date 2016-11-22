/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-7-11
 * Time: 下午 15:55
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var integral = require("../model/integralBattle");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "enemyUid") == false) {
        response.echo("integralBattle.battle", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var enemyUid = postData["enemyUid"];
    var sTime;
    var currentConfig;
    var userData = {};
    var enemyLv = 0;
    var key = "";
    var returnData = {};
    var rewardByLv = {};
    var getPoint = 0;//积分
    var winTimes = 0;
    var getBadgeCt = 0;//勋章个数
    var round = {};
    var limit = 0;
    var dropPoint = 0;
    var resultList = [];
    var eTime = 0;
    var isAll = 0;
    async.series([function (cb) {
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                eTime = res[1];
                currentConfig = res[2];
                if (currentConfig["rewardByLv"] == undefined || currentConfig["buyTimesLimit"] == undefined) {
                    cb("configError1");
                } else {
                    var endTime = eTime - 86400;
                    var leTime = jutil.todayTime() + 900;
                    if ((jutil.now() >= endTime && jutil.now() <= eTime) || (jutil.now() >= jutil.todayTime() && jutil.now() <= leTime)) {//1.活动结束 2.刷新数据脚本 0:00,0:15
                        cb("Not match,please re-login!");//notOpen
                    } else {
                        key = currentConfig["key"];
                        rewardByLv = currentConfig["rewardByLv"];//战斗力兑换积分配置
                        limit = currentConfig["buyTimesLimit"];
                        isAll = parseInt(res[2]["isAll"]) || 0;
                        cb(null);
                    }
                }
            }
        });
    }, function (cb) {
        user.getUser(enemyUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res["lv"] == undefined) {
                    cb("noThisUser");
                } else {
                    enemyLv = res["lv"] - 0;
                    cb();
                }
            }
        });
    },
        function (cb) {//计算战斗胜利后可以获得的积分
            if (rewardByLv != undefined && rewardByLv.length > 0) {
                for (var a in rewardByLv) {
                    if (rewardByLv[a]["s"] <= enemyLv && enemyLv <= rewardByLv[a]["e"]) {
                        getBadgeCt = rewardByLv[a]["ct"] - 0;
                        getPoint = rewardByLv[a]["ct"] - 0;
                        break;
                    }
                }
                cb();
            } else {
                cb("configError2");
            }
        },
        function (cb) {//判断次数上限 免费战斗15次，购买次数上限50次
            integral.getUserData(userUid, sTime, function (err, res) {
                if (err)cb(err);
                else {
                    userData = res;
                    winTimes = userData["data"] - 0;
                    userData["statusTime"]--;
                    if (userData["statusTime"] < 0) {
                        cb("changeTimesNotEnough");//挑战次数不足
                    } else {
                        returnData["battleTimes"] = userData["statusTime"] - 0;
                        cb();
                    }
                }
            });
        },
        function (cb) {
            integral.battle(userUid, enemyUid, function (err, res) {//key
                if (err)cb(err);
                else {
                    round = res;
                    stats.events(userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE1);//积分擂台赛挑战次数
                    cb();
                }
            });
        },
        function (cb) {//勋章：战胜次数
            returnData["round"] = round;
            if (round["isWin"] == true) {
                winTimes++;//胜利次数
                userData["data"] = winTimes;//战斗胜利次数
                dropPoint = getPoint - 0;
                userData["status"] += dropPoint;//积分
                returnData["reward"] = [{"id": "156003", "count": getBadgeCt}];
                integral.getBattleResultList(userUid, key, isAll, function (err, res) {
                    if (err)cb(err);
                    else {
                        resultList = res;
                        for (var y in resultList) {
                            if (resultList[y]["userUid"] == enemyUid) {
                                resultList[y]["status"] = 1;
                                break;
                            }
                        }
                        var dead = 0;
                        for (var p in resultList) {
                            if (resultList[p]["status"] == 1) {
                                dead++;
                            }
                        }
                        if (dead == 3) {//重新随机
                            integral.freshFightList(userUid, isAll, function (err, res) {//resultList
                                if (err)cb(err);
                                else {
                                    returnData["refreshFightList"] = res;
                                    cb();
                                }
                            });
                        } else {
                            returnData["resultList"] = resultList;
                            //记录胜负玩家列表
                            integral.setBattleResultList(userUid, key, isAll, resultList, cb);
                        }
                    }
                });
            } else {//战败奖励减半
                dropPoint = (getPoint - 0) / 2;
                userData["status"] += dropPoint;//积分
                returnData["reward"] = [{"id": "156003", "count": getBadgeCt / 2}];// ct/2
                cb();
            }
        },
        function (cb) {
            returnData["point"] = dropPoint;
            returnData["winTimes"] = userData["data"];
            integral.addPoint(userUid, isAll, key, eTime, userData["status"], cb);
        },
        function (cb) {
            returnData["userData"] = userData;
            integral.setUserData(userUid, userData, cb);
        },
        function (cb) {
            returnData["rewardList"] = [];
            async.eachSeries(returnData["reward"], function (reward, esCb) {
                if (round["isWin"] == true) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE5, reward["count"]);
                }
                integral.addDropItem(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                        console.error(reward["id"], reward["count"], err.stack);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                returnData["rewardList"].push(res[i]);
                            }
                        } else {
                            returnData["rewardList"].push(res);
                        }
                        esCb(null);
                    }
                });
            }, cb);
        }], function (err) {
        if (err) {
            response.echo("integralBattle.battle", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.battle", returnData);
        }
    });
}

exports.start = start;