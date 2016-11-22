/**
 * 传书(系统信息 奖励 留言)数据层
 * User: liyuluan
 * Date: 13-12-3
 * Time: 下午6:24
 */

var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var async = require("async");
var user = require("../model/user");


/**
 * 添加一条信息
 * @param userUid 接收的用户uid
 * @param sender 发送方
 * @param mesage 发送的消息
 * @param reward 奖励的信息  格式为 ：{"id":"xxx", "count":[数量], "isPatch":[是否碎片],"level":[等级]} ，除了id,其它参数，根据需要可选
 * @param rewardId 奖励的ID
 * @param callbackFn
 */
function addMail(userUid,sender,message,reward,rewardId,callbackFn) {
    var sql = "INSERT INTO mail SET ?";
    message = message.replace(new RegExp("[\r\n]","g"));
    var mailData = {"userUid":userUid,"sender":sender,"message":message,"reward":reward,"rewardId":rewardId,"sendTime":jutil.now()};
    mysql.game(userUid).query(sql,mailData,function(err,res) {
        if (err) callbackFn(err, null);
        else {
            if (skipRedisModule(userUid)) {
                callbackFn();
            } else {
                mailData["id"] = res["insertId"];
                getMailList(userUid, function (err, res) {
                    redis.user(userUid).h("mail").setJSON(mailData["id"], mailData, callbackFn);
                });
            }
        }
    });
}

function skipRedisModule(userUid) {
    var list = ["f", "d", "c", "i", "e", "g", "h"];
    var args = bitUtil.parseUserUid(userUid);
    if (list.indexOf(args[0]) >= 0) {
        return true;
    }
    return false;
}

/**
 * 判断一个奖励是否已发送
 * @param userUid
 * @param rewardId
 * @param callbackFn
 */
function rewardIsSend(userUid,rewardId,callbackFn) {
    getMailList(userUid,function(err,res){
        for(var i in res){
            if(res[i]["rewardId"] == rewardId){
                callbackFn(null, 1);
                return ;
            }
        }
        callbackFn(null, 0);
    })
}

/**
 * 取一个玩家的mail 列表
 * @param userUid
 * @param callbackFn
 */
function getMailList(userUid,callbackFn) {
    var getMonthage = function(mailList){
        var newlist = [];
        for(var i in mailList){
            if(mailList[i]["sendTime"] - jutil.now() > 30 * 86400){
                continue;
            }
            newlist.push(mailList[i]);
        }
        return newlist;
    }
    redis.user(userUid).h("mail").getAllJSON(function(err, res){
        if(err){
            callbackFn(err);
        } else if (res == null || skipRedisModule(userUid)) {
            var sql = "SELECT * FROM mail WHERE userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function(err,res) {
                if (err) callbackFn(err, null);
                else {
                    var mailList = {};
                    for(var i in res){
                        mailList[res[i]["id"]] = res[i]
                    }
                    if (skipRedisModule(userUid)) {
                        callbackFn(null, getMonthage(mailList));
                    } else {
                        redis.user(userUid).h("mail").setAllJSONex(259200, mailList, function (err, res) {
                            callbackFn(null, getMonthage(mailList));
                        });
                    }
                }
            });
        } else {
            callbackFn(null, getMonthage(res));
        }

    });
}
/**邮件删除功能
 * 1.一键删除
 * 2.删除一个玩家邮件--za
 * @param userUid
 * @param mailId
 * @param callbackFn
 */
function delMail(userUid,mailId,callbackFn) {
    getMailList(userUid, function(err, res){
        async.eachSeries(res, function(mail, cb){
            var isdel = false;
            if (skipRedisModule(userUid)) {
                isdel = false;
            } else if (mailId == 0 && (mail["status"] == 2 || (mail["status"] == 1 && mail["rewardId"] == 0))) {
                isdel = true;
            } else if (mail["id"] == mailId) {
                isdel = true;
            }
            if (isdel) {
                redis.user(userUid).h("mail").hdel(mail["id"], cb);
            } else {
                cb(null);
            }
        }, function(err, res){
            callbackFn(null, 1);
            var whereSql = "";
            if(mailId == 0)
                whereSql += "( `status`=2 OR (`status`=1 AND `rewardId`=0) ) AND `sender` = -1";//一键删除
            else
                whereSql += "id="+mysql.escape(mailId);//删除单条邮件
            var sql = "DELETE FROM mail WHERE " + whereSql + " AND userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {});
        });
    });
}

/**
 * 取出一封mail
 * @param userUid
 * @param mailId
 * @param callbackFn
 */
function getMail(userUid,mailId,callbackFn) {
    redis.user(userUid).h("mail").getJSON(mailId,function(err, res){
        if(err){
            callbackFn(err);
        } else if(res == null || skipRedisModule(userUid)){
            var sql = "SELECT * FROM mail WHERE id=" + mysql.escape(mailId) + " AND userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function(err, res) {
                if (err) callbackFn(err, null);
                else {
                    if (res == null || res.length == 0) callbackFn(null, null);
                    else {
                        if (skipRedisModule(userUid)) {
                            callbackFn(null, res[0]);
                        } else {
                            redis.user(userUid).h("mail").setJSON(mailId, res[0], function (err, res) {
                                callbackFn(null, res[0]);
                            });
                        }
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });

}

/**
 * 把一个玩家的mail标记为已读
 * @param userUid
 * @param callbackFn
 */
function markingHaveRead(userUid,callbackFn) {
    getMailList(userUid, function(err, res){
        var mailList = {};
        var isset = false;
        for(var i in res){
            if(res[i]["status"] == 0 || res[i]["status"] == undefined){
                res[i]["status"] = 1;
                res[i]["receiveTime"] = jutil.now();
                isset = true;
            }
            mailList[res[i]["id"]] = res[i];
        }
        if(isset){
            var sql = "UPDATE mail SET status=1,receiveTime=" + jutil.now() + " WHERE status=0 AND userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (skipRedisModule(userUid)) {
                    callbackFn(null, 1);
                } else {
                    redis.user(userUid).h("mail").setAllJSON(mailList, function (err, res) {
                        callbackFn(null, 1);
                    });
                }
            });
        } else {
            callbackFn(null,1);
        }
    });
}

/**
 * 把一个玩家的mail标记为已领取
 * @param userUid 用户ID
 * @param mailId 邮件ID
 * @param callbackFn
 */
function markingReceive(userUid,mailId,callbackFn) {
    var sql = "UPDATE mail SET status=2,receiveTime=" + jutil.now() + " WHERE id=" + mysql.escape(mailId);
    mysql.game(userUid).query(sql, function (err, res) {
        if (skipRedisModule(userUid)) {
            callbackFn(null, 1);
        } else {
            redis.user(userUid).h("mail").getJSON(mailId, function (err, res) {
                if (err || res == null) {
                    callbackFn(null, 1);
                } else {
                    res["status"] = 2;
                    res["receiveTime"] = jutil.now();
                    redis.user(userUid).h("mail").setJSON(mailId, res, function (err, res) {
                        callbackFn(null, 1);
                    });
                }
            });
        }
    });
}

function updateMail(userUid,mailId,data,callbackFn) {
    var sql = "UPDATE mail SET ? WHERE id=" + mysql.escape(mailId);
    mysql.game(userUid).query(sql, data, function (err, res) {
        if (skipRedisModule(userUid)) {
            callbackFn(null, 1);
        } else {
            redis.user(userUid).h("mail").setJSON(mailId, data, function (err, res) {
                callbackFn(null, 1);
            });
        }
    });
}

/**
 * 取未读的数量
 * @param userUid
 * @param callbackFn
 */
function unread(userUid,callbackFn) {
    getMailList(userUid, function(err, res){
        if(err){
            callbackFn(err);
        } else if(res == null){
            callbackFn(null, 0);
        } else {
            var count = 0;
            for(var i in res){
                if((res[i]["status"] == 1 && res[i]["rewardId"] != 0) || res[i]["status"] == 0)
                    count++;
            }
            callbackFn(0,count);
        }
    });
}

/**
 * 发送上线补偿邮件
 * @param userUid
 */
function compensateMail(userUid) {
    getCMail(userUid, function(err, res) {
        if (err) {
            console.error(userUid, err.stack);
        } else {
            if (res == null || res.length == 0) {
            } else {
                async.forEach(res, function(item, forCb) {
                    //取玩家奖励的领取状态
                    userCompensateReceive(userUid, item["id"], function(err, res) {
                        if (res != 1) {//如果状态为未领取过
                            async.series([function (innerCb) {
                                user.getUser(userUid, function (err, res) {
                                    if (err || res ==null) {
                                        innerCb("noThisUser");
                                    } else {
                                        if (item["reg_sTime"] < res["createTime"] && item["reg_eTime"] > res["createTime"]) {
                                            innerCb();
                                        } else {
                                            innerCb("not match");
                                        }
                                    }
                                });
                            }, function (innerCb) {
                                addMail(userUid, -1, item["text"], item["reward"], 140303, function (err, res) {
                                    //标记奖励已领取
                                    flagCompensateReceive(userUid, item["id"], function (err, res) {
                                        innerCb(null);
                                    });
                                });
                            }], function (err, res) {
                                forCb();
                            });
                        } else {
                            forCb(null);
                        }
                    });
                }, function(err) {
                    //全部发完
                });
            }
        }
    });
}


//取当前的补偿数据
function getCMail(userUid, callbackFn) {
    user.getUser(userUid, function (err, res) {
        if (err || res == null) {//返回空数组,与返回的cacheList空数组对应，防止报错
            callbackFn(null, []);
        } else {
            var userChannel = res["platformId"]; //用户所在渠道
            var sql = "SELECT * FROM compensate WHERE eTime>" + jutil.now() + " AND sTime<" + jutil.now();
            mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
                if (err) callbackFn(err);
                else {
                    var cList = null;
                    if (res == null) cList = [];
                    else {
                        cList = res;
                    }
                    var userCity = bitUtil.parseUserUid(userUid)[1]; //用户所在分区
                    var cacheList = [];
                    for (var i = 0; i < cList.length; i++) {
                        var mCityList = cList[i]["city"];
                        var mChannelList = cList[i]["channel"];
                        //判断一个city是否在一个cityList字符串里
                        if (jutil.indexOf(mCityList, userCity) && jutil.indexOf(mChannelList, userChannel)) {
                            cacheList.push(cList[i]);
                        }
                    }
                    callbackFn(null, cacheList);
                }
            });
        }
    });
}

//取玩家奖励的领取状态
function userCompensateReceive(userUid, compensateId, callbackFn) {
    var sql = "SELECT flag FROM compensateReceive WHERE userUid=" + mysql.escape(userUid) + " AND compensateId=" + mysql.escape(compensateId);
    mysql.game(userUid).query(sql, function(err, res) {
        if (err) {
            console.error(sql, err.stack);
            callbackFn(null, 1);
        } else if (res == null || res.length == 0) {
            callbackFn(null, null);
        } else {
            callbackFn(null, res[0]["flag"]);
        }
    });
}

//标记奖励已领取
function flagCompensateReceive(userUid, compensateId, callbackFn) {
    var sql =  "INSERT INTO compensateReceive SET ?";
    var mData = {"userUid":userUid, "compensateId":compensateId, "flag":1};
    mysql.game(userUid).query(sql, mData, function(err, res) {
        if (err) {
            console.error("mail.js", userUid, compensateId, err.stack);
        }
        callbackFn(null, null);
    });
//    redis.domain(userUid).s("abc").setnx();
}





function getRewardId(typeValue) {
    var mDate = new Date();
    var YY = mDate.getFullYear() - 2000;
    var MM = mDate.getMonth() + 1;
    var DD = mDate.getDate();
    return YY * 1000000 + MM * 10000 + DD * 100 + typeValue;
}



//取商店用户列表
function getOneMonthMailList(county, callbackFn) {
    var sql = "SELECT * FROM mail WHERE sendTime > " + (jutil.now() - 30 * 24 * 60 * 60);
    mysql.game(null,county,1).query(sql, function(err, res) {
        if (err) {
            console.log(err);
            callbackFn(err, null);
        }
        else {
            var list = res || [];
            var listStr = "[]";
            try {
                listStr = JSON.stringify(list);
            } catch(error) {
                console.error(error.stack);
            }
            callbackFn(null, listStr);
        }//if
    });//mysql
}

function delAllMail(userUid, callbackFn){
    var sql = "DELETE FROM mail WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql, function (err, res) {
        if (skipRedisModule(userUid)) {
            callbackFn();
        } else {
            redis.user(userUid).h("mail").del(callbackFn);
        }
    });
}

exports.addMail = addMail;
exports.rewardIsSend = rewardIsSend;
exports.getMailList = getMailList;
exports.getMail = getMail;
exports.markingHaveRead = markingHaveRead;
exports.markingReceive = markingReceive;
exports.unread = unread;
exports.getOneMonthMailList = getOneMonthMailList;
exports.getRewardId = getRewardId;
exports.delMail = delMail;
exports.compensateMail = compensateMail;
exports.updateMail = updateMail;
exports.delAllMail = delAllMail;

exports.WORLD_BOSS = 11; //铜人的排名奖励
exports.WORLD_BOSS_KILLER = 12;//铜人的击杀者
