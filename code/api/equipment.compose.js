/**
 * 装备合成
 * 2.1)检测传参是否正确
 * 2.2)根据用户选择的合成装备，计算返还的内容（索尼，经验转为材料）
 * 2.3)合成装备消失
 * 2.4)合成新装备（生成随机数，与装备数对应的合成比率，比较确认是否能合成成功）
 *     如果成功，在生成随机数，确定合成的装备，返回
 *     如果未成功，返回
 * User: peter.wang
 * Date: 14-09-04
 * Time: 上午12:03
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var async = require("async");
var equipment = require("../model/equipment");
var item = require("../../code/model/item");
var user = require("../../code/model/user");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "material", "requestType") == false) {
        response.echo("equipment.compose", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var postMaterial = postData["material"];        //用做合成的装备
    var postRequestType  = (postData["requestType"]==undefined)? 0:postData["requestType"];//请求类型(0:不执行入库，仅返回相关数据 1:执行入库，且返回相关数据）
    var material = [];
    var star = '';                          //装备品质
    var configData = configManager.createConfig(userUid);
    var euipConfig = configData.getConfig("equip");

    var returnZeni = 0;                  // 返回的索尼
    var returnMaterial = [];            // 返回的材料
    var returnComposeEquipment = {};    // 合成装备
    var resultData = [];                // 返回的材料(结果)

    if ((postMaterial instanceof Array == false)) {
        response.echo("equipment.compose", jutil.errorInfo("postError"));
        return;
    }
    for (var i = 0; i < postMaterial.length; i++) { //排除相同的装备
        var mItem = postMaterial[i];
        if (material.indexOf(mItem) == -1) {
            material.push(mItem);
        }
    }
    if (material.length == 0) {
        response.echo("equipment.compose", jutil.errorInfo("postError"));
        return;
    }

    var userZeni = 0;
    async.series([
        function (cb){// 检测用户是否拥有被合成的装备
            equipment.getEquipment(userUid,function(err,res){
                if (err) {
                    cb(err,null);
                } else if ( res == null){
                    cb("noEquip",null);
                }else {
                    for(var index in material){
                        if(res[material[index]]==undefined){
                            cb("noEquip",null);
                            return;
                        }
                    }
                    cb(null,null);
                }
            });
        },
        function (cb) { //根据用户选择的合成装备，计算返还的内容（索尼，经验转为材料）
            composeReturn(userUid, configData, material, postRequestType,function(err,res){
                if (err) cb(err, null);
                else{
                    returnZeni = res["returnZeni"];
                    returnMaterial = res["returnMaterial"];
                    resultData = res["resultData"];
                    star = res["star"];
                    cb(null,null);
                }
            });
        },
        function (cb) { //用于合成的装备消失(即删除用于合成的装备)
            if(postRequestType==1) {
                equipment.removeEquipment(userUid, material, function (err, res) {
                    if (err) cb(err, null);
                    else cb(null, null);
                });
            }else{
                cb(null, null);
            }
        },
        function (cb) { //合成新装备
            composeEquipment(userUid, configData, material, star, postRequestType,function(err,res){
                if (err) cb(err, null);
                else{
                    returnComposeEquipment = res["composeEquipment"];
                    cb(null,null);
                }
            });
        },
        function (cb) { //获取用户信息
            user.getUser(userUid,function(err,res){
                if (err) cb(err, null);
                else{
                    userZeni = res["gold"];
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("equipment.compose", jutil.errorInfo(err));
        } else {
            response.echo("equipment.compose",{"requestType":postRequestType,"returnComposeEquipment":returnComposeEquipment, "returnZeni":returnZeni,"userZeni":userZeni,"returnMaterial":returnMaterial, "resultData":resultData});
        }
    });

}
/**
 *计算返还索尼与材料
 */
function composeReturn(userUid, configData, material, postRequestType, callbackFn)
{
    var star       = 0;                  // 用于合成装备的品质（合成装备时使用此值）
    var returnZeni = 0;                  // 返回的索尼
    var returnMaterial = [];            // 返回的材料
    var resultData = [];                //掉落的结果

    var euipComposeConfig = configData.getConfig("euipCompose");

    var euipConfig = configData.getConfig("equip");
    var equipUpgradeRatioConfig = configData.getConfig("equipUpgradeRatio");

    equipment.getEquipment(userUid,function(err,res){
        if (err || res == null) {
            callbackFn(err, null);

        } else {
            //console.log(res);return;
            var flag = false;
            var refiningSum = {};
            material.forEach(function(equipUid){
                var equipData = res[equipUid];
                if (equipData != null) {
                    flag = true;
                    var equipLevel = equipData["level"] - 0;
                    var equipItemConfig = euipConfig[equipData["equipmentId"]];
                    star = equipItemConfig["star"];                   //装备品质
                    var equipType = equipItemConfig["type"] - 0;      //装备类型
                    var basePrice = equipItemConfig["basePrice"] - 0;//强化需要的基础金币

                    var upgradePrice = 0; //强化一共花费的金币数
                    for (var j = 2; j < equipLevel; j++) {
                        upgradePrice += basePrice * (equipUpgradeRatioConfig[j-1] - 0);//需要花费的金币值
                    }
                    returnZeni += upgradePrice - 0;

                    if(refiningSum[equipType]==undefined) refiningSum[equipType]=equipData["refining"] - 0;
                    else refiningSum[equipType] +=equipData["refining"] - 0;

                }
            });
            if (flag==false) {
                callbackFn("all equipUid not exist",null);
                return;
            }
            returnZeni = Math.floor( returnZeni * (euipComposeConfig["zeniReturn"] - 0));
            for(var i in refiningSum) {
                refiningSum[i] = Math.floor(refiningSum[i] * (euipComposeConfig["refineReturn"] - 0));
            }
            // 精炼转为材料
            returnMaterial = refiningConvertItme(configData, refiningSum);

            if(postRequestType!=1)
            {
                callbackFn(null,{"returnZeni":returnZeni,"returnMaterial":returnMaterial,"star":star});
                return;
            }
            // 发放给用户
            async.series([
                function (cb) {
                    user.getUser(userUid,function(err, res){
                        var userGold = res["gold"];
                        var newUserData = {"gold":parseInt(userGold) + (returnZeni - 0)};

                        user.updateUser(userUid, newUserData, function(err, res) {
                            if (err) {cb("updateUser failed!", null);}
                            else {
                                cb(null, null);
                            }
                        });
                    });
                },
                function (cb) {
                    async.forEach(returnMaterial, function (itm, forEachCb) {
                        mongoStats.dropStats(itm["id"], userUid, '127.0.0.1', null, mongoStats.EQUIP_COMPOSE, itm["count"]);
                        item.updateItem(userUid, itm["id"],itm["number"], function (err, res) {
                            resultData.push(res);
                            forEachCb(null, null);
                        });
                    }, function (err) {
                        if (err) cb(err, null);
                        else cb(null, null);
                    });
                }
            ], function (err, res) {
                if (err) callbackFn(err, null);
                else callbackFn(null,{"returnZeni":returnZeni,"returnMaterial":returnMaterial,"resultData":resultData,"star":star});
            });
        }
    });
}
/**
 *装备精炼转材料
 */
function refiningConvertItme(configData, refiningSum) {
    //refining = 300;
    var returnMaterial = [];

    var itemConfig = configData.getConfig("item");
    var arrObj = [];
    for (var key in itemConfig) {
        arrObj.push(itemConfig[key]);
    }
    arrObj = sortObj(arrObj, 'typeValue', 'desc');

    for (var equipType in refiningSum) {
        var refining = refiningSum[equipType];

        var typeValue = (arrObj[0] == undefined) ? 0 : arrObj[0]["typeValue"] + 1;
        for (var i = 0; i < arrObj.length; i++) {
            var item = arrObj[i];
            if (item["typeValue"] > 0 && (equipType-7)==item["itemType"]) {
                var c = Math.floor(refining / item["typeValue"]);
                if (c > 0 && typeValue > item["typeValue"]) {
                    //returnMaterial.push({"id": item["ID"], "levelLimit":item["levelLimit"], "number": c, "itemType": item["itemType"],"typeValue": item["typeValue"]});
                    returnMaterial.push({"id": item["ID"], "levelLimit":item["levelLimit"], "number": c});
                    refining = refining % item["typeValue"];
                    typeValue = item["typeValue"];
                }
            }
        }
    }
//    arrObj.forEach(function(item){
//        if(item["typeValue"]>0) {
//            var c = Math.floor(refining / item["typeValue"]);
//            if (c > 0 && typeValue > item["typeValue"]) {
//                returnMaterial.push({"id": item["ID"], "typeValue": item["typeValue"], "count": c});
//                refining = refining % item["typeValue"];
//                typeValue = item["typeValue"];
//            }
//        }
//    });

    return returnMaterial;
}
/**
 * 合成装备
 */
function composeEquipment(userUid, configData, material, star, postRequestType, callbackFn){
    //star=1
    var composeEquipmentUid = "";
    var euipComposeConfig = configData.getConfig("euipCompose");
    var successRate = euipComposeConfig["prob"][material.length];

    if(successRate == undefined){
        callbackFn("euipComposeConfig:prob["+material.length+"] undefined", null);

    }else if(euipComposeConfig[star]==undefined){
        callbackFn("euipComposeConfig:star["+star+"] unallow compose", null);

    }else{
        var randomRate1 = Math.random();//（生成随机数，与装备数对应的合成比率比较，确认是否能合成成功）

        if(randomRate1<=successRate){// 装备合成成功,根据合成装备品质随机选一个做为合成的装备

            var composeEquipmentList = euipComposeConfig[star]; // 对应品质的合成装备

            var randomRate2 = Math.random();
            var compareRate=0;
            composeEquipmentList.forEach(function(item){
                compareRate += item.prob-0;
                if(composeEquipmentUid=="" && randomRate2<=compareRate){
                    composeEquipmentUid = item.id;
                }
            });

            if(postRequestType==1) {
                equipment.addEquipment(userUid, composeEquipmentUid, 1, function (err, res) {
                    callbackFn(err, {"composeEquipment": res});
                });
            }else{
                callbackFn(null,{"composeEquipment":null});
            }

        }else{// 装备合成失败
            composeEquipmentUid = "";
            callbackFn(null,{"composeEquipment":null});
        }
    }
}

/**
 * 对象数组快速排序
 *
 * @param arr Array 对象数组
 * @param key string 用于排序的属性
 * @param dir asc升序、desc降序
 *
 * @example:
 * sort([{name:'b',id:12},{name:'c',id:21},{name:'a',id:2}],'id')
 * sort([{name:'b',id:12},{name:'c',id:21},{name:'a',id:2}],'id','asc')
 * sort([{name:'b',id:12},{name:'c',id:21},{name:'a',id:2}],'id','desc')
 */
function sortObj(arr,key,dir){
    key=key||'id';
    dir=dir||'asc';
    if (arr.length == 0) return [];

    var left = new Array();
    var right = new Array();
    var pivot = arr[0][key];//分割值
    var pivotObj = arr[0];//存储值

    if(dir==='asc'){//升序
        for (var i = 1; i < arr.length; i++) {
            arr[i][key] < pivot ? left.push(arr[i]): right.push(arr[i]);
        }
    }else{//降序
        for (var i = 1; i < arr.length; i++) {
            arr[i][key] > pivot ? left.push(arr[i]): right.push(arr[i]);
        }
    }
    return sortObj(left,key,dir).concat(pivotObj, sortObj(right,key,dir));
}


exports.start = start;