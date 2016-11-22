/**
 * 龙神的祝福(道具养成功能)
 * User: za
 * Date: 15-8-12
 * Time: 上午12:04
 * To change this template use File | Settings | File Templates.
 */
var activityData = require("../model/activityData");
var async = require("async");


//取用户数据
function getUserData(userUid, callbackFn) {
    activityData.getActivityData(userUid, activityData.BAHAMUTWISH, function (err, res) {
        var mStr = res["arg"];
        var obj;
        try {
            var mObj = JSON.parse(mStr);
        } catch (e) {
            mObj = {};
        } finally {
            obj = mObj;
        }
        res["arg"] = obj;
        callbackFn(err, res);
    });
}
//设置用户数据
function setUserData(userUid, data, callbackFn) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.BAHAMUTWISH, mObj, callbackFn);
}

//取龙珠技能（属性，等级，加成数值）
function getBWSkillData(userUid, callbackFn) {
    var ballList = [];
    var type;
    var value = 0;//值
    var baseV = {"attack": 0, "defence": 0, "hp": 0, "spirit": 0};
    getUserData(userUid, function (err, res) {
        if (err || res["arg"] == null || res["arg"]["ballList"] == undefined)callbackFn("dbError");
        else {
            ballList = res["arg"]["ballList"];
            for (var a in ballList) {
                for (var b in ballList[a]["holeList"]) {
                    b = ballList[a]["holeList"][b];
                    for (var j in baseV) {
                        if (b["type"] == j) {
                            baseV[j] = baseV[j] + b["value"];
                        }
                    }
                }
            }
            callbackFn(err, baseV);
        }
    });
}

exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据
exports.getBWSkillData = getBWSkillData;//设置技能数据