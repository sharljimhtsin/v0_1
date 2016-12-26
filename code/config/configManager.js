var bitUtil = require("../alien/db/bitUtil");
var configHandler = require("./configHandler");
var ConfigUtil = require("../alien/config/ConfigUtil");
var userVariable = require("../model/userVariable");
var configDataDic = {};

function Config(configData) {
    this._configData = configData;
}


/**
 * 取配置数据
 * @param name
 * @returns {*}
 */
Config.prototype.getConfig = function (name) {
    if (name == "skill") name = "skillCast";
    return this._configData[name];
};


Config.prototype.getConfigLanguage = function (name, userUid, callBackFun) {
    if (name == "skill") name = "skillCast";

    var defaultName = name;
    var configData = this._configData;
    userVariable.getLanguage(userUid,function(err,res){
        if(err){}
        else{
            if(name=="achievement") {// 涉及多语言配制文件
                switch (res) {
                    case "entw":
                        name = "achievement_entw";
                        break;
                    case "ger":
                        name = "achievement_ger";
                        break;
                    case "fra":
                        name = "achievement_fra";
                        break;
                    case "esp":
                        name = "achievement_esp";
                        break;
                    case "ara":
                        name = "achievement_ara";
                        break;
                    default:
                        name = "achievement";
                        break;
                }
                if (configData[name] == undefined)  name = "achievement"; // 台湾安卓双语版，繁体系统
            }else{ // 其它涉及多语言配制文件
                //......
            }
        }

        if(configData[name]!=null)
            callBackFun(null,configData[name]);
        else
            callBackFun(null,configData[defaultName]);
    });
};


/**
 * 用户的经验值转为等级的值
 */
Config.prototype.userExpToLevel = function (level, exp) {
    var player = this.getConfig("player");
    var item = player[level];
    while(item != undefined && exp >= (item["needPlayerExp"] - 0)){
        level = item["playerLevel"]+1;
        exp -= (item["needPlayerExp"] - 0);
        item = player[level];
    }
    var allexp = 0;
    for(var i = 1; i < level; i++){
        item = player[i];
        allexp += (item["needPlayerExp"] - 0);
    }
    allexp += exp;
    return [level, exp, allexp];
};

/**
 * 用户的等级值转为经验
 * @param level
 */
Config.prototype.userLevelToExp = function (level) {
    var player = this.getConfig("player");
    var mLevel = level - 1;
    if (mLevel <= 0) return 0;
    else {
        var mExp = (player[mLevel] != null) ? player[mLevel]["needPlayerExp"] : 4112946000;
        return mExp;
    }
};


/**
 * 获取弟子等级
 */
Config.prototype.heroExpToLevel = function (heroId, exp) {
    var heroConfig = this.getConfig("hero");
    var heroItem = heroConfig[heroId];
    var expRatio = this.getConfig("expRatio");
    var baseExp = heroItem["baseExp"];
    var level = 0;
    for (var i = 1; ; i++) {
        var key = "" + i;
        var downKey = "" + (i + 1);
        if (expRatio[downKey] == null) {
            level = i;
            break;
        }
        var upExp = baseExp * expRatio[key];
        var dowExp = baseExp * expRatio[downKey];
        if (exp >= upExp && exp < dowExp) {
            level = i;
            break;
        }
    }
    return level;
};


Config.prototype.heroLevelToExp = function (heroId, level) {
    var heroConfig = this.getConfig("hero");
    var heroItem = heroConfig[heroId];
    var expRatio = this.getConfig("expRatio");
    var baseExp = heroItem["baseExp"];
    return baseExp * expRatio[level];
};

/**
 * 取一个heroId 在玩家等级限制下的最大等级
 * @param heroId
 * @param playerLevel
 * @returns {*}
 */
Config.prototype.heroMaxExp = function (heroId, playerLevel) {
    var heroMaxLevel = playerLevel * 4;
    if (heroMaxLevel < 100) heroMaxLevel = 100;
    return this.heroLevelToExp(heroId, heroMaxLevel);
};


//取一个heroId 对应的星级
Config.prototype.heroStar = function (heroId) {
    return this.g("hero")(heroId)("star")();
};


//取装备id对应的星级
Config.prototype.equipStar = function (equipId) {
    return this.g("equip")(equipId)("star")();
};

//取技能对应星级
Config.prototype.skillStar = function (skillId) {
    return this.g("skill")(skillId)("star")();
};

//取ID对应的星级
Config.prototype.idStar = function (id) {
    return this.heroStar(id) || this.equipStar(id) || this.skillStar(id);
};


/**
 *通过等级英雄ID获取英雄基本配置
 * @param heroId
 * @param level
 * @param breakLevel
 */
Config.prototype.getHeroObjByIdLevel = function (heroId, level, breakLevel) {
    var heroConfig = this.getConfig("hero");
    var breakConfig = this.getConfig("breakThrough");
    var hero = heroConfig[heroId];
    var returnHero = {};
    if (hero == null) {
        console.error("heroId不存在：", heroId);
        return null;
    }
    var breakAdd = breakLevel > 0 ? breakConfig[hero["star"]][breakLevel]["addAttribute"] : 0;
    returnHero["attack"] = (hero["attackAdd"] * (level + breakAdd - 1) - 0) + (hero["attack"] - 0);
    returnHero["defence"] = (hero["defenceAdd"] * (level + breakAdd - 1) - 0) + (hero["defence"] - 0);
    returnHero["hp"] = (hero["hpAdd"] * (level + breakAdd - 1) - 0) + (hero["hp"] - 0);
    returnHero["spirit"] = (hero["spiritAdd"] * (level + breakAdd - 1) - 0) + (hero["spirit"] - 0);
    returnHero["tough"] = (hero["tough"] - 0);
    returnHero["crit"] = (hero["crit"] - 0);
    returnHero["dodge"] = (hero["dodge"] - 0);
    returnHero["hit"] = (hero["hit"] - 0);
    returnHero["break"] = (hero["break"] - 0);
    returnHero["preventBreak"] = (hero["preventBreak"] - 0);
    returnHero["yuan"] = hero["yuan"];
    returnHero["name"] = hero["name"];
    returnHero["critDamage"] = hero["critDamage"] - 0;
    returnHero["heroId"] = hero["ID"];
    returnHero["level"] = level;
    returnHero["skill"] = [
        {"skillId": hero["talentSkill"], "skillLevel": 1}
    ];
    returnHero["gravityEffect"] = [];
    return returnHero;
};

/**
 * 获取PVP队伍信息
 * @param pvpId
 */
Config.prototype.getPvpNpc = function (pvpId) {
    var pvpRankFakData = this.getConfig("pvpRankFakeData");
    var enemyItem = pvpRankFakData["" + pvpId];
    var heros = enemyItem["heros"];
    var heroLevel = enemyItem["heroLevel"];
    var returnData = {};
    for (var i = 0; i < heros.length; i++) {
        var heroId = heros[i];
        var hero = this.getHeroObjByIdLevel(heroId, heroLevel);
        var key = "" + (i + 1);
        returnData[key] = hero;
    }
    return returnData;
};

Config.prototype.getPvpNpcName = function (pvpId) {
    var pvpRankFakData = this.getConfig("pvpRankFakeData");
    var enemyItem = pvpRankFakData["" + pvpId];
    return enemyItem["playerName"];
};

/**
 * 获取tabletsCompete队伍信息
 * @param pvpId
 */
Config.prototype.getTabletsCompeteNpc = function (pvpId) {
    var tabletsCompeteConfig = this.getConfig("tabletsCompete");
    var enemyItem = tabletsCompeteConfig["npc"][pvpId-0-1];
    var heros = enemyItem["formation"];
    var heroLevel = enemyItem["heroLevel"];
    var returnData = {};
    for (var i = 0; i < heros.length; i++) {
        var heroId = heros[i];
        var hero = this.getHeroObjByIdLevel(heroId, heroLevel);
        var key = "" + (i + 1);
        returnData[key] = hero;
    }
    return returnData;
};

Config.prototype.getTabletsCompeteNpcName = function (pvpId) {
    var tabletsCompeteConfig = this.getConfig("tabletsCompete");
    var enemyItem = tabletsCompeteConfig["npc"][pvpId-0-1];
    return enemyItem["userName"];
};



/**
 *获取Pve敌方数组
 */
Config.prototype.getPveNpc = function (map, mapId) {
    if(map == undefined)
        map = "map";
    var mapConfig = this.getConfig(map);
    map = mapConfig[mapId];
    var formationConfig = this.getConfig("formation");
    var npcConfig = this.getConfig("npc");
    var formationId = map["formation"];
    var formationNpc = formationConfig[formationId]["npc"];
    var returnObj = {};
    for (var key in formationNpc) {
        var id = formationNpc[key]["id"];
        var skillId = formationNpc[key]["skill"];
        var name = formationNpc[key]["name"];
        var npcItem = npcConfig[id];
        returnObj[key] = {};
        returnObj[key]["name"] = name;
        returnObj[key]["attack"] = npcItem["attack"] - 0;
        returnObj[key]["defence"] = npcItem["defence"] - 0;
        returnObj[key]["hp"] = npcItem["hp"] - 0;
        returnObj[key]["spirit"] = (npcItem["spirit"] - 0);
        returnObj[key]["tough"] = (npcItem["tough"] - 0);
        returnObj[key]["crit"] = (npcItem["crit"] - 0);
        returnObj[key]["dodge"] = (npcItem["dodge"] - 0);
        returnObj[key]["hit"] = (npcItem["hit"] - 0);
        returnObj[key]["break"] = (npcItem["break"] - 0);
        returnObj[key]["critDamage"] = (npcItem["critDamage"] - 0);
        returnObj[key]["preventBreak"] = (npcItem["preventBreak"] - 0);
        returnObj[key]["skill"] = [
            {"skillId": skillId, "skillLevel": 1}
        ];
        returnObj[key]["icon"] = formationNpc[key]["icon"];
        returnObj[key]["formationId"] = formationId;
        returnObj[key]["gravityEffect"] = [];
    }
    return returnObj;
};

//获取巡游活动npc数据
Config.prototype.getPveNpcForGallants = function (type, index) {
    var returnObj = {};
    var configData = this.getConfig("arena");
    var npcConfigData = this.getConfig("hero");
    var npcItem = configData[type][index]["hero"];
    var npcName = npcConfigData[npcItem["id"]]["name"];
    var npcSkill = npcConfigData[npcItem["id"]]["talentSkill"];
    for (var i = 1; i < 9; i++) {
        var id = i;
        var name = npcName;
        returnObj[id] = {};
        returnObj[id]["name"] = name;
        returnObj[id]["heroId"] = npcItem["id"];
        returnObj[id]["attack"] = npcItem["attack"] - 0;
        returnObj[id]["defence"] = npcItem["defence"] - 0;
        returnObj[id]["hp"] = npcItem["hp"] - 0;
        returnObj[id]["spirit"] = (npcItem["spirit"] - 0);
        returnObj[id]["tough"] = (npcItem["tough"] - 0);
        returnObj[id]["crit"] = (npcItem["crit"] - 0);
        returnObj[id]["dodge"] = (npcItem["dodge"] - 0);
        returnObj[id]["hit"] = (npcItem["hit"] - 0);
        returnObj[id]["break"] = (npcItem["break"] - 0);
        returnObj[id]["critDamage"] = (npcItem["critDamage"] - 0);
        returnObj[id]["preventBreak"] = (npcItem["preventBreak"] - 0);
        returnObj[id]["skill"] = [
            {"skillId": npcSkill, "skillLevel": 1}//30
        ];
        returnObj[id]["gravityEffect"] = [];
    }
    return returnObj;
};
/**
 *获取联盟敌方数组
 */
Config.prototype.getLeagueNpc = function (formation) {
    var heroConfig = this.getConfig("hero");
    var returnObj = {};
    for (var key in formation) {
        var npcItem = formation[key];
        var id = npcItem["hero"];
        var hero = heroConfig[id];
        var name = hero["name"];
        returnObj[key] = {};
        returnObj[key]["name"] = name;
        returnObj[key]["attack"] = npcItem["attack"] - 0;
        returnObj[key]["defence"] = npcItem["defence"] - 0;
        returnObj[key]["hp"] = npcItem["hp"] - 0;
        returnObj[key]["spirit"] = (npcItem["spirit"] - 0);
        returnObj[key]["tough"] = (npcItem["tough"] - 0);
        returnObj[key]["crit"] = (npcItem["crit"] - 0);
        returnObj[key]["dodge"] = (npcItem["dodge"] - 0);
        returnObj[key]["hit"] = (npcItem["hit"] - 0);
        returnObj[key]["break"] = (npcItem["break"] - 0);
        returnObj[key]["critDamage"] = (npcItem["critDamage"] - 0);
        returnObj[key]["preventBreak"] = (npcItem["preventBreak"] - 0);
        returnObj[key]["skill"] = [{"skillId":hero["talentSkill"],"skillLevel":1}];
        returnObj[key]["heroId"] = hero["ID"];
        returnObj[key]["icon"] = id;
        returnObj[key]["formationId"] = key;
        returnObj[key]["gravityEffect"] = [];
    }
    return returnObj;
};
/**
 * 取VIP权限
 * @param vipLevel
 */
Config.prototype.getVIPPurview = function (vipLevel) {
    var VIP = this.getConfig("vip");
    return VIP[vipLevel];
};

/**
 * 取pve体力值 。 返回 数组 【当前体力值，更新时间】
 * @returns {Array}
 */
Config.prototype.getPvePower = function (oldPvePower, oldTime, nowTime) {
    var mainConfig = this.getConfig("main");
    var maxPower = mainConfig["maxPower"] - 0;
    var powerRecoverTime = mainConfig["powerRecoverTime"] - 0;
    if (oldPvePower >= maxPower) {
        return [oldPvePower, nowTime];
    } else {
        var addPower = parseInt((nowTime - oldTime) / powerRecoverTime);
        var newPower = ((oldPvePower - 0 + addPower) > maxPower) ? maxPower : (oldPvePower - 0 + addPower);
        var newTime = nowTime - (nowTime - oldTime) % powerRecoverTime;
        return [newPower, newTime];
    }
};

Config.prototype.getPvpPower = function (oldPvpPower, oldTime, nowTime, addMax) {
    var mAddMax = 0;
    if (typeof addMax !== "undefined") {
        mAddMax = addMax - 0;
    }
    var mainConfig = this.getConfig("main");
    var maxMana = mainConfig["maxMana"] - 0 + mAddMax;
    var manaRecoverTime = mainConfig["manaRecoverTime"] - 0;
    if (oldPvpPower >= maxMana) {
        return [oldPvpPower, nowTime];
    } else {
        var addPower = parseInt((nowTime - oldTime) / manaRecoverTime);
        var newPower = ((oldPvpPower - 0 + addPower) > maxMana) ? maxMana : (oldPvpPower - 0 + addPower);
        var newTime = nowTime - (nowTime - oldTime) % manaRecoverTime;
        return [newPower, newTime];
    }
};


Config.prototype.g = function (name) {
    var mData;
    if (typeof name === "string") {
        mData = this.getConfig(name);
    } else {
        mData = name;
    }

    var fn = function (name) {
        if (typeof name === "undefined") {
            return mData;
        } else {
            if (mData != null) {
                if (typeof mData === "object") {
                    mData = mData[name] || null;
                } else {
                    mData = null;
                }
            }
        }
        return fn;
    };
    return fn;
};


function createConfig(userUid) {
    return _createConfig(userUid, true);
}

function createConfigFromCountry(country) {
    return _createConfig(country, false);
}


function _createConfig(mKey, isUserUid) {
    var mCountry;
    if (isUserUid == true) {
        var mCode = bitUtil.parseUserUid(mKey);
        mCountry = mCode[0];
    } else {
        mCountry = mKey;
    }

    var serverConfig = require("../../config/" + mCountry + "_server.json");
    var mConfigName = mCountry;
    if (serverConfig["configName"] != null) {
        mConfigName = serverConfig["configName"];
    }

    if (configDataDic[mConfigName] != null) {
        return configDataDic[mConfigName];
    } else {
        var mConfigUtil = new ConfigUtil();
        configHandler.loadConfig("../../config/" + mConfigName + "/", mConfigUtil);
        configHandler.setHandler(mConfigUtil);
        var configData = mConfigUtil.getServerConfig();
        configDataDic[mConfigName] = new Config(configData);
    }
    return configDataDic[mConfigName];
}


exports.createConfig = createConfig;
exports.createConfigFromCountry = createConfigFromCountry;