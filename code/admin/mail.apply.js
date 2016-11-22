/**
 * mail.send
 * User: lipi  Date: 14-2-4 下午3:52
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil.js");
var mailApply = require("../model/mailApply");
var configManager = require("../config/configManager");
var async = require("async");


function start(postData, response, query, authorize) {

    var action = (postData["action"]==undefined)? "":postData["action"];
    switch (action) {
        case "getlist":

            if (admin.checkAuth(authorize, ["applyMailList"], query["country"]) == false) {
                response.echo("mail.apply", admin.AUTH_ERROR);
                return;
            }

            var checkstatus = (postData["checkstatus"]==undefined)? "":(postData["checkstatus"]-0);

            mailApply.getMailApplyList(query["country"],checkstatus,function(err,res){
                if (err) {
                    response.echo("mail.apply",{"ERROR":"DATA_ERROR","info":err});
                    return;
                }else {
                    var datas = [];
                    for(var i in res){
                        datas.push(res[i]);
                    }

                    response.echo("mail.apply",datas);
                    return;
                }
            });
            break;
        case "apply":

            if (admin.checkAuth(authorize, ["applyMail"], query["country"]) == false) {
                response.echo("mail.apply", admin.AUTH_ERROR);
                return;
            }

            if (jutil.postCheck(postData, "receiverIds", "message", "reward","rewardMoney") == false) {
                response.echo("mail.apply", jutil.errorInfo("postError"));
                return;
            }
            if ((postData["rewardMoney"]-0)<=0) {
                response.echo("mail.apply", jutil.errorInfo("postError"));
                return;
            }
            admin.addOneOperationLog("messageApply",query,postData);

            var mailRewardTranslate = [];
            try {
                //简单验证奖励列表是否有效
                var reward = postData["reward"];
                var rewardArray = JSON.parse(reward);
                if (rewardArray instanceof Array) {
                    for (var i = 0; i < rewardArray.length; i++) {
                        if (rewardArray[i]["id"] == null) {
                            throw new Error("ID error");
                        }

                        mailRewardTranslate[i] = {}
                        mailRewardTranslate[i]["id"] = rewardArray[i]["id"];
                        mailRewardTranslate[i]["name"] = getIdName(query["country"], rewardArray[i]["id"]);
                        mailRewardTranslate[i]["count"] = rewardArray[i]["count"];
                    }
                } else {
                    response.echo("mail.apply", jutil.errorInfo("postError"));
                    return;
                }
            } catch(err) {
                response.echo("mail.apply", jutil.errorInfo("postError"));
                return;
            }
            postData["mailRewardTranslate"] = JSON.stringify(mailRewardTranslate);

            mailApply.addMailApply(query,postData,function(err,res){
                if(err){
                    response.echo("mail.apply", jutil.errorInfo(err));
                    return;
                }else{
                    response.echo("mail.apply", {"ERROR": "0","info":"申请已提交"});
                    return;
                }
            });
            break;

//        case "pase":
//            if (jutil.postCheck(postData, "id") == false) {
//                response.echo("mail.apply", jutil.errorInfo("postError"));
//                return;
//            }
//            mailApply.paseMailApply(query["country"],query["uid"], postData["id"],function(err,res) {
//                if (err) {
//                    response.echo("mail.apply", jutil.errorInfo(err));
//                    return;
//                } else {
//                    response.echo("mail.apply", "已删除")
//                    return
//                }
//            });
//            break;
        case "cancel":

            if (admin.checkAuth(authorize, ["applyMailList"], query["country"]) == false) {
                response.echo("mail.apply", admin.AUTH_ERROR);
                return;
            }

            if (jutil.postCheck(postData, "id") == false) {
                response.echo("mail.apply", jutil.errorInfo("postError"));
                return;
            }
            mailApply.cancelMailApply(query["country"],query["uid"], postData["id"],function(err,res) {
                if (err) {
                    response.echo("mail.apply", jutil.errorInfo(err));
                    return;
                } else {
                    response.echo("mail.apply", "已删除")
                    return
                }
            });
            break;
        default :
            response.echo("mail.apply", {"ERROR":"103","info":"需要正确的action值"});
            return;
    }
}

function getIdName(country, dropId) {
    var configData = configManager.createConfigFromCountry("a");

    var name = dropId;
    switch (dropId.substr(0, 2)) {
        case "10"://hero 魂魄
            var heroConfig = configData.getConfig("hero");
            for(var key in heroConfig){
                if(key == dropId){
                    name = heroConfig[key]["name"];
                    break;
                }
            }
            break;
        case "11"://skill 技能  或者技能碎片
            var skillConfig = configData.getConfig("skill");
            for(var key in skillConfig){
                if(key == dropId){
                    name =  skillConfig[key]["name"];
                    break;
                }
            }
            break;
        case "12"://装备
        case "13"://装备
        case "14"://装备
            var equipConfig = configData.getConfig("equip");
            for(var key in equipConfig){
                if(key == dropId){
                    name =  equipConfig[key]["name"];
                    break;
                }
            }
            break;
        case "15"://item
            var itemConfig = configData.getConfig("item");
            for(var key in itemConfig){
                if(key == dropId){
                    name =  itemConfig[key]["name"];
                    break;
                }
            }
            break;
        case "17"://卡片
            var cardConfig = configData.getConfig("card");
            for(var key in cardConfig){
                if(key == dropId){
                    name =  cardConfig[key]["name"];
                    break;
                }
            }
            break;
        default:
            break;
    }
    return name;
}

exports.start = admin.adminAPIProxy(start);