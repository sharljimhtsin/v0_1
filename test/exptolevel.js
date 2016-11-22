var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var bitUtil = require("../code/alien/db/bitUtil");
var async = require("async");
var user = require("../code/model/user");
var fs = require("fs");

var countryList = ['e'];
var sql = "SELECT * FROM `user` WHERE 1";
async.each(countryList, function(country, forCb) {
    console.log(country, 'start');
    var configData = configManager.createConfigFromCountry(country);
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for(var city in serverList){
        cityList.push(city);
    }
    async.eachSeries(cityList, function(city, cb) {
        mysql.game(null, country, city).query(sql, function(err, res) {
            if (err) {
                console.log(city,  err);
                cb(null);
            } else {
                async.eachSeries(res, function(uData, esCb){
                    if(uData["lv"] == undefined || uData["lv"] == "undefined" || uData["lv"] == 0) uData["lv"] = 1;
                    var newLvExp = configData.userExpToLevel(uData["lv"]-0, uData["exp"]-0);
                    if(newLvExp[0] == uData["lv"] && newLvExp[1] == uData["exp"]){
                        redis.user(uData["userUid"]).s("token").del(function(){});
                        redis.user(uData["userUid"]).h("h_user").del(esCb);
                        return;
                    }
                    mysql.game(null, country, city).query("update user set ? where userUid="+mysql.escape(uData["userUid"]), {"lv":newLvExp[0],"exp":newLvExp[1]}, function(err, res) {
						redis.user(uData["userUid"]).s("token").del(function(){});
                        redis.user(uData["userUid"]).h("h_user").del(esCb);
                    });
                },function(err,res){
                    console.log(country, city, 'end');
                    mysql.game(null, country, city).end(cb);
                })
            }
        });
        return;
    }, function(err) {
        console.log(country, 'end');
        forCb(null);
    });
}, function(err) {
    //console.log(csv);
});
