/**
 *
 * Date: 14-5-26
 * Time: 下午3:22
 */
var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var fs = require("fs");
var jutil = require("../code/utils/jutil");
var bitUtil = require("../code/alien/db/bitUtil");
var rs = new Response();
function Response() {
    // nothing
}
Response.prototype.echo = function (str1, str2) {
    console.log(str1, str2);
};

var he = "26004692763";
var she = "26004692763";
var battle = require("../code/model/battle");
var user = require("../code/model/user");
var title = require("../code/model/titleModel");
var hisUserData;
var herUserData;
var hisListData;
var herListData;
var hisBattleData;
var hisDefaultBattleData;
var herBattleData;
var herDefaultBattleData;
var hisFinalData;
var herFinalData;
var battleReturnData = {};
var configData = configManager.createConfig(he);
var fs = require('fs');
async.series([function (cb) {
    battle.getBattleNeedData(he, function (err, res) {
        hisListData = res;
        fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(hisListData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    battle.getBattleNeedData(she, function (err, res) {
        herListData = res;
        fs.appendFile('battle_flex.log', she + ":" + jutil.now() + " | " + JSON.stringify(herListData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    user.getUser(he, function (err, res) {
        hisUserData = res;
        fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(hisUserData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    user.getUser(she, function (err, res) {
        herUserData = res;
        fs.appendFile('battle_flex.log', she + ":" + jutil.now() + " | " + JSON.stringify(herUserData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    title.getTitlesPoint(he, function (point) {
        hisUserData["momentum"] = -1;
        cb(null, null);
    });
}, function (cb) {
    title.getTitlesPoint(she, function (point) {
        herUserData["momentum"] = -2;
        cb(null, null);
    });
}, function (cb) {
    battle.getUserTeamDataByUserId(he, hisUserData, hisListData, function (err, targetData, defaultData) {
        hisBattleData = targetData;
        hisDefaultBattleData = defaultData;
        fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(hisBattleData) + "\n" + JSON.stringify(hisDefaultBattleData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    battle.getUserTeamDataByUserId(she, herUserData, herListData, function (err, targetData, defaultData) {
        herBattleData = targetData;
        herDefaultBattleData = defaultData;
        fs.appendFile('battle_flex.log', she + ":" + jutil.now() + " | " + JSON.stringify(herBattleData) + "\n" + JSON.stringify(herDefaultBattleData) + "\n", 'utf8');
        cb(err);
    });
}, function (cb) {
    hisFinalData = battle.getTeamReturnData(hisDefaultBattleData, hisBattleData, hisUserData);
    fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(hisFinalData) + "\n", 'utf8');
    cb();
}, function (cb) {
    herFinalData = battle.getTeamReturnData(herDefaultBattleData, herBattleData, herUserData);
    fs.appendFile('battle_flex.log', she + ":" + jutil.now() + " | " + JSON.stringify(herFinalData) + "\n", 'utf8');
    cb();
}, function (cb) {
    var hisTeamSkillArr;   //甲方作用于乙方的技能
    var herTeamSkillArr;  //乙方作用于甲方的技能
    hisTeamSkillArr = battle.returnDoOtherTeamSkill(configData, hisDefaultBattleData);
    herTeamSkillArr = battle.returnDoOtherTeamSkill(configData, herDefaultBattleData);
    battle.doSkillToAllHero(configData, hisTeamSkillArr, hisBattleData, hisDefaultBattleData);
    battle.doSkillToAllHero(configData, herTeamSkillArr, herBattleData, herDefaultBattleData);
    battleReturnData["ownTeam"] = hisFinalData;
    battleReturnData["enemyTeam"] = herFinalData;
    battleReturnData["ownTeam"]["name"] = hisUserData["userName"];
    battleReturnData["enemyTeam"]["name"] = herUserData["userName"];
    battleReturnData["ownTeam"]["momentum"] = hisUserData["momentum"];
    battleReturnData["enemyTeam"]["momentum"] = herUserData["momentum"];
    battleReturnData["roundData"] = [];
    var isMeFirst = herUserData["momentum"] > hisUserData["momentum"] ? false : true;
    var defaultOwnTeam = jutil.copyObject(hisBattleData);
    var defaultEnemyTeam = jutil.copyObject(herBattleData);
    for (var i = 1; i <= 3; i++) {
        var teamAcode = battle.returnNewTeam(hisBattleData, defaultOwnTeam);
        hisBattleData = teamAcode[0];
        defaultOwnTeam = teamAcode[1];
        var teamBcode = battle.returnNewTeam(herBattleData, defaultEnemyTeam);
        herBattleData = teamBcode[0];
        defaultEnemyTeam = teamBcode[1];
        fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(hisBattleData) + "\n" + JSON.stringify(herBattleData) + "\n", 'utf8');
        var round = battle.twoTeamBattle(configData, hisBattleData, herBattleData, isMeFirst, i, defaultOwnTeam, defaultEnemyTeam, he, she);
        fs.appendFile('battle_flex.log', he + ":" + jutil.now() + " | " + JSON.stringify(round) + "\n", 'utf8');
        battle.addDeadInBackData(hisBattleData, battleReturnData["ownTeam"]["team"], i);
        battleReturnData["roundData"].push(round["roundData"]);
        if (round["complete"]) {
            break;
        }
        isMeFirst = !isMeFirst;
    }
    cb(null, battleReturnData);
}], function (err, res) {
    console.log("END");
});