/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
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
var itemModel = require("../model/item");
var activityConfig = require("../model/activityConfig");
var pvptop = require("../model/pvptop");

/******************************************************************************
 * HELPERS
 */

var TIME_LIMIT_MALL = "timeLimitShop";

var FRESH_CD_KEY = "timeLimitMall_CD";
var FRESH_POINT_KEY = "timeLimitMall_PNT";
var GOODS_KEY = "timeLimitMall_Goods";
var GOODS_BUY_KEY = "timeLimitMall_Buy";

/**
 * 限时商城是否打开
 * @param userUid
 * @param callbackFn
 * @private
 */
function __isActivityOpen(userUid, callbackFn) {
    activityConfig.getConfig(userUid, TIME_LIMIT_MALL, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null) callbackFn("configError");
        else {
            var activityConfigData = res;
            var isOpen = activityConfigData[0];
            if (isOpen !== true) {
                callbackFn(null, false, activityConfigData);
            } else {
                callbackFn(null, true, activityConfigData);
            }
        }
    });
}

/**
 * 获取活动配置数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getActivityConfig(userUid, callbackFn) {
    var config = configManager.createConfig(userUid);
    var mallConfig = config.getConfig("timeLimitShop");
    if (!mallConfig) {
        callbackFn("configError");
        return;
    }

    var activityConfigData = null;
    var curActivityConfigData = null;

    async.series([

        // 檢查活動是否開啟,只有在不开启时才进行后面动作
        function(cb) {
            __isActivityOpen(userUid, function(err, isOpen, activityCfgData){
                if (err) cb(err);
                else {
                    if (isOpen) {
                        activityConfigData = activityCfgData;
                        cb(null);
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },

        // 获取活动配置数据
        function(cb) {
            var activityArg = parseInt(activityConfigData[1]);
            if (isNaN(activityArg)) activityArg = 0;
            if (activityArg == -1) {
                // 取数据库配置，如果配置不存在取默认配置
                curActivityConfigData = activityConfigData[2] || mallConfig;
            } else {
                // 取指定配置，如果配置不存在取默认配置
                curActivityConfigData = mallConfig;
            }

            if (!curActivityConfigData) {
                cb("configError");
            } else {
                cb(null);
            }
        }], function(err){

        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, curActivityConfigData);
        }
    });
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

            userVariable.setVariableTime(userUid, FRESH_CD_KEY, freshNum, time, function(err, res){
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
    userVariable.getVariableTime(userUid, FRESH_CD_KEY, function(err, res){
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

    userVariable.setVariableTime(userUid, FRESH_CD_KEY, freshNum, time, function(err, res){
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

            userVariable.setVariableTime(userUid, FRESH_POINT_KEY, freshPoint, jutil.now(), function(err, res){
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
 * @param userUida
 * @param callbackFn
 * @private
 */
function __getFreshPoint(userUid, callbackFn) {
    userVariable.getVariableTime(userUid, FRESH_POINT_KEY, function(err, res){
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
    redis.user(userUid).s(GOODS_KEY).getObj(function(err, res){
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
        // 筛选商品
        function(cb) {
            var originGoodsList = mallConfig["goods"];
            var goodIdx = 0;
            for (var key in originGoodsList) {
                var goodItem = originGoodsList[key];
                if (goodItem.hasOwnProperty("needPoint")) {
                    var needPoint = goodItem["needPoint"];
                    if (curFreshPoint >= needPoint || needPoint == 0) {
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
            redis.user(userUid).s(GOODS_KEY).setObjex(345600, dstGoodsList, function(err, res){
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
    redis.user(userUid).s(GOODS_BUY_KEY).getObj(function(err, res){
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
    redis.user(userUid).s(GOODS_BUY_KEY).del(callback);
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

            redis.user(userUid).s(GOODS_BUY_KEY).setObjex(345600, buyInfo, function(err, res){
                if (err) callback(err);
                else {
                    callback(null, buyInfo);
                }
            });
        }
    });
}

/**
 * 获取礼券数量
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getTicketNum(userUid, callbackFn) {
    itemModel.getItem(userUid, "152601", function(err, res) {
        if (err) callbackFn(err);
        else {
            var count = 0;
            if (res) {
                count = res["number"];
            }
            callbackFn(null, count);
        }
    });
}

/**
 * 更新礼券数量
 * @param userUid
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateTicketNum(userUid, numDelta, callbackFn) {
    itemModel.updateItem(userUid, "152601", numDelta, function(err, res) {
        if (err) {
            callbackFn(err);
        }
        callbackFn(null, res);
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
 * 获取玩家PVP点
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getPvPPoint(userUid, callbackFn) {

    pvptop.getCurrentPoint(userUid,function(err,res){
        if (err) callbackFn(err);
        else{
            var point = 0;
            if (res) {
                point = parseInt(res["value"]);
            }
            callbackFn(null, point);
        }
    });
}

/**
 * 更新玩家PVP点
 * @param userUid
 * @param pointDelta
 * @param callbackFn
 * @private
 */
function __updatePvPPoint(userUid, pointDelta, callbackFn) {
    __getPvPPoint(userUid, function(err, point){

//   userVariable.getVariableTime(userUid, "redeemPoint", function(err, res) {
        if (err) callbackFn(err);
//        else if (res == null) {
//            callbackFn("dbError");
        else {
//            var point = point;//res["value"];
//            var pointTime = res["time"];
            point = Math.max(0, point + pointDelta);

            userVariable.setVariableTime(userUid, "redeemPoint", point, jutil.now(), function(err, res){
                if (err) callbackFn(err);
                else {
                    callbackFn(null, point);
                }
            });
        }
    });
}

/**
 * 获取特卖卡数量
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getFreshCardNum(userUid, callbackFn) {
    itemModel.getItem(userUid, "152701", function(err, res) {
        if (err) callbackFn(err);
        else {
            var count = 0;
            if (res) {
                count = res["number"];
            }
            callbackFn(null, count);
        }
    });
}

/**
 * 更新特卖卡数量
 * @param userUid
 * @param numDelta
 * @param callbackFn
 * @private
 */
function __updateFreshCardNum(userUid, numDelta, callbackFn) {
    itemModel.updateItem(userUid, "152701", numDelta, function(err, res) {
        if (err) {
            callbackFn(err);
        }
        callbackFn(null, res);
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
exports.getTicketNum = __getTicketNum;
exports.updateTicketNum = __updateTicketNum;
exports.getGoodInfo = __getGoodInfo;
exports.updateIngotNum = __updateIngotNum;
exports.updateGoldNum = __updateGoldNum;
exports.cleanFreshCD = __cleanFreshCD;
exports.getPvPPoint = __getPvPPoint;
exports.updatePvPPoint = __updatePvPPoint;
exports.isActivityOpen = __isActivityOpen;
exports.getActivityConfig = __getActivityConfig;
exports.getFreshCardNum = __getFreshCardNum;
exports.updateFreshCardNum = __updateFreshCardNum;