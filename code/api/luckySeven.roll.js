/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-8
 * Time: 下午5:17
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var luckySeven = require("../model/luckySeven");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var mongoStats = require("../model/mongoStats");
/**
 *
 * @param postData {"level":"1"}
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"level") == false) {
        response.echo("luckySeven.roll", jutil.errorInfo("postError"));
        return;
    }
    var level = postData["level"] + "";
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var config = configData.getConfig("lucky777");
    var levelConfig = config["level"][level];
    if (!levelConfig) {
        response.echo("luckySeven.roll", jutil.errorInfo("valueError"));
        return;
    }
    var sevenPointNeed = config["777PointNeed"];//中大奖需要的积分
    var serverPoint = 0;//服务器积分
    var selfPoint = 0;//个人积分
    var isFree = false;//本次是否免费
    var remainFreeTimes = 0;//剩余免费次数
    var returnData = {};//返回数据
    var rewardData = null;//获得的奖励
    var rewardKey = "";//随机出来的奖项 "123" "444" "777"
    var userSony = 0;//索尼
    var userIngot = 0;//伊美加币
    var userTicket = 0;//礼券
    var heroSouls = null;
    var vip = 0;
    var sonyRatioConfig = {"0":1,"1":1,"2":0.95,"3":0.9};
    async.series([
        function(cb) {//获取活动配置
            activityConfig.getConfig(userUid, "lucky777", function(err, res) {
                    if (res != null) {
                        if (res[0]) {//开启
                            var rewardsConfig = res[2];
                            if (rewardsConfig) {
//                                var rewardLen = rewardsConfig.length;
//                                for (var i = 0; i < config["rewardNormal"].length; i++) {
//                                    var item = config["rewardNormal"][i];
//                                    item["rewardBase"][0] = rewardsConfig[i];
//                                }
//                                config["reward777"]["rewardBase"][0] = rewardsConfig[rewardLen - 1];
                                sonyRatioConfig = rewardsConfig["sales"];
                            }
                            cb(null);
                        } else {
                            cb("dbError");
                        }
                    } else {
                        cb("dbError");
                    }
            });
        },
        function(cb) {//获取用户vip
            user.getUser(userUid, function(err, res) {
                if (err)
                    cb(err);
                else {
                    vip = res["vip"] + "";
                    cb(null);
                }
            });
        },
        function (cb) { //判断是否还有免费次数
            luckySeven.getFreeTimes(userUid, function(err, res) {
                if (err)
                    cb(err);
                else {
                    if (res == null) {
                        remainFreeTimes = getFreeTimesByVip(vip, config["dailyFreeTime"]);
                        isFree = remainFreeTimes > 0;
                    }
                    else {
                        if (!jutil.compTimeDay(jutil.now(), res["time"])) {//不是同一天
                            remainFreeTimes = getFreeTimesByVip(vip, config["dailyFreeTime"]);
                            isFree = remainFreeTimes > 0;
                        } else {
                            if (res["value"] > 0) {//还有免费次数
                                isFree = true;
                                remainFreeTimes = res["value"];
                            }
                        }
                    }
                    cb(null);
                }
            })
        },

        function(cb) {//判断索尼是否足够
            var needSony = levelConfig["cost"]["count"] * sonyRatioConfig[level];
            user.getUser(userUid, function(err, res) {
                if (err || res == null)
                    cb("dbError");
                else {
                    userSony = res["gold"];
                    userIngot = res["ingot"];
                    if (isFree || userSony >= needSony)
                        cb(null);
                    else
                        cb("noMoney");
                }
            });
        },

        function(cb) {//获取服务器积分
            luckySeven.getServerPoint(userUid, function(err, res) {
                if (err)
                    cb(err);
                else {
                    serverPoint = res;
                    cb(null);
                }
            });
        },

        function(cb) {//获取个人积分
            luckySeven.getUserPoint(userUid, function(err, res) {
                if (err)
                    cb(err);
                else {
                    selfPoint = res;
                    cb(null);
                }
            });
        },

        function(cb) {//roll
            if (isFree)
                levelConfig = config["level"]["0"];
            if (serverPoint >= sevenPointNeed || selfPoint >= sevenPointNeed){//服务器积分大于等于777pointNeed或个人积分大于等于777poiniNeed 中大奖
                var addPoint = levelConfig["addPoint"];
                serverPoint = serverPoint - 0 + addPoint;
                selfPoint = selfPoint - 0 + addPoint;
                var reducePoint = config["reward777"]["rewardPointBase"] * levelConfig["777ReduceRatio"];
                serverPoint -= reducePoint;
                selfPoint -= reducePoint;
                var rewardBase = config["reward777"]["rewardBase"][0];
                rewardData = {"id":rewardBase["id"], "count":rewardBase["count"] * levelConfig["rewardCountRatio"]};
                rewardKey = "777";
            } else {
                var rewardItem = randomRewardNormal(config["rewardNormal"]);
                if (rewardItem == null)
                    cb("dbError");
                var addPoint = levelConfig["addPoint"];
                serverPoint = serverPoint - 0 + addPoint;
                selfPoint = selfPoint - 0 + addPoint;
                var reducePoint = rewardItem["rewardPointBase"] * levelConfig["rewardPointRatio"];
                serverPoint -= reducePoint;
                selfPoint -= reducePoint;
                var rewardBase = rewardItem["rewardBase"][0];
                rewardData = {"id":rewardBase["id"], "count":rewardBase["count"] * levelConfig["rewardCountRatio"]};
                rewardKey = randomGroupItem(rewardItem["group"]);
            }
            cb(null);
        },

        function(cb) {//更新玩家伊美加币索尼
            if (rewardData["id"] == "immegga") {
                userIngot = userIngot - 0 + (rewardData["count"] - 0);
            }
            if (!isFree) {
                var costSony = levelConfig["cost"]["count"] * sonyRatioConfig[level];
                userSony -= costSony;
                mongoStats.expendStats("gold",userUid,"127.0.0.1",null,mongoStats.E_LUCKYSEVEN, costSony)
            }
            if (rewardData["id"] == "immegga" || !isFree) {
                user.updateUser(userUid, {"ingot":userIngot, "gold":userSony}, function(err, res){
                    if (err)
                        cb(err);
                    else
                        cb(null);
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//更新筹码
            if (rewardData["id"] == "152801" && rewardData["count"] > 0) {
                modelUtil.addDropItemToDB("152801", rewardData["count"], userUid, 0, 1, function(err, res) {
                    if (err)
                        cb(err);
                    else {
                        if (res)
                            userTicket = res["number"];
                        mongoStats.dropStats("152801",userUid,"127.0.0.1",null,mongoStats.LUCKYSEVEN,rewardData["count"]);
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//更新魂魄
            if (rewardData["id"] != "152801" && rewardData["id"] != "immegga") {
                modelUtil.addDropItemToDB(rewardData["id"], rewardData["count"], userUid, 0, 1, function(err, res) {
                    if (err)
                        cb(err);
                    else {
                        if (res)
                            heroSouls = res;
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//更新用户积分
            luckySeven.setUserPoint(userUid, selfPoint, function(err, res) {
                if (err)
                    cb(err);
                else
                    cb(null);
            });
        },

        function(cb) {//更新服务器积分
            luckySeven.setServerPoint(userUid, serverPoint, function(err, res) {
                if (err)
                    cb(err);
                else
                    cb(null);
            })
        },

        function(cb) {//更新剩余免费次数
            if (isFree) {
                remainFreeTimes -= 1;
                remainFreeTimes = remainFreeTimes < 0 ? 0 : remainFreeTimes;
                luckySeven.setFreeTimes(userUid, remainFreeTimes, function(err, res) {
                    if (err)
                        cb(err);
                    else
                        cb(null);
                })
            } else {
                cb(null);
            }
        }
    ], function (err, result) {
        if (err)
            response.echo("luckySeven.roll", jutil.errorInfo(err));
        else {
            var tickets = null;
            if (userTicket != 0)
                tickets = {"itemId":152801, "number":userTicket};
            var numUsed = 0;
            if (level == "1") numUsed = 1;
            else if(level == "2") numUsed = 10;
            else if (level == "3") numUsed = 20;
            timeLimitActivity.lucky777(userUid, numUsed, function(){
                response.echo("luckySeven.roll", {
                    "freeTimes":remainFreeTimes,
                    "userData":{"ingot":userIngot,"gold":userSony},
                    "tickets":tickets,
                    "heroSouls":heroSouls,
                    "reward":rewardData,
                    "rewardItem":rewardKey
                });
            });
        }
    });
}

function getFreeTimesByVip(vip, config) {
    if (config.hasOwnProperty(vip))
        return config[vip];
    return 0;
}

/**
 * 随机一组奖励
 * @param config
 * @returns {*}
 */
function randomRewardNormal(config) {
    var randomValue = Math.random();
    var probStart = 0;
    for (var i = 0; i < config.length; i++) {
        var probItem = config[i];
        if (randomValue >= probStart && randomValue < (probStart + probItem["prob"]))
            return probItem;
        probStart += probItem["prob"];
    }
    return null;
}

/**
 * 随机一个组合
 * @param config
 */
function randomGroupItem(config) {
    var length = config.length;
    var randomVal = Math.random();
    var index = Math.floor(randomVal * length);
    return config[index].join("");
}

exports.start = start;