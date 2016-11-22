/**
 * Created by xiayanxin on 2016/11/8.
 *
 * 获取玩家战力
 */

var jutil = require("../code/utils/jutil");
var battle = require("../code/model/battle");
var user = require("../code/model/user");
var title = require("../code/model/titleModel");
var leagueDragon = require("../code/model/leagueDragon");
var configManager = require("../code/config/configManager");
var async = require("async");
var userList = [17314192408, 26004692763, 25937626369, 18069061646, 12901679150];

async.forEachSeries(userList, function (userUid, cb) {
    var userData;
    var ownListData;
    var ownBattleData;
    var ownDefaultBattleData;
    var ownTeam;
    var teamAcode;
    var configData = configManager.createConfig(userUid);
    async.series([function (queueCb) {
        user.getUser(userUid, function (err, res) {
            userData = res;
            queueCb(err);
        });
    }, function (queueCb) {
        title.getTitlesPoint(userUid, function (point) {
            userData["momentum"] = point;
            queueCb();
        });
    }, function (queueCb) {
        battle.getBattleNeedData(userUid, function (err, res) {
            if (err || res == null) {
                queueCb("PVP DATA WRONG");
            } else {
                ownListData = res;
                queueCb();
            }
        });
    }, function (queueCb) {
        leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
            ownListData["dragonData"] = res;
            queueCb(err);
        });
    }, function (queueCb) {
        battle.getUserTeamDataByUserId(userUid, userData, ownListData, function (err, targetData, defaultData) {
            ownBattleData = targetData;
            ownDefaultBattleData = defaultData;
            queueCb(err);
        });
    }, function (queueCb) {
        var ownTeamSkillArr = battle.returnDoOtherTeamSkill(configData, ownDefaultBattleData);
        battle.doSkillToAllHero(configData, ownTeamSkillArr, ownBattleData, ownDefaultBattleData);
        ownTeam = battle.getTeamReturnData(ownDefaultBattleData, ownBattleData, {"userName": userData});
        var defaultOwnTeam = jutil.copyObject(ownBattleData);
        teamAcode = battle.returnNewTeam(ownBattleData, defaultOwnTeam);
        queueCb();
    }], function (err, res) {
        console.log(userUid, 'end', ownTeam, teamAcode);
        cb(err);
    });
}, function (err) {
    console.log("end", err);
});