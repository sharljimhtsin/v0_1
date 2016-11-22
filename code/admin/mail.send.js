/**
 * mail.send
 * User: lipi  Date: 14-2-4 下午3:52
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil.js");
var mail = require("../model/mail");
var mailApply = require("../model/mailApply");
var async = require("async");


function start(postData, response, query, authorize) {

    if (postData["type"] == "gift") {

        if (postData["id"] == undefined && admin.checkAuth(authorize, ["sendGift"], query["country"]) == false) {
            response.echo("mail.send", admin.AUTH_ERROR);
            return;
        } else if(admin.checkAuth(authorize, ["applyMailList"], query["country"]) == false) {
            response.echo("mail.send", admin.AUTH_ERROR);
            return;
        }
    } else if(postData["type"] == "mail") {
        if (admin.checkAuth(authorize, ["sendMail"], query["country"]) == false) {
            response.echo("mail.send", admin.AUTH_ERROR);
            return;
        }
    } else {
        response.echo("mail.send", {"ERROR":"POST_ERROR","info":"需要正确的type值"});
        return;
    }


    if (jutil.postCheck(postData, "receiverId", "message", "reward") == false) {
        response.echo("mail.sendGift", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("message",query,postData);
    var mType = postData["type"];

    var id = (postData["id"]==undefined)? 0:postData["id"];
    var receiverIds = postData["receiverId"];
    var message = postData["message"];
    var reward = postData["reward"];
    var rewardId = 0;

    if (mType == "mail") {
        reward = "";
    } else {
        try {
            //简单验证奖励列表是否有效
            rewardId = getRewardId();
            var rewardArray = JSON.parse(reward);
            if (rewardArray instanceof Array) {
                for (var i = 0; i < rewardArray.length; i++) {
                    if (rewardArray[i]["id"] == null) {
                        throw new Error("ID error");
                    }
                }
            } else {
                response.echo("mail.send", jutil.errorInfo("postError"));
                return;
            }
        } catch(err) {
            response.echo("mail.send", jutil.errorInfo("postError"));
            return;
        }
    }

    receiverIds = receiverIds.replace(/，/g, ",");
    var idArray = receiverIds.split(",");

    var resList = {};

    async.series([
        function(cb){ // 验证是否已发放过
            if(id>0){
                mailApply.getMailApplyInfo(query["country"], id, function(err,res){
                    if(err) cb(err,null);
                    else {
                        if((res["checkStatus"]-0)!=0){
                            cb("postError",null);
                        }else{
                            cb(null);
                        }
                    }
                })
            }else{
                cb(null);
            }
        },
        function(cb){
            async.forEach(idArray, function(userUid, forCb) {
                mail.addMail(userUid, -1, message, reward, rewardId, function(err, res) {
                    if (err) resList[userUid] = 0;
                    else resList[userUid] = 1;
                    forCb(null);
                });
            }, function(err) {
                cb(null)
            });
        },
        function(cb){
            if(id>0){
                mailApply.paseMailApply(query["country"],query["uid"], id, function(err,res){
                    cb(err,null);
                })
            }else{
                cb(null);
            }
        }
    ],function(err,res){
        response.echo("mail.send", resList);
    });


}


function getRewardId() {
    var date = new Date();
    var value = date.getFullYear() % 100 * 1000000 + (date.getMonth()+1) *10000 + date.getDate() * 100 + Math.floor(Math.random() * 100);
    return value;
}


exports.start = admin.adminAPIProxy(start);