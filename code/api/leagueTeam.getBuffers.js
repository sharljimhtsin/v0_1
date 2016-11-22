/**
 * Created by xiayanxin on 2016/11/2.
 *
 * 獲取 buffer 列表
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var formation = require("../model/formation");
var TAG = "leagueTeam.getBuffers";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;
    var leagueUid = "";
    var userData;
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
                    userData = res;
                    cb();
                }
            }
        });
    }, function (cb) {//默认返回buffer数据
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    currentConfig = res[2];
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
        lt.getBuffers(userUid, key, function (err, res) {
            var tmpList = res ? res : {};
            var bufferList = {};
            async.series([function (mCb) {
                mCb(err);
            }, function (mCb) {
                var index = 1;
                var keys = Object.keys(tmpList);
                async.eachSeries(keys, function (key, oneCb) {
                    var buffer = tmpList[key];
                    async.series([function (youCb) {
                        buffer["you"] = buffer["robotList"];
                        youCb();
                    }, function (meCb) {
                        var tmp = [userData];
                        var playList = [];
                        async.eachSeries(tmp, function (one, eCb) {
                            formation.getUserHeroIds(one["userUid"], function (err, res) {
                                one["formation"] = res;
                                playList.push(one);
                                eCb(err);
                            });
                        }, function (err, res) {
                            buffer["me"] = playList;
                            meCb(err);
                        });
                    }, function (dataCb) {
                        bufferList[index] = buffer;
                        index++;
                        dataCb();
                    }], oneCb);
                }, mCb);
            }, function (mCb) {
                returnData["bufferList"] = bufferList;
                mCb();
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