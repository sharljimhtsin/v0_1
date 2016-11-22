/**
 * worldBoss.kill
 * 铜人战
 * User: liyuluan
 * Date: 13-12-13
 * Time: 下午6:45
 */

var worldBoss = require("../model/worldBoss");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var modelUtil = require("../model/modelUtil");
var teach = require("../model/teach");
var mail = require("../model/mail");
var async = require("async");
var battle = require("../model/battle");
var mongoStats = require("../model/mongoStats");
var activityConfig = require("../model/activityConfig");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");
var vitality = require("../model/vitality");
var stats = require("../model/stats");
var fs = require('fs');
var language;

/**
 * 参数
 *      type 战斗类别    0 => 普通  1=> 复活  2=>浴血重生
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo("worldBoss.kill", jutil.errorInfo("postError"));
        return;
    }
    var mType = postData["type"];
    var userUid = query["userUid"];
    language = query["language"];
    var multiplesConfig = {};
    var configData = configManager.createConfig(userUid);
    var worldBossConfig = configData.getConfig("worldBoss");
    if (worldBossConfig == null) {
        response.echo("worldBoss.kill", jutil.errorInfo("configError"));
        return;
    }
    var mStarTime = getStartTime(worldBossConfig["openHours"], worldBossConfig["openMinutes"]); //开始时间
    var gDay = jutil.day(); //当前时间 (天)
    var gNow = jutil.now(); //当前时间（秒）
    var gUserData = null;//用户数据
    var gNeedIngot = 0;//需要的元宝数量
    var gReviveBuffAttackAdd = 0;//攻击加成
    var gCurrentHurtValue = 0;//当前伤害值
    var gUserHurtValue = 0;//当前用户总伤害值
    var gAllHurt = 0;//所有用户总伤害值
    var gWorldBCount = 0;//用户战斗次数
    var gBloody = 0;//用户浴血次数
    var rBattleStep = null;//战斗过程数据
    var rRewardData = null;//奖励数据
    var gHeroId = null;//战斗的用户的heroId
    var gBossLevel = 5; //BOSS等级
    var moment = 0;
    async.series([
        function (cb) { //判断是否处于战斗中
            var mTime = gNow;
            if (mTime < mStarTime) {
                cb("outTime");
                return;
            }
            worldBoss.getBossStatus(userUid, gDay, function (err, res) {
                var msg = {"gDay": gDay, "err": err, "res": res};
                fs.appendFile('worldBoss.log', JSON.stringify(msg) + "\n", 'utf8');
                if (err) cb("dbError");
                else {
                    if (res == 0) {
                        gameStart(userUid, gDay, function (err, res) {
                            var msg = {"userUid": userUid, "nowStart": jutil.now(), "err": err, "res": res};
                            fs.appendFile('worldBoss.log', JSON.stringify(msg) + "\n", 'utf8');
                            if (err) cb("dbError");
                            else cb(null);
                        });
                    } else if (res == 2) {
                        cb("bossEnd");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function (cb) { //设置 BOSS等级
            worldBoss.getBossLevel(userUid, function (err, res) { //取当前boss等级
                if (err) cb("dbError");
                else {
                    if (res == null) {
                        gBossLevel = configData.g("worldBoss")("LevelInit")();
                    } else {
                        gBossLevel = res;
                    }
                    cb(null);
                }
            });
        },
        function (cb) { //判断当前玩家的是否处于冷却中
            worldBoss.getUserTime(gDay, userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    var mUserTime = res;
                    var mReviveTime = worldBossConfig["reviveTime"] - 0;//冷却时间
                    if (gNow - mUserTime > mReviveTime) {
                        cb(null);
                    } else if (mType == 0) {
                        cb("CDing");
                    } else {
                        var mRevivePayTimeLimit = worldBossConfig["revivePayTimeLimit"] - 0;//最短可复活时间
                        if (gNow - mUserTime > mRevivePayTimeLimit) {
                            cb(null);
                        } else {
                            cb("CDing");
                        }
                    }
                }
            });
        },
        function (cb) { //取用户数据
            user.getUser(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function (cb) { //复活判断用户元宝判断
            if (mType != 1) cb(null);
            else {
                var userIngot = gUserData["ingot"] - 0;
                var needIngot = worldBossConfig["revivePayCost"] - 0;
                if (userIngot < needIngot) {
                    cb("ingotNotEnough");
                } else {
                    gNeedIngot = needIngot;
                    stats.events(userUid, "127.0.0.1", null, mongoStats.worldBossKill11);
                    cb(null);
                }
            }
        },
        function (cb) { //浴血处理
            if (mType != 2) {
                worldBoss.getBloody(gDay, userUid, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        var mBloody = res - 0; //浴血次数
                        gBloody = mBloody;
                        cb(null);
                    }
                });
            } else {
                worldBoss.getBloody(gDay, userUid, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        var mBloody = res - 0; //浴血次数
                        var reviveBuffCostBase = worldBossConfig["reviveBuffCostBase"] - 0;
                        var reviveBuffCostAdd = worldBossConfig["reviveBuffCostAdd"] - 0;
                        var reviveBuffMaxCost = worldBossConfig["reviveBuffMaxCost"] - 0;
                        var reviveBuffAttackAdd = worldBossConfig["reviveBuffAttackAdd"] - 0;
                        var needIngot = reviveBuffCostBase + mBloody * reviveBuffCostAdd;
                        if (needIngot > reviveBuffMaxCost) needIngot = reviveBuffMaxCost;
                        var userIngot = gUserData["ingot"] - 0;
                        gBloody = mBloody + 1;
                        if (userIngot < needIngot) {
                            cb("ingotNotEnough");
                        } else {
                            gNeedIngot = needIngot;
                            gReviveBuffAttackAdd = reviveBuffAttackAdd;
                            stats.events(userUid, "127.0.0.1", null, mongoStats.worldBossKill12);
                            cb(null);
                        }
                    }
                });
            }
        },
        function (cb) {
            user.updateUser(userUid, {"ingot": gUserData["ingot"] - gNeedIngot}, function (err, res) {
                cb(null);
            });
        },
        function (cb) { //战斗
            attack(gUserData, gReviveBuffAttackAdd, function (err, res) {
                if (err) cb("dbError");
                else {
                    var hurtValue = res[0] - 0;
                    rBattleStep = res[1];
                    gHeroId = res[2];
                    moment = res[3];
                    worldBoss.addUserNewValue(gDay, userUid, hurtValue, gNow, function (err, res) {
                        if (err) {
                            console.error(gDay, userUid, hurtValue, gNow, err.stack);
                            cb("dbError");
                        } else {
                            gCurrentHurtValue = hurtValue;
                            gUserHurtValue = res["userHurt"];
                            gAllHurt = res["allHurt"];
                            gWorldBCount = res["attackCount"] - 0;
                            if (gWorldBCount == 1) { //刚进入时缓存用户及等级
                                var mUserName = gUserData["userName"];
                                var mLevel = gUserData["lv"];
                                worldBoss.setUserNameAndLevel(gDay, userUid, mUserName, mLevel, function (err, res) {
                                });
                                // ADD BY LXB
                                vitality.vitality(userUid, "worldBoss", {"completeCnt": 1}, function () {
                                });
                                title.worldBossCountChange(userUid, function () {
                                    cb(null);
                                });
                                // END
                            } else {
                                cb(null);
                            }
                        }
                    });
                }
            });
        },
        function (cb) { //设置浴血次数
            if (mType != 2) cb(null);
            else {
                worldBoss.setBloody(gDay, userUid, function (err, res) {
                    cb(null);
                });
            }
        },
        function (cb) { //判断是否结束
            var bossHP = gBossLevel * worldBossConfig["hpPerLevel"];
            var mActivityMinTime = worldBossConfig["activityMinTime"] - 0 + mStarTime;
            var mActivityMaxTime = worldBossConfig["activityMaxTime"] - 0 + mStarTime;
            if ((gAllHurt >= bossHP && gNow >= mActivityMinTime) || gNow > mActivityMaxTime) { //已挂且战斗时间小于最小时间
                var msg = {
                    "userUid": userUid,
                    "gAllHurt": gAllHurt,
                    "bossHP": bossHP,
                    "gNow_killed": gNow,
                    "mActivityMinTime": mActivityMinTime,
                    "mActivityMaxTime": mActivityMaxTime
                };
                fs.appendFile('worldBoss.log', JSON.stringify(msg) + "\n", 'utf8');
                worldBoss.setBossStatus(userUid, gDay, 2, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        if (res == 1) { //表示这是第一次被设置为2，设为击杀者
                            worldBossEnd(gDay, userUid, gUserHurtValue, worldBossConfig, gNow, mStarTime, gBossLevel, function (err, res) {
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //获取N倍活动配置
            activityConfig.getConfig(userUid, "worldBossBroth", function (err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    cb(null); //当前没有活动， 取默认
                } else if (configArray[1] == 0) {//活动参数是0  取默认2倍
                    multiplesConfig = {"worldBossBroth": 2};
                    cb(null);
                } else {
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    cb(null);
                }
            });
        },
        function (cb) { //单场奖励处理
            var mAttackRewardConfig = configData.g("worldBoss")("attackReward")(gWorldBCount)();
            if (mAttackRewardConfig == null || mAttackRewardConfig["zeniReward"] == null) {
                cb("configError");
            } else {
                var damageLimitLine = mAttackRewardConfig["zeniReward"]["damageLimitLine"] - 0;
                var bigDamageRatio = mAttackRewardConfig["zeniReward"]["bigDamageRatio"] - 0;
                var littleDamageRatio = mAttackRewardConfig["zeniReward"]["littleDamageRatio"] - 0;
                var worldBossTeachProb = mAttackRewardConfig["worldBossTeachProb"] - 0;
                var getGold = 0;
                var multiples = multiplesConfig["worldBossBroth"] != null ? (multiplesConfig["worldBossBroth"] - 0) : 1;
                var itemReward = mAttackRewardConfig["itemReward"];
                var worldBossTeach = 0; //指点次数
                if (gCurrentHurtValue > damageLimitLine) {
                    getGold = Math.floor(damageLimitLine * bigDamageRatio + (gCurrentHurtValue - damageLimitLine) * littleDamageRatio);
                } else {
                    getGold = Math.floor(gCurrentHurtValue * bigDamageRatio);
                }
                if (Math.random() < worldBossTeachProb) {
                    worldBossTeach = 1;
                }
                addReward(userUid, gUserData, getGold, itemReward, multiples, worldBossTeach, function (err, res) {
                    rRewardData = res;
                    cb(null);
                });
            }
        },
        function (cb) { //设置最近的攻击
            worldBoss.setLastAttack(gDay, userUid, gUserData["userName"], gCurrentHurtValue, gWorldBCount, gHeroId, function (err, res) {
                cb(null);
            });
        }
    ], function (err) {
        //返回的数据  攻击次数 共伤血
        if (err) {
            if (err == "bossEnd") {
                response.echo("worldBoss.kill", {"isEnd": true});
            } else {
                response.echo("worldBoss.kill", jutil.errorInfo(err));
            }
        } else {
            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
            var resultData = {};
            resultData["attackCount"] = gWorldBCount;
            resultData["hurt"] = gCurrentHurtValue;
            resultData["itemRewardArray"] = rRewardData[0];
            resultData["bloody"] = gBloody;
            resultData["killTime"] = gNow;
            var mNewUserData = {};
            for (var key in rRewardData[1]) {
                mNewUserData[key] = rRewardData[1][key];
            }
            mNewUserData["ingot"] = gUserData["ingot"] - gNeedIngot;
            resultData["newUserData"] = mNewUserData;
            resultData["newItemData"] = rRewardData[2];
            resultData["newWorldBossTeach"] = rRewardData[3];
            resultData["battleStep"] = rBattleStep;
            resultData["momentum"] = moment;
            titleApi.getNewAndUpdate(userUid, "boss", function (err, res) {
                if (!err && res) {
                    resultData["titleInfo"] = res;
                }
                response.echo("worldBoss.kill", resultData);
            });
            if (mType == 1) {
                mongoStats.expendStats("ingot", userUid, userIP, gUserData, mongoStats.E_REBIRTH_1, gNeedIngot);
            } else if (mType == 2) {
                mongoStats.expendStats("ingot", userUid, userIP, gUserData, mongoStats.E_REBIRTH_2, gNeedIngot);
            }
        }
    });
}


//设置战斗开始
function gameStart(userUid, day, callbackFn) {
    worldBoss.setBossStatus(userUid, day, 1, function (err, res) { //标记战斗开始
        if (err) callbackFn(err);
        else {
            callbackFn(null);
        }
    });
}


//发起攻击， userUid => 用户  buffAttackAdd => 攻击加成
function attack(gUserData, buffAttackAdd, callbackFn) {
    battle.returnBronzeData(gUserData, buffAttackAdd, function (err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, [res["totleHurt"], res["roundData"], res["heroId"], res["moment"]]);
        }
    });

}


//根据小时和分钟取今天战斗开始的时间戳
function getStartTime(startHour, startMinute) {
    var mDate = new Date(jutil.nowMillisecond());
    mDate.setHours(startHour);
    mDate.setMinutes(startMinute);
    mDate.setSeconds(0);
    mDate.setMilliseconds(0);
    return Math.floor(mDate.getTime() / 1000);
}


//添加奖励
function addReward(userUid, userData, addGold, itemReward, multiples, worldBossTeach, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var rewardArray = [];
    var newUserData = null;
    var newItemData = [];
    var newWorldBossTeach = [];
    async.parallel([
        function (cb) { //奖励游戏币
            if (addGold > 0) {
                var newData = {"gold": userData["gold"] - 0 + addGold * multiples};
                rewardArray.push({"id": "gold", "count": addGold * multiples});
                newUserData = newData;
                user.updateUser(userUid, newData, function (err, res) {
                    if (err) console.error(userUid, newData, err.stack);
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //奖励道具
            if (itemReward != null) {
                var itemRewardArray = [];
                for (var key in itemReward) {
                    var mItemData = {"id": key, "count": itemReward[key] * multiples};
                    rewardArray.push(mItemData);
                    itemRewardArray.push(mItemData);
                }
                async.forEach(itemRewardArray, function (item, forCb) {
                    mongoStats.dropStats(item["id"], userUid, '127.0.0.1', null, mongoStats.WORLD_BOSS_KILL, item["count"], item["level"], item["isPatch"]);
                    modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                        if (err) {
                            forCb(err);
                            console.error(item["id"], item["count"], userUid, item["isPatch"], item["level"], err.stack);
                        } else {
                            newItemData.push(res);
                            forCb(null);
                        }
                    });
                }, function (err) {
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //奖励指点
            stats.dropStats("worldBossTeach", userUid, "127.0.0.1", null, mongoStats.worldBossKill1_count, 1);
            if (worldBossTeach > 0) {
                var userLevel = userData["lv"] - 0;
                var mTeachLevel = configData.g("player")(userLevel)("worldBossTeachLevel")() - 0;
                rewardArray.push({"id": "worldBossTeach", "count": 1, "level": mTeachLevel});
                if (mTeachLevel > 0) {
                    teach.addWorldBossTeach(userUid, mTeachLevel, function (err, res) {
                        cb(null);
                        if (res != null) newWorldBossTeach.push(res);
                    });
                } else {
                    cb(null);
                }
            } else {
                cb(null);
            }
        }
    ], function (err) {
        callbackFn(null, [rewardArray, newUserData, newItemData, newWorldBossTeach]);
    });
}


//战斗结束
function worldBossEnd(day, killer, killerHurt, worldBossConfig, now, startTime, bossLevel, callbackFn) {
    var configData = configManager.createConfig(killer);
    var mRanking = [];
    var mRankRewardConfig = configData.g("worldBoss")("rankReward")();
    var mLastAttackReward = configData.g("worldBoss")("lastAttackReward")();
    if (mRankRewardConfig == null || mLastAttackReward == null) callbackFn(null);
    var mRankingClient = [];
    var rankRewardId = mail.getRewardId(mail.WORLD_BOSS);
    var killerRewardId = mail.getRewardId(mail.WORLD_BOSS_KILLER);
    var multiplesConfig = {};
    async.auto({
        "setDayKiller": function (cb) {
            worldBoss.setDayKiller(day, killer, function (err, res) {
                if (err) console.error(day, killer, err.stack);
                mRanking.push({"userUid": killer, "rank": -1, "value": killerHurt});
                cb(null);
            });
        },
        "getWorldMConfig": function (cb) {
            activityConfig.getConfig(killer, "worldBossBroth", function (err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    cb(null); //当前没有活动， 取默认
                } else if (configArray[1] == 0) {//活动参数是0  取默认2倍
                    multiplesConfig = {"worldBossBroth": 2};
                    cb(null);
                } else {
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    cb(null);
                }
            });
        },
        "setBossLevel": function (cb) {
            var mLevelUpMaxTime = worldBossConfig["LevelUpMaxTime"] - 0;
            var mActivityMaxTime = worldBossConfig["activityMaxTime"] - 0;
            var newLevel = 0;
            if (now - startTime < mLevelUpMaxTime) newLevel = bossLevel + 1;//如果时间小于mLevelUpMaxTime 下次boss等级+1
            else if (now - startTime > mActivityMaxTime) newLevel = bossLevel - 1;//mActivityMaxTime 下次boss等级-1

            if (newLevel == 0) cb(null);
            else {
                worldBoss.setBossLevel(killer, newLevel, function (err, res) {
                    cb(null);
                });
            }
        },
        "rankList": function (cb) {
            worldBoss.getRanking(killer, day, function (err, res) {
                if (err) {
                    console.error(killer, day, err.stack);
                    cb(null);
                } else {
                    for (var i = 0; i < res.length; i += 2) {
                        var mRank = Math.floor(i / 2) + 1;
                        mRanking.push({"userUid": res[i], "rank": mRank, "value": res[i + 1]});
                    }
                    cb(null);
                }
            });
        },
        "rankReward": ["getWorldMConfig", "rankList", function (cb) {
            var multiples = multiplesConfig["worldBossBroth"] != null ? (multiplesConfig["worldBossBroth"] - 0) : 1;
            async.forEach(mRanking, function (item, forCb) {
                var mRank = item["rank"];
                var mConfig = (mRank == -1) ? mLastAttackReward : mRankRewardConfig[mRank];
                if (mConfig == null) forCb(null);
                else {
                    var targetUserUid = item["userUid"];
                    worldBoss.getUserNameAndLevel(day, targetUserUid, function (err, res) {
                        if (err || res == null) {
                            forCb(null);
                        } else {
                            var userLevel = res.split("|")[1];
                            var mHurt = item["value"] - 0;
                            var mZeniRewardRatio = (mConfig["zeniRewardRatio"] || 0) - 0;
                            var mWorldBossTeachCount = (mConfig["worldBossTeachCount"] || 0) - 0;
                            var mItemReward = mConfig["itemReward"] || {};
                            var getGold = Math.floor(mHurt * mZeniRewardRatio);
                            var mRewardList = [];
                            if (getGold > 0) mRewardList.push({"id": "gold", "count": ( getGold - 0 ) * multiples});

                            var mTeachLevel = configData.g("player")(userLevel)("worldBossTeachLevel")() - 0;
                            if (mWorldBossTeachCount > 0) mRewardList.push({
                                "id": "worldBossTeach",
                                "count": mWorldBossTeachCount,
                                "level": mTeachLevel
                            });
                            for (var key in mItemReward) {
                                mRewardList.push({"id": key, "count": (mItemReward[key] - 0) * multiples});
                            }
                            var rewardStr = null;
                            try {
                                rewardStr = JSON.stringify(mRewardList);
                            } catch (error) {
                                forCb(null);
                                return;
                            }
                            var mRankingClientItem = {"hurt": mHurt, "userUid": targetUserUid, "rank": mRank};
                            var mRewardId = (mRank == -1) ? killerRewardId : rankRewardId;
                            // ADD BY LXB
                            title.worldBossRankChange(targetUserUid, mRank, function () {
                                userVariable.getLanguage(targetUserUid, function (err, res) {
                                    language = res;
                                    var mailString = "";
                                    var mailConfig;
                                    var mailConfigLocal = configData.getConfig("mail" + "_" + language);
                                    var mailConfigDefault = configData.getConfig("mail");
                                    if (mailConfigLocal) {
                                        mailConfig = mailConfigLocal;
                                    } else {
                                        mailConfig = mailConfigDefault;
                                    }
                                    if (mRank == -1) {
                                        mailString = mailConfig["worldBossLastBeatReward"];
                                    } else {
                                        mailString = mailConfig["worldBossRankReward"];
                                    }
                                    mail.addMail(targetUserUid, -1, mailString, rewardStr, mRewardId, function (err, res) {
                                        if (err) console.error(targetUserUid, rewardStr, mRewardId, err.stack);

                                        worldBoss.getUserNameAndLevel(day, targetUserUid, function (err, res) {
                                            if (res == null) res = "**|99";
                                            var resArray = res.split("|");
                                            mRankingClientItem["userName"] = resArray[0];
                                            mRankingClientItem["level"] = resArray[1];
                                            mRankingClient.push(mRankingClientItem);
                                            forCb(null);
                                        });
                                    });
                                });
                            });
                            // END
                        }
                    });
                }
            }, function (err) {
                cb(null);
            });
        }],
        "writeStr": ["rankReward", function (cb) {
            try {
                var cacheData = {"end": 1, "data": mRankingClient};
                var str = JSON.stringify(cacheData);
            } catch (error) {
                cb(null);
                return;
            }
            worldBoss.setRankStr(killer, day, str, function (err, res) {
                cb(null);
                worldBoss.setExpire(killer, day);
            });
        }]
    }, function (err) {
        // ADD BY LXB
        title.worldBossLastBeat(killer, function () {
            callbackFn(null);
        });
        // END
    });
}

exports.start = start;