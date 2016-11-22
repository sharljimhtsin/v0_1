/**
 * UserAction 行为
 * User: liyuluan
 * Date: 14-4-3
 * Time: 下午12:34
 * 示例
 *
 *      var userAction = require("../model/mongoModel/UserAction"); //抽卡统计
        userAction.getModel(userUid).create({"userUid": userUid, "action": userAction.SUMMON_ROLL, "action_1": type, "actionData": currency});
 *
 *
 *
 */


var mongo = require("../../alien/db/mongo");

//玩家行为统计
var UserActionSchema = new mongo.Schema({
    userUid:Number,
    action:Number,//行为类别
    action_1:{type:Number, default:0},//行为子类别
    actionData:{type:String}, //操作相关数据
    time:{type:Number, default:Date.now}
});


function getModel(userUid) {
    return mongo.getModel(userUid, "UserAction", UserActionSchema);
}




exports.USER_GET = 1; //取用户数据
exports.USER_GET_TOKEN = 2; //取用户TOKEN
exports.LOGIN_LOTTERY = 3;//登录翻牌
exports.SUMMON_ROLL = 4;//抽卡
exports.SUMMON_ROLL_FREE = 5;//免费抽卡
exports.PVE = 6;//战斗
exports.PVE_CONTINUE = 7;//连战
exports.BOX_OPEN = 8;//开宝箱
exports.CARD_EXCHANGE = 9;//卡片兑换
exports.CARD_ROLL = 10;//抽卡片
exports.CARD_ROLL_TO = 11;//元宝抽卡
exports.CARD_UPGRADE = 12;//卡片升级
exports.DEBRIS_GRAB = 13;//抢残章
exports.DEBRIS_MERGE = 14;//残章合成
exports.DEBRIS_SELL = 15;//残章出售
exports.EATING_FAIRY_BEANS = 16;//战斗全三星吃仙豆
exports.EQUIP_ONE = 17;//一键强化
exports.EQUIP_REFINE = 18; //装备精炼
exports.EQUIP_SELL = 19;//装备出售
exports.EQUIP_UPGRADE = 20;//装备强化
exports.FORMATION_ARRANGE = 21;//重新编队
exports.FORMATION_REPLACE = 22;//更换编队人物
exports.FRIEND_ADD = 23;
exports.FRIEND_DEL = 24;
exports.FUSE_UPGRADE = 25; //融合
exports.GAME_SHAKE = 26;//摇龙珠
exports.HERO_BREAK = 27; //突破
exports.HERO_INHERIT = 28; //传功
exports.HERO_RECRUIT = 29; //转魂
exports.HERO_TRAINCONFIRM = 30; //培养确认
exports.ITEM_EAT = 31; //吃豆
exports.MAIL_RECEIVE = 32; //领取邮件奖励
exports.MAIL_SEND = 33; //发送邮件
exports.MONTH_CARD_BUY = 34;//买月卡
exports.MONTH_CARD_REWARD = 35;//领取月卡奖励
exports.PACK_OPEN = 36;//礼包打开
exports.PRACTICE_CTLOGINREWARD = 37;//连续登录领取
exports.PRACTICE_DAILY = 38; //参拜
exports.PRACTICE_EATBEAN = 39;//吃豆
exports.PRACTICE_FUND = 40;//成长基金
exports.PRACTICE_LEVEL_UP_REWARD = 41;//升级奖励领取
exports.PRACTICE_METALS = 42;//魔人炼金
exports.PRACTICE_POWER_BRIDGING = 43; //许愿
exports.PRACTICE_RECHARGE = 44;//累积充值
exports.PRACTICE_TEACH = 45;//点拨
exports.PRACTICE_TOTAL_CONSUME = 46;//累积消费
exports.PRACTICE_WORLD_BOSS_TEACH = 47;//指点
exports.PROPS_REPLACE = 48;//替换装备
//exports.ACTIVE_MAP = 49;//打活动副本
exports.BLOODY_BATTLE = 50;//血战
exports.BUY_ENERGY = 51;//购买精力
exports.BUY_PHYSICAL = 52;//购买体力
exports.REMOVE_FIGHT_TIMES = 53;//清除战斗冷却
exports.SHOP_BUY = 54;//商店购买
exports.SKILL_UPGRADE = 55;//技能升级
exports.USER_CHANGE_NAME = 56;//更名
exports.USER_CREATE = 57;//用户创建
exports.WORLD_BOSS_KILL = 58;//世界BOSS
exports.ACTIVE_MAP = 59; //活动副本
exports.PVP = 60;//激战
exports.LUCKYSEVEN = 61;//幸运777

exports.EATING_REWARD = 62;//战斗吃奖励
exports.EQUIP_COMPOSE = 63;//装备合成
exports.PATCH_COMPOSE = 64;//碎片兑换
exports.GRAVITY = 65;//重力训练室
exports.GEM = 66;//宝石功能
exports.COSMOS_BOSS_KILL = 58;//世界BOSS

exports.C_SUMMON_ROLL_1 = 1;//抽卡 十里挑一
exports.C_SUMMON_ROLL_2 = 2;//抽卡 百里挑一
exports.C_SUMMON_ROLL_3 = 3;//抽卡 万里挑一