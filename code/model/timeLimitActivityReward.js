/******************************************************************************
 * 限时活动奖励
 * Create by MR.Luo.
 * Create at 14-6-23.
 *****************************************************************************/

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");
var bitUtil = require("../alien/db/bitUtil");
var activityConfig = require("../model/activityConfig");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");

/*---------------------------------------------------------------------------*/

var ALL_DATA_KEY = "timeLimitActivity_ALLDATA";

/**
 * 加载玩家所有的数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __loadAllData(userUid, callbackFn) {
    redis.user(userUid).s(ALL_DATA_KEY).getObj(function(err, res){
        // TODO : 使用缓存会有缓存同步问题，请勿打开
        res = null;
        if (res == null) {
            var sql = "SELECT * FROM timeLimitActivity WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null) {
                    if (err) console.error(sql, err.stack);
                    callbackFn(err);
                } else {
                    // BUILD CACHE
                    var cacheObj = {};

                    if (res.length > 0) {
                        for (var key in res) {
                            if (res.hasOwnProperty(key)) {
                                var item = res[key];
                                item["data"] = JSON.parse(item["data"]);
                                item["updateTime"] = item["updateTime"] - 0;
                                cacheObj[item["uKey"]] = item;
                            }
                        }
                    }

                    redis.user(userUid).s(ALL_DATA_KEY).setObj(cacheObj, function(err){
                        if (err) {
                            console.error(err);
                        }
                        callbackFn(null, cacheObj);
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 查询数据
 * @param userUid
 * @param key
 * @param callbackFn
 */
function queryData(userUid, key, callbackFn) {
    __loadAllData(userUid, function(err, res){
        if (err) callbackFn(err);
        else {
            if (res.hasOwnProperty(key)) {
                callbackFn(null, res[key]);
            } else {
                callbackFn(null, null);
            }
        }
    });
}

/**
 * 更新数据
 * @param userUid
 * @param key
 * @param data
 * @param callbackFn
 */
function updateData(userUid, key, data, callbackFn) {
    __loadAllData(userUid, function(err, res){
        if (err) callbackFn(err);
        else {
            var updateTime = jutil.now();
            if (res.hasOwnProperty(key)) {
                res[key]["data"] = data;
                res[key]["updateTime"] = updateTime;

                var sql = "UPDATE timeLimitActivity SET ? WHERE userUid = " + mysql.escape(userUid)
                    + " AND uKey = " + mysql.escape(key);

                var newData = {};
                newData["data"] = JSON.stringify(data);
                newData["updateTime"] = updateTime;

                var cacheRes = res;

                // 更新数据库
                mysql.game(userUid).query(sql,newData,function(err,res){
                    if (err) {
                        console.error(err);
                        callbackFn(err,null);
                    } else {
                        // 更新缓存
                        redis.user(userUid).s(ALL_DATA_KEY).setObj(cacheRes, function(err){
                            if (err) {
                                console.error(err);
                                callbackFn(err);
                            } else {
                                callbackFn(null,1);
                            }
                        });
                    }
                });
            } else {
                var sql = 'INSERT INTO timeLimitActivity SET ?';
                var newData = {};
                newData["userUid"] = userUid;
                newData["uKey"] = key;
                newData["data"] = JSON.stringify(data);
                newData["updateTime"] = updateTime;

                res[key] = newData;

                var cacheRes = res;

                // 更新数据库
                mysql.game(userUid).query(sql,newData,function(err,res) {
                    if (err) {
                        console.error(err);
                        callbackFn(err,null);
                    } else {
                        cacheRes[key]["data"] = JSON.parse(cacheRes[key]["data"]);

                        // 更新缓存
                        redis.user(userUid).s(ALL_DATA_KEY).setObj(cacheRes, function(err){
                            if (err) {
                                console.error(err);
                                callbackFn(err);
                            } else {
                                callbackFn(null,1);
                            }
                        });
                    }
                });
            }
        }
    });
}

/*---------------------------------------------------------------------------*/



/*---------------------------------------------------------------------------*/

exports = module.exports = new function() {

    var ACTIVITY_CONFIG_NAME = "timeLimitActivity"; // 活动配置名

    var _configObj = null; // 配置对象(处理过，用于加快数据查找速度)
    var _equipConfig = null; // 装备配置对象
    var _heroConfig = null; // 伙伴配置对象
    var _cardConfig = null; // 卡片配置对象
    var _specialTeamConfig = null; // 特战队配置
    var _sTime = 0; // 活动开始时间
    var _eTime = 0; // 活动结束时间，用于检测配置对象是否过期


    /**
     * 获取配置对象
     * @param userUid
     * @param callbackFn
     */
    function getConfigObj(userUid, callbackFn) {
        _eTime = 0;

        if (jutil.now() >= _eTime) {
            // 配置过期，重构
            _configObj = null;
            if (_eTime != 0) {
                // 活动结束
                callbackFn("notOpen");
                return;
            }
        }

        if (!_configObj) {
            var currentConfig = null;
            async.series([
                // 获取活动配置
                function(cb) {
                    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            if (res[0]) {
                                _sTime = res[4];
                                _eTime = res[5];
                                currentConfig = res[2]["config"];
                                //gRes["title"] = res[2]["title"];
                                //gRes["bgimg"] = res[2]["bgimg"];
                                if (!currentConfig) {
                                    cb("configError");
                                } else {
                                    cb(null);
                                }
                            } else {
                                cb("notOpen");
                            }
                        }
                    });
                },
                // 构造配置对象（为了加快访问数据）
                function(cb) {
                    var configObj = {};
                    for (var key in currentConfig) {
                        if (currentConfig.hasOwnProperty(key)) {
                            var configItem = currentConfig[key];
                            if (!configObj.hasOwnProperty(configItem["type"])) {
                                configObj[configItem["type"]] = [];
                            }
                            configObj[configItem["type"]].push(configItem);
                        }
                    }
                    _configObj = configObj;
                    cb(null);
                }
            ], function(err){
                if (err) callbackFn(err);
                else {
                    callbackFn(null, _configObj);
                }
            });

        } else {
            callbackFn(null, _configObj);
        }
    }

    /**
     * 计算特战队位置加成数据
     * @param userUid
     * @param posId
     * @param strong
     * @returns {number}
     */
    function calcPercent(userUid, posId, strong) {
//        if (!_specialTeamConfig) {
//            var configMgr = configManager.createConfig(userUid);
//            _specialTeamConfig = configMgr.getConfig("specialTeam");
//        }
//        var basePercent = _specialTeamConfig["position"][posId]["addBaseValue"];
//        return  (strong + 1) * basePercent;
        return strong;
    }

    /**
     * 检查数组是否含有某个值
     * @param arr
     * @param value
     * @returns {boolean}
     */
    function arrayHasValue(arr, value) {
        for (var i= 0,j=arr.length;i<j;++i) {
            if (arr[i] == value) {
                return true;
            }
        }
        return false;
    }

    /*---------------------------------------------------------------------------*/

    /**
     * 装备精炼升级
     * @param userUid
     * @param equipId
     * @param oldLevel
     * @param newLevel
     * @param callbackFn
     */
    this.equipUpdate = function(userUid, equipId, oldLevel, newLevel, callbackFn) {
        if (oldLevel >= newLevel) {
            callbackFn();
            return;
        }

        var configObj = null;
        var equipDefine = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 获取装备定义
            function(cb) {
                if (!_equipConfig) {
                    var configMgr = configManager.createConfig(userUid);
                    _equipConfig = configMgr.getConfig("equip");
                }

                if (_equipConfig.hasOwnProperty(equipId)) {
                    equipDefine = _equipConfig[equipId];
                }

                cb(null);
            },

            // 任意
            function(cb) {
                var anyConfig = null;
                if (configObj.hasOwnProperty("equipDefineAny")) {
                    anyConfig = configObj["equipDefineAny"];
                }

                if (anyConfig) {
                    var star = equipDefine["star"];
                    var subAnyConfig = null;
                    var targetLevel = 0;

                    async.eachSeries(Object.keys(anyConfig), function(key, esCb){
                        var configItem = anyConfig[key];
                        if (configItem["equipStar"] == star) {
                            subAnyConfig = configItem;
                            targetLevel = subAnyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subAnyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var dbData = res["data"] || {};
                                        var maxGetNum = subAnyConfig["timeLimit"];
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            },

            // 指定
            function(cb) {
                var specifyConfig = null;
                if (configObj.hasOwnProperty("equipDefineSpecify")) {
                    specifyConfig = configObj["equipDefineSpecify"];
                }

                if (specifyConfig) {
                    var subSpecifyConfig = null;
                    var targetLevel = 0;
                    async.eachSeries(Object.keys(specifyConfig), function(key, esCb){
                        var configItem = specifyConfig[key];
                        if (configItem["equipId"] == equipId) {
                            subSpecifyConfig = configItem;
                            targetLevel = subSpecifyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subSpecifyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var maxGetNum = subSpecifyConfig["timeLimit"];
                                        var dbData = res["data"] || {};
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 培养液消耗
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    this.brothUse = function(userUid, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 培养液消耗
            function(cb) {
                var brothConfig = null;
                if (configObj.hasOwnProperty("liquidConsume")) {
                    brothConfig = configObj["liquidConsume"];
                }

                if (brothConfig && brothConfig.length > 0) {
                    var subBrothConfig = brothConfig[0];
                    var key = subBrothConfig["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var brothUsed = dbData["numUsed"] || 0;
                            var brothUsedNew = brothUsed + numUsed;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(brothConfig), function(key, esCb){
                                // 检查满足
                                subBrothConfig = brothConfig[key];
                                var count = subBrothConfig["count"];
                                if (brothUsed < count && brothUsedNew >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = brothUsedNew;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 伙伴突破
     * @param userUid
     * @param heroId
     * @param oldBreak
     * @param newBreak
     * @param callbackFn
     */
    this.heroBreak = function(userUid, heroId, oldBreak, newBreak, callbackFn){
        if (oldBreak >= newBreak) {
            callbackFn();
            return;
        }

        var configObj = null;
        var heroDefine = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 获取伙伴定义
            function(cb) {
                if (!_heroConfig) {
                    var configMgr = configManager.createConfig(userUid);
                    _heroConfig = configMgr.getConfig("hero");
                }

                if (_heroConfig.hasOwnProperty(heroId)) {
                    heroDefine = _heroConfig[heroId];
                }

                cb(null);
            },

            // 任意
            function(cb) {
                var anyConfig = null;
                if (configObj.hasOwnProperty("breakThroughAng")) {
                    anyConfig = configObj["breakThroughAng"];
                }

                if (anyConfig) {
                    var star = heroDefine["star"];
                    var subAnyConfig = null;
                    var targetLevel = 0;

                    async.eachSeries(Object.keys(anyConfig), function(key, esCb){
                        var configItem = anyConfig[key];
                        if (configItem["heroStar"] == star) {
                            subAnyConfig = configItem;
                            targetLevel = subAnyConfig["targetLevel"];
                            if (oldBreak < targetLevel && newBreak >= targetLevel) {
                                var key = subAnyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var dbData = res["data"] || {};
                                        var maxGetNum = subAnyConfig["timeLimit"];
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            },

            // 指定
            function(cb) {
                var specifyConfig = null;
                if (configObj.hasOwnProperty("breakThroughSpecify")) {
                    specifyConfig = configObj["breakThroughSpecify"];
                }

                if (specifyConfig) {
                    var subSpecifyConfig = null;
                    var targetLevel = 0;
                    async.eachSeries(Object.keys(specifyConfig), function(key, esCb){
                        var configItem = specifyConfig[key];
                        if (configItem["heroId"] == heroId) {
                            subSpecifyConfig = configItem;
                            targetLevel = subSpecifyConfig["targetLevel"];
                            if (oldBreak < targetLevel && newBreak >= targetLevel) {
                                var key = subSpecifyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var dbData = res["data"] || {};
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) > 0) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 装备强化
     * @param userUid
     * @param equipId
     * @param oldLevel
     * @param newLevel
     * @param callbackFn
     */
    this.equipLevelUp = function(userUid, equipId, oldLevel, newLevel, callbackFn) {
        if (oldLevel >= newLevel) {
            callbackFn();
            return;
        }

        var configObj = null;
        var equipDefine = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 获取装备定义
            function(cb) {
                if (!_equipConfig) {
                    var configMgr = configManager.createConfig(userUid);
                    _equipConfig = configMgr.getConfig("equip");
                }

                if (_equipConfig.hasOwnProperty(equipId)) {
                    equipDefine = _equipConfig[equipId];
                }

                cb(null);
            },

            // 任意
            function(cb) {
                var anyConfig = null;
                if (configObj.hasOwnProperty("equipLevelUpAny")) {
                    anyConfig = configObj["equipLevelUpAny"];
                }

                if (anyConfig) {
                    var star = equipDefine["star"];
                    var subAnyConfig = null;
                    var targetLevel = 0;

                    async.eachSeries(Object.keys(anyConfig), function(key, esCb){
                        var configItem = anyConfig[key];
                        if (configItem["equipStar"] == star) {
                            subAnyConfig = configItem;
                            targetLevel = subAnyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subAnyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var dbData = res["data"] || {};
                                        var maxGetNum = subAnyConfig["timeLimit"];
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            },

            // 指定
            function(cb) {
                var specifyConfig = null;
                if (configObj.hasOwnProperty("equipLevelUpSpecify")) {
                    specifyConfig = configObj["equipLevelUpSpecify"];
                }

                if (specifyConfig) {
                    var subSpecifyConfig = null;
                    var targetLevel = 0;
                    async.eachSeries(Object.keys(specifyConfig), function(key, esCb){
                        var configItem = specifyConfig[key];
                        if (configItem["equipId"] == equipId) {
                            subSpecifyConfig = configItem;
                            targetLevel = subSpecifyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subSpecifyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var maxGetNum = subSpecifyConfig["timeLimit"];
                                        var dbData = res["data"] || {};
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 卡片升级
     * @param userUid
     * @param equipId
     * @param oldLevel
     * @param newLevel
     * @param callbackFn
     */
    this.cardLevelUp = function(userUid, cardId, oldLevel, newLevel, callbackFn) {
        if (oldLevel >= newLevel) {
            callbackFn();
            return;
        }

        var configObj = null;
        var cardDefine = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 获取卡片定义
            function(cb) {
                if (!_cardConfig) {
                    var configMgr = configManager.createConfig(userUid);
                    _cardConfig = configMgr.getConfig("card");
                }

                if (_cardConfig.hasOwnProperty(cardId)) {
                    cardDefine = _cardConfig[cardId];
                }

                cb(null);
            },

            // 任意
            function(cb) {
                var anyConfig = null;
                if (configObj.hasOwnProperty("cardLevelUpAny")) {
                    anyConfig = configObj["cardLevelUpAny"];
                }

                if (anyConfig) {
                    var star = cardDefine["star"];
                    var subAnyConfig = null;
                    var targetLevel = 0;

                    async.eachSeries(Object.keys(anyConfig), function(key, esCb){
                        var configItem = anyConfig[key];
                        if (configItem["cardStar"] == star) {
                            subAnyConfig = configItem;
                            targetLevel = subAnyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subAnyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var dbData = res["data"] || {};
                                        var maxGetNum = subAnyConfig["timeLimit"];
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            },

            // 指定
            function(cb) {
                var specifyConfig = null;
                if (configObj.hasOwnProperty("cardLevelUpSpecify")) {
                    specifyConfig = configObj["cardLevelUpSpecify"];
                }

                if (specifyConfig) {
                    var subSpecifyConfig = null;
                    var targetLevel = 0;
                    async.eachSeries(Object.keys(specifyConfig), function(key, esCb){
                        var configItem = specifyConfig[key];
                        if (configItem["cardId"] == cardId) {
                            subSpecifyConfig = configItem;
                            targetLevel = subSpecifyConfig["targetLevel"];
                            if (oldLevel < targetLevel && newLevel >= targetLevel) {
                                var key = subSpecifyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var maxGetNum = subSpecifyConfig["timeLimit"];
                                        var dbData = res["data"] || {};
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 特战队位置升级
     * @param userUid
     * @param posId
     * @param oldLevel
     * @param newLevel
     * @param callbackFn
     */
    this.specialTeamLevelUp = function(userUid, posId, oldLevel, newLevel, callbackFn) {
        if (oldLevel >= newLevel) {
            callbackFn();
            return;
        }

        var configObj = null;
        var oldPercent = 0;
        var newPercent = 0;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 计算数据
            function(cb) {
                oldPercent = calcPercent(userUid, posId, oldLevel);
                newPercent = calcPercent(userUid, posId, newLevel);
                cb(null);
            },

            // 任意
            function(cb) {
                var anyConfig = null;
                if (configObj.hasOwnProperty("specialTeamLevelUpAny")) {
                    anyConfig = configObj["specialTeamLevelUpAny"];
                }

                if (anyConfig) {
                    var subAnyConfig = null;
                    var targetLevel = 0;

                    async.eachSeries(Object.keys(anyConfig), function(key, esCb){
                        var configItem = anyConfig[key];
                        subAnyConfig = configItem;
                        targetLevel = subAnyConfig["targetLevel"];
                        if (oldPercent < targetLevel && newPercent >= targetLevel) {
                            var key = subAnyConfig["key"];
                            queryData(userUid, key, function(err, res){
                                if (err) {
                                    esCb(null);
                                } else {
                                    // 检查数据是否过期
                                    res = res || {};
                                    var updateTime = res["updateTime"] || 0;
                                    if (updateTime < _sTime) {
                                        res = {};
                                    }

                                    var dbData = res["data"] || {};
                                    var maxGetNum = subAnyConfig["timeLimit"];
                                    var alreadyGetNum = dbData["aGet"] || 0;
                                    var canGetNum = dbData["cGet"] || 0;
                                    if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                        esCb(null);
                                    } else {
                                        canGetNum++;
                                        dbData["cGet"] = canGetNum;
                                        updateData(userUid, key, dbData, function(err, res){
                                            esCb(null);
                                        });
                                    }
                                }
                            });
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            },

            // 指定
            function(cb) {
                var specifyConfig = null;
                if (configObj.hasOwnProperty("specialTeamLevelUpSpecify")) {
                    specifyConfig = configObj["specialTeamLevelUpSpecify"];
                }

                if (specifyConfig) {
                    var subSpecifyConfig = null;
                    var targetLevel = 0;
                    async.eachSeries(Object.keys(specifyConfig), function(key, esCb){
                        var configItem = specifyConfig[key];
                        if (configItem["positionId"] == posId) {
                            subSpecifyConfig = configItem;
                            targetLevel = subSpecifyConfig["targetLevel"];
                            if (oldPercent < targetLevel && newPercent >= targetLevel) {
                                var key = subSpecifyConfig["key"];
                                queryData(userUid, key, function(err, res){
                                    if (err) {
                                        esCb(null);
                                    } else {
                                        // 检查数据是否过期
                                        res = res || {};
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        var maxGetNum = subSpecifyConfig["timeLimit"];
                                        var dbData = res["data"] || {};
                                        var alreadyGetNum = dbData["aGet"] || 0;
                                        var canGetNum = dbData["cGet"] || 0;
                                        if ((alreadyGetNum + canGetNum) >= maxGetNum) {
                                            esCb(null);
                                        } else {
                                            canGetNum++;
                                            dbData["cGet"] = canGetNum;
                                            updateData(userUid, key, dbData, function(err, res){
                                                esCb(null);
                                            });
                                        }
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function(err){
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 伊美加币消耗
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    this.ingotCost = function(userUid, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 伊美加币消耗
            function(cb) {
                var ingotConfig = null;
                if (configObj.hasOwnProperty("imeggaConsume")) {
                    ingotConfig = configObj["imeggaConsume"];
                }

                if (ingotConfig && ingotConfig.length > 0) {
                    var subIngotConfig = ingotConfig[0];
                    var key = subIngotConfig["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var ingotUsed = dbData["numUsed"] || 0;
                            var ingotUsedNew = ingotUsed + numUsed;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(ingotConfig), function(key, esCb){
                                // 检查满足
                                subIngotConfig = ingotConfig[key];
                                var count = subIngotConfig["count"];
                                if (ingotUsed < count && ingotUsedNew >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = ingotUsedNew;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 道具使用
     * @param userUid
     * @param itemId
     * @param numUsed
     * @param callbackFn
     */
    this.itemUsed = function(userUid, itemId, numUsed, callbackFn) {
        var configObj = null;
        var key = "";
        var itemUseConfig = [];
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 道具使用
            function(cb) {
                //var itemUseConfig = null;
                var keys = ["itemUseSpecify", "specialBox", "enegyBall"];
                for(var i in keys){
                    if (configObj.hasOwnProperty(keys[i])) {
                        for(var j in configObj[keys[i]]){
                            itemUseConfig.push(configObj[keys[i]][j])
                        }
                        //itemUseConfig = configObj[keys[i]];
                    }
                }
                async.eachSeries(Object.keys(itemUseConfig), function(i, esCb){
                    var subItemConfig = itemUseConfig[i];
                    var count = subItemConfig["count"];
                    var idArr = subItemConfig["itemId"];
                    if (arrayHasValue(idArr, itemId)) {
                        key = subItemConfig["key"];
                    } else {
                        delete itemUseConfig[i];
                    }
                    esCb(null);
                },function(err){
                    cb(null);
                });
            },
            function(cb){
                if(key == ""){
                    cb(null);
                    return;
                }
                queryData(userUid, key, function(err, res){
                    // 检查数据过期
                    res = res || {};
                    var updateTime = res["updateTime"] || 0;
                    if (updateTime < _sTime) {
                        res = {};
                    }

                    var dbData = res["data"] || {};
                    var itemUsed = dbData["numUsed"] || 0;
                    var itemUsedNew = itemUsed + 0;
                    var canGetList = dbData["cGetList"] || {};
                    async.eachSeries(Object.keys(itemUseConfig), function(i, esCb){
                        // 检查满足
                        var subItemConfig = itemUseConfig[i];
                        var count = subItemConfig["count"];
                        itemUsedNew = itemUsed + numUsed;
                        if (itemUsed < count && itemUsedNew >= count) {
                            // 加入可领取列表
                            canGetList[count] = 1;
                        }
                        esCb(null);
                    }, function(err){
                        // 更新数据
                        dbData["cGetList"] = canGetList;
                        dbData["numUsed"] = itemUsedNew;
                        updateData(userUid, key, dbData, function(err, res){
                            cb(null);
                        });
                    });
                });
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    /**
     * 抽卡
     * @param userUid
     * @param summonStar
     * @param numUsed
     * @param callbackFn
     */
    this.summonTime = function(userUid, summonStar, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 召唤
            function(cb) {
                var summonConfig = null;
                if (configObj.hasOwnProperty("summonTime")) {
                    summonConfig = configObj["summonTime"];
                }

                // 获取当前星级的配置
                var newSummonConfig = [];
                for (var iKey in summonConfig) {
                    if (summonConfig.hasOwnProperty(iKey)) {
                        var sItem = summonConfig[iKey];
                        if (sItem["summonStar"] == summonStar) {
                            newSummonConfig.push(sItem);
                        }
                    }
                }
                summonConfig = newSummonConfig;

                // 更新
                if (summonConfig && summonConfig.length > 0) {
                    var subSummonConfig = summonConfig[0];
                    var key = subSummonConfig["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var itemUsed = dbData["numUsed"] || 0;
                            var itemUsedNew = itemUsed + 0;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(summonConfig), function(key, esCb){
                                // 检查满足
                                subSummonConfig = summonConfig[key];
                                var count = subSummonConfig["count"];
                                var star = subSummonConfig["summonStar"];
                                if (star == summonStar) {
                                    itemUsedNew = itemUsed + numUsed;
                                    if (itemUsed < count && itemUsedNew >= count) {
                                        // 加入可领取列表
                                        canGetList[count] = 1;
                                    }
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = itemUsedNew;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    };

    function foolishWheelPlay(userUid, times, callbackFn) {
        var configObj;
        async.series([
            // 获取配置
            function (cb) {
                getConfigObj(userUid, function (err, res) {
                    configObj = res;
                    cb(err);
                });
            },
            function (cb) {
                var foolishWheelConfig;
                if (configObj.hasOwnProperty("foolishWheel")) {
                    foolishWheelConfig = configObj["foolishWheel"];
                }
                if (foolishWheelConfig && foolishWheelConfig.length > 0) {
                    var subFoolishWheelConfig = foolishWheelConfig[0];
                    var key = subFoolishWheelConfig["key"];
                    queryData(userUid, key, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }
                            var dbData = res["data"] || {};
                            var foolishWheelTimes = dbData["numUsed"] || 0;
                            var foolishWheelTimesNew = foolishWheelTimes + times;
                            var canGetList = dbData["cGetList"] || {};
                            async.eachSeries(Object.keys(foolishWheelConfig), function (key, esCb) {
                                // 检查满足
                                subFoolishWheelConfig = foolishWheelConfig[key];
                                var count = subFoolishWheelConfig["count"];
                                if (foolishWheelTimes < count && foolishWheelTimesNew >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb();
                            }, function () {
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = foolishWheelTimesNew;
                                updateData(userUid, key, dbData, cb);
                            });
                        }
                    });
                } else {
                    cb();
                }
            }
        ], callbackFn);
    }

    this.foolishWheelPlay = foolishWheelPlay;

    /**
     * LUCK777x1
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    function lucky777x1(userUid, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 培养液消耗
            function(cb) {
                var lucky777Config = null;
                if (configObj.hasOwnProperty("useLucky777x1")) {
                    lucky777Config = configObj["useLucky777x1"];
                }

                if (lucky777Config && lucky777Config.length > 0) {
                    var subLucky777Config = lucky777Config[0];
                    var key = subLucky777Config["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var lucky777Used = dbData["numUsed"] || 0;
                            var lucky777NewUsed = lucky777Used + numUsed;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(lucky777Config), function(key, esCb){
                                // 检查满足
                                subLucky777Config = lucky777Config[key];
                                var count = subLucky777Config["count"];
                                if (lucky777Used < count && lucky777NewUsed >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = lucky777NewUsed;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    }

    /**
     * LUCK777x10
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    function lucky777x10(userUid, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 培养液消耗
            function(cb) {
                var lucky777Config = null;
                if (configObj.hasOwnProperty("useLucky777x10")) {
                    lucky777Config = configObj["useLucky777x10"];
                }

                if (lucky777Config && lucky777Config.length > 0) {
                    var subLucky777Config = lucky777Config[0];
                    var key = subLucky777Config["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var lucky777Used = dbData["numUsed"] || 0;
                            var lucky777NewUsed = lucky777Used + numUsed;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(lucky777Config), function(key, esCb){
                                // 检查满足
                                subLucky777Config = lucky777Config[key];
                                var count = subLucky777Config["count"];
                                if (lucky777Used < count && lucky777NewUsed >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = lucky777NewUsed;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    }

    /**
     * LUCK777x20
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    function lucky777x20(userUid, numUsed, callbackFn) {
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },

            // 培养液消耗
            function(cb) {
                var lucky777Config = null;
                if (configObj.hasOwnProperty("useLucky777x20")) {
                    lucky777Config = configObj["useLucky777x20"];
                }

                if (lucky777Config && lucky777Config.length > 0) {
                    var subLucky777Config = lucky777Config[0];
                    var key = subLucky777Config["key"];
                    queryData(userUid, key, function(err, res){
                        if (err) cb(err);
                        else {
                            // 检查数据过期
                            res = res || {};
                            var updateTime = res["updateTime"] || 0;
                            if (updateTime < _sTime) {
                                res = {};
                            }

                            var dbData = res["data"] || {};
                            var lucky777Used = dbData["numUsed"] || 0;
                            var lucky777NewUsed = lucky777Used + numUsed;
                            var canGetList = dbData["cGetList"] || {};

                            async.eachSeries(Object.keys(lucky777Config), function(key, esCb){
                                // 检查满足
                                subLucky777Config = lucky777Config[key];
                                var count = subLucky777Config["count"];
                                if (lucky777Used < count && lucky777NewUsed >= count) {
                                    // 加入可领取列表
                                    canGetList[count] = 1;
                                }
                                esCb(null);
                            }, function(err){
                                // 更新数据
                                dbData["cGetList"] = canGetList;
                                dbData["numUsed"] = lucky777NewUsed;
                                updateData(userUid, key, dbData, function(err, res){
                                    cb(null);
                                });
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        });
    }

    /**
     * LUCK777
     * @param userUid
     * @param numUsed
     * @param callbackFn
     */
    this.lucky777 = function(userUid, numUsed, callbackFn) {
        if (numUsed == 1) lucky777x1(userUid, 1, callbackFn);
        else if (numUsed == 10) lucky777x10(userUid, 1, callbackFn);
        else if (numUsed == 20) lucky777x20(userUid, 1, callbackFn);
        else callbackFn();
    };

    /*---------------------------------------------------------------------------*/

    /**
     * 获取可领取次数
     * @param userUid
     * @param callbackFn
     */
    this.hasRewardToGet = function(userUid, callbackFn) {
        var numToGet = 0;
        var configObj = null;
        async.series([
            // 获取配置
            function(cb) {
                getConfigObj(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        configObj = res;
                        cb(null);
                    }
                });
            },
            // 统计次数
            function(cb) {
                async.eachSeries(Object.keys(configObj), function(type, esCb){
                    switch (type) {
                        case "equipDefineAny":
                        case "equipDefineSpecify":
                        case "breakThroughAng":
                        case "breakThroughSpecify":
                        case "equipLevelUpAny":
                        case "equipLevelUpSpecify":
                        case "cardLevelUpAny":
                        case "cardLevelUpSpecify":
                        case "specialTeamLevelUpAny":
                        case "specialTeamLevelUpSpecify":
                            var configArr= configObj[type];
                            async.eachSeries(Object.keys(configArr), function(ciKey, esCb2){
                                var configItem = configArr[ciKey];
                                var key = configItem["key"];
                                queryData(userUid, key, function(err, res){
                                    if (!err) {
                                        res = res || {};
                                        // 判断数据项是否过期
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        // 获取该项数据可领取次数
                                        var dbData = res["data"] || {};
                                        var cGet = dbData["cGet"] || 0;

                                        // 统计数据
                                        numToGet += cGet;
                                    }

                                    esCb2(null);
                                });
                            }, function(err){
                                esCb(null);
                            });
                            break;

                        case "liquidConsume":
                        case "imeggaConsume":
                        case "itemUseSpecify":
                        case "useLucky777x1":
                        case "useLucky777x10":
                        case "useLucky777x20":
                            var configArr= configObj[type];
                            var key = configArr[0]["key"]; // 所有培养液使用相同KEY
                            queryData(userUid, key, function(err, res){
                                if (!err) {
                                    res = res || {};
                                    // 判断数据项是否过期
                                    var updateTime = res["updateTime"] || 0;
                                    if (updateTime < _sTime) {
                                        res = {};
                                    }

                                    // 获取该项数据可领取次数
                                    var dbData = res["data"] || {};
                                    var canGetList = dbData["cGetList"] || {};

                                    // 统计数据
                                    numToGet += Object.keys(canGetList).length;
                                }

                                esCb(null);
                            });
                            break;
                        case "summonTime":
                            var configArr= configObj[type];
                            // 统计不同的KEY
                            var keyArr = [];
                            for (var key in configArr) {
                                if (configArr.hasOwnProperty(key)) {
                                    var cItem = configArr[key];
                                    var iKey = cItem["key"];
                                    if (!arrayHasValue(keyArr, iKey)) {
                                        keyArr.push(iKey);
                                    }
                                }
                            }
                            async.eachSeries(Object.keys(keyArr), function(iKey, esCb2){
                                queryData(userUid, keyArr[iKey], function(err, res){
                                    if (!err) {
                                        res = res || {};
                                        // 判断数据项是否过期
                                        var updateTime = res["updateTime"] || 0;
                                        if (updateTime < _sTime) {
                                            res = {};
                                        }

                                        // 获取该项数据可领取次数
                                        var dbData = res["data"] || {};
                                        var canGetList = dbData["cGetList"] || {};

                                        // 统计数据
                                        numToGet += Object.keys(canGetList).length;
                                    }

                                    esCb2(null);
                                });
                            }, function(err){
                                esCb(null);
                            });
                            break;
                        default :
                            esCb(null);
                            break;
                    }
                }, function(err){
                    cb(null);
                });
            }
        ], function(err){
            if (err) {
                callbackFn(0);
            } else {
                callbackFn(numToGet);
            }
        });
    };

    /*---------------------------------------------------------------------------*/

    /**
     * 获取配置数据
     * @returns {{}}
     */
    this.getParameters = function() {
        return {
            "sTime" : _sTime,
            "eTime" : _eTime
        };
    };

    // 导出数据查询口
    this.queryData = queryData;
    // 导出数据更新接口
    this.updateData = updateData;
    // 导出配置获取接口
    this.getConfigObj = getConfigObj;
};