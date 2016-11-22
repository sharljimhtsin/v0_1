/**
 * 技能数据处理
 * User: liyuluan
 * Date: 13-10-14
 * Time: 下午12:09
 */

var mysql = require("../alien/db/mysql");
var modelUtil = require("../model/modelUtil");
var redis = require("../alien/db/redis");
var achievement = require("../model/achievement");
var configManager = require("../config/configManager");

function addSkill(userUid, skillId, exp, level, callbackFn) {
    redis.getNewId(userUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var sql = 'INSERT INTO skill SET ?';
            var newData = {};
            newData["userUid"] = userUid;
            newData["skillUid"] = (res - 0);
            newData["skillId"] = skillId;
            newData["skillExp"] = exp;
            newData["skillLevel"] = level;
            mysql.game(userUid).query(sql, newData, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    // 成就-技能 数据统计
                    var configData = configManager.createConfig(userUid);
                    var skillConfig = configData.getConfig("skill");
                    var skillData = skillConfig[skillId];
                    if (skillData["star"] == 4) { // S 技能
                        achievement.skillGet(userUid, 1, function () {
                            callbackFn(null, newData);
                        });
                    } else {
                        callbackFn(null, newData);
                    }
                }
            });
        }
    });
}

function getSkill(userUid, callbackFn) {
    modelUtil.getData("skill", userUid, callbackFn, "skillUid");
}


/**
 * 删除某一个技能
 * @param userUid
 * @param skillUid
 * @param callbackFn
 */
function removeSkill(userUid, skillUid, callbackFn) {
    var sql = "DELETE FROM skill WHERE userUid = " + mysql.escape(userUid) + " AND skillUid = " + mysql.escape(skillUid);
    mysql.game(userUid).query(sql, function (err, res) {
        callbackFn(err, 1);
    });
}


/**
 * 更新技能数据
 * @param userUid
 * @param skillUid
 * @param skillData
 * @param callbackFn
 */
function updateSkill(userUid, skillUid, skillData, callbackFn) {
    var sql = "UPDATE skill SET ? WHERE userUid = " + mysql.escape(userUid) + " AND skillUid = " + mysql.escape(skillUid);
    var newData = skillData;
    mysql.game(userUid).query(sql, newData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            if (newData.hasOwnProperty("skillLevel")) { // 有修改技能等级
                if (newData.hasOwnProperty("skillId")) { // 有技能ID参数
                    var skillId = newData["skillId"];
                    var skillLevel = newData["skillLevel"];

                    var configData = configManager.createConfig(userUid);
                    var skillConfig = configData.getConfig("skill");
                    var skillData = skillConfig[skillId];
                    if (skillData["star"] == 4) { // S 技能
                        achievement.skillLevelUp(userUid, skillLevel, callbackFn);
                    } else {
                        callbackFn(null, 1);
                    }
                } else {
                    sql = "SELECT skillId FROM skill WHERE userUid = " + mysql.escape(userUid) + " AND skillUid = " + mysql.escape(skillUid);
                    mysql.game(userUid).query(sql, newData, function (err, res) {
                        if (!err && res) {
                            if (res.length > 0) {
                                var skillId = res[0]["skillId"];
                                var skillLevel = newData["skillLevel"];
                                var configData = configManager.createConfig(userUid);
                                var skillConfig = configData.getConfig("skill");
                                var skillData = skillConfig[skillId];
                                if (skillData["star"] == 4) { // S 技能
                                    achievement.skillLevelUp(userUid, skillLevel, function () {
                                        callbackFn(null, 1);
                                    });
                                } else {
                                    callbackFn(null, 1);
                                }
                            } else {
                                callbackFn(null, 1);
                            }
                        } else {
                            callbackFn(null, 1);
                        }
                    });
                }
            } else {
                callbackFn(null, 1);
            }
        }
    });
}

/**
 * 取得技能触发参数
 * @param userUid
 * @param skillUid
 * @param callbackFn
 */
function getSkillTrigger(userUid, formationUid, skillUid, callbackFn) {
    redis.user(userUid).s("skillTrigger:" + formationUid + ":" + skillUid).getObj(function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            if (res == null) {
                callbackFn(null, {"skillProp": 0, "skillCount": 0, "skillTime": 0});
            } else {
                callbackFn(null, res);
            }
        }
    });
}

/**
 * 设置技能触发参数
 */
function setSkillTrigger(userUid, formationUid, skillUid, skillProp, skillCount, skillTime, callbackFn) {
    var obj = {};
    obj["skillPro"] = skillProp;
    obj["skillCount"] = skillCount;
    obj["skillTime"] = skillTime;
    redis.user(userUid).s("skillTrigger:" + formationUid + ":" + skillUid).setObj(obj, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, res);
        }
        redis.user(userUid).s("skillTrigger:" + formationUid + ":" + skillUid).expire(86400, function () {
        });
    });
}


exports.addSkill = addSkill;
exports.getSkill = getSkill;
exports.updateSkill = updateSkill;
exports.removeSkill = removeSkill;
exports.getSkillTrigger = getSkillTrigger;
exports.setSkillTrigger = setSkillTrigger;