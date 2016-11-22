/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-4-16
 * Time: 下午7:17
 * To change this template use File | Settings | File Templates.
 */

var monopoly = require("../model/monopoly");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var teach = require("../model/teach");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var itemModel = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");
var stats = require("../model/stats");


exports.start = function(postData, response, query){
    //action: init/rollOne/rollTen/getList/buyDice
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("practice.monopoly", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var action = postData['action'];




    switch (action) {

        case "init":
            var force = postData["force"];
            if (force != undefined || force != null) {
                force = true;
            } else {
                force = false;
            }

            _init(userUid, force, function(err, res){
                if (err) {
                    response.echo("practice.monopoly",  jutil.errorInfo(err));
                } else {
                    response.echo("practice.monopoly", res);
                }
            });
            break;

        case "rollOne":
            _rollOnce(userUid, function(err, res){
                if (err) {
                    response.echo("practice.monopoly",  jutil.errorInfo(err));
                } else {
                    response.echo("practice.monopoly", res);
                    vitality.vitality(userUid, "zillionaire", {"completeCnt":1}, function(){});
                }
            });
            break;

        case "getList":
            _getDRWList(userUid, function(err, res){
                if (err) {
                    response.echo("practice.monopoly",  jutil.errorInfo(err));
                } else {
                    response.echo("practice.monopoly", res);
                }
            });
            break;

        case "buyDice":

            var count = postData["count"];
            if (count == null || count == undefined || count < 0) {
                response.echo("practice.monopoly", jutil.errorInfo("postError"));
                return;
            }
            count = parseInt(count);
            if (isNaN(count)) {
                response.echo("practice.monopoly", jutil.errorInfo("postError"));
                return;
            }

            __buyDice(userUid, count, function(err, res){
                if (err) {
                    response.echo("practice.monopoly",  jutil.errorInfo(err));
                } else {
                    response.echo("practice.monopoly", res);
                }
            });
            break;

        default :
            response.echo("practice.monopoly",  jutil.errorInfo("postError"));
            return false;
    }
};

/**
 * 生成新的配置表
 * @param userUid
 * @param force
 * @param callbackFn
 * @private
 */
function _refreshItemList(userUid, force, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var monopolyConfig = configData.getConfig("zillionaire");

    var savedMonopolyData = null;
    var curScore = 0;

    async.series([

        // 检查玩家是否存在
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err || res == null) {
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },

        // 获取保存的数据
        function(cb) {
            monopoly.__getSavedMonopolyData(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        savedMonopolyData = res;
                        res["wukongIndex"] = 0;
                        res["reset"] = false;
                    }

                    cb(null)
                }
            });
        },

        // 获取玩家当前分数
        function(cb) {
            monopoly.__getScore(userUid, function(err, res){
                if (err) cb(err);
                else {
                    curScore = res;
                    cb(null);
                }
            });
        },

        // 生成新的配置表
        function(cb) {
            monopoly.__buildItemMap(userUid, monopolyConfig, curScore, function(err, res){
                if (err) cb(err);
                else {

                    if (savedMonopolyData && force == true) {

                        // 复制数据
                        for (var key in savedMonopolyData) {
                            if (key == "lastSpecial" || key == "itemList") {
                                continue;
                            }

                            res[key] = savedMonopolyData[key];
                        }
                    }

                    res["wukongIndex"] = 0;
                    savedMonopolyData = res;

                    cb(null);
                }
            });
        },

        // 保存新的数据
        function(cb) {
            monopoly.__saveMonopolyData(userUid, savedMonopolyData, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }

    ], function(err){
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, savedMonopolyData);
        }
    });
}


/**
 * 初始化
 * @param userUid
 * @param force
 * @param callbackFn
 * @private
 */
function _init(userUid, force, callbackFn) {

    var configData = configManager.createConfig(userUid);
    var monopolyConfig = configData.getConfig("zillionaire");

    var gRes = {};
    var fRebuildMap;// = force;
    var savedMonopolyData;

    async.series([
        // 检查每日奖励
        function(cb) {
            monopoly.__newDayTest(userUid, monopolyConfig, function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        gRes["diceInfo"] = res;
                        fRebuildMap = true;
                    } else {
                        fRebuildMap = false;
                    }
                    cb(null);
                }
            });
        },

        // 构建列表
        function(cb) {
            monopoly.__getSavedMonopolyData(userUid, function(err, res){
                if (err) cb(err);
                else{
                    savedMonopolyData = res;
                    cb(null);
                }
            })
        },
        function(cb) {
            if(fRebuildMap || savedMonopolyData == null || (savedMonopolyData["reset"] != undefined && savedMonopolyData["reset"])){
                _refreshItemList(userUid, false, function(err, res){
                    if (err) cb(err);
                    else {
                        gRes["itemList"] = res["itemList"];
                        gRes["curIndex"] = res["wukongIndex"] || 0;
                        cb(null);
                    }
                });
            } else {
                gRes["itemList"] = savedMonopolyData["itemList"];
                gRes["curIndex"] = savedMonopolyData["wukongIndex"] || 0;
                cb(null);
            }
        }

    ], function(err){
        if (err) {
            console.error(err);
            callbackFn(err);
        } else {
            callbackFn(null, gRes);
        }
    });

}


/**
 * ROLL一次
 * @param userUid
 * @param callbackFn
 * @private
 */
function _rollOnce(userUid, callbackFn) {

    var configData = configManager.createConfig(userUid);
    var monopolyConfig = configData.getConfig("zillionaire");

    if (!monopolyConfig) {
        callbackFn("configError");
        return;
    }

    var savedMonopolyData = null;   // 保存的大富翁数据
    var gRes = {
        "updateList" : []
    };                              // 资源
    var userData = null;            // 玩家数据
    var diceNum = 0;                // 筋斗云数量
    var curIndex = 0;               // 当前悟空位置
    var nextIndex = -1;             // 移动后新的位置
    var rollVal = 1;                // 骰子的值
    var diceToAdd = 0;

    async.series([

        // 检查玩家是否存在
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err || res == null) {
                    cb("dbError");
                } else {
                    userData = res;
                    cb(null);
                }
            });
        },

        // 获取大富翁数据
        function(cb) {
            monopoly.__getSavedMonopolyData(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        savedMonopolyData = res;
                    }

                    cb(null)
                }
            });
        },

        // 检查数据
        function(cb) {
            if (savedMonopolyData != null) {
                if (savedMonopolyData.hasOwnProperty("itemList")) {
                    var itemList = savedMonopolyData["itemList"];
                    if (itemList instanceof Array) {
                        if (itemList.length == 20) {
                            cb(null);
                            return;
                        }
                    }
                }
            }

            // 数据有误，重新生成数据
            cb("reset");
        },

        // 刷新检测
        function(cb) {
            monopoly.__newDayTest(userUid, monopolyConfig, function(err, res){
                if (err) cb(err);
                else cb(null);
            });
        },

        // 检查玩家筋斗云是否足够
        function(cb) {
            monopoly.__getDice(userUid, function(err, count){
                if (err) cb(err);
                else {
                    diceNum = count;
                    if (diceNum >= 1) {
                        cb(null);
                    } else {
                        cb("noDice");
                    }
                }
            });
        },

        // 计算要移动的步数
        function(cb) {
            var step = monopoly.__getNextStepCount(monopolyConfig);
            var curWukongIndex = 0;
            if (savedMonopolyData.hasOwnProperty("wukongIndex")) {
                curWukongIndex = savedMonopolyData["wukongIndex"];
            }

            curIndex = curWukongIndex;

            var nextStep = curWukongIndex + step;

            rollVal = step;

            if (nextStep > 19) {
                if ((curWukongIndex != 19)
                    && (savedMonopolyData["lastSpecial"] === true)) {
                    nextStep = 19;
                    rollVal = 19 - curWukongIndex;
                } else {
                    savedMonopolyData["reset"] = true;
                    nextStep = 0;
                    //rollVal = 20 - curWukongIndex;
                }
            }

            nextIndex = nextStep;
            cb(null);
        },

        // 发放奖励
        function(cb) {
            var item = savedMonopolyData["itemList"][nextIndex];
            var itemId = item["itemId"];
            var itemCount = item["count"];

            var ratio = 1;
            if (savedMonopolyData.hasOwnProperty("ratio")) {
                ratio = savedMonopolyData["ratio"];
                if (isNaN(ratio)) ratio = 1;

                // 重置倍数
                savedMonopolyData["ratio"] = 1;
            }

            itemCount *= ratio;

            gRes["itemGet"] = {"itemId":itemId, "count":itemCount};

            if (itemId == "dice") {
                // 保存筋斗云获取数量
                diceToAdd = itemCount;
                cb(null);
            } else if (itemId == "ratio") {
                // 设置下次获取倍率
                savedMonopolyData["ratio"] = itemCount;
                monopoly.__saveMonopolyData(userUid, savedMonopolyData, function(err, res){
                    if (err) {
                        console.error(err);
                        cb(err);
                    } else {
                        cb(null);
                    }
                });
            } else {
                // 发放道具
                monopoly.__rwHandler(userData, itemId, itemCount, item["level"] || 1, function(err, res){
                    if (err) cb(err);
                    else {
                        gRes.updateList.push(res);
                        cb(null);
                    }
                });
            }
        },

        // 扣除玩家道具
        function(cb) {

            // 扣除筋斗云
            var diceCost = monopolyConfig["cloudCost"];

            monopoly.__updateDice(userUid, diceToAdd - diceCost, function(err, res){
                if (err) {
                    console.error(err);
                    cb(null);
                } else {
                    // 筋斗云数据
                    gRes.updateList.push(res);
                    mongoStats.dropStats("152501", userUid, '127.0.0.1', null, mongoStats.MONOPOLY, diceCost);
                    // 加分
                    var ingotAdd = monopolyConfig["lastCell"]["pointAdd"]["useCloud"];
                    monopoly.__incScore(userUid,ingotAdd,function(){
                        cb(null);
                    });
                }
            });
        },

        // 保存大富翁数据
        function(cb) {
            if (nextIndex != 0) {
                savedMonopolyData["itemList"][nextIndex] = null;
                savedMonopolyData["wukongIndex"] = nextIndex;
            } else {
                savedMonopolyData = null;
            }

            monopoly.__saveMonopolyData(userUid, savedMonopolyData, function(err, res){
                if (err) {
                    console.error(err);
                }
                cb(null);
            });
        }

    ], function(err){
        if (err) {
            if (err == "reset") {
                callbackFn(null, {
                    "reset" : true
                });
            } else {
                callbackFn(err, null);
            }
        } else {
            gRes["curIndex"] = curIndex;
            gRes["nextIndex"] = nextIndex;
            gRes["rollVal"] = rollVal;

            callbackFn(null, gRes);
        }
    });
}


/**
 * 获取每日奖励列表
 * @param userUid
 * @param callbackFn
 * @private
 */
function _getDRWList(userUid, callbackFn) {
    monopoly.__getDailyRewardList(userUid, callbackFn);
}


/**
 * 购买筋斗云
 * @param userUid
 * @param buyCount
 * @param callbackFn
 * @private
 */
function __buyDice(userUid, buyCount, callbackFn){

    var configData = configManager.createConfig(userUid);
    var monopolyConfig = configData.getConfig("zillionaire");

    if (!monopolyConfig) {
        callbackFn("configError");
        return;
    }

    var userData = null;    // 玩家数据
    var ingotNeed = 0;
    var newIngotData = null;
    var gRes = {};

    async.series([

        // 检查玩家是否存在
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err || res == null) {
                    cb("dbError");
                } else {
                    userData = res;
                    cb(null);
                }
            });
        },

        // 检查玩家伊美加币是否足够
        function(cb) {
            var ingotHave = userData["ingot"];
            ingotNeed = buyCount * monopolyConfig["imeggaCost"];
            if (ingotHave >= ingotNeed) {
                cb(null);
            } else {
                cb("noRMB");
            }
        },

        // 添加道具
        function (cb) {
            monopoly.__updateDice(userUid, buyCount, function(err, res){
                if (err) cb(err);
                else {
                    // 新的筋斗云数据
                    mongoStats.dropStats("152501", userUid, '127.0.0.1', null, mongoStats.MONOPOLY_BUY, buyCount);
                    stats.dropStats("152501",userUid,"127.0.0.1",null,mongoStats.monopoly_count,buyCount);
                    gRes["itemInfo"] = res;
                    cb(null);
                }
            });
        },

        // 扣除玩家伊美加币
        function(cb) {
            newIngotData = {"ingot":userData["ingot"] * 1 - ingotNeed * 1};
            user.updateUser(userUid, newIngotData, function(err, res) {
                if (err) {
                    console.error(userUid, newIngotData,  err.stack);
                } else {
                    // 记录元宝消费
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_MONOPOLY,ingotNeed);
                }
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            callbackFn(err);
        } else {
            // 新元宝数据
            gRes["ingotInfo"] = newIngotData;
            callbackFn(null, gRes);
        }
    });
}