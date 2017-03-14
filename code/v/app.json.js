/**
 * Created with JetBrains WebStorm.
 * User: liyuluan
 * Date: 14-3-6
 * Time: 下午2:34
 * To change this template use File | Settings | File Templates.
 */
var fs = require("fs");
var resolve = require("path").resolve;
var redis = require("../alien/db/redis");
var appJSON = {
    "version": "0.0.1",
    "list": {
        "configlist": {
            "url": "configlist.json", "version": "0.0.1", "name": "configlist",
            "serverPath": "http://dragonballsrc.gametrees.com/p91/v14022801/configlist/"
        },

        "material": {
            "url": "material.json", "version": "0.0.1", "name": "material",
            "serverPath": "http://dragonballsrc.gametrees.com/p91/v14022801/material/"
        },

        "oui": {
            "url": "oui.json", "version": "0.0.1", "name": "oui",
            "serverPath": "http://dragonballsrc.gametrees.com/p91/v14022801/oui/"
        },

        "scripts": {
            "url": "scripts.json", "version": "0.0.1", "name": "scripts",
            "serverPath": "http://dragonballsrc.gametrees.com/p91/v14022801/scripts/"
        },

        "resources": {
            "url": "resources.json", "version": "0.0.1", "name": "resources",
            "serverPath": "http://dragonballsrc.gametrees.com/p91/v14022801/resources/"
        }
    },
    "serverEntrance": "http://dragonballt.gametrees.com/",
    "isDebug": 1,
    "debugPath": "http://127.0.0.1:1337/",
    "platformId": "p91"
};

var appJSONStr = JSON.stringify(appJSON, null, 2);
var whitelist = null;
var stringCache = {};
var _time = 0;

/***平台列表:
 * 国内安卓平台（android）: a91--p91android, a360--360android, anzhi--安智android, baidu--百度android, "dcn", sina--新浪android, ucweb--UCandroid,
 * wandoujia--豌豆荚android, xiaomi--小米android, yyh--应用汇android, kk--, anfan--安峰android, wyx--微游戏android
 * 国内ios平台（p91）: p91--91ios,pp, ppzs-pp助手ios, tb--同步推ios,ky--快用ios, haima--海马ios, itools
 * 台湾安卓平台（kingnetenglish）: kingnetenglish--台湾安卓, kingnetenglishoff--线下包, kingnetly--台湾安卓联运, kyxyzs--台湾xy助手
 * 台湾ios平台（kingnetenglishios）: kingnetenglishios--台湾ios, "kingnetenglishiosoff--台湾ios线下包
 * 台湾双语平台（kenkingnetenglish）: kenkingnetenglish
 * 台湾英文ios联运平台（kyeniosly）: kyeniosly
 * 台湾泰文联运平台（kythaily）: kythaily
 * 台湾泰文平台（kythaixy）: kythaixy
 * 南美平台（baxi）: baxi,baxiA--巴西安卓
 * 三国语言平台（sanguo）sanguo
 * sdk(saiya): meizu", "youku", "lenovo", "i4", "xyzs
 * 北美平台（usa）: usa", "usaa", "usaa1", "usagp","usaaoff,usaazb
 * 乐聚平台（leju）: ljxyzs--乐聚xy助手, ljoppo--乐聚oppo, ljmi, ljxiongmao--乐聚熊猫玩, lj360--乐聚360, ljhtc--乐聚htc, ljlenovo--乐聚联想, ljmeizu--乐聚魅族,
 * ljguopana--乐聚果盘android, ljguopanios--乐聚果盘ios, ljhuawei--乐聚华为, ljkuaiyong--乐聚快用
 * 德语-"ger"，法语-"fra"，西班牙语-"esp"，越南-"yuenan"
 */
var _platformList = {
    "android": ["a91", "a360", "anzhi", "baidu", "dcn", "sina", "ucweb", "wandoujia", "xiaomi", "yyh", "kk", "anfan", "wyx", "gtsinaa", "a185"],//兼容三個版本文件從同一個服務器取的問題。
    "p91": ["p91", "pp", "ppzs", "tb", "ky", "haima", "itools"],
    "ios": ["ios", "gtsinaapp", "gtsinaios", "iosOfficial"],//兼容三個版本文件從同一個服務器取的問題。
    "kingnet": ["kingnet", "sdkkingnet", "bangqu"],
    "kingnetios": ["kingnetios", "sdkkingnetios"],
    "kingnetenglish": ["kingnetenglish", "kingnetenglishoff", "kingnetly", "kyxyzs", "sdkkingnetenglish"],
    "kingnetenglishios": ["kingnetenglishios", "kingnetenglishiosoff", "kingnetenglishiosoffthai", "sdkkingnetenglishios"],
    "kenkingnetenglish": ["kenkingnetenglish", "sdkkenkingnetenglish"],
    "kyeniosly": ["kyeniosly"],
    "kythaily": ["kythaily"],
    "kythaixy": ["kythaixy"],
    "baxi": ["baxi", "baxiA", "baxiios"],
    "saiya": ["meizu", "youku", "lenovo", "i4", "xyzs"],
    "usa": ["usa", "usaa", "usaa1", "usagp", "usaaoff", "usausa", "usaglobal", "usaaoffIns", "usaazb", "usabzb", "usaczb", "usadzb", "usaezb", "usaaoffnew", "usafzb"],
    "leju": ["ljxyzs", "ljoppo", "ljmi", "ljxiongmao", "lj360", "ljhtc", "ljlenovo", "ljmeizu", "ljguopan", "ljguopana", "ljguopani", "ljhuawei", "ljkuaiyong", "ljxiaomi", "ljyoulu", "ljtbt", "ljjinli", "ljwdj", "ljitools", "ljhaimai", "ljhaimaa", "ljvivo", "ljanzhi"],
    "yuenan": ["yuenan", "yuenanlumi"],
    "ger": ["ger", "gera", "gergp"],
    "esp": ["esp", "espa", "espgp"],
    "fra": ["fra", "fraa", "fragp"],
    "ara": ["ara", "araa", "aragp"],
    "rus": ["rus", "rusen"],
    "rusios": ["rusios", "rusiosen"]
};

function start(postData, response, query) {
    var udid = query.hasOwnProperty("udid") ? query["udid"] : "";
    udid = String(udid);
    try {
        udid = udid.toLocaleUpperCase();
    } catch (e) {
        udid = "";
    }
    var p = query["p"];
    var h = query["h"] ? true : false;//https tag
    var lpath = getPname(query, "");
    var cacheName = "";

    if (Date.now() - _time > 120000) {
        _time = Date.now();
        clear();
    }

    var echoString = null;
    try {
        var pName = null;
        var isTest = false;
        var ip = query["clientIp"];
        /*
         101.95.167.238--普通办公用
         180.168.107.74--运维及研发用
         103.242.168.71--WIFI网络
         */
        var gtIp = ["101.95.167.238", "180.168.107.74", "103.242.168.71", "210.65.163.107", "180.168.107.76", "180.168.133.34", "43.225.36.109"];
        if ((udid != null && whitelist.indexOf(udid) != -1) || gtIp.indexOf(ip) != -1) {
            pName = p + "_test";
            isTest = true;
        } else {
            pName = p;
            isTest = false;
        }
        cacheName = lpath + pName;
        if (stringCache[cacheName] != null) {
            echoString = stringCache[cacheName];
        } else {
            var inList = false;
            for (var file in _platformList) {
                if (_platformList[file].indexOf(p) != -1) {
                    echoString = version(isTest, p, lpath + file, h);
                    stringCache[cacheName] = echoString;
                    inList = true;
                }
            }
            if (!inList) {
                var mPath = resolve(__dirname, "../../config/version/" + lpath + pName + ".json");
                echoString = fs.readFileSync(mPath, "utf-8");
                stringCache[cacheName] = echoString;
            }
        }
    } catch (err) {
        echoString = appJSONStr;
    }
//    console.log(echoString, "--------------------------=-=-=-=-------------------" + pName, udid);
    response.end(echoString, "utf-8");
}

function getPname(query, lpath) {
    lpath += query["package"] != undefined ? String(query["package"]) : '';
    return lpath;
}

function version(isTest, p, file, isHttps) {
    var mPath = "../../config/version/" + file + ".json";
    if (isTest == true) {
        mPath = "../../config/version/" + file + "_test.json";
    }
    mPath = resolve(__dirname, mPath);
    var echoString = fs.readFileSync(mPath, "utf-8");
    try {
        var jsonObj = JSON.parse(echoString);
        jsonObj["platformId"] = p;
        echoString = JSON.stringify(jsonObj, null, 2);
        // 是否使用HTTPS
        var https = ["usaezb"];
        if (https.indexOf(p) == -1) {
            echoString = echoString.replace(/https/g, "http");
        }
        if (isHttps) {
            echoString = echoString.replace(/http/g, "https");
        }
    } catch (error) {
        echoString = appJSONStr;
    }

    return echoString;
}

function clear() {
    var mPath = resolve(__dirname, "../../config/version/whitelist.json");
    var whitelistFile = fs.readFileSync(mPath, "utf-8");
    whitelist = JSON.parse(whitelistFile);
    stringCache = {};
}


exports.start = start;
