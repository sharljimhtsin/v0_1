/**
 * 传功接口
 * User: liyuluan
 * Date: 13-11-13
 * Time: 下午2:34
 */

var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var itemModel = require("../model/item");
var hero = require("../model/hero");
var user = require("../model/user");
var formation = require("../model/formation");
var async = require("async");
var mongoStats = require("../model/mongoStats");

/**
 * hero.inherit
 * 参数：
 *      itemId 传功丹的 ID
 *      heroUid 散功的hero uid
 *      targetHeroUid 接受功力的hero uid
 * 返回：
 *      {"newHeroData":gHeroData,"del":heroUid}
 *      newHeroData 接受传功的hero 新的数据
 *      del 删除掉的heroUid
 *
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId","heroUid","targetHeroUid") == false) {
        response.echo("hero.inherit",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var itemId = postData["itemId"];
    var heroUid = postData["heroUid"];
    var targetHeroUid = postData["targetHeroUid"];
    var configData = configManager.createConfig(userUid);

    var itemConfig = configData.getConfig("item");
    var inheritItemConfig = itemConfig[itemId];
    if (inheritItemConfig == null || inheritItemConfig["itemType"] != 8) { //无效道具
        response.echo("hero.inherit",jutil.errorInfo("configError"));
        return;
    }

    var gTargetHeroNewExp = null;
    var gTargetHeroNewLevel = null;
    var gTargetHeroBreak = 0;
    var gHeroData = null;
    var gUserLevel = 0;
    var gTargetHeroData = null;
    var gPotential = null;
    var gUserData;

    async.series([
        function(cb) { //验证是否有传功丹
            itemModel.getItem(userUid,itemId,function(err,res) {
                if (err) cb("dbError");
                else {
                    var itemData = res;
                    if (itemData == null || itemData["number"] < 1) {
                        cb("noItem");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb) { //取user最高等级
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    //var userExp = res["exp"];
                    //var userLevel = configData.userExpToLevel(userExp);
                    gUserLevel = res["lv"];
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function(cb) { //验证散功的hero 不存在编队中
            formation.getUserFormation(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    var formationList = res;
                    var isBreak = false;
                    for (var key in formationList) {
                        if (formationList[key]["heroUid"] == heroUid) {
                            cb("canNotInherited");
                            isBreak = true;
                            break;
                        }
                    }
                    if (!isBreak) cb (null);
                }
            });
        },
        function(cb) { //取hero
            hero.getHero(userUid,function(err,res) {
               if (err) cb("dbError");
                else {
                    var heroList = res;
                    var heroData = heroList[heroUid]; //散功hero数据
                    var targetHeroData = heroList[targetHeroUid]; //接受经验hero数据
                   gHeroData = heroData;
                   gTargetHeroData = targetHeroData;
                    if (heroData == null || targetHeroData == null) {
                        cb("heroNotExist");
                    }else if (heroData["level"] <= 1) {
                        cb("heroLevelInsufficient");
                    } else {
                        var heroExp = heroData["exp"];
                        var targetHeroNewExp = (targetHeroData["exp"] - 0) + (heroExp - 0) * (inheritItemConfig["typeValue"] - 0);
                        var targetHeroId = targetHeroData["heroId"];
                        var heroId = heroData["heroId"];
                        var targetMaxExp = configData.heroMaxExp(targetHeroId,gUserLevel);
                        if (targetHeroNewExp > targetMaxExp) targetHeroNewExp = targetMaxExp;
                        var targetHeroNewLevel = configData.heroExpToLevel(targetHeroId,targetHeroNewExp);

                        var targetHeroBreak = 0;
                        var breakThroughConfig = configData.getConfig("breakThrough"); //突破的配置表
                        var heroStar = configData.heroStar(heroId);
                        var targetHeroStar = configData.heroStar(targetHeroId);

//                        if (targetHeroStar < heroStar) {
//                            targetHeroBreak = targetHeroData["break"] - 0;
//                        } else if ((targetHeroData["break"] - 0) > 5) {
//                            targetHeroBreak = targetHeroData["break"] - 0;
//                        } else {
//                            targetHeroBreak = (heroData["break"] - 0) + (targetHeroData["break"] - 0);
//                            if (targetHeroBreak > 5) targetHeroBreak = 5; //继承突破次数，但不能超过5
//                        }
                        if(heroStar < targetHeroStar){//散功伙伴的星级较低，不继承突破
                            targetHeroBreak = targetHeroData["break"] - 0;
                        }else{//散功伙伴的星级大于等于接受伙伴，继承突破
                            if((targetHeroData["break"] - 0) >= 5){//接受伙伴突破等级>=5，无法继承突破
                                targetHeroBreak = targetHeroData["break"] - 0;
                            }else{
                                targetHeroBreak = (targetHeroData["break"] - 0) + (heroData["break"] - 0);
                                if(targetHeroBreak > 5) targetHeroBreak = 5;//继承突破次数，但不能超过5
                            }
                        }

                        var starBreakThroughConfig = breakThroughConfig[targetHeroStar];//当前hero品质的突破配置
                        gPotential = targetHeroData["potential"] - 0; //原有潜力
                        for (var i = (targetHeroData["break"] - 0) + 1; i <= targetHeroBreak; i++ ) { //将继承的突破等级，的潜力值加到新hero上
                            var currentBreakThroughConfig = starBreakThroughConfig[i];
                            if (currentBreakThroughConfig != null) gPotential = gPotential + (currentBreakThroughConfig["potentialAdd"] || 0 - 0);
                        }

                        gTargetHeroNewExp = targetHeroNewExp;
                        gTargetHeroNewLevel = targetHeroNewLevel;
                        gTargetHeroBreak = targetHeroBreak;
                        cb(null);
                    }
               }
            });
        },
        function(cb) { //更新目标hero 的经验和等级
            hero.updateHero(userUid,targetHeroUid,{"exp":gTargetHeroNewExp,"level":gTargetHeroNewLevel,"break":gTargetHeroBreak, "potential":gPotential},function(err,res) {
                if (err) cb("dbError");
                else {
                    cb(null);
                }
            });
        },
        function(cb) { //删除散功hero
            hero.delHero(userUid,[heroUid],function(err,res) {
                cb(null);
            });
        },
        function(cb) { //更改传功丹数据
            itemModel.updateItem(userUid,itemId,-1,function(err,res) {
                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                mongoStats.expendStats(itemId, userUid, userIP, gUserData, mongoStats.INHERIT, 1);
                cb(null);
            });
        }
    ],function(err,res) {
        if (err) response.echo("hero.inherit",jutil.errorInfo(err));
        else {
            gTargetHeroData = jutil.copyObject(gTargetHeroData);
            gTargetHeroData["exp"] = gTargetHeroNewExp;
            gTargetHeroData["level"] = gTargetHeroNewLevel;
            gTargetHeroData["break"] = gTargetHeroBreak;
            response.echo("hero.inherit",{"newHeroData":gTargetHeroData,"del":heroUid});
        }
    });
}

exports.start = start;