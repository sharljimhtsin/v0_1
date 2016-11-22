/**
 * 武将的数据处理
 * User: liyuluan
 * Date: 13-10-12
 * Time: 下午2:45
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var achievement = require("../model/achievement");
var configManager = require("../config/configManager");
var async = require("async");


//
function heroDefault(heroData) {
    var obj = {
        "userUid":null,
        "heroUid":null,
        "heroId":null,
        "exp":0,
        "level":1,
        "hp":0,
        "attack":0,
        "defence":0,
        "spirit":0,
        "skillLevel":1,
        "skillExp":0,
        "research":0,
        "hpAdd":0,
        "attackAdd":0,
        "defenceAdd":0,
        "spiritAdd":0,
        "potential":0,
        "break":0,
        "train":0,
        "energy":0
    };

    for (var key in obj) {
        if (heroData.hasOwnProperty(key) == false)  heroData[key] = obj[key];
    }
    return heroData;
}




/**
 * 添加武将
 * @param userUid 用户ID
 * @param heroId 要添加的武将
 * @param exp 武将初始经验
 * @param callbackFn
 */
function addHero(userUid,heroId,exp,level,callbackFn) {
    redis.getNewId(userUid,function(err,res) {
        if (err) {
            callbackFn(err,null);
        } else {
            var heroUid = res - 0;
            var newHeroData = {};
            newHeroData["userUid"] = userUid;
            newHeroData["heroUid"] = heroUid;
            newHeroData["heroId"] = heroId;
            newHeroData["exp"] = exp;
            newHeroData["level"] = level;
            var sql = 'INSERT INTO hero SET ?';
            mysql.game(userUid).query(sql,newHeroData,function(err,res) {
                if (err) {
                    callbackFn(err,null);
                } else {
                    var redisHeroData = heroDefault(newHeroData);
                    redis.user(userUid).h("heroHash").setJSONex(604800, redisHeroData["heroUid"], redisHeroData);

//                    redis.user(userUid).s("hero").del();

                    var configData = configManager.createConfig(userUid);
                    var heroConfig = configData.getConfig("hero");
                    var heroData = heroConfig[heroId];
                    achievement.getHero(userUid, heroId, function(){
                        if (heroData["star"] == 4) { // S 英雄
                            achievement.heroGet(userUid, 1, function(){
                                callbackFn(null,newHeroData);
                            });
                        } else {
                            callbackFn(null,newHeroData);
                        }
                    });
                }
            });
        }
    });
}

//取武将列表
function getHero(userUid,callbackFn) {
    redis.user(userUid).h("heroHash").getAllJSON(function(err,res) {
        if (res != null && Object.keys(res).length == 0) {
            res = null;
            redis.user(userUid).h("heroHash").del();
        }
        if (res == null) {
            var sql = "SELECT * FROM hero WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {
                if (err || res == null) {
                    callbackFn(err,null);
                } else {
                    var heroData = {};

                    for (var i = 0; i < res.length; i++ ) {
                        var mItem = res[i];
                        var mHeroUid = mItem["heroUid"];
                        heroData[mHeroUid] = mItem;
                    }

                    if (res.length > 0) {
                        redis.user(userUid).h("heroHash").setAllJSONex(604800, heroData, function(err, res) {
                            callbackFn(null,heroData);
                        });
//                        redis.user(userUid).s("hero").setObj(heroData, function(err,res){
//                            callbackFn(null,heroData);
//                        });
                    } else {
                        callbackFn(null,heroData);
                    }
                }
            });
        } else {
            callbackFn(null,res);
        }
    });
}

//是否拥有该武将
function isOwn(userUid, heroIds, callbackFn) {
    var inStr = heroIds.join(",");
    var sql = "SELECT distinct(heroId) FROM hero WHERE userUid = " + mysql.escape(userUid) + " AND heroId IN (" + inStr + ");";
    mysql.game(userUid).query(sql, function (err, res) {
        callbackFn(err, res);
    });
}

/**
 * 更新武将数据
 * @param userUid
 * @param heroUid
 * @param heroData
 * @param callbackFn
 */
function updateHero(userUid,heroUid,heroData,callbackFn) {
    var sql = "UPDATE hero SET ? WHERE userUid = " + mysql.escape(userUid) + " AND heroUid = " + mysql.escape(heroUid);
    var newData = heroData;
    mysql.game(userUid).query(sql,newData,function(err,res){
        if (err) {
            callbackFn(err,null);
        } else {

            var configData = configManager.createConfig(userUid);
            var heroId = null;
            var heroData = null;

            async.series([
                function(cb) { // 获取伙伴ID
                    if (newData.hasOwnProperty("heroId")) {
                        heroId = newData["heroId"];
                        var heroConfig = configData.getConfig("hero");
                        heroData = heroConfig[heroId];
                        cb(null);
                    } else {
                        sql = "SELECT heroId FROM hero WHERE userUid = " + mysql.escape(userUid) + " AND heroUid = " + mysql.escape(heroUid);
                        mysql.game(userUid).query(sql,newData,function(err,res){
                            if (!err && res) {
                                if (res.length > 0) {
                                    heroId = res[0]["heroId"];
                                    var heroConfig = configData.getConfig("hero");
                                    heroData = heroConfig[heroId];
                                    cb(null);
                                }
                            } else {
                                cb(null);
                            }
                        });
                    }
                },
                function(cb) { // 技能升级
                    if (newData.hasOwnProperty("skillLevel")) { // 更新伙伴身上的技能
                        var skillId = heroData["talentSkill"];
                        var skillLevel = newData["skillLevel"];

                        var skillConfig = configData.getConfig("skill");
                        var skillData = skillConfig[skillId];
                        if (skillId && skillData["star"] == 4) { // S 技能
                            achievement.skillLevelUp(userUid, skillLevel, function(){
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    } else {
                        cb(null);
                    }
                },
                function(cb) { // 伙伴升级
                    if (!newData.hasOwnProperty("exp")) { // 没有更新伙伴经验
                        __updateHero(userUid, heroUid, newData, callbackFn);
                        cb(null);
                        return;
                    }

                    if (heroId && heroData) {
                        if (heroData["star"] == 4) { // S 英雄
                            var level = configData.heroExpToLevel(heroId, newData["exp"]);
                            achievement.heroLevelUp(userUid, level, function(){
                                __updateHero(userUid, heroUid, newData, callbackFn);
                            });
                        } else {
                            __updateHero(userUid, heroUid, newData, callbackFn);
                        }
                    } else {
                        __updateHero(userUid, heroUid, newData, callbackFn);
                    }

                    cb(null);
                }
            ], function(err){

            });

//            redis.user(userUid).s("hero").del();//DEL DEL DEL DEL DEL DEL DEL
        }
    });
}

function __updateHero(userUid, heroUid, newData, callbackFn) {
    callbackFn(null,1);

    //更新redis中的数据
    redis.user(userUid).h("heroHash").getJSON(heroUid, function(err, res) {
        if (err) {
            redis.user(userUid).h("heroHash").del();
        } else if (res == null) {
            //不处理
        } else {
            var obj = res;
            for (var key in newData) {
                obj[key] = newData[key];
            }
            redis.user(userUid).h("heroHash").setJSONex(604800, heroUid, obj, function(err, res) {
                if (err) {
                    redis.user(userUid).h("heroHash").del();
                }
            });
        }
    });
}


/**
 * 删除武将数据
 * @param userUid
 * @param heroUids 武将数据列表
 * @param callbackFn
 */
function delHero(userUid,heroUids,callbackFn) {
    var sql = "DELETE FROM hero WHERE userUid=? AND heroUid IN(?)";
//    sql = mysql.getDB().format(sql,[userUid,heroUids]);
    mysql.game(userUid).query(sql,[userUid,heroUids],function(err,res) {
//        redis.game(userUid).del("hero:" + userUid);//DEL DEL DEL DEL DEL DEL DEL
        for (var i = 0; i < heroUids.length; i++) {
            redis.user(userUid).h("heroHash").hdel(heroUids[i], function(err, res) {
                if (err) {
                    redis.user(userUid).h("heroHash").del();
                }
            });
        }
//        redis.user(userUid).s("hero").del();
        callbackFn(err,res);
    });
}

function delAllHero(userUid,callbackFn) {
    var sql = "DELETE FROM hero WHERE userUid="+ mysql.escape(userUid);
    mysql.game(userUid).query(sql,function(err,res) {
        redis.user(userUid).h("heroHash").del(callbackFn);
    });
}

function removeHero(userUid, heroId, callbackFn) {
    var sql = "DELETE FROM hero WHERE userUid=? AND heroUid =?";
    mysql.game(userUid).query(sql, [userUid, heroId], function (err, res) {
        redis.user(userUid).h("heroHash").del();
        callbackFn(err, res);
    });
}

exports.addHero = addHero;
exports.getHero = getHero;
exports.updateHero = updateHero;
exports.delHero = delHero;
exports.removeHero = removeHero;
exports.heroDefault = heroDefault;
exports.delAllHero = delAllHero;
exports.isOwn = isOwn;