/**
 * 卡片 (练气) 数据层
 * User: liyuluan
 * Date: 13-11-22
 * Time: 下午3:45
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");
var configManager = require("../config/configManager");
var achievement = require("../model/achievement");


function addCardList(userUid, cardList, callbackFn) {
    redis.getNewIds(userUid, cardList.length, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            var mIds = res;
            var sql = "INSERT INTO card (userUid,cardUid,cardId) VALUES ?";
            var mList = [];
            var resultList = [];
            for (var i = 0; i < cardList.length; i++) {
                var cardUid = mIds[i];
                var cardId = cardList[i];
                mList.push([userUid, cardUid, cardId]);
                resultList.push({"userUid": userUid, "cardUid": cardUid, "cardId": cardId})
            }

            mysql.game(userUid).query(sql, [mList], function (err, res) {
                if (err) {
                    console.error(sql, mList, err.stack);
                    callbackFn(err, null);
                }
                else {
                    var configData = configManager.createConfig(userUid);
                    var cardConfig = configData.getConfig("card");
                    async.eachSeries(Object.keys(resultList), function (key, esCb) {
                        var item = resultList[key];
                        var cardData = cardConfig[item["cardId"]];
                        if (cardData && cardData["star"] >= 4) { // S 卡片
                            achievement.cardGet(userUid, 1, function () {
                                esCb(null);
                            });
                        } else {
                            esCb(null);
                        }
                    }, function (err) {
                        callbackFn(null, resultList);
                    });
                }
            });
        }
    });
}

/**
 * 取卡片(气)列表
 */
function getCardList(userUid, callbackFn) {
    var sql = "SELECT * FROM card WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) callbackFn(null, null);
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 取卡片（气）项
 */
function getCardItem(userUid, cardUid, callbackFn) {
    var sql = "SELECT * FROM card WHERE userUid=" + mysql.escape(userUid) + " AND cardUid=" + mysql.escape(cardUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) callbackFn(null, null);
        else {
            callbackFn(null, res[0]);
        }
    });
}

/**
 * 取多个卡数据
 */
function getCardItems(userUid, cardUids, callbackFn) {
    var sql = "SELECT * FROM card WHERE userUid=" + mysql.escape(userUid) + " AND cardUid IN(?)";
    mysql.game(userUid).query(sql, [cardUids], function (err, res) {
        callbackFn(err, res);
    });
}


/**
 * 卡片的经验等级更新
 */
function updateCard(userUid, cardUid, cardData, callbackFn) {
    var sql = "UPDATE card SET ? WHERE userUid=" + mysql.escape(userUid) + " AND cardUid=" + mysql.escape(cardUid);
    mysql.game(userUid).query(sql, cardData, function (err, res) {
        callbackFn(err, res);
    });
}

/**
 * 删除卡片
 */
function delCard(userUid, cardList, callbackFn) {
    var sql = "DELETE FROM card WHERE userUid=" + mysql.escape(userUid) + " AND cardUid IN(?)";
    mysql.game(userUid).query(sql, [cardList], function (err, res) {
        callbackFn(err, res);
    });
}


exports.addCardList = addCardList;
exports.getCardList = getCardList;
exports.updateCard = updateCard;
exports.delCard = delCard;
exports.getCardItem = getCardItem;
exports.getCardItems = getCardItems;
