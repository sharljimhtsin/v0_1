/**
 * 活动对应的数据
 * activityData
 * User: liyuluan
 * Date: 14-3-19
 * Time: 下午8:42
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var redisKey = require("../config/redisKey");


exports.PAY = 1; //累积充值活动数据
exports.INGOT_CONSUME = 2; //元宝消费活动
exports.TOTAL_RECHARGE = 3; // 累积充值
exports.TOTAL_CONSUME = 4;  // 累积消费
exports.ONE_RECHARGE = 5; // 单笔充值
exports.ONE_RECHARGE2 = 6; // 单笔充值活动2
exports.DAILY_CUMULATIVE_RECHARGE = 7; // 每日累计充值
exports.DAILY_CUMULATIVE_CONSUME = 8; // 每日累计消费
exports.ONE_RECHARGE3 = 9;//单笔充值活动3
exports.ONE_RECHARGE4 = 10;//单笔充值活动4
exports.vipActivity = 11;//vip获取奖励活动
exports.COSTLIST_ACTIVITY = 12; // 累积消费排行榜
exports.REDRIBBON = 13; // 红缎带军团宝藏
exports.FINANCIAL_PLAN = 14; // 理财计划
exports.TOTAL_RECHARGE2 = 15; // 累积充值2
exports.PATCH_COMPOSE = 16; // 碎片兑换活动
exports.FINANCIAL_PLAN_NEWUSER = 17; // 新用户理财计划
exports.PRACTICE_SCOREMALL = 18; // 积分商城
exports.PRACTICE_RECHARGE = 19;//充值排行榜
exports.PRACTICE_CONSUME = 20;//消费排行榜
exports.PRACTICE_COSMOS = 21;//宇宙第一评选
exports.PRACTICE_COSMOSLEAGUE = 22;//宇宙第一联盟评选
exports.PRACTICE_REGRESS = 23;//回归奖励
exports.PRACTICE_GROUPPURCHASE = 24;//团购1
exports.PRACTICE_GROUPPURCHASE2 = 25;//团购2
exports.PRACTICE_DAILYMUSTRECHARGE = 26;//每日必买
exports.GLOBALCONTEST = 27;
exports.MIXCONTEST = 28;
exports.PRACTICE_SMASHEGG = 29;//砸金蛋
exports.PRACTICE_CROSS = 30;//夺宝奇兵
exports.PRACTICE_MESSIAH = 31;//赛亚巨献
exports.PRACTICE_FORGE = 32;//聚宝盆
exports.PRACTICE_TRIBUTE = 33;//赛亚娃娃献礼
exports.PRACTICE_WHEEL = 34;//金币摩天轮
exports.MORPH_TRANS = 35;//异度转化
exports.MORPH_EVO = 36;//异度恶化
exports.PRACTICE_VIPCLUB = 37;//vip俱乐部
exports.PRACTICE_SCRATCH = 38;//刮刮乐
exports.PRACTICE_FIRE = 39;//神龟射射射
exports.CATALYST = 40;//装备附魔
exports.PRACTICE_LIMITSUMMON = 41;//限时抽将
exports.MODIFIER = 42;//技能附魔
exports.PRACTICE_GROWSIGN = 43;//新成长基金
exports.PRACTICE_CASHCOW = 44;//摇钱树
exports.BAHAMUTWISH = 45;//龙神的祝福
exports.PRACTICE_LUCKYCONVERT = 46;//幸运兑换 luckyConvert
exports.PRACTICE_PARADISESEARCH = 47;//神龙卡片翻翻翻 paradiseSearch
exports.PRACTICE_ENDORSE = 48;//龙神祝福 practiceEndorse
exports.PRACTICE_MO9Recharge = 49;//MO9
exports.PRACTICE_BAXIRecharge = 50;//南美首充双倍
exports.PRACTICE_DARKER = 51;//vip黑洞
exports.PRACTICE_SLOTS = 52;//新拉霸
exports.PRACTICE_BLACKSMITH = 53;//铁匠铺
exports.PRACTICE_REBATESHOP = 54;//折扣商店
exports.GALLANTS = 55;//武道会擂台赛
exports.MAILBINDING = 56;//邮箱绑定
exports.BEJEWELED = 57;//宝石迷阵-bejeweled
exports.MATRIX = 58;//赛亚人图阵-matrix
exports.PRACTICE_GROUPPURCHASE3 = 59;//团购3
exports.PRACTICE_LIMITCHOOSE = 60;//限时礼包-limitChoose
exports.PRACTICE_QUARTERCARD = 61;//季卡-quarterCard
exports.LEAGUETEAM = 62;//联盟战-leagueTeam
exports.INTEGRALBATTLE = 63;//擂台积分赛
exports.UPSTAR = 64;//升星
exports.PVPTOPCROSS = 65;//跨服激戰
exports.DAILY_SIGNIN = 66;//跨服激戰
exports.NOBLE = 67;//跨服激戰
exports.NOBLE_MAP = 68;//跨服激戰


/**
 * 取活动的数据, 返回格式
 *  ｛"data":0,"dataTime":0,"status":0,"statusTime": 0,"arg":""}
 * @param userUid
 * @param type
 * @param callbackFn
 */
function getActivityData(userUid, type, callbackFn) {
    redis.user(userUid).h(redisKey.ACTIVITYDATA + type).getObj(function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null) {
                var sql = "SELECT `data`,`dataTime`,`status`,`statusTime`,`arg` " +
                    "FROM activityData WHERE userUid=" + mysql.escape(userUid) + " AND type=" + mysql.escape(type) + " " +
                    "LIMIT 1";
                mysql.game(userUid).query(sql, function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        if (res == null || res.length == 0) {
                            var mObj = {};
                            mObj["data"] = 0;
                            mObj["dataTime"] = 0;
                            mObj["status"] = 0;
                            mObj["statusTime"] = 0;
                            mObj["arg"] = "";
                            redis.user(userUid).h(redisKey.ACTIVITYDATA + type).setObj(mObj);
                            callbackFn(null, mObj);
                        } else {
                            redis.user(userUid).h(redisKey.ACTIVITYDATA + type).setObj(res[0]);
                            callbackFn(null, res[0]);
                        }
                        redis.user(userUid).h(redisKey.ACTIVITYDATA + type).expire(redisKey.DAY7);
                    }
                });
            } else {
                callbackFn(null, res);
            }
        }
    });
}

/**
 * 更新活动数据
 * @param userUid
 * @param type
 * @param data
 * @param callbackFn
 */
function updateActivityData(userUid, type, data, callbackFn) {
    redis.user(userUid).h(redisKey.ACTIVITYDATA + type).setObj(data, callbackFn);
    var sql = "UPDATE activityData SET ? WHERE userUid=" + mysql.escape(userUid) + " AND type=" + mysql.escape(type) + " LIMIT 1";
    mysql.game(userUid).query(sql, data, function(err, res) {
        if (err) {
            console.error("activityDataUpdate", err.stack);
        } else {
            if (res != null && res["affectedRows"] == 0 ) {
                var sql = "INSERT INTO activityData SET ?";
                var insertData = {};
                for (var key in data) {
                    insertData[key] = data[key];
                }
                insertData["userUid"] = userUid;
                insertData["type"] = type;
                mysql.game(userUid).query(sql, insertData, function(err, res) {
                    if (err) {
                        console.error("activityDataInsert", err.stack);
                    }
                });
            }
        }
    });
}


exports.getActivityData = getActivityData;
exports.updateActivityData = updateActivityData;
