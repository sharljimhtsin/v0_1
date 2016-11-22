/**
 * Created by xiayanxin on 2016/11/12.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var formation = require("../model/formation");
var TAG = "leagueTeam.quit";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var leagueUid = "";
    var sTime = 0;
    var key;
    var manor;
    var userData = {};
    var returnData = {};

    async.series([function (cb) {
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    if (sTime >= jutil.now() || sTime + 86400 * 4.5 >= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
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
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    userData = res;
                    leagueUid = userData["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {
        lt.checkMemberJoin(userUid, leagueUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res) {
                    cb();
                } else {
                    cb("notJoinYet");
                }
            }
        });
    }, function (cb) {
        lt.getTargetManor(userUid, leagueUid, key, function (err, res) {
            if (res && res > 0) {
                cb();
            } else {
                cb(err ? err : "notJoinYet");
            }
        });
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            manor = res;
            if (manor) {
                cb(err);
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        var ourTeam = [];
        var substitute = manor["substitute"];
        if (substitute.hasOwnProperty(leagueUid)) {
            ourTeam = substitute[leagueUid];
            var newTeam = [];
            var needUpdate = false;
            for (var i in ourTeam) {
                i = ourTeam[i];
                if (i["userUid"] == userUid) {
                    needUpdate = true;
                    continue;
                } else {
                    newTeam.push(i);
                }
            }
            if (needUpdate) {
                manor["substitute"][leagueUid] = newTeam;
                lt.setManor(userUid, index, manor, key, cb);
            } else {
                cb("notJoinYet");
            }
        } else {
            cb("notJoinYet");
        }
    }, function (cb) {
        lt.setTargetManor(userUid, leagueUid, 0, key, cb);
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            manor = res;
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
                var tmp = manor["substitute"][leagueUid];
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
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;