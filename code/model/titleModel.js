/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-5-23
 * Time: 上午11:39
 * To change this template use File | Settings | File Templates.
 */

/******************************************************************************
 * 称号模块
 *****************************************************************************/

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var map = require("../model/map");
var friend = require("../model/friend");
var pvptop = require("../model/pvptop");

///////////////////////////////////////////////////////////////////////////////
// 数据库操作

var DB_ENABLE = true; // 是否进行数据库操作

// 对于等级没有意义的称号，设置其等级为该值
var NO_LEVEL_TITLE_LEVEL = 1;

var PATCH_TO_SKILL_KEY = "patchToSkill";
var BLOOD_BATTLE_COUNT_KEY = "bloodBattleCount";
var WORLD_BOOS_COUNT = "worldBossCount";
var COSMOS_BOOS_COUNT = "cosmosBossCount";

/**
 * 获取玩家已经获取的称号数据
 * @param userUid
 * @param callbackFn
 */
function getAllTitle(userUid, callbackFn) {
    redis.user(userUid).s("titleArr").getObj(function(err, res){
        //res = null;
        if (res == null) {
            var sql = "SELECT * FROM titleGet WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null || res.length == 0) {
                    if (err) console.error(sql, err.stack);
                    callbackFn(err, null);
                } else {
                    __titleCheck(userUid, res, function(err, titleArr){
                        if (err) callbackFn(err);
                        else {
                            callbackFn(null, titleArr);
                        }
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 获取玩家已经获取的指定的称号
 * @param userUid
 * @param titleId 称号ID
 * @param callbackFn
 */
function getTitle(userUid, titleId, callbackFn) {
    getAllTitle(userUid, function(err, res){
        if (err) callbackFn(err);
        else {
            if (res == null) {
                callbackFn(null, null);
            } else {

                var titleInfo = null;

                for (var key in res) {
                    if (res.hasOwnProperty(key)) {
                        var _titleInfo = res[key];
                        if (_titleInfo["titleId"] == titleId) {
                            titleInfo = _titleInfo;
                            break;
                        }
                    }
                }

                callbackFn(null, titleInfo);
            }
        }
    });
}

/**
 * 更新称号数据
 * @param userUid
 * @param titleId
 * @param level
 * @param time
 * @param callbackFn
 */
function updateTitle(userUid, titleId, level, time, callbackFn) {
    var sql = "UPDATE titleGet SET ? WHERE userUid = " + mysql.escape(userUid)
        + " AND titleId = " + mysql.escape(titleId);

    var newData = {};
    newData["titleLevel"] = level;
    newData["getTime"] = time;

    if (DB_ENABLE) {
        mysql.game(userUid).query(sql,newData,function(err,res){
            if (err) {
                callbackFn(err,null);
            } else {
                __calcExpiredTime(userUid, true);
                callbackFn(null,1);
            }
        });
    } else {
        __calcExpiredTime(userUid, true);
        callbackFn(null, 1);
    }
}

/**
 * 添加称号
 * @param userUid
 * @param titleId
 * @param level
 * @param time
 * @param callbackFn
 */
function addTitle(userUid, titleId, level, time, callbackFn) {
    getTitle(userUid, titleId, function(err, res){
        if (err) callbackFn(err);
        else {
            if (res) {
                callbackFn("alreadyHaveThisTitle");
            } else {

                var newData = {};

                async.series([
                    // 插入数据
                    function(cb) {
                        var sql = 'INSERT INTO titleGet SET ?';
                        newData["userUid"] = userUid;
                        newData["titleId"] = titleId;
                        newData["titleLevel"] = level;
                        newData["getTime"] = time;

                        if (DB_ENABLE) {
                            mysql.game(userUid).query(sql,newData,function(err,res) {
                                if (err) {
                                    cb(err);
                                } else {
                                    cb(null);
                                }
                            });
                        } else {
                            cb(null);
                        }
                    },
                    // 加入新获取数据
                    function(cb) {
                        __saveNewTitle(userUid, titleId, function(err, res){
                            cb(null);
                        });
                    }
                ], function(err){
                    if (err) {
                        callbackFn(err,null);
                    } else {
                        __calcExpiredTime(userUid, true);
                        callbackFn(null,newData);
                    }
                });
            }
        }
    });
}

/**
 * 清除缓存
 * @private
 */
function __cleanCache(userUid) {
    // 清空缓存
    redis.user(userUid).s("titleArr").del();
    redis.user(userUid).s("titleGetPoints").del();
}

/**
 * 重新计算过期时间
 * @param userUid
 * @private
 */
function __calcExpiredTime(userUid, cleanCache) {

    var titleArr = null;
    var titleCfg = null;

    if (!titleCfg) {
        var configData = configManager.createConfig(userUid);
        titleCfg = configData.getConfig("title");
    }

    async.series([
        // 清除缓存
        function(cb) {
            if (cleanCache) {
                redis.user(userUid).s("titleArr").del(function(err, res){
                    cb(null);
                });
            } else {
                cb(null);
            }
        },

        // 清除缓存
        function(cb) {
            if (cleanCache) {
                redis.user(userUid).s("titleGetPoints").del(function(err, res){
                    cb(null);
                });
            } else {
                cb(null);
            }
        },

        // 获取称号数据
        function(cb) {
            if (titleArr) {
                cb(null);
            } else {
                getAllTitle(userUid, function(err, res){
                    if (!err && res != null) {
                        titleArr = res;
                    }
                    cb(null);
                });
            }
        },

        // 计算称号加成
        function(cb) {
            getTitlesPoint(userUid, function(err, res){
                cb(null);
            });
        },

        // 设置过期时间
        function(cb) {
            if (titleArr) {
                // 获取最小过期时间
                var minExpiredTime = getMinExpiredTime(titleCfg, titleArr);

                if (minExpiredTime > 0) {

                    redis.user(userUid).s("titleArr").expire(minExpiredTime);
                    // 设定过期时间
                    redis.user(userUid).s("titleGetPoints").expire(minExpiredTime);
                }
            } else {
                cb(null);
            }
        }
    ], function(err){

    });


}

/**
 * 检查称号，删除过期的称号
 * @param userUid
 * @param originTitleArr
 * @param callbackFn
 * @private
 */
function __titleCheck(userUid, originTitleArr, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var titleArr = [];//现在拥有的称号数组
    var expiredTitleArr = [];//数据表中过期的称号数组

    // 分类称号(过期/未过期)
    for (var key in originTitleArr) {
        if (originTitleArr.hasOwnProperty(key)) {
            var titleInfo = originTitleArr[key];
            if (!isTitleExpired(titleCfg, titleInfo)) {
                titleArr.push(titleInfo);
            } else {
                expiredTitleArr.push(titleInfo);
            }
        }
    }

    // 删除过期的称号
    __deleteTitles(userUid, expiredTitleArr, function(err){
        if (err) {
            callbackFn(err);
        } else {
            // 缓存玩家当前拥有的称号
            redis.user(userUid).s("titleArr").setObj(titleArr, function (err, res) {
                callbackFn(null, titleArr);
            });
        }
    });
}

/**
 * 保存最小过期时间
 * @param userUid
 * @param time
 * @param callbackFn
 * @private
 */
function __saveMinExpiredTime(userUid, time, callbackFn) {
    redis.user(userUid).s("titleExpiredTime").setObj(time, function (err, res) {
        callbackFn(null, time);
    });
}

/**
 * 获取最小过期时间
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getMinExpiredTime(userUid, callbackFn) {
    redis.user(userUid).s("titleExpiredTime").getObj(function (err, res) {
        if (err || res == null) {
            callbackFn(null, -1);
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 保存旧的点
 * @param userUid
 * @param points
 * @param callbackFn
 * @private
 */
function __saveOldPoints(userUid, points, callbackFn) {
    redis.user(userUid).s("titleOldPoints").setObj(points, function (err, res) {
        callbackFn(null, points);
    });
}

/**
 * 新的点
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getOldPoints(userUid, callbackFn) {
    redis.user(userUid).s("titleOldPoints").getObj(function (err, res) {
        if (err || res == null) {
            callbackFn(null, 0);
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 从数据表中删除过期的称号
 * @param userUid
 * @param titleArr 需要删除的称号数组
 * @param callbackFn
 * @private
 */
function __deleteTitles(userUid, titleArr, callbackFn) {

    if (titleArr.length <= 0) {
        callbackFn(null, null);
        return;
    }

    var titleIdArr = [];
    for (var key in titleArr) {
        if (titleArr.hasOwnProperty(key)) {
            titleIdArr.push(
                titleArr[key]["titleId"]
            );
        }
    }

    var sql = "DELETE FROM titleGet WHERE userUid=? AND titleId IN(?)";

    if (DB_ENABLE) {
        mysql.game(userUid).query(sql,[userUid,titleIdArr],function(err,res) {
            callbackFn(err,res);
        });
    } else {
        callbackFn(null, null);
    }
}


/**
 * 删除指定称号
 * @param userUid
 * @param titleId
 * @param callbackFn
 * @private
 */
function __deleteTitle(userUid, titleId, callbackFn) {
    var sql = "DELETE FROM titleGet WHERE userUid=? AND titleId IN(?)";

    if (DB_ENABLE) {
        mysql.game(userUid).query(sql,[userUid,[titleId]],function(err,res) {
            callbackFn(err,res);
        });
    } else {
        callbackFn(null, null);
    }
}


/**
 * 在META表中更新统计数据
 * @param userUid
 * @param name
 * @param callbackFn
 * @private
 */
function __updateTitleMeta(userUid, name, callbackFn) {
    var titleMeta = null;
    var rtnNum = 0;

    async.series([
        // 获取旧数据
        function(cb) {
            var sql = "SELECT * FROM titleMeta WHERE userUid = " + mysql.escape(userUid)
                + " and name = " + mysql.escape(name);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) cb(err);
                else {
                    if (res && res.length > 0) {
                        titleMeta = res[0];
                    }
                    cb(null);
                }
            });
        },
        // 更新数据
        function(cb) {
            var num = 1;
            var sql = "";
            var newData = {};

            if (titleMeta) {
                num = titleMeta["num"] + 1;
                sql = "UPDATE titleMeta SET ? WHERE userUid = " + mysql.escape(userUid)
                    + " AND name = " + mysql.escape(name);
                newData["num"] = num;
                newData["getTime"] = jutil.now();
            } else {
                sql = 'INSERT INTO titleMeta SET ?';
                newData["userUid"] = userUid;
                newData["name"] = name;
                newData["num"] = num;
                newData["getTime"] = jutil.now();
            }

            rtnNum = num;

            if (DB_ENABLE) {
                mysql.game(userUid).query(sql, newData, function (err, res) {
                    if (err) cb(err);
                    else {
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, rtnNum);
        }
    });
}

/**
 * 玩家新获取的称号数据
 * @param userUid
 * @param titleId
 * @param callbackFn
 * @private
 */
function __saveNewTitle(userUid, titleId, callbackFn) {
    var newTitleArr = null;
    redis.user(userUid).s("newTitleGet").getObj(function(err, res){
        if (err || res == null) {
            newTitleArr = [];
        } else {
            newTitleArr = res;
        }

        newTitleArr.push(titleId);

        redis.user(userUid).s("newTitleGet").setObj(newTitleArr, function (err, res) {
            callbackFn(null, newTitleArr);
        });
    });
}

/**
 * 获取玩家新获取的称号
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getNewTitle(userUid, callbackFn) {
    redis.user(userUid).s("newTitleGet").getObj(function(err, res){
        if (err || res == null) {
            callbackFn(null, null);
        } else {

            var newTitleArr = [];
            async.forEach(res, function(id, forCb){
                getTitle(userUid, id, function(err, res){
                    if (!err && res) {
                        newTitleArr.push(res);
                    }
                    forCb(null);
                });
            }, function(err){
                callbackFn(null, newTitleArr);
            });
        }

        redis.user(userUid).s("newTitleGet").del();
    });
}

/**
 * 保存升级的称号
 * @param userUid
 * @param titleId
 * @param curLevel
 * @param newLevel
 * @param callbackFn
 * @private
 */
function __saveUpdateTitle(userUid, titleId, curLevel, newLevel, callbackFn) {

    var updateData = {
        "titleId" : titleId,
        "curLevel" : curLevel,
        "newLevel" : newLevel
    };
    var updateTitleArr = null;
    redis.user(userUid).s("newTitleUpdate").getObj(function(err, res){
        if (err || res == null) {
            updateTitleArr = [];
        } else {
            updateTitleArr = res;
        }

        updateTitleArr.push(updateData);

        redis.user(userUid).s("newTitleUpdate").setObj(updateTitleArr, function (err, res) {
            callbackFn(null, updateTitleArr);
        });
    });
}

/**
 * 获取升级的称号
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getUpdateTitle(userUid, callbackFn) {
    redis.user(userUid).s("newTitleUpdate").getObj(function(err, res){
        if (err || res == null) {
            callbackFn(null, null);
        } else {
            callbackFn(null, res);
        }

        redis.user(userUid).s("newTitleUpdate").del();
    });
}

///////////////////////////////////////////////////////////////////////////////
// HELPERS

/**
 * 计算称号过期时间
 * @param titleCfg 称号配置
 * @param titleInfo 称号信息
 * @returns {number} 返回0则表示称号不会过期
 * @private
 */
function __getExpiredTime(titleCfg, titleInfo) {
    var expiredTime = 0;

    var curCfg = titleCfg[titleInfo["titleId"]];
    if (curCfg) {
        var titleType = curCfg["type"];
        switch (titleType) {
            // 2/3类型的称号会过期
            case 2:
            case 3:
            {
                var getTime = parseInt(titleInfo["getTime"]);
                var fHour = curCfg["failureHours"];
                var fMin = curCfg["failureMinuts"];

                if (typeof fHour == "number"
                    && typeof fMin == "number") {

                    var nextDay = jutil.dayOffset(getTime, 1);
                    expiredTime = nextDay + fHour * 60 * 60 + fMin * 60;
                } else {
                    console.log("__getExpiredTime::configError");
                }
            }
                break;

            default :
                break;
        }
    } else {
        console.log("__getExpiredTime::configError");
    }

    return expiredTime;
}

/**
 * 判断这个称号是否已经过期
 * @param titleCfg 称号配置
 * @param titleInfo 称号数据
 * @returns {boolean}
 */
function isTitleExpired(titleCfg, titleInfo) {
    var expiredTime = __getExpiredTime(titleCfg, titleInfo);
    if (expiredTime == 0) {
        return false;
    } else {
        return (jutil.now() >= expiredTime);
    }
}

/**
 * 获取所有称号的最小过期时间（秒）
 * @param titleCfg
 * @param titleArr
 * @returns {number}
 */
function getMinExpiredTime(titleCfg, titleArr) {

    var minExpiredTime = -1;

    for (var i=0,j=titleArr.length;i<j;++i) {
        var titleInfo = titleArr[i];

        var expiredTime = __getExpiredTime(titleCfg, titleInfo);
        if (expiredTime != 0) {
            var lifeTime = expiredTime - titleInfo["getTime"];

            if (lifeTime < minExpiredTime || minExpiredTime == -1) {
                minExpiredTime = lifeTime;
            }
        }
    }

    return minExpiredTime;
}

/**
 * 获取当前称号的加成值
 * @param titleInfoArr
 * @param titleInfo
 * @param titleCfg
 */
function __getTitlePoint(titleInfoArr, titleInfo, titleCfg) {
    var point = 0;

    var titleId = titleInfo["titleId"];
    var sTitleCfg = titleCfg[titleId];

    switch (sTitleCfg["type"]){
        case 0:
            point = sTitleCfg["firstPointPerLevel"] * titleInfo["titleLevel"];
            break;

        case 3:
            point = sTitleCfg["firstPointPerLevel"];
            break;

        default :
            return 0;
    }

    var percentAdd = 0;

    // 统计增加的百分比
    for (var i= 0,j=titleInfoArr.length;i<j;++i) {
        var curTitleInfo = titleInfoArr[i];
        var curTitleId = curTitleInfo["titleId"];
        if (curTitleId == titleId) {
            continue;
        }

        var curTitleCfg = titleCfg[curTitleId];
        var curTitleType = curTitleCfg["type"];
        if (curTitleType == 1 ||
            curTitleType == 2) {
            if (curTitleCfg["effect"][0] == titleId) {
                var curTitleLevel = curTitleInfo["titleLevel"];
//                if (curTitleLevel >= NO_LEVEL_TITLE_LEVEL) {
//                    curTitleLevel = 1;
//                }
                percentAdd += curTitleCfg["firstPointPerLevel"] * curTitleLevel;
            }
        }
    }

    return point * (1 + percentAdd);
}

/**
 * 获取配置文件中对应称号类别的称号ID集合
 * @param titleCfg
 * @param cat
 * @returns {Array}
 * @private
 */
function __getTitleIds(titleCfg, cat) {
    var ids = [];

    for (var key in titleCfg) {
        if (titleCfg.hasOwnProperty(key)) {
            var sTitleCfg = titleCfg[key];
            if (sTitleCfg["howGet"] == cat) {
                ids.push(sTitleCfg["id"]);
            }
        }
    }

    return ids;
}

/**
 * 获取所有howGet为vip相关的称号ID集
 * @param titleCfg
 * @private
 */
function __getVipTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "vip");
}

/**
 * 获取所有mapCross配置
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getMapCrossTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "mapCross");
}

/**
 * 获取PVP RANK配置ID集
 * @param titleCfg
 * @private
 */
function __getPvPRankTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "pvpRank");
}

/**
 * 获取Patch to skill称号ID集合
 * @param titleCfg
 * @private
 */
function __getPatchToSkillTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "patchToSkill");
}

/**
 * 获取bloodBattleCount称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getBloodBattleCountTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "bloodBattleCount");
}

/**
 * 获取世界BOSS次数称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getWorldBossCountTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "worldBossCount");
}

/**
 * 获取世界BOSS次数称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getCosmosBossCountTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "cosmosBossCount");
}

/**
 * 获取血战排名称号集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getBloodBattleRankTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "bloodBattleRank");
}

/**
 * 获取世界BOSS排名称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getWorldBossRankTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "worldBossRank");
}

/**
 * 获取世界BOSS排名称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getCosmosBossRankTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "cosmosBossRank");
}

/**
 * 获取好友数量称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getFriendCountTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "friendCount");
}

/**
 * 获取微博称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getMicroBlogTitleIds(titleCfg) {
    return __getTitleIds(titleCfg, "microBlog");
}

/**
 * 获取击杀必撸死称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getWorldBossLastBeatIds(titleCfg) {
    return __getTitleIds(titleCfg, "worldBossLastBeat");
}

/**
 * 获取击杀必撸死称号ID集合
 * @param titleCfg
 * @returns {Array}
 * @private
 */
function __getCosmosBossLastBeatIds(titleCfg) {
    return __getTitleIds(titleCfg, "cosmosBossLastBeat");
}

/**
 * 更新称号等级
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param getLevelFunc
 * @param addInfo
 * @param callbackFn
 * @private
 */
function __updateTitleLevel(userUid, titleCfg, ids, getLevelFunc, addInfo, callbackFn) {
    var vipIds = {};

    async.each(ids, function(id, forCb){

        var titleInfo = null;
        var newLevel = null;
        var oldLevel = null;

        async.series([

            // 获取当前ID的数据
            function(sCb) {
                getTitle(userUid, id, function(err, res){
                    if (err || res == null) {
                        sCb("SkipTHIS");
                    } else {
                        titleInfo = res;
                        sCb(null);
                    }
                });
            },
            // 更新数据
            function(sCb) {

                vipIds[id] = id;// 在排除ID MAP中插入值

                var titleId = titleInfo["titleId"];
                var sTitleCfg = titleCfg[titleId];
                var level = getLevelFunc(titleId, sTitleCfg, titleInfo, addInfo);
                var canMakeLow = false;
                if (typeof level == "object") {
                    canMakeLow = true;
                    level = level["level"];
                }
                newLevel = level;
                oldLevel = titleInfo["titleLevel"];

                if ((level > 0 && newLevel > oldLevel) || (level > 0 && canMakeLow)) {
                    updateTitle(userUid, titleId, level, jutil.now(), function(err, res){
                        if (err) console.error(err);
                        sCb(null);
                    });
                } else {
                    if (level <= 0) {
                        __deleteTitle(userUid, titleId, function(){
                            __calcExpiredTime(userUid, true);
                            sCb(null);
                        });
                    } else {
                        sCb(null);
                    }
                }
            },
            // 保存更新
            function(sCb) {
                if (newLevel > oldLevel) {
                    __saveUpdateTitle(userUid, titleInfo["titleId"],
                        titleInfo["titleLevel"], newLevel, function(err, res){
                            sCb(null);
                        });
                } else {
                    sCb(null);
                }
            }

        ], function(err){
            forCb(null);
        });

    }, function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, vipIds);
        }
    });
}

/**
 * 检查称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param getLevelFunc
 * @param addInfo
 * @param callbackFn
 * @private
 */
function __checkTitles(userUid, titleCfg, ids, ids2, getLevelFunc, addInfo, callbackFn) {
    async.each(ids, function(id, forCb){

        if (ids2.hasOwnProperty(id)) {
            forCb(null);
            return;
        }

        var sTitleCfg = titleCfg[id];
        var level = getLevelFunc(null, sTitleCfg, null, addInfo);
        if (typeof level == "object") {
            level = level["level"];
        }

        if (level > 0) {
            addTitle(userUid, id, level, jutil.now(), function(err, res){
                if (err && err != "alreadyHaveThisTitle") console.error(err);
                forCb(null);
            });
        } else {
            forCb(null);
        }

    }, function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null);
        }
    });
}

/**
 * 计算玩家对应VIP等级的称号等级
 * @param titleId
 * @param titleCfg
 * @param titleInfo
 * @param vipLevel
 * @returns {*}
 * @private
 */
function __getVipTitleLevel(titleId, sTitleCfg,  titleInfo, vipLevel) {
    if (titleInfo) {
        return (sTitleCfg["vipToLevel"][vipLevel] || titleInfo["titleLevel"]);
    }
    return (sTitleCfg["vipToLevel"][vipLevel] || 0);
}

/**
 * 获取MAP CROSS称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param mapId
 * @returns {*|number}
 * @private
 */
function __getMCTitleLevel(titleId, sTitleCfg, titleInfo, mapId) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var mapCrossToLevel = sTitleCfg["mapCrossToLevel"];
    for (var key in mapCrossToLevel) {
        if (mapCrossToLevel.hasOwnProperty(key)) {
            var mCTL = mapCrossToLevel[key];
            if (mCTL == mapId) {
                level = key;
                break;
            }
        }
    }

    return level;
}

/**
 * 获取PvP排名对应的称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param curRank
 * @returns {*}
 * @private
 */
function __getPvPRankTitleLevel(titleId, sTitleCfg, titleInfo, curRank) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var getRankToLevel = sTitleCfg["getRankToLevel"];

    var MIN_KEY = 1;
    var MAX_KEY = 99;

    for (var idx = MIN_KEY; idx <= MAX_KEY; ++idx) {
        var lowVal = getRankToLevel[idx];
        var highVal = null;
        if (getRankToLevel.hasOwnProperty(idx+1)) {
            highVal = getRankToLevel[idx+1];
        }

        if (lowVal && highVal) {
            if (curRank <= lowVal && curRank > highVal) {
                level = idx;
                break;
            }
        } else {
            if (curRank <= lowVal) {
                level = idx;
                break;
            }
        }
    }

    return {"level":level};
}

/**
 * 获取PATCH TO SKILL对应称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param num
 * @returns {number}
 * @private
 */
function __getPatchToSkillTitleLevel(titleId, sTitleCfg, titleInfo, num) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var SkillCountToLevel = sTitleCfg["SkillCountToLevel"];
    for (var key in SkillCountToLevel) {
        if (SkillCountToLevel.hasOwnProperty(key)) {
            var sctl = SkillCountToLevel[key];
            if (num == sctl) {
                level = key;
                break;
            }
        }
    }

    return level;
}

/**
 * 获取bloodBattleCount对应称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param num
 * @returns {number}
 * @private
 */
function __getBloodBattleCountTitleLevel(titleId, sTitleCfg, titleInfo, num) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var bloodBattleCountToLevel = sTitleCfg["bloodBattleCountToLevel"];
    for (var key in bloodBattleCountToLevel) {
        if (bloodBattleCountToLevel.hasOwnProperty(key)) {
            var sctl = bloodBattleCountToLevel[key];
            if (num == sctl) {
                level = key;
                break;
            }
        }
    }

    return level;
}

/**
 * 获取血战排名称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param rank
 * @returns {number}
 * @private
 */
function __getBloodBattleRankTitleLevel(titleId, sTitleCfg, titleInfo, rank) {

    var getRank  = sTitleCfg["getRank"];
    for (var i= 0,j=getRank.length;i<j;++i) {
        if (getRank[i] == rank) {
            // 玩家可以获取这个称号
            return NO_LEVEL_TITLE_LEVEL;
        }
    }

    // 玩家不会获取这个称号
    return 0;
}

/**
 * 获取世界BOSS称号对应的等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param num
 * @returns {number}
 * @private
 */
function __getWorldBossCountTitleLevel(titleId, sTitleCfg, titleInfo, num) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var worldBossCountToLevel = sTitleCfg["worldBossCountToLevel"];
    for (var key in worldBossCountToLevel) {
        if (worldBossCountToLevel.hasOwnProperty(key)) {
            var sctl = worldBossCountToLevel[key];
            if (num == sctl) {
                level = key;
                break;
            }
        }
    }

    return level;
}

/**
 * 获取世界BOSS称号对应的等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param num
 * @returns {number}
 * @private
 */
function __getCosmosBossCountTitleLevel(titleId, sTitleCfg, titleInfo, num) {
    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var cosmosBossCountToLevel = sTitleCfg["cosmosBossCountToLevel"];
    for (var key in cosmosBossCountToLevel) {
        if (cosmosBossCountToLevel.hasOwnProperty(key)) {
            var sctl = cosmosBossCountToLevel[key];
            if (num == sctl) {
                level = key;
                break;
            }
        }
    }

    return level;
}

/**
 * 获取好友数量称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param num
 * @returns {*}
 * @private
 */
function __getFriendCountTitleLevel(titleId, sTitleCfg, titleInfo, num) {

    if(num <= 0) {
        return 0;
    }

    var level = 0;
    if (titleInfo) {
        level = titleInfo["titleLevel"];
    }

    var friendCountToLevel = sTitleCfg["friendCountToLevel"];

    var MIN_KEY = 1;
    var MAX_KEY = 3;

    for (var idx = MIN_KEY; idx <= MAX_KEY; ++idx) {
        var lowVal = friendCountToLevel[idx];
        var highVal = null;
        if (friendCountToLevel.hasOwnProperty(idx+1)) {
            highVal = friendCountToLevel[idx+1];
        }

        if (lowVal && highVal) {
            if (num >= lowVal && num < highVal) {
                level = idx;
                break;
            }
        } else {
            if (num >= lowVal) {
                level = idx;
                break;
            }
        }
    }

    return {"level":level};
}

/**
 * 获取微博称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param add
 * @returns {number}
 * @private
 */
function __getMicroBlogTitleLevel(titleId, sTitleCfg, titleInfo, add) {
    return 1;
}

/**
 * 获取击杀必撸死称号等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param add
 * @returns {number}
 * @private
 */
function __getWorldBossLastBeatTitleLevel(titleId, sTitleCfg, titleInfo, add) {
    return NO_LEVEL_TITLE_LEVEL;
}

/**
 * 获取打必撸死排名称号对应等级
 * @param titleId
 * @param sTitleCfg
 * @param titleInfo
 * @param rank
 * @returns {number}
 * @private
 */
function __getWorldBossRankTitleLevel(titleId, sTitleCfg, titleInfo, rank) {
    var getRank  = sTitleCfg["getRank"];
    for (var i= 0,j=getRank.length;i<j;++i) {
        if (getRank[i] == rank) {
            // 玩家可以获取这个称号
            return NO_LEVEL_TITLE_LEVEL;
        }
    }

    // 玩家不会获取这个称号
    return 0;
}

/**
 * 更新玩家已有的VIP相关称号数据
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param vipLevel
 * @param callbackFn
 * @private
 */
function __updateVipTitles(userUid, titleCfg, ids, vipLevel, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getVipTitleLevel, vipLevel, function(err, res){
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 检查玩家是否可以获取称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2 排除ID列表
 * @param vipLevel
 * @param callbackFn
 * @private
 */
function __checkVipTitles(userUid, titleCfg, ids, ids2, vipLevel, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getVipTitleLevel, vipLevel, function(err, res){
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 更新mapCross称号配置
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param mapId
 * @param callbackFn
 * @private
 */
function __updateMCTitles(userUid, titleCfg, ids, mapId, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getMCTitleLevel, mapId, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
    });
}

/**
 * 检查玩家是否可以获取mapCROSS称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param mapId
 * @param callbackFn
 * @private
 */
function __checkMCTitles(userUid, titleCfg, ids, ids2, mapId, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getMCTitleLevel, mapId, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 更新PVP排名称号配置
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param rank
 * @param callbackFn
 * @private
 */
function __updatePvPRankTitles(userUid, titleCfg, ids, rank, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getPvPRankTitleLevel, rank, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        });
}

/**
 * 检查PVP排名称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param rank
 * @param callbackFn
 * @private
 */
function __checkPvPRankTitles(userUid, titleCfg, ids, ids2, rank, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getPvPRankTitleLevel, rank, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 更新PATCH TO SKILL称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param num
 * @param callbackFn
 * @private
 */
function __updatePatchToSkillTitles(userUid, titleCfg, ids, num, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getPatchToSkillTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
    });
}

/**
 * 检查PATCH TO SKILL称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param num
 * @param callbackFn
 * @private
 */
function __checkPatchToSkillTitles(userUid, titleCfg, ids, ids2, num, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getPatchToSkillTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 更新BloodBattleCount称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param num
 * @param callbackFn
 * @private
 */
function __updateBloodBattleCountTitles(userUid, titleCfg, ids, num, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getBloodBattleCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        });
}

/**
 * 检查BloodBattleCount称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param num
 * @param callbackFn
 * @private
 */
function __checkBloodBattleCountTitles(userUid, titleCfg, ids, ids2, num, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getBloodBattleCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查血战排名称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param rank
 * @param callbackFn
 * @private
 */
function __checkBloodBattleRankTitles(userUid, titleCfg, ids, ids2, rank, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getBloodBattleRankTitleLevel, rank, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 更新世界BOSS称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param num
 * @param callbackFn
 * @private
 */
function __updateWorldBossCountTitles(userUid, titleCfg, ids, num, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getWorldBossCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        });
}

/**
 * 更新世界BOSS称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param num
 * @param callbackFn
 * @private
 */
function __updateCosmosBossCountTitles(userUid, titleCfg, ids, num, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getCosmosBossCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        });
}

/**
 * 检查世界BOSS称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param num
 * @param callbackFn
 * @private
 */
function __checkWorldBossCountTitles(userUid, titleCfg, ids, ids2, num, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getWorldBossCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查世界BOSS称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param num
 * @param callbackFn
 * @private
 */
function __checkCosmosBossCountTitles(userUid, titleCfg, ids, ids2, num, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getCosmosBossCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 更新好友数量称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param num
 * @param callbackFn
 * @private
 */
function __updateFriendCountTitles(userUid, titleCfg, ids, num, callbackFn) {
    __updateTitleLevel(userUid, titleCfg, ids,
        __getFriendCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        });
}

/**
 * 检查好友数量称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param num
 * @param callbackFn
 * @private
 */
function __checkFriendCountTitles(userUid, titleCfg, ids, ids2, num, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getFriendCountTitleLevel, num, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查微博称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param add
 * @param callbackFn
 * @private
 */
function __checkMicroBlogTitles(userUid, titleCfg, ids, ids2, add, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getMicroBlogTitleLevel, add, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查击杀必撸死称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param add
 * @param callbackFn
 * @private
 */
function __checkWorldBossLastBeatTitles(userUid, titleCfg, ids, ids2, add, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getWorldBossLastBeatTitleLevel, add, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查击杀必撸死称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param add
 * @param callbackFn
 * @private
 */
function __checkCosmosBossLastBeatTitles(userUid, titleCfg, ids, ids2, add, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getWorldBossLastBeatTitleLevel, add, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查世界BOSS排名称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param rank
 * @param callbackFn
 * @private
 */
function __checkWorldBossRankTitles(userUid, titleCfg, ids, ids2, rank, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getWorldBossRankTitleLevel, rank, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

/**
 * 检查世界BOSS排名称号
 * @param userUid
 * @param titleCfg
 * @param ids
 * @param ids2
 * @param rank
 * @param callbackFn
 * @private
 */
function __checkCosmosBossRankTitles(userUid, titleCfg, ids, ids2, rank, callbackFn) {
    __checkTitles(userUid, titleCfg, ids, ids2,
        __getWorldBossRankTitleLevel, rank, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, res);
            }
        }
    );
}

///////////////////////////////////////////////////////////////////////////////
// INTERFACES

/**
 * 计算玩家的先手点
 * @param userUid
 * @param callbackFn
 */
function getTitlesPoint(userUid, callbackFn) {
    var point = 0;
    redis.user(userUid).s("titleGetPoints").getObj(function (err, res) {
        //res = null;
        if (err) {
            callbackFn(point);
        } else {
            if (res != null) {
                point = res;
                callbackFn(point)
            } else {
                // 计算
                getAllTitle(userUid, function(err, res){
                    if (err || res == null) {
                        callbackFn(point);
                    } else {
                        var configData = configManager.createConfig(userUid);
                        var titleCfg = configData.getConfig("title");

                        for (var key in res) {
                            if (res.hasOwnProperty(key)) {
                                var sTitleInfo = res[key];
                                point += __getTitlePoint(res, sTitleInfo, titleCfg);
                            }
                        }

                        var titleArr = res;

                        // 保存
                        redis.user(userUid).s("titleGetPoints").setObjex(86400, point, function (err, res) {
                            callbackFn(point);
                        });
                    }
                });
            }
        }
    });
}



//// EXPORT FOR MODEL

/**
 * 玩家VIP等级变更时检查有没有称号获取或者需要变更称号等级
 * @param userUid
 * @param curLevel
 * @param callbackFn
 */
function vipLevelChange(userUid, curLevel, callbackFn) {

    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getVipTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateVipTitles(userUid, titleCfg, vipTitleIds, curLevel, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkVipTitles(userUid, titleCfg, vipTitleIds, hasIds, curLevel, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家通关地图
 * @param userUid
 * @param mapId
 * @param callbackFn
 */
function mapCrossChange(userUid, mapId, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getMapCrossTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateMCTitles(userUid, titleCfg, mcTitleIds, mapId, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkMCTitles(userUid, titleCfg, mcTitleIds, hasIds, mapId, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家PVP排名改变时获取该称号
 * @param userUid
 * @param rank
 * @param callbackFn
 */
function pvpRankChange(userUid, rank, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getPvPRankTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updatePvPRankTitles(userUid, titleCfg, mcTitleIds, rank, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkPvPRankTitles(userUid, titleCfg, mcTitleIds, hasIds, rank, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家通过抢夺招式合成了技能
 * @param userUid
 * @param num
 * @param callbackFn
 * @private
 */
function __patchToSkillChange(userUid, num, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getPatchToSkillTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updatePatchToSkillTitles(userUid, titleCfg, mcTitleIds, num, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkPatchToSkillTitles(userUid, titleCfg, mcTitleIds, hasIds, num, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家通过抢夺招式合成了技能
 * @param userUid
 * @param callbackFn
 */
function patchToSkillChange(userUid, callbackFn) {
    __updateTitleMeta(userUid, PATCH_TO_SKILL_KEY, function(err, res){
        if (err) console.error(err);
        else {
            __patchToSkillChange(userUid, res, callbackFn);
        }
    });
}

/**
 * 玩家打封印地狱门的次数变化
 * @param userUid
 * @param num
 * @param callbackFn
 * @private
 */
function __bloodBattleCountChange(userUid, num, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getBloodBattleCountTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateBloodBattleCountTitles(userUid, titleCfg, mcTitleIds, num, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkBloodBattleCountTitles(userUid, titleCfg, mcTitleIds, hasIds, num, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家打封印地狱门的次数变化
 * @param userUid
 * @param callbackFn
 */
function bloodBattleCountChange(userUid, callbackFn) {
    __updateTitleMeta(userUid, BLOOD_BATTLE_COUNT_KEY, function(err, res){
        if (err) console.error(err);
        else {
            __bloodBattleCountChange(userUid, res, callbackFn);
        }
    });
}

/**
 * 玩家封印排名改变时调用
 * @param userUid
 * @param rank
 * @param callbackFn
 */
function bloodBattleRankChange(userUid, rank, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getBloodBattleRankTitleIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkBloodBattleRankTitles(userUid, titleCfg, vipTitleIds, {}, rank, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家打必撸死
 * @param userUid
 * @param num
 * @param callbackFn
 * @private
 */
function __worldBossCountChange(userUid, num, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getWorldBossCountTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateWorldBossCountTitles(userUid, titleCfg, mcTitleIds, num, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkWorldBossCountTitles(userUid, titleCfg, mcTitleIds, hasIds, num, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家打必撸死
 * @param userUid
 * @param callbackFn
 */
function worldBossCountChange(userUid, callbackFn) {
    __updateTitleMeta(userUid, WORLD_BOOS_COUNT, function(err, res){
        if (err) console.error(err);
        else {
            __worldBossCountChange(userUid, res, callbackFn);
        }
    });
}

/**
 * 玩家打必撸死
 * @param userUid
 * @param num
 * @param callbackFn
 * @private
 */
function __cosmosBossCountChange(userUid, num, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getCosmosBossCountTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateCosmosBossCountTitles(userUid, titleCfg, mcTitleIds, num, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkCosmosBossCountTitles(userUid, titleCfg, mcTitleIds, hasIds, num, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家打必撸死
 * @param userUid
 * @param callbackFn
 */
function cosmosBossCountChange(userUid, callbackFn) {
    __updateTitleMeta(userUid, COSMOS_BOOS_COUNT, function(err, res){
        if (err) console.error(err);
        else {
            __cosmosBossCountChange(userUid, res, callbackFn);
        }
    });
}

/**
 * 玩家好友数量改变
 * @param userUid
 * @param num 当前好友数量
 * @param callbackFn
 */
function friendCountChange(userUid, num, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var mcTitleIds = __getFriendCountTitleIds(titleCfg);

    var hasIds = null;

    async.series([
        // 更新已有的称号
        function(cb) {
            __updateFriendCountTitles(userUid, titleCfg, mcTitleIds, num, function(err, res){
                if (err) cb(err);
                else {
                    hasIds = res;
                    cb(null);
                }
            });
        },
        // 检查称号获取
        function(cb) {
            __checkFriendCountTitles(userUid, titleCfg, mcTitleIds, hasIds, num, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家绑定了微博
 * @param userUid
 * @param callbackFn
 */
function microBlogBinding(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getMicroBlogTitleIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkMicroBlogTitles(userUid, titleCfg, vipTitleIds, {}, null, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家最终击杀必撸死
 * @param userUid
 * @param callbackFn
 */
function worldBossLastBeat(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getWorldBossLastBeatIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkWorldBossLastBeatTitles(userUid, titleCfg, vipTitleIds, {}, null, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 玩家最终击杀必撸死
 * @param userUid
 * @param callbackFn
 */
function cosmosBossLastBeat(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getCosmosBossLastBeatIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkCosmosBossLastBeatTitles(userUid, titleCfg, vipTitleIds, {}, null, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 打世界BOSS排名改变
 * @param userUid
 * @param rank
 * @param callbackFn
 */
function worldBossRankChange(userUid, rank, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getWorldBossRankTitleIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkWorldBossRankTitles(userUid, titleCfg, vipTitleIds, {}, rank, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}

/**
 * 打世界BOSS排名改变
 * @param userUid
 * @param rank
 * @param callbackFn
 */
function cosmosBossRankChange(userUid, rank, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    var vipTitleIds = __getCosmosBossRankTitleIds(titleCfg);

    async.series([
        // 检查称号获取
        function(cb) {
            __checkCosmosBossRankTitles(userUid, titleCfg, vipTitleIds, {}, rank, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) console.error(err);
        if (callbackFn) {
            callbackFn();
        }
    });
}



function onlyCallOnce(userUid, callbackFn) {

    var configData = configManager.createConfig(userUid);
    var titleCfg = configData.getConfig("title");

    async.series([
        // 檢查是否需要走流程
        function(cb) {
            userVariable.getVariable(userUid, "titleCallOnce", function(err, res){
                if (err) cb(err);
                else {
                    if (res == null) {
                        cb(null);
                    } else {
                        cb("notNeed");
                    }
                }
            });
        },
        // VIP
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb("dbError");
                } else {
                    var vip = res["vip"] - 0;
                    vipLevelChange(userUid, vip, function(){
                        cb(null);
                    });
                }
            });
        },
        // MAP
        function(cb) {
            var mapCrossToLevel = titleCfg["210001"]["mapCrossToLevel"];
            var mapTd = 0;
            async.eachSeries(Object.keys(mapCrossToLevel), function(key, fCb){
                var mapId = mapCrossToLevel[key];
                map.getMapItem(userUid, mapId, function(err, res){
                    if (err) {
                        fCb(err);
                    } else {
                        if ((!res) || ((res["star"] - 0) == 0)) {
                            fCb("forEachEnd");
                        } else {
                            mapTd = mapId;
                            fCb(null);
                        }
                    }
                });
            }, function(err){
                if (mapTd != 0) {
                    mapCrossChange(userUid, mapTd, function(){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            });
        },
        // PVP
        function(cb) {
            pvptop.getUserTop(userUid, function(err, res){
                if (err) cb(err);
                else {
                    if (res != null) {
                        var ownPvpTop = res["top"] - 0;
                        pvpRankChange(userUid, ownPvpTop, function(){
                            cb(null);
                        });
                    } else {
                        cb(null);
                    }
                }
            });
        },
        // FRIEND
        function(cb) {
            friend.friendCount(userUid, function(err, res) {
                if (!(err || res == null)) {
                    friendCountChange(userUid, res, function(){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            });
        },
        // SET VAR
        function(cb) {
            userVariable.setVariable(userUid, "titleCallOnce", true, function(err, res){
                cb(null);
            });
        }
    ], function(err){
        redis.user(userUid).s("newTitleGet").del();
        redis.user(userUid).s("newTitleUpdate").del();
        callbackFn(null);
    });
}

// EXPORTS
exports.getAllTitle = getAllTitle;
exports.vipLevelChange = vipLevelChange;
exports.mapCrossChange = mapCrossChange;
exports.pvpRankChange = pvpRankChange;
exports.getTitlesPoint = getTitlesPoint;
exports.patchToSkillChange = patchToSkillChange;
exports.bloodBattleCountChange = bloodBattleCountChange;
exports.bloodBattleRankChange = bloodBattleRankChange;
exports.worldBossCountChange = worldBossCountChange;
exports.cosmosBossCountChange = cosmosBossCountChange;
exports.friendCountChange = friendCountChange;
exports.microBlogBinding = microBlogBinding;
exports.worldBossLastBeat = worldBossLastBeat;
exports.cosmosBossLastBeat = cosmosBossLastBeat;
exports.worldBossRankChange = worldBossRankChange;
exports.cosmosBossRankChange =cosmosBossRankChange;

exports.getNewTitle = __getNewTitle;
exports.getUpdateTitle = __getUpdateTitle;

exports.onlyCallOnce = onlyCallOnce;