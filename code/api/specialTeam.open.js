/**
 * 解锁 战队位置
 * User: joseppe
 * Date: 14-4-21
 * Time: 下午5:29
 */

var user = require("../model/user");
var item = require("../model/item");
var specialTeam = require("../model/specialTeam");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    var userUid = query["userUid"];

    if (jutil.postCheck(postData, "position") == false) {
        response.echo("specialTeam.open", jutil.errorInfo("postError"));
        return false;
    }

    var position = postData["position"]-0;
    var configData = configManager.createConfig(userUid);
    var specialTeamConfig;/// = configData.getConfig("specialTeam");
//    var itemId = position-0>10?(position-0<=20?153501:155401):152401;//特2：特3：特1//特4：155701
    var itemId;
    if(position<=10){
        itemId = 152401;
    }else if(position>10&&position<=20){
        itemId = 153501;
    }else if(position>20&&position<=30){
        itemId = 155401;
    }else{// if(position>30&&position<=40)
        itemId = 155701;
    }
    var itemData;
    var userData;

    async.series([
        function(callbackFn){
            specialTeam.getByPosition(userUid, position, function(err, res){
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null);
                } else {
                    callbackFn('isOpened');
                }
            });
        },
        function(callbackFn){
            if(position == 1){
                callbackFn(null);
            } else{
                specialTeam.getByPosition(userUid, position-1, function(err, res){
                    if (err) {
                        callbackFn(err);
                    } else if (res == null) {
                        callbackFn('isNoOpend');
                    } else {
                        callbackFn(null);
                    }
                });
            }
        },
        function(callbackFn){
            var config = configData.getConfig("specialTeam");
            if(config['position'][position] == undefined){
                callbackFn('postError');
            } else {
                specialTeamConfig = config['position'][position];
                callbackFn(null);
            }
        },
        function(callbackFn){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callbackFn("noThisUser");
                }else{
                    userData = res;
                    callbackFn(null);
                }
            });
        },
        function(callbackFn){
            item.getItem(userUid, itemId,function(err,res){
                if(err || res == null){
                    callbackFn("propsNotExist");
                }else{
                    itemData = res;
                    callbackFn(null);
                }
            });
        },
        function(callbackFn){
            var lv = userData["lv"] - 0;//configData.userExpToLevel(userData['exp']);
            if(lv < specialTeamConfig['openLevel']){
                callbackFn('userLevelInsufficient');
            } else if(itemData['number'] < specialTeamConfig['openCost']){
                callbackFn("propsNotExist");
            } else {
                callbackFn(null);
            }
        },
        function(callbackFn){
            item.updateItem(userUid, itemId, 0-specialTeamConfig['openCost'], function(err,res){
                if(err || res == null){
                    callbackFn("propsNotExist");
                }else{
                    itemData = res;
                    callbackFn(null, null);
                }
            });
        },
        function(callbackFn){
            specialTeam.openPosition(userUid, position, function (err, res) {
                //TODO: 根据 position 分支
                stats.recordWithLevelIndex(position, [mongoStats.specialTeamOpen1, mongoStats.specialTeamOpen2, mongoStats.specialTeamOpen3, mongoStats.specialTeamOpen4, mongoStats.specialTeamOpen5,
                    mongoStats.specialTeamOpen6, mongoStats.specialTeamOpen7, mongoStats.specialTeamOpen8, mongoStats.specialTeamOpen9, mongoStats.specialTeamOpen10, mongoStats.specialTeamOpen11,
                    mongoStats.specialTeamOpen12, mongoStats.specialTeamOpen13, mongoStats.specialTeamOpen14, mongoStats.specialTeamOpen15, mongoStats.specialTeamOpen16, mongoStats.specialTeamOpen17,
                    mongoStats.specialTeamOpen18, mongoStats.specialTeamOpen19, mongoStats.specialTeamOpen20,mongoStats.specialTeamOpen21, mongoStats.specialTeamOpen22, mongoStats.specialTeamOpen23,
                    mongoStats.specialTeamOpen24, mongoStats.specialTeamOpen25, mongoStats.specialTeamOpen26, mongoStats.specialTeamOpen27,mongoStats.specialTeamOpen28, mongoStats.specialTeamOpen29,
                    mongoStats.specialTeamOpen30,mongoStats.specialTeamOpen31, mongoStats.specialTeamOpen32, mongoStats.specialTeamOpen33,mongoStats.specialTeamOpen34, mongoStats.specialTeamOpen35,
                    mongoStats.specialTeamOpen36, mongoStats.specialTeamOpen37,mongoStats.specialTeamOpen38, mongoStats.specialTeamOpen39,mongoStats.specialTeamOpen40], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
                callbackFn(err, res);
            });
        }
    ],function(err,res){
        if(err){
            response.echo("specialTeam.open",jutil.errorInfo(err));
        } else {
            achievement.specialTeamActivation(userUid, 1, function(){});
            response.echo("specialTeam.open",itemData);
        }
    });
}

exports.start = start;