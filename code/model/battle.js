/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-11
 * Time: 下午6:36
 * 战斗数据
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var hero = require("../model/hero");
var formation = require("../model/formation");
var map = require("../model/map");
var async = require("async");
var configManager = require("../config/configManager");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var userVariable = require("../model/userVariable");
var teach = require("../model/teach");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");
var item = require("../model/item");
var card = require("../model/card");
var fuse = require("../model/fuse");
var specialTeam = require("../model/specialTeam");
var activityConfig = require("../model/activityConfig");
var title = require("../model/titleModel");
var gravity = require("../model/gravity");
var leagueDragon = require("../model/leagueDragon");
var bahamutWish = require("../model/bahamutWish");
var noble = require("../model/noble");
var upStarEquip = require("../model/upStarEquip");
var upStarEquipRefine = require("../model/upStarEquipRefine");

function getUserTeamDataByUserId(userUid,userData,listData,callBackFun){//listHero,listSkill,listEquip,listFormation,
    var configData = configManager.createConfig(userUid);
    var heroList = listData["heroList"];
    var skillList = listData["skillList"];
    var returnData = {};
    var defaultHeroFormation = {};
    var specialTargetTeam = {};
    var specialDefaultTeam = {};
    var specialData = {};
    var equipList = listData["equipList"];
    var formationList = listData["formationList"];
    var gravityList = listData["gravityList"];
    var dragonData = listData["dragonData"];
    var starData = listData["starData"];
    var towerData = listData["towerData"];
    var bufferData = listData["bufferData"];
    var nobleList = listData["nobleList"];
    var starEquipList = listData["starEquipList"];
    var starEquipRefineList = listData["starEquipRefineList"];
    var cardConfig = configData.getConfig("card");
    var mixConfig = configData.getConfig("mix");
    var mainConfig = configData.getConfig("main");
    var specialTeamConfig = configData.getConfig("specialTeam");
    var dragonConfig = configData.getConfig("starCraft");
    var dragonBuff = configData.getConfig("dragonBuff");//取龙珠祈福配置//["dragonBuff"]
    var userLevel = userData["lv"]-0;
    var researchAdd = function(heroUid,hero){
        var heroConfig = configData.getConfig("hero");
        var heroId = heroList[heroUid]["heroId"];
        var configHero = heroConfig[heroId];
        var level = heroList[heroUid]["research"];
        var add;
        if(level == 0){
            add = 0;
        }else if(level == 1){
            add = configHero["retreatBase"] - 0;
        }else{
            add = (configHero["retreatBase"] - 0) + (configHero["retreatAdd"] - 0) * level;
        }
        switch(configHero["retreatType"]){
            case "dodge":
                hero["dodge"] += add;
                break;
            case "crit":
                hero["crit"] += add;
                break;
            case "tough":
                hero["tough"] += add;
                break;
            case "hit":
                hero["hit"] += add;
                break;
            case "break":
                hero["break"] += add;
                break;
            case "preventBreak":
                hero["preventBreak"] += add;
                break;
            case "critDamage":
                hero["critDamage"] += add;
                break;
            default :
                break;
        }
    };
    /**
     * 获得装备加成
     * @param equipUid
     * @returns {null}
     */
    var equipAdd = function(equipUid,targetHero){
        if(equipList && equipList.hasOwnProperty(equipUid) && equipList[equipUid] != null){
            var equipConfig = configData.getConfig("equip");
            var itemConfig = configData.getConfig("item");
            var severEquip = equipList[equipUid];
            var returnEquip = {};
            var equip = equipConfig[severEquip["equipmentId"]];
            targetHero["hasId"].push(equip["ID"]);
            var level = severEquip["level"];
            var refiningLevel = severEquip["refiningLevel"];
            returnEquip["attr"] = Math.floor((equip["attr"] - 0) + (equip["attrAdd"] - 0) * (level - 1) +
                refiningLevel * (level-1) * 0.1 * (equip["refineAdd"] - 0));
            switch(equip["type"]){
                case 12:
                    targetHero["attack"] += returnEquip["attr"];
                    break;
                case 13:
                    targetHero["defence"] += returnEquip["attr"];
                    break;
                case 14:
                    targetHero["hp"] += returnEquip["attr"];
                    break;
            }
            //装备宝石加成
            for (var i = 1; i <= 4; i++) {
                if (severEquip["hole" + i] && severEquip["hole" + i] != "lock" && severEquip["hole" + i] != "unLock") {
                    var itemData = itemConfig[severEquip["hole" + i]];
                    switch (itemData["itemType"]) {//10中属性
                        case 37:
                            targetHero["attack"] += itemData["typeValue"];//攻击
                            break;
                        case 38:
                            targetHero["defence"] += itemData["typeValue"];//防御
                            break;
                        case 39:
                            targetHero["hp"] += itemData["typeValue"];//生命
                            break;
                        case 40:
                            targetHero["spirit"] += itemData["typeValue"];//元气
                            break;
                        case 41:
                            targetHero["hit"] += itemData["typeValue"];//爆伤
                            break;
                        case 42:
                            targetHero["dodge"] += itemData["typeValue"];//闪避
                            break;
                        case 43:
                            targetHero["crit"] += itemData["typeValue"];//爆击
                            break;
                        case 44:
                            targetHero["tough"] += itemData["typeValue"];//命中
                            break;
                        case 45:
                            targetHero["break"] += itemData["typeValue"];//招架
                            break;
                        case 46:
                            targetHero["preventBreak"] += itemData["typeValue"];//破招
                            break;
                        case 63:
                            targetHero["critDamage"] += itemData["typeValue"];//破招
                            break;
                    }
                }
            }
            //洗练加成
            var columnList = ["attack", "defence", "hp", "spirit", "crit", "tough", "dodge", "hit", "break", "preventBreak", "critDamage"];
            for (var k in columnList) {
                k = columnList[k];
                targetHero[k] += severEquip[k] == undefined?0:(severEquip[k] - 0);
            }
        }else{
            return null;
        }
    };
    var specialHeroAdd = function(returnHero,defaultHero){//七星阵上的英雄缘加成
        var yuanConfig = configData.getConfig("yuan");
        var yuan = returnHero["yuan"];
        var hasYuan = returnHero["hasId"];
        for(var i = 0 ; i < yuan.length ; i++){
            var itemYuan = yuan[i];
            var factorYuan = yuanConfig[itemYuan];
            var relationIds = factorYuan["relationIds"];
            var type = factorYuan["attrType"];
            var yuanType = factorYuan["yuanType"];
            var add = factorYuan["value"] - 0;
            var bo = factorYuan["yuanType"] == "and"?true:false;
            for(var j = 0  ; j < relationIds.length ; j ++){
                var another = (relationIds[j] - 0);
                if(hasYuan.indexOf(relationIds[j]) == -1 && hasYuan.indexOf(another) == -1){
                    bo = factorYuan["yuanType"] == "and"?false:bo;
                } else {
                    bo = factorYuan["yuanType"] == "and"?bo:true;
                }
            }
            if(bo == true){  //缘匹配成功
                switch(type){
                    case "attack":
                        returnHero["attack"] += defaultHero["attack"] * add;
                        break;
                    case "defence":
                        returnHero["defence"] += defaultHero["defence"] * add;
                        break;
                    case "hp":
                        returnHero["hp"] += defaultHero["hp"] * add;
                        break;
                    case "spirit":
                        returnHero["spirit"] += defaultHero["spirit"] * add;
                        break;
                }
            }
        }
    };
    var gravityHeroAdd = function(formationId){
        var formationHero = formationList[formationId];
        var returnHero = returnData[formationId];
        var defaultHero = defaultHeroFormation[formationId];
        returnHero["gravityEffect"] = defaultHero["gravityEffect"] = [];
        returnHero["canReborn"] = false;
        if(!gravityList.hasOwnProperty(formationHero["heroUid"])){
            return ;
        }
        var gravityData = gravityList[formationHero["heroUid"]];
        returnHero["hp"] += defaultHero["hp"]*gravityData["hpp"];
        returnHero["attack"] += defaultHero["attack"]*gravityData["attackp"];
        returnHero["defence"] += defaultHero["defence"]*gravityData["defencep"];
        returnHero["spirit"] +=defaultHero["spirit"]*gravityData["spiritp"];
        returnHero["hp"] += gravityData["hp"]-0;
        returnHero["attack"] += gravityData["attack"]-0;
        returnHero["defence"] += gravityData["defence"]-0;
        returnHero["spirit"] += gravityData["spirit"]-0;
        returnHero["crit"] += gravityData["crit"]-0;
        returnHero["tough"] += gravityData["tough"]-0;
        returnHero["dodge"] += gravityData["dodge"]-0;
        returnHero["hit"] += gravityData["hit"]-0;
        returnHero["break"] += gravityData["break"]-0;
        returnHero["preventBreak"] += gravityData["preventBreak"]-0;
        returnHero["critDamage"] += gravityData["critDamage"]-0;
        returnHero["gravityEffect"] = gravityData["gravityEffect"];
        returnHero["canReborn"] = gravityData["gravityEffect"].indexOf(8) != -1;
        defaultHero["gravityEffect"] = gravityData["gravityEffect"];
    };
    var cardAdd = function(callBack){
        var addArr = [];
        var cardEquipOpenLevel = mainConfig["cardEquipOpenLevel"];
        for(var key in defaultHeroFormation){
            var targetHero = returnData[key];
            var formationItem = formationList[key];
            var obj = {};
            var cardArr = [];
            if(cardEquipOpenLevel["1"] <= targetHero["level"]) cardArr.push(formationItem["card1"]);
            if(cardEquipOpenLevel["2"] <= targetHero["level"]) cardArr.push(formationItem["card2"]);
            if(cardEquipOpenLevel["3"] <= targetHero["level"]) cardArr.push(formationItem["card3"]);
            if(cardEquipOpenLevel["4"] <= targetHero["level"]) cardArr.push(formationItem["card4"]);
            if(cardEquipOpenLevel["5"] <= targetHero["level"]) cardArr.push(formationItem["card5"]);
            if(cardEquipOpenLevel["6"] <= targetHero["level"]) cardArr.push(formationItem["card6"]);
            obj["hero"] = targetHero;
            obj["card"] = cardArr;
            addArr.push(obj);
        }
        async.forEach(addArr,function(item,cb){
            var cardArr = item["card"];
            var hero = item["hero"];
            if(cardArr.length == 0){
                cb(null);
                return;
            }
            card.getCardItems(userUid,cardArr,function(err,res){
                if(err || res == null){
                    cb(new jutil.JError("getCardItemWrong"));
                }else{
                    for(var i = 0 ; i < res.length ; i++){
                        var cardItem = res[i];
                        var cardId = cardItem["cardId"]  //是什么卡片
                        var cardLevel = cardItem["level"];
                        var configCardItem = cardConfig[cardId];
                        var attributeType = configCardItem["attributeType"];  //加成哪一方面
                        var attributePerLevel = configCardItem["attributePerLevel"]; //等级对应加成数量
                        hero[attributeType] += attributePerLevel * cardLevel;
                    }
                    cb(null);
                }
            })
        },function(err){
            callBack(err,null);
        });
    };
    /**
     * 获得技能加成
     * @param skillUid
     * @param hero      英雄的基础属性集合
     * @returns {number}
     */
    var getSkillAdd = function(skillId,level){ //获得技能加成
        var skillConfig = configData.getConfig("skill");
        var add = 0;
        if(skillConfig && skillConfig.hasOwnProperty(skillId) && skillConfig[skillId] != null){
            var configSkill = skillConfig[skillId];
            var skillType = configSkill["skillType"];
            var skillLevel = level;
            add = (configSkill["attr"] - 0) + (configSkill["attrAdd"] - 0) * (skillLevel - 1);
        }
        return (add / 100);
    };
    var writeHasIdToHero = function(){//将七星阵中的英雄写到队伍中
        for(var key in returnData){
            var returnHero = returnData[key];
            returnHero["hasId"] = [];
            var rHeroId = returnHero["heroId"];
            for(var sKey in specialTargetTeam){
                var sHero = specialTargetTeam[sKey];
                sHero["hasId"] = sHero["hasId"] == null ? [] : sHero["hasId"];
                var sHeroId = sHero["heroId"];
                returnHero["hasId"].push(sHeroId);
                sHero["hasId"].push(rHeroId);
            }//for
        }//for
        for(var ikey in specialTargetTeam){
            var addItem = specialTargetTeam[ikey];
            var addItemHeroId = addItem["heroId"];
            for(var jkey in specialTargetTeam){
                var needAdd = specialTargetTeam[jkey];
                var needAddHeroId = needAdd["heroId"];
                if(addItemHeroId == needAddHeroId) continue;
                addItem["hasId"].push(needAddHeroId);
            }//for
        }//for
    };
    var dragonAdd = function(formationId){
        var returnHero = returnData[formationId];
        var defaultHero = defaultHeroFormation[formationId];
        returnHero["hp"] += defaultHero["hp"]*dragonData["hpLv"]*dragonConfig["attribPerLevel"];
        returnHero["attack"] += defaultHero["attack"]*dragonData["attackLv"]*dragonConfig["attribPerLevel"];
        returnHero["defence"] += defaultHero["defence"]*dragonData["defenceLv"]*dragonConfig["attribPerLevel"];
        returnHero["spirit"] +=defaultHero["spirit"]*dragonData["spiritLv"]*dragonConfig["attribPerLevel"];
    };
    var bahamnutWishSkillAdd = function (formationId, callBack) {//龙神的祝福技能加成  baseV
        bahamutWish.getBWSkillData(userUid, function (err, res) {
            if (err || res == undefined) {
            } else {
                var baseV = res;
                var returnHero = returnData[formationId];
                returnHero["attack"] += baseV["attack"];
                returnHero["defence"] += baseV["defence"];
                returnHero["hp"] += baseV["hp"];
                returnHero["spirit"] += baseV["spirit"];
            }
            callBack();
        });
    };
    var starAdd = function (formationId) {
        var returnHero = returnData[formationId];
        var defaultHero = defaultHeroFormation[formationId];
        var formationHero = formationList[formationId];
        if (starData && starData.hasOwnProperty(formationHero["heroUid"])) {
            var tmpObj = starData[formationHero["heroUid"]];
            returnHero["starEffect"] = defaultHero["starEffect"] = tmpObj;
        }
    };
    var towerAdd = function (formationId) {
        var returnHero = returnData[formationId];
        var defaultHero = defaultHeroFormation[formationId];
        for (var i in towerData) {
            if (parseInt(i) > 0) {
                i = towerData[i];
                returnHero["attack"] += (i["attack"] ? i["attack"] : 0) * defaultHero["attack"];
                returnHero["defence"] += (i["defence"] ? i["defence"] : 0) * defaultHero["defence"];
                returnHero["hp"] += (i["hp"] ? i["hp"] : 0) * defaultHero["hp"];
                returnHero["spirit"] += (i["spirit"] ? i["spirit"] : 0) * defaultHero["spirit"];
            }
        }
    };
    var bufferAdd = function (formationId) {
        var returnHero = returnData[formationId];
        var defaultHero = defaultHeroFormation[formationId];
        returnHero["attack"] += (bufferData["attack"] ? bufferData["attack"] : 0) * defaultHero["attack"];
        returnHero["defence"] += (bufferData["defence"] ? bufferData["defence"] : 0) * defaultHero["defence"];
        returnHero["hp"] += (bufferData["hp"] ? bufferData["hp"] : 0) * defaultHero["hp"];
        returnHero["spirit"] += (bufferData["spirit"] ? bufferData["spirit"] : 0) * defaultHero["spirit"];
    };
    var nobleAdd = function (formationId) {
        var returnHero = returnData[formationId];
        returnHero["attack"] += (nobleList["attack"] ? nobleList["attack"] : 0);
        returnHero["defence"] += (nobleList["defence"] ? nobleList["defence"] : 0);
        returnHero["hp"] += (nobleList["hp"] ? nobleList["hp"] : 0);
        returnHero["spirit"] += (nobleList["spirit"] ? nobleList["spirit"] : 0);
        returnHero["dodge"] += (nobleList["dodge"] ? nobleList["dodge"] : 0);
        returnHero["crit"] += (nobleList["crit"] ? nobleList["crit"] : 0);
        returnHero["hit"] += (nobleList["hit"] ? nobleList["hit"] : 0);
        returnHero["preventBreak"] += (nobleList["preventBreak"] ? nobleList["preventBreak"] : 0);
        returnHero["break"] += (nobleList["break"] ? nobleList["break"] : 0);
    };
    var starEquipAdd = function (formationId) {
        var returnHero = returnData[formationId];
        var formationHero = formationList[formationId];
        if (starEquipList && starEquipList.hasOwnProperty(formationHero["equip1"])) {
            var tmpObj = starEquipList[formationHero["equip1"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
        if (starEquipList && starEquipList.hasOwnProperty(formationHero["equip2"])) {
            var tmpObj = starEquipList[formationHero["equip2"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
        if (starEquipList && starEquipList.hasOwnProperty(formationHero["equip3"])) {
            var tmpObj = starEquipList[formationHero["equip3"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
    };
    var starEquipRefineAdd = function (formationId) {
        var returnHero = returnData[formationId];
        var formationHero = formationList[formationId];
        if (starEquipRefineList && starEquipRefineList.hasOwnProperty(formationHero["equip1"])) {
            var tmpObj = starEquipRefineList[formationHero["equip1"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
        if (starEquipRefineList && starEquipRefineList.hasOwnProperty(formationHero["equip2"])) {
            var tmpObj = starEquipRefineList[formationHero["equip2"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
        if (starEquipRefineList && starEquipRefineList.hasOwnProperty(formationHero["equip3"])) {
            var tmpObj = starEquipRefineList[formationHero["equip3"]];
            for (var key in tmpObj) {
                returnHero[key] += tmpObj[key];
            }
        }
    };
    async.series([
        function(callBack){//取七星阵队伍
            specialTeam.get(userUid,function(err,res){
                if(err) callBack(err)
                else{
                    specialData = res;
                    for(var key in  res){
                        var specialItem = res[key];
                        var heroUid = specialItem["heroUid"];
                        var defaultHero = {};
                        var targetHero = {};
                        if (heroUid == 0) continue;
                        var severHero = heroList[heroUid];
                        if (severHero == null) continue;
                        var heroId = severHero["heroId"];
                        defaultHero = configData.getHeroObjByIdLevel(heroId,severHero["level"],severHero["break"]);
                        targetHero = configData.getHeroObjByIdLevel(heroId,severHero["level"],severHero["break"]);
                        defaultHero["attack"] += severHero["attack"];
                        defaultHero["defence"] += severHero["defence"];
                        defaultHero["spirit"] += severHero["spirit"];
                        defaultHero["hp"] += severHero["hp"];
                        defaultHero["heroUid"] = severHero["heroUid"];
                        defaultHero["skill"][0]["skillLevel"] = severHero["skillLevel"];
                        targetHero["attack"] += severHero["attack"];
                        targetHero["defence"] += severHero["defence"];
                        targetHero["spirit"] += severHero["spirit"];
                        targetHero["hp"] += severHero["hp"];
                        targetHero["heroUid"] = severHero["heroUid"];
                        targetHero["skill"][0]["skillLevel"] = severHero["skillLevel"];
                        specialDefaultTeam[key] = defaultHero;
                        specialTargetTeam[key] = targetHero;
                    }
                    callBack(null,null);
                }
            });
        },
        function(callBack){          //取我方,和敌方,基本属性,队伍信息
            for(var key in formationList){
                var hero = {};
                var returnHero = {};
                var formationItem = formationList[key];   //队伍
                var severHero = heroList[formationItem["heroUid"]]; //服务器英雄
                if(severHero == null) {
                    console.error("找不到hero", userUid, formationItem["heroUid"], key);
                    callBack("dbError" , null) ;
                    return;
                }
                var heroId = severHero["heroId"];
                hero = configData.getHeroObjByIdLevel(heroId,severHero["level"],severHero["break"]);
                returnHero = configData.getHeroObjByIdLevel(heroId,severHero["level"],severHero["break"]);
                hero["attack"] += severHero["attack"];
                hero["defence"] += severHero["defence"];
                hero["spirit"] += severHero["spirit"];
                hero["hp"] += severHero["hp"];
                returnHero["attack"] += severHero["attack"];
                returnHero["defence"] += severHero["defence"];
                returnHero["spirit"] += severHero["spirit"];
                returnHero["hp"] += severHero["hp"];
                defaultHeroFormation[key] = hero;
                returnData[key] = returnHero;
                returnData[key]["formationId"] = key;
                returnData[key]["heroUid"] = formationItem["heroUid"];
            }
            writeHasIdToHero();
            callBack(null,null);
        },
        function(callBack){                //技能加成
            var heroConfig = configData.getConfig("hero");
            var skillConfig = configData.getConfig("skill");
            var allInitiativeSkill = [];
            var changePro = function (skillId, level, key) {
                if (skillId != "" && skillConfig[skillId] != null) {
                    var skillType = skillConfig[skillId]["skillType"];
                    var skillAdd = getSkillAdd(skillId, level);
                    return doSkillAdd(returnData, defaultHeroFormation, key, skillAdd, skillType);
                } else {
                    return false;
                }
            };
            var isRandomSkill = function (skillId) {
                if (!skillConfig.hasOwnProperty(skillId)) {
                    return false;
                }
                var skillType = skillConfig[skillId]["skillType"];
                if (skillType == 13 || skillType == 14) {
                    return true;
                } else {
                    return false;
                }
            };
            for(var key in defaultHeroFormation){
                var returnHero = returnData[key];
                returnHero["skill"] = [];
                var defaultHero = defaultHeroFormation[key];
                defaultHero["skill"] = [];
                for(var forKey in formationList){
                    var hero = heroList[formationList[forKey]["heroUid"]];
                    returnHero["hasId"].push(hero["heroId"]);
                }
                var formationItem = formationList[key];
                var severHero = heroList[formationItem["heroUid"]];
                var configHero = heroConfig[severHero["heroId"]];
                var fSkillLevel = severHero["skillLevel"];
                var fSkillId = configHero["talentSkill"];
                var fRandom = isRandomSkill(fSkillId);
                var tSkill;
                var sSkill;
                returnHero["hasId"].push(fSkillId);
                var sSkillId = "";
                var sSkillLevel = 1;
                var tSkillId = "";
                var tSkillLevel = 1;
                var skillListForCatalyst = [];
                if ((formationItem["skill2"] - 0) != 0) {
                    sSkill = skillList[formationItem["skill2"]];
                    if (sSkill) {
                        sSkillId = sSkill["skillId"] ? sSkill["skillId"] : "";
                        var sRandom = isRandomSkill(sSkillId);
                        returnHero["hasId"].push(sSkillId);
                        sSkillLevel = sSkill["skillLevel"] ? sSkill["skillLevel"] : 1;
                        skillListForCatalyst.push({
                            "skillId": sSkillId,
                            "skillLevel": sSkillLevel,
                            "skillUid": sSkill["skillUid"],
                            "formationUid": formationItem["formationUid"]
                        });
                    } else {
                        console.log(formationItem["skill2"]);
                    }
                }
                if ((formationItem["skill3"] - 0) != 0) {
                    tSkill = skillList[formationItem["skill3"]];
                    if (tSkill) {
                        tSkillId = tSkill["skillId"] ? tSkill["skillId"] : "";
                        var tRandom = isRandomSkill(tSkillId);
                        returnHero["hasId"].push(tSkillId);
                        tSkillLevel = tSkill["skillLevel"] ? tSkill["skillLevel"] : 1;
                        skillListForCatalyst.push({
                            "skillId": tSkillId,
                            "skillLevel": tSkillLevel,
                            "skillUid": tSkill["skillUid"],
                            "formationUid": formationItem["formationUid"]
                        });
                    } else {
                        console.log(formationItem["skill3"]);
                    }
                }
                var firstChange = changePro(fSkillId,fSkillLevel,key);
                if(firstChange){
                    defaultHero["skill"].push({skillId:fSkillId,"skillLevel":fSkillLevel});
                }else if(fSkillId != "" && firstChange != true){
                    returnHero["skill"].push({
                        "skillId": fSkillId,
                        "skillLevel": fSkillLevel,
                        "skillUid": 0,
                        "formationUid": formationItem["formationUid"],
                        "random": fRandom
                    });
                }
                var secondChange = changePro(sSkillId,sSkillLevel,key);
                if(secondChange){
                    defaultHero["skill"].push({skillId:sSkillId,"skillLevel":sSkillLevel});
                }else if(sSkillId != "" && secondChange != true){
                    returnHero["skill"].push({
                        "skillId": sSkillId,
                        "skillLevel": sSkillLevel,
                        "skillUid": sSkill["skillUid"],
                        "formationUid": formationItem["formationUid"],
                        "random": sRandom
                    });
                }
                var thirdChange = changePro(tSkillId,tSkillLevel,key);
                if(thirdChange){
                    defaultHero["skill"].push({skillId:tSkillId,"skillLevel":tSkillLevel});
                }else if(tSkillId != "" && thirdChange != true){
                    returnHero["skill"].push({
                        "skillId": tSkillId,
                        "skillLevel": tSkillLevel,
                        "skillUid": tSkill["skillUid"],
                        "formationUid": formationItem["formationUid"],
                        "random": tRandom
                    });
                }
                for(var n = 0 ; n < returnHero["skill"].length ; n++){
                    allInitiativeSkill.push(returnHero["skill"][n]);
                }
                //技能附魔加成
                for (var n = 0; n < skillListForCatalyst.length; n++) {
                    if (skillList && skillList.hasOwnProperty(skillListForCatalyst[n]["skillUid"])) {
                        var skillRow = skillList[skillListForCatalyst[n]["skillUid"]];
                        var columnList = ["attack", "defence", "hp", "spirit", "crit", "tough", "dodge", "hit", "break", "preventBreak", "critDamage"];
                        for (var k in columnList) {
                            k = columnList[k];
                            returnHero[k] += skillRow[k] == undefined ? 0 : (skillRow[k] - 0);
                        }
                    }
                }
            }
            async.forEach(allInitiativeSkill,function(item,callBackArr){
                skill.getSkillTrigger(userUid, item["formationUid"], item["skillUid"], function (err, res) {
                    if (err) {
                        callBackArr("battleWrong");
                    } else {
                        if (res == null) {
                            item["skillProp"] = 0;
                            item["skillCount"] = skillConfig[item["skillId"]]["probIni"];
                            item["time"] = 0;
                        } else {
                            item["skillProp"] = res["skillProp"] == null ? 0 : res["skillProp"];
                            item["skillCount"] = res["skillCount"];
                            item["skillTime"] = res["skillTime"];
                        }
                        item["skillProp"] = item["skillProp"];
                        callBackArr(null);
                    }
                });
            },function(err){
                if(err){
                    callBack("battleWrong",null);
                }
            });
            callBack(null,null);
        },
        function(callBack){                //装备加成
            for(var key in defaultHeroFormation){
                var targetHero = returnData[key];
                var formationItem = formationList[key];
                equipAdd(formationItem["equip1"],targetHero);
                equipAdd(formationItem["equip2"],targetHero);
                equipAdd(formationItem["equip3"],targetHero);
            }
            callBack(null,null);
        },
        function(callBack){  //特战队技能加成
            for(var sKey in specialTargetTeam){
                var skillConfig = configData.getConfig("skill");
                var changePro = function(skillId,level,key){
                    if(skillId != "" && skillConfig[skillId] != null){
                        var skillType = skillConfig[skillId]["skillType"];
                        var skillAdd = getSkillAdd(skillId,level);
                        return doSkillAdd(specialTargetTeam,specialDefaultTeam,key,skillAdd,skillType);
                    }else{
                        return false;
                    }
                }
                var sDefaultHero = specialDefaultTeam[sKey];
                var skillLevel = sDefaultHero["skill"][0]["skillLevel"];
                var skillId = sDefaultHero["skill"][0]["skillId"];
                changePro(skillId,skillLevel,sKey);
            }
            callBack(null, null);
        },
        function(callBack){   //缘加成
            for(var key in returnData){
                var returnHero = returnData[key];
                var defaultHero = defaultHeroFormation[key];
                specialHeroAdd(returnHero,defaultHero);
            }
            for(var sKey in specialTargetTeam){
                var sHero = specialTargetTeam[sKey];
                var sDefaultHero = specialDefaultTeam[sKey];
                specialHeroAdd(sHero,sDefaultHero);
            }
            callBack(null,null);
        },
        function(callBack){//七星阵加成
            for(var key in specialData){
                var specialItem = specialData[key];
                var specialHero = specialTargetTeam[key];
                if(specialHero == null) continue;
                var strong = specialItem["strong"];
                var specialItemConfig = specialTeamConfig["position"][key];
                var addType = specialItemConfig["addAttribute"];
                var addNum = (strong + 1) * 0.1;
                for(var heroKey in returnData){
                    var itemHero = returnData[heroKey];
                    itemHero[addType] += specialHero[addType] * addNum;
                }
            }
            callBack(null,null);
        },
        function(callBack){  //闭关属性加成
            for(var key in formationList){
                var heroUid = formationList[key]["heroUid"];
                var hero = returnData[key];
                researchAdd(heroUid,hero);
            }
            callBack(null,null);
        },
        function(callBack){ //真气加成
            cardAdd(function(err,res){
                callBack(err,null);
            });
        },
        function(callBack){//融合属性加成
            fuse.getFuse(userUid,function(err,res){
                if(err || res == null){
                    callBack(err,null);
                }else{
                    var mixHp = mixConfig["hp"];
                    var mixAttack = mixConfig["attack"];
                    var mixDefence = mixConfig["defence"];
                    var mixSpirit = mixConfig["spirit"];
                    var hpLevel = res["hpLevel"];
                    var defenceLevel = res["defenceLevel"];
                    var attackLevel = res["attackLevel"];
                    var spiritLevel = res["spiritLevel"];
                    for(var key in defaultHeroFormation){
                        var targetHero = returnData[key];
                        targetHero["hp"] = mixHp["levelLimit"] <= userLevel ? (targetHero["hp"] + hpLevel * mixHp["attrAdd"]) : targetHero["hp"];
                        targetHero["defence"] = mixDefence["levelLimit"] <= userLevel ? (targetHero["defence"] + hpLevel * mixDefence["attrAdd"]) : targetHero["defence"];
                        targetHero["attack"] = mixAttack["levelLimit"] <= userLevel ? (targetHero["attack"] + hpLevel * mixAttack["attrAdd"]) : targetHero["attack"];
                        targetHero["spirit"] = mixSpirit["levelLimit"] <= userLevel ? (targetHero["spirit"] + hpLevel * mixSpirit["attrAdd"]) : targetHero["spirit"];
                    }
                    callBack(null,null);
                }
            });
        },
        function(callBack){//重力训练室加成
            for(var key in defaultHeroFormation){
                gravityHeroAdd(key);
            }
            callBack(null,null);
        },
        function(callBack){
            if(dragonData != undefined){
                for(var key in defaultHeroFormation){
                    dragonAdd(key);
                }
            }
            callBack(null,null);
        },
        function(callBack){//龙神的祝福技能加成--bahamutWish
            var kz = Object.keys(defaultHeroFormation);
            async.eachSeries(kz,function(item,esCb){
                bahamnutWishSkillAdd(item,esCb);
            },function(err,res){
                callBack(null,null);
            });
        },
        function (callBack) {
            if (starData && Object.keys(starData).length > 0) {
                for (var key in defaultHeroFormation) {
                    starAdd(key);
                }
            }
            callBack(null, null);
        }, function (callBack) {
            if (towerData && Object.keys(towerData).length > 0) {
                for (var key in defaultHeroFormation) {
                    towerAdd(key);
                }
            }
            callBack(null, null);
        }, function (callBack) {
            if (bufferData) {
                for (var key in defaultHeroFormation) {
                    bufferAdd(key);
                }
            }
            callBack(null, null);
        }, function (callBack) {
            if (nobleList) {
                for (var key in defaultHeroFormation) {
                    nobleAdd(key);
                }
            }
            callBack(null, null);
        }, function (callBack) {
            if (starEquipList) {
                for (var key in defaultHeroFormation) {
                    starEquipAdd(key);
                }
            }
            callBack(null, null);
        }, function (callBack) {
            if (starEquipRefineList) {
                for (var key in defaultHeroFormation) {
                    starEquipRefineAdd(key);
                }
            }
            callBack(null, null);
        }
    ], function (err, res) {
        if (err) {
            callBackFun(err, null, null);
        } else {
            callBackFun(null, returnData, defaultHeroFormation);
        }
    });
}
/**
 * 获取战斗需求信息
 * @param userId
 */
function getBattleNeedData(userId,callback){
    var returnData = {};
    async.parallel([
        function(callBack){ //取得我方武将列表
            hero.getHero(userId,function(err,res){
                if(err || res == null){
                    callBack("battleWrong",null);
                }else{
                    var index = 0;
                    for(var key in res) {
                        index ++;
                    }
                    if(index == 0) {
                        console.error("玩家ID",userId);
                        callBack("battleWrong",null);
                    } else {
                        returnData["heroList"] = res;
                        callBack(null,null);
                    }
                }
            })
        },
        function(callBack){  //获取装备队列
            equipment.getEquipment(userId,function(err,res){
                if(err || res == null){
                    callBack("battleWrong",null);
                }else{
                    returnData["equipList"] = res;
                    callBack(null,null);
                }
            });
        },
        function(callBack){ //获取我方技能队列
            skill.getSkill(userId,function(err,res){
                if(err || res == null){
                    callBack("battleWrong",null);
                }else{
                    returnData["skillList"] = res;
                    callBack(null,null);
                }
            });
        },
        function(callBack){             ///获取队伍列表
            formation.getUserFormation(userId,function(err,res){
                if(err || res == null){
                    callBack("battleWrong",null);
                }else{
                    returnData["formationList"] = res;
                    callBack(null,null);
                }
            });
        },
        function(callBack){
            var gravityList = {};
            var baseV = ["hpp","attackp","defencep","spiritp"];
            gravity.getHeroList(userId, function(err, res){
                for(var j in res){
                    res[j]["gravityEffect"] = [];
                    for(var i in baseV){
                        res[j][baseV[i]] = res[j][baseV[i]]/10000;
                    }
                    for(var i = 1; i < res[j]["bigVigour"]-0; i++){
                        res[j]["gravityEffect"].push(i);
                    }
                    gravityList[res[j]["heroUid"]] = res[j];
                }
                returnData["gravityList"] = gravityList;
                callBack(null, null);
            });
        },
        function (callBack) {
            noble.getAddition(userId, function (err, res) {
                returnData["nobleList"] = res;
                callBack();
            });
        },
        function (callBack) {
            upStarEquip.getAddition(userId, function (err, res) {
                returnData["starEquipList"] = res;
                callBack();
            });
        },
        function (callBack) {
            upStarEquipRefine.getAddition(userId, function (err, res) {
                returnData["starEquipRefineList"] = res;
                callBack();
            });
        }
    ],function(err,res){
        if(err){
            callback(err,null);
        }else{
            callback(null,returnData);
        }
    });
}

function getBattleNeedDataForGlobalContest(userUid, callback) {
    var returnData = {};
    var heroUids = [];
    var globalFormation = {};
    var userFormation = {};
    async.series([
        function (callBack) { //取得我方武将列表
            hero.getHero(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else if (res.length == 0) {
                    callBack("battleWrong", null);
                } else {
                    heroUids = Object.keys(res);
                    returnData["heroList"] = res;
                    callBack(null);
                }
            });
        },
        function (callBack) { //获取队伍列表
            formation.getGlobalFormation(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong");
                } else {
                    globalFormation = res;
                    callBack();
                }
            });
        },
        function (callBack) {
            formation.getUserFormation(userUid, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    userFormation = res;
                    callBack(null);
                }
            });
        },
        function (callBack) {
            for (var a in globalFormation) {
                for (var b in userFormation) {
                    if (userFormation[b]["heroUid"] == globalFormation[a]["heroUid"]) {
                        globalFormation[a] = userFormation[b];
                        globalFormation[a]["formationUid"] = a;
                        break;
                    }
                }
            }
            var formationList = {};
            var j = 1;
            for (var i in globalFormation) {
                if (heroUids.indexOf(globalFormation[i]["heroUid"] + "") != -1) {
                    formationList[j] = globalFormation[i];
                    j++;
                }
            }
            if (j == 1) {
                callBack("DataError");
            } else {
                returnData["formationList"] = formationList;
                callBack(null, null);
            }
        },
        function (callBack) {
            equipment.getEquipment(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else {
                    returnData["equipList"] = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            skill.getSkill(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else {
                    returnData["skillList"] = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            var gravityList = {};
            var baseV = ["hpp", "attackp", "defencep", "spiritp"];
            gravity.getHeroList(userUid, function (err, res) {
                for (var j in res) {
                    res[j]["gravityEffect"] = [];
                    for (var i in baseV) {
                        res[j][baseV[i]] = res[j][baseV[i]] / 10000;
                    }
                    for (var i = 1; i < res[j]["bigVigour"] - 0; i++) {
                        res[j]["gravityEffect"].push(i);
                    }
                    gravityList[res[j]["heroUid"]] = res[j];
                }
                returnData["gravityList"] = gravityList;
                callBack(null, null);
            });
        }
    ], function (err, res) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, returnData);
        }
    });
}

/**
 *
 * @param targetHeroArr
 * @param defaultHeroArr
 * @param key
 * @param add
 * @param type
 * @returns {boolean}
 */
function doSkillAdd(targetHeroArr,defaultHeroArr,key,add,type){
    var targetHero =  targetHeroArr[key];
    var defaultHero =  defaultHeroArr[key];
    switch(type){
        case 2://加攻击buff
            targetHero["attack"] = targetHero["attack"]-0;
            targetHero["attack"] += defaultHero["attack"] * add;
            return true;
            break;
        case 3://加防御buff
            targetHero["defence"] = targetHero["defence"]-0;
            targetHero["defence"] += defaultHero["defence"] * add;
            return true;
            break;
        case 4://加元气buff
            targetHero["spirit"] = targetHero["spirit"]-0;
            targetHero["spirit"] += defaultHero["spirit"] * add;
            return true;
            break;
        case 5://加暴击buff
            targetHero["crit"] = targetHero["crit"]-0;
            targetHero["crit"] += (add * 100);
            return true;
            break;
        case 6://加防暴buff
            targetHero["tough"] = targetHero["tough"]-0;
            targetHero["tough"] += (add * 100);
            return true;
            break;
        case 7://加命中buff
            targetHero["hit"] = targetHero["hit"]-0;
            targetHero["hit"] +=(add * 100);
            return true;
            break;
        case 8://加闪避buff
            targetHero["dodge"] = targetHero["dodge"]-0;
            targetHero["dodge"] += (add * 100);
            return true;
            break;
        case 9://加破招buff
            targetHero["break"] = targetHero["break"]-0;
            targetHero["break"] +=(add * 100);
            return true;
            break;
        case 10://加招架buff
            targetHero["preventBreak"] = targetHero["preventBreak"]-0;
            targetHero["preventBreak"] += (add * 100);
            return true;
            break;
        case 11://群体攻击
            return true;
            break;
        case 12://加生命buff
            targetHero["hp"] = targetHero["hp"]-0;
            targetHero["hp"] += defaultHero["hp"] * add;
            return true;
            break;
        default:
            return false;
            break;
    }
}
/**
 * 更新技能信息
 * @param userUid
 * @param skillUid
 */
function upDataSkillInfo(userUid,skillUid,data,callBack){
    skill.updateSkill(userUid,skillUid,data,function(err,res){
        callBack(err,res);
    })
}

function returnDoOtherTeamSkill(configData, team){ //返回作用于其他方的技能
    var skillConfig = configData.getConfig("skill");
    var returnArr = [];
    for(var key in team){
        var defaultItem = team[key];
        if(defaultItem == null){
            console.error("没有此队员......",key);
            continue;
        }
        var defaultItemSkill = defaultItem["skill"] || [];
        for(var i = 0 ; i < defaultItemSkill.length ;i ++){
            var skill = defaultItemSkill[i];
            var skillId = skill["skillId"];
            var configSkill = skillConfig[skillId];
            if((configSkill["skillType"] - 0) == 11){   //给对方减少防御,之后有群攻技能在这里加
                returnArr.push({"skillId":skillId,"skillLevel":skill["skillLevel"]});
            }
        }
    }
    return returnArr;
}
function doSkillToAllHero(configData, skillArr,heroTeam,defaultTeam){     //释放作用于全体对眼的技能
    var skillConfig = configData.getConfig("skill");
    for(var i = 0 ; i < skillArr.length ; i ++){
        var skillItem = skillArr[i];
        var skillId = skillItem["skillId"];
        var skillLevel = skillItem["skillLevel"];
        var configSkillItem = skillConfig[skillId];
        var add = ((configSkillItem["attr"] - 0) + (configSkillItem["attrAdd"] - 0) * (skillLevel - 1)) / 100;
        switch(configSkillItem["skillType"]){
            case 11:
                for(var key in heroTeam){
                    var hero = heroTeam[key];
                    var defHero = defaultTeam[key];
                    hero["defence"] -= defHero["defence"] * add;
                    if( hero["defence"] < 0){
                        hero["defence"] = 0;
                    }
                }
                break;
        }
    }
}
function twoTeamBattle(configData, ownTeam,enemyTeam,isOwnFirst,round,defaultOwnTeam,defaultEnemyTeam,userUid,tabletsUserUid){    //两个队伍战斗
    var firstHitTeam;
    var lastHitTeam;
    var defultFirstHitTeam;
    var defultLastHitTeam;
    var fightRound = round;
    var roundData = [];
    var returnData = {};
    if(isOwnFirst){
        firstHitTeam = ownTeam;
        lastHitTeam = enemyTeam;
        defultFirstHitTeam = defaultOwnTeam;
        defultLastHitTeam = defaultEnemyTeam;
    }else{
        firstHitTeam = enemyTeam;
        lastHitTeam = ownTeam;
        defultFirstHitTeam = defaultEnemyTeam;
        defultLastHitTeam = defaultOwnTeam;
    }
    returnData["complete"] = false;
    returnData["win"] = false;
    var isFirstHit = true;
    if(fightRound == 1 || fightRound == 2){
        for(var i = 0 ; i < 11 ; i ++ ){  //战斗只能进行11个半轮
            isFirstHit = (fightRound == 1 && (i == 0 || i == 1))
            var halfRoundDate;
            if ((i % 2) == 0) {//(doFirst == true && (i / 2) % 2 == 0) || (doFirst == false && ((i - 1) / 2) % 2 == 1)
                halfRoundDate = halfRoundPlay(configData, firstHitTeam, lastHitTeam, isOwnFirst, defultFirstHitTeam, defultLastHitTeam, isFirstHit, userUid, tabletsUserUid);
            } else if ((i % 2) == 1) {
                var fid = isOwnFirst ? false : true;
                halfRoundDate = halfRoundPlay(configData, lastHitTeam, firstHitTeam, fid, defultLastHitTeam, defultFirstHitTeam, isFirstHit, userUid, tabletsUserUid);
            }
            if(halfRoundDate.length == 0){
                break;
            }else{
                for(var j = 0 ; j< halfRoundDate.length; j++){
                    roundData.push(halfRoundDate[j]);
                }
            }
        }
    }else{
        var ownSpirit = 0;
        var enemySpirit = 0;
        //var isWin = false;
        for(var key in ownTeam){
            ownSpirit += (ownTeam[key]["hp"] - 0);
            ownSpirit += (ownTeam[key]["spirit"] - 0);
        }
        for(var eKey in enemyTeam){
            enemySpirit += (enemyTeam[eKey]["hp"] - 0);
            enemySpirit += (enemyTeam[eKey]["spirit"] - 0);
        }
        if(ownSpirit > enemySpirit){
            returnData["win"] = true;
        }
        returnData["complete"] = true;
        roundData = [{"ownSpirit":ownSpirit,"enemySpirit":enemySpirit,"isWin":returnData["win"]}];
        returnData["roundData"] = roundData;
    }
    if(judgeHasHero(ownTeam,round) == true || judgeHasHero(enemyTeam,round) == true){
        returnData["complete"] = true;
        returnData["win"] = judgeHasHero(ownTeam,round) == true ? false : true;
    }else if(round == 3){
        returnData["complete"] = true;
    }else{
        returnData["complete"] = false;
    }
    returnData["roundData"] = roundData;
    return returnData;
}
function returnNewTeam(team, defaultTeam){
    var arr = [];
    var defaultArr = [];
    var getTeam = {};
    var getDefaultTeam = {};
    for(var key in team){
        var obj = team[key];
        obj["key"] = (key - 0);
        if(obj["hp"] >= 1){
            arr.push(obj);
            defaultArr.push(defaultTeam[key]);
        }
    }
    sortOn(arr,"key");
    for(var i = 0 ; i < arr.length ; i++){
        getTeam["" + (i + 1)] = arr[i];
        getDefaultTeam["" + (i + 1)] = defaultArr[i];
    }
    if(arr.length > 0){
        return [getTeam, getDefaultTeam];
    }else{
        return null;
    }
}

function judgeHasHero(team,round){
    var dead = true;
    for(var key in team){
        var item = team[key];
        if(item["hp"] > 0){
            dead = false;
        }
    }
    return dead;
}
function halfRoundPlay(configData, hitTeam, beHitTeam, isMeFirst, defaultHitTeam, defaultBeHitTeam, isFirstHit, userUid, tabletsUserUid) {  ///半轮攻击
    var returnData = [];
    var isMe = isMeFirst;
    var gravityTrainConfig = configData.getConfig("gravityTrain");
    if(hitTeam == null) console.log("hitTeam teamExist");
    if(beHitTeam == null) console.log("beHitTeam teamExist");
    for(var i = 1 ; i <= 8 ; i++){
        var hitHero;
        var beHitHero;
        var defaultHitHero;
        var defaultBeHitHero;
        var singleData = [];
        if(i % 2 == 0){   //后手永远在偶数位攻击
            hitHero = (beHitTeam && beHitTeam["" + i]) ? beHitTeam["" + i] : null;
            beHitHero = hitTeam;
            defaultHitHero = (defaultBeHitTeam && defaultBeHitTeam["" + i]) ? defaultBeHitTeam["" + i] : null;
            defaultBeHitHero = defaultHitTeam;
        }else{ //hit攻击
            hitHero = (hitTeam && hitTeam["" + i]) ? hitTeam["" + i] : null;
            beHitHero = beHitTeam;
            defaultHitHero = (defaultHitTeam && defaultHitTeam["" + i]) ? defaultHitTeam["" + i] : null;
            defaultBeHitHero = defaultBeHitTeam;
        }
        if(hitHero == null ||beHitHero == null || hitHero["hp"] < 1 || beHitHero["" + i] == null || beHitHero["" + i]["hp"] < 1){
            isMe = isMe ? false : true;
            continue;
        }
        var skillRelease = judgeSkillRelease(configData, hitHero, isFirstHit);
        if(skillRelease["skillId"] == "" && hitHero["gravityEffect"].indexOf(5) != -1 && gravityTrainConfig["effect"]["5"]["value1"] - Math.random() > 0){//触发连击
            var isBreak = false;
            for(var j = 0; !isBreak && gravityTrainConfig["effect"]["5"]["value2"] - j > 0; j++){
                var onceData = oneHeroAttackOther(configData, "" + i, hitHero, beHitHero, skillRelease, defaultBeHitHero, defaultHitHero, userUid, tabletsUserUid);
                for(var k in onceData){
                    if(j > 0 && k == 0)
                        onceData[k]["targetAtt"][0]["gravityEffect"].unshift("5");//标记连击
                    singleData.push(onceData[k]);
                }
                isBreak = beHitHero[i]["hp"] <= 0;
            }
        } else {
            singleData = oneHeroAttackOther(configData, "" + i, hitHero, beHitHero, skillRelease, defaultBeHitHero, defaultHitHero, userUid, tabletsUserUid);
        }
        for(var j = 0 ; j < singleData.length ; j ++){
            var item = singleData[j];
            //if(j == 0){
            //    if(isFirstHit && hitHero["gravityEffect"].indexOf(3) != -1)
            //        item["targetAtt"][0]["gravityEffect"].push("3");//触发先机
            //}
            item["isMe"] = isMe^item["isMe"]?false:true;
            returnData.push(item);
        }
        isMe = isMe ? false : true;
    }
    return returnData;
}
function judgeSkillRelease(configData, hero, isFirstHit){
    var randomSkill = function (skillId) {
        var skillConfig = configData.getConfig("skill");
        var skillType = skillConfig[skillId]["skillType"];
        if (skillType == 13 || skillType == 14) {
            var wishConfig = configData.getConfig("wish");
            var wish = wishConfig[skillType];
            var wishObj = jutil.deepCopy(wish);
            // 随机顺序
            wishObj.sort(function () {
                return 0.5 - Math.random();
            });
            skillId = wishObj[0];
        }
        return skillId;
    }
    var skillConfig = configData.getConfig("skill");
    var returnSkill = {"skillId" : "","skillLevel":1};
    var skillArr = hero["skill"];
    var gravityTrainConfig = configData.getConfig("gravityTrain");
    var add = (isFirstHit && hero["gravityEffect"].indexOf(3) != -1)?gravityTrainConfig["effect"]["3"]["value1"]:0//触发先机
    for(var i = 0 ; i < skillArr.length ; i ++){
        var skillItem = skillArr[i];
        var skillId = skillItem["skillId"];
        var configSkill =  skillConfig[skillId];
        skillItem["skillProp"] = skillItem["skillProp"] + configSkill["probAdd"];
        skillItem["skillCount"] = skillItem["skillCount"] + 1;
        var maxRound = configSkill["maxRound"];
        var maxProb = configSkill["maxProb"];
        var skillProp = skillItem["skillProp"] + maxProb*add;//先机计算
        if(skillItem["skillCount"] >= maxRound || skillProp > maxProb){
            skillProp = maxProb;
        }
        if (Math.random() * maxProb < skillProp || configSkill["skillType"] == 13 || configSkill["skillType"] == 14) {
            skillId = randomSkill(skillId);
            returnSkill["skillId"] = skillId;
            skillItem["skillCount"] = 0;
            skillItem["skillProp"] = 0;
            returnSkill["skillLevel"] = skillItem["skillLevel"];
            skillItem["skillTime"] = jutil.now();
            break;
        }
    }
    sortOn(skillArr,"skillTime");
    return returnSkill;
}       //格挡暴击
var userUidWatched = [26004692763, 18069061646, 26021464961, 27397195551, 17297411336, 12901679150];
var fs = require('fs');
function oneHeroAttackOther(configData, key, hit, beHitHeroObj, skill, defaultBeHitHero, defaultHitHero, userUid, tabletsUserUid) {
    /*
     26004692763
     18069061646
     26021464961
     27397195551
     17297411336
     12901679150
     */
    userUid = userUid - 0;
    tabletsUserUid = tabletsUserUid - 0;
    var oneByOne = function (beHit, pureHurt, pos, defaultBeHit) {  //被伤害目标 ，纯伤害
        beHit["hp"] = Math.floor(beHit["hp"]);
        var oneDate = {"position": (pos - 0), "gravityEffect": []};
        defence = beHit["defence"];
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "defence is " + ":" + jutil.now() + " | " + defence + "\n", 'utf8');
        }
        if (beHit["gravityEffect"].indexOf(6) != -1 && beHit["hp"] / defaultBeHit["hp"] <= gravityTrainConfig["effect"]["6"]["value1"]) {//触发背水一战
            oneDate["gravityEffect"].push("6");
            defence = Math.floor(defence * (gravityTrainConfig["effect"]["6"]["value2"] - 0 + 1));
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "6 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "defence is " + ":" + jutil.now() + " | " + defence + "\n", 'utf8');
        }
        hurt = pureHurt - defence <= 1 ? 1 : pureHurt - defence;
        if (hit["starEffect"]) {
            hurt += hurt * hit["starEffect"]["damageAdd"];
        }
        if (beHit["starEffect"]) {
            hurt -= hurt * beHit["starEffect"]["damageReduce"];
        }
        var counterHurt = false;//反震
        if (beHit["gravityEffect"].indexOf(4) != -1 && Math.random() < gravityTrainConfig["effect"]["4"]["value1"] && pos == key) {//触发反震
            counterHurt = true;
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "4 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "hurt is " + ":" + jutil.now() + " | " + hurt + "\n", 'utf8');
        }
        var fightAtLeast = false;
        if (hit["gravityEffect"].indexOf(9) != -1 && (hit["hp"] / defaultHitHero["hp"] <= gravityTrainConfig["effect"]["9"]["value1"] || userUid == "test")) {//破釜沉舟
            var ratio = gravityTrainConfig["effect"]["9"]["value2"] - 0;
            pureHurt += hit["attack"] * ratio;
            hurt = pureHurt - defence <= 1 ? 1 : pureHurt - defence; //检查破防
            hit["attack"] += hit["attack"] * ratio;
            hit["gravityEffect"].splice(hit["gravityEffect"].indexOf(9), 1);//移除9脉
            fightAtLeast = true;
            if (targetAtt[0]["gravityEffect"].indexOf("9") == -1) {
                targetAtt[0]["gravityEffect"].push("9");
            }
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "9 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        var randomBreak = beHit["break"] - hit["preventBreak"] > 0 ? beHit["break"] - hit["preventBreak"] : 0;//招架
        var randomCrit = hit["crit"] - beHit["tough"] > 0 ? hit["crit"] - beHit["tough"] : 0;//暴击
        var randomHit = beHit["dodge"] - hit["hit"] > 0 ? beHit["dodge"] - hit["hit"] : 0;//闪避
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "randomBreak randomCrit randomHit are " + ":" + jutil.now() + " | " + randomBreak + " | " + randomCrit + " | " + randomHit + "\n", 'utf8');
        }
        var breakHurt = false;
        var critHurt = false;
        var dodgeHurt = false;
        var randomBreakNum = Math.random();
        var randomCritNum = Math.random();
        var randomHitNum = Math.random();
        randomCrit = (randomCrit / 1200);
        if (hit["gravityEffect"].indexOf(7) != -1) {//触发狂怒
            var ratio = gravityTrainConfig["effect"]["7"]["value1"] - 0 + randomCrit;
            ratio = ratio * 100;
            randomCrit = Math.floor(ratio);
            randomCrit = randomCrit / 100;
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "7 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "hurt hit are " + ":" + jutil.now() + " | " + hurt + "\n" + JSON.stringify(hit) + "\n", 'utf8');
        }
        if (beHit["gravityEffect"].indexOf(10) != -1) {//触发敏锐
            var ratio = gravityTrainConfig["effect"]["10"]["value1"] - 0 + randomBreak;
            ratio = ratio * 100;
            randomBreak = Math.floor(ratio);
            randomBreak = randomBreak / 100;
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "10 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "randomBreak randomCrit randomHit are " + ":" + jutil.now() + " | " + randomBreak + " | " + randomCrit + " | " + randomHit + "\n", 'utf8');
        }
        if (randomBreakNum < (randomBreak / 1200) && pos == key) {   //已经被格挡
            breakHurt = true;
            hurt = Math.floor(hurt / 2);
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "ge dang hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        } else if (randomCritNum < randomCrit) { //已经暴击
            critHurt = true;
            hurt = Math.floor(hit["critDamage"] / 5000 * hurt);
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "bao ji hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        } else if (randomHitNum < (randomHit / 1200)) {  //已经被闪避
            dodgeHurt = true;
            hurt = 0;
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "shan bi hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "hurt is " + ":" + jutil.now() + " | " + hurt + "\n", 'utf8');
        }
        if (hit["gravityEffect"].indexOf(1) != -1 && beHit["hp"] / defaultBeHit["hp"] <= gravityTrainConfig["effect"]["1"]["value1"]) {//触发斩杀
            if (targetAtt[0]["gravityEffect"].indexOf("1") == -1)
                targetAtt[0]["gravityEffect"].push("1");
            hurt = Math.floor(hurt * (gravityTrainConfig["effect"]["1"]["value2"] - 0 + 1));
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "1 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "hurt is " + ":" + jutil.now() + " | " + hurt + "\n", 'utf8');
        }
        if (hurt - beHit["hp"] > 0 && beHit["canReborn"] && beHit["gravityEffect"].indexOf(8) != -1 || userUid == "test") {//触发濒死重生
            oneDate["gravityEffect"].push("8");
            beHit["canReborn"] = false;
            hurt = beHit["hp"] - 1;
            if (userUidWatched.indexOf(userUid) != -1) {
                fs.appendFile('battle.log', "8 line hited!!!!" + ":" + jutil.now() + "\n", 'utf8');
            }
        }
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "hurt is " + ":" + jutil.now() + " | " + hurt + "\n", 'utf8');
        }
        hurt = Math.floor(hurt);
        beHit["hp"] = beHit["hp"] - hurt;
        oneDate["hurt"] = hurt;
        oneDate["isBreak"] = breakHurt;
        oneDate["isCrit"] = critHurt;
        oneDate["isDodge"] = dodgeHurt;
        oneDate["isCounter"] = counterHurt;
        oneDate["isFightAtLeast"] = fightAtLeast;
        if (userUidWatched.indexOf(userUid) != -1) {
            fs.appendFile('battle.log', "pureHurt hurt others are " + ":" + jutil.now() + " | " + pureHurt + " | " + hurt + JSON.stringify(oneDate) + "\n" + JSON.stringify(hit) + "\n" + JSON.stringify(beHit) + "\n", 'utf8');
        }
        return oneDate;
    }
    var skillConfig = configData.getConfig("skill");
    var mainConfig = configData.getConfig("main");
    var gravityTrainConfig = configData.getConfig("gravityTrain");
    var aoeIndex = mainConfig["aoeIndex"];
    var returnArr = [];
    var skillId = skill["skillId"];
    var skillLevel = skill["skillLevel"];
    var returnObj = {"skillId":skillId,"isMe":true};
    returnArr.push(returnObj);
    var targetAtt = [{"position":(key - 0),"gravityEffect":[]}];
    var targetBeAtt = [];
    var skillType;
    var itemSkill;
    var defence = 0;
    if(skillId == ""){
        skillType = 0;
    }else{
        itemSkill = skillConfig[skillId];
        skillType = itemSkill["skillType"];
    }
    var pureHurt =  skillAdd(configData, skillId,skillLevel) / 100 * (hit["spirit"] - 0) + (hit["attack"] - 0);
    for(var itemKey in beHitHeroObj ){
        var beHurt;
        var defaultBeHurt;
        var data;
        var breakHurt;
        var counterHurt;
        var returnObjTwo;
        var _gravityEffect;
        var indexHurt = 0;
        var hurt = 0;
        if(skillType != 1){//单体
            beHurt = beHitHeroObj[key];//正对位的人
            defaultBeHurt = defaultBeHitHero[key];//正对位的人
            indexHurt = pureHurt;
            if(skillId != "" && beHurt["gravityEffect"].indexOf(2) != -1){//触发勘破
                indexHurt = Math.floor(indexHurt*(1-gravityTrainConfig["effect"]["2"]["value1"]));
            }
            data =  oneByOne(beHurt,indexHurt,key, defaultBeHurt);//打一个人
        }else{//群攻
            beHurt = beHitHeroObj[itemKey];
            if(beHurt["hp"] <= 0){
                continue;
            }
            indexHurt = pureHurt * Math.pow(itemSkill["aoeRatio"],aoeIndex[key][itemKey]);
            if(skillId != "" && beHurt["gravityEffect"].indexOf(2) != -1){//触发勘破
                indexHurt = Math.floor(indexHurt*(1-gravityTrainConfig["effect"]["2"]["value1"]));
            }
            defaultBeHurt = defaultBeHitHero[itemKey];//正对位的人
            data =  oneByOne(beHurt, indexHurt, itemKey, defaultBeHurt);
        }
        if (skillId != "" && beHurt["gravityEffect"].indexOf(2) != -1) {//触发勘破
            data["gravityEffect"].push("2");
        }
        if (data["isFightAtLeast"] == true) {//破釜沉舟
            //targetAtt["gravityEffect"].push("9");
        }
        targetBeAtt.push(data);
        if(data["isCounter"] == true && beHurt["hp"] >= 1){//反震
            counterHurt = Math.floor(hurt*gravityTrainConfig["effect"]["4"]["value2"] > 1 ? hurt*gravityTrainConfig["effect"]["4"]["value2"] : 1);
            //data["gravityEffect"].push("4");
            _gravityEffect = [];
            if(counterHurt - hit["hp"] > 0 && hit["canReborn"] && hit["gravityEffect"].indexOf(8) != -1){//触发濒死重生
                _gravityEffect.push("8");
                hit["canReborn"] = false;
                counterHurt = hit["hp"] - 1;
            }
            hit["hp"] = (hit["hp"] - 0) - counterHurt;
            returnObjTwo = {"skillId":"","isMe":false,"targetBeAtt":[{"position":(key - 0),"hurt":counterHurt,"isBreak":false,"isCounter":false,"isCrit":false,"isDodge":false,"gravityEffect": _gravityEffect}],"targetAtt":[{"position":(key - 0),"gravityEffect": ["4"]}]};
            returnArr.push(returnObjTwo);
        }
        if(data["isBreak"] == true && beHurt["hp"] >= 1){//招架
            breakHurt = (beHurt["attack"] - hit["defence"]) / 2 > 1 ? (beHurt["attack"] - hit["defence"])/2 : 1;
            _gravityEffect = [];
            if(breakHurt - hit["hp"] > 0 && hit["canReborn"] && hit["gravityEffect"].indexOf(8) != -1){//触发濒死重生
                _gravityEffect.push("8");
                hit["canReborn"] = false;
                breakHurt = hit["hp"] - 1;
            }
            breakHurt = Math.floor(breakHurt);
            hit["hp"] = (hit["hp"] - 0) - breakHurt;
            returnObjTwo = {"skillId":"","isMe":false,"targetBeAtt":[{"position":(key - 0),"hurt":breakHurt,"isBreak":false,"isCounter":false,"isCrit":false
                ,"isDodge":false,"gravityEffect": _gravityEffect}],"targetAtt":[{"position":(key - 0),"gravityEffect": []}]};
            returnArr.push(returnObjTwo);
        }
        if(skillType != 1){
            break;
        }
    }
    returnObj["targetBeAtt"] =targetBeAtt;
    returnObj["targetAtt"] = targetAtt;
    return returnArr;
}
/**
 * 获得技能加成
 * @param skillUid
 * @param hero      英雄的基础属性集合
 * @returns {number}
 */
function skillAdd(configData, skillId,level){ //获得技能加成
    var skillConfig = configData.getConfig("skill");
    var add = 0;
    if(skillConfig && skillConfig.hasOwnProperty(skillId) && skillConfig[skillId] != null){
        var configSkill = skillConfig[skillId];
        var skillType = configSkill["skillType"];
        var skillLevel = level;
        add = (configSkill["attr"] - 0) + (configSkill["attrAdd"] - 0) * (skillLevel - 1);
    }
    return add;
}
function sortOn(arr,type){  //降序排列
    arr.sort(function(a,b){
        if(a[type] < b[type]){    //a排在b前面
            return -1;
        }else if(a[type] > b[type]){
            return 1;
        }else{
            return 0;
        }
    })
}
/**
 * 计算地图掉落
 * @param userUid
 * @param mode
 * @param mapId
 * @param isWin
 * @param userData
 * @param callBackFun
 * @constructor
 */
function CalculationDrop(userUid,mode,mapId,isWin,userData,callBackFun){
    var configData = configManager.createConfig(userUid);
    //var mapConfig = configData.getConfig("map");
    if(mode == undefined)
        mode = "map";
    var mapConfig = configData.getConfig(getModeMap(mode));
    var activityLootConfig;
    var normalLootConfig = configData.getConfig("normalLoot");
    var teachConfig = configData.getConfig("teach");
    var mapItem = mapConfig[mapId];
    var returnData = null;
    var teachReturn = null;
    var thingData = {};
    var teachList;
    var multiplesConfig = {};
    async.series([
        function(callback){ //获取N倍活动配置
            activityConfig.getConfig(userUid, "mapDropMC", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    callback(null); //当前没有活动， 取默认
                } else if(configArray[1] == 0){//活动参数是0  取默认2倍
                    multiplesConfig = {"mapDropMC":2};
                    callback(null);
                }else{
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    callback(null);
                }
            });
        },
        function(callback){//取活动掉落配置
            activityConfig.getConfig(userUid,"activityLoot",function(err,res){
                var configArray = res;
                if (configArray[0] == false) {
                    activityLootConfig = null; //当前没有活动，为空
                } else {
                    var mArg = configArray[1];
                    if(mArg == -1){
                        activityLootConfig = configArray[2] || null;//如果报错，活动不进行
                    }else{
                        activityLootConfig = configData.getConfig("activityLoot")[mArg];
                    }
                }
                callback(null);
            });
        },
        function(callback){ //获取指点列表
            teach.getTeachList(userUid,function(err,res){
                if(err){
                    callback(err);
                }else{
                    teachList = res != null ? res : {};
                    callback(null);
                }
            })
        },
        function(callback){   //活动掉落
            if(isWin == false || activityLootConfig == null){   //未赢 或者没有活动 则不掉落活动奖励
                callback(null);
                return;
            }else{
                var randomCount = Math.random();
                for(var aKey in activityLootConfig){
                    if(randomCount < activityLootConfig[aKey]["maxProb"] && randomCount >= activityLootConfig[aKey]["minProb"]){   //掉落了
                        returnData = {};
                        returnData["id"] = activityLootConfig[aKey]["id"];
                        returnData["isPatch"] = activityLootConfig[aKey]["isPatch"] ? activityLootConfig[aKey]["isPatch"] : 0;
                        returnData["count"] = activityLootConfig[aKey]["count"];
                        break;
                    }
                }
                callback(null);
            }
        },
        function(callback){    //关卡掉落
            if(isWin == false||returnData != null){   //未赢  或者活动已经掉落,则不掉落关卡掉落
                callback(null);
                return;
            }else{
                var equip = mapItem["reward"]["loot"] ? mapItem["reward"]["loot"] : [];
                var multiples = multiplesConfig["mapDropMC"] != null ? (multiplesConfig["mapDropMC"] - 0) : 1;
                while(returnData == null && multiples != 0){
                    var randomCount = Math.random();
                    multiples --;
                    for(var i =0 ; i < equip.length ; i++){
                        var item = equip[i];
                        if(randomCount < (item["maxProb"]-0) && randomCount >= (item["minProb"] - 0)){
                            returnData = {};
                            returnData["id"] = item["id"];
                            returnData["count"] = item["count"];
                            returnData["count"] = 1;
                            break;
                        }//if
                    }//for
                }//while
                callback(null);
            }//else
        },
        function(callback){ //通用掉落，不管赢或者输都有可能掉落
            if(returnData != null){
                callback(null);
                return;
            }else{
                var randomCount = Math.random();
                for(var aKey in normalLootConfig){
                    var normalLootItem = normalLootConfig[aKey]
                    if(randomCount < normalLootItem["maxProb"] && randomCount >= normalLootItem["minProb"]){   //掉落了
                        returnData = {};
                        returnData["id"] = normalLootItem["id"];
                        returnData["count"] = normalLootItem["count"];
                        break;
                    }
                }
                callback(null);
            }
        },
        function(callback){   //碎片掉落
            if(returnData != null){
                callback(null);
                return;
            }else{
                var playerConfig = configData.getConfig("player");
                var mainConfig = configData.getConfig("main");
                var userLevel = userData["lv"]-0;
                var skillConfig = configData.getConfig("skill");
                var skillPatch = playerConfig["" + userLevel]["skillPatch"];
                var skillItem = skillConfig[skillPatch];
                var random = Math.random();
                var patchLootProb = mainConfig["patchLootProb"];
                debris.getDebrisItem(userUid,skillPatch,function(err,res){
                    if(err){
                        callback(err);
                        return;
                    }else{
                        var lengthSkill;
                        if(res == null){
                            lengthSkill = 0;
                        }else{
                            lengthSkill = res["type1"] + res["type2"] +res["type3"] +res["type4"] +res["type5"] +res["type6"];
                        }
                        var endProb = patchLootProb - lengthSkill *  mainConfig["patchLootProbReduce"];
                        if(random < endProb){ //有碎片掉落，
                            returnData = {};
                            returnData["id"] = skillPatch;
                            returnData["count"] = 1;
                            returnData["isPatch"] = 1;
                        }
                        callback(null);
                    }
                });
            }
        },
        function(callback){//指点掉落，不管赢或者输都有可能掉落
            var firstTeach = {};
            var secondTeach = {};
            var thirdTeach = {};
            var inTime = 0;  //正在倒计时的指点数量
            var hasEatTeachTime = 0;
            var random = Math.random();
            userVariable.getVariableTime(userUid,"eatTeach",function(err,res){
                if(err){
                    callback(err);
                    return;
                }else{
                    hasEatTeachTime = res == null ? 0 : res;
                }
                var teachL = teachList.length;
                for (var i = 0; i < teachL; i++) {
                    var item = teachList[i];
                    var level = item["level"];
                    var teachItem = teachConfig.hasOwnProperty(level.toString()) ? teachConfig[level.toString()] : null;
                    if (teachItem && ((item["time"] - 0) + (teachItem["time"] - 0)) > jutil.now()) {   //正在倒计时
                        inTime++;
                    }
                }
                if(inTime >= (teachConfig["maxTeachCount"] - 0) || random == 0){///正在倒计时的指点数量大于等于4个  则不会掉指点了
                    callback(null);
                }else{
                    firstTeach["minProb"] = 0;
                    firstTeach["maxProb"] = inTime * teachConfig["1"]["probAdd"] + teachConfig["1"]["probBase"] - hasEatTeachTime * teachConfig["1"]["probReduce"];
                    firstTeach["maxProb"] = firstTeach["maxProb"] < 0 ? 0 : firstTeach["maxProb"];

                    secondTeach["minProb"] = firstTeach["maxProb"];
                    secondTeach["maxProb"] = firstTeach["maxProb"] + inTime * teachConfig["2"]["probAdd"] + teachConfig["2"]["probBase"] - hasEatTeachTime * teachConfig["2"]["probReduce"];
                    secondTeach["maxProb"] = secondTeach["maxProb"] < 0 ? 0 : secondTeach["maxProb"];

                    thirdTeach["minProb"] = secondTeach["maxProb"];
                    thirdTeach["maxProb"] = secondTeach["maxProb"] + inTime * teachConfig["3"]["probAdd"] + teachConfig["3"]["probBase"] - hasEatTeachTime * teachConfig["3"]["probReduce"];
                    thirdTeach["maxProb"] = thirdTeach["maxProb"] < 0 ? 0 : thirdTeach["maxProb"];
                    if(random >= firstTeach["minProb"] && random < firstTeach["maxProb"]){
                        teachReturn = {};
                        teachReturn["level"] = "1";
                    }else if(random >= secondTeach["minProb"] && random < secondTeach["maxProb"]){
                        teachReturn = {};
                        teachReturn["level"] = "2";
                    }else if(random >= thirdTeach["minProb"] && random < thirdTeach["maxProb"]){
                        teachReturn = {};
                        teachReturn["level"] = "3";
                    }
                    callback(null);
                }
            });
        }
    ],function(err){
        thingData["equipData"] = returnData;
        thingData["teachData"] = teachReturn;
        callBackFun(null,thingData);
    });
}
/**
 *返回铜人数据
 */
function returnBronzeData(userData,addInfo,callBack){
    var battleNeedData;
    var targetBattleTeam;
    var returnData = {};
    var defaultBattleTeam;
    var userUid = userData["userUid"];
    var configData = configManager.createConfig(userUid);
    async.series([
        function(callBack){

            getBattleNeedData(userUid,function(err,res){
                if(err || res == null){
                    callBack("BronzeDataWrong",null);
                    return;
                }
                battleNeedData = res;
                callBack(null,null);
            });
        },
        function(callBack){//获队伍
            leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    battleNeedData["dragonData"] = res;
                    callBack(null);
                }
            });
        },
        function(callBack){//获队伍
            getUserTeamDataByUserId(userUid,userData,battleNeedData,function(err,targetTeam,defaultTeam){
                if(err || targetTeam == null || defaultTeam == null){
                    callBack("BronzeDataWrong",null);
                    return;
                }
                for(var key in defaultTeam){
                    var defaultItem = defaultTeam[key];
                    var targetItem = targetTeam[key];
                    targetItem["attack"] += targetItem["attack"] * addInfo;
                }
                targetBattleTeam = targetTeam;
                defaultBattleTeam = defaultTeam;
                callBack(null,null);
            });
        },
        function(callBack) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function(callBack){
            var isRandomSkill = function (skillId) {
                var skillType = skillConfig[skillId]["skillType"];
                if (skillType == 13 || skillType == 14) {
                    return true;
                } else {
                    return false;
                }
            }
            var randomSkill = function (skillId) {
                var skillType = skillConfig[skillId]["skillType"];
                if (skillType == 13 || skillType == 14) {
                    var wishConfig = configData.getConfig("wish");
                    var wish = wishConfig[skillType];
                    var wishObj = jutil.deepCopy(wish);
                    // 随机顺序
                    wishObj.sort(function () {
                        return 0.5 - Math.random();
                    });
                    skillId = wishObj[0];
                }
                return skillId;
            }
            returnData["ownTeam"] = getTeamReturnData(defaultBattleTeam,targetBattleTeam,userData);
            returnData["moment"] = userData["momentum"];
            returnData["roundData"] = [];
            var totleHurt = 0;
            var skillConfig = configData.getConfig("skill");
            var mainConfig = configData.getConfig("main");
            var aoeIndex = mainConfig["aoeIndex"];
            var singleRound = [];
            var heroId =  returnData["ownTeam"]["team"]["0"]["heroId"];
            for(var key in targetBattleTeam){
                var hit = targetBattleTeam[key];
                var skillArr = hit["skill"];
                var skillId = "";
                var skillLevel = 1;
                var randomIndex = Math.floor(skillArr.length * Math.random());
                if (skillArr.length >= 1) {
                    skillId = skillArr[randomIndex]["skillId"];
                    skillLevel = skillArr[randomIndex]["skillLevel"];
                    if (isRandomSkill(skillId)) {
                        skillId = randomSkill(skillId);
                    }
                }
                var skillType = skillConfig[skillId] == null ? 0 : skillConfig[skillId]["skillType"];
                var pureHurt =  (skillAdd(configData, skillId,skillLevel) / 100 * (hit["spirit"] - 0) + (hit["attack"] - 0));
                var targetBeAtt = [];
                for(var itemKey in targetBattleTeam ){
                    var data = {};
                    if(skillType != 1){
                        totleHurt += pureHurt;
                        data = {"position":(key - 0),"hurt":pureHurt,"isBreak":false,"isCrit":false,"isDodge":false,"gravityEffect":[]};
                    }else{
                        var itemSkill = skillConfig[skillId];
                        var indexHurt = pureHurt * Math.pow(itemSkill["aoeRatio"],aoeIndex[key][itemKey]);
                        totleHurt += indexHurt;
                        data = {"position":(itemKey - 0),"hurt":indexHurt,"isBreak":false,"isCrit":false,"isDodge":false,"gravityEffect":[]};
                    }
                    targetBeAtt.push(data);
                    if(skillType != 1){
                        break;
                    }
                }
                singleRound.push({"isMe":true,"skillId":skillId,"targetBeAtt":targetBeAtt,"targetAtt":[{"position":(key - 0),"gravityEffect":[]}]});
            }
            returnData["roundData"].push(singleRound);
            returnData["totleHurt"] = Math.floor(totleHurt);
            returnData["heroId"] = heroId;
            returnData["gravityEffect"] = [];
            callBack(null,null);
        }
    ],function(err,res){
        if(err){
            callBack(err,null);
        }else{
            callBack(null,returnData)
        }
    });
}

/**
 * 获取队伍返回数据
 * @param defaultTeam
 */
function getTeamReturnData(defaultTeam, targetTeam, userData) {
    var returnData = {};
    returnData["name"] = userData["userName"];
    returnData["team"] = [];
    for (var dKey in defaultTeam) {
        var item = defaultTeam[dKey];
        var battle = targetTeam[dKey];
        if (battle) {
            var skillIdArr = [];
            for (var s = 0; s < item["skill"].length; s++) {
                skillIdArr.push(item["skill"][s]["skillId"]);
            }
            returnData["team"][(dKey - 0) - 1] = {
                "heroId": item["heroId"],
                "spirit": battle["spirit"],
                "hp": battle["hp"],
                "skill": skillIdArr,
                "gravityEffect": item["gravityEffect"]
            };
        }
    }
    return returnData;
}
/**
 *更新所有技能
 * @param battleTeam
 */
function upDataSkillInfo(battleTeam,userUid,callBack){
    var upDataSkillArr = [];
    for(var key in battleTeam){
        var item = battleTeam[key];
        var skillArr = item["skill"];
        for(var i = 0 ; i < skillArr.length ; i ++){
            var obj = {};
            obj["formationId"] = key;
            obj["skill"] = skillArr[i];
            upDataSkillArr.push(obj);
        }
    }
    async.forEach(upDataSkillArr,function(item,cb){
        var skillItem = item["skill"];
        var formationId = item["formationId"];
        skill.setSkillTrigger(userUid,formationId,skillItem["skillUid"],skillItem["skillProp"],skillItem["skillCount"],skillItem["skillTime"],function(err,res){
            cb(err);
        });
    },function(err){
        callBack(err,null);
    })
}
function getMapJudgeNeedData(userUid,mapId,callBack){
    var returnData = {};
    async.parallel([
        function(cb){//获取用户信息,判断体力是否足够
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    returnData["userData"] = res;
                    cb(null,null)
                }
            });
        },
        function(cb){//获取地图信息，地图是否开启以及剩余挑战次数是否足够
            map.getMapItem(userUid,mapId,function(err,res){
                if(err || res == null){
                    cb("mapWrong",null);
                }else{
                    if(res["star"] == 0){
                        cb("mapWrong",null);
                    }else{
                        returnData["mapItem"] = res;
                        cb(null,null);
                    }
                }
            });
        },
        function(cb){//获取队伍信息
            formation.getUserFormation(userUid,function(err,res){
                if(err || res == null){
                    cb("battleWrong",null);
                }else{
                    returnData["formationList"] = res;
                    cb(null,null);
                }
            });
        },
        function(cb){ //取得我方武将列表
            hero.getHero(userUid,function(err,res){
                if(err || res == null){
                    cb("battleWrong",null);
                }else{
                    returnData["heroList"] = res;
                    cb(null,null);
                }
            })
        },
        function(cb){//获取上次连闯的CD时间，和打的时间
            userVariable.getVariableTime(userUid,"continueValue",function(err,res){
                var continueData = {};
                if(err){
                    cb(err,null);
                }else{
                    if(res == null){
                        continueData["time"] = jutil.now();
                        continueData["value"] = 0;
                    }else{
                        continueData = res;
                    }
                    returnData["continueData"] = continueData;
                    cb(null,null);
                }
            })
        }
    ],function(err,res){
        if(err){
            callBack(err,null);
        }else{
            callBack(err,returnData);
        }
    });
}
function calculateMapReward(mode,mapId,userData,isWin,firstThree,callBack){ //计算该用户刷副本掉落的奖励
    if(mode == undefined)
        mode = "map";
    var configData = configManager.createConfig(userData["userUid"]);
    var returnData = {};
    async.parallel([
        function(cb){
            CalculationDrop(userData["userUid"],mode,mapId,isWin,userData,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData["drop"] = res;
                    cb(null,null);
                }
            });
        },
        function(cb){
            var updateUser = {};
            //var mapConfig = configData.getConfig("map");
            var mapConfig = configData.getConfig(getModeMap(mode));
            var mapItem = mapConfig[mapId];
            var mapReward = mapItem["reward"];
            var playerConfig = configData.getConfig("player");
            //var playerLevel = userData["lv"]-0;
            var playerConfigItem = playerConfig[userData["lv"]];
            var threeBle = firstThree ? 3 : 1;
            var personExp = (playerConfigItem["getPlayerExp"] - 0) * threeBle;
            updateUser["exp"] = personExp;
            updateUser["gold"] = mapReward["gold"];
            returnData["userData"] = updateUser;
            returnData["heroExp"] = mapReward["exp"];
            cb(null,null)
        }
    ],function(err,res){
        callBack(err,returnData);
    });
}
function addDeadInBackData(teamData, backData, round) {
    for (var key in teamData) {
        var item = teamData[key];
        if (item["hp"] <= 0) {
            var formationIndex = (item["formationId"] - 0) - 1;
            if (backData[formationIndex]) {
                backData[formationIndex]["dead"] = teamData[key]["dead"] ? teamData[key]["dead"] : round;
            }
        }
    }
}
function addBloodAddInfo(ownerTeam,defaultTeam,redisInfo){
    addItem(ownerTeam,defaultTeam,redisInfo["attackAddition"],"attack");
    addItem(ownerTeam,defaultTeam,redisInfo["defenceAddition"],"defence");
    addItem(ownerTeam,defaultTeam,redisInfo["bloodAddition"],"hp");
    addItem(ownerTeam,defaultTeam,redisInfo["spiritAddition"],"spirit");
}
function addItem(ownerTeam,defaultTeam,addItem,addKey){
    if(addItem == 0) return;
    for(var key in ownerTeam){
        var item = ownerTeam[key];
        var defaultItem = defaultTeam[key];
        if(item == null || defaultItem == null) continue;
        item[addKey] = item[addKey] * addItem + item[addKey];
    }
}

function getModeList(){
    var modeList = {
        "easy":{"map":"map","bigMap":"bigMap"},
        "hard":{"map":"hardMap","bigMap":"hardBigMap"}
    };
    return modeList;
}
function getModeMap(mode){
    var modeList = getModeList();
    return modeList[mode]["map"];
}
function getModeBigMap(mode){
    var modeList = getModeList();
    return modeList[mode]["bigMap"];
}

exports.getUserTeamDataByUserId = getUserTeamDataByUserId;
exports.doSkillAdd = doSkillAdd;
exports.sortOn = sortOn;
exports.doSkillToAllHero = doSkillToAllHero;
exports.judgeHasHero = judgeHasHero;
exports.twoTeamBattle = twoTeamBattle;
exports.CalculationDrop = CalculationDrop;
exports.getBattleNeedData = getBattleNeedData;
exports.returnDoOtherTeamSkill = returnDoOtherTeamSkill;
exports.getTeamReturnData = getTeamReturnData;
exports.returnBronzeData = returnBronzeData;
exports.returnNewTeam = returnNewTeam;
exports.upDataSkillInfo = upDataSkillInfo;
exports.getMapJudgeNeedData = getMapJudgeNeedData;
exports.calculateMapReward = calculateMapReward;
exports.addDeadInBackData = addDeadInBackData;
exports.addBloodAddInfo = addBloodAddInfo;
exports.getModeList = getModeList;
exports.getModeMap = getModeMap;
exports.getModeBigMap = getModeBigMap;
exports.getBattleNeedDataForGlobalContest = getBattleNeedDataForGlobalContest;
