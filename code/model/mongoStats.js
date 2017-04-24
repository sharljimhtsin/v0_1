/**
 * mongo数据统计层
 * User: liyuluan
 * Date: 14-3-28
 * Time: 下午3:44
 */
var stats = require("../model/stats");
var P_TotalConsume = require("../model/practiceTotalConsume");
var dailyCumulativeConsume = require("../model/dailyCumulativeConsume");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var costListActivity = require("../model/practiceCostListActivity");
var vitality = require("../model/vitality");
var scoreMall = require("../model/scoreMall");
var consumeRanking = require("../model/consumeRanking");
var cosmosEvaluation = require("../model/cosmosEvaluation");
var cosmosLeague = require("../model/cosmosLeague");
//掉落的物品统计
function dropStats(dropId, userUid, userIP, userInfo, statsId, count, level, type) {
    count = count||1;
    level = level||1;
    type = type||'';
    stats.dropStats(dropId, userUid, userIP, userInfo, statsId, count, level, type);
}

//消耗的物品统计
function expendStats(dropId, userUid, userIP, userInfo, statsId, count, level, type) {
    count = count||1;
    level = level||1;
    type = type||'';
    stats.expendStats(dropId, userUid, userIP, userInfo, statsId, count, level, type);
    if (dropId + "" == "ingot" && userIP != "localhost") {
        // 累积消费活动
        P_TotalConsume.addRecord(userUid, count, function(err,res){});
        // 每日累计消费
        dailyCumulativeConsume.addRecord(userUid, count, function(err, res){});
        // 伊美加币消耗
        timeLimitActivity.ingotCost(userUid, count, function(){});
        //限时统计排行消耗
        costListActivity.addRecord(userUid, count, function(){});
        // 每日活跃度
        vitality.vitality(userUid, "consume", {"consumeCnt":count}, function(){});
        // 积分商城消耗
        scoreMall.setIngot(userUid, count, function(){});
        //消费排行榜
        consumeRanking.addRecord(userUid,count,function(){});
        //宇宙第一评选
        cosmosEvaluation.addRecord(userUid,count,function(){});
        //宇宙第一联盟评选
//        cosmosLeague.addRecord(userUid,count,function(){});
    }
}

exports.dropStats = dropStats;
exports.expendStats = expendStats;

exports.E_HERO_REC = 111111; //购买道具

//////////////元宝消耗类别
exports.E_ITEM = 100001; //购买道具
exports.E_PACK = 100002; //购买礼包
exports.E_REBIRTH_1 = 100003; //比鲁斯重生
exports.E_REBIRTH_2 = 100004; //比鲁斯浴火重生
exports.E_PVE_POWER = 100005; //购买体力
exports.E_PVP_POWER = 100006; //购买精力
exports.E_CLEAR_MAP = 100007; //清关卡次数
exports.E_CLEAR_CONTINUE = 100008;//清连闯
exports.E_SUMMON_ROLL_1 = 100009;//招募 十
exports.E_SUMMON_ROLL_2 = 100010;//招募 百
exports.E_SUMMON_ROLL_3 = 100011;//招募 万
exports.E_SUMMON_ROLL_10 = 100046;//招募 万
exports.E_TRAIN_1 = 100012;//培养
exports.E_TRAIN_10 = 100013;//十次培养
exports.E_CARD = 100014;//卡片
exports.E_ACTIVITY_MAP = 100015;//活动副本
exports.E_FUND = 100020; // 基金
exports.E_MONOPOLY = 100022; // 大富翁
exports.E_TIMELIMITMALL = 100023; // 限时商城
exports.E_TEACH = 100024;//超圣水（点播双倍)
exports.E_MONTHCARD = 100025; // 月卡
exports.E_LEAGUE_SHOP = 100026; // 联盟商城
exports.E_REDRIBBON = 100027;// 军团宝藏
exports.E_FINANCIAL = 100028;// 理财计划
exports.E_LEAGUE_CONTRIBUTION = 100029;//联盟建设
exports.E_LUCKYSEVEN = 100030;//拉霸
exports.E_PATCH_COMPOSE = 100031; // 碎片兑换消耗
exports.E_LEAGUE_CREATE = 100032; // 联盟创建
exports.E_LEAGUE_AUCTION = 100033; // 联盟竞拍
exports.E_TABLETS_REFRESH = 100034; // 神位争夺(刷新挑战玩家)
exports.E_TABLETS_BUYTIME = 100035; // 神位争夺(购买挑战次数)
exports.E_GROUPPURCHASE_BUY = 100036; // 团购购买消耗
exports.E_TABLETS_SHOPREFRESH = 100037; // 神位争夺(刷新店铺)
exports.E_TABLETS_SHOPBUY = 100038; // 神位争夺(店铺购买消耗)
exports.E_TABLETS_BATTLE = 100039; // 神位争夺(挑战消耗)
exports.E_CONSUMERANKING = 100040; //消费排行榜奖励
exports.E_PRACTICEMETALS = 100041;//魔人炼金消耗
exports.E_PRACTICECOSMOS = 100042;//宇宙第一评选--cosmosEvaluation
exports.HERO_BREAK = 100043;//突破
exports.E_PRACTICECOSMOSLEAGUE = 100044;//宇宙第一联盟评选--cosmosLeague
exports.E_GRAVITY = 100045;//重力训练室
exports.GLOBALCONTEST_SHOP = 100061;//武道会商城
exports.PRACTICE_SMASHEGG = 100047;//砸金蛋
exports.E_GEM = 100048;//宝石功能消耗
exports.E_REBIRTH_3 = 100049; //比鲁斯重生
exports.E_REBIRTH_4 = 100050; //比鲁斯浴火重生
exports.E_CROSS = 100051;//夺宝奇兵
exports.MIXCONTEST_SHOP = 100052;//武道会商城
exports.MIXCONTEST_JOIN = 100053;//武道会商城
exports.MIXCONTEST_REFRESH = 100054;//武道会商城
exports.PRACTICE_MESSIAH = 100055;//赛亚巨献
exports.MORPH_TRANSFROM_ENABLE = 1550001;//异度空间开启列阵
exports.MORPH_EVOLVE_GET = 1550002;//异度空间恶化消耗
exports.E_WHEEL = 100056;//摩天轮
exports.PRACTICE_MESSIAH_BUY = 1560001;//赛亚巨献限购商城伊美加币消耗
exports.PRACTICE_MESSIAH_GET = 1560002;//赛亚巨献赛亚巨献道具掉落
exports.PRACTICE_TRIBUTE_GET = 1590001;//赛亚娃娃道具掉落
exports.PRACTICE_TRIBUTE_COST = 1590002;//赛亚娃娃孙悟空娃娃消耗数量
exports.E_FIRE = 100057; //神龟射射射消耗
exports.E_LIMITSUMMON = 100058; //限时抽将消耗
exports.E_LEAGUESTAR_ADDWINS = 100059;//联盟星球金币消耗
exports.E_QUARTERCARD = 100060; // 季卡


////////元宝得到
exports.SHAKE = 200001;//点龙珠
exports.LOGIN_LOTTERY = 200002;//登录翻牌
exports.MAIL = 200003;//邮件
exports.LOGIN7 = 200004;//连继登录
exports.LEVEL_UP = 200005;//升级奖励1
exports.BLOOD5 = 200006;// 血战 每五关
exports.R_BLOOD_RANK = 200007;// 血战 排行
exports.R_PAY = 200008;//充值
exports.BOX = 200009;//开箱子
exports.CDKEY = 200010; //通过CDKEY
exports.PACKAGE = 200011;//开礼包获得
exports.PRACTICE_DAILY = 200012;// 参拜掉落
exports.PRACTICE_RECHARGE = 200013;// 累积充值活动掉落
exports.PRACTICE_TOTALCONSUME = 200014;//累积消费活动掉落
exports.ACTIVE_MAP = 200015;//活动掉落
exports.SHOP_BUY = 200016;//商店购买
exports.USER_CREATE = 200017;//用户创建
exports.WORLD_BOSS_KILL = 200018;//打BOSS掉落
exports.MONTH_CARD = 200019;//月卡掉落
exports.FUND = 200020;  //基金掉落
exports.ENERGY_BALL = 200021;   // 许愿掉落
exports.MONOPOLY = 200022;  // 大富翁掉落
exports.TIMELIMITMALL = 200023; // 显示商城
exports.ONERECHARGE = 200024;// 单笔充值活动
exports.ONERECHARGE2 = 200025;// 单笔充值活动2
exports.TIME_LIMIT_ACTIVITY_REWARD = 200026; // 限时活动奖励
exports.SPECIALBOX = 200027; //活动箱子
exports.BATTLE_PVE = 200028; //冒险掉落
exports.BATTLE_PVES = 200029; //冒险掉落(连战)
exports.PVP_REDEEMPOINTS = 200030; //激战兑换培养液
exports.PVP_TASK = 200031; //激战排名奖励
exports.MONOPOLY_BUY = 200032;  // 大富翁购买
exports.DEBRIS_GRAB = 200033; //抢夺残章
exports.DEBRIS_MERGE = 200034; //残章合成技能
exports.BLOODY = 200035; //血战
exports.SUMMON_GIVE = 200036; //招募送随机魂
exports.SUMMON_SOUL = 200037; //招募得到魂
exports.SUMMON_HERO = 200038; //招募得到英雄
exports.INHERIT = 200039; //传功
exports.ADDCHANGETIMES = 200040; //使用战书
exports.CHAT = 200041; //聊天
exports.TEACH = 200042; //吃指点
exports.PRACTICE_ONCERECHARGE = 200043;// 累积充值活动掉落
exports.D_ROLLTO = 200044; //收集(刷新)
exports.D_ROLL = 200045; //收集硬幣消耗
exports.D_ROLL1 = 2000451; //收集卡片掉落
exports.R_FIRSTPAY = 200046; //首充
exports.DAILY_SIGNIN = 200047; // 每日签到
exports.RED_RIBBON = 200048; // 红缎带军团
exports.LEAGUE_SHOP = 200049; // 联盟商城
exports.FINANCIAL = 200050; // 理财计划
exports.LUCKYSEVEN = 200051;//拉霸
exports.VITALITY = 200052; // 活跃度
exports.ACHIEVEMENT = 200053; // 成就
exports.TABLETSCOMPETE_DAILYREWARD = 200054; // 神位争夺每日奖励
exports.TABLETSCOMPETE_CLICKREWARD = 200055; // 神位争夺点赞奖励
exports.E_LEAGUE_RESULT = 200056; // 联盟返还
exports.E_LEAGUE_LOOT = 200057; // 联盟掉落
exports.TABLETSCOMPETE_BOXREWARD = 200058; // 神位争夺保箱奖励
exports.GROUPPURCHASE_BOXREWARD = 200059; // 团购活动奖励
exports.TABLETSCOMPETE_BATTLE = 200060; // 神位争夺挑战
exports.GROUPPURCHASE_BUY = 200061; // 团购活动购买获得
exports.DAILY_CUMULATIVE_RECHARGE = 200062; // 每日累计充值
exports.DAILY_CUMULATIVE_CONSUME = 200063; // 每日累计消费
exports.SCOREMALL_BUY = 200064; //积分商城购买
exports.TABLETSCOMPETE_SHOPBUY = 200065; // 神位争夺(店铺购买获得)
exports.RECHARGERANKING = 200066; //充值排行榜奖励
exports.REGRESS = 200067;//回归奖励
exports.E_DAILYMUSTRECHARGE = 200068;//每日必买
exports.COSMOS_BOSS_KILL = 200069;//打BOSS掉落
exports.TRIBUTE = 200070;//打BOSS掉落
exports.E_PRACTICEWHEEL = 200071;//金币摩天轮
exports.E_VIPCLUB = 200072;//vip俱乐部
exports.LEAGUE_STAR = 200073;//联盟星球奖励
exports.SCRATCH = 200074;//刮刮乐奖励
exports.FIRE = 200075;//神龟射射射奖励
exports.LIMITSUMMON = 200076;//限时抽将奖励
exports.QUARTER_CARD = 200077;//季卡掉落

exports.oneRecharge3_1 = 1010001; //区间充值第1档总领取次数
exports.oneRecharge3_2 = 1010002; //区间充值第2档总领取次数
exports.oneRecharge3_3 = 1010003; //区间充值第3档总领取次数
exports.oneRecharge3_4 = 1010004; //区间充值第4档总领取次数
exports.oneRecharge3_5 = 1010005; //区间充值第5档总领取次数

exports.practiceRecharge1 = 1020001; //累计充值第1档总领取次数
exports.practiceRecharge2 = 1020002; //累计充值第2档总领取次数
exports.practiceRecharge3 = 1020003; //累计充值第3档总领取次数
exports.practiceRecharge4 = 1020004; //累计充值第4档总领取次数
exports.practiceRecharge5 = 1020005; //累计充值第5档总领取次数
exports.practiceRecharge6 = 1020006; //累计充值第6档总领取次数
exports.practiceRecharge7 = 1020007; //累计充值第7档总领取次数
exports.practiceRecharge8 = 1020008; //累计充值第8档总领取次数
exports.practiceRecharge9 = 1020009; //累计充值第9档总领取次数
exports.practiceRecharge10 = 1020010; //累计充值第10档总领取次数

exports.DAILYTOTALCHARGE1 = 1030001; //每日累计充值第1档
exports.DAILYTOTALCHARGE2 = 1030002; //每日累计充值第2档
exports.DAILYTOTALCHARGE3 = 1030003; //每日累计充值第3档
exports.DAILYTOTALCHARGE4 = 1030004; //每日累计充值第4档
exports.DAILYTOTALCHARGE5 = 1030005; //每日累计充值第5档
exports.DAILYTOTALCHARGE6 = 1030006; //每日累计充值第6档
exports.DAILYTOTALCHARGE7 = 1030007; //每日累计充值第7档
exports.DAILYTOTALCHARGE8 = 1030008; //每日累计充值第8档
exports.DAILYTOTALCHARGE9 = 1030009; //每日累计充值第9档
exports.DAILYTOTALCHARGE10 = 1030010; //每日累计充值第10档

exports.practiceTotalConsume1 = 1040001; //累计消费第1档总领取次数
exports.practiceTotalConsume2 = 1040002; //累计消费第2档总领取次数
exports.practiceTotalConsume3 = 1040003; //累计消费第3档总领取次数
exports.practiceTotalConsume4 = 1040004; //累计消费第4档总领取次数
exports.practiceTotalConsume5 = 1040005; //累计消费第5档总领取次数
exports.practiceTotalConsume6 = 1040006; //累计消费第6档总领取次数
exports.practiceTotalConsume7 = 1040007; //累计消费第7档总领取次数
exports.practiceTotalConsume8 = 1040008; //累计消费第8档总领取次数
exports.practiceTotalConsume9 = 1040009; //累计消费第9档总领取次数
exports.practiceTotalConsume10 = 1040010; //累计消费第10档总领取次数

exports.DAILYTOTALCONSUME1 = 1050001; //每日累计消费第1档
exports.DAILYTOTALCONSUME2 = 1050002; //每日累计消费第2档
exports.DAILYTOTALCONSUME3 = 1050003; //每日累计消费第3档
exports.DAILYTOTALCONSUME4 = 1050004; //每日累计消费第4档
exports.DAILYTOTALCONSUME5 = 1050005; //每日累计消费第5档
exports.DAILYTOTALCONSUME6 = 1050006; //每日累计消费第6档
exports.DAILYTOTALCONSUME7 = 1050007; //每日累计消费第7档
exports.DAILYTOTALCONSUME8 = 1050008; //每日累计消费第8档
exports.DAILYTOTALCONSUME9= 1050009; //每日累计消费第9档
exports.DAILYTOTALCONSUME10 = 1050010; //每日累计消费第10档

exports.tabletsGetReward1 = 1080001; //神位争夺第1档胜利次数领取
exports.tabletsGetReward2 = 1080002; //神位争夺第2档胜利次数领取
exports.tabletsGetReward3 = 1080003; //神位争夺第3档胜利次数领取
exports.tabletsGetReward4 = 1080004; //神位争夺第4档胜利次数领取
exports.tabletsGetReward5 = 1080005; //神位争夺第5档胜利次数领取
exports.tabletsGetReward6 = 1080006; //神位争夺第6档胜利次数领取
exports.tabletsGetReward7 = 1080007; //神位争夺第7档胜利次数领取
exports.tabletsGetReward8 = 1080008; //神位争夺第8档胜利次数领取
exports.tabletsGetReward9= 1080009; //神位争夺第9档胜利次数领取
exports.tabletsGetReward10 = 1080010; //神位争夺第10档胜利次数领取
exports.tabletsBattle = 1080017; //神位争夺使用背水一战总次数

exports.groupPurchase = 1090001; //团购全服购买次数
exports.groupPurchaseUser1 = 1090003; //团购第1档奖励领取
exports.groupPurchaseUser2 = 1090004; //团购第2档奖励领取
exports.groupPurchaseUser3 = 1090005; //团购第3档奖励领取

exports.DAILYCHARGE = 1100001; //每日首冲活动总次数

exports.summonRoll1 = 1120001; //抽卡送魂高级抽卡次数
exports.summonRoll2 = 1120002; //抽卡送魂终极抽卡次数

exports.timeLimitActivityReward1 = 1400001; //限时成就第1档领取次数（培养液消耗）
exports.timeLimitActivityReward2 = 1400002; //限时成就第2档领取次数（培养液消耗）
exports.timeLimitActivityReward3 = 1400003; //限时成就第3档领取次数（培养液消耗）
exports.timeLimitActivityReward4 = 1400004; //限时成就第4档领取次数（培养液消耗）
exports.timeLimitActivityReward5 = 1400005; //限时成就第5档领取次数（培养液消耗）
exports.timeLimitActivityReward6 = 1400006; //限时成就第6档领取次数（培养液消耗）
exports.timeLimitActivityReward7 = 1400007; //限时成就第7档领取次数（培养液消耗）
exports.timeLimitActivityReward8 = 1400008; //限时成就第8档领取次数（培养液消耗）
exports.timeLimitActivityReward9 = 1400009; //限时成就第9档领取次数（培养液消耗）
exports.timeLimitActivityReward10 = 1400010; //限时成就第10档领取次数（培养液消耗）

exports.timeLimitActivityReward11 = 1400011; //限时成就第1档领取次数（使用高级召唤）
exports.timeLimitActivityReward12 = 1400012; //限时成就第2档领取次数（使用高级召唤）
exports.timeLimitActivityReward13 = 1400013; //限时成就第3档领取次数（使用高级召唤）
exports.timeLimitActivityReward14 = 1400014; //限时成就第4档领取次数（使用高级召唤）
exports.timeLimitActivityReward15 = 1400015; //限时成就第5档领取次数（使用高级召唤）
exports.timeLimitActivityReward16 = 1400016; //限时成就第6档领取次数（使用高级召唤）
exports.timeLimitActivityReward17 = 1400017; //限时成就第7档领取次数（使用高级召唤）
exports.timeLimitActivityReward18 = 1400018; //限时成就第8档领取次数（使用高级召唤）
exports.timeLimitActivityReward19 = 1400019; //限时成就第9档领取次数（使用高级召唤）
exports.timeLimitActivityReward20 = 1400020; //限时成就第10档领取次数（使用高级召唤）

exports.timeLimitActivityReward21 = 1400021; //限时成就第1档领取次数（使用终极召唤）
exports.timeLimitActivityReward22 = 1400022; //限时成就第2档领取次数（使用终极召唤）
exports.timeLimitActivityReward23 = 1400023; //限时成就第3档领取次数（使用终极召唤）
exports.timeLimitActivityReward24 = 1400024; //限时成就第4档领取次数（使用终极召唤）
exports.timeLimitActivityReward25 = 1400025; //限时成就第5档领取次数（使用终极召唤）
exports.timeLimitActivityReward26 = 1400026; //限时成就第6档领取次数（使用终极召唤）
exports.timeLimitActivityReward27 = 1400027; //限时成就第7档领取次数（使用终极召唤）
exports.timeLimitActivityReward28 = 1400028; //限时成就第8档领取次数（使用终极召唤）
exports.timeLimitActivityReward29 = 1400029; //限时成就第9档领取次数（使用终极召唤）
exports.timeLimitActivityReward30 = 1400030; //限时成就第10档领取次数（使用终极召唤）

exports.timeLimitActivityReward31 = 1400031; //限时成就第1档领取次数（消耗能量球）
exports.timeLimitActivityReward32 = 1400032; //限时成就第2档领取次数（消耗能量球）
exports.timeLimitActivityReward33 = 1400033; //限时成就第3档领取次数（消耗能量球）
exports.timeLimitActivityReward34 = 1400034; //限时成就第4档领取次数（消耗能量球）
exports.timeLimitActivityReward35 = 1400035; //限时成就第5档领取次数（消耗能量球）
exports.timeLimitActivityReward36 = 1400036; //限时成就第6档领取次数（消耗能量球）
exports.timeLimitActivityReward37 = 1400037; //限时成就第7档领取次数（消耗能量球）
exports.timeLimitActivityReward38 = 1400038; //限时成就第8档领取次数（消耗能量球）
exports.timeLimitActivityReward39 = 1400039; //限时成就第9档领取次数（消耗能量球）
exports.timeLimitActivityReward40 = 1400040; //限时成就第10档领取次数（消耗能量球）

exports.timeLimitActivityReward41 = 1400041; //限时成就第1档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward42 = 1400042; //限时成就第2档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward43 = 1400043; //限时成就第3档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward44 = 1400044; //限时成就第4档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward45 = 1400045; //限时成就第5档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward46 = 1400046; //限时成就第6档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward47 = 1400047; //限时成就第7档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward48 = 1400048; //限时成就第8档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward49 = 1400049; //限时成就第9档领取次数（消耗活动宝箱）
exports.timeLimitActivityReward50 = 1400050; //限时成就第10档领取次数（消耗活动宝箱）

exports.timeLimitActivityReward51 = 1400051; //限时成就第1档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward52 = 1400052; //限时成就第2档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward53 = 1400053; //限时成就第3档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward54 = 1400054; //限时成就第4档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward55 = 1400055; //限时成就第5档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward56 = 1400056; //限时成就第6档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward57 = 1400057; //限时成就第7档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward58 = 1400058; //限时成就第8档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward59 = 1400059; //限时成就第9档领取次数（开启橙色胶囊）
exports.timeLimitActivityReward60 = 1400060; //限时成就第10档领取次数（开启橙色胶囊）

exports.timeLimitActivityReward91 = 1400091; //限时成就第1档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward92 = 1400092; //限时成就第2档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward93 = 1400093; //限时成就第3档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward94 = 1400094; //限时成就第4档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward95 = 1400095; //限时成就第5档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward96 = 1400096; //限时成就第6档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward97 = 1400097; //限时成就第7档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward98 = 1400098; //限时成就第8档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward99 = 1400099; //限时成就第9档领取次数（开启蓝色胶囊）
exports.timeLimitActivityReward100 = 1400100; //限时成就第10档领取次数（开启蓝色胶囊）

exports.timeLimitActivityReward61 = 1400061; //限时成就第1档领取次数（使用拉霸*1）
exports.timeLimitActivityReward62 = 1400062; //限时成就第2档领取次数（使用拉霸*1）
exports.timeLimitActivityReward63 = 1400063; //限时成就第3档领取次数（使用拉霸*1）
exports.timeLimitActivityReward64 = 1400064; //限时成就第4档领取次数（使用拉霸*1）
exports.timeLimitActivityReward65 = 1400065; //限时成就第5档领取次数（使用拉霸*1）
exports.timeLimitActivityReward66 = 1400066; //限时成就第6档领取次数（使用拉霸*1）
exports.timeLimitActivityReward67 = 1400067; //限时成就第7档领取次数（使用拉霸*1）
exports.timeLimitActivityReward68 = 1400068; //限时成就第8档领取次数（使用拉霸*1）
exports.timeLimitActivityReward69 = 1400069; //限时成就第9档领取次数（使用拉霸*1）
exports.timeLimitActivityReward70 = 1400070; //限时成就第10档领取次数（使用拉霸*1）

exports.timeLimitActivityReward71 = 1400071; //限时成就第1档领取次数（使用拉霸*10）
exports.timeLimitActivityReward72 = 1400072; //限时成就第2档领取次数（使用拉霸*10）
exports.timeLimitActivityReward73 = 1400073; //限时成就第3档领取次数（使用拉霸*10）
exports.timeLimitActivityReward74 = 1400074; //限时成就第4档领取次数（使用拉霸*10）
exports.timeLimitActivityReward75 = 1400075; //限时成就第5档领取次数（使用拉霸*10）
exports.timeLimitActivityReward76 = 1400076; //限时成就第6档领取次数（使用拉霸*10）
exports.timeLimitActivityReward77 = 1400077; //限时成就第7档领取次数（使用拉霸*10）
exports.timeLimitActivityReward78 = 1400078; //限时成就第8档领取次数（使用拉霸*10）
exports.timeLimitActivityReward79 = 1400079; //限时成就第9档领取次数（使用拉霸*10）
exports.timeLimitActivityReward80 = 1400080; //限时成就第10档领取次数（使用拉霸*10）

exports.timeLimitActivityReward81 = 1400081; //限时成就第1档领取次数（使用拉霸*20）
exports.timeLimitActivityReward82 = 1400082; //限时成就第2档领取次数（使用拉霸*20）
exports.timeLimitActivityReward83 = 1400083; //限时成就第3档领取次数（使用拉霸*20）
exports.timeLimitActivityReward84 = 1400084; //限时成就第4档领取次数（使用拉霸*20）
exports.timeLimitActivityReward85 = 1400085; //限时成就第5档领取次数（使用拉霸*20）
exports.timeLimitActivityReward86 = 1400086; //限时成就第6档领取次数（使用拉霸*20）
exports.timeLimitActivityReward87 = 1400087; //限时成就第7档领取次数（使用拉霸*20）
exports.timeLimitActivityReward88 = 1400088; //限时成就第8档领取次数（使用拉霸*20）
exports.timeLimitActivityReward89 = 1400089; //限时成就第9档领取次数（使用拉霸*20）
exports.timeLimitActivityReward90 = 1400090; //限时成就第10档领取次数（使用拉霸*20）

exports.timeLimitActivityReward101 = 1400101; //限时成就第1档领取次数（指定伙伴突破）
exports.timeLimitActivityReward102 = 1400102; //限时成就第2档领取次数（指定伙伴突破）
exports.timeLimitActivityReward103 = 1400103; //限时成就第3档领取次数（指定伙伴突破）
exports.timeLimitActivityReward104 = 1400104; //限时成就第4档领取次数（指定伙伴突破）
exports.timeLimitActivityReward105 = 1400105; //限时成就第5档领取次数（指定伙伴突破）

exports.vipActivity1 = 1140001; //VIP回馈VIP3领取
exports.vipActivity2 = 1140002; //VIP回馈VIP4领取
exports.vipActivity3 = 1140003; //VIP回馈VIP5领取
exports.vipActivity4 = 1140004; //VIP回馈VIP6领取
exports.vipActivity5 = 1140005; //VIP回馈VIP7领取
exports.vipActivity6 = 1140006; //VIP回馈VIP8领取
exports.vipActivity7 = 1140007; //VIP回馈VIP9领取
exports.vipActivity8 = 1140008; //VIP回馈VIP10领取
exports.vipActivity9 = 1140009; //VIP回馈VIP11领取
exports.vipActivity10 = 1140010; //VIP回馈VIP12领取
exports.vipActivity11 = 1140011; //VIP回馈VIP13领取
exports.vipActivity12 = 1140012; //VIP回馈VIP14领取
exports.vipActivity13 = 1140013; //VIP回馈VIP15领取
exports.vipActivity14 = 1140014; //VIP回馈VIP16领取
exports.vipActivity15 = 1140015; //VIP回馈VIP17领取
exports.vipActivity16 = 1140016; //VIP回馈VIP18领取
exports.vipActivity17 = 1140017; //VIP回馈VIP19领取
exports.vipActivity18 = 1140018; //VIP回馈VIP20领取

exports.redRibbon1 = 1150001; //红绸军宝库第1档领取
exports.redRibbon2 = 1150002; //红绸军宝库第2档领取
exports.redRibbon3 = 1150003; //红绸军宝库第3档领取

exports.financialNewuser = 1160001; //新开服理财计划第1档购买
exports.financialPlan1 = 1170001; //老理财计划第1档购买
exports.financialPlan2 = 1170002; //老理财计划第2档购买
exports.financialPlan3 = 1170003; //老理财计划第3档购买

exports.scoreMall = 1200001; //积分商城兑换红包商城物品掉落
exports.luckySevenExchange = 1220001; //拉霸兑换拉霸商城物品掉落

exports.practiceMetals1 = 1230001; //魔人炼金第1次
exports.practiceMetals2 = 1230002; //魔人炼金第2次
exports.practiceMetals3 = 1230003; //魔人炼金第3次
exports.practiceMetals4 = 1230004; //魔人炼金第4次
exports.practiceMetals5 = 1230005; //魔人炼金第5次

exports.worldBossKill11 = 1250001; //试炼比鲁斯清除CD次数
exports.worldBossKill12 = 1250002; //试炼比鲁斯高级清除CD次数
exports.cosmosBossKill11 = 1250011; //试炼比鲁斯清除CD次数
exports.cosmosBossKill12 = 1250012; //试炼比鲁斯高级清除CD次数

exports.patchCompose = 1260001; //装备兑换兑换物品掉落

exports.buyPhysical1 = 1290001; //第1次体力购买总次数
exports.buyPhysical2 = 1290002; //第2次体力购买总次数
exports.buyPhysical3 = 1290003; //第3次体力购买总次数
exports.buyPhysical4 = 1290004; //第4次体力购买总次数
exports.buyPhysical5 = 1290005; //第5次体力购买总次数
exports.buyPhysical6 = 1290006; //第6次体力购买总次数
exports.buyPhysical7 = 1290007; //第7次体力购买总次数
exports.buyPhysical8 = 1290008; //第8次体力购买总次数
exports.buyPhysical9 = 1290009; //第9次体力购买总次数
exports.buyPhysical10 = 1290010; //第10次体力购买总次数
exports.buyPhysical11 = 1290011; //第11次体力购买总次数
exports.buyPhysical12 = 1290012; //第12次体力购买总次数
exports.buyPhysical13 = 1290013; //第13次体力购买总次数
exports.buyPhysical14 = 1290014; //第14次体力购买总次数
exports.buyPhysical15 = 1290015; //第15次体力购买总次数
exports.buyPhysical16 = 1290016; //第16次体力购买总次数
exports.buyPhysical17 = 1290017; //第17次体力购买总次数
exports.buyPhysical18 = 1290018; //第18次体力购买总次数
exports.buyPhysical19 = 1290019; //第19次体力购买总次数
exports.buyPhysical20 = 1290020; //第20次体力购买总次数
exports.buyPhysical21 = 1290021; //第1次体力购买总次数
exports.buyPhysical22 = 1290022; //第2次体力购买总次数
exports.buyPhysical23 = 1290023; //第3次体力购买总次数
exports.buyPhysical24 = 1290024; //第4次体力购买总次数
exports.buyPhysical25 = 1290025; //第5次体力购买总次数
exports.buyPhysical26 = 1290026; //第6次体力购买总次数
exports.buyPhysical27 = 1290027; //第7次体力购买总次数
exports.buyPhysical28 = 1290028; //第8次体力购买总次数
exports.buyPhysical29 = 1290029; //第9次体力购买总次数
exports.buyPhysical30 = 1290030; //第10次体力购买总次数
exports.buyPhysical31 = 1290031; //第11次体力购买总次数
exports.buyPhysical32 = 1290032; //第12次体力购买总次数
exports.buyPhysical33 = 1290033; //第13次体力购买总次数
exports.buyPhysical34 = 1290034; //第14次体力购买总次数
exports.buyPhysical35 = 1290035; //第15次体力购买总次数
exports.buyPhysical36 = 1290036; //第16次体力购买总次数
exports.buyPhysical37 = 1290037; //第17次体力购买总次数
exports.buyPhysical38 = 1290038; //第18次体力购买总次数
exports.buyPhysical39 = 1290039; //第19次体力购买总次数
exports.buyPhysical40 = 1290040; //第20次体力购买总次数
exports.buyPhysical41 = 1290041; //第41次体力购买总次数
exports.buyPhysical42 = 1290042; //第42次体力购买总次数
exports.buyPhysical43 = 1290043; //第43次体力购买总次数
exports.buyPhysical44 = 1290044; //第44次体力购买总次数
exports.buyPhysical45 = 1290045; //第45次体力购买总次数
exports.buyPhysical46 = 1290046; //第46次体力购买总次数

exports.buyEnergy1 = 1300001; //第1次精力购买总次数
exports.buyEnergy2 = 1300002; //第2次精力购买总次数
exports.buyEnergy3 = 1300003; //第3次精力购买总次数
exports.buyEnergy4 = 1300004; //第4次精力购买总次数
exports.buyEnergy5 = 1300005; //第5次精力购买总次数
exports.buyEnergy6 = 1300006; //第6次精力购买总次数
exports.buyEnergy7 = 1300007; //第7次精力购买总次数
exports.buyEnergy8 = 1300008; //第8次精力购买总次数
exports.buyEnergy9 = 1300009; //第9次精力购买总次数
exports.buyEnergy10 = 1300010; //第10次精力购买总次数
exports.buyEnergy11 = 1300011; //第11次精力购买总次数
exports.buyEnergy12 = 1300012; //第12次精力购买总次数
exports.buyEnergy13 = 1300013; //第13次精力购买总次数
exports.buyEnergy14 = 1300014; //第14次精力购买总次数
exports.buyEnergy15 = 1300015; //第15次精力购买总次数
exports.buyEnergy16 = 1300016; //第16次精力购买总次数
exports.buyEnergy17 = 1300017; //第17次精力购买总次数
exports.buyEnergy18 = 1300018; //第18次精力购买总次数
exports.buyEnergy19 = 1300019; //第19次精力购买总次数
exports.buyEnergy20 = 1300020; //第20次精力购买总次数
exports.buyEnergy21 = 1300021; //第1次精力购买总次数
exports.buyEnergy22 = 1300022; //第2次精力购买总次数
exports.buyEnergy23 = 1300023; //第3次精力购买总次数
exports.buyEnergy24 = 1300024; //第4次精力购买总次数
exports.buyEnergy25 = 1300025; //第5次精力购买总次数
exports.buyEnergy26 = 1300026; //第6次精力购买总次数
exports.buyEnergy27 = 1300027; //第7次精力购买总次数
exports.buyEnergy28 = 1300028; //第8次精力购买总次数
exports.buyEnergy29 = 1300029; //第9次精力购买总次数
exports.buyEnergy30 = 1300030; //第10次精力购买总次数
exports.buyEnergy31 = 1300031; //第11次精力购买总次数
exports.buyEnergy32 = 1300032; //第12次精力购买总次数
exports.buyEnergy33 = 1300033; //第13次精力购买总次数
exports.buyEnergy34 = 1300034; //第14次精力购买总次数
exports.buyEnergy35 = 1300035; //第15次精力购买总次数
exports.buyEnergy36 = 1300036; //第16次精力购买总次数
exports.buyEnergy37 = 1300037; //第17次精力购买总次数
exports.buyEnergy38 = 1300038; //第18次精力购买总次数
exports.buyEnergy39 = 1300039; //第19次精力购买总次数
exports.buyEnergy40 = 1300040; //第20次精力购买总次数
exports.buyEnergy41 = 1300041; //第41次精力购买总次数
exports.buyEnergy42 = 1300042; //第42次精力购买总次数
exports.buyEnergy43 = 1300043; //第43次精力购买总次数
exports.buyEnergy44 = 1300044; //第44次精力购买总次数
exports.buyEnergy45 = 1300045; //第45次精力购买总次数
exports.buyEnergy46 = 1300046; //第46次精力购买总次数
//1
exports.specialTeamOpen1 = 1320001; //特战队位置1开启
exports.specialTeamOpen2 = 1320002; //特战队位置2开启
exports.specialTeamOpen3 = 1320003; //特战队位置3开启
exports.specialTeamOpen4 = 1320004; //特战队位置4开启
exports.specialTeamOpen5 = 1320005; //特战队位置5开启
exports.specialTeamOpen6 = 1320006; //特战队位置6开启
exports.specialTeamOpen7 = 1320007; //特战队位置7开启
exports.specialTeamOpen8 = 1320008; //特战队位置8开启
exports.specialTeamOpen9 = 1320009; //特战队位置9开启
exports.specialTeamOpen10 = 1320010; //特战队位置10开启
//2
exports.specialTeamOpen11 = 1330001; //新特战队位置1开启
exports.specialTeamOpen12 = 1330002; //新特战队位置2开启
exports.specialTeamOpen13 = 1330003; //新特战队位置3开启
exports.specialTeamOpen14 = 1330004; //新特战队位置4开启
exports.specialTeamOpen15 = 1330005; //新特战队位置5开启
exports.specialTeamOpen16 = 1330006; //新特战队位置6开启
exports.specialTeamOpen17 = 1330007; //新特战队位置7开启
exports.specialTeamOpen18 = 1330008; //新特战队位置8开启
exports.specialTeamOpen19 = 1330009; //新特战队位置9开启
exports.specialTeamOpen20 = 1330010; //新特战队位置10开启
//3
exports.specialTeamOpen21 = 1330011; //特战队3位置1开启*************************
exports.specialTeamOpen22 = 1330012; //特战队3位置2开启
exports.specialTeamOpen23 = 1330013; //特战队3位置3开启
exports.specialTeamOpen24 = 1330014; //特战队3位置4开启
exports.specialTeamOpen25 = 1330015; //特战队3位置5开启
exports.specialTeamOpen26 = 1330016; //特战队3位置6开启
exports.specialTeamOpen27 = 1330017; //特战队3位置7开启
exports.specialTeamOpen28 = 1330018; //特战队3位置8开启
exports.specialTeamOpen29 = 1330019; //特战队3位置9开启
exports.specialTeamOpen30 = 1330020; //特战队3位置10开启
//4
exports.specialTeamOpen31 = 1330021; //特战队4位置1开启*************************
exports.specialTeamOpen32 = 1330022; //特战队4位置2开启
exports.specialTeamOpen33 = 1330023; //特战队4位置3开启
exports.specialTeamOpen34 = 1330024; //特战队4位置4开启
exports.specialTeamOpen35 = 1330025; //特战队4位置5开启
exports.specialTeamOpen36 = 1330026; //特战队4位置6开启
exports.specialTeamOpen37 = 1330027; //特战队4位置7开启
exports.specialTeamOpen38 = 1330028; //特战队4位置8开启
exports.specialTeamOpen39 = 1330029; //特战队4位置9开启
exports.specialTeamOpen40 = 1330030; //特战队4位置10开启
//1
exports.specialTeamStrong1 = 1410001; //特战队位置1强化
exports.specialTeamStrong2 = 1410002; //特战队位置2强化
exports.specialTeamStrong3 = 1410003; //特战队位置3强化
exports.specialTeamStrong4 = 1410004; //特战队位置4强化
exports.specialTeamStrong5 = 1410005; //特战队位置5强化
exports.specialTeamStrong6 = 1410006; //特战队位置6强化
exports.specialTeamStrong7 = 1410007; //特战队位置7强化
exports.specialTeamStrong8 = 1410008; //特战队位置8强化
exports.specialTeamStrong9 = 1410009; //特战队位置9强化
exports.specialTeamStrong10 = 1410010; //特战队位置10强化
//2
exports.specialTeamStrong11 = 1420001; //新特战队位置1强化
exports.specialTeamStrong12 = 1420002; //新特战队位置2强化
exports.specialTeamStrong13 = 1420003; //新特战队位置3强化
exports.specialTeamStrong14 = 1420004; //新特战队位置4强化
exports.specialTeamStrong15 = 1420005; //新特战队位置5强化
exports.specialTeamStrong16 = 1420006; //新特战队位置6强化
exports.specialTeamStrong17 = 1420007; //新特战队位置7强化
exports.specialTeamStrong18 = 1420008; //新特战队位置8强化
exports.specialTeamStrong19 = 1420009; //新特战队位置9强化
exports.specialTeamStrong20 = 1420010; //新特战队位置10强化
//3
exports.specialTeamStrong21 = 1420011; //特战队3位置1强化******************
exports.specialTeamStrong22 = 1420012; //特战队3位置2强化
exports.specialTeamStrong23 = 1420013; //特战队3位置3强化
exports.specialTeamStrong24 = 1420014; //特战队3位置4强化
exports.specialTeamStrong25 = 1420015; //特战队3位置5强化
exports.specialTeamStrong26 = 1420016; //特战队3位置6强化
exports.specialTeamStrong27 = 1420017; //特战队3位置7强化
exports.specialTeamStrong28 = 1420018; //特战队3位置8强化
exports.specialTeamStrong29 = 1420019; //特战队3位置9强化
exports.specialTeamStrong30 = 1420020; //特战队3位置10强化
//4
exports.specialTeamStrong31 = 1420021; //特战队4位置1强化******************
exports.specialTeamStrong32 = 1420022; //特战队4位置2强化
exports.specialTeamStrong33 = 1420023; //特战队4位置3强化
exports.specialTeamStrong34 = 1420024; //特战队4位置4强化
exports.specialTeamStrong35 = 1420025; //特战队4位置5强化
exports.specialTeamStrong36 = 1420026; //特战队4位置6强化
exports.specialTeamStrong37 = 1420027; //特战队4位置7强化
exports.specialTeamStrong38 = 1420028; //特战队4位置8强化
exports.specialTeamStrong39 = 1420029; //特战队4位置9强化
exports.specialTeamStrong40 = 1420030; //特战队4位置10强化

exports.monthCardBuy1 = 1340001; //月卡30元总购买人数
exports.monthCardBuy2 = 1340002; //月卡50元总购买人数
exports.quarterCardBuy = 1340003;//季卡总购买人数

exports.activeMapNew1 = 1350001; //抢夺能量球第1个参与次数
exports.activeMapNew2 = 1350002; //抢夺能量球第2个参与次数
exports.activeMapNew3 = 1350003; //抢夺能量球第3个参与次数
exports.activeMapNew4 = 1350004; //抢夺能量球第4个参与次数

exports.cardRoll1 = 1380001; //卡片使用索尼收集次数
exports.cardRoll2 = 1380002; //卡片使用索尼收集次数（百次）
exports.cardRollto = 1380003; //卡片使用伊美加币收集次数

exports.oneRecharge3_count = 1010006; //区间充值全服总累充伊美加币数
exports.practiceRecharge_count = 1020011; //累计充值全服总累充伊美加币数
exports.DAILYTOTALCHARGE_count = 1030011; //每日累计充值全服总累充伊美加币数
exports.practiceTotalConsume_count = 1040011; //累计消费全服总消费伊美加币数
exports.DAILYTOTALCONSUME_count = 1050011; //每日累计消费全服总消费伊美加币数
exports.tabletsGetReward_count = 1080011; //神位争夺兑换商城
exports.groupPurchase_count = 1090002; //团购全服伊美加币总消耗数
exports.SHOP_BUY_count = 1110001; //商城第1档道具购买总次数
exports.scoreMall_count = 1200041; //积分商城全服总消耗伊美加币
exports.timeLimitMall_count = 1210001; //限时商城兑换道具数量
exports.DAILYCHARGE_count = 1240001; //每日首充返利全服总充值伊美加币
exports.worldBossKill1_count = 1250003; //试炼比鲁斯个人点播掉落个数
exports.cosmosBossKill1_count = 1250013; //试炼比鲁斯个人点播掉落个数
exports.practiceRecharge2_count = 1270001; //充值送道具赠送道具总个数
exports.practiceRecharge2_count2 = 1270002; //充值送道具全服总充值伊美加币
exports.powerBridging_count = 1280001; //能量球进阶能量球消耗总数
exports.monopoly_count = 1310001; //大富翁筋斗云购买获得总数
exports.practiceDailyMustRecharge = 1440006; //每日必买掉落

exports.cosmosEvaluation1 = 1360001; //王语嫣（超赛4）第1个时间点消耗总金额
exports.cosmosEvaluation2 = 1360002; //王语嫣（超赛4）第2个时间点消耗总金额
exports.cosmosEvaluation3 = 1360003; //王语嫣（超赛4）第3个时间点消耗总金额

exports.forge1 = 1430001; //聚宝盆兑换道具掉落个数
exports.forge2 = 1430002; //聚宝盆伊美加币消耗总数
exports.forge3 = 1430003; //聚宝盆索尼消耗总数
exports.forge4 = 1430004; //聚宝盆“福”字消耗总数
exports.scratch1 = 1430005; //刮刮乐--聚宝盆伊美加币消耗总数
exports.scratch2 = 1430006; //刮刮乐--聚宝盆索尼消耗总数

exports.globalContest = 1450001; //武道会商城兑换道具掉落个数
exports.globalContest_join = 1450002; //武道会报名次数

exports.dailyMustRecharge1 = 1440001; //必购箱子领取次数
exports.dailyMustRecharge2 = 1440002; //满足条件箱子1领取次数
exports.dailyMustRecharge3 = 1440003; //满足条件箱子2领取次数
exports.dailyMustRecharge4 = 1440004; //满足条件箱子3领取次数
exports.dailyMustRecharge5 = 1440005; //满足条件箱子4领取次数

exports.smashEgg1 = 1500001; //砸金罐砸蛋次数
exports.smashEgg2 = 1500002; //砸金罐积分兑换道具个数
exports.smashEgg3 = 1500003; //砸金罐砸罐掉落道具个数

exports.mixContest1 = 1580008; //极地大乱斗大乱斗商城兑换道具掉落个数
exports.mixContest2 = 1580009; //极地大乱斗大乱斗商城最终奖励获得个数
exports.mixContest3 = 1580001; //极地大乱斗商店刷新次数
exports.mixContest4 = 1580002; //极地大乱斗报名次数
exports.mixContest5 = 1580003; //极地大乱斗不锁卡刷新次数
exports.mixContest6 = 1580004; //极地大乱斗锁1张卡刷新次数
exports.mixContest7 = 1580005; //极地大乱斗锁2张卡刷新次数
exports.mixContest8 = 1580006; //极地大乱斗锁3张卡刷新次数
exports.mixContest9 = 1580007; //极地大乱斗锁4张卡刷新次数

exports.E_CROSS1 = 1570001;//夺宝奇兵选择第1件物品的次数
exports.E_CROSS2 = 1570002;//夺宝奇兵选择第2件物品的次数
exports.E_CROSS3 = 1570003;//夺宝奇兵选择第3件物品的次数
exports.E_CROSS4 = 1570004;//夺宝奇兵选择第1档金额的次数
exports.E_CROSS5 = 1570005;//夺宝奇兵选择第2档金额的次数
exports.E_CROSS6 = 1570006;//夺宝奇兵选择第3档金额的次数
exports.E_CROSS7 = 1570007;//夺宝奇兵翻2张牌交换的次数
exports.E_CROSS8 = 1570008;//夺宝奇兵翻4张牌交换的次数
exports.E_CROSS9 = 1570009;//夺宝奇兵翻6张牌交换的次数
exports.E_CROSS10 = 1570010;//夺宝奇兵翻8张牌交换的次数
exports.E_CROSS11 = 1570011;//夺宝奇兵拿底牌奖励的次数

exports.E_WHEEL1 = 1600001;//金币转转转使用转盘的总次数
exports.E_WHEEL2 = 1600002;//金币转转转转到第1档奖励的次数
exports.E_WHEEL3 = 1600003;//金币转转转转到第2档奖励的次数
exports.E_WHEEL4 = 1600004;//金币转转转转到第3档奖励的次数
exports.E_WHEEL5 = 1600005;//金币转转转转到第4档奖励的次数
exports.E_WHEEL6 = 1600006;//金币转转转转到第5档奖励的次数
exports.E_WHEEL7 = 1600007;//金币转转转转到第6档奖励的次数
exports.E_WHEEL8 = 1600008;//金币转转转转到第7档奖励的次数
exports.E_WHEEL9 = 1600009;//金币转转转转到第8档奖励的次数
exports.E_WHEEL10 = 1600010;//金币转转转转到第9档奖励的次数

exports.E_CATALYST1 = 1610001;//取得附魔资格
exports.E_CATALYST2 = 1610002;//刷新附魔属性

exports.P_LIMITSUMMON1 = 1630001;//限时抽将普通单抽次数
exports.P_LIMITSUMMON2 = 1630002;//限时抽将普通十连抽次数
exports.P_LIMITSUMMON3 = 1630003;//限时抽将EX单抽次数
exports.P_LIMITSUMMON4 = 1630004;//限时抽将EX十连抽次数
exports.P_LIMITSUMMON5 = 1630005;//限时抽将消耗伊美加币数
exports.P_LIMITSUMMON6 = 1630006;//限时抽将道具掉落个数

exports.P_FIREROLL1 = 1640001; //神龟射射射活动使用连射次数(一次)
exports.P_FIREROLL2 = 1640002; //神龟射射射活动使用连射次数（十次）
exports.P_FIREROLL3 = 1640003; //神龟射射射活动使用连射次数（百次）
exports.P_FIREROLL4 = 1640004; //神龟射射射消耗伊美加币数
exports.P_FIREROLL5 = 1640005; //神龟射射射道具掉落个数

exports.P_SCRATCH1 = 1650001; //欢乐刮刮乐活动普通刮使用次数//scratch
exports.P_SCRATCH2 = 1650002; //欢乐刮刮乐活动一键刮开使用次数
exports.P_SCRATCH3 = 1650003; //欢乐刮刮乐活动重置使用次数
exports.P_SCRATCH4 = 1650004; //欢乐刮刮乐活动刮卡掉落
exports.P_SCRATCH5 = 1650005; //欢乐刮刮乐活动消耗伊美加币数
exports.P_SCRATCH6 = 1650006; //欢乐刮刮乐活动合成掉落
exports.P_SCRATCH7 = 1650007; //欢乐刮刮乐活动消耗索尼币数

exports.P_GROWSIGN1 = 1660001; //新成长基金活动购买人数
exports.P_GROWSIGN2 = 1660002; //新成长基金活动消耗的伊美加币
exports.P_GROWSIGN3 = 1660003; //新成长基金活动道具掉落
exports.P_GROWSIGN4 = 1660004; //新成长基金活动索尼掉落
exports.P_GROWSIGN5 = 1660005; //新成长基金活动伊美加币掉落

exports.P_CASHCOW1 = 1670001; //新摇钱树活动单次使用次数
exports.P_CASHCOW2 = 1670002; //新摇钱树活动10次使用次数
exports.P_CASHCOW3 = 1670003; //新摇钱树活动50次使用次数
exports.P_CASHCOW4 = 1670004; //新摇钱树活动伊美加币消耗
exports.P_CASHCOW5 = 1670005; //新摇钱树活动道具掉落
exports.P_CASHCOW6 = 1670006; //新摇钱树活动许愿种子消耗

exports.P_LUCKYCONVERT1 = 1680001; //幸运兑换单次使用次数
exports.P_LUCKYCONVERT2 = 1680002; //幸运兑换十次使用次数
exports.P_LUCKYCONVERT3 = 1680003; //幸运兑换手动刷新次数
exports.P_LUCKYCONVERT4 = 1680004; //幸运兑换伊美加币消耗
exports.P_LUCKYCONVERT5 = 1680005; //幸运兑换索尼消耗
exports.P_LUCKYCONVERT6 = 1680006; //幸运兑换道具掉落
exports.P_LUCKYCONVERT7 = 1680007; //幸运兑换券消耗数量

exports.A_LEAGUEDRAGON1 = 1690001; //联盟龙伊美加币消耗 leaguedragon

//1700001-1700015
exports.A_BAHAMUTWISH1 = 1700001; //龙神的祝福:一星龙珠激活次数 bahamutWish
exports.A_BAHAMUTWISH2 = 1700002; //龙神的祝福:二星龙珠激活次数
exports.A_BAHAMUTWISH3 = 1700003; //龙神的祝福:三星龙珠激活次数
exports.A_BAHAMUTWISH4 = 1700004; //龙神的祝福:四星龙珠激活次数
exports.A_BAHAMUTWISH5 = 1700005; //龙神的祝福:五星龙珠激活次数
exports.A_BAHAMUTWISH6 = 1700006; //龙神的祝福:六星龙珠激活次数
exports.A_BAHAMUTWISH7 = 1700007; //龙神的祝福:七星龙珠激活次数
exports.A_BAHAMUTWISH8 = 1700008; //龙神的祝福:重置技能次数
exports.A_BAHAMUTWISH9 = 1700009; //龙神的祝福:一星龙珠升级道具消耗
exports.A_BAHAMUTWISH10 = 1700010; //龙神的祝福:二星龙珠升级道具消耗
exports.A_BAHAMUTWISH11 = 1700011; //龙神的祝福:三星龙珠升级道具消耗
exports.A_BAHAMUTWISH12 = 1700012; //龙神的祝福:四星龙珠升级道具消耗
exports.A_BAHAMUTWISH13 = 1700013; //龙神的祝福:五星龙珠升级道具消耗
exports.A_BAHAMUTWISH14 = 1700014; //龙神的祝福:六星龙珠升级道具消耗
exports.A_BAHAMUTWISH15 = 1700015; //龙神的祝福:七星龙珠升级道具消耗
exports.A_BAHAMUTWISH16 = 1700016; //龙神的祝福:重置伊美加币消耗
exports.A_BAHAMUTWISH17 = 1700017; //龙神的祝福:锁定伊美加币消耗

exports.P_PARADISESEARCH1 = 1710001; //翻翻翻点击翻牌的次数
exports.P_PARADISESEARCH2 = 1710002; //翻翻翻一键翻牌的次数
exports.P_PARADISESEARCH3 = 1710003; //翻翻翻领取第1档奖励的次数
exports.P_PARADISESEARCH4 = 1710004; //翻翻翻领取第2档奖励的次数
exports.P_PARADISESEARCH5 = 1710005; //翻翻翻领取第3档奖励的次数
exports.P_PARADISESEARCH6 = 1710006; //翻翻翻道具掉落
exports.P_PARADISESEARCH7 = 1710007; //翻翻翻档次奖励道具掉落
exports.P_PARADISESEARCH8 = 1710008; //翻牌消耗的伊美加币数

exports.P_ENDORSE1 = 1720001; //神龙许愿的许愿伊美加币消耗
exports.P_ENDORSE2 = 1720002; //神龙许愿的改签伊美加币消耗
exports.P_ENDORSE3 = 1720003; //神龙许愿的活动掉落
exports.P_ENDORSE4 = 1720004; //神龙许愿的许愿的次数
exports.P_ENDORSE5 = 1720005; //神龙许愿的改签的次数

exports.P_DARKER1 = 1740001; //VIP黑洞普通转盘转动次数
exports.P_DARKER2 = 1740002; //VIP黑洞V3转盘转动次数
exports.P_DARKER3 = 1740003; //VIP黑洞V3转盘放弃次数
exports.P_DARKER4 = 1740004; //VIP黑洞V6转盘转动次数
exports.P_DARKER5 = 1740005; //VIP黑洞V6转盘放弃次数
exports.P_DARKER6 = 1740006; //VIP黑洞V9转盘转动次数
exports.P_DARKER7 = 1740007; //VIP黑洞V9转盘放弃次数
exports.P_DARKER8 = 1740008; //VIP黑洞活动道具掉落
exports.P_DARKER9 = 1740009; //VIP黑洞伊美加币消耗

exports.P_SLOTS1 = 1750001; //开服拉霸摇奖次数
exports.P_SLOTS2 = 1750002; //开服拉霸摇中激活码次数
exports.P_SLOTS3 = 1750003; //开服拉霸道具掉落

exports.P_BLACKSMITH1 = 1760001; //铁匠铺伊美加币消耗
exports.P_BLACKSMITH2 = 1760002; //铁匠铺索尼消耗
exports.P_BLACKSMITH3 = 1760003; //铁匠铺道具掉落

exports.P_REBATESHOP1 = 1770001; //折扣商城道具掉落
exports.P_REBATESHOP2 = 1770002; //折扣商城索尼消耗
exports.P_REBATESHOP3 = 1770003; //折扣商城伊美加币消耗

exports.P_GEMCOMPOSE1 = 2000001; //宝石合成消耗
exports.P_GEMCOMPOSE2 = 2000002; //宝石合成成功次数
exports.P_GEMCOMPOSE3 = 2000003; //宝石合成失败次数
exports.P_GEMCOMPOSE4 = 2000004; //宝石合成掉落（成功）

exports.A_GALLANTS1 = 2010001; //巡游活动成功挑战关卡1的次数
exports.A_GALLANTS2 = 2010002; //巡游活动成功挑战关卡2的次数
exports.A_GALLANTS3 = 2010003; //巡游活动成功挑战关卡3的次数
exports.A_GALLANTS4 = 2010004; //巡游活动成功挑战关卡4的次数
exports.A_GALLANTS5 = 2010005; //巡游活动成功挑战关卡5的次数
exports.A_GALLANTS6 = 2010006; //巡游活动成功挑战关卡6的次数
exports.A_GALLANTS7 = 2010007; //巡游活动成功挑战关卡7的次数
exports.A_GALLANTS8 = 2010008; //巡游活动成功挑战关卡8的次数
exports.A_GALLANTS9 = 2010009; //巡游活动道具掉落
exports.A_GALLANTS10 = 2010010; //巡游活动道具消耗
exports.A_GALLANTS11 = 2010011; //巡游活动使用双倍奖励的次数
exports.A_GALLANTS12 = 2010012; //巡游活动伊美加币消耗

exports.A_BEJ1 = 2020001;//宝石迷阵伊美加币消耗
exports.A_BEJ2 = 2020002;//宝石迷阵道具掉落
exports.A_BEJ3 = 2020003;//宝石迷阵第一档奖励领取
exports.A_BEJ4 = 2020004;//宝石迷阵第二档奖励领取
exports.A_BEJ5 = 2020005;//宝石迷阵第三档奖励领取
exports.A_BEJ6 = 2020006;//宝石迷阵一键消除使用次数

exports.P_GROUPPURCHASE3_1 = 2050001;//团购3伊美加币消耗
exports.P_GROUPPURCHASE3_2 = 2050002;//团购3道具掉落
exports.P_GROUPPURCHASE3_3 = 2050003;//团购3第一档奖励领取次数
exports.P_GROUPPURCHASE3_4 = 2050004;//团购3第二档奖励领取次数
exports.P_GROUPPURCHASE3_5 = 2050005;//团购3第三档奖励领取次数

exports.P_LIMITCHOOSE1 = 2060001;//限时礼包伊美加币消耗
exports.P_LIMITCHOOSE2 = 2060002;//限时礼包道具掉落
exports.P_LIMITCHOOSE3 = 2060003;//限时礼包抽奖次数
exports.P_LIMITCHOOSE4 = 2060004;//限时礼包十连抽次数

exports.A_EQUIPMENTSELL1 = 3010001;//装备贩卖索尼获得
exports.A_EQUIPMENTSELL2 = 3010002;//装备贩卖道具消耗

exports.A_FUSEUPGRADE1 = 3020001;//融合伙伴消耗
exports.A_FUSEUPGRADE2 = 3020002;//融合魂魄消耗

exports.A_LEAGUEDESTROY1 = 3030001;//联盟解散事件触发

exports.P_REGRESS = 2200001;//老友回归道具掉落

exports.E_GRAVITY1 = 4000001;//重力训练室元气消耗
exports.E_GRAVITY2 = 4000002;//重力训练室升级到1脉的人数
exports.E_GRAVITY3 = 4000003;//重力训练室升级到2脉的人数
exports.E_GRAVITY4 = 4000004;//重力训练室升级到3脉的人数
exports.E_GRAVITY5 = 4000005;//重力训练室升级到4脉的人数
exports.E_GRAVITY6 = 4000006;//重力训练室升级到5脉的人数
exports.E_GRAVITY7 = 4000007;//重力训练室升级到6脉的人数
exports.E_GRAVITY8 = 4000008;//重力训练室升级到7脉的人数
exports.E_GRAVITY9 = 4000009;//重力训练室升级到8脉的人数
exports.E_GRAVITY10 = 4000010;//重力训练室升级到9脉的人数
exports.E_GRAVITY11 = 4000011;//重力训练室升级到10脉的人数

exports.E_INTEBATTLE1 = 4100001;//积分擂台赛挑战次数
exports.E_INTEBATTLE2 = 4100002;//积分擂台赛对手刷新次数

exports.E_INTEBATTLE4 = 4100004;//积分擂台赛勋章消耗
exports.E_INTEBATTLE5 = 4100005;//积分擂台赛挑战胜利掉落
exports.E_INTEBATTLE6 = 4100006;//积分擂台赛成就奖励掉落
exports.E_INTEBATTLE7 = 4100007;//积分擂台赛排行奖励掉落
exports.E_INTEBATTLE8 = 4100008;//积分擂台赛商城兑换掉落
exports.E_INTEBATTLE9 = 4100009;//积分擂台赛金币消耗

exports.PVPTOPCROSS1 = 4110002;//跨服竞技场购买次数金币消耗
exports.PVPTOPCROSS2 = 4110001;//跨服竞技场排行奖励掉落

exports.HERO_RECRUIT = 5000001;//跨服竞技场排行奖励掉落

exports.NOBLE1 = 5010001;//爵位系统金币消耗
exports.NOBLE2 = 5010002;//爵位系统索尼消耗
exports.NOBLE3 = 5020001;//绝地反击索尼获得
exports.NOBLE4 = 5020002;//绝地反击道具掉落
exports.NOBLE5 = 5010003;//爵位系统道具消耗
exports.NOBLE6 = 5020003;//绝地反击副本1参与次数
exports.NOBLE7 = 5020004;//绝地反击副本2参与次数
exports.NOBLE8 = 5020005;//绝地反击副本3参与次数
exports.NOBLE9 = 5020006;//绝地反击副本4参与次数
exports.NOBLE10 = 5020007;//绝地反击副本5参与次数

exports.UPSTAR1 = 5110002;//装备升星金币消耗
exports.UPSTAR2 = 5120001;//装备回收金币消耗
exports.UPSTAR3 = 5120002;//装备回收道具获得
exports.UPSTAR4 = 5100001;//装备精炼道具消耗
exports.UPSTAR5 = 5110001;//装备升星道具消耗

exports.FOOLISH1 = 5200001;//节日转盘单抽参与人数
exports.FOOLISH2 = 5200002;//节日转盘十连抽参与人数
exports.FOOLISH3 = 5200008;//节日刷新商店金币消耗
exports.FOOLISH4 = 5200003;//节日转盘成就道具获得
exports.FOOLISH5 = 5200004;//节日转盘商店道具获得
exports.FOOLISH6 = 5200005;//节日转转盘道具获得
exports.FOOLISH7 = 5200006;//节日转转盘道具消耗
exports.FOOLISH8 = 5200007;//节日商店兑换消耗