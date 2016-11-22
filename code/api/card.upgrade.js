/**
 * 卡片升级
 * User: liyuluan
 * Date: 13-11-25
 * Time: 下午5:43
 */

var card = require("../model/card");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");

/**
 * card.upgrade 升级卡片等级
 * 参数：
 *      cardUid 要升级的卡片uid
 *      cardList 被吃掉的卡片uid列表
 * 返回：
 *      {"card":新的卡片信息,"delCards":被移除的卡片信息}
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"cardUid","cardList") == false) {
        response.echo("card.upgrade", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var cardUid = postData["cardUid"];
    var materialCardList = postData["cardList"];
    var configData = configManager.createConfig(userUid);

    if (materialCardList instanceof Array == false) {
        response.echo("card.upgrade", jutil.errorInfo("postError"));
        return;
    }
    var cardConfig = configData.getConfig("card");
    var upgradeConfig = configData.getConfig("cardUpgrade");

    var gCardList = null;//所有卡片列表
    var gUpgradeCard = null;//要升级的卡片
    var gDelCardList = null;//要移除的卡片列表

    var rCardData = null;

    var _cardId = null; // 升级的卡片ID
    var _oldLevel = 0; // 卡片旧等级
    var _newLevel = 0; // 卡片新等级

    async.series([
        function(cb) { //卡片列表的加载
            card.getCardList(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    gCardList = res;
                    for (var i = 0; i < gCardList.length; i++) {
                        var mItem = gCardList[i];
                        if (mItem["cardUid"] == cardUid) {
                            gUpgradeCard = mItem;
                            break;
                        }
                    }
                    if (gUpgradeCard == null) {
                        cb("noCard");
                    } else {
                        _cardId = gUpgradeCard["cardId"] - 0;
                        _oldLevel = gUpgradeCard["level"] - 0;
                        cb(null);
                    }
                }
            });
        },
        function(cb) { //更新经验
            var receiveExpArr = getCardExp(materialCardList,gCardList,cardConfig,upgradeConfig);
            var receiveExp = receiveExpArr[0];
            gDelCardList = receiveExpArr[1];
            var newExp = gUpgradeCard["exp"] - 0 + receiveExp;
            var newLevel = cardExpToLevel(newExp,gUpgradeCard["cardId"],cardConfig,upgradeConfig);
            rCardData = {"exp":newExp,"level":newLevel};
            _newLevel = newLevel;
            card.updateCard(userUid,gUpgradeCard["cardUid"],rCardData,function(err,res) {
                if (err) cb("dbError");
                else {
                    rCardData["cardUid"] = gUpgradeCard["cardUid"];
                    rCardData["cardId"] = gUpgradeCard["cardId"];
                    cb(null);
                }
            });
        },
        function(cb) { //删除材料
            if (gDelCardList.length > 0) {
                card.delCard(userUid,gDelCardList,function(err,res) {
                    cb(null);
                    if (err) console.error("card.upgrade",err.stack);
                });
            } else {
                cb(null);
            }
        }
    ],function(err) {
        if (err) response.echo("card.upgrade",jutil.errorInfo(err));
        else {
            var cardData = cardConfig[_cardId];
            if (cardData && cardData["star"] == 4) { // S卡片升级
                achievement.cardLevelUp(userUid, _newLevel, function(){});
            }

            timeLimitActivityReward.cardLevelUp(userUid, _cardId, _oldLevel, _newLevel, function(){
                response.echo("card.upgrade",{"card":rCardData,"delCards":gDelCardList});
            });
        }
    });
}


/**
 * 将经验转为等级
 * @param exp
 * @param cardId
 * @param config
 * @param upgradeConfig
 * @returns {number}
 */
function cardExpToLevel(exp, cardId, config, upgradeConfig) {
    var mStar = config[cardId]["star"];
    var mNeedExpList = upgradeConfig[mStar]["needExp"];
    var mLevel = 1;
    for (var i = 1; i <= 20; i++) {
        if (exp < mNeedExpList[i] ) {
            mLevel = i;
            break;
        }
    }
    return mLevel;
}


/**
 * 计算材料列表的物品的总经验值
 * @param materialCardList
 * @param cardList
 * @param config
 * @param upgradeConfig
 * @returns {Array}
 */
function getCardExp(materialCardList,cardList,config,upgradeConfig) {
    for (var i = 0; i < materialCardList.length; i++) {
        materialCardList[i] = materialCardList[i] - 0;
    }

    var cardUidList = [];
    var mExp = 0;

    for (var i = 0; i < cardList.length; i++) {
        var mItem = cardList[i];
        var cardUid = mItem["cardUid"] - 0;
        if (materialCardList.indexOf(cardUid) != -1) {
            mExp += (mItem["exp"] - 0);
            var mCardId = mItem["cardId"];
            var mStar = config[mCardId]["star"];
            var giveBaseExp = upgradeConfig[mStar]["giveBaseExp"] - 0;
            mExp += giveBaseExp;
            cardUidList.push(cardUid);
        }
    }
    return [mExp,cardUidList];
}





exports.start = start;