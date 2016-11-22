/**
 * 残章拥有者列表
 * User: liyuluan
 * Date: 13-12-10
 * Time: 上午11:14
 */

var jutil = require("../utils/jutil");
var debris = require("../model/debris");
var user = require("../model/user");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvptop");
var async = require("async");


/**
 * 参数 ：
 *      skillId 技能ID
 *      debrisTypes 残章类别列表
 * 返回： 可抢夺用户数组
 *
 *      数组项 =>
 *      {
            userUid: 27175808
            userLevel: 23
            userName: "赵六"
            heroIdList: [101008,101009,101010,101031,101011,101012,101025]
            debrisType : 拥有的残章类别
        }
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "skillId", "debrisTypes") == false) {
        response.echo("debris.owner", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var skillId = postData["skillId"];
    var debrisTypes = postData["debrisTypes"];
    if ((debrisTypes instanceof Array == false) || debrisTypes.length == 0) {
        response.echo("debris.owner", jutil.errorInfo("postError"));
        return;
    }
    var debrisType = debrisTypes[0];
    var configData = configManager.createConfig(userUid);

    var pvpPatchConfig = configData.getConfig("pvpPatch");
    if (pvpPatchConfig == null) {
        response.echo("debris.owner", jutil.errorInfo("configError"));
        return;
    }

    var gUserLevel = 0; //当前玩家等级
    var gDebrisData = null;//当前技能碎片信息
    var gNpcNum = 0; //需要 npc 的数量
    var gRealUser = 0; //需要真实玩家的数量

    var rRealUserList = null;//随机出的用户列表

    var resultList = [];//返回的数据
    var cacheData = {}; //缓存的数据，用于抢夺时候用

    async.auto({
        getUser:function(cb) { // 取用户等级
            user.getUser(userUid,function(err, res) {
                if (err) {
                    console.error(userUid, err.stack);
                    cb("dbError");
                } else {
                    //var userExp = res["exp"];
                    //var userLevel = configData.userExpToLevel(userExp) - 0;
                    gUserLevel = res["lv"]-0;
                    cb (null); //
                }
            });
        },
        getDebrisItem:function(cb) { //找到这个技能
            debris.getDebrisItem(userUid, skillId, function(err, res) {
                if (err) {
                    console.error("debris.owner", userUid, skillId, err.stack);
                    cb("dbError");
                } else if (res == null || res["operand"] <= 0) {
                    cb("debrisNull");
                } else {
                    gDebrisData = res;
                    cb(null);
                }
            });
        },
        randomUser:["getUser","getDebrisItem",function(cb) { //随机user
            var fakeDataProbConfig = pvpPatchConfig["fakeDataProb"]; //出npc概率配置
            var operandNum = gDebrisData["operandNum"] - 0;
            var fakeDataWeight = fakeDataProbConfig["fakeDataWeight"] - 0;
            var maxWeightBase = fakeDataProbConfig["maxWeightBase"] - 0;
            var maxWeightAdd = fakeDataProbConfig["maxWeightAdd"] - 0;
            var npcNum = 0;
            var realUser = 0;

            for (var i = 0; i < 3; i++) {
                if ((maxWeightAdd * operandNum + maxWeightBase) * Math.random() < fakeDataWeight) { // 机器人
                    npcNum++;
                } else {
                    realUser++;
                }
            }
            gNpcNum = npcNum;
            gRealUser = realUser;
            cb(null);
        }],
        randomRealUser:["randomUser",function(cb) { //随机真实的玩家
            if (gRealUser == 0) cb(null);
            else {
                var expS = configData.userLevelToExp(gUserLevel - 3);
                var expE = configData.userLevelToExp(gUserLevel + 3);
                debris.debrisOwner(userUid,skillId, debrisType, expS, expE, gRealUser, function(err,res) {
                    if (err) {
                        console.error(userUid,skillId, debrisType, expS, expE, gRealUser, err.stack);
                        cb("dbError");
                    } else {
                        rRealUserList = [];
                        for (var i = 0; i < res.length; i++) {
                            if (res[i] != userUid) rRealUserList.push(res[i]);
                        }
                        gNpcNum += (gRealUser - rRealUserList.length); //如果没有随机出足够的真实玩家则用npc替代
                        cb(null);
                    }
                });
            }
        }],
        randomNpc:["randomRealUser",function(cb) { //随机NPC
            if (gNpcNum == 0) cb(null);
            else {
                for (var i = 0; i < gNpcNum; i++) {
                    var targetLevel = gUserLevel + (Math.floor(Math.random() * 6) - 3);
                    if (targetLevel <= 0) targetLevel = 1;
                    var fakeDataConfig = pvpPatchConfig["fakeData"];
                    var fakeDataItem = (fakeDataConfig[targetLevel] == null)?null:fakeDataConfig[targetLevel]["fakeDataFormation"];
                    if (fakeDataItem == null) {
                        cb("configError");
                        return;
                    } else {
                        var mKeys = Object.keys(fakeDataItem);
                        var mKey = mKeys[Math.floor(Math.random() * mKeys.length)];

                        var npcId = Math.floor(Math.random() * 99779977);//数字作为key以避免重复，
                        var npcData = {"type":0,"level":targetLevel,"id":mKey,"skillId":skillId};
                        cacheData[npcId] = npcData;
                        var resultItem = {
                            "userUid":npcId,
                            "userLevel":targetLevel,
                            "userName":jutil.toBase64(fakeDataItem[mKey]["playerName"]),
                            "heroIdList":fakeDataItem[mKey]["formation"],
                            "debrisType":debrisType
                        };
                        resultList.push(resultItem);
                    }
                }
                cb(null);
            }
        }],
        getUserFormation:["randomNpc", function(cb) { //取用户编队
            if (rRealUserList == null || rRealUserList.length == 0) {
                cb(null);
            } else {
                async.forEach(rRealUserList, function(item,forCb) {
                    pvptop.getPvpUserInfo(item, function(err,res) {
                        if (err) {
                            console.error(item, err.stack);
                            forCb(err);
                        } else if (res == null) {
                            forCb("dbError");
                        } else {
                            cacheData[item] = {"type":1,"level":res["userLevel"],"id":item,"skillId":skillId};

                            var resultItem = {
                                "userUid":res["userUid"],
                                "userLevel":res["userLevel"],
                                "userName":res["userName"],
                                "heroIdList":res["heroIdList"],
                                "debrisType":debrisType
                            };

                            resultList.push(resultItem);
                            forCb(null);
                        }
                    });
                }, function(err) {
                    if (err) cb("dbError");
                    else {
                        cb(null);
                    }
                });
            }
        }]
    },function(err) {
        if (err) response.echo("debris.owner", jutil.errorInfo(err));
        else {
            debris.addGrabTarget(userUid, cacheData);
            response.echo("debris.owner", resultList);
        }
    });
}

exports.start = start;