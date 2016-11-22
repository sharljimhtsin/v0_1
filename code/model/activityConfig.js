/**
 * User: liyuluan
 * Date: 14-2-16
 * Time: 下午2:40
 */


var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");


var configVersion = {};
var configDic = {};

/**
 * 取某个活动的配置 返回  [是否开启，  活动参数， 数据库中配置， 静态配置，开始时间 ， 结束时间]
 * 活动参数 : 为运营人员配置的用切换配置的设置
 * 数据库中配置 ： 为运营人员配置在数据库的关于当前活动的相关参数
 * 静态配置 :  程序包中的静态文件
 *
 * @param name
 * @param callbackFn
 */
function getConfig(userUid, name, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCodeStr = mCode[0] + mCode[1];
    _getAllConfig(userUid, function(err, res) {
        var isOpen = false;
        var sTime = 0;
        var eTime = 0;
        var arg = "0";
        var aConfig = null;
        var jsonConfig;
        if (configDic[mCodeStr] != null && configDic[mCodeStr][name] != null) {
            var mConfig = configDic[mCodeStr][name];
            sTime = mConfig["sTime"];
            eTime = mConfig["eTime"];
            var mNow = jutil.now();
            if (mNow > sTime && mNow < eTime) {
                isOpen = true;
            }
            arg = mConfig["arg"];
            aConfig = mConfig["config"];
        }
        var configData  = configManager.createConfig(userUid);
        jsonConfig = configData.getConfig(name);
        callbackFn(null, [isOpen, arg, aConfig, jsonConfig, sTime, eTime]);
    });
}


//取得活动数据库的配置
function _getAllConfig(userUid, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCodeStr = mCode[0] + mCode[1];

    redis.domain(userUid).s("activityCV").get(function(err, res) {
        if (res == null || configVersion[mCodeStr] != res ) { //如果当前配置版本发生变化则重读配置
            var sql = "SELECT * FROM activityConfig";
            var mV = res;
            mysql.game(userUid).query(sql, function(err, res) {
                if (err) callbackFn(err);
                else {
                    var mRes = res;
                    if (res != null && res.length == 0) mRes = null;

                    configVersion[mCodeStr]  = mV;
                    configDic[mCodeStr] = _configArrayToObject(mRes);
                    callbackFn(null, mRes);
                }
            });
        } else {
            callbackFn(null, configDic[mCodeStr]);
        }
    });
}

//将数据库返回的数据转为以配置名为key 的 键值
function _configArrayToObject(arr) {
    if (arr == null) return null;

    var returnObj = {};
    for (var i = 0; i < arr.length; i++) {
        var mItem = arr[i];
        var mName = mItem["name"];
        if (mItem["config"] != "") {
            try {
                mItem["config"] = JSON.parse(mItem["config"]);
            } catch(err) {
                mItem["config"] = null;
            }
        } else {
            mItem["config"] = null;
        }
        returnObj[mName] = mItem;
    }
    return returnObj;
}






function getAllConfig(userUid, callbackFn) {
    var mNow = jutil.now();
    var sql = "SELECT config,`name`,eTime FROM activityConfig WHERE sTime<=" + mNow + " AND eTime>=" + mNow ;

    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) callbackFn(null, null);
        else {
            callbackFn(null, res);
        }
    });
}



/////////////////////////////////////////////////////////////////////后台配置管理

//返回所有的活动配置
function getAllConfigByCC(country, city, callbackFn) {
    var sql = "SELECT * FROM activityConfig";

    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) callbackFn(null, null);
        else {
            callbackFn(null, res);
        }
    });
}


//添加一个配置
function addConfig(country, city, data, callbackFn) {
    var sql = "REPLACE INTO activityConfig SET ?";
    mysql.game(null, country, city).query(sql, data, function(err, res) {
        if (err) callbackFn(err);
        else {
            redis.domain(country, city).s("activityCV").incr();
            getAllConfigByCC(country, city, function(err, res) {
                callbackFn(null, res);
            });
        }
    });
}

//更新配置
function updateConfig(country, city, name, data, callbackFn) {
    var sql = "UPDATE activityConfig SET ? WHERE name=" + mysql.escape(name);
    mysql.game(null, country, city).query(sql, data, function(err, res) {
        if (err) callbackFn(err);
        else {
            redis.domain(country, city).s("activityCV").incr();
            if (res["affectedRows"] > 0) {
                getAllConfigByCC(country, city, function(err, res) {
                    callbackFn(null, res);
                });
            } else {
                callbackFn(null, 0);
            }
        }
    });
}

//删除配置
function delConfig(country, city, name, callbackFn) {
    var sql = "DELETE FROM activityConfig WHERE name=" + mysql.escape(name);
    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            redis.domain(country, city).s("activityCV").incr();
            callbackFn(null);
        }
    });
}


/**
 * 验证arg参数是否存在
 * @param name
 * @param arg
 * @returns {*}
 */
function argVerify(name, arg) {
    switch (name) {
        case "box":
            return _argVerify_box(arg);
        case "activityLoot":
            return _argVerify_activityLoot(arg);
        default :
            return _argVerify_default(arg, name);
    }

    return false;
}


function _argVerify_box(arg) {
    var configData = configManager.createConfigFromCountry("a");
    var mConfig = configData.g("box")("goodBoxProb")(arg)();
    if (mConfig == null) {
        return false;
    } else {
        return true;
    }
}


function _argVerify_activityLoot(arg) {
    var configData = configManager.createConfigFromCountry("a");
    var mConfig = configData.g("activityLoot")(arg)();
    if (mConfig == null) {
        return false;
    } else {
        return true;
    }
}

function _argVerify_default(arg, fileName) {
    var configData = configManager.createConfigFromCountry("a");
    var mConfig = configData.g(fileName)(arg)();
    if (mConfig == null) {
        return false;
    } else {
        return true;
    }
}


/////////////////////////////////////验证config有效性

/**
 * 通过管理工具提交的配置验证， name 为 配置名， config 为 配置内容
 * @param name
 * @param config
 */
function configVerify(name, config) {
    switch (name) {
        case "box":
            return _configVerify_box(config);
        case "activityLoot":
            return  _configVerify_activityLoot(config);
        case "summonSoul":
            return _configVerify_summonSoul(config);
        case "totalConsume":
            return _configVerify_totalConsume(config);
        case "totalRecharge":
            return _configVerify_totalRecharge(config);
    }

    return null;
}


//开宝箱活动
function _configVerify_box(config) {
    if (config == "") return true;
    else {
        try {
            var configJSON = JSON.parse(config);
        } catch (err) {
            return false;
        }

        if (configJSON["150301"] instanceof Array == false) {
            return false;
        }

        if (configJSON["150302"] instanceof Array == false) {
            return false;
        }

        if (configJSON["150303"] instanceof Array == false) {
            return false;
        }

        if (configJSON["150304"] instanceof Array == false) {
            return false;
        }

        return true;
    }
}

//战斗掉落活动
function _configVerify_activityLoot(config) {
    if (config == "") return true;
    try {
        var configJSON = JSON.parse(config);
    } catch (err) {
        return false;
    }


    for (var key in configJSON) {
        var mItem = configJSON[key];
        if (mItem["id"] == null || mItem["count"] == null || mItem["minProb"] == null || mItem["maxProb"] == null) {
            return false;
        }
    }
    return true;
}


//抽卡送魂活动
function _configVerify_summonSoul(config) {
    if (config == "") return true;
    if (config == null) return false;

    try {
        var configJSON = JSON.parse(config);
    } catch (err) {
        return false;
    }

    if (configJSON["seniorSummon"] instanceof Array == false) {
        return false;
    }

    if (configJSON["ultimateSummon"] instanceof Array == false) {
        return false;
    }

    return true;
}


//累积消费活动
function _configVerify_totalConsume(config) {
    if (config == "") return true;

    try {
        var configJSON = JSON.parse(config);
    } catch (err) {
        return false;
    }

    if (configJSON["list"] instanceof Array == false) {
        return false;
    }

    if (typeof configJSON["rankPersonCount"] !== "number") {
        return false;
    }


    if (configJSON["rankReward"] instanceof Array == false) {
        return false;
    }

    return true;
}

//累积充值活动
function _configVerify_totalRecharge(config) {
    if (config == "") return true;

    try {
        var configJSON = JSON.parse(config);
    } catch (err) {
        return false;
    }


    if (configJSON["list"] instanceof Array == false) {
        return false;
    }

    return true;
}



exports.getConfig = getConfig;
exports.getAllConfig = getAllConfig;
exports.getAllConfigByCC = getAllConfigByCC;
exports.addConfig = addConfig;
exports.updateConfig = updateConfig;
exports.delConfig = delConfig;
exports.configVerify = configVerify;
exports.argVerify = argVerify;