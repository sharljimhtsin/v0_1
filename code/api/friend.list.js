/**
 * 好友列表
 * User: dusongzhi
 * Date: 14-3-11
 * Time: 下午10:30
 */

var jutil = require("../utils/jutil");
var friend = require("../model/friend");
var user = require("../model/user");
var formation = require("../model/formation");
var async = require("async");

function start(postData, response, query) {
    //action: friend/invited
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("friend.list", jutil.errorInfo("postError"));
        return false;
    }

    var userUid = query["userUid"];
    var action = postData["action"];
    var uids = {};
    var returnData = {};

    if (action != "friend" && action != "invited") {
        response.echo("friend.list", jutil.errorInfo("postError"));
        return false;
    }

    async.series([
        function (callbackFn) {//get uid list
            if (action == "friend") {
                friend.listFriend(userUid, function (res) {
                    uids = res;
                    callbackFn(null, null);
                });
            }

            if (action == "invited") {
                friend.listInvited(userUid, function (res) {
                    uids = res;
                    callbackFn(null, null);
                });
            }

        },
        function (callbackFn) {//get userlist
            if (uids == null) {
                callbackFn(null, null);
                return;
            }

            if (action == "friend") {
                async.forEach(Object.keys(uids), function (i, cb) {
                    user.getUser(uids[i].fUserUid, function (err, ures) {
                        returnData[uids[i].fUserUid] = ures;
                        returnData[uids[i].fUserUid]["fStatus"] = uids[i].status;
                        formation.getUserHeroId(uids[i].fUserUid, function (err, res) {
                            returnData[uids[i].fUserUid]["heroId"] = res;
                            cb(null);
                        });
                    });
                }, function (err) {
                    callbackFn(null, null);
                });
            }

            if (action == "invited") {
                async.forEach(Object.keys(uids), function (i, cb) {
                    user.getUser(uids[i].userUid, function (err, ures) {
                        returnData[uids[i].userUid] = ures;
                        if (returnData[uids[i].userUid]) returnData[uids[i].userUid]["fStatus"] = uids[i].status;
                        formation.getUserHeroId(uids[i].userUid, function (err, res) {
                            returnData[uids[i].userUid]["heroId"] = res;
                            cb(null);
                        });
                    });
                }, function (err) {
                    callbackFn(null, null);
                });
            }
        }

    ], function (err, value) {
        response.echo("friend.list", {"result": returnData});
    });


}

exports.start = start;
