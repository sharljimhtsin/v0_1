/**
 * 添加或邀请好友
 * User: dusongzhi
 * Date: 14-3-11
 * Time: 下午10:30
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var friend = require("../model/friend");
var async = require("async");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");

function start(postData, response, query) {
    //action: invite/add
    if (jutil.postCheck(postData, "friendUid", "action") == false) {
        response.echo("friend.add", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var friendUid = postData['friendUid'];
    var action = postData['action'];

    if (action != "invite" && action != "add") {
        response.echo("friend.add", jutil.errorInfo("postError"));
        return false;
    }


    if (userUid == friendUid) {
        response.echo("friend.add", jutil.errorInfo("cannotAddSelfFriend"));
        return false;
    }

    var updateSendStatus = false;

    var friendCnt = 0; // 我的好友数量
    var f_friendCnt = 0; // 要添加好友的好友数量

    async.series([
        function (callbackFn) {//if friend user exist
            user.getUser(friendUid, function (err, res) {
                if (err) {
                    callbackFn(new jutil.JError("noThisUser"), null);
                } else {
                    callbackFn(null, null);
                }
            })
        },
        function (callbackFn) {//检查是否已经是好友
            friend.isFriend(userUid, friendUid, function (err, res) {
                if (res == 1) {
                    callbackFn("alreadyFriend", null);
                } else if (res == 2 && action == "invite") {
                    callbackFn("invited", null);
                } else if (res == 3 && action == "invite"){
                    updateSendStatus = true;
                    callbackFn(null, null);
                } else {
                    callbackFn(null, null);
                }
            })
        },
        function(cb) { //判断是否还可以添加好友
            friend.friendCount(userUid, function(err, res) {
                if (err || res == null) cb(new jutil.JError("dbError"));
                else {
                    friendCnt = res;
                    if (res >= 40) {
                        cb(new jutil.JError("friendCaps"));
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb) { //判断是否还可以添加好友
            friend.friendCount(friendUid, function(err, res) {
                if (err || res == null) cb(new jutil.JError("dbError"));
                else {
                    f_friendCnt = res;
                    if (res >= 40) {
                        cb(new jutil.JError("friendCapsF"));
                    } else {
                        cb(null);
                    }
                }
            });
        }
    ], function (err, value) {
        if (err) {
            if (err == "invited" || err == "alreadyFriend") {
                response.echo("friend.add", {"result": 1});//创建失败
            } else {
                response.echo("friend.add", jutil.errorInfo(err.info));//创建失败
            }
        } else {
            if (action == "add") {
                friend.isInvited(userUid, friendUid, function (err, res) {
                    if (res == 0) {
                        response.echo("friend.add", jutil.errorInfo("notInviteFriend"));
                    } else {
                        friend.addFriend(userUid, friendUid, function (err, res) {
                            if (err) {
                                response.echo("friend.add", jutil.errorInfo("dbError"));
                            } else {
                                // ADD BY LXB
                                title.friendCountChange(userUid, friendCnt + 1, function(){
                                    title.friendCountChange(friendUid, f_friendCnt + 1, function(){
                                        titleApi.getNewAndUpdate(userUid, "friend", function(err, res){
                                            if (!err && res) {
                                                response.echo("friend.add", {"result": 1, "titleInfo" : res});
                                            } else {
                                                response.echo("friend.add", {"result": 1});
                                            }
                                        });
                                    });
                                });
                                // END

//                                response.echo("friend.add", {"result": 1});
                            }
                        });
                    }
                });
            }

            if (action == "invite") {

                if (updateSendStatus) {
                    friend.updateSendStatus(userUid, friendUid, function(err){
                        if (err) console.error(err.stack);
                    });
                    response.echo("friend.add", {"result": 1});
                } else {
                    //2条
                    friend.inviteFriend(userUid, friendUid, 1, function (err, res) {
                        if (err) console.error(err.stack);
                    });
                    friend.inviteFriend(friendUid, userUid, 0, function (err, res) {
                        if (err) console.error(err.stack);
                    });
                    response.echo("friend.add", {"result": 1});
                }
            }
        }
    });
}





exports.start = start;
