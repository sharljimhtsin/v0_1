/**
 * 游戏全局数据层
 * User: liyuluan
 * Date: 13-12-3
 * Time: 下午12:32
 */

var redis = require("../alien/db/redis");

/**
 * 添加滚动信息项
 * @param newsId 信息项ID
 * @param userName 用户名
 * @param propsId 物品ID
 * @param value 参数值
 */
function addNews(userUid, newsId, userName, propsId, value) {
    var obj = {};
    obj["type"] = newsId;
    obj["userUid"] = userName;
    obj["ID"] = propsId;
    obj["value"] = value || 0;
    var objStr = JSON.stringify(obj);
    redis.domain(userUid).l("news").leftPush(objStr, function(err, res) {
        if ( res != null && res > 30) {
            redis.domain(userUid).l("news").trim(0, 30);
        }
    });
}

/**
 * 取得滚动信息列表
 * @param callbackFn
 */
function getNews(userUid, callbackFn) {
    redis.domain(userUid).l("news").range(0, 30, function(err, res) {
        if (err) {
            callbackFn(err,null);
        } else {
            callbackFn(null,res);
        }
    });
}

exports.EQUIP_UPGRADE = 1; //装备强化
exports.SKILL_UPGRADE = 2;//技能强化
exports.SUMMON = 5;
exports.BOX = 6;
exports.HERO_RECRUIT = 8; //魂魄转生
exports.HERO_BREAK = 12;//突破
exports.addNews = addNews;
exports.getNews = getNews;