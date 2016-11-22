/**
 * 替换装备 技能 命格
 *
 * User: liyuluan
 * Date: 13-10-14
 * Time: 下午6:48
 */

var jutil = require("../utils/jutil");
var equipment = require("../model/equipment");
var skill = require("../model/skill");
var card = require("../model/card");
var formation = require("../model/formation");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var async = require("async");


var typeDic = {"equip1":12,"equip2":13,"equip3":14};

//card1	card2	card3	card4	card5	card6

function start(postData, response, query) {
    if (jutil.postCheck(postData,"formationUid","position","propsUid") == false) {
        response.echo("props.replace",jutil.errorInfo("postError"));
    } else {
        var formationUid = postData["formationUid"];
        var position = postData["position"];
        var propsUid = postData["propsUid"];
        var userUid = query["userUid"];

        switch (position) {
            case "equip1":
            case "equip2":
            case "equip3":
                equipmentHandler(userUid,formationUid,position,propsUid,function(err,res) {
                    if (err) {
                        response.echo("props.replace",jutil.errorInfo(err));
                    } else {
                        response.echo("props.replace",{"result":1});
                    }
                });
                break;
            case "skill2":
            case "skill3":
                skillHandler(userUid,formationUid,position,propsUid,function(err,res) {
                    if (err) {
                        response.echo("props.replace",jutil.errorInfo(err));
                    } else {
                        response.echo("props.replace",{"result":1});
                    }
                });
                break;
            case "card1":
            case "card2":
            case "card3":
            case "card4":
            case "card5":
            case "card6":
                cardHandler(userUid,formationUid,position,propsUid,function(err,res) {
                    if (err) {
                        response.echo("props.replace",jutil.errorInfo(err));
                    } else {
                        response.echo("props.replace",{"result":1});
                    }
                });
                break;
            default :
                response.echo("props.replace",jutil.errorInfo("propsMismatch"));
                break;
        }
    }
}

//装备的更换处理
function equipmentHandler(userUid,formationUid,position,propsUid,callbackFn) {
    var configData = configManager.createConfig(userUid);
    async.series([
        function(cb) {//判装备是否存在
            equipment.getEquipment(userUid,function(err,res) {
                if (err) {
                    cb("dbError",null);
                } else {
                    var equipmentItem = res[propsUid];
                    if (equipmentItem == null) {
                        cb("propsNotExist",null); //装备不存在
                    } else {
                        var equipmentId = equipmentItem["equipmentId"];
                        var equipConfig = configData.getConfig("equip");
                        if (equipConfig[equipmentId] == null) {
                            cb("dbError",null);
                        } else {
                            var equipType = equipConfig[equipmentId]["type"];
                            if (typeDic[position] != equipType) {
                                cb("propsMismatch",null); //装备不匹配，
                            } else {
                                cb(null,null);
                            }
                        }
                    }
                }
            });
        },
        function(cb) { //如果装备已被装备则移除原有装备
            modelUtil.removeRelated(userUid,propsUid,"equip",function(err,res) {
                if (err) {
                    cb(err,null);
                } else {
                    cb(null,null);
                }
            });
        },
        function(cb) { //添加到编队中的装备
            formation.addPropsToFormation(userUid,formationUid,position,propsUid,function(err,res) {
                if (err) {
                    cb("dbError",null);
                } else {
                    cb(null,null);
                }
            });
        }
    ],function(err,res) {
        callbackFn(err,res);
    });
}

/**
 * 更换技能处理
 * @param userUid
 * @param formationUid
 * @param position
 * @param propsUid
 * @param callbackFn
 */
function skillHandler(userUid,formationUid,position,propsUid,callbackFn) {
    var configData = configManager.createConfig(userUid);
    async.series([
        function(cb) {
            modelUtil.getUserData(userUid,["formation","skill","hero"],function(err,res) {
                if (err || res["formation"] == null || res["skill"] == null || res["hero"] == null) {
                    cb("dbError",null);
                } else {
                    var mFormation = res["formation"];
                    var mSkill = res["skill"];
                    var mHero = res["hero"];
                    var formationItem = mFormation[formationUid];//当前编队项
                    if (formationItem != null) {
                        var heroUid = formationItem["heroUid"];//当前编队的heroUid
                        //var skillUid = formationItem[position]; //当前的技能Uid
                        var skillId = (mSkill[propsUid] != null)?mSkill[propsUid]["skillId"]:null;//要装配的新技能
                        var heroId = (mHero[heroUid] != null)?mHero[heroUid]["heroId"]:null;//当前武将
                        var talentSkill = null;
                        if (heroId != null) {
                            talentSkill = configData.getConfig("hero")[heroId];
                        }
                        if (skillId == null) {
                            cb("propsNotExist",null);//要装配的技能不存在
                        }else if (skillId == talentSkill || talentSkill == null) { //新技能与武将的天赋技能重复
                            cb("skillRepeated",null);
                        } else {
                            var anotherPostion = (position == "skill2")?"skill3":"skill2";//另外一个技能的位置
                            var anotherSkillUid = formationItem[anotherPostion];//另外一个技能Uid
                            if (anotherSkillUid != 0) {
                                var anotherSkill = mSkill[anotherSkillUid];//另外一个技能
                                if (anotherSkill == null) {
                                    cb("dbError",null);
                                } else if (anotherSkill["skillId"] == skillId) {
                                    cb("skillRepeated",null);
                                } else {
                                    cb(null,null);
                                }
                            } else {
                                cb(null,null);
                            }
                        }
                    } else {
                        cb("heroNotExist",null);
                    }
                }
            });
        },
        function(cb) { //如果装备已被装备则移除原有装备
            modelUtil.removeRelated(userUid,propsUid,"skill",function(err,res) {
                if (err) {
                    cb(err,null);
                } else {
                    cb(null,null);
                }
            });
        },
        function(cb) { //添加到编队中的装备
            formation.addPropsToFormation(userUid,formationUid,position,propsUid,function(err,res) {
                if (err) {
                    cb("dbError",null);
                } else {
                    cb(null,null);
                }
            });
        }
    ],function(err,res) {
        callbackFn(err,res);
    });
}



/**
 * 更换卡片处理
 */
function cardHandler(userUid, formationUid, position, propsUid, callbackFn ) {
    async.series([
        function(cb) { //判断装备是否存在
            card.getCardItem(userUid, propsUid, function(err, res) {
                if (err) cb("dbError");
                else if (res == null) cb("propsNotExist");
                else {
                    cb(null);
                }
            });
        },
        function(cb) { //移除关系
            modelUtil.removeRelated(userUid,propsUid,"card",function(err,res) {
                if (err) {
                    cb(err,null);
                } else {
                    cb(null,null);
                }
            });
        },
        function(cb) { //添加到编队中的装备
            formation.addPropsToFormation(userUid,formationUid,position,propsUid,function(err,res) {
                if (err) {
                    cb("dbError",null);
                } else {
                    cb(null,null);
                }
            });
        }
    ], function(err, res) {
        callbackFn(err,res);
    });
}

//
///**
// * 如果此装备已被其它伙伴使用则移除它
// */
//function removeRelated(userUid,propsUid,callbackFn) {
//    formation.getUserFormation(userUid,function(err,res) {
//        if (err) {
//            callbackFn("dbError",null);
//        } else {
//            var formationData = res;
//            var propsList = ["skill2","skill3","equip1","equip2","equip3","card1","card2","card3","card4","card5","card6"];
//            for (var key in formationData) { //遍历所有装备
//                var mItem = formationData[key];
//                var removeArray = [];
//                for (var i = 0; i < propsList.length; i++) {
//                    var propsName = propsList[i];
//                    if (mItem[propsName] == propsUid) {
//                        removeArray.push([userUid,key,propsName]);
//                    }
//                }
//                async.forEach(removeArray,function(item,cb) {
//                    formation.removePropsFromFormation(item[0],item[1],item[2],function(err,res) {
//                        cb();
//                    });
//                },function(err) {
//                    callbackFn(null,1);
//                });
//            }
//        }
//    });
//}
//


exports.start = start;

