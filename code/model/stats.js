/**
 * User: liyuluan
 * Date: 14-2-17
 * Time: 下午2:11
 */

var gameStat = require("../alien/log/Log").gameStat;
var gameStatFromCountry = require("../alien/log/Log").gameStatFromCountry;
var configManager = require("../config/configManager");
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var userOnline = require("../alien/stats/userOnline");
var async = require("async");
var redis = require("../alien/db/redis");
var isTest = 0;


//用户登录的数据统计
function login(userUid, userIP, userInfo, udid) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v, userInfo) {
        if (v == null) return;
        v[0] = 1;
        v[4] = "logon";
        v[6] = udid || 0;
        v[9] = 1;

        mq.publish(v);
    });
    redis.user(userUid).s("udid").set(udid);
}

//离线统计
function offine(userUid, userIP, userInfo, timeLength) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 1;
        v[4] = "logoff";
        v[5] = timeLength;
        v[9] = 1;
        mq.publish(v);
    });
}

//玩家所在副本统计
function fuben(userUid, userIP, userInfo, fubenId) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 1;
        v[4] = "fuben";
        v[5] = fubenId;
        v[9] = 1;
        mq.publish(v);
    });
}

/**
 * 用户创建统计
 * @param userUid
 * @param userIP
 * @param userInfo
 */
function userCreate(userUid, userIP, userInfo) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 3;
        mq.publish(v);
    });
}

function device(mCountry, udid, platformId, pUserId) {
    var mq = gameStatFromCountry(mCountry);
    var v = [];
    v[0] = 4;
    v[1] = getPlatformIdCode(platformId);
    v[5] = udid;
    v[10] = "127.0.0.1";
    v[11] = Date.now();
    v[12] = pUserId;
    v[27] = isTest;
    mq.publish(v);
}

//玩家当前在线统计
function onlineCount(userUid, userIP, userInfo, count) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 5;
        v[3] = v[14];
        v[4] = count;
        mq.publish(v);
    });
}

//用户充值的数据统计
function pay(userUid, userIP, userInfo, rmb, ingot, orderId, kda, isMo9, isMolOrMyCard) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function (v, userInfo) {
        if (v == null) return;
        v[0] = 6;
        v[2] = 1;//一定是RMB
        v[3] = rmb;
        v[4] = ingot;
        v[5] = orderId;
        v[6] = "pay";
        if (isMo9) {
            v[1] = _platformIdCode["mo9"];
        } else if (isMolOrMyCard) {
            v[1] = _platformIdCode["mol"];
        }
        mq.publish(v);
    });
}

//元宝的消耗处理
/**
 * @param id 行为ID
 * @param ingot 元宝ID
 * @param objID 物品
 * @param count 次数
 */
function ingotExpend(userUid, userIP, userInfo, id, ingot, objID, count) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 10;
        v[2] = id;
        v[3] = objID || "";
        v[4] = count || "";
        v[5] = ingot;
        v[6] = 0;
        mq.publish(v);
    });
}

//元宝获得统计
function ingotReceive(userUid, userIP, userInfo, id, ingot) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 11;
        v[2] = id;
        v[5] = ingot;
        v[6] = 0;
        mq.publish(v);
    });
}

function goldReceive(userUid, userIP, userInfo, id, golb, type) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 9;
        v[2] = id;
        v[4] = golb;
        v[7] = type;
        mq.publish(v);
    });
}

function goldExpend(userUid, userIP, userInfo, id, golb, type) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 8;
        v[2] = id;
        v[4] = golb;
        v[7] = type;
        mq.publish(v);
    });
}

function itemReceive(dropId, userUid, userIP, userInfo, id, count, level, type) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 12;
        v[2] = id;
        v[3] = dropId;
        v[4] = level||1;
        //v[5] = 0;
        v[6] = type;
        v[7] = count;
        mq.publish(v);
    });
}

function itemExpend(dropId, userUid, userIP, userInfo, id, count, level, type) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 13;
        v[2] = id;
        v[3] = dropId;
        v[4] = level||1;
        //v[5] = 0;
        v[6] = type;
        v[7] = count;
        mq.publish(v);
    });
}

//掉落的物品统计（获得）
function dropStats(dropId, userUid, userIP, userInfo, statsId, count, level, type) {
    switch(dropId + "") {
        case "ingot":
            ingotReceive(userUid, userIP, userInfo, statsId, count);
            break;
        case "gold":
            goldReceive(userUid, userIP, userInfo, statsId, count, type);
            break;
        default :
            itemReceive(dropId+"", userUid, userIP, userInfo, statsId, count, level, type);
            break;
    }
}

//消耗的物品统计
function expendStats(dropId, userUid, userIP, userInfo, statsId, count, level, type) {
    switch(dropId + "") {
        case "ingot":
            ingotExpend(userUid, userIP, userInfo, statsId, count);
            break;
        case "gold":
            goldExpend(userUid, userIP, userInfo, statsId, count, type);
            break;
        default :
            itemExpend(dropId+"", userUid, userIP, userInfo, statsId, count, level, type);
            break;
    }
}

/**
 * 用户新手引导统计
 * @param userUid
 * @param userIP
 * @param userInfo
 */
function userGuide(userUid, userIP, id) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, null, function(v) {
        if (v == null) return;
        v[0] = 15;
        v[3] = id;
        mq.publish(v);
    });
}


// 加载进度7
function load(mCountry, stop, platformId, pUserId){
    var mq = gameStatFromCountry(mCountry);
    var v = [];
    v[0] = 7;
    v[1] = getPlatformIdCode(platformId);
    v[3] = stop;
    v[10] = "127.0.0.1";
    v[11] = Date.now();
    v[12] = pUserId;
    v[27] = isTest;
    mq.publish(v);
}
// vip分布
function vip(userUid, userIP, userInfo, vip, oldvip) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 20;
        v[5] = vip;
        v[6] = oldvip;
        mq.publish(v);
    });
}
// 关卡通关率(1:通关，2未通送)
function battle(userUid, userIP, userInfo, id1,id2, isWin) {
    var mq = gameStat(userUid);
    var status = 1;
    if(isWin == true) status =1;
    else status = 2;

    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 23;
        v[2] = id1;//模块ID
        v[3] = id2;//关卡ID
        v[4] = status;
        mq.publish(v);
    });
}
// 获取经验
function exp(userUid, userIP, userInfo, id, exp) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function(v) {
        if (v == null) return;
        v[0] = 24;
        v[2] = id;
        v[3] = exp;
        mq.publish(v);
    });
}
// 各种活动
function events(userUid, userIP, userInfo, id, arg1, arg2, arg3, arg4) {
    var mq = gameStat(userUid);
    getUserInfoArray(userUid, userIP, userInfo, function (v) {
        if (v == null) return;
        v[0] = 25;
        v[2] = id;
        v[3] = arg1 | 0;
        v[4] = arg2 | 0;
        v[6] = arg3 | '';
        v[7] = arg4 | 0;
        mq.publish(v);
    });
}

// 根据档位纪录事件
function recordWithLevel(number, levelList, isMap, key, key2, tagList, cb, filterName, filterValue) {
    var tag = 0;
    if (!isMap) {
        var i = 0;
        for (var level in levelList) {
            if (number < level || number == level) {
                tag = tagList[i];
                break;
            }
            i++;
        }
    } else {
        var index = 0;
        for (var i = 0; i < levelList.length; i++) {
            var level = levelList[i];
            var start = 0;
            if (typeof (level) == "object") {
                if (filterName && filterValue) {
                    if (level[filterName] != filterValue) {
                        continue;
                    }
                }
                if (key2 != "") {
                    start = level[key2];
                }
                level = level[key];
            }
            if (start <= number && number <= level) {
                tag = tagList[index];
                break;
            }
            index++;
        }
    }
    cb(tag);
}

// 根据档位索引纪录事件
function recordWithLevelIndex(index, tagList, cb) {
    var tag = tagList[index - 1];
    cb(tag);
}

///////////////////////////////////////////////////////////////////////////////

//监听用户离线处理
userOnline.onOffine("analytic", function(offineUser) {
    if (offineUser == null) return;
    var mLoginList = offineUser[0];
    var mOffineList = offineUser[1];

    for (var userUid in mOffineList) {
        if(userUid - 0 < 10000)continue;
        var mOffineTime = mOffineList[userUid];
        var mLoginTime = mLoginList[userUid];
        offine(userUid, "127.0.0.1", null, mOffineTime - mLoginTime);
    }
});


//////////////////取用户基础数据返回的基础统计项
function getUserInfoArray(userUid, userIP,  userInfo, callbackFn) {
    var codeArray = bitUtil.parseUserUid(userUid);

    getUserInfo(userUid, userInfo, function(res) {
        if (res == null) {
            callbackFn(null);
            return;
        }
        var userInfo = res;
        var v = [];
        v[1] = getPlatformIdCode(userInfo["platformId"]);
        v[10] = userIP;
        v[11] = Date.now();
        v[12] = userInfo["pUserId"];
        v[13] = userUid;
        v[14] = codeArray[1];
        v[15] = userInfo["lv"];
        v[16] = userInfo["exp"];
        v[17] = userInfo["ingot"];
        v[18] = userInfo["gold"];
        v[23] = userInfo["vip"];
        v[24] = userInfo["createTime"];
        v[26] = codeArray[0];
        v[27] = isTest;

        userVariable.getPlatformId(userInfo["userUid"], function(err, res){
            if(err || res == null){
                callbackFn(v, userInfo);
            } else {
                var pCode = res.split('|');
                v[1]= getPlatformIdCode(pCode[0]);
                v[12]= pCode[1];
                var rDB = redis.login(codeArray[0]);
                rDB.s("package:"+userUid).get(function(err, res){
                    v[25] = res;
                    callbackFn(v, userInfo);
                });
            }
        })
    });
}

function getUserInfo(userUid, userInfo, callbackFn) {
    if (userInfo != null) {
        callbackFn(userInfo);
    } else {
        user.getUser(userUid, function(err, res) {
            if (err) callbackFn(null);
            else {
                callbackFn(res);
            }
        });
    }
}

var _platformIdCode = {
    "test2": 1,
    "uc": 2,
    "p91": 3,
    "pp": 4,
    "tb": 5,
    "ky": 6,
    "a360": 7, //360安卓
    "xiaomi": 8, //小米
    "ucweb": 9, //UC安卓
    "a91": 10, //91安卓
    "baidu": 11, //百度多酷
    "anzhi": 12, //安智
    "wandoujia": 13, //豌豆家
    "OPPO": 14,
    "dcn": 15, //当乐
    "ios": 16,
    "sina": 17, //新浪
    "yyh": 18, //应用汇
    "kk": 19,//_可可
    "haima": 20,//_海马(ios)
    "ppzs": 4,//_pp助手(ios)
    "itools": 21,//_itools(ios)
    "anfan": 22,//_安峰
    "kingnet": 31,
    "kingnetios": 32,
    "kingnetenglish": 33,//_英文版
    "kingnetenglishios": 34,//_英文版ios
    "thai": 35,       //泰国android
    "thaiios": 36,    //泰国ios
    "jodo": 37,        //卓动
    "youku": 38,      //优酷
    "meizu": 39,      //魅族
    "i4": 40,         //爱思
    "lenovo": 41,    //联想
    "xy": 42,          //凯英xy助手
    "rus": 43,          //俄罗斯安卓
    "rusios": 44,       //俄罗斯ios
    "rusen": 43,          //俄罗斯啊卓
    "rusiosen": 44,       //俄罗斯ios
    "sinawx": 45,       //新浪无线
    "usa": 46,         //北美
    "usaa": 47,         //北美
    "kingnetly": 48,    //凯英联运
    "kingnetenglishoff": 49,//_英文版
    "kingnetenglishiosoff": 50,//_英文版ios
    "ljitoos": 51,
    "ljanzhi": 52,
    "ljmeizu": 53,
    "ljkupai": 54,
    "ljuc": 55,
    "ljpp": 56,
    "ljdangle": 57,
    "ljmzw": 58,
    "ljios": 59,
    "ljucios": 60,
    "ljhaimaios": 61,
    "ljhaima": 62,
    "lji4": 63,
    "lj91": 64,
    "ljbaidu": 65,
    "ljjifeng": 66,
    "ljyouku": 67,
    "ljbaofeng": 68,
    "ljvivo": 69,
    "ljpps": 70,
    "ljsouhu": 71,
    "ljmomo": 72,
    "ljyiwan": 73,
    "ljouwan": 74,
    "lj4399": 75,
    "ljliebao": 76,
    "ljsougou": 77,
    "ljkugou": 78,
    "ljopera": 79,
    "lj7k7k": 80,
    "ljkudong": 81,
    "ljlvan": 82,
    "ljdnw": 83,
    "ljshixun": 84,
    "ljchuyou": 85,
    "ljyoulong": 86,
    "ljcaimi": 87,
    "ljndsc": 88,
    "lji9133": 89,
    "ljhtc": 90,
    "ljkuaiyong": 91,
    "ljtbt": 92,
    "ljxyzs": 93,
    "lj360": 94,
    "ljxiaomi": 95,
    "ljwdj": 96,
    "ljoppo": 97,
    "ljhuawei": 98,
    "ljjinli": 99,
    "ljlenovo": 100,
    "ljyoulu": 101,
    "ljguopani": 102,
    "ljguopana": 103,
    "ljxiongmao": 104,
    "kyxyzs": 105,     //凯英英文xy
    "usaaoff": 106,         //北美安卓线下包
    "gnetop": 107,         //凯英英文ios新
    "usaa1": 108,         //北美
    "usagp": 109,         //北美
    "kyeniosly": 110,     //凯茵英文联运
    "kythaily": 111,     //凯茵泰文联运
    "baxi": 112,     //baxi
    "kythaixy": 113,     //凯茵泰文
    "baxiA": 114,     //baiAndroid
    "ger": 115,     //德语
    "baxiios": 116,//baxiios
    "mo9": 117,// youff
    "fra": 118,//法语
    "esp": 119,//西班牙语
    "yuenan": 120,
    "gera": 122,     //德语线下安卓
    "fraa": 123,//法语线下安卓
    "espa": 124,//西班牙语线下安卓
    "kingnetenglishiosoffthai": 125,//泰文线下
    "usausa": 126,         //北美(美国版)
    "usaglobal": 127,         //北美（国际版）
    "yuenanlumi": 128,           //越南Lumia
    "usaaoffIns": 129,         //北美（国际版）
    "usaazb": 130,         //北美安卓线下
    "usabzb": 131,
    "gergp": 132,     //德语(谷歌线上)安卓
    "fragp": 133,//法语(谷歌线上)安卓
    "espgp": 134,//西班牙语(谷歌线上)安卓
    "ara": 135,//阿拉伯
    "araa": 136,//阿拉伯
    "aragp": 137,//阿拉伯
    "sdkkingnet": 138,
    "sdkkingnetios": 139,
    "sdkkingnetenglish": 140,
    "sdkkingnetenglishios": 141,
    "mol": 142,
    "usaczb": 143,
    "sdkkenkingnetenglish": 144,
    "bangqu": 145,
    "gtsinaa": 146,
    "gtsinaapp": 147,
    "gtsinaios": 148,
    "usadzb": 149,
    "usaezb": 150,
    "usaaoffnew": 151,
    "iosOfficial": 152,
    "a185": 153,
    "usafzb": 154
};
/**
 *  平台ID码
 */
function getPlatformIdCode(platformId) {
    return _platformIdCode[platformId] || 2;
}






//////////////元宝消耗类别
exports.E_ITEM = 1; //购买道具
exports.E_PACK = 2; //购买礼包
exports.E_REBIRTH_1 = 3; //比鲁斯重生
exports.E_REBIRTH_2 = 4; //比鲁斯浴火重生
exports.E_PVE_POWER = 5; //购买体力
exports.E_PVP_POWER = 6; //购买精力
exports.E_CLEAR_MAP = 7; //清关卡次数
exports.E_CLEAR_CONTINUE = 8;//清连闯
exports.E_SUMMON_ROLL_1 = 9;//招募 十
exports.E_SUMMON_ROLL_2 = 10;//招募 百
exports.E_SUMMON_ROLL_3 = 11;//招募 万
exports.E_TRAIN_1 = 12;//培养
exports.E_TRAIN_10 = 13;//十次培养
exports.E_CARD = 14;//卡片

////////元宝得到
exports.SHAKE = 1;//点龙珠
exports.LOGIN_LOTTERY = 2;//登录翻牌
exports.MAIL = 3;//邮件
exports.LOGIN7 = 4;//连继登录
exports.LEVEL_UP = 5;//升级奖励
exports.BLOOD5 = 6;// 血战 每五关
exports.R_BLOOD_RANK = 7;// 血战 排行
exports.R_PAY = 8;//充值






exports.login = login;
exports.fuben = fuben;
exports.userCreate = userCreate;
exports.device = device;
exports.onlineCount = onlineCount;
exports.pay = pay;
exports.dropStats = dropStats;
exports.expendStats = expendStats;
exports.userGuide = userGuide;//15

exports.load = load;//7
exports.vip = vip;//20
exports.battle = battle;//23
exports.exp = exp;//24
exports.events = events;//25

exports.getPlatformIdCode = getPlatformIdCode;
exports.recordWithLevel = recordWithLevel;
exports.recordWithLevelIndex = recordWithLevelIndex;