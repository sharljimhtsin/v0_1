/**
 * 编队的数据处理
 * User: liyuluan
 * Date: 13-10-12
 * Time: 下午3:09
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");


/**
 * 添加一个武将到编队（如果队列中已存在编队ID则替换，否则添加一个新编号）
 * @param userUid
 * @param formationUid
 * @param heroId
 * @param callbackFn
 */
function addHeroToFormation(userUid, formationUid, heroUid, callbackFn) {
    var sqlWhere = "userUid = " + mysql.escape(userUid) + " AND formationUid = " + mysql.escape(formationUid);
    mysql.dataIsExist(userUid, "formation", sqlWhere, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var sql;
            var newData = {};
            newData["userUid"] = userUid;
            newData["formationUid"] = formationUid;
            newData["heroUid"] = heroUid;
            if (res == 1) { //已存在的编队号
                sql = "UPDATE formation SET ? WHERE " + sqlWhere;
            } else {
                sql = "INSERT INTO formation SET ? ";
            }
            mysql.game(userUid).query(sql, newData, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    callbackFn(null, newData);
                }
                redis.user(userUid).s("formation").del();//清除缓存中的数据
                redis.user(userUid).s("pvpUser").del();//清除pvpUser的编队缓存
            });
        }
    });
}

function addHeroToGlobalFormation(userUid, formationData, callbackFn) {
    var newData = {"userUid": userUid};
    for (var i in formationData) {
        newData["formationUid" + (i - 0 + 1)] = formationData[i];
    }
    var sql = "REPLACE INTO globalFormation SET ?";
    mysql.game(userUid).query(sql, newData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, newData);
        }
        redis.user(userUid).s("globalFormation").del();//清除缓存中的数据
    });
}

/**
 * 添加装备（技能、命格）到编队
 * @param userUid
 * @param formationUid  编队的ID
 * @param position 装备位置 ，【equip1 equip2    equip3】
 * @param uid 装备的唯一ID
 * @param callbackFn
 */
function addPropsToFormation(userUid, formationUid, position, uid, callbackFn) {
    var sql = "UPDATE formation SET ? WHERE userUid = " + mysql.escape(userUid) + "AND formationUid = " + mysql.escape(formationUid);
    var data = {};
    data[position] = uid;
    mysql.game(userUid).query(sql, data, function (err, res) {
        callbackFn(err, res);
        redis.user(userUid).s("formation").del();
    });
}

/**
 * 将一个装备(技能、合格）移除
 * @param userUid
 * @param formationUid
 * @param position
 * @param callbackFn
 */
function removePropsFromFormation(userUid, formationUid, position, callbackFn) {
    var sql = "UPDATE formation SET ? WHERE userUid = " + mysql.escape(userUid) + "AND formationUid = " + mysql.escape(formationUid);
    var data = {};
    data[position] = 0;
    mysql.game(userUid).query(sql, data, function (err, res) {
        callbackFn(err, res);
        redis.user(userUid).s("formation").del();
    });
}

//清空阵位信息
function removeFormation(userUid, formationUid, callbackFn) {
    var sql = "DELETE FROM formation WHERE userUid = " + mysql.escape(userUid) + " AND formationUid = " + mysql.escape(formationUid);
    mysql.game(userUid).query(sql, function (err, res) {
        redis.user(userUid).s("formation").del(callbackFn);
        redis.user(userUid).s("pvpUser").del();
    });
}

/**
 * 取玩家的编队列表
 * @param userUid
 */
function getUserFormation(userUid, callbackFn) {
    redis.user(userUid).s("formation").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM formation WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res == null) {
                    callbackFn(err, null);
                } else {
                    var formationObj = {};
                    for (var i = 0; i < res.length; i++) {
                        var mItem = res[i];
                        formationObj[mItem["formationUid"]] = mItem;
                    }
                    redis.user(userUid).s("formation").setObj(formationObj, function (err, res) {
                        callbackFn(null, formationObj);
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

function getGlobalFormation(userUid, callbackFn) {
    redis.user(userUid).s("globalFormation").getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM globalFormation WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res.length == 0) {
                    callbackFn("dbError");
                } else {
                    var formationObj = {};
                    var formationData = res[0];
                    var i;
                    for (i = 1; i <= 8; i++) {
                        if (formationData["formationUid" + i] == 0)break;
                        var mItem = {
                            "userUid": userUid,
                            "formationUid": i,
                            "heroUid": formationData["formationUid" + i],
                            "skill2": "",
                            "skill3": "",
                            "equip1": "",
                            "equip2": "",
                            "equip3": "",
                            "card1": "",
                            "card2": "",
                            "card3": "",
                            "card4": "",
                            "card5": "",
                            "card6": ""
                        };
                        formationObj[i] = mItem;
                    }
                    if (i > 1) {
                        redis.user(userUid).s("globalFormation").setObj(formationObj, function (err, res) {
                            callbackFn(null, formationObj);
                        });
                    } else {
                        callbackFn("noFormation");
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 安排新的队列
 * @param order
 * @param callbackFn
 */
function arrangeFormation(userUid, order, callbackFn) {
    getUserFormation(userUid, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            var oldFormation = res;
            async.forEach(order, function (item, forCb) {
                var oldUid = item["old"];
                var newUid = item["new"];
                if (oldUid != newUid) {
                    var formationData = copyFormationData(oldFormation[oldUid]);
                    if (formationData == null) {
                        forCb("dbError");
                    } else {
                        var sql = "UPDATE formation SET ? WHERE userUid = " + mysql.escape(userUid) + "AND formationUid = " + mysql.escape(newUid);
                        mysql.game(userUid).query(sql, formationData, function (err, res) {
                            if (err) forCb("dbError");
                            else {
                                forCb(null);
                            }
                        });
                    }
                } else {
                    forCb(null);
                }
            }, function (err) {
                if (err) callbackFn(err, null);
                else {
                    redis.user(userUid).s("formation").del();
                    callbackFn(null, 1);
                }

            });
        }
    });
}

function copyFormationData(oldData) {
    if (oldData == null) return null;
    var newData = {};
    newData["heroUid"] = oldData["heroUid"];
    newData["skill2"] = oldData["skill2"];
    newData["skill3"] = oldData["skill3"];
    newData["equip1"] = oldData["equip1"];
    newData["equip2"] = oldData["equip2"];
    newData["equip3"] = oldData["equip3"];
    newData["card1"] = oldData["card1"];
    newData["card2"] = oldData["card2"];
    newData["card3"] = oldData["card3"];
    newData["card4"] = oldData["card4"];
    newData["card5"] = oldData["card5"];
    newData["card6"] = oldData["card6"];
    return newData;
}

//取一个玩家的编队 1 的heroId
function getUserHeroId(userUid, callbackFn) {
    var sql = "SELECT heroUid FROM formation WHERE userUid=" + mysql.escape(userUid) + " AND formationUid=1";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            var heroUid = res[0]["heroUid"];
            var sql2 = "SELECT heroId FROM hero WHERE heroUid=" + mysql.escape(heroUid);
            mysql.game(userUid).query(sql2, function (err, res) {
                if (err) callbackFn(err);
                else if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    callbackFn(null, res[0]["heroId"]);
                }
            });
        }
    });
}

//取一个玩家的所有编队的heroId
function getUserHeroIds(userUid, callbackFn) {
    var sql = "SELECT heroUid FROM formation WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err);
        } else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            var list = [];
            async.eachSeries(res, function (row, eCb) {
                var heroUid = row["heroUid"];
                var sql2 = "SELECT heroId FROM hero WHERE heroUid=" + mysql.escape(heroUid);
                mysql.game(userUid).query(sql2, function (err, res) {
                    if (err) {
                        eCb(err);
                    } else if (res == null || res.length == 0) {
                        eCb();
                    } else {
                        list.push(res[0]["heroId"]);
                        eCb();
                    }
                });
            }, function (err, res) {
                callbackFn(err, list);
            });
        }
    });
}

function getEquipInFormation(userUid, equipId, callbackFn) {
    var sql = "SELECT * FROM formation WHERE userUid = " + mysql.escape(userUid) + " and (equip1 = " + equipId + " or equip2 = " + equipId + " or equip3 = " + equipId + " )";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null) {
            callbackFn(err, null);
        } else {
            callbackFn(null, res);
        }
    });
}

function getSkillInFormation(userUid, skillId, callbackFn) {
    var sql = "SELECT * FROM formation WHERE userUid = " + mysql.escape(userUid) + " and (skill2 = " + skillId + " or skill3 = " + skillId + " )";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null) {
            callbackFn(err, null);
        } else {
            callbackFn(null, res);
        }
    });
}

function getCardInFormation(userUid, cardId, callbackFn) {
    var sql = "SELECT * FROM formation WHERE userUid = " + mysql.escape(userUid) + " and (card1 = " + cardId + " or card2 = " + cardId + " or card3 = " + cardId + " or card4 = " + cardId + " or card5 = " + cardId + " or card6 = " + cardId + " )";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null) {
            callbackFn(err, null);
        } else {
            callbackFn(null, res);
        }
    });
}

exports.addHeroToFormation = addHeroToFormation;
exports.getUserFormation = getUserFormation;
exports.addPropsToFormation = addPropsToFormation;
exports.removePropsFromFormation = removePropsFromFormation;
exports.arrangeFormation = arrangeFormation;
exports.getUserHeroId = getUserHeroId;
exports.removeFormation = removeFormation;
exports.getEquipInFormation = getEquipInFormation;
exports.getSkillInFormation = getSkillInFormation;
exports.getCardInFormation = getCardInFormation;
exports.addHeroToGlobalFormation = addHeroToGlobalFormation;
exports.getGlobalFormation = getGlobalFormation;
exports.getUserHeroIds = getUserHeroIds;