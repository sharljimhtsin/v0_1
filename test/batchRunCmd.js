var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var bitUtil = require("../code/alien/db/bitUtil");
var pvptop = require("../code/model/pvptop");
var fs = require("fs");
var countryList = ['i'];
var count = 0;
var sql;
var csv = "country,city,userUid,userName,platformId,\n";
//sql = "DELETE FROM `activityData` WHERE `type` = 35 AND `userUid` in (" + userList.join(",") + ")";
//sql = "SELECT `userUid`,`heroId`,count(*) as ct FROM `hero` WHERE `heroId` in (" + argList.join(",") + ") group by `heroId`,`userUid`";
//sql = "ALTER TABLE `equipment` ADD `attack` INT NOT NULL, ADD `defence` INT NOT NULL, ADD `hp` INT NOT NULL, ADD `spirit` INT NOT NULL, ADD `crit` INT NOT NULL, ADD `tough` INT NOT NULL, ADD `dodge` INT NOT NULL, ADD `hit` INT NOT NULL, ADD `break` INT NOT NULL, ADD `preventBreak` INT NOT NULL, ADD `critDamage` INT NOT NULL;";
//sql = "SELECT `userUid`,`exp`,`train` FROM `hero` WHERE `heroId` = 104083 and `userUid` in (" + inStr + ")";
//sql = "SELECT *  FROM `user` WHERE `platformId` = 'usaa'";
//sql = "ALTER TABLE `activityData` CHANGE `arg` `arg` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '额外的参数';"
//sql = "ALTER TABLE `leagueMapLoot` ADD `mapId` INT( 11 ) NOT NULL;";
//sql = "ALTER TABLE `leagueMapLoot` ADD `mapId` INT( 11 ) NOT NULL;";
//联盟龙
//sql = "CREATE TABLE `leagueStar` (`starId` int(11) NOT NULL,`leagueUid` bigint(20) NOT NULL,`hasTime` int(11) NOT NULL,`destroy` int(11) NOT NULL,PRIMARY KEY (`starId`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
//联盟星球
//sql = "CREATE TABLE IF NOT EXISTS `leagueDragon` (`leagueUid` bigint(20) NOT NULL,`lv` int(11) NOT NULL,`exp` int(11) NOT NULL,`starId` int(11) NOT NULL,`attackLv` int(11) NOT NULL,`attackExp` int(11) NOT NULL,`defenceLv` int(11) NOT NULL,`defenceExp` int(11) NOT NULL,`spiritLv` int(11) NOT NULL,`spiritExp` int(11) NOT NULL,`hpLv` int(11) NOT NULL,`hpExp` int(11) NOT NULL, PRIMARY KEY (`leagueUid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
//sql = "SELECT * FROM `user` as a,`variable` as b WHERE a.`userUid` = b.`userUid` and a.`vip` >= 5 and b.`name` = 'loginLog' and b.`time` between 1445443200 and 1446220799;";
//sql = "CREATE TABLE IF NOT EXISTS `leagueDragon` (`leagueUid` bigint(20) NOT NULL,`lv` int(11) NOT NULL,`exp` int(11) NOT NULL,`starId` int(11) NOT NULL,`attackLv` int(11) NOT NULL,`attackExp` int(11) NOT NULL,`defenceLv` int(11) NOT NULL,`defenceExp` int(11) NOT NULL,`spiritLv` int(11) NOT NULL,`spiritExp` int(11) NOT NULL,`hpLv` int(11) NOT NULL,`hpExp` int(11) NOT NULL, PRIMARY KEY (`leagueUid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
//sql = "SELECT *  FROM `activitydata` WHERE `type` = 33 ORDER BY `activitydata`.`data` ASC";
//sql = "SELECT *  FROM `activityData` WHERE `type` = 19 AND `dataTime` = 1443499200";
//sql = "SELECT *  FROM `payOrder` WHERE `payStatus` = 1 AND `createTime` > 1443499200";
//sql = "SELECT *  FROM `user` as a,`variable` as b WHERE a.`ingot` > 50000 and a.`userUid` = b.`userUid` and b.`name` = 'loginLog' and b.`value` > 1444924800";
//sql = "CREATE TABLE IF NOT EXISTS `globalFormation` (`userUid` bigint(20) NOT NULL,`formationUid1` bigint(20) NOT NULL DEFAULT '0',`formationUid2` bigint(20) NOT NULL DEFAULT '0',`formationUid3` bigint(20) NOT NULL DEFAULT '0',`formationUid4` bigint(20) NOT NULL DEFAULT '0',`formationUid5` bigint(20) NOT NULL DEFAULT '0',`formationUid6` bigint(20) NOT NULL DEFAULT '0',`formationUid7` bigint(20) NOT NULL DEFAULT '0',`formationUid8` bigint(20) NOT NULL DEFAULT '0', PRIMARY KEY (`userUid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='比武大会阵型';";
//sql = "ALTER TABLE `payOrder` ADD `payContent` TEXT NULL ;";
//sql = "select * from user where pUserId in (" + inStr + ");";
//sql = "SELECT *  FROM `hero` WHERE `break` >= 8";
//sql = 'DELETE FROM `serverData` WHERE `name` = "bossLevel"';
//sql = "ALTER TABLE `mail` ADD `delete` INT NOT NULL DEFAULT '0';";
//sql = "SELECT * FROM `leaguestar`;";
//var argList = [104036, 104037, 104074, 104031, 104039, 104045, 104065, 104064, 104079, 104080, 104058, 104066, 104057, 104055];
//var inStr = argList.join(",");

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var configData = configManager.createConfigFromCountry(country);
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            //sql = 'delete from item where itemId = BINARY "152258 ";';
            sql = "ALTER TABLE `variable` CHANGE `value` `value` TEXT NOT NULL ;";
            //sql = "delete from variable where name = 'morph:double'";
            //sql = "ALTER TABLE `user` CHANGE `ingot` `ingot` BIGINT( 30 ) NOT NULL DEFAULT '0' COMMENT '伊美加币';";
            //sql = "ALTER TABLE `user` CHANGE `gold` `gold` BIGINT( 30 ) NOT NULL DEFAULT '0' COMMENT '索尼';";
            //sql = "UPDATE `variable` SET `time` = '1458835200' WHERE `variable`.`userUid` in (" + inStr + ") AND `variable`.`name` = 'monthCard';";
            //sql = "delete from variable where name = 'morph:double' and (`value` LIKE '%null%' or `value` = '0');"
            //sql = "select * from variable where name = 'morph:double' and (`value` not LIKE '%startTime%' and `value` != '0');";
            //sql = "select userUid,userName,platformId,pUserId from user where pUserId in (701550);";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb(null);
                } else {
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            //sql = "delete from mail where reward like '%152258%';";
            //mysql.game(null, country, city).query(sql, function (err, res) {
            //    if (err) {
            //        console.log(city, err);
            //        queueCb(null);
            //    } else {
            //        dataSwap = res;
            //        queueCb(null);
            //        //mysql.game(null, country, city).end(queueCb); // if no db connect request later
            //    }
            //});
            queueCb();
        }, function (queueCb) {
            sql = "delete from variable where name = 'morph:double' and (`value` not LIKE '%startTime%' and `value` != '0');";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb(null);
                } else {
                    //dataSwap = res;
                    console.log(res);
                    queueCb(null);
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            // pvptop.toTopLimit(country, city, 10, function (err, res) {
            //     if (err) {
            //         queueCb(err, null);
            //     } else {
            //         queueCb(null, res);
            //     }
            // });
            queueCb();
        }, function (queueCb) {
            // pvptop.getTopLimit(country, city, 10, function (err, res) {
            //     if (err) {
            //         queueCb(err, null);
            //     } else {
            //         dataSwap = res;
            //         queueCb(null);
            //     }
            // });
            queueCb();
        }, function (queueCb) {
            // async.eachSeries(dataSwap, function (item, uCb) {
            //     sql = "SELECT * FROM `hero` WHERE `userUid` = " + item["userUid"];
            //     mysql.game(null, country, city).query(sql, function (err, res) {
            //         if (err) {
            //             console.log(city, err);
            //             uCb(null);
            //         } else {
            //             for (var i = 0; i < res.length; i++) {
            //                 var row = res[i];
            //                 var rowArr = [];
            //                 rowArr.push(country);
            //                 rowArr.push(city);
            //                 rowArr.push(row["userUid"]);
            //                 rowArr.push(row["heroId"]);
            //                 rowArr.push(row["level"]);
            //                 rowArr.push(row["break"]);
            //                 csv += rowArr.join(",");
            //                 csv += "\n";
            //                 //console.log(row);
            //             }
            //             uCb(null);
            //             //mysql.game(null, country, city).end(queueCb); // if no db connect request later
            //         }
            //     });
            // }, function (err, res) {
            //     queueCb(err);
            // });
            queueCb();
        }], function (err, res) {
            console.log(country, city, 'end', count);
            cb(err);
        });
    }, function (err) {
        console.log(country, 'end', count);
        forCb(null);
    });
}, function (err) {
    console.log(err);
    fs.writeFileSync("tableExport.csv", csv);
    process.exit();
});