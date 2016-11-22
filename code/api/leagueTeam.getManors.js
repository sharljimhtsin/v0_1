/**
 * Created by xiayanxin on 2016/10/25.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var formation = require("../model/formation");
var TAG = "leagueTeam.getManors";

function start(postData, response, query) {
    var userUid = query["userUid"];
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
        lt.getManors(userUid, manorLimit, key, function (err, res) {
            var tmpList = res ? res : {};
            var manorList = {};
            async.series([function (mCb) {
                mCb(err);
            }, function (mCb) {
                var index = 1;
                var keys = Object.keys(tmpList);
                async.eachSeries(keys, function (key, oneCb) {
                    var manor = tmpList[key];
                    async.series([function (youCb) {
                        if (manor["isRobot"] == 1) {
                            manor["you"] = manor["robotList"];
                            youCb();
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
                        manorList[index] = manor;
                        index++;
                        dataCb();
                    }], oneCb);
                }, mCb);
            }, function (mCb) {
                returnData["manorList"] = manorList;
                mCb();
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