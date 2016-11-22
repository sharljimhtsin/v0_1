/**
 * 心无旁骛，直接跳到某个地方
 * User: liyuluan
 * Date: 13-11-25
 * Time: 下午4:02
 */
var user = require("../model/user");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var itemModel = require("../model/item");
var jutil = require("../utils/jutil");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var achievement = require("../model/achievement");
var stats = require("../model/stats");

function start(postData, response, query) {

    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var rollCardConfig = configData.getConfig("rollCard");

    var gUserData = null;
    var gNeedIngot = 0;

    var rUserIngot = 0;
    var rRollPosition = null;
    var rSex = null;

    async.series([
        function(cb) { //判断用户元宝是否够
            user.getUser(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    gUserData = res;
                    var needIngot = rollCardConfig["bigRollCost"] - 0;
                    gNeedIngot = needIngot;
                    if (gUserData["ingot"] - 0 < needIngot) {
                        cb("noRMB");
                    } else {
                        rUserIngot = gUserData["ingot"] - rollCardConfig["bigRollCost"];
                        cb (null);
                    }
                }
            });
        },
        function(cb) { //跳转到心无旁骛
            var bigRollToStep = rollCardConfig["bigRollToStep"] - 0;
            var rollCD = 0;//configData.g("rollCard")("getGroup")(bigRollToStep)("cd")() - 0; //取心无旁骛的冷却时间
            userVariable.setVariableTime(userUid,"cardRollPos",bigRollToStep, jutil.now() + rollCD,function(err,res) {
                if (err) cb("dbError");
                else {
                    rRollPosition = {"value":bigRollToStep,"time":jutil.now()};
                    cb(null);
                }
            });
        },
        function(cb) { //掉一个真元（色情杂志）
            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
            mongoStats.dropStats("151601", userUid, userIP, gUserData, mongoStats.D_ROLLTO, 1);
            stats.events(userUid,"127.0.0.1",null,mongoStats.cardRollto);
            itemModel.updateItem(userUid,"151601",1,function(err,res) {
                rSex = res["number"];
                cb(null);
                if (err) console.error("card.rollto",err.stack);
            });
        },
        function(cb) { //扣钱
            user.updateUser(userUid,{"ingot":rUserIngot},function(err,res) {
                cb(null);
                if (err) console.error("card.rollto2",err.stack);
            });
        }
    ],function(err) {
        if (err) response.echo("card.rollto",jutil.errorInfo(err));
        else {
            achievement.useBigRoll(userUid, 1, function(){});

            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
            response.echo("card.rollto", {"rewardSex":1,"sex":rSex,"rollPosition":rRollPosition,"userData":{"ingot":rUserIngot}});
            mongoStats.expendStats("ingot", userUid, userIP, gUserData, mongoStats.E_CARD, gNeedIngot);

        }
    });
}

exports.start = start;