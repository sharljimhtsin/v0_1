/**
 * 龙神的祝福--bahamutWish.compose
 * User: za
 * Date: 15-08-10
 * Time: 晚上 19:22
 * @param  1.喂食道具 2.金币 3.龙珠上的星是装饰（没屌用）4.龙珠等级默认从0级开始
 */
var jutil = require("../utils/jutil");
var async = require("async");
var item = require("../model/item");
var bhmt = require("../model/bahamutWish");
var configManager = require("../config/configManager");
var user = require("../model/user");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var list = {};//功能集合
    var userData = {};//数据集合
    var debrisId;//龙珠碎片id
    var itemId;//道具id
    var eatList = [];//喂食列表
    var debrisList = [];//碎片列表
    var holeList = [];//孔的列表
    var kk = [];
    var eatCount = 0;//喂食道具个数
    var debrisCount = 0;//龙珠碎片个数
    var composeNeedCount = 0;//合成所需的道具个数
    var ballId = "";//龙珠id
    var ballLv = 0;//龙珠的等级
    var ballExp = 0;//龙珠的经验
    var newBallExp = 0;//升级龙珠后的经验
    var eatExp = 0;//使用道具增加的经验数
    var debrisExp = 0;//使用碎片增加的经验数
    var payPoint = 0;//消耗的技能点
    var count = 0;//道具个数
    var lockNum = 0;//锁定个数
    var holeId = 0;//技能孔的id
    var configData = configManager.createConfig(userUid);//取配置
    var itemConfig = configData.getConfig("item");//取龙珠碎片配置
    var dragonBuff = configData.getConfig("dragonBuff");//取龙珠祈福配置//["dragonBuff"]
    var dragonLevelUpPatch = dragonBuff["dragonLevelUpPatch"];
    var lockConfig = dragonBuff["lockCost"];
    var lastLv = Object.keys(dragonLevelUpPatch).length - 1;//取龙珠碎片最后一级对应的数值
    var returnData = {};
    var point = 0;//技能点个数
    var newEatExp = 0;
    var allExp = 0;//一键喂食总的消耗经验
    var skillPointPerLv = dragonBuff["skillPointPerLv"];//1.升级获得的技能点 2.领悟技能消耗的技能点
    var reset = 0;//重置技能消耗金币数
    var ingot = 0;//玩家身上的金币数
    var payLockPoint = 0;//记录锁定之前消耗的技能点
    var eatNeedCount = 0;//喂食需要的个数（改动）

    switch (action) {
        case "get"://取龙珠数据
            //do get
            doGet();
            break;
        case "compose"://合成:消耗龙珠碎片，生成下一等级的龙珠（7颗龙珠全合成完就不能再次合成龙珠）
            /**传入：龙珠id
             * 返回：碎片数量
             * */
            if (jutil.postCheck(postData, "ballId") == false) {
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 1;
            debrisId = debrisArr[ballId];
            async.series([function (cb) {
                bhmt.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["arg"] == null || res["arg"]["ballList"] == undefined) {
                            cb("dbError");
                        } else {
                            userData = res["arg"];
                            ballLv = userData["ballList"][ballId]["lv"] - 0;
                            if (ballLv == -1) {//未激活
                                ballLv = 0;
                                composeNeedCount = dragonBuff["dragonLevelUpPatch"][ballLv];
                                item.getItem(userUid, debrisId, function (err, res) {
                                    if (err) {
                                        cb("dbError");//+"3"
                                    } else if (res == null || res["number"] - composeNeedCount < 0) {
                                        cb("noItem");//道具不存在或数量不足
                                    } else {
                                        switch (ballId) {
                                            case "0":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH1);//一星龙珠激活次数统计
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH9, composeNeedCount);//一星龙珠升级道具消耗
                                                break;
                                            case "1":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH2);//二星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH10, composeNeedCount);//二星龙珠升级道具消耗

                                                break;
                                            case "2":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH3);//三星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH11, composeNeedCount);//三星龙珠升级道具消耗
                                                break;
                                            case "3":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH4);//四星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH12, composeNeedCount);//四星龙珠升级道具消耗
                                                break;
                                            case "4":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH5);//五星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH13, composeNeedCount);//五星龙珠升级道具消耗
                                                break;
                                            case "5":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH6);//六星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH14, composeNeedCount);//六星龙珠升级道具消耗
                                                break;
                                            case "6":
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH7);//七星龙珠激活次数
                                                mongoStats.expendStats(debrisId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH15, composeNeedCount);//七星龙珠升级道具消耗
                                                break;
                                        }
                                        debrisCount = res["number"] - composeNeedCount;
                                        item.updateItem(userUid, debrisId, -composeNeedCount, cb);
                                    }
                                });
                            } else {//已激活
                                composeNeedCount = 0;
                                cb("dbError");//不是-1或0,数据出错
                            }
                        }
                    }
                });
            }, function (cb) {//处理数据
                userData["ballList"][ballId]["lv"] = ballLv;
                userData["debrisList"][ballId]["debrisCount"] = debrisCount - 0;
                returnData["ballLv"] = userData["ballList"][ballId]["lv"];
                returnData["debrisCount"] = userData["debrisList"][ballId]["debrisCount"];
                cb(null);
            }, function (cb) {//更新数据
                bhmt.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "eat"://喂食 (数值固定)
            /**传入：龙珠id +"itemId"
             * 返回：itemId + exp  注意事项：喂食可以消耗1.喂食道具 2.龙珠碎片（没有优先级）
             * */
            if (jutil.postCheck(postData, "ballId", "itemId","count") == false) {
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 1;
            itemId = postData["itemId"];
            eatNeedCount = postData["count"]-0;
            debrisId = debrisArr[ballId];
            var eatNeedExp = 0;//道具增加的经验点数
            var itemExp = 0;//道具对应的经验点
            var nowBallExp = 0;
            var arr = [];
            var itemCount = 0;//道具剩余个数
            var eatId = "";
            async.series([function(cb){//判断道具个数是否足够，不扣除
                if (( debrisArr.indexOf(itemId) != -1 && debrisId == itemId)) {//1.验证是否碎片或者道具 2.验证是否是对应星级龙珠的碎片
                    eatId = debrisId;
                    cb(null);
                } else if(eatArr.indexOf(itemId) != -1){
                    eatId = itemId;
                    cb(null);
                } else {
                    cb("itemInvalid");//不是同星级的龙珠
                }
            },function(cb){//道具扣个数
                item.getItem(userUid, itemId, function (err, res) {
                    if (err)cb(err);
                    else if (res == null || res["number"] - 0 < eatNeedCount) {
                        cb("noItem");
                    } else {
                        itemCount = res["number"] -0 - eatNeedCount;
//                        console.log(itemCount,"444444",eatNeedCount);
                        itemExp  = itemConfig[itemId]["typeValue"]-0;//碎片或者道具可增加的经验点数
                        cb(null);
                    }
                });
            },function (cb) {
                bhmt.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else if (res["arg"] == null || res["arg"]["ballList"] == undefined) {
                        cb("dbError");
                    } else {
                        eatNeedExp = itemExp * eatNeedCount;
                        userData = res["arg"];
                        ballLv = userData["ballList"][ballId]["lv"] - 0;//龙珠的等级
                        point = userData["ballList"][ballId]["point"];//龙珠的技能点
                        ballExp = userData["ballList"][ballId]["exp"] - 0;//龙珠的经验
                        eatList = userData["eatList"];//龙珠的喂食列表
                        debrisCount = userData["debrisList"][ballId]["debrisCount"]-0;
//                        console.log(itemId,debrisId,eatNeedExp,eatNeedCount,ballLv,ballExp,point,"1111111");
                        if (ballLv >= lastLv) {//喂食前比较
                            cb("LvEnough");//等级已满
                        }else if (ballLv < 0) {
                            cb("dbError");//等级不足（防止出现-1的情况）
                        } else {
                            var lim = false;
                            nowBallExp = ballExp + eatNeedExp;
                            var k = 0;
                            for(var x in dragonLevelUpPatch){
                                if(ballLv >= lastLv && nowBallExp > 0){//超限
                                    lim = true;
                                    break;
                                }else{//可升级
                                    k = ballLv+1;
                                    if(k == undefined){//超限了。。。
                                        break;
                                    }else{
                                        newBallExp = dragonLevelUpPatch[k];
                                        if(nowBallExp >= newBallExp){//升级 经验满足条件
                                            point = point + skillPointPerLv;
                                            nowBallExp = nowBallExp - newBallExp;
                                            ballLv++;
                                        }else{//未升级 只加经验
                                            break;
                                        }
                                    }
                                }
                            }
//                            console.log(nowBallExp,newBallExp,ballLv,lastLv);
                            if(lim){//增加的经验超过等级上限
                                cb("LvEnough");
                            }else{
                                cb(null);
                            }
                        }
                    }
                });
            }, function(cb){//设置数据 取当前升级龙珠所需的经验
                userData["ballList"][ballId]["point"] = point;//龙珠升级后获得的技能点
                userData["ballList"][ballId]["exp"] = nowBallExp;
                userData["ballList"][ballId]["lv"] = ballLv;
                returnData["newBallExp"] = userData["ballList"][ballId]["exp"];
                returnData["ballLv"] = userData["ballList"][ballId]["lv"];
//                console.log(userData["ballList"][ballId]["point"],userData["ballList"][ballId]["exp"],userData["ballList"][ballId]["lv"],"444444",itemExp * eatNeedCount,itemId);
                //区别对待 道具和碎片
                if(itemId == debrisId){
                    userData["debrisList"][ballId]["debrisCount"] = itemCount;//更新龙珠碎片数据
                }else{
                    for (var a in eatList) {
                        if (eatList[a]["id"] == itemId) {//验证是否选中的道具
                            userData["eatList"][a]["count"] = itemCount;//更新喂食道具数据
                            break;
                        }
                    }
                }
//                console.log(itemCount,"*********");
                arr.push({"itemId": itemId, "count": itemCount});
                returnData["itemData"] = arr;
                cb(null);
            }, function (cb) {//更新数据
                bhmt.setUserData(userUid, userData, cb);
            }, function (cb) {//扣除道具个数
                //统计 升级道具消耗
                switch (ballId) {
                    case "0":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH9, eatNeedCount);//一星龙珠升级道具消耗
                        break;
                    case "1":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH10, eatNeedCount);//二星龙珠升级道具消耗
                        break;
                    case "2":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH11, eatNeedCount);//三星龙珠升级道具消耗
                        break;
                    case "3":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH12, eatNeedCount);//四星龙珠升级道具消耗
                        break;
                    case "4":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH13, eatNeedCount);//五星龙珠升级道具消耗
                        break;
                    case "5":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH14, eatNeedCount);//六星龙珠升级道具消耗
                        break;
                    case "6":
                        mongoStats.expendStats(itemId, userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH15, eatNeedCount);//七星龙珠升级道具消耗
                        break;
                }
                item.updateItem(userUid, itemId, -eatNeedCount, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "eatGhost"://一键喂食  //(一键喂食下一次更新上(未完成************************))
            if (jutil.postCheck(postData, "ballId") == false) {
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 1;
            debrisId = debrisArr[ballId];
            var e = 0;
            var myEatList = [];
            var nowBallExp = 0;

            var beforeUpballLv = 0;//原始龙珠的等级
            var beforeExp = 0;//原始等级
            var beforePoint = 0;//原始技能点

            var nowBallLv = 0;//中间变量，存放下一级lv
            var payExp = 0;//消耗的经验
            var nowPoint;
            var arr = [];
            async.series([function (cb) {//取喂食道具个数
                async.eachSeries(eatArr, function (itemId, esCb) {
                    item.getItem(userUid, itemId, function (err, res) {
                        var ec = 0;
                        if (err)esCb(err);
                        else if (res == null || res["number"] - 0 < 1) {//没有道具
                            eatCount = 0;//碎片总个数
                            eatExp = 0;//道具自身增加的经验数
                            myEatList.push({"id": itemId, "count": ec});
                            esCb(null);
                        } else {
                            ec = res["number"];
                            eatCount += ec;//喂食道具总个数
                            eatExp = itemConfig[itemId]["typeValue"];//道具增加的经验数
                            e = ec * eatExp;//消耗单个道具的经验
                            newEatExp += e;//喂食道具消耗的总经验
                            myEatList.push({"id": itemId, "count": ec});
                            esCb(null);
                        }
                    });
                }, function (err, res) {
                    cb(null);
                });
            }, function (cb) {//取龙珠碎片个数
                item.getItem(userUid, debrisId, function (err, res) {
                    if (err)cb(err);
                    else if (res == null) {
                        cb(null);
                    } else {
                        if (res["number"] - 0 < 1) {
                            debrisCount = 0;//碎片总个数
                            debrisExp = 0;//碎片增加的经验数
                            cb(null);
                        } else {
                            debrisCount = res["number"] - 0;//碎片总个数
                            debrisExp = debrisCount * itemConfig[debrisId]["typeValue"];//碎片增加的经验数
                            cb(null);
                        }
                    }
                });
            }, function (cb) {//清除数据并计算等级和经验数值（lv，exp）
//                console.log("newEatExp:",newEatExp,"debrisExp:",debrisExp,newEatExp+debrisExp,myEatList);//总个数
//                console.log("newEatExp:",newEatExp,"debrisExp:",debrisExp);//总经验
                bhmt.getUserData(userUid, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["ballList"] == undefined)cb("dbError");
                    else {
                        userData = res["arg"];
                        beforeUpballLv = userData["ballList"][ballId]["lv"] - 0;//当前龙珠等级（基础）
                        beforeExp = userData["ballList"][ballId]["exp"] - 0;//当前龙珠经验(基础)
                        beforePoint = userData["ballList"][ballId]["point"] - 0;//当前龙珠的技能点（基础）
                        allExp = newEatExp + debrisExp + beforeExp;//总的exp
//                        console.log(allExp,"all",newEatExp,debrisExp);
                        var nowAllExp = allExp;
                        ballLv = beforeUpballLv;
//                        console.log(nowAllExp,ballLv,beforeUpballLv,lastLv,"lvCCCC");//0-35级
//                        return;
                        if (ballLv >= lastLv) {//等级已满
                            cb("LvEnough");
                        } else if (ballLv < 0) {
                            cb("lvNotEnough");//等级不足（防止出现-1的情况）
                        } else {
                            var l = Object.keys(dragonLevelUpPatch);//龙珠经验集合长度
                            var nextBallLv;
                            for (; ballLv < l.length; ballLv++) {
                                if (ballLv >= 0 && ballLv < lastLv) {//下一级
                                    nextBallLv = ballLv + 1;
                                }
//                                console.log(ballLv,"ddd");
//                                console.log(nowBallExp,nowBallLv);//allExp,payExp,nowBallExp,ballLv,dragonLevelUpPatch[ballLv],lastLv
//                                console.log(allExp,dragonLevelUpPatch[nextBallLv],ballLv,lastLv,nextBallLv,"64455");
                                if (allExp >= dragonLevelUpPatch[nextBallLv] && nextBallLv <= lastLv) {//经验满足
                                    if (ballLv >= lastLv) {//满级
                                        allExp -= dragonLevelUpPatch[lastLv];
                                        nowBallExp = dragonLevelUpPatch[lastLv];
                                        payExp += nowBallExp;
                                        nowBallLv = lastLv;
//                                        console.log(allExp,nowBallExp,payExp,nowBallLv,"1");
                                        break;
                                    } else {//有经验，未满级
                                        allExp -= dragonLevelUpPatch[nextBallLv];
                                        nowBallExp = allExp;
                                        payExp += dragonLevelUpPatch[nextBallLv];
                                        nowBallLv = nextBallLv;
//                                        console.log(nowAllExp,nowBallExp,payExp,nowBallLv,"2");//allExp
                                    }
                                } else {
                                    break;
                                }
                                //must be del note
//                                else if(allExp < dragonLevelUpPatch[nextBallLv] && nextBallLv <= lastLv){//没有经验
//                                        console.log(4);
//                                        nowBallExp = allExp;//当前的经验
//                                        nowBallLv = ballLv;
//                                        payExp += nowBallExp;//消耗
//                                        break;
//                                }else{
//                                    break;
//                                }
                            }
//                            console.log(nowAllExp,nowBallExp,nowBallLv,payExp,"1111111111111111111");//nowBallExp,nowBallLv，payExp
                            nowPoint = (nowBallLv - beforeUpballLv) * skillPointPerLv + beforePoint;//龙珠升级后的技能点总数
                            var spExp = payExp - debrisExp;
//                            console.log(nowPoint,nowBallLv,beforeUpballLv,skillPointPerLv,point,spCount,payExp,debrisCount,"false");
                            userData["ballList"][ballId]["lv"] = nowBallLv;//当前的等级
                            userData["ballList"][ballId]["exp"] = nowBallExp;//当前的经验
                            userData["ballList"][ballId]["point"] = nowPoint;
                            arr.push({"ballLv": nowBallLv, "exp": nowBallExp, "point": nowPoint});//******************,"payExp":payExp
                            returnData["itemData"] = arr;
//                            console.log("arr:",arr);
                            async.series([function (cb) {//更新道具数据
                                if (debrisCount <= 0) {
                                    cb(null);
                                } else {
//                                    console.log(-debrisCount,"nmb");
//                                item.updateItem(userUid, debrisId, -debrisCount,cb);
                                    cb();
                                }
                            }, function (cb) {//取喂食道具个数
//                                console.log(spExp,"7978987");
                                var sum = 0;
                                var itemValue = 0;
                                var needCount = 0;
                                for (var h in myEatList) {
                                    itemValue = itemConfig[myEatList[h]["id"]]["typeValue"];
                                    sum = itemValue * myEatList[h]["count"];
                                    if (sum > spExp) {//60 50
                                        spExp /= itemValue;
                                        needCount = Math.floor(spExp);
                                        if (needCount <= myEatList[h]["count"]) {//5 60
                                            cb(null);
//                                        item.updateItem(userUid,myEatList[h]["id"],-needCount,cb);
                                        } else {
                                            cb(null);
//                                        item.updateItem(userUid,myEatList[h]["id"],-myEatList[h]["count"],cb);
                                        }
                                    } else if (sum <= spExp) {//50 50
                                        spExp -= myEatList[h]["count"];
                                        cb(null);
//                                        item.updateItem(userUid,myEatList[h]["id"],-myEatList[h]["count"],cb);
                                    }
                                }
//                                console.log(myEatList,spExp,"*****");
                                cb(null);
                            }], function (err, res) {
                                cb(null);
                            });
                        }
                    }
                });
            }, function (cb) {//设置数据
//                bhmt.setUserData(userUid,userData,cb);
                cb();
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "upgrade"://(一键领悟下一次更新出去)
            if (jutil.postCheck(postData, "ballId", "point") == false) {//payPoint++,point--
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 1;//第几颗龙珠
            var skPoint = postData["point"] - 0;//消耗技能点的个数 1就是普通领悟，n就是一键领悟
            var ballList;//龙珠的列表（当前）
            var myPoint;
            async.series([function (cb) {
                bhmt.getUserData(userUid, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["ballList"] == undefined)cb(err);
                    else {
                        userData = res["arg"];
                        ballList = userData["ballList"][ballId];
                        myPoint = ballList["point"] - 0;
                        if (myPoint < 0) {//缓存内的技能点数//skPoint
                            cb("skillPointNotEnough");//技能点不足
                        }
                        payPoint = ballList["payPoint"];
                        holeList = ballList["holeList"];//孔的列表
                        var skills = dragonBuff["skills"];//技能列表
                        var skillIdArr = [];
                        for (var r = 1; r <= skills.length; r++) {
                            skillIdArr.push(r);
                        }
                        var ski;//随机技能
                        var randomRate = Math.random();
                        var p1 = 0;
                        for (var i in skills) {
                            p1 += skills[i]["prob"] - 0;
                            if (randomRate <= p1) {
                                ski = i;
                                break;
                            }
                        }
//                        console.log(ski,"23232323");
                        var skillLvList = skills[ski]["value"];//当前等级对应的数值
                        var skillLastLv = Object.keys(skillLvList).length;//最后一级
                        var tmp = [];
//                        console.log(holeList[0]["lv"],skillLastLv,"0-0-0");
                        for (var s in holeList) {
                            if (holeList[s]["lv"] >= skillLastLv || (holeList[s]["lock"] == 1 && holeList[s]["lv"] < 1)) {//1.锁定没开孔 2.锁定没技能 3.满级
                                continue;
                            } else {
                                tmp.push(holeList[s]);
                            }
                        }
//                        console.log(tmp,"随机列表");
                        if (tmp.length <= 0) {//没有孔可以领悟
                            cb("upgradeLimit");//领悟已达上限
                        }else{//有可领悟的孔
                            var m = Math.floor(Math.random() * tmp.length);//随机一个孔
                            if (skPoint == 1) {//1次
                                if (tmp[m] == undefined) {
                                    cb("LvEnough");
                                } else {
                                    payLockPoint = tmp[m]["payLockPoint"] - 0;
                                    if (tmp[m]["lock"] == 0) {//未锁定
                                        if (tmp[m]["id"] == -2 && myPoint > 0) {//1.开孔
                                            tmp[m]["id"] = -1;
                                            payLockPoint++;
                                            tmp[m]["payLockPoint"] = payLockPoint;
                                            myPoint--;
                                            payPoint++;
//                                        console.log(myPoint,payPoint,"1");
                                            cb(null);
                                        } else if (tmp[m]["id"] == -1 && myPoint > 0) {//2.添加技能
                                            tmp[m]["id"] = ski;
                                            tmp[m]["type"] = skills[tmp[m]["id"]]["type"];
                                            tmp[m]["value"] = skills[tmp[m]["id"]]["value"][tmp[m]["lv"]];
                                            tmp[m]["lv"]++;
                                            payLockPoint++;
                                            tmp[m]["payLockPoint"] = payLockPoint;
                                            myPoint--;
                                            payPoint++;
//                                        console.log(myPoint,payPoint,"2");
                                            cb(null);
                                        } else if (tmp[m]["id"] >= 0 && myPoint > 0) {//升级
                                            if (tmp[m]["lv"] < skillLastLv) {
                                                tmp[m]["type"] = skills[tmp[m]["id"]]["type"];
                                                tmp[m]["value"] = skills[tmp[m]["id"]]["value"][tmp[m]["lv"]];
                                                tmp[m]["lv"]++;
                                                payLockPoint++;
                                                tmp[m]["payLockPoint"] = payLockPoint;
                                                myPoint--;
                                                payPoint++;
                                            }
//                                        console.log(myPoint,payPoint,"3");
                                            cb(null);
                                        } else if (myPoint <= 0) {
                                            cb("skillPointNotEnough");//技能点不足
                                        }
//                                    else{
//                                        cb(null);
//                                    }
                                    } else {//锁定后只能升级技能
//                                    console.log(myPoint,payPoint,"4");
//                                    console.log(m,"kong",tmp,"2",tmp[m]["id"] > 0 && myPoint > 0);
                                        if (tmp[m]["id"] > 0 && myPoint > 0) {//升级
                                            if (tmp[m]["lv"] < skillLastLv) {
                                                tmp[m]["type"] = skills[tmp[m]["id"]]["type"];
                                                tmp[m]["value"] = skills[tmp[m]["id"]]["value"][tmp[m]["lv"]];
                                                tmp[m]["lv"]++;
                                                payLockPoint++;
                                                tmp[m]["payLockPoint"] = payLockPoint;
                                                myPoint--;
                                                payPoint++;
                                                cb(null);
                                            }
                                        } else if (myPoint <= 0) {
                                            cb("skillPointNotEnough");//技能点不足
                                        }
//                                    else{
//                                        cb(null);
//                                    }
                                    }
                                }
                            }//一键领悟 cb("LvEnough");
                            else {
                                for (var q = 0; q < skPoint; q++) {
                                    if (holeList[s]["lv"] >= skillLastLv || (holeList[s]["lock"] == 1 && holeList[s]["lv"] < 1)) {
                                        continue;
                                    } else {
                                        if (tmp[m]["lock"] == 0) {//未锁定
                                            if (tmp[m]["id"] == -2) {//1.开孔
                                                tmp[m]["id"] = -1;
                                                myPoint--;
                                                payPoint++;
                                                payLockPoint = tmp[m]["payLockPoint"] - 0;
                                                payLockPoint++;
                                            } else if (tmp[m]["id"] == -1) {//2.添加技能
                                                tmp[m]["id"] = ski;
                                                tmp[m]["type"] = skills[tmp[m]["id"]]["type"];
                                                tmp[m]["value"] = skills[tmp[m]["id"]]["value"][tmp[m]["lv"]];
                                                tmp[m]["lv"]++;
                                                myPoint--;
                                                payPoint++;
                                                payLockPoint = tmp[m]["payLockPoint"] - 0;
                                                payLockPoint++;
                                            } else if (tmp[m]["id"] >= 0) {
                                                if (tmp[m]["lv"] < skillLastLv) {
                                                    tmp[m]["type"] = skills[tmp[m]["id"]]["type"];
                                                    tmp[m]["value"] = skills[tmp[m]["id"]]["value"][tmp[m]["lv"]];
                                                    tmp[m]["lv"]++;
                                                    myPoint--;
                                                    payPoint++;
                                                    payLockPoint = tmp[m]["payLockPoint"] - 0;
                                                    payLockPoint++;
                                                }
                                            } else {
                                                break;
                                            }
                                        } else {
                                            break;
                                        }
                                    }
                                }
                                cb(null);
                            }
                        }
                    }
                });
            }, function (cb) {
//                console.log(myPoint,payPoint,"sum...");
                userData["ballList"][ballId]["payPoint"] = payPoint;
                userData["ballList"][ballId]["point"] = myPoint;
                returnData["holeList"] = holeList;
                returnData["point"] = myPoint;
                returnData["payPoint"] = payPoint;
                bhmt.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);//返回技能数组
            });
            break;
        case "reset"://重置 锁定不计算在内
            /**
             * 注意事项：
             * 1.重置表示--关闭所有的孔（不包括锁定的）
             * 2.返回所有消耗的技能点
             * 3.扣钱--根据锁定的个数计算，没有锁定，-resetCost[0]，锁1,resetCost[1],以此类推
             */
//            echo("notOpen");
//            return false;
            if (jutil.postCheck(postData, "ballId") == false) {
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 0 - 1;
            var resetCost = dragonBuff["resetCost"];//重置消耗金币
            var ballList;//单个龙珠的数据列表
            async.series([function (cb) {
                bhmt.getUserData(userUid, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["ballList"] == undefined)cb("dbError");
                    else {
                        userData = res["arg"];
                        ballList = userData["ballList"][ballId];//单个龙珠的数据列表
                        point = ballList["point"] - 0;//喂食升级获得的技能点
                        payPoint = ballList["payPoint"] - 0;//领悟消耗的技能点
                        holeList = ballList["holeList"];//孔的列表
                        var ln = 0;//锁定个数
                        var lockPoint = 0;//被锁定孔里消耗的技能点
                        var unLockPoint = 0;//未锁定孔里消耗的技能点
                        for (var p = 0; p < holeList.length; p++) {//计算锁定孔的个数
                            if (holeList[p]["lock"] == 1) {
                                ln++;
                            }
                        }
                        var afterLockPoint = 0;
                        if (ln == 0) {//计算重置后的技能点(没有锁定孔的数据)
                            for (var t = 0; t < holeList.length; t++) {
                                holeList[t]["id"] = -2;
                                holeList[t]["lv"] = 0;
                                holeList[t]["type"] = 0;
                                holeList[t]["value"] = 0;
                                holeList[t]["lock"] = 0;
                                afterLockPoint += holeList[t]["payLockPoint"] - 0;
                                holeList[t]["payLockPoint"] = 0;
//                                console.log(holeList[t]["payLockPoint"],ballList["payPoint"],"2332423");
                            }
//                            console.log(point,afterLockPoint,"55555555555");
                            ballList["point"] = point + afterLockPoint;// + afterLockPoint
                        } else {//有锁定的孔的数据
                            for (var u = 0; u < holeList.length; u++) {
                                if (holeList[u]["lock"] == 1) {//取锁定孔的个数，计算重置价格
                                    holeList[u]["id"] = ballList["holeList"][u]["id"];
                                    holeList[u]["lv"] = ballList["holeList"][u]["lv"];
                                    holeList[u]["type"] = ballList["holeList"][u]["type"];
                                    holeList[u]["value"] = ballList["holeList"][u]["value"];
                                    holeList[u]["lock"] = 0;
                                    holeList[u]["payLockPoint"] = ballList["holeList"][u]["payLockPoint"];//保存锁定的技能点
                                    lockPoint += ballList["holeList"][u]["payLockPoint"];
                                } else if (holeList[u]["lock"] == 0) {//没有锁定
                                    holeList[u]["id"] = -2;
                                    holeList[u]["lv"] = 0;
                                    holeList[u]["type"] = 0;
                                    holeList[u]["value"] = 0;
                                    holeList[u]["lock"] = 0;
                                    holeList[u]["payLockPoint"] = ballList["holeList"][u]["payLockPoint"];//保存锁定的技能点
                                    unLockPoint += ballList["holeList"][u]["payLockPoint"];
                                    holeList[u]["payLockPoint"] = 0;
                                }
                            }
                            ballList["point"] = point + unLockPoint;// payPoint - lockPoint;
                        }
                        ballList["holeList"] = holeList;
                        returnData["holeList"] = holeList;
                        reset = resetCost[0] - 0;//固定值
                        ballList["payPoint"] = 0;
                        returnData["point"] = ballList["point"];//总的积分
                        userData["point"] = ballList["point"];
                        userData["payIngot"] += reset;
                        user.getUser(userUid, function (err, res) {
                            if (err || res == null) {
                                cb("dbError");
                            } else if (res["ingot"] - reset < 0) {
                                cb("ingotNotEnough");
                            } else {
                                ingot = res["ingot"] - 0;
                                returnData["userData"] = {"ingot": ingot - reset};
                                stats.events(userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH8);//重置技能次数统计
                                mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH16, reset);
                                cb(null);
                            }
                        });
                    }
                });
            }, function (cb) {//更新数据
                user.updateUser(userUid, returnData["userData"], cb);
            }, function (cb) {
                bhmt.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "lockStatus"://锁的状态 (下一次更新出去)   锁定状态（锁定需要消耗伊美加币）,解锁不扣
            /**传入：龙珠id 孔id
             * 返回：锁定状态 （锁定扣钱）
             * 注意事项：1.lock:0(未锁定) 2.lock:1(已锁定)
             * */
            if (jutil.postCheck(postData, "ballId", "holeId") == false) {
                echo("postError");
                return false;
            }
            if (postData["ballId"] == null || ballArr.indexOf(postData["ballId"]) == -1) {//类型判断
                echo("dbError");
                return;
            }
            ballId = postData["ballId"] - 1;
            holeId = postData["holeId"] - 1;
            var temp = 0;
            var lockCostList = dragonBuff["lockCost"];
            var payIngot = 0;
            async.series([function (cb) {//取已锁定孔的个数
                bhmt.getUserData(userUid, function (err, res) {
                    if (err || res["arg"] == null || res["arg"]["ballList"] == undefined)cb(err);
                    else {
                        userData = res["arg"];
                        payIngot = userData["payIngot"] - 0;
                        holeList = userData["ballList"][ballId]["holeList"];
                        if (holeList[holeId]["lock"] != 1 && holeList[holeId]["lv"] > 0) {//锁定 需求：孔里没有技能不能被锁定
                            holeList[holeId]["lock"] = 1;
                            for (var r in holeList) {//锁定个数
                                if (holeList[r]["lock"] == 1) {
                                    lockNum++;
                                }
                            }
//                            for(var u = 0;u < lockNum;u++){
//                                temp += lockCostList[u];
//                            }
                            var index = lockNum - 0 - 1;
                            temp = lockCostList[index];//锁定扣钱
                            user.getUser(userUid, function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");
                                } else if (res["ingot"] - temp < 0) {
                                    cb("ingotNotEnough");
                                } else {
                                    userData["payIngot"] = payIngot + (temp - 0);
                                    returnData["userData"] = {"ingot": res["ingot"] - temp};
                                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.A_BAHAMUTWISH17, temp);
                                    user.updateUser(userUid, returnData["userData"], cb);
                                }
                            });
                        }
                        else {
                            cb("LockError");  //孔里没有技能不能锁定
                        }
//                        else{//解锁
//                            holeList[holeId]["lock"] = 0;
//                            cb(null);
//                        }
                    }
                });
            }, function (cb) {//更新数据
                returnData["lockStatus"] = holeList[holeId]["lock"];
                cb(null);
            }, function (cb) {
                bhmt.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res) {
        if (err) {
            response.echo("bahamutWish.compose", jutil.errorInfo(err));
        } else {
            response.echo("bahamutWish.compose", res);
        }
    }

    function doGet() {
        //需要添加重置次数，技能属性，技能等级，技能经验，重置返还的技能点
        async.series([function (cb) {//取喂食道具个数
            async.eachSeries(eatArr, function (itemId, esCb) {
                item.getItem(userUid, itemId, function (err, res) {
                    if (err)cb(err);
                    else if (res == null) {
                        eatCount = 0;//没有喂食道具
                    } else {
                        eatCount = res["number"];
                    }
                    eatList.push({"id": itemId, "count": eatCount});
                    list["eatList"] = eatList;
                    esCb(null);
                });
            }, cb);
        }, function (cb) {//取龙珠碎片个数
            async.eachSeries(debrisArr, function (itemId, esCb) {
                item.getItem(userUid, itemId, function (err, res) {
                    if (err)cb(err);
                    else if (res == null) {
                        debrisCount = 0;//没有龙珠碎片
                    } else {
                        debrisCount = res["number"];
                    }
                    debrisList.push({"id": itemId, "debrisCount": debrisCount});
                    list["debrisList"] = debrisList;
                    esCb(null);
                });
            }, cb);
        }, function (cb) {
            var ballList = {"lv": -1, "exp": 0, "point": 0, "payPoint": 0};//point-技能点,payPoint-消耗的技能点
            for (var a = 1; a <= 5; a++) {
                holeList.push({"id": -2, "lv": 0, "lock": 0, "type": 0, "value": 0, "payLockPoint": 0});//,"status":-1-孔的状态
            }
            ballList["holeList"] = holeList;
            for (var b = 1; b <= debrisArr.length; b++) {
                kk.push(ballList);
            }
            list["ballList"] = kk;
            cb();
        }, function (cb) {
            bhmt.getUserData(userUid, function (err, res) {
                userData = res["arg"];
                cb(err);
            });
        }, function (cb) {
            if (userData["eatList"]) {
                cb();
            } else {
                userData["eatList"] = eatList;
                cb();
            }
        }, function (cb) {
            if (userData["debrisList"]) {
                cb();
            } else {
                userData["debrisList"] = debrisList;
                cb();
            }
        }, function (cb) {
            if (userData["ballList"]) {
                var ballList = userData["ballList"];
                var inx = false;
                for (var i in ballList) {
                    for (var j in ballList[i]["holeList"]) {
                        payLockPoint = ballList[i]["holeList"][j]["payLockPoint"];
                        if (payLockPoint == undefined) {
                            ballList[i]["holeList"][j]["payLockPoint"] = 0;
                            inx = true;
                        }
                    }
                }
                if (inx) {
                    userData["ballList"] = ballList;
                    userData["payIngot"] = 0;//玩家消耗的金币总数
                }
                returnData = userData;
                cb(null);
            } else {
                userData["ballList"] = kk;
                returnData = userData;
                cb();
            }
        }, function (cb) {
            bhmt.setUserData(userUid, userData, cb);
        }], function (err, res) {
            returnData["lockConfig"] = lockConfig;
            echo(err, returnData);
        });
    }
}
exports.start = start;
var debrisArr = ["153632", "153633", "153634", "153635", "153636", "153637", "153638"];
var eatArr = ["153639", "153640", "153641"];
var ballArr = [1, 2, 3, 4, 5, 6, 7];