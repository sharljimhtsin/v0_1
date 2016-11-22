/**
 * 发放奖励申请
 * User: peter.wang
 * Date: 14-10-31
 * Time: 下午12:30
 */

var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var bitUtil = require("../alien/db/bitUtil");
var admin  = require("../model/admin")
var user  = require("../model/user")
var platform = require("../html/platform");
var async = require("async");

/**
 * 添加发放奖励申请
 */
function addMailApply(query,postData,callbackFn) {
    var country = query["country"];
    var uid = query["uid"];

    async.series([
//        function (cb) {
//            var sql = "SELECT count(*) as c FROM `mailapply` WHERE from_unixtime(`applyTime`,'%Y-%m-%d')=from_unixtime(unix_timestamp(now()),'%Y-%m-%d') "+
//                        "and mailMessage='"+postData["message"]+"' and receiverIds='"+postData["receiverIds"]+"'";
//            mysql.loginDB(country).query(sql, function (err, res) {
//                if (err) cb(err, null);
//                else {
//                    if(res[0]["c"]>0){
//                        cb("data exist", null);
//                    }else {
//                        cb(null);
//                    }
//                }
//            });
//        },
        function (cb) {// 验证用户是否存在
            var receiverIds = postData["receiverIds"];
            receiverIds = receiverIds.replace(/，/g, ",");
            var idArray = receiverIds.split(",");

            async.forEachSeries(idArray, function(userUid, callback) {
                try {
                    user.getUser(userUid, function (err, res) {
                        if (err) callback(err, null);
                        else if(res==null) callback("nouser:"+userUid, null);
                        else callback(null, null);
                    });
                }catch (e)
                {
                    callback("nouser:"+userUid, null);
                }
            }, function(err) {
                cb(err);
            });
        },
        function (cb) {
            admin.getUserInfo(country, uid, function (err, res) {
                if (err) cb(err);
                else {
                    var sql = "INSERT INTO mailapply SET ?";

                    var receiverIds = postData["receiverIds"];
                    var message = postData["message"];
                    var reward = postData["reward"];
                    var rewardMoney = postData["rewardMoney"];
                    var mailRewardTranslate = postData["mailRewardTranslate"];
                    var mailPostScript = postData["mailPostScript"];

                    message = message.replace(new RegExp("[\r\n]", "g"));
                    mailPostScript = mailPostScript.replace(new RegExp("[\r\n]", "g"));
                    receiverIds = receiverIds.replace(/，/g, ",");

                    var applyUser = res["name"];
                    var applyPlat = getPlatName(country);
                    var applyServer = 0;
                    if (receiverIds.split(",").length == 1) {
                        var mCode = bitUtil.parseUserUid(receiverIds);
                        applyServer = mCode[1];
                    }

                    var mailApplyData = {"applyUser": applyUser, "applyTime": jutil.now(), "applyPlat": applyPlat, "applyServer": applyServer, "receiverIds": receiverIds, "mailMessage": message, "mailPostScript":mailPostScript, "mailReward": reward, "rewardMoney": rewardMoney, "mailRewardTranslate": mailRewardTranslate};
                    mysql.loginDB(country).query(sql, mailApplyData, function (err, res) {
                        if (err) cb(err, null);
                        else {
                            cb(null, 1);
                        }
                    });
                }
            });
        }],
        function (err, res) {
            callbackFn(err, res);
        });
}

/**
 * 通过发放奖励申请
 */
function paseMailApply(country,uid, id,callbackFn) {

    admin.getUserInfo(country, uid, function (err, res) {
        if (err) callbackFn(err);
        else {
            var sql = "UPDATE mailapply SET ? WHERE id="+id;
            var mailApplyData = {"checkStatus":"1","checkUser": res["name"],"checkTime":jutil.now()};

            mysql.loginDB(country).query(sql, mailApplyData, function(err,res) {
                if (err) callbackFn(err, null);
                else {
                    callbackFn(null,null);
                }
            });
        }
    });


}

/**
 * 取消发放奖励申请
 */
function cancelMailApply(country,uid, id,callbackFn) {

    admin.getUserInfo(country, uid, function (err, res) {
        if (err) callbackFn(err);
        else {
            var sql = "UPDATE mailapply SET ? WHERE id="+id;
            var mailApplyData = {"checkStatus":"2","checkUser": res["name"],"checkTime":jutil.now()};

            mysql.loginDB(country).query(sql, mailApplyData, function(err,res) {
                if (err) callbackFn(err, null);
                else {
                    callbackFn(null,null);
                }
            });
        }
    });


}

/**
 * 获取申请列表
 * @param userUid
 * @param callbackFn
 */
function getMailApplyList(country,checkstatus,callbackFn) {
    var queryday = 45;
    var sql = "";
    if(checkstatus===""){
        sql = "SELECT * FROM mailapply WHERE applyTime>=" + (jutil.now() - 60*60*24*queryday) + " ORDER BY id desc";
    }else if((checkstatus-0)==0){
        sql = "SELECT * FROM mailapply WHERE checkStatus=0" + " ORDER BY id desc";
    }else {
        sql = "SELECT * FROM mailapply WHERE applyTime>=" + (jutil.now() - 60 * 60 * 24 * queryday) + " AND checkStatus=" + mysql.escape(checkstatus) + " ORDER BY checkTime desc";
    }

    mysql.loginDB(country).query(sql, function(err,res) {
        if (err) callbackFn(err, null);
        else {
            for (var i = 0 ; i < res.length; i++) {
                if (res[i]["applyTime"] != null && res[i]["applyTime"]!=0) {
                    var d = new Date(parseInt(res[i]["applyTime"]) * 1000);
                    res[i]["applyTime"] = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+ d.getHours()+':'+ d.getMinutes();//+':'+ d.getSeconds();
                }else{
                    res[i]["applyTime"] = '';
                }

                if (res[i]["checkTime"] != null && res[i]["checkTime"]!=0) {
                    var d = new Date(parseInt(res[i]["checkTime"]) * 1000);
                    res[i]["checkTime"] = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+ d.getHours()+':'+ d.getMinutes();//+':'+ d.getSeconds();
                }else{
                    res[i]["checkTime"] = '';
                }

                if (res[i]["checkStatus"] == 0) {
                    res[i]["checkStatus"] = "申请中";
                }else if(res[i]["checkStatus"] == 1){
                    res[i]["checkStatus"] = "已发放";
                }else if(res[i]["checkStatus"] == 2){
                    res[i]["checkStatus"] = "已取消";
                }
            }
            callbackFn(null,res);
        }
    });
}

/**
 * 获取申请列表
 * @param userUid
 * @param callbackFn
 */
function getMailApplyInfo(country,id,callbackFn) {
    var sql = "SELECT * FROM mailapply WHERE id="+id;
    mysql.loginDB(country).query(sql, function(err,res) {
        if (err) callbackFn(err, null);
        else if(res == null) callbackFn("notExist", null);
        else callbackFn(null,res[0]);
    });
}


function getPlatName(country){
    switch (country){
        case "a":
            return "test2";
        case "b":
            return "uc";
        case "c":
            return "国内IOS越狱";
        case "d":
            return "国内IOS";
        case "f":
            return "国内安卓";
        case "e":
            return "kingnet";
        case "g":
            return "kingnetios";
        case "h":
            return "kingnetenglish";
        case "i":
            return "kingnetenglishios";
        default :
            return country;
    }
}

exports.addMailApply = addMailApply;
exports.getMailApplyList = getMailApplyList;
exports.getMailApplyInfo = getMailApplyInfo;
exports.paseMailApply = paseMailApply;
exports.cancelMailApply = cancelMailApply;