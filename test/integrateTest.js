/**
 * Created by za on 2015-11-19 14:45
 * 合服脚本（内网测试）
 */
var mysql = require('mysql');
var async = require('async');
var fs = require('fs');
var jutil = require("../code/utils/jutil");
var conn = mysql.createPool({"host": "dbztest.gt.com", "user": "admin", "password": "zxw000123", "port": 3306});
var mergedDb = "dragongame_10";
var dbs = ['dragongame_8', 'dragongame_9'];
/**
 * achievement,activityConfig,activityData,backpack,bigMap,box,budokai,buyLog,card,cdkeyOwner,compensateReceive,debris,equipment,formation,freesummon,
 * friend,fuse,globalFormation,hero,heroGravity,heroSoul,item,league,leagueDragon,leagueMap,leagueMapAuction,leagueMapLoot,leagueMember,leagueStar,mail,map,
 * notice,payOrder,payOrderUid,practiceConfig,pvptop,serverData,skill,specialBox,specialTeam,summon,summonHeroLog,switch,teach,timeLimitActivity,titleGet,
 * titleMeta,user,userGenerate,userInformation,userOwner,variable,vitality *
 * */
var tbs = ['achievement', 'activityData', 'backpack', 'bigMap', 'box', 'budokai', 'buyLog', 'card', 'cdkeyOwner', 'compensateReceive'
    , 'debris', 'equipment', 'formation', 'freesummon', 'friend', 'fuse', 'globalFormation', 'hero', 'heroGravity', 'heroSoul', 'item', 'league', 'leagueDragon',
    'leagueMap', 'leagueMapAuction', 'leagueMapLoot', 'leagueMember', 'leagueStar', 'mail', 'map', 'payOrder', 'payOrderUid', 'practiceConfig', 'serverData', 'skill', 'specialBox', 'specialTeam', 'summon', 'summonHeroLog', 'switch', 'teach', 'timeLimitActivity', 'titleGet', 'titleMeta'
    , 'user', 'userGenerate', 'userInformation', 'userOwner', 'variable', 'vitality'];//activityConfig,notice,pvptop
var sqls = {};
for (var db in dbs) {
    db = dbs[db];
    for (var tb in tbs) {
        tb = tbs[tb];
        var sql = "SELECT * FROM `" + db + "`.`" + tb + "`";
        sqls[sql] = tb;
    }
}
var keys = Object.keys(sqls);
async.eachSeries(keys, function (sql, esCb) {
    var data;
    console.log(sql);
    async.series([function (cb) {
        conn.query(sql, function (err, res) {
            data = res;
            cb(err);
        });
    }, function (cb) {
        async.eachSeries(data, function (row, eCb) {
            var tb = sqls[sql];
            var insertSql = "INSERT INTO " + mergedDb + "." + tb + " SET ?";
            var insertData = {};
            console.log(insertSql, jutil.nowMillisecond());
            for (var key in row) {
                if (key == "id" || key == "leagueMapId" || key == "auctionId" || key == "lootId") {
                    continue;
                }
                if (key == "leagueName") {
                    insertData[key] = row[key] + "0";
                } else {
                    insertData[key] = row[key];
                }
            }
            conn.query(insertSql, insertData, function (err, res) {
                eCb(err, res);
            });
        }, function (err, res) {
            cb(err, res);
        });
    }, function (cb) {
        var sqlz = ['delete from ' + mergedDb + '.variable where name = "pvpTaskReward";',
            'delete from ' + mergedDb + '.variable where name = "pvpHighest";',
            'delete from ' + mergedDb + '.variable where name = "pvpChangeTime";'];
        async.eachSeries(sqlz, function (sql, eCb) {
            console.log(sql, jutil.nowMillisecond());
            conn.query(sql, function (err, res) {
                eCb(err, res);
            });
        }, function (err, res) {
            cb(err, res);
        });
    }], function (err, res) {
        esCb(err, res);
    });
}, function (err, res) {
    console.log(err, res, "end");
    process.exit();
});