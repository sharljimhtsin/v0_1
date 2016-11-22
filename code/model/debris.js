/**
 * 技能碎片的数据层
 * User: liyuluan
 * Date: 13-11-5
 * Time: 下午9:26
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");

/**
 * 增加技能碎片的方法
 * @param userUid
 * @param skillId
 * @param type 值为type1 type2 type3 type4 type5 type6
 * @param operand 可合成数，不增加时添0
 * @param callbackFn
 */
function addDebris(userUid, skillId, type, count, operand, callbackFn) {
    var sqlWhere = "userUid=" + mysql.escape(userUid) + " AND skillId=" + mysql.escape(skillId);
    var sql = "SELECT * FROM debris WHERE " + sqlWhere;
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err, res);
        else {
            if (res == null || res.length == 0) {
                var insertSql = "INSERT INTO debris SET ?";
                var insertData = {};
                insertData["userUid"] = userUid;
                insertData["skillId"] = skillId;
                insertData["type1"] = 0;
                insertData["type2"] = 0;
                insertData["type3"] = 0;
                insertData["type4"] = 0;
                insertData["type5"] = 0;
                insertData["type6"] = 0;
                insertData[type] = (count < 0) ? 0 : count;
                insertData["operand"] = operand;
                mysql.game(userUid).query(insertSql, insertData, function (err, res) {
                    if (err) callbackFn(err, null);
                    else {
                        insertData["debris"] = true;
                        callbackFn(null, insertData);
                    }
                });
            } else {
                var oldData = res[0];
                var updateSql = "UPDATE debris SET ? WHERE " + sqlWhere;
                var updateData = {};
                updateData["type1"] = oldData["type1"] - 0;
                updateData["type2"] = oldData["type2"] - 0;
                updateData["type3"] = oldData["type3"] - 0;
                updateData["type4"] = oldData["type4"] - 0;
                updateData["type5"] = oldData["type5"] - 0;
                updateData["type6"] = oldData["type6"] - 0;
                updateData["operand"] = oldData["operand"] - 0 + operand;
                var newCount = oldData[type] - 0 + count;
                updateData[type] = (newCount < 0 ) ? 0 : newCount;
                mysql.game(userUid).query(updateSql, updateData, function (err, res) {
                    if (err) callbackFn(err, null);
                    else {
                        updateData["userUid"] = userUid;
                        updateData["skillId"] = skillId;
                        updateData["debris"] = true;
                        callbackFn(null, updateData);
                    }
                });
            }
        }
    });
}
/**
 * 删除某一个技能碎片
 * @param userUid
 * @param skillId
 * @param callbackFn
 */
function removeSkillPatch(userUid, skillId, callbackFn) {
    var sql = "DELETE FROM debris WHERE userUid = " + mysql.escape(userUid) + " AND skillId = " + mysql.escape(skillId);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, 1);
        }
    });
}
/**
 * 取某个技能的碎片列表
 * @param userUid
 * @param skillId
 * @param callbackFn
 */
function getDebrisItem(userUid, skillId, callbackFn) {
    var sql = "SELECT * FROM debris WHERE userUid=" + mysql.escape(userUid) + " AND skillId=" + mysql.escape(skillId);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(err, res[0]);
        }
    });
}

/**
 * 更新某个技能的碎片数据（如果没有此技能项则报错） ,成功返回1
 * @param userUid
 * @param skillId
 * @param debrisData
 * @param callbackFn
 */
function updateDebrisItem(userUid, skillId, debrisData, callbackFn) {
    var sql = "UPDATE debris SET ? WHERE userUid=" + mysql.escape(userUid) + " AND skillId=" + mysql.escape(skillId);
    mysql.game(userUid).query(sql, debrisData, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            callbackFn(null, 1);
        }
    });
}

/**
 * 取玩家所有技能碎片列表
 * @param userUid
 * @param callbackFn
 */
function getDebrisList(userUid, callbackFn) {
    var sql = "SELECT * FROM debris WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null) callbackFn(err, res);
        else {
            callbackFn(err, res);
        }
    });
}


/**
 * 返回一个碎片的1个拥有者列表
 * @param skillId 技能ID
 * @param type 类别
 * @param ownerExpS 拥有者的经验区间开始值
 * @param ownerExpE 拥有者的经验区间结束值
 * @param callbackFn
 */
function debrisOwner(userUid, skillId, type, ownerExpS, ownerExpE, amount, callbackFn) {
    var arr = []; // async循环用，无其它意义
    for (var i = 0; i < amount; i++) {
        arr.push(i);
    }

    var resultArray = [];
    var mysqlClient = mysql.game(userUid);

    async.forEach(arr, function (item, forCb) {
        var minValue = Math.floor((ownerExpE - ownerExpS) * Math.random());
        var sql = "SELECT debris.userUid as userUid FROM debris LEFT JOIN user ON debris.userUid =user.userUid ";
        sql += "WHERE skillId=" + mysql.escape(skillId) + " AND type" + mysql.escape(type) + ">0 ";
        sql += "AND exp>" + minValue + " AND exp<" + ownerExpE + " LIMIT 1";

        mysqlClient.query(sql, function (err, res) {
            if (err) forCb(err);
            else {
                if (res != null && res.length > 0) {
                    var cUserUid = res[0]["userUid"];
                    var isExist = false;
                    for (var i = 0; i < resultArray.length; i++) {
                        if (resultArray[i] == cUserUid) {
                            isExist = true;
                            break;
                        }
                    }
                    if (isExist == false) resultArray.push(cUserUid);
                }
                forCb(null);
            }
        });
    }, function (err) {
        if (err) callbackFn(err);
        else callbackFn(null, resultArray);
    });
}

/**
 * 添加可抢夺目标到缓存
 * @param userUid
 * @param data
 * @param [callbackFn]
 */
function addGrabTarget(userUid, data) {
    redis.user(userUid).s("grabTarget").setObj(data, function (err, res) {
    });
}


/**
 * 取缓存中的抢夺目标
 * @param userUid
 * @param callbackFn
 */
function getGrabTarget(userUid, callbackFn) {
    redis.user(userUid).s("grabTarget").getObj(function (err, res) {
        callbackFn(err, res);
    });
}


exports.getDebrisItem = getDebrisItem;
exports.addDebris = addDebris;
exports.getDebrisList = getDebrisList;
exports.updateDebrisItem = updateDebrisItem;
exports.debrisOwner = debrisOwner;
exports.addGrabTarget = addGrabTarget;
exports.getGrabTarget = getGrabTarget;
exports.removeSkillPatch = removeSkillPatch;
