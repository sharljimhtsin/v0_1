/**
 * 订单数据层
 * Created by apple on 14-2-10.
 */
var mysql = require("../alien/db/mysql");
var async = require("async");
var user = require("../model/user");
var variable = require("../model/userVariable");
var configManager = require("../config/configManager");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var item = require("../model/item");
var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var practiceRecharge = require("../model/practiceRecharge");
var practiceRecharge2 = require("../model/practiceRecharge2");
var modelUtil = require("../model/modelUtil");
var practiceOneRecharge = require("../model/practiceOneRecharge");
var oneRecharge2 = require("../model/oneRecharge2");
var dailyCumulativeRecharge = require("../model/dailyCumulativeRecharge");
var oneChargeActivity = require("../model/OneChargeActivity");
var dailyChargeActivity = require("../model/DailyChargeActivity");
var financial = require("../model/financialPlan");
var rechargeRanking = require("../model/rechargeRanking");
var dailyMustRecharge = require("../model/dailyMustRecharge");
var messiah = require("../model/messiah");
var practiceWheel = require("../model/practiceWheel");
var practiceVipClub = require("../model/practiceVipClub");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");
var userVariable = require("../model/userVariable");
var bitUtil = require("../alien/db/bitUtil");
var redis = require("../alien/db/redis");
var mail = require("../model/mail");
var quarterCard = require("../model/quarterCard");
var monthCard = require("../model/monthCard");

function addOrder(orderNo, userId, productId, callbackFn, order_id) {
    order_id = order_id == undefined ? '' : order_id;
    var sql = "INSERT INTO payOrder SET ?";
    var insertData = {
        "orderNo": orderNo,
        "userUid": userId,
        "productId": productId,
        "createTime": jutil.now(),
        "order_id": order_id
    };
    mysql.game(userId).query(sql, insertData, function (err, res) {
        if (err) {
            console.log(err.stack);
            callbackFn(err);
        } else {
            //redis.loginFromUserUid(userId).h("myCardOrder").set(orderNo.substr(0,20), orderNo + "_" + userId);
            callbackFn(null, {"orderNo": orderNo});
        }
    });
}

/**
 * 更新订单（kingNet平台）
 * @param userUid 玩家id
 * @param orderNo 订单号
 * @param uin 玩家平台id
 * @param orderMoney 充值货币数量
 * @param ingot 伊美加币数量
 * @param payStatus 平台订单状态
 * @param createTime 订单创建时间
 * @param callbackFn
 */
function updateOrderForKingNet(userUid, orderNo, uin, orderMoney, ingot, payStatus, createTime, kda, callbackFn, platformId, order_id) {
    updateOrder(userUid, orderNo, platformId == undefined ? "android" : platformId, uin, ingot, orderMoney, payStatus, createTime * 1000, 1, "", callbackFn, ingot, kda, order_id);
}

/**
 * 更新订单
 * @param userUid 玩家id
 * @param orderNo 订单号
 * @param platformId 是android还是ios平台
 * @param uin 玩家平台id
 * @param goodsCount 废
 * @param orderMoney 充值货币数量
 * @param payStatus 平台订单状态
 * @param createTime 订单创建时间
 * @param goodsId 产品id
 * @param callbackFn
 * @param ingot 充值增加的伊美加币
 */
function updateOrder(userUid, orderNo, platformId, uin, goodsCount, orderMoney, payStatus, createTime, goodsId, payContent, callbackFn, ingot, kda, order_id) {
    var orderStatus = 0;
    var userIngot = 0;
    var userGold = 0;
    var vipLevel = 0;
    var isFirstCharge = false;//是否首充
    var firstChargeKey = "isFirstCharge";
    var activityAmount = 0;//活动额外增加的金币
    var addAmount = 0;//购买增加的总金币
    var chargeTotal = 0;//历史充值总数
    var chargeBaseAmount = 0;//充值获得的伊美加币基数
    var configData = configManager.createConfig(userUid);
    var payConfig = configData.getConfig("pay");
    var vipConfig = configData.getConfig("vip");
    var country = bitUtil.parseUserUid(userUid)[0];//大区
    var mongoStatsType = mongoStats.R_PAY;
    order_id = order_id == undefined ? '' : order_id;
    var mo9Config;
    var mo9Data;
    var baxiConfig;
    var baxiData;
    var userInfo;
    async.series([
        function(cb) {//获取订单状态和判断goodsId是否一致
            var sql = "SELECT * FROM payOrder WHERE orderNo=" + mysql.escape(orderNo);
            mysql.game(userUid).query(sql, function(err, res) {
                if (err) {console.log("userUid: " + userUid + "notExist!");cb("dbError"); }
                else {
                    var res1 = res[0];
                    if (res1) {
                        orderStatus = res1["status"];
                        var gId = res1["productId"];
                        if (["ljyoulu", "youku", "meizu", "i4", "ljxiaomi", "ljhuawei", "lj360", "ljhtc", "ljguopana", "ljguopani", "ljxiongmao", "baxi", "yuenan", "ger", "fra", "esp", "ara", "gera", "fraa", "espa", "araa", "RayCreator", "yuenanlumi", "yuenanlumiAlt", "yuenanlumiCus", "MOL", "MyCard"].indexOf(platformId) >= 0) {
                            goodsId = gId;
                        }
                        if (gId != goodsId && ingot == undefined)//购买的产品id不一致 如果是kingnet的话会传ingot参数 没有goodsId
                        {
                            console.log("购买的产品id不一致");
                            cb("error");
                        }
                        else
                            cb(null);
                    } else {
                        cb("dbError");
                    }
                }
            });
        },

        function(cb) {//获取用户伊美加币
            if (orderStatus != 1) {
                var sql = "SELECT * FROM user WHERE userUid = " + mysql.escape(userUid);
                mysql.game(userUid).query(sql, function(err, res) {
                    if (err) cb("dbError");
                    else {
                        if (res && res.length > 0) {
                            console.log("获取用户伊美加币啦!");
                            var res1 = res[0];
                            userInfo = res1;
                            userIngot = res1["ingot"];
                            userGold = res1["gold"];
                            vipLevel = res1["vip"];
                            cb(null);
                        } else {
                            {console.log("获取用户伊美加币 failed!");cb("dbError");}
                        }
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//获取充值总额度
            if (orderStatus != 1) {
                variable.getVariable(userUid, "totalCharge", function(err, res) {
                    if (err)
                    {console.log("获取充值总额度 failed!");cb("dbError");}
                    else {
                        console.log("获取充值总额度啦!");
                        if (res != null)
                            chargeTotal = res;
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {
            activityConfig.getConfig(userUid, "firstCharge", function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = 0;
                        if (activityArg == -1) {
                            // 取数据库配置，如果配置不存在取默认配置
                            firstChargeKey = res[2] || res[3]["1"];
                        } else {
                            // 取指定配置，如果配置不存在取默认配置
                            firstChargeKey = res[3][activityArg] || res[3]["1"];
                        }
                        firstChargeKey = firstChargeKey["key"];
                        cb(null);
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function (cb) {//判断是否首充
            if (orderStatus != 1) {//非台灣安卓
                variable.getVariable(userUid, firstChargeKey, function(err, res) {
                    if (err)
                    {console.log("判断是否首充 failed!");cb("dbError");}
                    else {
                        console.log("判断是否首充啦!");
                        if (res == null){
                            isFirstCharge = true;
                            mongoStatsType = mongoStats.R_FIRSTPAY;
                        }
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) {// 从活动中载入MO9首次充值的情况
            var defaultData = {
                "1": "0",
                "2": "0",
                "3": "0",
                "4": "0",
                "5": "0",
                "6": "0",
                "7": "0",
                "8": "0",
                "9": "0",
                "10": "0",
                "11": "0",
                "12": "0"
            };
            activityData.getActivityData(userUid, activityData.PRACTICE_MO9Recharge, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res && res["arg"] != "") {
                        try {
                            var mObj = JSON.parse(res["arg"]);
                        } catch (e) {
                            mObj = {};
                        } finally {
                            mo9Data = mObj;
                        }
                    } else {
                        mo9Data = defaultData;
                    }
                    cb();
                }
            });
        },
        function (cb) {// 动态从活动中载入MO9充值的档位
            activityConfig.getConfig(userUid, "mo9Recharge", function (err, res) {
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        payConfig = jutil.deepCopy(payConfig);
                        mo9Config = res[2];
                        if (mo9Config.hasOwnProperty("mo9")) {
                            payConfig["mo9"] = mo9Config["mo9"];
                        } else {
                            payConfig["mo9"] = {};
                        }
                        cb(null);
                    } else {
                        payConfig["mo9"] = {};
                        cb(null);
                    }
                }
            });
        },

        //南美首充双倍
        function (cb) {// 从活动中载入南美首次充值的情况
            var defaultData = {
                "1": "0",
                "2": "0",
                "3": "0",
                "4": "0",
                "5": "0",
                "6": "0",
                "7": "0",
                "8": "0",
                "9": "0",
                "10": "0",
                "11": "0",
                "12": "0"
            };
            activityData.getActivityData(userUid, activityData.PRACTICE_BAXIRecharge, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res && res["arg"] != "") {
                        baxiData = JSON.parse(res["arg"]);
                    } else {
                        baxiData = defaultData;
                    }
                    cb();
                }
            });
        },
        function (cb) {// 动态从活动中载入南美充值的档位
            activityConfig.getConfig(userUid, "baxiRecharge", function (err, res) {
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        payConfig = jutil.deepCopy(payConfig);
                        baxiConfig = res[2];
                        if (baxiConfig.hasOwnProperty("baxi")) {
                            payConfig["baxi"] = baxiConfig["baxi"];
                        } else {
                            payConfig["baxi"] = {};
                        }
                        cb(null);
                    } else {
                        payConfig["baxi"] = {};
                        cb(null);
                    }
                }
            });
        },

//        function(cb) {//获取活动额外增加的金币
//            if (orderStatus != 1) {
//                activityConfig.getConfig(userUid,"pay",function(err, res) {
//                    if (err)
//                        cb("dbError");
//                    else {
//                        if (res) {
//                            var obj = JSON.parse(res);
//                            activityAmount = obj[goodsId]["activityImegga"];
//                        }
//                        cb(null);
//                    }
//                });
//            } else {
//                cb(null);
//            }
//        },

        function(cb) { //更新用户伊美加币 首冲奖励 vip等级
            if (orderStatus != 1) {
                if (platformId == "kingnetenglish" || platformId == "kythaixy" || platformId == "RayCreator_cus" || platformId == "yuenanlumiCus" || platformId == "MyCard" || (uin == "test" && ingot != undefined)) {
                    baseAmount = chargeBaseAmount = goodsCount - 0;
                } else {
                    var chargeType;
                    if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                        chargeType = "ios";
                    else if (platformId == "kyxyzs")
                        chargeType = "kyxyzs1";
                    else if (platformId == "mo9")
                        chargeType = "mo9";
                    else if (platformId == "MOL")
                        chargeType = "mol";
                    else if (platformId == "yuenanlumiAlt")
                        chargeType = "lumi";
                    else
                        chargeType = "android";
                    var goodsConfig = payConfig[chargeType][goodsId];
                    var baseAmount = chargeBaseAmount = goodsCount - 0;
                    if (goodsConfig != undefined) {
                        chargeBaseAmount = goodsConfig["getImegga"];
                        var baseAmount = goodsConfig["getImegga"] + goodsConfig["getMoreImegga"];
                        var configOrderMoney = goodsConfig["payMoney"];
                        if (parseFloat(configOrderMoney) != parseFloat(orderMoney)) {
                            baseAmount = orderMoney * 10;
                            chargeBaseAmount = baseAmount;
                        }
                    }
                }
                var addGold = 0;
                var firstPayRatio = 1;
                if (isFirstCharge) {//首充翻3倍
                    firstPayRatio = payConfig["firstPayRatio"];
                    addAmount = baseAmount * firstPayRatio;
                    addGold = payConfig["firstPayReward"]["zeni"];
                } else
                    addAmount = baseAmount;
                if (platformId == "mo9") {// MO9 充值返还30%
                    addAmount += chargeBaseAmount * 0.3;
                    console.log("mo9 30%", chargeBaseAmount * 0.3);
                }
                if (platformId == "mo9" && mo9Data[goodsId] && mo9Data[goodsId] == "0") {//MO9各档位首冲双倍
                    activityAmount = chargeBaseAmount * 1;
                    mo9Data[goodsId] = "1";
                    console.log("mo9 double", activityAmount);
                }
                if ((platformId == "baxi" || platformId == "baxiios") && baxiData[goodsId] && baxiData[goodsId] == "0") {//南美各档位首冲双倍
                    activityAmount = baseAmount * 1;
                    baxiData[goodsId] = "1";
                    console.log("baxi double", activityAmount);
                }
                addAmount = parseInt(addAmount) + parseInt(activityAmount);//如果在活动期间则再加上活动的奖励
                var tmpChargeTotal = parseFloat(chargeTotal) + parseFloat(orderMoney);//总充值额度
                var newVipLevel = 0;
                for (var key in vipConfig) {
                    var nextKey = (parseInt(key) + 1) + "";
                    var start = vipConfig[key]["needMoney"];
                    var end;
                    if (vipConfig.hasOwnProperty(nextKey))
                        end = vipConfig[nextKey]["needMoney"];
                    else
                        end = 100000000;//应该没人会冲1个亿吧...
                    if (tmpChargeTotal >= start && tmpChargeTotal < end) {
                        newVipLevel = parseInt(key);
                        break;
                    }
                }
                newVipLevel = vipLevel > newVipLevel ? vipLevel : newVipLevel;//新旧vip等级取高的那个
                if (ingot != undefined) {//kingnet的情况
                    chargeBaseAmount = ingot;
                    if (isFirstCharge)
                        addAmount = ingot * firstPayRatio;
                    else
                        addAmount = ingot;
                }
                if (country == "g") {//kingnetios
                    chargeBaseAmount = goodsCount;
                    if (isFirstCharge)
                        addAmount = goodsCount * firstPayRatio;
                    else
                        addAmount = goodsCount;
                }
                var newIngot = parseInt(userIngot) + (addAmount - 0);
                if (isNaN(newIngot)) {
                    newIngot = 0;
                    console.log("元宝错误 。。。。。。", addAmount, userIngot);
                }
                var newUserData = {"ingot":newIngot,"gold":parseInt(userGold) + (addGold - 0),"vip":newVipLevel};
                user.updateUser(userUid, newUserData, function(err, res) {
                    if (err) {console.log("updateUser failed!");cb("dbError");}
                    else {
                        {console.log("updateUser 啦!!!!!");cb(null);}
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) {
            if (platformId == "mo9" && mo9Data[goodsId] && mo9Data[goodsId] == "0") {//MO9各档位首冲双倍
                var reward = JSON.stringify([{"id": "ingot", "count": chargeBaseAmount}]);
                mail.addMail(userUid, -1, "MO9", reward, "123456", cb);
                console.log("mo9 mail", chargeBaseAmount);
            } else {
                cb();
            }
        },
        function(cb) {//更新首冲奖励物品 装备 英雄
            if (orderStatus != 1 && isFirstCharge) {
                for (var key in payConfig["firstPayReward"]) {
                    modelUtil.addDropItemToDB(key, payConfig["firstPayReward"][key], userUid, 0, 1, function(err, res) {
                        mongoStats.dropStats(key, userUid, '127.0.0.1', userInfo, mongoStatsType, payConfig["firstPayReward"][key]);
                    });
                }
            }
            cb(null);
        },

        function(cb) {//更新充值记录
            if (orderStatus != 1) {
                var newVal = parseFloat(chargeTotal) + parseFloat(orderMoney);
                variable.setVariable(userUid,"totalCharge",newVal,function(err, res){
                    if (err)
                    {console.log("更新充值记录 failed!");cb(err);}
                    else
                    {console.log("更新充值记录啦！！！！");cb(null);}
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//更新首冲标记
            if (orderStatus != 1 && isFirstCharge) {//非台灣安卓
                variable.setVariable(userUid,firstChargeKey,1,function(err, res){
                    if (err)
                        cb(err);
                    else
                        cb(null);
                });
            } else {
                cb(null);
            }
        },
        function (cb) {//更新MO9各档位首冲标记
            activityData.updateActivityData(userUid, activityData.PRACTICE_MO9Recharge, {"arg": JSON.stringify(mo9Data)}, cb);
        },
        function (cb) {//更新南美各档位首冲标记
            activityData.updateActivityData(userUid, activityData.PRACTICE_BAXIRecharge, {"arg": JSON.stringify(baxiData)}, cb);
        },
        function(cb) {//更新累积充值活动记录
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var cumulateIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    cumulateIngot = ingot;
                if (country == "g")//kingnetios
                    cumulateIngot = goodsCount;
                practiceRecharge.addRecord(userUid, cumulateIngot, function(err){
                    {console.log("更新累积充值活动记录!");cb(null);}
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//更新累积充值活动记录2
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var cumulateIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    cumulateIngot = ingot;
                if (country == "g")//kingnetios
                    cumulateIngot = goodsCount;
                practiceRecharge2.addRecord(userUid, cumulateIngot, function(err){
                    console.log("更新累积充值活动2记录!");
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//单笔充值活动记录
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                practiceOneRecharge.addRecord(userUid, singleIngot, function(err){
                    {console.log("更新单笔充值活动记录!");cb(null);}
                });
            } else {
                cb(null);
            }
        },
        function (cb) {//季卡活动充值记录
            if (orderStatus != 1) {
                quarterCard.addRecord(userUid, orderMoney, function (err) {
                    {
                        console.log("更新季卡活动记录!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//单笔充值活动记录2
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                oneRecharge2.addRecord(userUid, singleIngot, function(err){
                    {console.log("更新单笔充值活动记录2!");cb(null);}
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//单笔充值活动记录3 首冲不参与该活动
            activityConfig.getConfig(userUid, "oneRecharge3", function (err, res) {
                if (err || res[0] != true) {
                    return;
                }
                stats.recordWithLevel(chargeBaseAmount, res[2]["list"], true, "payMax", "payMin", [mongoStats.oneRecharge3_1, mongoStats.oneRecharge3_2, mongoStats.oneRecharge3_3, mongoStats.oneRecharge3_4, mongoStats.oneRecharge3_5], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
            });
            stats.dropStats("ingot", userUid, "127.0.0.1", null, mongoStats.oneRecharge3_count, chargeBaseAmount);
            if (orderStatus != 1 && !isFirstCharge) {
                oneChargeActivity.addRecord(userUid, chargeBaseAmount, function() {
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//单笔充值活动记录4 单日首冲奖励 首冲不参与该活动
            if (orderStatus != 1 && !isFirstCharge) {
                dailyChargeActivity.addRecord(userUid, chargeBaseAmount, function() {
                    cb(null);
                })
            } else {
                cb(null);
            }
        },
        function(cb) {//每日累计充值
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                dailyCumulativeRecharge.addRecord(userUid, singleIngot, function(err){
                    {console.log("更新每日累计充值活动记录!");cb(null);}
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//充值排行榜--za
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                rechargeRanking.addRecord(userUid, singleIngot, function(err){
                    if(err){
                        console.log("充值排行榜错误！");
                        cb(null);
                    } else {
                        console.log("更新充值排行榜成功!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//赛亚巨献
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                messiah.addRecord(userUid, singleIngot, function(err){
                    if(err){
                        console.log("赛亚巨献错误！");
                        cb(null);
                    } else {
                        console.log("更新赛亚巨献成功!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//每日必买
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                dailyMustRecharge.addRecord(userUid, singleIngot, function(err){
                    if(err){
                        console.log("每日必买错误！");
                        cb(null);
                    } else {
                        console.log("更新每日必买成功!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//金币摩天轮
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                practiceWheel.addRecord(userUid, singleIngot, function(err){
                    if(err){
                        console.log("金币摩天轮错误！");
                        cb(null);
                    } else {
                        console.log("更新金币摩天轮成功!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//vipClub--za
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                practiceVipClub.addRecord(userUid, goodsId,singleIngot,function(err){
                    if(err){
                        console.log("vip俱乐部活动充值错误！");
                        cb(null);
                    } else {
                        console.log("更新vip俱乐部活动充值成功!");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//理财
            if (orderStatus != 1) {
                var chargeType;
                if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios")
                    chargeType = "ios";
                else if (platformId == "kyxyzs")
                    chargeType = "kyxyzs1";
                else if (platformId == "mo9")
                    chargeType = "mo9";
                else if (platformId == "MOL")
                    chargeType = "mol";
                else if (platformId == "yuenanlumiAlt")
                    chargeType = "lumi";
                else
                    chargeType = "android";

                var goodsConfig = payConfig[chargeType][goodsId];
                var singleIngot = goodsConfig == undefined?0:goodsConfig["getImegga"];
                if (ingot != undefined)
                    singleIngot = ingot;
                if (country == "g")//kingnetios
                    singleIngot = goodsCount;
                financial.addChargeRecord(userUid, singleIngot, function(err){
                    {console.log("更新理财计划活动记录!");cb(null);}
                });
            } else {
                cb(null);
            }
        },
        function(cb) {//更新玩家充值记录
            if (orderStatus != 1) {
                monthCard.isWork(userUid, function (err, res, obj) {
                    if (res) {
                        var cumulativePay = obj["cumulativePay"] - 0;
                        var newCumulativePay = parseInt((cumulativePay + parseFloat(orderMoney)) * 100) / 100;
                        var newUserData = {"cumulativePay": newCumulativePay};
                        user.updateUser(userUid, newUserData, function (err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                console.log("updateUser啦！！！！");
                                cb(null);
                            }
                        });
                    } else {
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },

        function(cb) {//更新订单状态
            if (orderStatus != 1) {
                var sql = "UPDATE payOrder SET ? WHERE orderNo = " + mysql.escape(orderNo);
                var time = new Date(createTime).getTime();
                if (isNaN(time)) {
                    time = new Date().getTime();
                }
                var sec = Math.floor(time / 1000);
                var newData = {
                    "platformId": platformId,
                    "uin": uin,
                    "goodsCount": addAmount,
                    "orderMoney": orderMoney,
                    "payStatus": payStatus,
                    "createTime": sec,
                    "status": 1,
                    "order_id": order_id,
                    "payContent": payContent
                };
                mysql.game(userUid).query(sql, newData, function (err, res) {
                    if (err) {
                        console.log("更新订单状态failed!");
                        cb("dbError");
                    }
                    else {
                        console.log("更新订单状态啦！！！！");
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },

        function(cb){//更新充值成功标识
            userVariable.setVariableTime(userUid,"chargeSuccessFlag",1,jutil.now(),function(err,res){
                if (err) console.error(userUid, 1, jutil.now(), err.stack);
                cb(null);
            });
        },
        function(cb){//标记平台号
            if(uin != 'test' && (platformId == 'thai' || platformId == 'thaiios')){
                userVariable.setPlatformId(userUid,platformId+'|'+uin,function(err,res){
                    cb(null);
                });
            } else {
                cb(null);
            }
        }
    ],function(err) {
        if (err) {
            callbackFn(err, 0);
            console.log("报错啦！！！！！！！");
        } else {
            if (orderStatus != 1 && uin != "test") {
                if (platformId == "mo9") {
                    stats.pay(userUid, "127.0.0.1", userInfo, orderMoney, addAmount, orderNo, kda, true);
                } else if (platformId == "MOL" || platformId == "MyCard") {
                    stats.pay(userUid, "127.0.0.1", userInfo, orderMoney, addAmount, orderNo, kda, false, true);
                } else {
                    stats.pay(userUid, "127.0.0.1", userInfo, orderMoney, addAmount, orderNo, kda);
                }
                mongoStats.dropStats("ingot", userUid, '127.0.0.1', userInfo, mongoStats.R_PAY, addAmount);
            }
            redis.user(userUid).s("payOrder").del();
            callbackFn(null, 1);
        }
    });
}

/**
 * 取出一个订单
 * @param userUid
 * @param orderNo
 * @param callbackFn
 */
function getOrder(userUid,orderNo,callbackFn) {
    var sql = "SELECT * FROM payOrder WHERE orderNo=" + mysql.escape(orderNo) + " AND userUid=" + mysql.escape(userUid);
    console.log("sql: " + sql);
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null || res.length == 0) callbackFn(null, null);
            else callbackFn(null, res[0]);
        }
    });
}

/**
 * 取出未验证的订单(ios)
 * @param userUid
 * @param callbackFn
 */
function getUnverifiedOrders(userUid, callbackFn) {
    var sql = "SELECT * FROM payOrder WHERE userUid=" + mysql.escape(userUid) + " AND status=0 AND backup != ''";
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null || res.length == 0) callbackFn(null, null);
            else callbackFn(null, res);
        }
    });
}

/**
 * 取出未验证的订单(android)
 * @param userUid
 * @param callbackFn
 */
function getUnverifiedOrdersForAndroid(userUid, callbackFn) {
    var sql = "SELECT * FROM payOrder WHERE userUid=" + mysql.escape(userUid) + " AND status=0";
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null || res.length == 0) callbackFn(null, null);
            else callbackFn(null, res);
        }
    });
}

function getOrderList(userUid,callbackFn) {
    modelUtil.getData("payOrder",userUid,callbackFn,"orderNo");
}

exports.addOrder = addOrder;
exports.updateOrder = updateOrder;
exports.getOrder = getOrder;
exports.getOrderList = getOrderList;
exports.getUnverifiedOrders = getUnverifiedOrders;
exports.updateOrderForKingNet = updateOrderForKingNet;
exports.getUnverifiedOrdersForAndroid = getUnverifiedOrdersForAndroid;