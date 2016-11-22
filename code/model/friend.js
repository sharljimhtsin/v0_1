/**
 * 好友关系数据层
 * User: liyuluan
 * Date: 14-3-7
 * Time: 下午4:12
 */
var mysql = require("../alien/db/mysql");
/**
 * 添加好友
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function addFriend(userUid, fUserUid, callbackFn) {
    var sql1 = "UPDATE friend SET ? WHERE userUid = " + mysql.escape(userUid) + " AND fUserUid = " + mysql.escape(fUserUid);
    var sql2 = "UPDATE friend SET ? WHERE userUid = " + mysql.escape(fUserUid) + " AND fUserUid = " + mysql.escape(userUid);
    var newValueData = {"status": 1};
    mysql.game(userUid).query(sql1, newValueData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            mysql.game(userUid).query(sql2, newValueData, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    callbackFn(0, 1);
                }
            });
        }
    });
}

/**
 * 好友列表
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function listFriend(userUid, callbackFn) {
    var sql = "SELECT * FROM friend WHERE userUid = " + mysql.escape(userUid) + " AND status=1";
    mysql.game(userUid).query(sql, function (err, res) {
        callbackFn(res);
    });
}

/**
 * 被邀请的列表
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function listInvited(userUid, callbackFn) {
    var sql = "SELECT * FROM friend WHERE fUserUid = " + mysql.escape(userUid) + " AND isSend=1 AND status=0";
    mysql.game(userUid).query(sql, function (err, res) {
        callbackFn(res);
    });
}


/**
 * 邀请好友
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function inviteFriend(userUid, fUserUid, isSend, callbackFn) {
    var insertData = {};
    insertData["userUid"] = userUid;
    insertData["fUserUid"] = fUserUid;
    insertData["isSend"] = isSend ? isSend : 0;
    insertData["createTime"] = Math.floor(new Date().getTime() / 1000);
    var sql = 'INSERT INTO friend SET ?';
    mysql.game(userUid).query(sql, insertData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, insertData);
        }
    });
}

/**
 * 是否邀请过
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function isInvited(userUid, fUserUid, callbackFn) {
    var sql = "SELECT * FROM friend WHERE userUid = " + mysql.escape(userUid) + " AND fUserUid = " + mysql.escape(fUserUid) + " LIMIT 1";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(null, 0);
        else {
            callbackFn(null, 1);
        }
    });
}


/**
 * 是否已经是好友
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function isFriend(userUid, fUserUid, callbackFn) {
    var sql = "SELECT * FROM friend WHERE userUid = " + mysql.escape(userUid) + " AND fUserUid = " + mysql.escape(fUserUid) + " LIMIT 1";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(null, 0);
        else {
            var status = res[0]["status"];
            var isSend = res[0]["isSend"];
            if (status == 1) {
                callbackFn(null, 1);
            } else if (isSend == 1) {
                callbackFn(null, 2);
            } else {
                callbackFn(null, 3);
            }

        }
    });
}

/**
 * 更新状态
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function updateSendStatus(userUid, fUserUid, callbackFn) {
    var sql1 = "UPDATE friend SET ? WHERE userUid = " + mysql.escape(userUid) + " AND fUserUid = " + mysql.escape(fUserUid);
    var newValueData = {"isSend": 1};
    mysql.game(userUid).query(sql1, newValueData, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null);
        }
    });
}

/**
 * 删除好友
 * @param userUid
 * @param fUserUid
 * @param callbackFn
 */
function delFriend(userUid, fUserUid, callbackFn) {
    var sql1 = "DELETE FROM friend WHERE userUid = " + mysql.escape(userUid) + " AND fUserUid = " + mysql.escape(fUserUid);
    var sql2 = "DELETE FROM friend WHERE userUid = " + mysql.escape(fUserUid) + " AND fUserUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql1, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(null, 0);
        else {
            mysql.game(userUid).query(sql2, function (err, res) {
                if (err) {
                    callbackFn(err, null);
                } else {
                    callbackFn(null, 1);
                }
            });
        }
    });
}

//取好友数量
function friendCount(userUid, callbackFn) {
    var sql = "SELECT COUNT(*) AS count FROM friend WHERE userUid = " + mysql.escape(userUid) + " AND status=1";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            callbackFn(null, res[0]["count"]);
        }
    });

}

exports.addFriend = addFriend;
exports.inviteFriend = inviteFriend;
exports.isFriend = isFriend;
exports.listFriend = listFriend;
exports.isInvited = isInvited;
exports.listInvited = listInvited;
exports.delFriend = delFriend;
exports.friendCount = friendCount;
exports.updateSendStatus = updateSendStatus;
