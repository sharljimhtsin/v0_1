/**
 * 指点的数据model
 * User: liyuluan
 * Date: 13-11-5
 * Time: 下午6:50
 */
//var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");

/**
 * @param userUid
 * @param level
 * @param time
 * @param callbackFn
 */
function addTeach(userUid,level,time,callbackFn) {
    var insertSql = "INSERT INTO teach SET ?";
    redis.getNewId(userUid,function(err,res) {
        if (err) callbackFn(err,null);
        else {
            var newId = res - 0;
            var insertData = {"userUid":userUid,"level":level,"id":1,"time":time,"teachUid":newId};
            mysql.game(userUid).query(insertSql,insertData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    callbackFn(null,insertData);
                }
            });
        }
    });
}

/**
 * 取点拨(群体)列表
 * @param userUid
 * @param callbackFn
 */
function getTeachList(userUid,callbackFn) {
    var sql = "SELECT * FROM teach WHERE id=1 AND userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql,function(err,res) {
       callbackFn(err,res);
    });
}

/**
 * 取某点拨（群体）的数据
 * @param userUid
 * @param teachUid
 * @param callbackFn
 */
function getTeach(userUid,teachUid,callbackFn) {
    var sql = "SELECT * FROM teach WHERE id=1 AND userUid=" + mysql.escape(userUid) + " AND teachUid=" + mysql.escape(teachUid);
    mysql.game(userUid).query(sql,function(err,res) {
        if (err || res == null || res.length == 0) callbackFn(err,null);
        else {
            callbackFn(err,res[0]);
        }
    });
}

function addWorldBossTeach(userUid,level,callbackFn) {
    var insertSql = "INSERT INTO teach SET ?";
    redis.getNewId(userUid, function(err, res) {
        if (err) callbackFn(err,null);
        else {
            var newId = res;
            var insertData = {"userUid":userUid,"level":level,"id":2,"time":0,"teachUid":newId};
            mysql.game(userUid).query(insertSql,insertData,function(err,res) {
                if (err) callbackFn(err,null);
                else {
                    callbackFn(null,insertData);
                }
            });
        }
    });
}

/**
 * 取指单(单体)列表
 * @param userUid
 * @param callbackFn
 */
function getWorldBossTeachList(userUid,callbackFn) {
    var sql = "SELECT * FROM teach WHERE id=2 AND userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(sql,function(err,res) {
        callbackFn(err,res);
    });
}

/**
 * 取某指点（群体）的数据
 * @param userUid
 * @param teachUid
 * @param callbackFn
 */
function getWorldBossTeach(userUid,teachUid,callbackFn) {
    var sql = "SELECT * FROM teach WHERE id=2 AND userUid=" + mysql.escape(userUid) + " AND teachUid=" + mysql.escape(teachUid);
    mysql.game(userUid).query(sql,function(err,res) {
        if (err || res == null || res.length == 0) callbackFn(err,null);
        else {
            callbackFn(err,res[0]);
        }
    });
}

//删除点拨
function delTeach(userUid,teachUid,callbackFn) {
    var delSql = "DELETE FROM teach WHERE id = 1 AND userUid = " + mysql.escape(userUid) + " AND teachUid  = " + mysql.escape(teachUid);
    mysql.game(userUid).query(delSql,function(err,res) {
        callbackFn(err,res);
    });
}
//删除指点
function delWorldBossTeach(userUid,teachUid,callbackFn) {
    var delSql = "DELETE FROM teach WHERE id = 2 AND userUid = " + mysql.escape(userUid) + " AND teachUid  = " + mysql.escape(teachUid);
    mysql.game(userUid).query(delSql,function(err,res) {
        callbackFn(err,res);
    });
}


//删除所有点拨
function delAllTeach(userUid,callbackFn) {
    var delSql = "DELETE FROM teach WHERE id = 1 AND userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(delSql,function(err,res) {
        callbackFn(err,res);
    });
}
//删除所有指点
function delAllWorldBossTeach(userUid,callbackFn) {
    var delSql = "DELETE FROM teach WHERE id = 2 AND userUid = " + mysql.escape(userUid);
    mysql.game(userUid).query(delSql,function(err,res) {
        callbackFn(err,res);
    });
}


exports.addTeach = addTeach;
exports.delTeach = delTeach;
exports.getTeachList = getTeachList;
exports.getTeach = getTeach;

exports.addWorldBossTeach = addWorldBossTeach;
exports.getWorldBossTeachList = getWorldBossTeachList;
exports.getWorldBossTeach = getWorldBossTeach;
exports.delWorldBossTeach = delWorldBossTeach;

exports.delAllTeach = delAllTeach;
exports.delAllWorldBossTeach = delAllWorldBossTeach;
