/**
 * Created by xiayanxin on 2016/7/27.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var hero = require("../model/hero");
var upStar = require("../model/upStar");
var TAG = "upStar.up";
var DEBUG = true;

function start(postData, response, query) {
    if (jutil.postCheck(postData, "heroUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var heroUid = postData["heroUid"];
    var configData;
    var content;
    var userData = [];
    var starData;
    var singleData;
    var heroId;
    var price = {};
    var nextPrice = {};
    async.series([function (cb) {
        upStar.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = jutil.deepCopy(res[2]);
                cb();
            }
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (res && res.hasOwnProperty(heroUid)) {
                heroId = res[heroUid]["heroId"];
                cb();
            } else {
                cb(err ? err : "NULL");
            }
        });
    }, function (cb) {
        upStar.getStarData(userUid, function (err, res) {
            starData = res;
            cb(err);
        });
    }, function (cb) {
        if (starData && starData.hasOwnProperty(heroUid)) {
            singleData = starData[heroUid];
            cb();
        } else {
            cb("NULL");
        }
    }, function (cb) {
        var msg = null;
        var major = singleData["major"];
        var minor = singleData["minor"];
        var nextMajor = (parseInt(major) + 1) + "";
        var nextMinor = (parseInt(minor) + 1) + "";
        var nextTwoMinor = (parseInt(nextMinor) + 1) + "";
        if (configData.hasOwnProperty(major) && configData[major]["detail"].hasOwnProperty(nextMinor)) {
            content = configData[major]["detail"][nextMinor];
            content["major"] = major;
            content["minor"] = nextMinor;
            content["damageAddBase"] = configData[major]["damageAdd"];
            content["damageReduceBase"] = configData[major]["damageReduce"];
            if (configData[major]["detail"].hasOwnProperty(nextTwoMinor)) {
                nextPrice = content["price"];
            } else if (configData.hasOwnProperty(nextMajor)) {
                nextPrice = configData[major]["price"];
                var soulCost = {};
                var soulCount = configData[major]["soul"];
                soulCost["id"] = heroId;
                soulCost["count"] = soulCount;
                nextPrice.push(soulCost);
                content["price"] = nextPrice;
            }
        } else if (configData.hasOwnProperty(nextMajor)) {
            content = configData[nextMajor]["detail"]["0"];
            content["major"] = nextMajor;
            content["minor"] = "0";
            content["damageAddBase"] = configData[nextMajor]["damageAdd"];
            content["damageReduceBase"] = configData[nextMajor]["damageReduce"];
            nextPrice = content["price"];
        } else {
            msg = "hit the top";
        }
        if (DEBUG) {
            console.log(nextPrice, "nextPrice");
        }
        cb(msg);
    }, function (cb) {
        price = singleData["price"];
        if (price) {
            if (DEBUG) {
                console.log(price, "price");
            }
            async.eachSeries(price, function (item, eaCb) {
                upStar.checkIfEnough(userUid, item, function (err, isOk) {
                    if (err) {
                        eaCb(err);
                    } else if (isOk) {
                        modelUtil.addDropItemToDB(item["id"], item["count"] * -1, userUid, 1, 1, function (err, res) {
                            userData.push(res);
                            eaCb(err);
                        });
                    } else {
                        eaCb("not enough");
                    }
                });
            }, function (err, res) {
                cb(err);
            });
        } else {
            cb();
        }
    }, function (cb) {
        var tmpObj = jutil.deepCopy(content);
        tmpObj["damageAdd"] += tmpObj["damageAddBase"];
        tmpObj["damageReduce"] += tmpObj["damageReduceBase"];
        tmpObj["nextPrice"] = nextPrice;
        singleData = tmpObj;
        cb();
    }, function (cb) {
        if (DEBUG) {
            console.log(singleData);
        }
        starData[heroUid] = singleData;
        upStar.setStarData(userUid, starData, cb);
    }, function (cb) {
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "userData": userData,
                "starData": singleData
            });
        }
    });
}

exports.start = start;