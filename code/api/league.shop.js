/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-4-28
 * Time: 下午6:04
 * To change this template use File | Settings | File Templates.
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var leagueShop = require("../model/leagueShop");
var league = require("../model/league");

exports.start = function(postData, response, query){
    //action: get/refresh/exchange/getpvppoint
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("league.shop", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var action = postData['action'];


    switch (action) {

        case "get":
            _get(userUid, function(err, res){
                if (err) {
                    response.echo("league.shop",  jutil.errorInfo(err));
                } else {
                    response.echo("league.shop",  res);
                }
            });
            break;

        case "refresh":
            var type = postData["type"];
            if (type == null || type == undefined) {
                response.echo("league.shop",  jutil.errorInfo("postError"));
                return;
            }

            _refresh(userUid, type, function(err, res){
                if (err) {
                    response.echo("league.shop",  jutil.errorInfo(err));
                } else {
                    response.echo("league.shop",  res);
                }
            });
            break;

        case "exchange":
            var goodIdx = postData["goodIdx"];
            if (goodIdx == null || goodIdx == undefined) {
                response.echo("league.shop",  jutil.errorInfo("postError"));
                return;
            }

            goodIdx = parseInt(goodIdx);
            if (isNaN(goodIdx)) {
                response.echo("league.shop",  jutil.errorInfo("postError"));
                return;
            }

            _exchange(userUid, goodIdx, function(err, res){
                if (err) {
                    response.echo("league.shop",  jutil.errorInfo(err));
                } else {
                    response.echo("league.shop",  res);
                }
            });
            break;

        default :
            response.echo("league.shop",  jutil.errorInfo("postError"));
            return false;
    }
};


///////////////////////////////////////////////////////////////////////////////
// HELPERS

/**
 * 获取商城数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function _get(userUid, callbackFn) {
    var mallConfig = null;
    var userInfo = null;
    var gRes = {};

    async.series([
        // 第二天检测
        function(cb) {
            __autoFreshTest(userUid, function(err){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },
        // 获取配置数据
        function(cb) {
            leagueShop.getActivityConfig(userUid, function(err, configData){
                if (err) cb(err);
                else {
                    mallConfig = configData;
                    cb(null);
                }
            });
        },
        // 获取USER数据
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        userInfo = res;
                        if(userInfo["leagueUid"] == "0"){
                            cb("hasNotJoinLeague");
                        }else{
                            cb(null);
                        }
                    }
                }
            });
        },
        // 获取CD数据
        function(cb) {
            leagueShop.getFreshCD(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res["freshTime"] == 0) {
                        // 没有CD数据，初始化
                        __sysInit(userUid, mallConfig, function(err, res){
                            if (err) cb(err);
                            else {
                                __copyProps(gRes, res);
                                cb(null);
                            }
                        });
                    } else {
                        gRes["freshCD"] = res;
                        cb(null);
                    }
                }
            });
        },
        // 获取列表数据
        function(cb) {

            if (gRes.hasOwnProperty("goodsList")) {
                cb(null);
                return;
            }

            leagueShop.getGoodsList(userUid, function(err, goodsList){
                if (err) cb(err);
                else {
                    if (goodsList == null) {
                        // 列表数据丢失，重构
                        __sysInit(userUid, mallConfig, function(err, res){
                            if (err) cb(err);
                            else {
                                __copyProps(gRes, res);
                                cb(null);
                            }
                        });
                    } else {
                        gRes["goodsList"] = goodsList;
                        cb(null);
                    }
                }
            });
        },
        // 获取购买数据
        function(cb) {

            if (gRes.hasOwnProperty("buyInfo")) {
                cb(null);
                return;
            }

            leagueShop.getGoodsBuyInfo(userUid, function(err, res){
                if (err) cb(err);
                else {
                    gRes["buyInfo"] = res;
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {

            // 刷新次数已达最大值，时间置0
            var cdInfo = gRes["freshCD"];
            if (cdInfo["freshNum"] >= mallConfig["freshTime"]) {
                cdInfo["freshNumIsMax"] = true;
                //cdInfo["freshTime"] = 0;
            }

            cdInfo["cdTime"] = mallConfig["freshCd"];
            cdInfo["maxFreshTime"] = mallConfig["freshTime"];
            cdInfo["freshCost"] = mallConfig["freshCost"];

            callbackFn(null, gRes);
        }
    });
}

/**
 * 兑换物品
 * @param userUid
 * @param goodIdx
 * @param callbackFn
 * @private
 */
function _exchange(userUid, goodIdx, callbackFn) {
    var mallConfig = null;
    var userInfo = null;
    var leagueContribution = 0;
    var gRes = {
        "updateList" : []
    };

    var goodInfo = null;
    var goodCost = 0;
    var haveMoney = 0;

    async.series([
        // 获取配置数据
        function(cb) {
            leagueShop.getActivityConfig(userUid, function(err, configData){
                if (err) cb(err);
                else {
                    mallConfig = configData;
                    cb(null);
                }
            });
        },
        // 获取USER数据
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        userInfo = res;
                        if(userInfo["leagueUid"] == "0"){
                            cb("hasNotJoinLeague");
                        }else{
                            cb(null);
                        }
                    }
                }
            });
        },
        // 检索商品数据
        function(cb) {
            leagueShop.getGoodInfo(userUid, goodIdx, function(err, res){
                if (err) cb(err);
                else {
                    goodInfo = res;
                    cb(null);
                }
            });
        },
        // 获取玩家的消费点
        function(cb) {
            if (goodInfo["canBuy"] == false) {
                cb("alreadyExchanged");
                return;
            }

            goodCost = goodInfo["cost"];

            switch (goodInfo["payType"]) {
                case "imegga":
                    haveMoney = userInfo["ingot"];
                    cb(null);
                    break;
                case "zeni":
                    haveMoney = userInfo["gold"];
                    cb(null);
                    break;
                case "leagueContribution":
                    haveMoney = userInfo["leagueContribution"];
                    cb(null);
                    break;
                default :
                    cb("configError");
                    return;
            }
        },
        // 判断玩家能否购买物品
        function(cb) {
            if (goodCost > haveMoney) {
                var err = "";
                switch (goodInfo["payType"]) {
                    case "imegga":
                        err = "noRMB";
                        break;
                    case "zeni":
                        err = "noMoney";
                        break;
                    case "leagueContribution":
                        err = "noLeagueContribution";
                        break;
                }
                cb(err);
            } else {
                cb(null);
            }
        },
        // 兑换道具
        function(cb) {
            var itemId = goodInfo["itemId"];
            var itemNum = goodInfo["count"];

            __rwHandler(userInfo, itemId, itemNum, 0, function(err, res){
                if (err) cb(err);
                else {
                    gRes.updateList.push(res);
                    cb(null);
                }
            });
        },
        // 扣除玩家消费点
        function(cb) {
            switch (goodInfo["payType"]) {
                case "imegga":
                    leagueShop.updateIngotNum(userInfo, -goodCost, function(err, res){
                        if (err) console.error(err);
                        else {
                            gRes.updateList.push(res);
                            mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_LEAGUE_SHOP,goodCost);
                        }
                        cb(null);
                    });
                    break;
                case "zeni":
                    leagueShop.updateGoldNum(userInfo, -goodCost, function(err, res){
                        if (err) console.error(err);
                        else {
                            gRes.updateList.push(res);
                        }
                        cb(null);
                    });
                    break;
                case "leagueContribution":
                    leagueShop.updateLeagueContribution(userInfo, -goodCost, function(err, res){
                        if (err) console.error(err);
                        else {
                            gRes.updateList.push(res);
                        }
                        cb(null);
                    });
                    break;
                default :
                    cb(null);
                    break;
            }
        },
        // 更新BUY信息
        function(cb) {
            leagueShop.updateGoodByInfo(userUid, goodIdx, function(err, res){
                if (err) console.error(err);
                else {
                    gRes["buyInfo"] = res;
                }
                cb(null);
            });
        },
        // 更新刷新点数据
        function(cb) {
            var pointToMinus = goodInfo["buyReducePoint"];
            if (pointToMinus > 0) {
                leagueShop.updateFreshPoint(userUid, -pointToMinus, function(err, res){
                    if (err) console.error(err);
                    else {
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        }
    ], function(err){
        if (err) {
            if (err == "reset") {
                callbackFn(null, {"reset":true});
            } else {
                callbackFn(err);
            }
        }
        else {
            // 计算带外数据
            __getOOB(userUid, mallConfig, function(err, res){
                if (err) {
                    if (err == "notOpen") {
                        gRes["OOBE"] = err;
                    }
                }
                else {
                    gRes["OOB"] = res;
                }

                callbackFn(null, gRes);
            });
        }
    });
}

/**
 * 刷新商品页
 * @param userUid
 * @param type
 * @param callbackFn
 * @private
 */
function _refresh(userUid, type, callbackFn){
    var mallConfig = null;
    var userInfo = null;
    var cdInfo = null;
    var freeFresh = false;
    var gRes = {};

    async.series([
        // 第二天检测
        function(cb) {
            __autoFreshTest(userUid, function(err){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },
        // 获取配置数据
        function(cb) {
            leagueShop.getActivityConfig(userUid, function(err, configData){
                if (err) cb(err);
                else {
                    mallConfig = configData;
                    cb(null);
                }
            });
        },
        // 获取USER数据
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        userInfo = res;
                        cb(null);
                    }
                }
            });
        },
        // 获取CD数据
        function(cb) {
            leagueShop.getFreshCD(userUid, function(err, res){
                if (err) cb(err);
                else {
                    cdInfo = res;
                    cb(null);
                }
            });
        },
        // 判断刷新次数
        function(cb) {
            var freshNum = cdInfo["freshNum"];
            var maxFreshNum = mallConfig["freshTime"];
            if (freshNum >= maxFreshNum) {
                cb("noFreshTime");
            } else {
                cb(null);
            }
        },
        // 刷新
        function(cb) {
            var freshTime = cdInfo["freshTime"];
            freeFresh = (jutil.now() >= freshTime);

            switch (type) {
                case "free":
                    // 请求免费刷新
                    if (freeFresh) {
                        __sysInit(userUid, mallConfig, function(err, res){
                            if (err) cb(err);
                            else {
                                __copyProps(gRes, res);
                                cb(null);
                            }
                        });
                    } else {
                        cb("noFreeFresh");
                    }
                    break;
                case "ingot":
                    // 伊美加币刷新
                    var userIngot = userInfo["ingot"];
                    var freshCost = mallConfig["freshCost"];

                    if (freshCost > userIngot) {
                        cb("noRMB");
                    } else {
                        __usrInit(userUid, mallConfig, function(err, res){
                            if (err) cb(err);
                            else {
                                __copyProps(gRes, res);
                                cb(null);
                            }
                        });
                    }
                    break;
                default :
                    cb("postError");
                    break;
            }
        },
        // 扣除消费
        function(cb) {
            switch (type) {
                case "ingot":
                    leagueShop.updateIngotNum(userInfo, -mallConfig["freshCost"], function(err, res){
                        if (err) cb(err);
                        else {
                            // 返回更新后的伊美加币数据
                            gRes["ingotInfo"] = res;
                            mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_LEAGUE_SHOP, mallConfig["freshCost"]);
                            cb(null);
                        }
                    });
                    break;
                default :
                    cb(null);
                    break;
            }
        },
        // 加刷新点
        function(cb) {
            var pointToAdd = 0;

            switch (type) {
                case "free":
                    pointToAdd = mallConfig["freeFreshAddPoint"];
                    break;
                case "ingot":
                    pointToAdd = mallConfig["payFreshAddPoint"];
                    break;
            }

            if (isNaN(pointToAdd)) {
                pointToAdd = parseInt(pointToAdd);
            }

            leagueShop.updateFreshPoint(userUid, pointToAdd, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            // 刷新次数已达最大值，时间置0
            var cdInfo = gRes["freshCD"];
            if (cdInfo["freshNum"] >= mallConfig["freshTime"]) {
                cdInfo["freshNumIsMax"] = true;
                //cdInfo["freshTime"] = 0;
            }
            cdInfo["cdTime"] = mallConfig["freshCd"];
            cdInfo["maxFreshTime"] = mallConfig["freshTime"];
            cdInfo["freshCost"] = mallConfig["freshCost"];

            callbackFn(null, gRes);
        }
    });
}


/**
 * 初始化商城
 * @param userUid
 * @param mallConfig
 * @param callbackFn
 * @private
 */
function __sysInit(userUid, mallConfig, callbackFn) {
    var gRes = {};

    async.series([
        // 重构列表
        function(cb) {
            leagueShop.buildGoodList(userUid, mallConfig, function(err, res){
                if (err) cb(err);
                else {
                    gRes["goodsList"] = res;
                    cb(null);
                }
            });
        },
        // 清空购买数据
        function(cb) {
            leagueShop.cleanGoodsBuyInfo(userUid, function(err, res){
                if (err) cb(err);
                else {
                    gRes["buyInfo"] = {};
                    cb(null);
                }
            });
        },
        // 更新CD
        function(cb) {
            leagueShop.updateFreshCD(userUid, mallConfig, 0, function(err, res){
                if (err) cb(err);
                else {
                    gRes["freshCD"] = res;
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, gRes);
        }
    });
}

/**
 * 用户初始化
 * @param userUid
 * @param mallConfig
 * @param callbackFn
 * @private
 */
function __usrInit(userUid, mallConfig, callbackFn) {
    var gRes = {};

    async.series([
        // 重构列表
        function(cb) {
            leagueShop.buildGoodList(userUid, mallConfig, function(err, res){
                if (err) cb(err);
                else {
                    gRes["goodsList"] = res;
                    cb(null);
                }
            });
        },
        // 清空购买数据
        function(cb) {
            leagueShop.cleanGoodsBuyInfo(userUid, function(err, res){
                if (err) cb(err);
                else {
                    gRes["buyInfo"] = {};
                    cb(null);
                }
            });
        },
        // 更新CD
        function(cb) {
            leagueShop.updateFreshCD(userUid, mallConfig, 1, function(err, res){
                if (err) cb(err);
                else {
                    gRes["freshCD"] = res;
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, gRes);
        }
    });
}

/**
 * 复制属性
 * @param dst
 * @param src
 * @private
 */
function __copyProps(dst, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            dst[key] = src[key];
        }
    }
}

/**
 * 给玩家发奖励
 * @param userData
 * @param id
 * @param count
 * @param level
 * @param callbackFn
 * @private
 */
function __rwHandler(userData, id, count, level, callbackFn) {
    var userUid = userData["userUid"];
    var gRes = [];

    mongoStats.dropStats(id, userUid, '127.0.0.1', null, mongoStats.LEAGUE_SHOP, count, level);

    async.series([

        // 发放物品
        function(cb) {

            var dropId = id + "";

            switch(dropId.substr(0,2)){
                case "11":// 技能，一个一个的加

                    var iCnt = 0;

                    async.until(function(){
                        return (iCnt >= count);
                    },function(ucb){
                        modelUtil.addDropItemToDB(id,1,userUid,0,level,function(err,res) {
                            iCnt++;

                            if (err) {
                                console.error(err);
                                ucb(null);
                            }
                            else {
                                gRes.push(res);
                                ucb(null);
                            }
                        });
                    }, function(err){
                        cb(null);
                    });
                    break;

                default:

                    modelUtil.addDropItemToDB(id,count,userUid,0,level,function(err,res) {
                        if (err) cb("dbError");
                        else {
                            gRes.push(res);
                            cb(null);
                        }
                    });
                    break;
            }
        }
    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null, gRes);
    });
}

/**
 * 自动刷新
 * @param userUid
 * @private
 */
function __autoFreshTest(userUid, callbackFn) {

    var mallConfig = null;
    var cdInfo = null;

    async.series([
        // 获取配置数据
        function(cb) {
            leagueShop.getActivityConfig(userUid, function(err, configData){
                if (err) cb(err);
                else {
                    mallConfig = configData;
                    cb(null);
                }
            });
        },
        // 获取CD数据
        function(cb) {
            leagueShop.getFreshCD(userUid, function(err, res){
                if (err) cb(err);
                else {
                    cdInfo = res;
                    cb(null);
                }
            });
        },
        // 判断是否刷新
        function(cb) {
            var freshTime = cdInfo["freshTime"] - mallConfig["freshCd"];
            if (!jutil.compTimeDay(jutil.now(), freshTime)) {
                // 第二天，刷新
                __sysInit(userUid, mallConfig, function(err, res){
                    if (err) cb(err);
                    else {
                        // 重置次数数据
                        leagueShop.cleanFreshCD(userUid, mallConfig, function(err, res){
                            if (err) cb(err);
                            else {
                                cb(null);
                            }
                        });
                    }
                });
            } else {
                cb(null);
            }
        }
    ], function(err){
        if (err) {
            if (err != "notOpen") console.error(err);
        }

        if (callbackFn) {
            callbackFn(err);
        }
    });
}

/**
 * 获取带外数据
 * @param userUid
 * @param mallConfig
 * @param callbackFn
 * @private
 */
function __getOOB(userUid, mallConfig, callbackFn) {

    var gRes = null;
    var cdInfo = null;

    async.series([
        // 获取CD数据
        function(cb) {
            leagueShop.getFreshCD(userUid, function(err, res){
                if (err) cb(err);
                else {
                    cdInfo = res;
                    cb(null);
                }
            });
        },
        // 计算是否需要刷新
        function(cb) {
            var freshTime = cdInfo["freshTime"] - mallConfig["freshCd"];
            if (!jutil.compTimeDay(jutil.now(), freshTime)) {
                // 第二天，刷新
                cb(null);
            } else {
                cb("noFresh");
            }
        },
        //刷新数据
        function(cb) {
            __sysInit(userUid, mallConfig, function(err, res){
                if (err) cb(err);
                else {
                    gRes = res;
                    cb(null);
                }
            })
        },
        // 清空CD
        function(cb) {
            leagueShop.cleanFreshCD(userUid, mallConfig, function(err, cdInfo){
                if (err) cb(err);
                else {
                    cdInfo["cdTime"] = mallConfig["freshCd"];
                    cdInfo["maxFreshTime"] = mallConfig["freshTime"];
                    cdInfo["freshCost"] = mallConfig["freshCost"];

                    gRes["freshCD"] = cdInfo;
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, gRes);
        }
    });
}
