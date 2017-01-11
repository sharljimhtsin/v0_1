/**
 * 宝石合成--gem.compose
 * User: za
 * Date: 15-03-06
 * Time: 上午12:00
 * 1.遍历仓库，
 *   判断选肿的5个宝石是否同一个类型
 * 2.合成，仓库内删除出5个相同类型的宝石
 *   并增加一个上一等级的宝石
 *   放入孔中
 * @param 1.强化石，2.合成上限，3.成功率，4.vip 5.21级开启功能 6.祝福
 */
var jutil = require("../utils/jutil");
var async = require("async");
var item = require("../model/item");
var configManager = require("../config/configManager");
var user = require("../model/user");
var shop = require("../model/shop");
var userVariable = require("../model/userVariable");
var activityConfig = require("../model/activityConfig");
var mail = require("../model/mail");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId","comNum") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var itemId = postData["itemId"];//选中的宝石ID
    var itNum = 5;//合成所需要的宝石个数
    var comId = "154701";//选中的强化石ID
    var comNum = postData["comNum"]-0;//强化石个数

    var lv = (itemId+"").substr(4,2)-0;//选择的宝石等级（取后两位）纯数字转换成字符串类型
    var newItemId = (itemId+"").substr(0,4)+jutil.pad((lv+1)+"", 2, '0');//选择的宝石等级（取后两位）

    var configData = configManager.createConfig(userUid);//取配置
    var itemConfig = configData.getConfig("item");//取道具中的宝石配置
    var gemConfig = configData.getConfig("gem");//取宝石合成配置
    var lvMin = configData.getConfig("main")["gem_open"];//取宝石配置
    var itemType = itemConfig[itemId]["itemType"];
    if (itemConfig[itemId] == null || gemArr.indexOf(itemType) == -1) {//类型判断
        echo("itemInvalid");
        return;
    }

    var sumProb = gemConfig["upgradeBaseProb"][lv] + comNum * itemConfig[comId]["typeValue"];//合成总概率
    sumProb = sumProb>=gemConfig["upgradeMaxProb"][lv]?gemConfig["upgradeMaxProb"][lv]:sumProb;
    var vip = 0;
    var returnData = {"itemData":{}};//返回的数据
    async.series([function(cb){//取仓库里的宝石个数            154601
        user.getUser(userUid, function(err, res){
            if(err || res == null){
                cb("dbError");
            } else if(res["lv"] < lvMin){
                cb("lvNotEnough");
            } else {
                vip = res["vip"];
                cb(null);
            }
        })
    }, function (cb) {
        //合成规则:同等级同类型才能合成（判断）
        item.getItem(userUid, itemId, function(err,res){
            if(err){
                cb(null);
            } else if(res == null || res["number"]-0 < itNum){
                cb("gemNotEnough");
            } else {
                //returnData["itemData"][itemId] = res;
                cb(null);
            }
        });
    },function(cb){//取合成后强化石个数          154701
        if(comNum > 0){
            item.getItem(userUid, comId, function(err,res){
                if(err){
                    cb(null);
                } else if(res == null || res["number"] - 0 < comNum){
                    cb("comNotEnough");
                } else {
                    //returnData["itemData"][comId] = res;
                    cb(null);
                }
            });
        } else {
            cb(null);
        }
    }, function (cb) {
        if(comNum > 0){
            mongoStats.expendStats(comId, userUid,"127.0.0.1", null, mongoStats.P_GEMCOMPOSE1, comNum);
            item.updateItem(userUid, comId, -comNum, function(err, res){
                returnData["itemData"][comId] = res;
                cb(err, res);
            });
        } else {
            cb(null);
        }
    }, function (cb) {
        mongoStats.expendStats(itemId, userUid,"127.0.0.1", null, mongoStats.P_GEMCOMPOSE1, itNum);
        item.updateItem(userUid, itemId, -itNum, function(err, res){
            returnData["itemData"][itemId] = res;
            cb(err, res);
        });
    }, function (cb) {//取祝福值
        userVariable.getVariable(userUid, "gemWish", function(err,res){
            if(!err && res != null){
                returnData["gemWish"] = res - 0;
            }
            cb(err, res);
        });
    }, function (cb) {//合成
        var r = Math.random();//（生成随机数，与装备数对应的合成比率比较，确认是否能合成成功）
        sumProb += gemConfig["vipAddProbMax"][vip];
        sumProb = returnData["gemWish"] >= gemConfig["wishMax"]?1:sumProb;
        if(r <= sumProb){//合成成功 条件：祝福值清零
            returnData["status"] = 1;
            returnData["gemWish"] = 0;
            stats.events(userUid, "127.0.0.1", null, mongoStats.P_GEMCOMPOSE2);
            mongoStats.dropStats(newItemId, userUid, "127.0.0.1", null, mongoStats.P_GEMCOMPOSE4, 1);
            item.updateItem(userUid,newItemId,1,function(err, res){//生成新的下一等级宝石
                returnData["itemData"][newItemId] = res;
                activityReward(userUid, newItemId);
                cb(err,res);
            });
        }else{//合成失败
            returnData["status"] = 0;
            returnData["gemWish"] += gemConfig["wishAdd"][lv];//祝福值累加
            returnData["gemWish"] = returnData["gemWish"]>gemConfig["wishMax"]?gemConfig["wishMax"]:returnData["gemWish"];//给祝福值设定上限
            stats.events(userUid, "127.0.0.1", null, mongoStats.P_GEMCOMPOSE3);
            cb(null);
        }
    }, function (cb) {//取合成后宝石的个数         154602
        userVariable.setVariable(userUid, "gemWish", returnData["gemWish"], cb);
    }],function(err,res){
        echo(err, returnData);//返回宝石集合,合成概率，祝福值
    });
    function echo(err, res){
        if(err){
            response.echo("gem.compose", jutil.errorInfo(err));
        } else {
            response.echo("gem.compose", res);
        }
    }
}

function activityReward(userUid, itemId){
    activityConfig.getConfig(userUid, "gemCompose", function(err, res){
        if(!err && res != null && res[0]){
            var configData = configManager.createConfig(userUid);
            var mailStr = configData.getConfig("mail")["gemComposeReward"];
            var config = res[2];
            var reward = [];
            for(var i in config){
                if(itemId == config[i]["id"]){
                    mailStr = config[i]["rewardStr"]?config[i]["rewardStr"]:mailStr;
                    for(var j in config[i]["reward"]){
                        reward.push({"id":config[i]["reward"][j]["id"], "count":config[i]["reward"][j]["count"]});
                    }
                }
            }
            if(reward.length > 0){
                var confitData = configManager.createConfig(userUid);
                var itemConfig = confitData.getConfig("item");
                var rewardStr = [];
                for(var j in reward){
                    rewardStr.push(itemConfig[reward[j]["id"]]["name"]+"*"+reward[j]["count"]);
                }
                mail.addMail(userUid, -1, jutil.formatString(mailStr, [itemConfig[itemId]["name"], rewardStr.join(',')]), JSON.stringify(reward), "153701", function(err, res){});
            }
        }
    })
}

var gemArr = [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 63];
exports.start = start;