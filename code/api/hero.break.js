/**
 * hero突破接口
 * User: liyuluan
 * Date: 13-11-1
 * Time: 下午5:41
 */
var jutil = require("../utils/jutil");
var hero = require("../model/hero");
var heroSoul = require("../model/heroSoul");
var configManager = require("../config/configManager");
var gameModel = require("../model/gameModel");
var user = require("../model/user");
var item = require("../model/item");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");
var mongoStats = require("../model/mongoStats");
var fs = require('fs');

/**
 * @param postData 参数 heroUid
 * @param response 返回 {"heroSoul":res,"hero":updateData} ，hero数据只包函potential break
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "heroUid") == false) {
        response.echo("hero.break", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var heroUid = postData["heroUid"];
    var configData = configManager.createConfig(userUid);

    hero.getHero(userUid, function (err, res) {
        if (err || res == null) {
            response.echo("hero.break", jutil.errorInfo("dbError"));
        } else {
            var heroData = res[heroUid];
            var heroId = heroData["heroId"];
            var oldBreak = heroData["break"]; // 旧突破等级
            var newBreak = 0; // 新突破等级

            heroSoul.getHeroSoulItem(userUid, heroId, function (err, res) {
                if (err) {
                    response.echo("hero.break", jutil.errorInfo("dbError"));
                } else {
                    var heroSoulCount = (res == null) ? 0 : res["count"]; //魂数量
                    var breakThroughConfig = configData.getConfig("breakThrough"); //突破的配置表
                    var heroConfig = configData.getConfig("hero");//hero的配置表
                    var currentHeroConfig = heroConfig[heroId]; // 当前hero的配置
                    var currentHeroStar = currentHeroConfig["star"]; // 用户星级
                    var starBreakThroughConfig = breakThroughConfig[currentHeroStar];//当前hero品质的突破配置
                    var breakCount = heroData["break"] - 0 + 1; //当前hero要突破次数
                    if (starBreakThroughConfig == null || starBreakThroughConfig[breakCount] == null) {
                        response.echo("hero.break", jutil.errorInfo("configError"));
                    } else {
                        item.getItem(userUid, "153401", function (err, res) {//取万能魂魄
                            if (err) {
                                response.echo("hero.break", jutil.errorInfo("dbError"));
                                return;
                            } else {
                                var item153401 = (res == null) ? 0 : (res["number"] - 0);
                                var updateSoulCount = 0;
                                var updateItem153401 = 0;//万能魂魄
                                var currentBreakThroughConfig = starBreakThroughConfig[breakCount];//当前突破的配置 "1":{ "breakThroughCount":1, "soulCost":5, "potentialAdd":30}
                                if (heroSoulCount >= currentBreakThroughConfig["soulCost"] - 0) {
                                    updateSoulCount = currentBreakThroughConfig["soulCost"] - 0;
                                    updateItem153401 = 0;
                                } else {
                                    updateSoulCount = heroSoulCount;
                                    updateItem153401 = currentBreakThroughConfig["soulCost"] - 0 - heroSoulCount;
                                }
                                if (updateItem153401 > item153401) {
                                    response.echo("hero.break", jutil.errorInfo("noSoul"));//魂魄数量不足
                                    return;
                                }
                                var updateData = {};
                                updateData["potential"] = heroData["potential"] - 0 + (currentBreakThroughConfig["potentialAdd"] - 0);
                                updateData["break"] = heroData["break"] - 0 + 1;
                                newBreak = updateData["break"];

                                if (configData.heroStar(heroId) >= 4) {
                                    user.getUser(userUid, function (err, res) {
                                        if (err) {
                                            console.error("hero.break", err.stack);
                                        } else {
                                            if (res == null) return;
                                            gameModel.addNews(userUid, gameModel.HERO_BREAK, res["userName"], heroId, updateData["break"]);
                                        }
                                    });
                                }

                                hero.updateHero(userUid, heroUid, updateData, function (err, res) {
                                    if (err) {
                                        response.echo("hero.break", jutil.errorInfo("dbError"));
                                    } else {
                                        fs.appendFile('break.log', userUid + "\n" + heroUid + "\n" + oldBreak + "\n" + jutil.now() + "\n" + JSON.stringify(updateData) + "\n", 'utf8');
                                        item.updateItem(userUid, "153401", -updateItem153401, function (err, itemRes) {
                                            heroSoul.addHeroSoul(userUid, heroId, -updateSoulCount, function (err, res) {
                                                if (currentHeroConfig["star"] == 4) { // S伙伴
                                                    achievement.breakThrough(userUid, newBreak, function () {
                                                    });
                                                }
                                                timeLimitActivity.heroBreak(userUid, heroId, oldBreak, newBreak, function () {
                                                    response.echo("hero.break", {
                                                        "heroSoul": res,
                                                        "hero": updateData,
                                                        "item": itemRes
                                                    });
                                                });
                                            });
                                            if (updateItem153401 > 0) {
                                                var userIP = '127.0.0.1';
                                                mongoStats.expendStats("153401", userUid, userIP, null, mongoStats.HERO_BREAK, updateItem153401);
                                            }
                                        })
                                    }
                                });
                            }
                        })
                    }
                }
            });
        }
    });
}

exports.start = start;