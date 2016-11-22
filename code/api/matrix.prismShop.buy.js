/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.prismShop 阵图商店模块
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
    if (jutil.postCheck(postData,"type","index") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"]-0;
    var type = postData["type"];
    var currentConfig;
    var returnData = {};
    var itemId = "";
    var itemCt = 0;
    var list = {};
    var times = 0;
    var tzhenNeedCt = 0;
    var rewardData = [];
    var prismShop = {};
    async.series([function(cb){//取配置
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    prismShop = currentConfig["prismShop"];
                    itemId = prismShop["costType"];
                    if(prismShop[type][index] != undefined){
                        rewardData = prismShop[type][index]["reward"];
                        cb(null);
                    }else{
                        cb("noItem");
                    }
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    if(res["arg"] == undefined||res["arg"]["prismShop"] == undefined||res["arg"]["prismShop"][type] == undefined||res["arg"]["prismShop"][type][index] == undefined){
                        cb("dbError");
                    }else{
                        list = res["arg"];
                        //验证购买次数
                        times = list["prismShop"][type][index]["limitTimes"]-0;
                        tzhenNeedCt = list["prismShop"][type][index]["cost"]-0;
                        times--;
                        if(times < 0){
                            cb("noEnoughBuyTimes");//今日可购买次数达到上限
                        }else{
                            list["prismShop"][type][index]["limitTimes"] = times-0;
                            cb(null);
                        }
                    }
                }
            });
        },function(cb){//验证道具个数
            item.getItem(userUid,itemId,function(err,res){
                if(err)cb(err);
                else if(res["number"] - tzhenNeedCt <= 0){
                    cb("noItem");
                } else{
                    itemCt = res["number"]-0 -tzhenNeedCt;
                    item.updateItem(userUid,itemId,itemCt,cb);
                }
            });
        },function(cb){
            mat.setUserData(userUid,list,cb);
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
            response.echo("matrix.prismShop.buy", jutil.errorInfo(err));
        } else{
            response.echo("matrix.prismShop.buy",returnData);
        }
    });
}
exports.start = start;