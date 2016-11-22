/**
 * Created by xiayanxin on 2016/11/8.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var formation = require("../model/formation");
var TAG = "leagueTeam.getManor";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var manorLimit = 0;
    var currentConfig;
    var leagueUid = "";
    var returnData = {};
    var key;
    var sTime = 0;

    async.series([function (cb) {//验证玩家是否已加入联盟
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    leagueUid = res["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {//默认返回领地数据
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    currentConfig = res[2];
                    manorLimit = currentConfig["manorLimit"];
                    key = currentConfig["key"];
                    if (sTime >= jutil.now() || sTime + 86400 * 4.5 >= jutil.now()) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        lt.getScore(userUid, leagueUid, key, function (err, res) {
            returnData["score"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getFightingManor(userUid, leagueUid, key, function (err, res) {
            returnData["fighting"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            var manor = res ? res : {};
            async.series([function (youCb) {
                if (manor["isRobot"] == 1) {
                    manor["you"] = manor["robotList"];
                    youCb(err);
                } else {
                    var tmp = manor["owner"];
                    var playList = [];
                    async.eachSeries(tmp, function (one, eCb) {
                        formation.getUserHeroIds(one["userUid"], function (err, res) {
                            one["formation"] = res;
                            playList.push(one);
                            eCb(err);
                        });
                    }, function (err, res) {
                        manor["you"] = playList;
                        youCb(err);
                    });
                }
            }, function (meCb) {
                var tmp = manor["substitute"][leagueUid] ? manor["substitute"][leagueUid] : [];
                var playList = [];
                async.eachSeries(tmp, function (one, eCb) {
                    formation.getUserHeroIds(one["userUid"], function (err, res) {
                        one["formation"] = res;
                        playList.push(one);
                        eCb(err);
                    });
                }, function (err, res) {
                    manor["me"] = playList;
                    meCb(err);
                });
            }, function (dataCb) {
                returnData["manor"] = manor;
                dataCb();
            }], cb);
        });
    }, function (cb) {
        lt.getTeamContribution(userUid, leagueUid, key, function (err, res) {
            returnData["contribution"] = res ? res : 0;
            cb(err);
        });
    }, function (cb) {
        lt.getTeamResource(userUid, leagueUid, key, function (err, res) {
            returnData["resource"] = res ? res : 0;
            cb(err);
        });
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;