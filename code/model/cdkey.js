/**
 * cdkey 相关数据层
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午5:36
 */

var mysql = require("../alien/db/mysql");
var bitUtil = require("../alien/db/bitUtil");

/**
 * @param country 添加到的大区
 * @param platformId 平台ID
 * @param gift 礼包列表
 * @param sTime 有效期开始时间
 * @param eTime 有效期结束时间
 */
function addGift(country, platformId, giftName, gift, sTime, eTime, callbackFn) {
    var sql = "INSERT INTO cdkeygift SET ?";
    var insertData = {};
    insertData["platformId"] = platformId;
    insertData["giftName"] = giftName;
    insertData["gift"] = gift;
    insertData["sTime"] = sTime;
    insertData["eTime"] = eTime;


    mysql.loginDB(country).query(sql, insertData, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, 1);
        }
    });
}

/**
 * 取礼物列表
 * @param country
 * @param callbackFn
 */
function getGifts(country, callbackFn) {
    var sql = "SELECT * FROM cdkeygift";

    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

//添加key到数据库
function addKeys(country, giftID, count, callbackFn) {
//    var sql = "INSERT INTO cdkey SET ?";
    var sql = "INSERT INTO cdkey (`key`,`giftID`,`time`) VALUES ? ";
    var keys = [];
    //var sKeys = []; //返回的key列表

    var day = getYearDay();//当年第几天
    var time = Math.floor(Date.now() / 1000);
    for (var i = 0; i < count; i++) {
        var mKey = day + "" + Math.floor(Math.random() * 10000000000);
        keys.push([mKey, giftID, time]);
        //sKeys.push(mKey);

        if(i%1000==0) {
            mysql.loginDB(country).query(sql, [keys], function (err, res) {
                if(err) console.log(err);
            });
            keys = [];
        }
    }

    if(keys.length>0) {
        mysql.loginDB(country).query(sql, [keys], function (err, res) {
        });
    }
}

//取keys列表
function getKeys(country, giftID, callbackFn) {
    var sql = "SELECT `time`,count(`key`) as `c` FROM cdkey WHERE giftID=" + mysql.escape(giftID) + " group by `time`";
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

//取keys列表ByTime
function getKeysByTime(country, giftID, time, callbackFn) {
    var sql = "SELECT `key` FROM cdkey WHERE `giftID`=" + mysql.escape(giftID) + " and `time`=" + mysql.escape(time);
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

//将一个KEY标记为已使用
function setKeyUsed(userUid, cdkey, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];

    var sql = "UPDATE cdkey SET ? WHERE `key`=" + mysql.escape(cdkey);
    var sqlData = {"used":1};
    mysql.loginDB(mCountry).query(sql, sqlData, callbackFn);
}

//取CDKEY对应的giftID
function getKeyInfo(userUid, cdkey, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];

    var sql = "SELECT `key`,`giftID`,`used` FROM cdkey WHERE `key`=" + mysql.escape(cdkey) + " LIMIT 1";
    mysql.loginDB(mCountry).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            callbackFn(null, res[0]);
        }
    });
}

//取cdkey对应的礼品信息
function getGiftInfo(userUid, giftID, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];

    var sql = "SELECT platformId, gift, sTime, eTime FROM cdkeygift WHERE giftID=" + mysql.escape(giftID) + " LIMIT 1";
    mysql.loginDB(mCountry).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            callbackFn(null, res[0]);
        }
    });
}


// 判断一个玩家是否已使用某类别KEY
function getCDKeyOwner(userUid, giftID, callbackFn) {
    var sql = "SELECT userUid FROM cdkeyOwner WHERE userUid=" + mysql.escape(userUid) + " AND giftID=" + mysql.escape(giftID);

    mysql.game(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null || res.length == 0) {
            callbackFn(null, 0);
        } else {
            callbackFn(null, 1);
        }
    });

}

function setCDKeyOwner(userUid, giftID, cdkey, callbackFn) {
    var sql = "INSERT INTO cdkeyOwner SET ?";
    var sqlData = {"userUid":userUid, "giftID":giftID, "key":cdkey, "time": Math.floor(Date.now() / 1000)};

    mysql.game(userUid).query(sql, sqlData, function(err, res) {
        if (err) callbackFn(err);
        else {
           callbackFn(null, 1);
       }
    });

}

function getYearDay(){
    var dateArr = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
    var date = new Date();
    var day = date.getDate();
    var month = date.getMonth(); //getMonth()是从0开始
    var year = date.getFullYear();
    var result = 0;
    for (var i = 0; i < month; i++) {
        result += dateArr[i];
    }
    result += day;
    //判断是否闰年
    if (month > 1 && (year % 4 == 0 && year % 100 != 0) || year % 400 == 0) {
        result += 1;
    }

    return result;
}

exports.addGift = addGift;
exports.getGifts = getGifts;
exports.addKeys = addKeys;
exports.getKeys = getKeys;
exports.getKeysByTime = getKeysByTime;

exports.getKeyInfo = getKeyInfo;
exports.getGiftInfo = getGiftInfo;

exports.getCDKeyOwner = getCDKeyOwner;
exports.setCDKeyOwner = setCDKeyOwner;
exports.setKeyUsed = setKeyUsed;