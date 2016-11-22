var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var fs = require("fs");
var jutil = require("../code/utils/jutil");
var bitUtil = require("../code/alien/db/bitUtil");

var countryList = ['i'];
var csv = "country,city,userUid,userName,platformId,\n";
//var sql = "SELECT i.userUid as userUid, i.name as name, i.qq as qq, i.mobile as mobile, u.userName as userName, u.platformId as platformId FROM `userInformation`as i, `user` as u WHERE i.userUid = u.userUid and u.platformId in ('ucweb', 'a360', 'ios')";
var sql = "SELECT * FROM `user` WHERE vip>13";
var dataSwap = [{"leagueName": "Chris"}, {"leagueName": "流浪者之詩"}];
var dataSwap2 = {};
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var configData = configManager.createConfigFromCountry(country);
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    //var argList = [104036, 104037, 104074, 104031, 104039, 104045, 104065, 104064, 104079, 104080, 104058, 104066, 104057, 104055];
    //var argList = [30349983768, 30349983866, 30349984166, 30349996185, 30349996648, 30349996814, 30349998102, 30349998709, 30349999337, 30333207473, 30333218741, 30299655991, 30299658819, 30299661043, 30282883218, 30266097878, 30266109933, 30215766253, 30215767668, 30198994478, 30182217446, 30182221571, 30182222874, 30182225461, 30148673113, 30148676115, 30148677343, 30148687753, 30131881884, 30131882401, 30131882945, 30131899209, 30131908509, 30131908836, 30131911153, 30115107859, 30115132437, 30115136133, 30098333250, 30081558857, 30081567688, 30081571570, 30081584215, 30081584979, 30081594818, 30081603084];
    //var argList = [433391, 272877, 595261, 570295, 670785, 665034, 367229, 152380, 639544, 568377, 647206, 480357, 521097, 411580, 724164, 496165, 53030, 516436, 594401, 528674, 557318, 666025, 402257, 358888, 406621, 97974, 557318];
    var argList = [104064, 104065, 104112, 104113, 104114, 104045, 104031, 104058, 104066, 104057, 104055, 104024, 104027, 104059, 104063, 104062, 104061, 104070, 104068, 104069, 104056, 104067, 104036, 104051, 104071, 104060, 104039, 104074, 104037, 104087, 104078, 104075, 104076, 104077, 104081, 104082, 104079, 104080, 104089, 104090, 104091, 104092, 104093, 104094, 104095, 104096, 104097, 104098, 104099];
    var inStr = argList.join(",");
    async.forEachSeries(cityList, function (city, cb) {
        dataSwap = undefined;
        async.series([function (queueCb) {

            //sql = "SELECT *  FROM `activitydata` WHERE `type` = 33 ORDER BY `activitydata`.`data` ASC";
            //sql = "SELECT *  FROM `activityData` WHERE `type` = 19 AND `dataTime` = 1443499200";
            //sql = "SELECT *  FROM `payOrder` WHERE `payStatus` = 1 AND `createTime` > 1443499200";
            //sql = "SELECT *  FROM `user` as a,`variable` as b WHERE a.`ingot` > 50000 and a.`userUid` = b.`userUid` and b.`name` = 'loginLog' and b.`value` > 1444924800";
            //sql = "ALTER TABLE `equipment` ADD `attack` INT NOT NULL, ADD `defence` INT NOT NULL, ADD `hp` INT NOT NULL, ADD `spirit` INT NOT NULL, ADD `crit` INT NOT NULL, ADD `tough` INT NOT NULL, ADD `dodge` INT NOT NULL, ADD `hit` INT NOT NULL, ADD `break` INT NOT NULL, ADD `preventBreak` INT NOT NULL, ADD `critDamage` INT NOT NULL;";
            //sql = "ALTER TABLE `skill` ADD `attack` INT NOT NULL, ADD `defence` INT NOT NULL, ADD `hp` INT NOT NULL, ADD `spirit` INT NOT NULL, ADD `crit` INT NOT NULL, ADD `tough` INT NOT NULL, ADD `dodge` INT NOT NULL, ADD `hit` INT NOT NULL, ADD `break` INT NOT NULL, ADD `preventBreak` INT NOT NULL, ADD `critDamage` INT NOT NULL;";
            //sql = "ALTER TABLE `activityData` CHANGE `arg` `arg` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '额外的参数';"
            //sql = "ALTER TABLE `leagueMapLoot` ADD `mapId` INT( 11 ) NOT NULL;";
            //sql = "CREATE TABLE IF NOT EXISTS `leagueDragon` (`leagueUid` bigint(20) NOT NULL,`lv` int(11) NOT NULL,`exp` int(11) NOT NULL,`starId` int(11) NOT NULL,`attackLv` int(11) NOT NULL,`attackExp` int(11) NOT NULL,`defenceLv` int(11) NOT NULL,`defenceExp` int(11) NOT NULL,`spiritLv` int(11) NOT NULL,`spiritExp` int(11) NOT NULL,`hpLv` int(11) NOT NULL,`hpExp` int(11) NOT NULL, PRIMARY KEY (`leagueUid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
            //sql = "CREATE TABLE IF NOT EXISTS `globalFormation` (`userUid` bigint(20) NOT NULL,`formationUid1` bigint(20) NOT NULL DEFAULT '0',`formationUid2` bigint(20) NOT NULL DEFAULT '0',`formationUid3` bigint(20) NOT NULL DEFAULT '0',`formationUid4` bigint(20) NOT NULL DEFAULT '0',`formationUid5` bigint(20) NOT NULL DEFAULT '0',`formationUid6` bigint(20) NOT NULL DEFAULT '0',`formationUid7` bigint(20) NOT NULL DEFAULT '0',`formationUid8` bigint(20) NOT NULL DEFAULT '0', PRIMARY KEY (`userUid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='比武大会阵型';";
            //sql = "ALTER TABLE `payOrder` ADD `payContent` TEXT NULL ;";
            //sql = 'DELETE FROM `serverData` WHERE `name` = "bossLevel"';
            //sql = "ALTER TABLE `mail` ADD `delete` INT NOT NULL DEFAULT '0';";
            //sql = "SELECT * FROM `leaguestar`;";
            //sql = "ALTER TABLE `debris` ADD INDEX ( `userUid`, `skillId` ) ;";
            //sql = "DELETE FROM `mail` WHERE `delete` = 1;";
            //sql = "SELECT *  FROM `user` WHERE `ingot` > 100000";
            // sql = "SELECT count(*) as ct,`heroId` FROM `hero` WHERE `heroId` in (" + argList + ") group by `heroId`";
            //sql = "SELECT *  FROM `user` WHERE `vip` >= 5";
            if (dataSwap) {
                queueCb();
            } else {
                mysql.game(null, country, city).query(sql, function (err, res) {
                    if (err) {
                        console.log(city, err);
                        queueCb(null);
                    } else {
                        dataSwap = res;
                        queueCb(null);
                        //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                    }
                });
            }
        }, function (queueCb) {
            queueCb(null);
        }, function (queueCb) {
            queueCb(null);
        }, function (queueCb) {
            //async.eachSeries(dataSwap, function (row, esCb) {
            //    sql = "SELECT *  FROM `league` WHERE `leagueName` = " + row["leagueName"];
            //    mysql.game(null, country, city).query(sql, function (err, res) {
            //        if (res && res.length > 0) {
            //            var rowArr = [];
            //            rowArr.push(country);
            //            rowArr.push(city);
            //            rowArr.push(res[0]["founderUserUid"]);
            //            rowArr.push(res[0]["leagueName"]);
            //            rowArr.push(res[0]["leagueUid"]);
            //            csv += rowArr.join(",");
            //            csv += "\n";
            //        }
            //        esCb(err);
            //    });
            //}, function (err, res) {
            //    queueCb(err, res);
            //});
            queueCb();
        }, function (queueCb) {
            //redis.domain(country, city).s("wBossLevel").del(function (err, res) {
            //    console.log("OK");
            //    queueCb();
            //});
            //sql = "ALTER TABLE `activityData` CHANGE `arg` `arg` TEXT NOT NULL";
            //sql = "delete FROM `activityData` WHERE `type` = 35 AND `arg` NOT LIKE '%}'";
            //mysql.game(null, country, city).query(sql, function (err, res) {
            //    if (err) {
            //        console.log(city, err);
            //        queueCb(null);
            //    } else {
            //        //dataSwap = res;
            //        console.log(country, city, 'end');
            //        mysql.game(null, country, city).end(queueCb);
            //    }
            //});
            queueCb();
        }, function (queueCb) {
            //for (var row in dataSwap) {
            //    row = dataSwap[row];
            //    var chargeType;
            //    if (country == "d")
            //        chargeType = "ios";
            //    else
            //        chargeType = "android";
            //
            //    var payConfig = configData.getConfig("pay");
            //    var goodsConfig = payConfig[chargeType][row["productId"]];
            //    var singleIngot = goodsConfig == undefined ? 0 : goodsConfig["getImegga"];
            //    if (dataSwap2.hasOwnProperty(row["userUid"])) {
            //        dataSwap2[row["userUid"]] += singleIngot;
            //    } else {
            //        dataSwap2[row["userUid"]] = singleIngot;
            //    }
            //}
            queueCb();
        }, function (queueCb) {
            //async.eachSeries(Object.keys(dataSwap2), function (item, esCb) {
            //    rechargeRanking.addRecordCli(item, dataSwap2[item], function (err, res) {
            //        console.log(err, jutil.now(), item);
            //        esCb();
            //    });
            //}, function (err, res) {
            //    queueCb(err, res);
            //});
            queueCb();
        }, function (queueCb) {
            for (var row in dataSwap) {
                row = dataSwap[row];
                var rowArr = [];
                rowArr.push(country);
                rowArr.push(city);
                rowArr.push(row["userUid"]);
                rowArr.push(row["userName"]);
                rowArr.push(row["exp"]);
                rowArr.push(row["lv"]);
                rowArr.push(row["gold"]);
                rowArr.push(row["ingot"]);
                rowArr.push(row["vip"]);
                rowArr.push(row["cumulativePay"]);
                rowArr.push(row["platformId"]);
                rowArr.push(row["pUserId"]);
                rowArr.push(timeToData(row["createTime"]));
                csv += rowArr.join(",");
                csv += "\n";
            }
            queueCb();
        }], function (err, res) {
            console.log(country, city, 'end');
            cb(err);
        });
    }, function (err) {
        console.log(country, 'end');
        forCb(null);
    });
}, function (err) {
    console.log('write file start');
    fs.writeFileSync("tableExport.csv", csv);
    console.log('write file end');
    process.exit();
});

function timeToData(time) {
    var date;
    if (time < 2406312) {
        date = new Date(time * 1000 * 1000);
    } else {
        date = new Date(time * 1000);
    }
    var t = date.getFullYear() + "/";
    t += (date.getMonth() + 1) + "/";
    t += date.getDate() + " ";
    t += date.getHours() + ":";
    t += date.getMinutes() + ":";
    t += date.getSeconds();
    return t;
}