/**
 * Created with JetBrains WebStorm.改联盟名
 * league: kongyajie（改用户名）-->za(改联盟名)2016/1/26 15:12
 * Date: 14-2-13
 * Time: 下午8:09
 * To change this template use File | Settings | File Templates.
 */
var league = require("../model/league");
var itemModel = require("../model/item");
var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "newName") == false) {
        response.echo("league.changeName", jutil.errorInfo("postError"));
        return;
    }

    var newName = postData["newName"];
    var userUid = query["userUid"];
//    console.log(userUid,"1221");

    newName = jutil.filterWord(newName);
    if (newName == false) {
        response.echo("league.changeName", jutil.errorInfo("nameInvalid"));//leagueNameInvalid
        return;
    }
    var itemId = 155801;
    var leagueUid = "";
    var leagueData = {};
    var Data = {};
    var newItemData = null;//道具信息
    async.series([
        function (cb) {
            league.getLeagues(userUid, function (err, res) {
                if (err)cb(err);
                else {
                    var len = Object.keys(res).length;
                    if (len < 0)cb("hasNotJoinLeague");
                    else {
                        Data = res;
                        for (var x in res) {
//                            console.log(res[x]["founderUserUid"],userUid,"1");
                            if (res[x]["founderUserUid"] == userUid) {//是会长
                                leagueUid = x;
                                break;
                            } else {
                                leagueUid = 0;
                                continue;
                            }
                        }
//                        console.log(leagueUid,"2...");
                        if (leagueUid == 0) {
                            cb("limitedLeagueAuthority");
                        } else {//验证用户是否为会长（需求：只有会长才能改名）
                            leagueData = Data[leagueUid];
                            cb(null);
                        }
                    }
                }
            });
        },
        function (cb) { //取item
//            console.log(userUid,itemId,"3");
            itemModel.getItem(userUid, itemId, function (err, res) {
//                console.log(err,res,"4");
                if (err) cb("dbError");
                else if (res == null || res["number"] <= 0) cb("noItem");
                else cb(null);
            });
        },
        function (cb) {//判断用户名是否可用
//            console.log(newName,"9");
            league.leagueNameIsExist(userUid, newName, function (err, res) {
                if (res == 1) {
                    cb("nameInvalid", null);
                } else {
                    cb(null, null);
                }
            });
        },
        function (cb) {//更改玩家名字
            leagueData["leagueName"] = newName;
//            console.log(userUid, leagueUid, leagueData,"9-9--0");
            league.updateLeague(userUid, leagueUid, leagueData, function (err, res) {
                if (err) cb("dbError");
                else cb(null);
            });
        },
        function (cb) { //更新item数量
            itemModel.updateItem(userUid, itemId, -1, function (err, res) {
                if (err) console.error(userUid, itemId, err.stack);
                var leagueIP = '127.0.0.1';//response.response.socket.remoteAddress;
                mongoStats.expendStats(itemId, userUid, leagueIP, null, mongoStats.CHAT, 1);
                newItemData = res;
                cb(null);
            });
        }

    ], function (err) {
        if (err) {
            response.echo("league.changeName", jutil.errorInfo(err));
        } else {
            response.echo("league.changeName", {"newItemData": newItemData, "result": 1});
        }
    });
}

exports.start = start;