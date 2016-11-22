/**
 * platform表数据处理
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午2:52
 */

var mysql = require("../alien/db/mysql");

/**
 * 从platform表取用户信息, 如果没取到则创建一个
 * @param platformId
 * @param platformUserId
 */
function getUser(platformId, platformUserId, callbackFn) {
//    var SQL = "SELECT * FROM platform WHERE platformId = " + mysql.escape(platformId) + " AND platformUserId = " + mysql.escape(platformUserId);
//
//    mysql.loginDB().query(SQL,function(err,res) {
//        if (err) {
//            callbackFn(err,null);
//        } else if (res == null || res.length == 0) {//用户不存在，创建一个用户
//            mysql.getMaxId("platform", "userUid", function(err, res){
//                if (err) {
//                    callbackFn(err,null);//取最大ID
//                } else {
//                    var newUserSQL = "INSERT INTO platform SET ?";
//                    var newUserData = {"userUid":res - 0 + 1,"platformId":platformId,"platformUserId":platformUserId,"status":0};
//                    mysql.loginDB().query(newUserSQL,newUserData,function(err,res) {
//                        if (err) {
//                            console.error(newUserSQL, newUserData, err.stack);
//                            callbackFn(err,null);
//                        } else {
//                            callbackFn(null,newUserData);
//                        }
//                    });
//                }
//            });
//        } else {
//            callbackFn(null,res[0]);
//        }
//    });
}

/**
 * 通过userUid取得platform中的数据
 * @param userUid
 * @param callbackFn
 */
function getUserByUserUid(userUid, callbackFn) {
    var SQL = "SELECT * FROM userOwner WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(SQL,function(err, res) {
        if (res != null && res.length > 0) {
            callbackFn(null, res[0]);
        } else {
            callbackFn(err, null);
        }
    });
}

/**
 * 更新platform用户的status (表示用户是否已创建完毕)
 * @param userUid
 * @param status
 * @param callbackFn
 */
function updateUserStatus(userUid,status,callbackFn) {
    var SQL = "UPDATE platform SET status = " + mysql.escape(status) +" WHERE userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(SQL,function(err,res) {
        if (err) {
            callbackFn(err,null);
        }else {
            callbackFn(err,1);
        }
    });
}

/**
 * 添加udid到数据库
 */
function addDevice(country, udid, callbackFn) {
    var sql = "SELECT deviceId FROM device WHERE deviceId=" + mysql.escape(udid) + " LIMIT 1";
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                var sql2 = "INSERT INTO `device`(`deviceId`) VALUES (" + mysql.escape(udid) +")";
                mysql.loginDB(country).query(sql2, function(err, res) {
                    callbackFn(null, 1);
                });
            } else {
                callbackFn(null, 0);
            }
        }
    });
}

function addtoken(country, token, callbackFn) {
    var sql = "SELECT deviceId FROM device WHERE deviceId=" + mysql.escape(udid) + " LIMIT 1";
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                var sql2 = "INSERT INTO `device`(`deviceId`) VALUES (" + mysql.escape(udid) +")";
                mysql.loginDB(country).query(sql2, function(err, res) {
                    callbackFn(null, 1);
                });
            } else {
                callbackFn(null, 0);
            }
        }
    });
}


exports.getUser = getUser;
exports.getUserByUserUid = getUserByUserUid;
exports.updateUserStatus = updateUserStatus;
exports.addDevice = addDevice;
