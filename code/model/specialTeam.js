/**
 * 特战队数据处理
 * User: joseppe
 * Date: 14-4-21
 * Time: 下午5:31
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
//var configManager = require("../config/configManager");
//var async = require("async");

function skipRedisModule(userUid) {
    var list = ["i"];
    var args = bitUtil.parseUserUid(userUid);
    if (list.indexOf(args[0]) >= 0) {
        return true;
    }
    return false;
}

/**
 * 取得特战队数据
 * @param userUid
 * @param callbackFn
 */
function get(userUid, callbackFn) {
    redis.user(userUid).h("specialTeam").getAllJSON(function (err, res) {
        if (res == null || skipRedisModule(userUid)) {
            var sql = "SELECT * FROM specialTeam WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) {
                    if (err) console.error(sql, err.stack);
                    callbackFn(err, null);
                } else if(res == null || res.length == 0) {
                    //redis.user(userUid).h("specialTeam").del();
                    callbackFn(null, []);
                } else {
                    var specialTeam = {};
                    for (var i = 0; i < res.length; i++ ) {
                        var data = res[i];

                        specialTeam[data["position"]] = {"userUid":data.userUid,"position":data.position, "heroUid":data.heroUid,"strong":data.strong/100,"level":data.level,"times":data.times};
                    }
                    if (skipRedisModule(userUid)) {
                        callbackFn(null, specialTeam);
                    } else {
                        redis.user(userUid).h("specialTeam").setAllJSON(specialTeam, function (err, res) {
                            callbackFn(null, specialTeam);
                            redis.user(userUid).h("specialTeam").expire(604800); //缓存7天
                        });
                    }
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
 * @param position 位置
 * @param callbackFn
 */
function updateByPosition(userUid, position, specialTeam, callbackFn) {
    var specialTeamDB = {"userUid":specialTeam.userUid,"heroUid":specialTeam.heroUid,"strong":specialTeam.strong*100,"level":specialTeam.level,"times":specialTeam.times};
    var sql = "UPDATE specialTeam SET ? WHERE userUid = " + mysql.escape(userUid) + " AND position = " + mysql.escape(position);
    mysql.game(userUid).query(sql, specialTeamDB, function (err, res) {
        if (err) {
            console.error("specialTeam.js", err.stack);
            callbackFn(err);
        } else {
            if (skipRedisModule(userUid)) {
                callbackFn(null);
            } else {
                redis.user(userUid).h("specialTeam").setJSON(position, specialTeam);
                callbackFn(null);
            }
        }
    });
}

function openPosition(userUid, position, callbackFn) {
    var specialTeamDB = {};
    specialTeamDB['userUid'] = userUid;
    specialTeamDB['position'] = position;
    specialTeamDB['heroUid'] = 0;
    specialTeamDB['strong'] = 0;
    specialTeamDB['level'] = 1;
    specialTeamDB['times'] = 0;
    var sql = "INSERT INTO specialTeam SET ?";
    mysql.game(userUid).query(sql, specialTeamDB, function (err, res) {
        if (err || skipRedisModule(userUid)) {
            console.error("specialTeam.js", err ? err.stack : "");
            callbackFn(err);
        } else {
            var specialTeam = {
                "userUid": userUid,
                "position": position,
                "heroUid": 0,
                "strong": 0,
                "level": 1,
                "times": 0
            };
            redis.user(userUid).h("specialTeam").setJSON(position, specialTeam);
            callbackFn(null);
        }
    });
}

function removeByPosition(userUid, position, callbackFn) {
    var sql = "DELETE FROM specialTeam WHERE userUid = " + mysql.escape(userUid) + " AND position = " + mysql.escape(position);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || skipRedisModule(userUid)) {
            callbackFn(err);
        } else {
            redis.user(userUid).h("specialTeam").hdel(position, callbackFn);
        }
    });
}

/**
 * 取用户数据中某域的数据
 */
function getByPosition(userUid, position, callbackFn) {
    get(userUid, function(err, res){
        if (err) {
            callbackFn(err, null);
        } else if(res == null || res[position] == undefined || skipRedisModule(userUid)) {
            var sql = "SELECT * FROM specialTeam WHERE userUid = " + mysql.escape(userUid) + " AND position = " + mysql.escape(position);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null || res.length == 0) {
                    callbackFn(err, null);
                } else {
                    var data = res[0];
                    var rdata = {
                        "userUid": data.userUid,
                        "position": data.position,
                        "heroUid": data.heroUid,
                        "strong": data.strong / 100,
                        "level": data.level,
                        "times": data.times
                    }
                    if (skipRedisModule(userUid)) {
                        callbackFn(null, rdata);
                    } else {
                        redis.user(userUid).h("specialTeam").setJSON(position, rdata, function (err, res) {
                            redis.user(userUid).h("specialTeam").expire(604800); //缓存7天
                            callbackFn(null, rdata);
                        });
                    }
                }
            });
        } else {
            callbackFn(null, res[position]);
        }
    });
}

function delSpecialTeam(userUid, callbackFn){
    var sql = "DELETE FROM specialTeam WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || skipRedisModule(userUid)) {
            console.error("specialTeam.js", err ? err.stack : "");
            callbackFn(err);
        } else {
            redis.user(userUid).h("specialTeam").del(callbackFn);
        }
    });
}

exports.get = get;
exports.updateByPosition = updateByPosition;
exports.getByPosition = getByPosition;
exports.openPosition = openPosition;
exports.removeByPosition = removeByPosition;
exports.delSpecialTeam = delSpecialTeam;
