/**
 * 技能升级
 * User: liyuluan
 * Date: 13-10-17
 * Time: 下午12:13
 */


var jutil = require("../utils/jutil");
var skill = require("../model/skill");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var hero = require("../model/hero");
var async = require("async");
var gameModel = require("../model/gameModel");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "material") == false) {
        response.echo("skill.upgrade", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var skillUid = postData["skillUid"];//要升级的技能ID
    var heroUid = postData["heroUid"];//如果升级天赋技能 传入的heroUid
    var postMaterial = postData["material"];//用做升级的材料列表
    var material = [];
    var configData = configManager.createConfig(userUid);

    if ((skillUid == null && heroUid == null) || (postMaterial instanceof Array == false)) {
        response.echo("skill.upgrade", jutil.errorInfo("postError"));
        return;
    }

    for (var i = 0; i < postMaterial.length; i++) { //排除相同的素材 && 如果和要升级的技能是同一个Uid也排除
        var mItem = postMaterial[i];
        if (material.indexOf(mItem) == -1 && (mItem != skillUid || skillUid == null)) {
            material.push(mItem);
        }
    }

    var userSkillData = null;//用户的技能数据
    var currentSkillConfig = null;//当前的技能配置数据
    var needGold = 0;//需要的金币
    var userGold = 0;//用户拥有的金币
    var userName = "";//用户名
    var newSkillData = {};//新的技能数据

    var heroData = null;//要升级天赋技能的hero数据
    var upgradeSkillExp = 0;//要升级的技能的经验
    var upgradeSkillLevel = 1;//要升级的技能的等级
    var upgradeSkillId = null;//要升级的技能ID

    async.series([
        function (cb) { //判断要升级的技能和素材列表是否存在
            skill.getSkill(userUid, function (err, res) {
                if (err) {
                    cb("dbError", null);
                } else {
                    var skillList = res;
                    userSkillData = res;
                    if (skillUid != null && skillList[skillUid] == null) {
                        cb("propsNotExist", null);
                    } else {
                        var isExist = true;
                        for (var i = 0; i < material.length; i++) {
                            var skillItem = material[i];
                            if (skillList[skillItem] == null) {
                                isExist = false;
                                break;
                            }//if
                        }
                        if (isExist) {
                            cb(null, null);
                        } else {
                            cb("propsNotExist", null);
                        }
                    }
                }
            });
        },
        function (cb) {//如果是升级天赋技能，则取hero数据
            if (skillUid == null) {
                hero.getHero(userUid, function (err, res) {
                    if (err) cb("dbError", null);
                    else {
                        heroData = res[heroUid];
                        if (heroData == null) cb("propsNotExist", null);
                        else cb(null, null);
                    }
                });
            } else {
                cb(null, null);
            }
        },
        function (cb) {//判断技能否升级(超过允许的最大经验则不能升级)
            var skillConfig = configData.getConfig("skill");
            if (skillUid != null) {
                var upgradeSkill = userSkillData[skillUid];//要升级的技能数据
                upgradeSkillLevel = upgradeSkill["skillLevel"] - 0;//当前技能等级
                upgradeSkillId = upgradeSkill["skillId"];//当前技能
                upgradeSkillExp = upgradeSkill["skillExp"];
            } else {
                var cHeroConfig = configData.getConfig("hero");
                var cHeroId = heroData["heroId"];
                upgradeSkillId = cHeroConfig[cHeroId]["talentSkill"];
                upgradeSkillLevel = heroData["skillLevel"];
                upgradeSkillExp = heroData["skillExp"];
            }
            currentSkillConfig = skillConfig[upgradeSkillId];
            var maxLevel = (currentSkillConfig != null) ? (currentSkillConfig["maxLevel"] - 0) : 0;
            if (upgradeSkillLevel < maxLevel) {
                cb(null, null);
            } else {
                cb("levelOverflow", null); //已达到最高等级
            }
        },
        function (cb) { //判断金币是否够
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError", null);
                } else {
                    userGold = res["gold"];
                    userName = res["userName"];
                    var currentSkillLevel = upgradeSkillLevel - 0;//当前技能等级
                    var mStar = currentSkillConfig["star"] - 0;//当前的技能星级
                    //needGold = currentSkillLevel * currentSkillLevel * mStar * 100;
                    if (userGold >= needGold) {
                        cb(null, null);
                    } else {
                        cb("notMoney", null);
                    }
                }
            });
        },
        function (cb) { //计算技能经验并升级
            var skillConfig = configData.getConfig("skill");
            //var upgradeSkill = userSkillData[skillUid];//要升级的技能数据
            var skillGiveBaseExpConfig = configData.getConfig("skillGiveBaseExp");//技能的基础经验值配置
            var skillUpgradeNeedExpConfig = configData.getConfig("skillUpgradeNeedExp");//技能升级需要的经验配置
            var addExp = 0;//能增加的经验值
            for (var i = 0; i < material.length; i++) {
                var materialUid = material[i];
                var materialData = userSkillData[materialUid];//素材的数据
                if (materialData == null) continue;
                var materialSkillId = materialData["skillId"];//素材的技能ID
                var materialExp = materialData["skillExp"] - 0;//素材已有的经验
                var materialItemConfig = skillConfig[materialSkillId];//技能的配置
                var mStar = materialItemConfig["star"] || 2;//技能星级
                addExp += (skillGiveBaseExpConfig[mStar]["baseExp"] - 0 + materialExp);//每个素材增加的经验
            }
            var newSkillExp = upgradeSkillExp - 0 + addExp;//增加后的技能经验
            var skillId = upgradeSkillId;//技能ID
            var skillStar = skillConfig[skillId]["star"];//要升级的技能的星级
            var skillNeedExpList = skillUpgradeNeedExpConfig[skillStar]["needExp"];//当前技能的每级需要的经验表
            for (var mNewLevel = 1; mNewLevel < 10; mNewLevel++) {
                if (skillNeedExpList[mNewLevel] == null) break;
                var mNeedExp = skillNeedExpList[mNewLevel] - 0;
                if (newSkillExp < mNeedExp) {
                    break;
                }
            }
            if (skillUid != null) {
                newSkillData["userUid"] = userUid;
                newSkillData["skillUid"] = skillUid;
                newSkillData["skillId"] = skillId;
                newSkillData["skillLevel"] = mNewLevel;
                newSkillData["skillExp"] = newSkillExp;
                if (configData.skillStar(skillId) >= 4) { //技能等级
                    gameModel.addNews(userUid, gameModel.SKILL_UPGRADE, userName, skillId, mNewLevel);
                }
                skill.updateSkill(userUid, skillUid, {"skillLevel": mNewLevel, "skillExp": newSkillExp}, function (err, res) {
                    if (err)  cb("dbError", null);
                    else cb(null, null);
                });
            } else {
                newSkillData["userUid"] = userUid;
                newSkillData["skillExp"] = newSkillExp;
                newSkillData["skillLevel"] = mNewLevel;
                hero.updateHero(userUid, heroUid, newSkillData, function (err, res) {
                    if (err) cb("dbError", null);
                    else cb(null, null);
                });
            }
        },
        function (cb) { //如果被做为素材的技能已被装备则将它移除
            async.forEach(material, function (item, forEachCb) {
                modelUtil.removeRelated(userUid, item, "skill", function (err, res) {
                    if (err) {
                        forEachCb(err);
                    } else {
                        forEachCb();
                    }
                });
            }, function (err) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, null);
                }
            });
        },
        function (cb) { //删除被升级的素材
            async.forEach(material, function (item, forEachCb) {
                skill.removeSkill(userUid, item, function (err, res) {
                    forEachCb(null, null);
                });
            }, function (err) {
                if (err) cb(err, null);
                else cb(null, null);
            });
        },
        function (cb) { //将游戏币扣除
            user.updateUser(userUid, {"gold": userGold - needGold}, function (err, res) {
                cb(null, null);
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("skill.upgrade", jutil.errorInfo(err));
        } else {
            if (skillUid != null) {
                response.echo("skill.upgrade", {"needGold": needGold, "gold": userGold - needGold, "skill": newSkillData});
            } else {
                response.echo("skill.upgrade", {"needGold": needGold, "gold": userGold - needGold, "heroSkill": newSkillData});
            }
        }
    });
}

exports.start = start;