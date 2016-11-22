/**
 * 领取升级的VIP和元宝奖励
 * User: liyuluan
 * Date: 13-11-19
 * Time: 下午2:45
 */
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");
var mongoStats = require("../model/mongoStats");

/**
 * 领取升级奖励
 * @param postData rewardLevel 领取的奖励等级
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"rewardLevel") == false){
        response.echo("practice.levelUpReward",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var rewardLevel = postData["rewardLevel"];
    var configData = configManager.createConfig(userUid);

    var gRewardLevelIndex = null; //等级奖励的标识位索引
    var gLuRewardReceive = null;//当前的领取标识位置
    var gUserLevel = 0; //当前的用户等级
    var gVIP = 0;//当前用户VIP
    var gIngot = 0;//当前用户的元宝
    var gUserData = null;//用户信息

    var rUserData = null;//返回的用户数据

    async.series([
        function(cb) { //判断是否可以领取
            userVariable.getVariable(userUid,"luRewardReceive",function(err,res) {
                if (err) cb("dbError");
                else {
                    var mValue = (res || 0) - 0;
                    var rewardLevelIndex = getRewardLevelIndex(rewardLevel);
                    if (rewardLevelIndex === null) {
                        cb("postError");
                    } else {
                        if (jutil.bitGet(mValue,rewardLevelIndex) == 1) cb("haveReceive");
                        else {
                            gRewardLevelIndex = rewardLevelIndex;
                            gLuRewardReceive = mValue;
                            cb(null);
                        }
                    }
                }
            });
        },
        function(cb) { //取用户当前等级
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserData = res;
                    //var mExp = res["exp"] - 0;
                    gUserLevel = res["lv"] - 0;
                    gVIP = res["vip"] - 0;
                    gIngot = res["ingot"] - 0;
                    cb(null);
                }
            });
        },
        function(cb) { //写入奖励
            var levelUpRewardConfig = configData.getConfig("growth")["LevelUpReward"]["reward"];
            var levelUpReward = levelUpRewardConfig[rewardLevel];
            if (levelUpReward == null) cb("configError");
            else if (gUserLevel < levelUpReward["level"]) cb("userLevelInsufficient"); //用户等级不到可领取等级
            else {
                var ingot = levelUpReward["rewardImegga"] - 0;
                var vip = levelUpReward["rewardVipLevel"];
                var userData = {};
                if (vip !== undefined && vip > gVIP) userData["vip"] = vip;
                userData["ingot"] = ingot + gIngot;
                rUserData = userData;

                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                mongoStats.dropStats("ingot", userUid, userIP, gUserData, mongoStats.LEVEL_UP, ingot);

                user.updateUser(userUid,userData,function(err,res) {
                    if (err) cb("dbError");
                    else cb(null);
                });


            }
        },
        function(cb) { //写入标识位
            var newLuRewardReceive = jutil.bitSetTrue(gLuRewardReceive,gRewardLevelIndex)
            userVariable.setVariable(userUid, "luRewardReceive", newLuRewardReceive, function(err,res) {
                cb(null);
                if (err) console.error("practice.levelUpReward", userUid, newLuRewardReceive, err.stack);
            });
        }
    ],function(err) {
        if (err) response.echo("practice.levelUpReward",jutil.errorInfo(err));
        else {
            response.echo("practice.levelUpReward",rUserData);
        }
    });
}

/**
 * 取奖励等级所对应的索引
 * @param rewardLevel
 */
function getRewardLevelIndex(rewardLevel) {
    switch (rewardLevel - 0) {
        case 3:return 0;break;
        case 5:return 1;break;
        case 10:return 2;break;
        case 15:return 3;break;
        case 20:return 4;break;
        case 25:return 5;break;
        case 30:return 6;break;
        case 35:return 7;break;
    }
    return null;
}

exports.start = start;