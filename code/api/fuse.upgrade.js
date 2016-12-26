/**
 * 融合（升级）
 * User: liyuluan
 * Date: 13-11-4
 * Time: 下午12:13
 */

var jutil = require("../utils/jutil");
var hero = require("../model/hero");
var heroSoul = require("../model/heroSoul");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var formation = require("../model/formation");
var specialTeam = require("../model/specialTeam");
var fuse = require("../model/fuse");
var user = require("../model/user");
var async = require("async");
var gal = require("../model/gallants");//巡游活动
var mongoStats = require("../model/mongoStats");

/**
 *
 * @param postData
 *      参数 heroSoulList  魂魄列表  [[heroId,count],[heroId,count]]  heroList 武将列表 [heroUid,heroUid]
 *      type [hp attack defence spirit] 要加的类别，
 * @param response
 resultData["fuse"] = resultFuseData;
 resultData["deleteHero"] = mHeroList;
 resultData["heroSoulList"] = resultHeroSoulList; 魂魄为改变了的魂魄最新值
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"heroSoulList","heroList","type") == false) {
        response.echo("fuse.upgrade",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var heroSoulList = postData["heroSoulList"];
    var heroList = postData["heroList"];
    var soulType = postData["type"];
    var mixExpGiveConfig = configData.getConfig("mixExpGive");
    var mixNeedExpConfig = configData.getConfig("mixNeedExp");
    var heroConfig = configData.getConfig("hero");

    var mHeroList = [];//实际hero列表
    var giveExp = 0; //增加的融合点
    var mHeroSoulList = [];//实际魂列表
    var formationHeroUidList = [];//编队中的heroUid，用于判断被融合的hero是不是在编队中
    var specialTeamHeroUidList = [];//特战队中的heroUid，用于判断被融合的hero是不是在特战队中
    var galHeroIdList = [];
    var galHeroUidList = [];//巡游活动守擂中的heroUid，用于判断被融合的hero是不是在巡游守擂中
    var gUserLevel = 0; //用户当前等级

    var resultFuseData = null;//升级后的结果
    var resultHeroSoulList = [];//更新后魂魄列表

    async.series([
        function(cb) { //取得编队，防止编队中的hero被融合
            formation.getUserFormation(userUid,function(err,res) {
                if (err || res == null) cb("dbError",null);
                else {
                    for (var key in res) {
                        var mItem = res[key];
                        formationHeroUidList.push(mItem["heroUid"]);
                    }
                    cb(null,null);
                }
            });
        },
        function(cb) { //取得巡游列表，防止编队中的hero被融合
            gal.getUserData(userUid,function(err,res) {
                if (err || res == null) cb("dbError",null);
                else {
                    if(res["arg"] == undefined)cb(null,null);
                    else{
                        var galList = res["arg"];
                        for (var a in galList) {
                            for(var b in galList[a]){
                                var mItem = galList[a][b];
                                galHeroIdList.push(mItem["heroId"]);
                            }
                        }
                        cb(null,null);
                    }
                }
            });
        },
        function(cb){//巡游
            hero.getHero(userUid,function(err,res){
                if (err || res == null) cb("dbError",null);
                else{
                    if(galHeroIdList == null)cb(null,null);
                    else{
                        for(var x in galHeroIdList){
                            var mItemId = galHeroIdList[x];
                            for(var y in res){
                                if(res[y]["heroId"] == mItemId){
                                    galHeroUidList.push(res[y]["heroUid"]);
                                }
                            }
                        }
                        cb(null,null);
                    }
                }
            });
        },
        function(cb) { //取得特战队，防止特战队中的hero被融合
            specialTeam.get(userUid,function(err,res) {
                if(err || res == null) cb("dbError",null);
                else {
                    for (var key in res) {
                        var mItem = res[key];
                        specialTeamHeroUidList.push(mItem["heroUid"]);
                    }
                    cb(null,null);
                }
            });
        },
        function(cb) { //取玩家当前等级
            user.getUser(userUid, function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserLevel = res["lv"];
                    cb(null);
                }
            });
        },
        function(cb) { //验证hero
            if (heroList.length > 0) {
                hero.getHero(userUid,function(err,res) {
                    if (err) cb("dbError",null);
                    else {
                        var heroData = res;
                        for (var i = 0; i < heroList.length; i++) {
                            var mItem = heroList[i];
                            var heroDataItem = heroData[mItem];
                            if (heroDataItem != null
                                && formationHeroUidList.indexOf(mItem) == -1
                                && specialTeamHeroUidList.indexOf(mItem) == -1
                                && galHeroUidList.indexOf(mItem) == -1) {//hero存在，并且不在编队/特战队中
                                var itemHeroId = heroDataItem["heroId"];
                                var itemHeroStar = heroConfig[itemHeroId]["star"];
                                mHeroList.push(mItem);//存入heroUid
                                giveExp += (mixExpGiveConfig[itemHeroStar]["heroGiveExp"] - 0);
                            }
                        }
                        cb(null,null);
                    }
                });
            } else {
                cb(null,null);
            }
        },
        function(cb) { //验证heroSoul
            if (heroSoulList.length > 0 ) {
                heroSoul.getHeroSoul(userUid,function(err,res) {
                    if (err) cb("dbError",null);
                    else {
                        var heroSoulData = res || {};
                        for (var i = 0; i < heroSoulList.length; i++) {
                            var mItem = heroSoulList[i];
                            var mItemHeroId = mItem[0];
                            var mItemHeroCount = mItem[1];
                            if (heroSoulData[mItemHeroId] != null && heroSoulData[mItemHeroId]["count"] >= mItemHeroCount && mItemHeroCount > 0) {
                                var itemHeroStar = heroConfig[mItemHeroId]["star"];
                                giveExp += (mixExpGiveConfig[itemHeroStar]["soulGiveExp"] - 0) * mItemHeroCount;
                                mHeroSoulList.push(mItem);
                            }
                        }
                        cb(null,null);
                    }
                });
            } else {
                cb(null,null);
            }
        },
        function(cb) { //增加融合经验点
            fuse.getFuse(userUid,function(err,res) {
                if (err) response.echo("dbError",null);
                else {
                    var fuseData = res;
                    if (fuseData == null) fuseData = getDefaultFuseData(userUid);
                    var expField = null;
                    var levelField = null;
                    switch(soulType) {
                        case "hp": expField = "hpExp"; levelField = "hpLevel";break;
                        case "attack": expField = "attackExp"; levelField = "attackLevel"; break;
                        case "defence": expField = "defenceExp"; levelField = "defenceLevel"; break;
                        case "spirit": expField = "spiritExp"; levelField = "spiritLevel"; break;
                    }
                    var currentFuseExp = (fuseData[expField] - 0 + giveExp);
                    var currentFuseLel = fuseData[levelField] - 0;
                    fuseData[expField] = currentFuseExp;
                    fuseData[levelField] = fuseExpToLevel(mixNeedExpConfig, currentFuseExp, currentFuseLel);
                    resultFuseData = fuseData;
                    if (fuseData[levelField] > gUserLevel + 1 || fuseData[levelField] == -1) { //超过用户最高等级
                        cb("levelOverflow");
                    } else {
                        fuse.updateFuse(userUid,fuseData,function(err,res) {
                            if (err) cb("dbError",null);
                            else cb(null,null);
                        });
                    }
                }
            });
        },
        function(cb) { //移除被融合武将
            if (mHeroList.length == 0) cb(null,null);
            else {
                hero.delHero(userUid,mHeroList,function(err,res) {
                    async.eachSeries(mHeroList, function(heroUid, esCb){
                        mongoStats.dropStats(heroUid, userUid, "127.0.0.1", null, mongoStats.A_FUSEUPGRADE1, -1);
                        esCb(null);
                    }, function(err,res){
                        cb(null, null);
                    });
                    if (err) console.error("fuse.upgrade",userUid, mHeroList, err.stack);
                });
            }
        },
        function(cb) { //移除被融合的魂
            if (mHeroSoulList.length == 0) cb(null,null);
            else {
                async.forEach(mHeroSoulList,function(item,forcb) {
                    var mHeroId = item[0];
                    var mHeroCount = -item[1];
                    mongoStats.dropStats(mHeroId, userUid, "127.0.0.1", null, mongoStats.A_FUSEUPGRADE2, mHeroCount);
                    heroSoul.addHeroSoul(userUid,mHeroId,mHeroCount,function(err,res){
                        resultHeroSoulList.push(res);
                        forcb(null,null);
                        if (err) console.error(userUid, mHeroId, mHeroCount, err.stack);
                    });
                },function(err,res) {
                    cb(null,null);
                });
            }
        }
    ],function(err,res) {
        if (err) response.echo("fuse.upgrade",jutil.errorInfo(err));
        else {
            var resultData = {};
            resultData["fuse"] = resultFuseData;
            resultData["deleteHero"] = mHeroList;
            resultData["heroSoulList"] = resultHeroSoulList;
            response.echo("fuse.upgrade",resultData);
        }
    });
}


function getDefaultFuseData(userUid) {
    return {"userUid":userUid,
        "hpLevel":0,
        "hpExp":0,
        "attackLevel":0,
        "attackExp":0,
        "defenceLevel":0,
        "defenceExp":0,
        "spiritLevel":0,
        "spiritExp":0
    };
}

function fuseExpToLevel(config, exp, lel) {
    var lastLevel = -1;
    for (var i = 0; i <= 150; i++) {
        var itemValue = config[i];
        if (itemValue == null) return lel;
        if (exp < itemValue) return i;
        //lastLevel = i;
    }
    return lastLevel;
}


exports.start = start;