/**
 * 武将（伙伴）培养
 * User: liyuluan
 * Date: 13-10-18
 * Time: 下午2:11
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var hero = require("../model/hero");
var item = require("../model/item");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var vitality = require("../model/vitality");
var achievement = require("../model/achievement");

/**
 * "heroUid" : 要培养的武将Uid
 * "trainType" :培养方式 1.普通培养  2.10次普通增养  3.元宝培养 4.10次元宝培养 5.100次普通增养 6.100次元宝培养
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"heroUid","trainType") == false) {
        response.echo("hero.train",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var heroUid = postData["heroUid"];
    var trainType = postData["trainType"];
    trainType = trainType == "5" ? 4 : trainType; //类型容错
    var configData = configManager.createConfig(userUid);

    var trainItemId = "150901";//培养丹的ID
    var trainTypeNumber1 = 5;
    var trainTypeNumber10 = 50;
    var trainTypeNumber100 = 500;


    var heroData = null;//要培养的武将的数据库数据
    var userData = null;//用户数据
    var trainItemNumber = 0;//培养丹的数量
    var heroConfig = configData.getConfig("hero");
    var fosterWeightConfig = configData.getConfig("fosterWeight"); //培养的各属性权重配置

    var needIngot = 0; //培养需要的元宝数量
    var needTrainItemNumber = 0; //培养需要的培养丹

    var trainResult = null;

    async.series([
        function(cb) { //取要培养的武将的详细信息
            hero.getHero(userUid,function(err,res) {
                if (err || res == null) cb("dbError",null);
                else{
                    heroData = res[heroUid];
                    if (heroData == null) cb("heroNotExist",null);
                    else {
                        cb(null,null);
                    }
                }
            });
        },
        function(cb) { //取培养丹数量
            item.getItem(userUid,trainItemId,function(err,res) {
                if (err) cb("dbError", null);
                else {
                    trainItemNumber = (res == null)?0:(res["number"] - 0);
                    needTrainItemNumber = trainTypeNumber1;
                    if ( trainType == 2 || trainType == 4) { //10次培养
                        needTrainItemNumber = trainTypeNumber10;
                    }
                    if (trainType == 5 || trainType == 6) { //100次培养
                        needTrainItemNumber = trainTypeNumber100;
                    }
                    if (trainItemNumber < needTrainItemNumber) {
                        cb("noTrainItem", null);
                    } else {
                        cb(null, null);
                    }
                }
            });
        },
        function(cb) { //如果是元宝培养，取元宝数量
            if (trainType == 3 || trainType == 4 || trainType == 6) {
                user.getUser(userUid,function(err,res) {
                    if (err || res == null) cb("dbError",null);
                    else {
                        userData = res;
                        var ingot = userData["ingot"] - 0;
                        if (trainType == 3) needIngot = 1;
                        else if(trainType == 4) needIngot = 10;
                        else if(trainType == 6) needIngot = 150;

                        if (ingot < needIngot) {
                            cb("noRMB",null);
                        } else {
                            cb(null,null);
                        }
                    }
                });
            } else {
                cb(null,null);
            }
        },
        function(cb) { //随机增加和减少值，并写入
            var cHeroId = heroData["heroId"];
            var cHeroConfig = heroConfig[cHeroId];
            var cLevel = heroData["level"];
            var attr = ["hp","attack","defence","spirit"];
            var attrAdd = ["hpAdd","attackAdd","defenceAdd","spiritAdd"];
            var heroAttrValue = [];
            for (var i = 0; i < 4; i++) {
                var attrName = attr[i];
                var attrAddName = attrAdd[i];
                heroAttrValue[i] = (cHeroConfig[attrName] - 0) + (cHeroConfig[attrAddName] - 0) * (cLevel - 1) + (heroData[attrName] - 0);
            }
            var deductWeight = fosterWeightConfig["deductWeight"];//减属性权重值
            var deductTypeIndex = randomDeductType(deductWeight,heroAttrValue,attr);
            var randomDeductValue = Math.floor(Math.random() * 3) + 1;//随机出要减的数值
            if (trainType == 2 || trainType == 4) {
                randomDeductValue = randomDeductValue * 10; //如果是10次培养，X10
            }
            if (trainType == 5 || trainType == 6) {
                randomDeductValue = randomDeductValue * 100; //如果是100次培养，X100
            }
            randomDeductValue = Math.min(randomDeductValue,heroAttrValue[deductTypeIndex]);//如果要减去值小于hero最小值 则选用最小值

            var addWeight = fosterWeightConfig["addWeight"];//减属性权重值
            var addTypeIndex = randomAddType(addWeight,attr,deductTypeIndex);
            var randomAddValue;
            if (trainType == 1 || trainType == 2 || trainType == 5) {
                randomAddValue = Math.floor(Math.random() * 3) + 1;//随机出要减的数值
            } else {
                randomAddValue = Math.floor(Math.random() * 5) + 2;//随机出要减的数值
            }
            if (trainType == 2 || trainType == 4) {
                randomAddValue = randomAddValue * 10; //如果是10次培养，X10
            }
            if (trainType == 5 || trainType == 6) {
                randomAddValue = randomAddValue * 100; //如果是100次培养，X100
            }
            var potentialValue = (cHeroConfig["potential"]  - 0) + (cHeroConfig["potentialAdd"] - 0) * (cLevel - 1) + (heroData["potential"] - 0);
            randomAddValue = Math.min(potentialValue,randomAddValue);//如果潜力不够则取潜力值

            var updateValue = {};
            for ( var i = 0; i < 4; i++) {
                var attrName = attr[i];
                if (deductTypeIndex == i) {
                    updateValue[attrName + "Add"] = parseInt(-randomDeductValue);
                } else if (addTypeIndex == i) {
                    updateValue[attrName + "Add"] = parseInt(randomAddValue + randomDeductValue);
                } else {
                    updateValue[attrName + "Add"] = 0;
                }
            }
            updateValue["train"] = heroData["train"] - 0 + needTrainItemNumber; //记录这个英雄消耗的培养丹
            trainResult = updateValue;
            hero.updateHero(userUid,heroUid,updateValue,function(err,res) {
                if (err) {
                    cb("dbError",null);
                    console.error("hero.train", err.stack);
                } else cb(null,null);
            });
        },
        function(cb) { //更新培养丹数量
            item.updateItem(userUid,trainItemId,-needTrainItemNumber,function(err,res) {
                cb(null,null);
            });
        },
        function(cb) { //如果使用了元宝则扣元宝
            if (needIngot == 0) cb(null,null);
            else {
                var updateUserData = {};
                updateUserData["ingot"] = userData["ingot"] - needIngot;
                user.updateUser(userUid,updateUserData,function(err,res){
                    cb(null,null);
                })
            }
        },
        function(cb) { // 成就数据更新
            achievement.foster(userUid, needTrainItemNumber, function(){
                cb(null);
            });
        }
    ],function(err,res) {
        if (err) {
            response.echo("hero.train",jutil.errorInfo(err));
        } else {
            var echoData = {};
            echoData["trainResult"] = trainResult;
            if (userData != null && needIngot != 0) {
                echoData["user"] = {};
                echoData["user"]["ingot"] = userData["ingot"] - needIngot;
            }
            echoData["item"] = {};
            echoData["item"][trainItemId] = trainItemNumber - needTrainItemNumber;
            var userIP = '127.0.0.1';
            var completeCnt;
            if (trainType == 1 || trainType == 3) {
                completeCnt = 1;
            } else if (trainType == 2 || trainType == 4) {
                completeCnt = 10;
            } else {
                completeCnt = 100;
            }

            // 培养液消耗
            timeLimitActivity.brothUse(userUid, needTrainItemNumber, function(){
                response.echo("hero.train",echoData);
            });

            vitality.vitality(userUid, "foster", {"completeCnt":completeCnt}, function(){
                if (trainType == 3) {
                    mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_TRAIN_1, needIngot);
                } else if (trainType == 4) {
                    mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_TRAIN_10, needIngot);
                } else if (trainType == 6) {
                    mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_TRAIN_100, needIngot);
                }
            });
        }
    });
}

//随机一个要减属性的类别
function randomDeductType(deductWeight,heroAttrValue,attr) {
    var deductWeightArray = [];//权值列表
    var deductWeightValue = 0;
    for (var i = 0; i < 4; i++) {
        var attrName = attr[i];
        var attrValue = heroAttrValue[i];
        if (attrValue > 0) { //如果玩家的当前值小于0，则忽略
            deductWeightValue += (deductWeight[attrName] - 0);
        }
        deductWeightArray.push(deductWeightValue);
    }
    var deductTypeIndex = 0;
    var deductRandom = Math.random() * deductWeightValue;
    for (var i = 0; i < deductWeightArray.length; i++) {
        if (deductRandom < deductWeightArray[i]) {
            deductTypeIndex = i;
            break;
        }
    }
    return deductTypeIndex;
}

//随机一个要回属性的类别，excludeIndex为排除的索引，将减属性的索引排除
function randomAddType(deductWeight,attr,excludeIndex) {
    var deductWeightArray = [];//权值列表
    var deductWeightValue = 0;
    for (var i = 0; i < 4; i++) {
        var attrName = attr[i];
        if (excludeIndex == i) {
            deductWeightValue += 0;
        } else {
            deductWeightValue += (deductWeight[attrName] - 0);
        }
        deductWeightArray.push(deductWeightValue);
    }
    var addTypeIndex = 0;
    var deductRandom = Math.random() * deductWeightValue;
    for (var i = 0; i < deductWeightArray.length; i++) {
        if (deductRandom < deductWeightArray[i]) {
            addTypeIndex = i;
            break;
        }
    }
    return addTypeIndex;
}

exports.start = start;