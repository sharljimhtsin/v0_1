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
var autoIdMap = {
    "activityConfig": "id",
    "debris": "id",
    "freesummon": "id",
    "heroSoul": "id",
    "item": "id",
    "leagueMap": "leagueMapId",
    "leagueMapAuction": "auctionId",
    "leagueMapLoot": "lootId",
    "mail": "id",
    "map": "id",
    "payOrder": "id",
    "serverData": "id",
    "userGenerate": "id"
};
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
        if (autoIdMap.hasOwnProperty(tb)) {
            sql = "SELECT MAX(" + autoIdMap[tb] + ") as theId FROM `" + mergedDb + "`.`" + tb + "` where 1=1 OR " + autoIdMap[tb] + "='" + jutil.randomString() + "'";
            sqls[sql] = "maxId";
        }
        var sql = "SELECT * FROM `" + db + "`.`" + tb + "`";
        sqls[sql] = tb;
    }
}
var keys = Object.keys(sqls);
var taskLimit = 1000;
var maxId = 0;
var isAuto = false;
async.eachSeries(keys, function (sql, esCb) {
    var data;
    var tb = sqls[sql];
    console.log(sql);
    async.series([function (cb) {
        conn.query(sql, function (err, res) {
            data = res;
            cb(err);
        });
    }, function (cb) {
        if (tb == "maxId") {
            maxId = isNaN(parseInt(data[0]["theId"])) ? 0 : parseInt(data[0]["theId"]);
            isAuto = true;
            cb("skip");
        } else {
            cb();
        }
    }, function (cb) {
        async.eachLimit(data, taskLimit, function (row, eCb) {
            if (isAuto) {
                maxId++;
            }
            var newId = maxId;
            var insertSql = "INSERT INTO " + mergedDb + "." + tb + " SET ?";
            var insertData = {};
            console.log(insertSql, jutil.nowMillisecond());
            for (var key in row) {
                if (key == "id" || key == "leagueMapId" || key == "auctionId" || key == "lootId") {
                    insertData[key] = newId;
                    continue;
                }
                if (key == "leagueName") {
                    insertData[key] = row[key].toString().substr(0, 8) + jutil.randomString(2); // total 10
                } else {
                    insertData[key] = row[key];
                }
            }
            conn.query(insertSql, insertData, function (err, res) {
                console.log(err);
                eCb(null, res);
            });
        }, function (err, res) {
            isAuto = false;
            cb(err, res);
        });
    }, function (cb) {
        var sqlz = ['delete from ' + mergedDb + '.variable where name = "pvpTaskReward";',
            'delete from ' + mergedDb + '.variable where name = "pvpHighest";',
            'delete from ' + mergedDb + '.variable where name = "redeemPoint";',
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
        esCb("skip" == err ? null : err, res);
    });
}, function (err, res) {
    console.log(err, res, "end");
    process.exit();
});