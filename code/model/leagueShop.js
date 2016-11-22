/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-4-28
 * Time: 下午4:57
 * To change this template use File | Settings | File Templates.
 */

/******************************************************************************
 *  限时商城
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var league = require("../model/league");

/******************************************************************************
 * HELPERS
 */

var LEAGUE_SHOP_FRESH_CD_KEY = "leagueShop_CD";
var LEAGUE_SHOP_FRESH_POINT_KEY = "leagueShop_PNT";
var LEAGUE_SHOP_GOODS_KEY = "leagueShop_Goods";
var LEAGUE_SHOP_GOODS_BUY_KEY = "leagueShop_Buy";

/**
 * 获取活动配置数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getActivityConfig(userUid, callbackFn) {
    var config = configManager.createConfig(userUid);
    var mallConfig = config.getConfig("leagueShop");
    if (!mallConfig) {
        callbackFn("configError");
        return;
    }

    callbackFn(null, mallConfig);
}

/**
 * 更新刷新数据
 * @param userUid
 * @param mallConfig
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateFreshCD(userUid, mallConfig, numDelta, callbackFn) {
    var MIN_FRESH_NUM = 0;
    var MAX_FRESH_NUM = mallConfig["freshTime"];

    __getFreshCD(userUid, function(err, res){
        if (err) callbackFn(err);
        else {
            var freshNum = 0;
            var time = 0;

            if (res) {
                freshNum = res["freshNum"];
                time = res["freshTime"];
            }

            freshNum += numDelta;
            freshNum = Math.min(freshNum, MAX_FRESH_NUM);
            freshNum = Math.max(freshNum, MIN_FRESH_NUM);

            time = jutil.now() + mallConfig["freshCd"];

            userVariable.setVariableTime(userUid, LEAGUE_SHOP_FRESH_CD_KEY, freshNum, time, function(err, res){
                if (err) callbackFn(err);
                else {
                    callbackFn(null, {
                        "freshNum" : freshNum,
                        "freshTime" : time
                    });
                }
            });
        }
    });
}

/**
 * 获取刷新数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getFreshCD(userUid, callbackFn) {
    userVariable.getVariableTime(userUid, LEAGUE_SHOP_FRESH_CD_KEY, function(err, res){
        if (err) callbackFn(err);
        else {
            var freshNum = 0;
            var time = 0;

            if (res) {
                freshNum = parseInt(res["value"]);
                time = parseInt(res["time"]);
            }

            callbackFn(null, {
                "freshNum" : freshNum,
                "freshTime" : time
            });
        }
    });
}

/**
 * 重置CD数据
 * @param userUid
 * @param mallConfig
 * @param callbackFn
 * @private
 */
function __cleanFreshCD(userUid, mallConfig, callbackFn) {
    var freshNum = 0;
    var time = jutil.now() + mallConfig["freshCd"];

    userVariable.setVariableTime(userUid, LEAGUE_SHOP_FRESH_CD_KEY, freshNum, time, function(err, res){
        if (err) callbackFn(err);
        else {
            callbackFn(null, {
                "freshNum" : freshNum,
                "freshTime" : time
            });
        }
    });
}

/**
 * 更新刷新点
 * @param userUid
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateFreshPoint(userUid, numDelta, callbackFn) {
    __getFreshPoint(userUid, function(err, freshPoint){
        if (err) callbackFn(err);
        else {
            if (isNaN(numDelta)) numDelta = 0;

            freshPoint += numDelta;

            freshPoint = Math.max(0, freshPoint);

            userVariable.setVariableTime(userUid, LEAGUE_SHOP_FRESH_POINT_KEY, freshPoint, jutil.now(), function(err, res){
                if (err) callbackFn(err);
                else {
                    callbackFn(null, freshPoint);
                }
            });
        }
    });
}

/**
 * 获取刷新点
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getFreshPoint(userUid, callbackFn) {
    userVariable.getVariableTime(userUid, LEAGUE_SHOP_FRESH_POINT_KEY, function(err, res){
        if (err) callbackFn(err);
        else {
            var freshPoint = 0;
            if (res) {
                freshPoint = parseInt(res["value"]);
            }
            callbackFn(null, freshPoint);
        }
    });
}

/**
 * 获取商品列表
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getGoodsList(userUid, callbackFn) {
    redis.user(userUid).s(LEAGUE_SHOP_GOODS_KEY).getObj(function(err, res){
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 重构商品列表
 * @param userUid
 * @param mallConfig
 * @param callbackFn
 * @private
 */
function __buildGoodList(userUid, mallConfig, callbackFn) {
    var maxListSize = mallConfig["countPerPage"];  // 列表最大大小

    var curFreshPoint = 0;
    var srcGoodsList = [];  // 经过刷新点筛选后的商品列表，用来产生最终商品列表
    var dstGoodsList = [];  // 最终商品列表

    var leagueUid;
    var leagueLevel;
    async.series([
        // 获取玩家刷新点
        function(cb) {
            __getFreshPoint(userUid, function(err, freshPoint){
                if (err) cb(err);
                else {
                    curFreshPoint = freshPoint;
                    cb(null);
                }
            });
        },
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    leagueUid = res["leagueUid"];
                    cb(null);
                }
            });
        },
        function(cb){
            league.getLeague(userUid,leagueUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                }else{
                    leagueLevel = league.leagueExpToLevel(userUid,res["exp"]) - 0;
                    cb(null);
                }
            });
        },
        // 筛选商品
        function(cb) {
            var originGoodsList = mallConfig["goods"];
            var goodIdx = 0;
            for (var key in originGoodsList) {
                var goodItem = originGoodsList[key];
                if (goodItem.hasOwnProperty("needPoint")) {
                    var needPoint = goodItem["needPoint"] - 0;
                    var needLevel = goodItem["leagueLevelLimit"] - 0;
                    if ((curFreshPoint >= needPoint || needPoint == 0) && leagueLevel >= needLevel) {
                        goodItem["__goodIdx"] = goodIdx;
                        srcGoodsList.push(goodItem);
                    }
                }

                goodIdx++;
            }
            cb(null);
        },
        // 生成列表
        function (cb) {
            var idMap = {};
            while ((maxListSize > 0) && (srcGoodsList.length > 0)) {
                var rdIndex = Math.floor(Math.random() * srcGoodsList.length);
                var good = srcGoodsList[rdIndex];
                if (!idMap.hasOwnProperty(good["itemId"])) {
                    idMap[good["itemId"]] = true;
                    dstGoodsList.push(good);
                    --maxListSize;
                }

                srcGoodsList.splice(rdIndex, 1);
            }
            cb(null);
        },
        // 保存列表
        function (cb) {
            redis.user(userUid).s(LEAGUE_SHOP_GOODS_KEY).setObj(dstGoodsList, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, dstGoodsList);
        }
    });
}

/**
 * 获取商品购买数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getGoodsBuyInfo(userUid, callbackFn){
    redis.user(userUid).s(LEAGUE_SHOP_GOODS_BUY_KEY).getObj(function(err, res){
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 清空商品购买数据
 * @param userUid
 * @param callback
 * @private
 */
function __cleanGoodsBuyInfo(userUid, callback) {
    redis.user(userUid).s(LEAGUE_SHOP_GOODS_BUY_KEY).setObj({}, function(err, res){
        if (err) callback(err);
        else {
            callback(null);
        }
    });
}

/**
 * 更新商品购买数据
 * @param userUid
 * @param originIdx
 * @param callback
 * @private
 */
function __updateGoodByInfo(userUid, originIdx, callback) {
    __getGoodsBuyInfo(userUid, function(err, buyInfo){
        if (err) callback(err);
        else {
            buyInfo = buyInfo || {};

            buyInfo[originIdx] = true;

            redis.user(userUid).s(LEAGUE_SHOP_GOODS_BUY_KEY).setObj(buyInfo, function(err, res){
                if (err) callback(err);
                else {
                    callback(null, buyInfo);
                }
            });
        }
    });
}

/**
 * 检索商品信息
 * @param userUid
 * @param goodIdx
 * @param callbackFn
 * @private
 */
function __getGoodInfo(userUid, goodIdx, callbackFn) {

    var goodInfo = null;

    async.series([
        // 获取商品数据
        function(cb) {
            __getGoodsList(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res == null) {
                        // 商品数据丢失，重置
                        cb("reset");
                    } else {
                        for (var key in res) {
                            var good = res[key];
                            if (good["__goodIdx"] == goodIdx) {
                                goodInfo = good;
                                break;
                            }
                        }

                        if (goodInfo == null) {
                            // 要兑换的商品不在当前兑换页
                            cb("goodInvalid");
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        },
        // 获取购买数据
        function(cb) {
            __getGoodsBuyInfo(userUid, function(err, res){
                if (err) cb(err);
                else {
                    res = res || {};

                    if (res.hasOwnProperty(goodIdx) &&
                        (res[goodIdx] == true)) {
                        // 商品已经购买过了
                        goodInfo["canBuy"] = false;
                    } else {
                        goodInfo["canBuy"] = true;
                    }

                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, goodInfo);
        }
    });
}

/**
 * 更新伊美加币数量
 * @param userData
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateIngotNum(userData, numDelta, callbackFn){
    var userUid = userData["userUid"];
    var newIngotData = {"ingot":Math.max(userData["ingot"] * 1 + numDelta * 1, 0)};

    user.updateUser(userUid, newIngotData, function(err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, newIngotData);
        }
    });
}

/**
 * 更新玩家金币数量
 * @param userData
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateGoldNum(userData, numDelta, callbackFn){
    var userUid = userData["userUid"];
    var newGoldData = {"gold":Math.max(userData["gold"] * 1 + numDelta * 1, 0)};

    user.updateUser(userUid, newGoldData, function(err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, newGoldData);
        }
    });
}

/**
 * 更新玩家的联盟贡献
 * @param userData
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateLeagueContribution(userData, numDelta, callbackFn){
    var userUid = userData["userUid"];

    var newUserData = {"leagueContribution":Math.max(userData["leagueContribution"] * 1 + numDelta * 1, 0)};
    user.updateUser(userUid,newUserData,function(err,res){
        if(err){
            callbackFn(err);
        } else{
            callbackFn(null, newUserData);
        }
    });
}


exports.updateFreshCD = __updateFreshCD;
exports.getFreshCD = __getFreshCD;
exports.updateFreshPoint = __updateFreshPoint;
exports.getFreshPoint = __getFreshPoint;
exports.getGoodsList = __getGoodsList;
exports.buildGoodList = __buildGoodList;
exports.getGoodsBuyInfo = __getGoodsBuyInfo;
exports.cleanGoodsBuyInfo = __cleanGoodsBuyInfo;
exports.updateGoodByInfo = __updateGoodByInfo;
exports.updateIngotNum = __updateIngotNum;
exports.updateGoldNum = __updateGoldNum;
exports.updateLeagueContribution = __updateLeagueContribution;
exports.getGoodInfo = __getGoodInfo;
exports.cleanFreshCD = __cleanFreshCD;
exports.getActivityConfig = __getActivityConfig;
