/**
 * 领取奖励
 * User: liyuluan
 * Date: 13-12-4
 * Time: 下午6:38
 */

var jutil = require("../utils/jutil");
var mail = require("../model/mail");
var modelUtil = require("../model/modelUtil");
var async = require("async");
var mongoStats = require("../model/mongoStats");

/**
 * 参数 :
 *      id  奖励项id
 *
 * 返回 :
 *      rewardList  奖项列表数组 , 返回每一项当前数据
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "id") == false) {
        response.echo("mail.receive",jutil.errorInfo("postError"));
        return;
    }

//    mail.addMail(5,-1,"更新奖励",'[{"id":"121002"},{"id":"151001","count":10]',13120601,function(err,res) {
//        response.echo("mail.receive",{"err":err, "res":res});
//    });
//    return;

    var rewardList = []; //实际奖励信息，带uid的
    var mailId = postData["id"];
    var userUid = query["userUid"];

    mail.getMail(userUid,mailId,function(err,res) {
        if (err) response.echo("mail.receive",jutil.errorInfo("dbError"));
        else if (res == null) response.echo("mail.receive", jutil.errorInfo("noMail"));
        else {
            try{
                var resData = res;
                var rewardData = JSON.parse(resData["reward"]);
                if (rewardData instanceof Array == false) {
                    response.echo("mail.receive",jutil.errorInfo("noMail"));
                } else if (resData["status"] == 2) {
                    response.echo("mail.receive",jutil.errorInfo("received"));
                } else {
                    async.series([function (cb) {
                        mail.markingReceive(userUid, mailId, function (err, res) {
                            cb(err);
                        });
                    }, function (cb) {
                        var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                        async.eachSeries(rewardData, function (item, forCb) {
                            mongoStats.dropStats(item["id"], userUid, userIP, null, mongoStats.MAIL, item["count"], item["level"], item["isPatch"]);
                            modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                                if (err) {
                                    forCb(err);
                                    console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                                } else {
                                    if (res instanceof Array) {
                                        for (var i in res) {
                                            rewardList.push(res[i]);
                                        }
                                    } else {
                                        rewardList.push(res);
                                    }
                                    forCb(null);
                                }
                            });
                        }, function (err, res) {
                            cb(err);
                        });
                    }], function (err, res) {
                        if (err) response.echo("mail.receive", jutil.errorInfo("dbError"));
                        else {
                            response.echo("mail.receive", {"rewardList": rewardList});
                        }
                    });
                }
            } catch(error) {
                response.echo("mail.receive", jutil.errorInfo("noMail"));
            }
        }
    });

}

exports.start = start;