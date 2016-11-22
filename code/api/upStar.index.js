/**
 * Created by xiayanxin on 2016/7/27.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var hero = require("../model/hero");
var upStar = require("../model/upStar");
var TAG = "upStar.index";
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
    var isFirst = true;
    var starData;
    var singleData;
    var heroId;
    async.series([function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (res && res.hasOwnProperty(heroUid)) {
                heroId = res[heroUid]["heroId"];
                cb();
            } else {
                cb(err ? err : "NULL");
            }
        });
    }, function (cb) {
        upStar.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = jutil.deepCopy(res[2]);
                content = configData["0"]["detail"]["0"];
                cb();
            }
        });
    }, function (cb) {
        upStar.getStarData(userUid, function (err, res) {
            starData = res ? res : {};
            cb(err);
        });
    }, function (cb) {
        isFirst = (starData && starData.hasOwnProperty(heroUid) ? false : true);
        cb();
    }, function (cb) {
        cb();
    }, function (cb) {
        if (isFirst) {
            singleData = content;
            singleData["major"] = 0;
            singleData["minor"] = 0;
            singleData["damageAddBase"] = configData["0"]["damageAdd"];
            singleData["damageReduceBase"] = configData["0"]["damageReduce"];
            singleData["damageAdd"] += singleData["damageAddBase"];
            singleData["damageReduce"] += singleData["damageReduceBase"];
        } else {
            singleData = starData[heroUid];
        }
        cb();
    }, function (cb) {
        if (isFirst) {
            singleData["nextPrice"] = singleData["price"];
            starData[heroUid] = singleData;
            upStar.setStarData(userUid, starData, cb);
        } else {
            cb();
        }
    }, function (cb) {
        if (DEBUG) {
            console.log(singleData);
        }
        cb();
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "starData": singleData
            });
        }
    });
}

exports.start = start;