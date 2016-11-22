/**
 * 用户数据处理
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午7:00
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var title = require("../model/titleModel");
var userVariable = require("../model/userVariable");

/**
 * @param userUid
 * @param userName
 * @param callbackFn
 */
function create(userUid, userName, platformId, pUserId, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var mBase = configData.getConfig("base");
    var initUserConfig = mBase["initUser"];
    var initUserData = {};
    initUserData["userUid"] = userUid;
    initUserData["userName"] = userName;
    initUserData["gold"] = initUserConfig["gold"];
    initUserData["ingot"] = initUserConfig["ingot"];
    initUserData["pvePower"] = initUserConfig["pvePower"];
    initUserData["pvpPower"] = initUserConfig["pvpPower"];
    initUserData["vip"] = initUserConfig["vip"];
    initUserData["lv"] = initUserConfig["lv"];
    initUserData["createTime"] = jutil.now();
    initUserData["platformId"] = platformId;
    initUserData["pUserId"] = pUserId;
    var sql = 'INSERT INTO user SET ?';
    mysql.game(userUid).query(sql, initUserData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, initUserData);
        }
    });
}


/**
 * 判断用户名是否存在
 * @param userName
 * @param callbackFn
 */
function userNameIsExist(userUid, userName, callbackFn) {
    mysql.dataIsExist(userUid, "user", "userName = " + mysql.escape(userName), function (err, res) {
        if (err) {
            callbackFn(null, 1);
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 通过userName返回userUid
 * @param userName
 * @param callbackFn
 */
function userNameToUserUid(country, city, userName, callbackFn) {
    var sql = "SELECT userUid FROM user WHERE userName like " + mysql.escape(userName);
    mysql.game(null, country, city).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 通过userUid返回userName
 * @param userUid
 * @param callbackFn
 */
function userUidToUserName(userUid, callbackFn) {
    var sql = "SELECT userName FROM user WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 通过userName返回userUid
 * @param userName
 * @param callbackFn
 */
function pUserIdToUserUid(country, city, pUserId, callbackFn) {
    var sql = "SELECT userUid FROM user WHERE pUserId = " + mysql.escape(pUserId);
    mysql.game(null, country, city).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res);
        }
    });
}


/**
 * 取得用户数据
 * @param userUid
 * @param callbackFn
 */
function getUser(userUid, callbackFn) {
    if (userUid < 10000) {
        callbackFn("userUid error");
        return;
    }

    redis.user(userUid).h("h_user").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM user WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null || res.length == 0) {
                    if (err) console.error(sql, err.stack);
                    callbackFn(err, null);
                } else {
                    var userData = res[0];
                    userData["userName"] = jutil.toBase64(userData["userName"]);
                    redis.user(userUid).h("h_user").setObj(userData, function (err, res) {
                        callbackFn(null, userData);
                        redis.user(userUid).h("h_user").expire(604800); //缓存7天
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 更新用户的数据
 * @param userUid
 * @param newValueData 用户的新数据key value
 * @param callbackFn
 */
function updateUser(userUid, newValueData, callbackFn) {

    // ADD BY LXB
    if (newValueData.hasOwnProperty("vip")) {
        var curVipLevel = newValueData["vip"];
        title.vipLevelChange(userUid, curVipLevel);
        achievement.vipGet(userUid, curVipLevel, function(){}); // 成就数据统计
        //getUser(userUid, function (err, res) {
        //stats.vip(userUid, "127.0.0.1", res, curVipLevel, ""); // 统计VIP变化
        //});
    }
    if (newValueData.hasOwnProperty("ingot") && (isNaN(newValueData["ingot"]) || newValueData["ingot"] == "NaN")) {
        callbackFn("DataError");
        return ;
    }
    if (newValueData.hasOwnProperty("gold") && (isNaN(newValueData["gold"]) || newValueData["gold"] == "NaN")) {
        callbackFn("DataError");
        return ;
    }
    // END

    var userData;
    async.series([
        function(cb) {
            getUser(userUid, function(err, res) {
                userData = res;
                cb(err, res);
            });
        },
        function(cb) {
            var mUserName = newValueData["userName"];
            if (mUserName != null) {
                newValueData["userName"] = jutil.toBase64(mUserName);
            }

            if (newValueData["exp"] != null) {
                var configData = configManager.createConfig(userUid);
                if(newValueData["lv"] == null) newValueData["lv"] = userData["lv"];
                if(newValueData["lv"] == 0) newValueData["lv"] = 1;
                var newLvExp = configData.userExpToLevel(newValueData["lv"], newValueData["exp"]);
                newValueData["lv"] = newLvExp[0];
                newValueData["exp"] = newLvExp[1];
                addRankingExp(userUid, newLvExp[2]);
                achievement.playerLevelUp(userUid, newValueData["lv"], function(){}); // 成就数据统计
            }

            redis.user(userUid).h("h_user").setObj(newValueData, function(err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    redis.user(userUid).h("h_user").expire(604800); //重新设置缓存，缓存7天

                    if (mUserName != null) {
                        newValueData["userName"] = mUserName;
                    }
                    //写入数据库
                    var sql = "UPDATE user SET ? WHERE userUid = " + mysql.escape(userUid);
                    mysql.game(userUid).query(sql, newValueData, function (err, res) {
                        if (err) {
                            console.error("user.js", err.stack);
                        }
                        cb(null, 1);
                    });
                }
            });
        }
    ], function(err, res) {
        callbackFn(err, newValueData);
    });
}


/**
 * 取用户数据中某域的数据
 */
function getUserDataFiled(userUid, filed, callbackFn) {
    redis.user(userUid).h("h_user").get(filed, function(err, res) {
        if (err) {
            callbackFn(err);
            return;
        }

        if (res == null) {
            getUser(userUid, function(err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, null);
                } else {
                    callbackFn(null, res[filed]);
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}


/**
 * 对用户数据的某个字段做更新处理
 */
function addUserData(userUid, filed, value, callbackFn) {
    getUserDataFiled(userUid, filed, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (isNaN(res) === false) {
                var mObj = {};
                mObj[filed] = res - 0 + (value - 0);
                updateUser(userUid, mObj, function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        callbackFn(null, mObj);
                    }
                });
            } else {
                callbackFn(null, 0);
            }
        }
    });
}


//取一个用户对应的一个平台ID
function getUserPlatformId(userUid, callbackFn) {
    userVariable.getPlatformId(userUid, function(err, res){
        if(err || res == null){
            var sql1 = "SELECT ownerId FROM userOwner WHERE userUid=" + mysql.escape(userUid) + " LIMIT 1";
            mysql.game(userUid).query(sql1, function (err, res) {
                if (err) callbackFn(err);
                else if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    var ownerId = res[0]["ownerId"];
                    var sql2 = "SELECT `pUserId`, `platformId`, `createTime` FROM user WHERE `id`=" + mysql.escape(ownerId);

                    var mCode = bitUtil.parseUserUid(userUid);
                    var mCountry = mCode[0];
                    mysql.loginDB(mCountry).query(sql2, function (err, res) {
                        if (err) callbackFn(err);
                        else if (res == null || res.length == 0) {
                            callbackFn(null, null);
                        } else {
                            callbackFn(null, res[0]);
                        }
                    });
                }
            });
        } else {
            var pCode = res.split('|');
            callbackFn(null, {"platformId":pCode[0],"pUserId":pCode[1]});
        }
    });
}


//取某个等级的用户列表返回10条数据
function getUserBylv(userUid, lv, limit, cb) {
    //var configData = configManager.createConfig(userUid);

    //var beginExp = configData.userLevelToExp(lv);
    //var endExp = configData.userLevelToExp(lv - 0 + 1);

    var sql = "SELECT userUid from user WHERE lv = " + lv + " LIMIT " + limit;
    mysql.game(userUid).query(sql, function (err, res) {
        cb(res);
    });
}

//搜索玩家名返回用户信息的接口
function getUidByName(userUid, userName, callbackFn) {
    var sql = "SELECT userUid from user WHERE userName = '" + userName + "' LIMIT 1";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            callbackFn(null, res[0]);
        }
    });
}


//var ranking50 = 0;//标记下50级玩家的

//玩家经验值改变记录的数值
function addRankingExp(userUid, exp) {
    //getUser(userUid, function (err, res) {
        //stats.exp(userUid, "127.0.0.1", res, "", exp);
    //});
//    if (exp < ranking50) return;
    redis.domain(userUid).z("levelRanking").revrange(50, 50, "WITHSCORES", function(err, res) {
        if (err) return;
        else {
            if (res == null || res.length == 0 || exp > res[1]) { //如果第51名经验，小于当前玩家经验
                redis.domain(userUid).s("dayRanking:" + jutil.day()).exists(function(err, res) {
                    if (err) return;
                    else if (res == 0) { //如果今日排名不存在，则写入今日排名
                        redis.domain(userUid).z("levelRanking").revrange(0, 49, "WITHSCORES", function(err, res) {
                            redis.domain(userUid).s("dayRanking:" + jutil.day()).setObj(res);
                            redis.domain(userUid).s("dayRanking:" + jutil.day()).expire(604800); //保留7天
                            redis.domain(userUid).z("levelRanking").add(exp, userUid);
                        });
                    } else {
                        redis.domain(userUid).z("levelRanking").add(exp, userUid);  //永不过期
                    }
                });
//                ranking50 = res[1];
            }
        }
    });
}

function getInformation(userUid, callbackFn) {
    redis.user(userUid).h("h_user_info").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM userInformation WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null || res.length == 0) {
                    if (err) console.error(sql, err.stack);
                    callbackFn(err, null);
                } else {
                    var information = res[0];
                    redis.user(userUid).h("h_user_info").setObj(information, function (err, res) {
                        information["name"] = jutil.toBase64(information["name"]);
                        callbackFn(null, information);
                        redis.user(userUid).h("h_user_info").expire(604800); //缓存7天
                    });
                }
            });
        } else {
            res["name"] = jutil.toBase64(res["name"]);
            callbackFn(null, res);
        }
    });
}

function setInformation(userUid, info, callbackFn) {
    getInformation(userUid, function(err, res){
        if (err){
            callbackFn(err);
        } else if(res == null || res.length == 0) {
            var sql = 'INSERT INTO userInformation SET ?';
            info['userUid'] = userUid;
            mysql.game(userUid).query(sql, info, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    //callbackFn(null, info);
                    redis.user(userUid).h("h_user_info").setObj(info, function (err, res) {
                        callbackFn(null, info);
                        redis.user(userUid).h("h_user_info").expire(604800); //缓存7天
                    });
                }
            });
        } else {
            var sql = "UPDATE userInformation SET ? WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, info, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    //callbackFn(null, info);
                    info['userUid'] = userUid;
                    redis.user(userUid).h("h_user_info").setObj(info, function (err, res) {
                        callbackFn(null, info);
                        redis.user(userUid).h("h_user_info").expire(604800); //缓存7天
                    });
                }
            });
        }
    });
}
/*
function getDevice(userUid, callbackFn){
    redis.user(userUid).s("pushToken").get(callbackFn);
}

function setDevice(userUid, p, device){
    device = device.replace(/[\<\>\ ]/g, '');
    redis.user(userUid).s("pushToken").set(p+'|'+device);
}
*/

function setToken(country, platformId, platformUserId, token, callbackFn) {
    var key = "pushToken:pid:"+platformId+":pUid:"+platformUserId;
    token = token.replace(/[\<\>\ ]/g, '');
    redis.login(country).s(key).set(token, callbackFn);
}

function getToken(userUid, callbackFn) {
    getUser(userUid, function(err, res){
        if(err || res == null){
            callbackFn("userError");
        } else {
            var key = "pushToken:pid:"+res['platformId']+":pUid:"+res['pUserId'];
            redis.loginFromUserUid(userUid).s(key).get(callbackFn);
        }
    })
}


/**
 *
 * @param userUid
 * @param key
 * @param callbackFn
 */
function lock(userUid, key, callbackFn) {
    redis.user(userUid).s("lock" + key).lock(callbackFn);
}


function unlock(userUid, key, callbackFn) {
    redis.user(userUid).s("lock" + key).unlock(callbackFn);
}




exports.create = create;
exports.userNameIsExist = userNameIsExist;
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.addUserData = addUserData;
exports.userNameToUserUid = userNameToUserUid;
exports.getUserPlatformId = getUserPlatformId;
exports.getUserBylv = getUserBylv;
exports.getUidByName = getUidByName;
exports.getUserDataFiled = getUserDataFiled;
exports.addRankingExp = addRankingExp;
exports.getInformation = getInformation;
exports.setInformation = setInformation;
exports.setToken = setToken;
exports.getToken = getToken;
exports.pUserIdToUserUid = pUserIdToUserUid;
exports.userUidToUserName = userUidToUserName;

exports.lock = lock;
exports.unlock = unlock;





//    var sql = "SELECT " + filed + " FROM user WHERE userUid=" + mysql.escape(userUid);
//    mysql.game(userUid).query(sql, function (err, res) {
//        if (err || res == null || res.length == 0) callbackFn(err);
//        else {
//            var dataValue = res[0][filed];
//            var dataNewValue = dataValue - 0 + (value - 0);
//            var dataNewObj = {};
//            dataNewObj[filed] = dataNewValue;
//            updateUser(userUid, dataNewObj, function (err, res) {
//                if (err) callbackFn(err);
//                else {
//                    callbackFn(null, dataNewObj);
//                }
//            });
//        }
//    });



/**
 * 判断redis是否存在此玩家数据，存在则返回1
 * 如果redis不存在此玩家数据，则从mysql中取玩家数据并返回数据
 */
//function mysqlToRedis(userUid, callbackFn) {
//    redis.user(userUid).h("h_user").exists(function(err, res) {
//        if (err) callbackFn(err);
//        else {
//            if (res == 1) {
//                callbackFn(null, 1);
//            } else {
//                var sql = "SELECT * FROM user WHERE userUid = " + mysql.escape(userUid);
//                mysql.game(userUid).query(sql, function (err, res) {
//                    if (err || res == null || res.length == 0) {
//                        if (err) console.error(sql, err.stack);
//                        callbackFn(err, null);
//                    } else {
//                        var userData = res[0];
//                        userData["userName"] = jutil.toBase64(userData["userName"]);
//                        redis.user(userUid).h("h_user").setObj(userData, function (err, res) {
//                            callbackFn(null, userData);
//                            redis.user(userUid).h("h_user").expire(604800); //缓存7天
//                        });
//                    }
//                });
//            }
//        }
//    });
//}
//
