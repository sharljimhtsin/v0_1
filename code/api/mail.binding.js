/**
 * 邮箱绑定
 * User: za
 * Date: 16-2-1
 * Time: 下午16:44
 */

var jutil = require("../utils/jutil");
var async = require("async");
var mailBinding = require("../model/mailBinding");
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var mail = require("../model/mail");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var language = query["language"];
    var action = postData["action"];
    var returnData = {};
    var verifyList = [];
    var pUserId = "";
    switch(action){
        case "get":
        default:
            async.series([
                function(cb){
                    mailBinding.getUserData(userUid,function(err,res){
                        if(err)cb(err);
                        else {
                            if(res == null){//未绑定
                                returnData = null;
                                cb(null);
                            }else{
                                returnData = res;
                                cb(null);
                            }
                        }
                    });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "binding":
            if (jutil.postCheck(postData, "mailIP","platformId","userPassWord") == false) {
                echo("postError");
                return false;
            }
            var mailIP = postData["mailIP"];
            var userPassWord = postData["userPassWord"];
            var mailStr = "";
            var rewardList = [];
            var T = false;
            async.series([
                function(cb){
                    user.getUser(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                             pUserId = res["pUserId"];
                            cb(null);
                        }
                    });
                },
                function(cb){
                    verifyList = {"mailIP":mailIP,"userPassWord":userPassWord,"userUid":userUid,"pUserId":pUserId};
                    async.series([function(cb){
                        mailBinding.check(userUid,verifyList,verifyList["mailIP"],function(err,res){
                            if(err)cb(err);
                            else {
                                if (res != null && res == 1) {//未绑定
                                    T = true;
                                    cb(null);
                                } else {
                                    cb(null);
                                }
                            }
                        });
                    },function(cb){
                        if(T == false){
                            returnData = null;
                        }else{
                            returnData["verifyList"] = verifyList;
                            var reward = [];
                            var rewardStr = [];
                            var rewardIdList = [];
                            var rewardNameList = [];
                            if(language == "en"){
                                mailStr = "Congratulations on your success";
                                rewardList = [{"id":"ingot","count":500,"name":"ingot"},{"id":"151001","count":5,"name":"Bean"},{"id":"150901","count":50,"name":"Training Potion"},{"id":"152301","count":50,"name":"Power Sphere"}];
                            }else{
                                mailStr = "恭喜您绑定成功";
                                rewardList = [{"id":"ingot","count":500,"name":"伊美加幣"},{"id":"151001","count":5,"name":"仙豆"},{"id":"150901","count":50,"name":"培養液"},{"id":"152301","count":50,"name":"能量球"}];
                            }
                            for(var j in rewardList){
                                reward.push({"id":rewardList[j]["id"], "count":rewardList[j]["count"]});
                                rewardStr.push(rewardList[j]["name"]+"*"+rewardList[j]["count"]);
                                rewardNameList.push(rewardList[j]["name"]);
                                rewardIdList.push(rewardList[j]["id"]);
                            }
                            returnData["reward"] = reward;
                            mail.addMail(userUid, -1, jutil.formatString(mailStr, rewardNameList, rewardStr.join(',')), JSON.stringify(reward), "152301", cb);
                        }
                    }],function(err,res){
                        cb(err,res);
                    });
            }],function(err,res){
                echo(err,returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("mail.binding", jutil.errorInfo(err));
        } else{
            response.echo("mail.binding",res);
        }
    }
}
exports.start = start;