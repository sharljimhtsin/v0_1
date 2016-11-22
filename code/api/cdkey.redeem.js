/**
 * 兑换CD key
 * User: liyuluan
 * Date: 14-2-11
 * Time: 下午2:07
 */

var jutil = require("../utils/jutil");
var cdkey = require("../model/cdkey");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var async = require("async");
var mongoStats = require("../model/mongoStats");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"cdkey") == false) {
        response.echo("cdkey.redeem", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var mCDKey = postData["cdkey"];

    var giftID = 0;
    var gPlatformId = "0"; //平台 ID

    var cdkeyGift = null; // CDKey对应物品

    var rewardList = null;

    async.series([
        //取key信息, 并判断 key是否存在，是否被使用
        function(cb) {
            cdkey.getKeyInfo(userUid, mCDKey, function(err, res) {
                if (err) cb("dbError");
                else {
                    if (res == null) {
                        cb("cdkeyInvalid");
                    }else if (res["used"] == 1) {
                        cb("cdkeyUsed");
                    } else {
                        giftID = res["giftID"];
                        cb(null);
                    }
                }
            });
        },
        //取gift信息，并判断 key是否在有效期内
        function(cb) {
            cdkey.getGiftInfo(userUid, giftID, function(err, res) {
                if (err) cb("dbError");
                else {
                    if (res == null) {
                        cb("cdkeyInvalid");
                    } else {
                        gPlatformId = res["platformId"];
                        var mGift = res["gift"];
                        try {
                            cdkeyGift = JSON.parse(mGift);
                            if (cdkeyGift instanceof Array == false) {
                                cb("cdkeyInvalid");
                                return;
                            }
                        } catch(error) {
                            cb("cdkeyInvalid");
                            return;
                        }

                        var mSTime = res["sTime"];
                        var mETime = res["eTime"];
                        var mNow = jutil.now();
                        if (mNow < mSTime || mNow > mETime) {
                            cb("cdkeyInvalid");
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        },
        //取用户对应的平台,验证cdkey是否属于这个平台
        function(cb) {
            if (gPlatformId == "0") { //如果平台设置为0则不验证
                cb(null);
                return;
            }
            user.getUserPlatformId(userUid, function(err, res) {
                if (err) cb("dbError");
                else if (res == null) {
                    cb("cdkeyInvalid");
                } else {
                    var mPlatformId = res["platformId"];
                    if (gPlatformId == mPlatformId) {
                        cb(null);
                    } else {
                        cb("cdkeyInvalid")
                    }
                }
            });
        },
        //查看用户是否已使用了此类cdkey
        function(cb) {
            cdkey.getCDKeyOwner(userUid, giftID, function(err, res) {
                if (err) cb("dbError");
                else {
                    if (res == 0) {
                        cb(null);
                    } else {
                        cb("redeemed");
                    }
                }
            });
        },
        //标记CDKEY已被使用
        function(cb) {
            cdkey.setKeyUsed(userUid, mCDKey, function(err, res) {
                if (err) { console.error(err.stack) };
                cb(null);
            });
        },
        //标记用户已使用这个类别
        function(cb) {
            cdkey.setCDKeyOwner(userUid, giftID, mCDKey, function(err, res) {
                if (err) { console.error(err.stack) };
                cb (null);
            });
        },

        //领取物品
        function(cb) {
            rewardList = [];
            async.forEach(cdkeyGift, function(giftItem, forCb) {
                if (giftItem == null || giftItem["id"] == null) {
                    forCb(null);
                } else {
                    var mCount = giftItem["count"] || 1;
                    var mIsPatch = giftItem["isPatch"] || 0;
                    var mLevel = giftItem["level"] || 1;
                    var mIsHero = giftItem["isHero"] || false;

                    mongoStats.dropStats(giftItem["id"], userUid, '127.0.0.1', null, mongoStats.CDKEY, mCount, mLevel, mIsPatch);
                    modelUtil.addDropItemToDB(giftItem["id"], mCount, userUid, mIsPatch, mLevel, mIsHero, function(err, res) {
                        if (err) console.error(err.stack);
                        if(res instanceof Array){
                            for(var i in res){
                                rewardList.push(res[i]);
                            }
                        } else if(res) {
                            rewardList.push(res);
                        }
                        forCb(null);
                    });
                }
            }, function(err) {
                cb(null);
            });
        }
    ], function(err) {
        if (err) response.echo("cdkey.redeem", jutil.errorInfo(err));
        else {
            response.echo("cdkey.redeem", {"rewardList":rewardList, "cdkeyGift":cdkeyGift});
        }
    });
}

exports.start = start;