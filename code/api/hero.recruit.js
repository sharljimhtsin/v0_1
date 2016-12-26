/**
 * hero招募,魂魄达到一定数量，可招募
 * User: liyuluan
 * Date: 13-11-1
 * Time: 下午5:45
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var heroSoul = require("../model/heroSoul");
var hero = require("../model/hero");
var gameModel = require("../model/gameModel");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var user = require("../model/user");
var item = require("../model/item");
var async = require("async");

/**
 * heroId 要招募魂魄heroId
 * 成功：返回hero信息
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"heroId") == false ) {
        response.echo("hero.recruit",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var heroId = postData["heroId"];
    var itemId = "155101";
    var itemNum = 0;
    var configData = configManager.createConfig(userUid);
    var newHeroData;
    var heroConfig = configData.getConfig("hero");
    var needSoulCount = (heroConfig[heroId] != null)?(heroConfig[heroId]["soulCount"]-0):99999;
    var soulCount = 0;

    async.series([function(cb){
        heroSoul.getHeroSoulItem(userUid,heroId,function(err,res) {
            if (err ) cb("dbError");
            else if(res == null){
                cb("noSoul");
            } else {
                soulCount = res["count"] - 0;
                cb(null);
            }
        });
    }, function(cb){
        if(soulCount < needSoulCount){
            item.getItem(userUid, itemId, function(err,res){//取万能魂魄
                if(err) {
                    cb("dbError");
                } else if(res == null || needSoulCount - res["number"] - soulCount > 0){
                    cb("noSoul");
                } else {
                    itemNum = needSoulCount - soulCount;
                    cb(null);
                }
            });
        } else {
            cb(null);
        }
    }, function(cb) {
        hero.getHero(userUid,function(err,res) {
            if (err || res == null) cb("dbError");
            else {
                var error = null;
                for (var key in res) {
                    var resItem = res[key];
                    if (resItem["heroId"] == heroId) {
                        error = "heroExist";//如果这个伙伴已经有了就不能招募（可以突破）
                        break;
                    }
                }
                cb(error);
            }
        });
    }, function(cb){
        heroSoul.addHeroSoul(userUid,heroId,-needSoulCount+itemNum,cb);
    }, function(cb){
        if(itemNum > 0){
            item.updateItem(userUid, itemId, -itemNum, function (err, res) {
                mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.HERO_RECRUIT, itemNum);
                cb(err);
            });
        } else {
            cb(null);
        }
    }, function(cb){
        hero.addHero(userUid,heroId,0,1,function(err,res) { //将hero添加到数据库
            if (err)  cb("dbError");
            else {
                newHeroData = res;
                if (configData.heroStar(heroId) >= 4) { //S级魂转生
                    user.getUser(userUid, function(err, res) {
                        if (err) {
                            console.log("hero.recruit", err.stack);
                        } else {
                            if (res == null) return;
                            gameModel.addNews(userUid, gameModel.HERO_RECRUIT, res["userName"], heroId, 0);
                            stats.events(userUid, "127.0.0.1", res, mongoStats.E_HERO_REC, heroId, jutil.now());
                        }
                    });
                }
                newHeroData["itemNum"] = itemNum;
                newHeroData["soulCount"] = needSoulCount-itemNum;
                cb(null);
            }
        });
    }], function(err, res){
        if(err){
            response.echo("hero.recruit", jutil.errorInfo(err));
        } else {
            response.echo("hero.recruit", newHeroData);
        }
    });
}

exports.start = start;