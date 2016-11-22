/**
 * 删除好友
 * User: dusongzhi
 * Date: 14-3-14
 * Time: 下午14:45
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var friend = require("../model/friend");
var async = require("async");
var title = require("../model/titleModel");


function start(postData, response, query) {
    //action: invite/add
    if (jutil.postCheck(postData, "friendUid") == false) {
        response.echo("friend.del", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var friendUid = postData['friendUid'];

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
                if (res != 1) {
                    callbackFn(new jutil.JError("notFriend"), null);
                } else {
                    callbackFn(null, null);
                }
            })
        }

    ], function (err, value) {
        if (err) {
            console.log(err.stack);
            response.echo("friend.del", jutil.errorInfo(err.info));//创建失败
        } else {
            friend.delFriend(userUid, friendUid, function (err, res) {
                if (res == 1) {
                    friend.friendCount(userUid, function(err, res) {
                        if (!(err || res == null)) {
                            title.friendCountChange(userUid, res);
                        }
                    });
                    friend.friendCount(friendUid, function(err, res) {
                        if (!(err || res == null)) {
                            title.friendCountChange(friendUid, res);
                        }
                    });

                    response.echo("friend.del", {"result": 1});
                } else {
                    response.echo("friend.del", new jutil.JError("delFailed"));
                }
            });
        }
    });
}

exports.start = start;
