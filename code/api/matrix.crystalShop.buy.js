/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.crystalShop 灵石商店模块 需求：仅限灵石结晶购买
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var currentConfig;
    var returnData = {};
    var list = {};
    var crystalShop = [];
    var rewardData = [];
    var needCt = 0;
    var needItemType = "";
        async.series([function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else if(res["arg"] == undefined){
                    cb("dbError");
                }else{
                    list = res["arg"];
                    needItemType = list["crystalShop"][index]["costType"];
                    needCt = list["crystalShop"][index]["cost"];
                    rewardData.push({"id":list["crystalShop"][index]["id"],"count":list["crystalShop"][index]["count"]});
                    cb(null);
                }
            });
        },function(cb){//验证消耗物品
            if(needItemType == "ingot"){//验证金币是否足够
                user.getUser(userUid,function(err,res){
                    if(err)cb(err);
                    else if(res["ingot"] - 0 - needCt < 0){
                        cb("ingotNotEnough");
                    } else{
                        user.updateUser(userUid,{"ingot":res["ingot"] - needCt},cb);
                    }
                });
            } else if(needItemType == "gold"){//验证金币是否足够
                user.getUser(userUid,function(err,res){
                    if(err)cb(err);
                    else if(res["gold"] - 0 - needCt < 0){
                        cb("noMoney");
                    } else{
                        user.updateUser(userUid,{"ingot":res["gold"] - needCt},cb);
                    }
                });
            } else{//验证道具是否足够
                item.getItem(userUid,needItemType,function(err,res){
                    if(err)cb(err);
                    else if(res["number"] - 0 - needCt < 0){
                        cb("noItem");
                    } else{
                        item.updateItem(userUid,itemId,-needCt,cb);
                    }
                });
            }
        },function(cb){
            returnData["rewardList"] = [];
            returnData["reward"] = rewardData;
            async.eachSeries(returnData["reward"], function (reward, esCb) {
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                        console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                returnData["rewardList"].push(res[i]);
                            }
                        } else {
                            returnData["rewardList"].push(res);
                        }
                        esCb(null);
                    }
                });
            }, cb);
    }],function(err,res){
        if(err){
            response.echo("matrix.crystalShop.buy", jutil.errorInfo(err));
        } else{
            response.echo("matrix.crystalShop.buy",returnData);
        }
    });
}
exports.start = start;