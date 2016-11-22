/**
 * User: liyuluan
 * Date: 14-5-16
 * Time: 下午6:11
 */


var jsondata = require("./ios");
var async = require("async");
var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");

var c = "d";

async.forEach(jsondata, function(item, cb) {

    async.forEach(item["hero"], function(item2, cb2) {
        var sql = "UPDATE hero SET ? WHERE heroUid=" + item2["heroUid"];
        var heroData = {};
        heroData["hp"] = item2["hp"];
        heroData["attack"] = item2["attack"];
        heroData["defence"] = item2["defence"];
        heroData["spirit"] = item2["spirit"];
        heroData["potential"] = item2["potential"];
        heroData["train"] = item2["train"];

        mysql.game(null, c, item["city"]).query(sql, heroData, function(err, res) {
            if (err) {
                console.log(item["userUid"], item2["heroId"],"hero失败");
            } else {
                console.log(item["userUid"], item2["heroId"],"hero成功");
            }
            cb2();
        });
    }, function(err, res) {
        console.log("hero处理完成");

        redis.user(item["userUid"]).s("hero").del();
    });

    var itemData = {};
    itemData["number"] = item["item"][0]["number"];

    var itemSql = "UPDATE item SET ? WHERE id=" + item["item"][0]["id"] + " AND userUid=" + item["userUid"];

    mysql.game(null, c, item["city"]).query(itemSql, itemData, function(err, res) {
        if (err) {
            console.log(item["userUid"], "item失败");
        } else {
            console.log(item["userUid"], "item成功");
        }
        redis.user(item["userUid"]).s("item").del();
    });


    var redeemPointData = {};
    redeemPointData["value"] = item["redeemPoint"][0]["value"];
    redeemPointData["time"] = item["redeemPoint"][0]["time"];

    var redeemPointSql = "UPDATE variable SET ? WHERE name='redeemPoint' AND userUid=" + item["userUid"];

    mysql.game(null, c, item["city"]).query(redeemPointSql, redeemPointData, function(err, res) {
        if (err) {
            console.log(item["userUid"], "redeemPoin失败");
        } else {
            console.log(item["userUid"], "redeemPoin成功");
        }
        redis.user(item["userUid"]).s("variable").del();
    });

    cb(null);


}, function(err, res) {


});




