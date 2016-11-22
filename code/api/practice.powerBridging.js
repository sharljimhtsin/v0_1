/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-4-1
 * Time: 上午11:12
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var practicePowerBridging = require("../model/practicePowerBridging");
var redis = require("../alien/db/redis");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var vitality = require("../model/vitality");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    //action: get/set/useBall/addPower
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("practice.powerBridging", _errInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var action = postData['action'];

    //redis.user(userUid).s("PowerBridging").setObj({});

    switch (action) {

        case "get":
            practicePowerBridging.get(userUid, function(err, res){
                if (err) {
                    response.echo("practice.powerBridging", _errInfo(err));
                } else {
                    response.echo("practice.powerBridging", _susInfo(res));
                }
            });
            break;

        case "set":

            var heroUid = postData["heroUid"];
            if (!heroUid) {
                response.echo("practice.powerBridging", _errInfo("postError"));
                return false;
            }

            heroUid = parseInt(heroUid);
            if (isNaN(heroUid)) {
                response.echo("practice.powerBridging", _errInfo("postError"));
                return false;
            }

            // 设置选择的英雄
            redis.user(userUid).s("PowerBridging").setObjex(604800, {"heroUid":(heroUid + "")}, function(err, res){
                if (err) {
                    response.echo("practice.powerBridging", _errInfo(err));
                } else {
                    response.echo("practice.powerBridging", _susInfo(res));
                }
            });
            break;

        case "useBall":
            var ballNum = postData["ballNum"];
            stats.expendStats("152301",userUid,"127.0.0.1",null,mongoStats.powerBridging_count,ballNum);
            if (!ballNum) {
                response.echo("practice.powerBridging", _errInfo("postError"));
                return false;
            }

            ballNum = parseInt(ballNum);
            if (isNaN(ballNum)) {
                response.echo("practice.powerBridging", _errInfo("postError"));
                return false;
            }

            practicePowerBridging.useBall(userUid, ballNum, function(err, res){
                if (err) {
                    response.echo("practice.powerBridging", _errInfo(err));
                } else {
                    timeLimitActivityReward.itemUsed(userUid, "152301", ballNum, function(){
                        response.echo("practice.powerBridging", _susInfo(res));
                    });
                    vitality.vitality(userUid, "enegyBall", {"completeCnt":ballNum}, function(){});
                }
            });
            break;

        case "addPower":
            practicePowerBridging.addPower(userUid, function(err, res){
                if (err) {
                    response.echo("practice.powerBridging", _errInfo(err));
                } else {
                    response.echo("practice.powerBridging", _susInfo(res));
                }
            });
            break;

        default :
            response.echo("practice.powerBridging", _errInfo("postError"));
            return false;
    }
}

function _susInfo(res) {
    return {
        result:1,
        data:res
    }
}

function _errInfo(err) {
    return {
        result:0,
        data:_errStr(err)
    };
}

function _errStr(err) {
    if (typeof err == "object") {
        err = JSON.stringify(err);
    } else {
        err = "" + err;
    }
    return err;
}

exports.start = start;