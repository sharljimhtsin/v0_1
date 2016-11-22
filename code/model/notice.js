/**
 * 公告板数据层
 * User: liyuluan
 * Date: 14-2-7
 * Time: 下午5:39
 */

var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var userVariable = require("../model/userVariable");


function addNotice(country, city, noticeId, title, scrollText, name, text, stime, etime ,channel , sort , callbackFn) {
    var sql = "INSERT INTO notice SET ?";
    var insertData = {"id":noticeId, "title":title, "scrollText":scrollText, "name":name, "text":text, "stime":stime, "etime":etime ,"channel":channel, "sort":sort};
    mysql.game(null, country, city).query(sql, insertData, function(err, res) {
        if (err) callbackFn(err);
        else callbackFn(null);
    });
}

function updateNotice(country, city, noticeId, title, scrollText, name, text, stime, etime ,channel , sort , callbackFn) {
    var sql = "UPDATE notice SET ? WHERE title=" + mysql.escape(title);
    var insertData = {"id":noticeId, "title":title, "scrollText":scrollText, "name":name, "text":text, "stime":stime, "etime":etime ,"channel":channel, "sort":sort};
    mysql.game(null, country, city).query(sql, insertData, function(err, res) {
        if (err) callbackFn(err);
        else callbackFn(null);
    });
}

function delNotice(country, city, noticeId, callbackFn) {
    var sql = "DELETE FROM notice WHERE id=" + mysql.escape(noticeId);
    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else callbackFn(null);
    });
}

//GM管理工具中取公告列表
function getNotices(country, city, callbackFn) {
    redis.domain(country, city).s("notice").getObj(function(err, res){
        if(err){
            callbackFn(err);
        } else if(res == null) {
            var sql = 'SELECT * FROM notice WHERE 1';
            mysql.game(null,country, city).query(sql, function(err, res) {
                if (err || res == null) callbackFn("dbError");
                else {
                    callbackFn(null, res);
                    //redis.domain(country, city).s("notice").setObjex(86400, res);
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}
function getNoticesByTitle(country , city , title ,callbackFn){
    var sql = "SELECT * FROM notice WHERE title=" + mysql.escape(title);
    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}
//游戏中取公告列表 （会过滤不在有效期内的公告)
function getNoticesFromUser(userUid, callbackFn) {
    redis.domain(userUid).s("notice").getObj(function(err, res){
        if(res == null){
            var sql = 'SELECT * FROM notice WHERE 1';
            mysql.game(userUid).query(sql, function(err, res) {
                if (err || res == null || res.length <= 0) callbackFn(null, []);
                else {
                    reset(res, callbackFn);
                    redis.domain(userUid).s("notice").setObjex(86400, res);
                }
            });
        } else {
            reset(res, callbackFn);
        }
    });

    function reset(notices, cb){
        var language = "";
        userVariable.getLanguage(userUid, function (err, res) {
            if (!err && res)
                language = res;
            var mNow = jutil.now();
            var mArr = [];
            for (var i = 0; i < notices.length; i++) {
                if (notices[i]["stime"] > mNow || notices[i]["etime"] < mNow)continue;
                if (notices[i]["channel"] != "all" && !jutil.indexOf(language, notices[i]["channel"]))continue;
                notices[i]["title"] = jutil.toBase64(notices[i]["title"]);
                notices[i]["text"] = jutil.toBase64(notices[i]["text"]);
                mArr.push(notices[i]);
            }
            cb(null, mArr);
        });
    }
}



exports.addNotice = addNotice;
exports.delNotice = delNotice;
exports.getNotices = getNotices;
exports.updateNotice = updateNotice;
exports.getNoticesFromUser = getNoticesFromUser;
exports.getNoticesByTitle = getNoticesByTitle;