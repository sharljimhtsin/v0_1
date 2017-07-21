/**
 * 传功接口
 * User: peter.wang
 * Date: 14-9-2
 * Time: 下午2:34
 */
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var itemModel = require("../model/item");
var hero = require("../model/hero");
var user = require("../model/user");
var formation = require("../model/formation");
var specialTeam = require("../model/specialTeam");
var heroSoul = require("../model/heroSoul");
var teachModel = require("../model/teach");
var gravity = require("../model/gravity");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var bitUtil = require("../alien/db/bitUtil");
var userVariable = require("../model/userVariable");
var gal = require("../model/gallants");//巡游活动
var upStar = require("../model/upStar");
var modelUtil = require("../model/modelUtil");
var bitUtil = require("../alien/db/bitUtil");
var fs = require('fs');


function start(postData, response, query, noConcurrencyList) {
    noConcurrencyList[query["method"] + query["userUid"]] = "1";
    if (jutil.postCheck(postData, "itemId", "heroUid", "targetHeroUid") == false) {
        delete noConcurrencyList[query["method"] + query["userUid"]];
        response.echo("hero.inherit", jutil.errorInfo("postError"));
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
        delete noConcurrencyList[query["method"] + query["userUid"]];
        response.echo("hero.inherit", jutil.errorInfo("configError"));
        return;
    }

    var mStatus = bitUtil.parseUserUid(userUid);
    var mCountry = mStatus[0];
    var gUserData;
    var gPotential;
    var returnedHeroSoul;
    var returnedTrainedItem;
    var gTargetHeroNewExp;
    var gTargetHeroNewLevel;
    var gTargetHeroBreak;
    var teachLevelArr = [];
    var heroId;
    var returnedTeachData;
    var returnedTrainItemData;
    var returnedHeroSoulData;
    var gTargetHeroData;
    var gravityData;
    var galHeroIdList = [];
    var isNew = false;
    // 台湾旧版传承
    if (mCountry == 'e' || mCountry == 'g') {
        isNew = true;
    }
    var upStarData;
    var upStarItem;
    var upStarDrop = [];
    async.series([
        function (cb) {
            userVariable.getVariable(userUid, "inheritStatus", function (err, res) {
                if (res == "1") {
                    err = "busy";
                }
                cb(err);
            });
        },
        function (cb) {
            userVariable.setVariable(userUid, "inheritStatus", 1, function (err, res) {
                cb(err);
            });
        },
        function (cb) { //验证是否有传功丹
            itemModel.getItem(userUid, itemId, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var itemData = res;
                    if (itemData == null || itemData["number"] < 1) {
                        cb("noItem");
                    } else {
                        cb();
                    }
                }
            });
        },
        function (cb) { //取user最高等级
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError");
                } else {
                    gUserData = res;
                    cb();
                }
            });
        },
        function (cb) { //验证散功的hero 不存在编队中
            formation.getUserFormation(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var formationList = res;
                    var isBreak = false;
                    for (var key in formationList) {
                        if (formationList[key]["heroUid"] == heroUid) {
                            isBreak = true;
                            break;
                        }
                    }
                    if (isBreak) {
                        cb("canNotInherited");
                    } else {
                        cb();
                    }
                }
            });
        },
        function (cb) { //取得巡游列表，防止编队中的hero被融合
            gal.getUserData(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError");
                } else {
                    if (res["arg"] == undefined) {
                        cb();
                    } else {
                        var galList = res["arg"];
                        for (var a in galList) {
                            for (var b in galList[a]) {
                                var mItem = galList[a][b];
                                galHeroIdList.push(mItem["heroId"]);
                            }
                        }
                        cb();
                    }
                }
            });
        },
        function (cb) {//巡游
            hero.getHero(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError");
                } else {
                    if (galHeroIdList == null) {
                        cb();
                    } else {
                        var isBreak = false;
                        for (var k in res) {
                            for (var i in galHeroIdList) {
                                if (res[k]["heroId"] == galHeroIdList[i]) {
                                    var item = res[k]["heroUid"];
                                    if (item == heroUid) {
                                        isBreak = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (isBreak) {
                            cb("canNotInherited");
                        } else {
                            cb();
                        }
                    }
                }
            });
        },
        function (cb) { //验证散功的hero 不存在特战队中
            specialTeam.get(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    var specialTeamList = res;
                    var isBreak = false;
                    for (var key in specialTeamList) {
                        if (specialTeamList[key]["heroUid"] == heroUid) {
                            isBreak = true;
                            break;
                        }
                    }
                    if (isBreak) {
                        cb("canNotInherited");
                    } else {
                        cb();
                    }
                }
            });
        },
        function (cb) { //取hero
            hero.getHero(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var heroList = res;
                    var heroData = heroList[heroUid]; //散功hero数据
                    var targetHeroData = heroList[targetHeroUid]; //接受经验hero数据
                    gTargetHeroData = targetHeroData;
                    if (heroData == null || targetHeroData == null) {
                        cb("heroNotExist");
                    } else if (heroData["level"] <= 1) {
                        cb("heroLevelInsufficient");
                    } else {
                        var heroExp = heroData["exp"];
                        var targetHeroNewExp = (targetHeroData["exp"] - 0) + (heroExp - 0) * (inheritItemConfig["typeValue"] - 0);//经验传递
                        returnedTrainedItem = Math.floor((heroData["train"] - 0) * (inheritItemConfig["typeValue"] - 0));//培养液返还
                        var targetHeroId = targetHeroData["heroId"];
                        heroId = heroData["heroId"];

                        //经验
                        var userLv = gUserData["lv"] <= 25 ? 25 : gUserData["lv"];
                        var targetMaxExp = configData.heroMaxExp(targetHeroId, userLv);
                        var returnedExp = targetHeroNewExp - targetMaxExp;
                        if (returnedExp > 0) {
                            var expRatioConfig = configData.getConfig("expRatio");
                            teachLevelArr = getTeach(returnedExp, expRatioConfig, teachLevelArr);
                        }
                        if (targetHeroNewExp > targetMaxExp) targetHeroNewExp = targetMaxExp;
                        var targetHeroNewLevel = configData.heroExpToLevel(targetHeroId, targetHeroNewExp);

                        //突破
                        var breakThroughConfig = configData.getConfig("breakThrough"); //突破的配置表
                        var heroStar = configData.heroStar(heroId);
                        var targetHeroStar = configData.heroStar(targetHeroId);
                        var targetHeroBreak = targetHeroData["break"] - 0;
                        if (isNew && heroStar >= targetHeroStar && (targetHeroData["break"] - 0) < 5) {
                            targetHeroBreak = ((targetHeroData["break"] - 0) + (heroData["break"] - 0)) > 5 ? 5 : (targetHeroData["break"] - 0) + (heroData["break"] - 0);
                        }

                        var starBreakThroughConfig = breakThroughConfig[targetHeroStar];//当前hero品质的突破配置
                        gPotential = targetHeroData["potential"] - 0; //原有潜力
                        for (var i = (targetHeroData["break"] - 0) + 1; i <= targetHeroBreak; i++) { //将继承的突破等级，的潜力值加到新hero上
                            var currentBreakThroughConfig = starBreakThroughConfig[i];
                            if (currentBreakThroughConfig != null) gPotential += (currentBreakThroughConfig["potentialAdd"] || 0 - 0);
                        }

                        //魂魄返还
                        var heroConfig = configData.getConfig("hero")[heroId];
                        var soulCount = heroConfig["soulCount"];
                        var breakNeedSoulCount = 0;
                        var breakConfig = breakThroughConfig[heroStar];
                        var breakLevel = heroData["break"] - 0;
                        for (var i = 1; i <= breakLevel; i++) {
                            breakNeedSoulCount += breakConfig[i + ""]["soulCost"];
                        }
                        returnedHeroSoul = Math.floor(soulCount + breakNeedSoulCount * (inheritItemConfig["typeValue"] - 0));
                        gTargetHeroNewExp = targetHeroNewExp;
                        gTargetHeroNewLevel = targetHeroNewLevel;
                        gTargetHeroBreak = targetHeroBreak;
                        cb();
                    }
                }
            });
        },
        function (cb) { //删除散功hero
            hero.delHero(userUid, [heroUid], function (err, res) {
                cb(err);
            });
        },
        function (cb) { //更改传功丹数据
            itemModel.updateItem(userUid, itemId, -1, function (err, res) {
                var userIP = '127.0.0.1';
                mongoStats.expendStats(itemId, userUid, userIP, gUserData, mongoStats.INHERIT, 1);
                cb(err);
            });
        },
        function (cb) {//更新培养液
            if (!isNew && returnedTrainedItem > 0) {
                itemModel.updateItem(userUid, "150901", returnedTrainedItem, function (err, res) {
                    if (err)
                        cb(err);
                    else {
                        mongoStats.dropStats("150901", userUid, "127.0.0.1", gUserData, mongoStats.INHERIT, returnedTrainedItem, 1);
                        returnedTrainItemData = res;
                        cb();
                    }
                });
            } else {
                cb();
            }
        },
        function (cb) { //更新目标hero 的经验和等级
            hero.updateHero(userUid, targetHeroUid, {
                "exp": gTargetHeroNewExp,
                "level": gTargetHeroNewLevel,
                "break": gTargetHeroBreak,
                "potential": gPotential
            }, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    cb();
                }
            });
        },
        function (cb) {
            gravity.getHeroData(userUid, heroUid, function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb();
                } else {
                    gravityData = res;
                    gravity.getHeroData(userUid, targetHeroUid, function (err, res) {
                        if (err) {
                            gravityData = null;
                            cb(err);
                        } else if (res["bigVigour"] < gravityData["bigVigour"] || (res["bigVigour"] == gravityData["bigVigour"] && res["vigour"] < gravityData["vigour"])) {
                            gravityData["heroUid"] = targetHeroUid;
                            cb();
                        } else {
                            gravityData = null;
                            cb();
                        }
                    });
                }
            });
        },
        function (cb) {
            if (gravityData) {
                gravity.setHeroData(userUid, targetHeroUid, gravityData, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        var toDelList = [heroUid];
                        if (bitUtil.parseUserUid(userUid)[0] == "s" && gravityData["bigVigour"] > 4) {
                            toDelList.push(targetHeroUid);
                        }
                        gravity.delHeroData(userUid, toDelList, function (err, res) {
                            if (toDelList.length > 1) {
                                gravity.setVigour(userUid, targetHeroUid, 5, cb);
                            } else {
                                cb();
                            }
                        });
                    }
                });
            } else {
                cb();
            }
        },
        function (cb) {//更新指点
            var length = teachLevelArr.length;
            if (!isNew && length > 0) {
                returnedTeachData = [];
                for (var i = 0; i < length; i++) {
                    teachModel.addWorldBossTeach(userUid, teachLevelArr[i], function (err, res) {
                        if (err)
                            cb(err);
                        else {
                            returnedTeachData.push(res);
                            if (returnedTeachData.length == length) {
                                cb();
                            }
                        }
                    });
                }
            } else {
                cb();
            }
        },
        function (cb) {//更新魂魄
            if (!isNew && returnedHeroSoul) {
                fs.appendFile('inherit.log', userUid + "\n" + heroId + "\n" + jutil.now() + "\n" + JSON.stringify(returnedHeroSoul) + "\n", 'utf8');
                heroSoul.addHeroSoul(userUid, heroId, returnedHeroSoul, function (err, res) {
                    if (err)
                        cb(err);
                    else {
                        mongoStats.dropStats(heroId, userUid, "127.0.0.1", gUserData, mongoStats.INHERIT, returnedHeroSoul, 1);
                        returnedHeroSoulData = res;
                        cb();
                    }
                });
            } else {
                cb();
            }
        },
        function (cb) {
            upStar.getStarData(userUid, function (err, res) {
                upStarData = res;
                cb(err);
            });
        },
        function (cb) {
            if (upStarData) {
                upStar.getCostItem(userUid, upStarData, heroUid, heroId, function (err, res) {
                    upStarItem = res;
                    cb(err);
                });
            } else {
                cb();
            }
        },
        function (cb) {
            if (upStarItem) {
                async.eachSeries(upStarItem, function (item, giveCb) {
                    modelUtil.addDropItemToDB(item["id"], item["count"], userUid, 0, 1, function (err, res) {
                        upStarDrop.push(res);
                        giveCb(err);
                    });
                }, cb);
            } else {
                cb();
            }
        },
        function (cb) {
            if (upStarData && upStarData.hasOwnProperty(heroUid)) {
                delete upStarData[heroUid];
                upStar.setStarData(userUid, upStarData, cb);
            } else {
                cb();
            }
        }
    ], function (err, res) {
        if (err != "busy") {
            userVariable.setVariable(userUid, "inheritStatus", 0, function (a, b) {
            });
        }
        if (err) {
            delete noConcurrencyList[query["method"] + query["userUid"]];
            response.echo("hero.inherit", jutil.errorInfo(err));
        } else {
            gTargetHeroData = jutil.copyObject(gTargetHeroData);
            gTargetHeroData["exp"] = gTargetHeroNewExp;
            gTargetHeroData["level"] = gTargetHeroNewLevel;
            gTargetHeroData["break"] = gTargetHeroBreak;
            gravityData = jutil.copyObject(gravityData);
            var baseV = ["hpp", "attackp", "defencep", "spiritp"];
            for (var j in baseV){
                gravityData[baseV[j]] /= 10000;
            }
            delete noConcurrencyList[query["method"] + query["userUid"]];
            response.echo("hero.inherit", {
                "newHeroData": gTargetHeroData,
                "del": heroUid,
                "trainItem": returnedTrainItemData,
                "worldBossTeach": returnedTeachData,
                "heroSoul": returnedHeroSoulData,
                "gravityData": gravityData,
                "upStarDrop": upStarDrop
            });
        }
    });
}

function getTeach(exp, expRatioConfig, teachArr) {
    if (exp < 100)
        return teachArr;
    for (var key in expRatioConfig) {
        var upLv = key - 0;
        if (!expRatioConfig.hasOwnProperty(upLv + 2)) {
            teachArr.push(upLv);
            var remainExp = exp - (expRatioConfig[upLv + 1] - expRatioConfig[upLv]) * 100;
            return getTeach(remainExp, expRatioConfig, teachArr);
        }
        var levelExp = (expRatioConfig[upLv + 1] - expRatioConfig[upLv]) * 100;
        var nextLevelExp = (expRatioConfig[upLv + 2] - expRatioConfig[upLv + 1]) * 100;
        if (exp >= levelExp && exp < nextLevelExp) {
            teachArr.push(upLv);
            var remainExp = exp - levelExp;
            return getTeach(remainExp, expRatioConfig, teachArr);
        }
    }
}


exports.start = start;