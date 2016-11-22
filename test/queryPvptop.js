/**
 * Created by xiayanxin on 2016/9/9.
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var bitUtil = require("../code/alien/db/bitUtil");
var pvptop = require("../code/model/pvptop");
var formation = require("../code/model/formation");
var equipment = require("../code/model/equipment");
var card = require("../code/model/card");
var skill = require("../code/model/skill");
var hero = require("../code/model/hero");
var fs = require("fs");
var countryList = ['r'];
var dataSwap;
var csv = "country,city,userUid,userName,platformId,\n";

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
            pvptop.toTopLimit(country, city, 10, function (err, res) {
                if (err) {
                    queueCb(err, null);
                } else {
                    queueCb(null, res);
                }
            });
        }, function (queueCb) {
            pvptop.getTopLimit(country, city, 10, function (err, res) {
                if (err) {
                    queueCb(err, null);
                } else {
                    dataSwap = res;
                    queueCb(null);
                }
            });
        }, function (queueCb) {
            var tmpFormation = {};
            var tmpHero = {};
            var tmpEquip = {};
            var tmpSkill = {};
            var tmpCard = {};
            async.eachSeries(dataSwap, function (item, userCb) {
                if (item["userUid"] <= 2000) {
                    userCb("ROBOT");
                    return;
                }
                async.series([function (dataCb) {
                    formation.getUserFormation(item["userUid"], function (err, res) {
                        tmpFormation = res;
                        dataCb(err);
                    });
                }, function (dataCb) {
                    hero.getHero(item["userUid"], function (err, res) {
                        tmpHero = res;
                        dataCb(err);
                    });
                }, function (dataCb) {
                    equipment.getEquipment(item["userUid"], function (err, res) {
                        tmpEquip = res;
                        dataCb(err);
                    });
                }, function (dataCb) {
                    skill.getSkill(item["userUid"], function (err, res) {
                        tmpSkill = res;
                        dataCb(err);
                    });
                }, function (dataCb) {
                    card.getCardList(item["userUid"], function (err, res) {
                        tmpCard = res;
                        dataCb(err);
                    });
                }, function (dataCb) {
                    for (var form in tmpFormation) {
                        form = tmpFormation[form];
                        var rowArr = [];
                        rowArr.push(country);
                        rowArr.push(city);
                        rowArr.push(item["userUid"]);
                        rowArr.push(tmpHero[form["heroUid"]] ? tmpHero[form["heroUid"]]["heroId"] : "NULL");
                        rowArr.push(tmpSkill[form["skill2"]] ? tmpSkill[form["skill2"]]["skillId"] : "NULL");
                        rowArr.push(tmpSkill[form["skill3"]] ? tmpSkill[form["skill3"]]["skillId"] : "NULL");
                        rowArr.push(tmpEquip[form["equip1"]] ? tmpEquip[form["equip1"]]["equipmentId"] : "NULL");
                        rowArr.push(tmpEquip[form["equip2"]] ? tmpEquip[form["equip2"]]["equipmentId"] : "NULL");
                        rowArr.push(tmpEquip[form["equip3"]] ? tmpEquip[form["equip3"]]["equipmentId"] : "NULL");
                        rowArr.push(tmpCard[form["card1"]] ? tmpCard[form["card1"]]["cardId"] : "NULL");
                        rowArr.push(tmpCard[form["card2"]] ? tmpCard[form["card2"]]["cardId"] : "NULL");
                        rowArr.push(tmpCard[form["card3"]] ? tmpCard[form["card3"]]["cardId"] : "NULL");
                        rowArr.push(tmpCard[form["card4"]] ? tmpCard[form["card4"]]["cardId"] : "NULL");
                        rowArr.push(tmpCard[form["card5"]] ? tmpCard[form["card5"]]["cardId"] : "NULL");
                        rowArr.push(tmpCard[form["card6"]] ? tmpCard[form["card6"]]["cardId"] : "NULL");
                        csv += rowArr.join(",");
                        csv += "\n";
                    }
                    dataCb();
                }, function (dataCb) {
                    dataCb();
                    // async.eachSeries(tmpFormation,function (formationItem, formationCb) {
                    //     var realFormation = tmpFormation[formationItem];
                    //     async.series([function (heroCb) {
                    //
                    //     }],function (err, res) {
                    //         formationCb(err);
                    //     });
                    // },function (err, res) {
                    //     dataCb(err);
                    // });
                }], function (err, res) {
                    userCb(err);
                });
            }, function (err, res) {
                console.log(err);
                queueCb();
            });
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
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
    console.log(err);
    fs.writeFileSync("tableExport.csv", csv);
    process.exit();
});
