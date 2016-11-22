var mysql = require("../code/alien/db/mysql");
var async = require("async");
var fs = require("fs");
var modelUtil = require("../code/model/modelUtil");
var heroSoul = require("../code/model/heroSoul");
var debris = require("../code/model/debris");
var item = require("../code/model/item");
var user = require("../code/model/user");
var userVariable = require("../code/model/userVariable");
var readline = require('readline');

var stream = fs.createReadStream("./data.csv");
var rl = readline.createInterface({input: stream, terminal: false});
//rl.setPrompt('OHAI> ');
//rl.prompt();
var lines = [];
rl.on('line', function (line) {
    lines.push(line);
}).on('pause', function () {
}).on('resume', function () {
}).on('close', function () {
    console.log('file load OK');
    process(lines);
});

//var data = fs.readFileSync("data.csv", 'utf8');
//var lines = data.split("\n");
var count = 0;
function process(linez) {
    async.eachSeries(linez, function (line, eaCb) {
        count++;
        var args = line.split(",");
        var userUid = args[0];
        var itemId = args[3];
        var itemCount = args[4];
        var type = "";
        var error = false;
        async.series([function (seCb) {
            type = getTypeFromId(itemId);
            seCb();
        }, function (seCb) {
            getItemCount(userUid, itemId, type, function (err, res) {
                if (err) {
                    error = true;
                } else if (res >= itemCount) {
                    error = false;
                } else {
                    error = true;
                }
                seCb();
            });
        }, function (seCb) {
            if (error) {
                seCb();
            } else {
                modelUtil.addDropItemToDB(itemId, itemCount * -1, userUid, false, 1, seCb);
            }
        }], function (err, res) {
            console.log(count);
            eaCb(err);
        });
    }, function (err, res) {
        console.log(err ? err : "OK");
    });
}

function getItemCount(userUid, itemId, itemType, callbackFn) {
    switch (itemType) {
        case "heroSoul":
            heroSoul.getHeroSoulItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    callbackFn(null, res["count"]);
                }
            });
            break;
        case "debris":
            debris.getDebrisItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, 1);
                }
            });
            break;
        case "item":
            item.getItem(userUid, itemId, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res == null) {
                    callbackFn(null, 0);
                } else {
                    callbackFn(null, res["number"]);
                }
            });
            break;
        case "gold":
            user.getUserDataFiled(userUid, "gold", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        case "ingot":
            user.getUserDataFiled(userUid, "ingot", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        case "honor":
            userVariable.getVariable(userUid, "honor", function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, res);
                }
            });
            break;
        default :
            callbackFn();
            break;
    }
}

function getTypeFromId(id) {
    switch (id.substr(0, 2)) {
        case "10"://hero 魂魄
            return "heroSoul";
            break;
        case "11"://skill 技能  或者技能碎片
            return "debris";
            break;
        case "12"://装备
        case "13"://装备
        case "14"://装备
            return "equipment";
            break;
        case "15"://item
            return "item";
            break;
        case "17"://卡片
            return "card";
            break;
        case "44"://S级装备
            return "s";
            break;
        default:
            if (id == "gold") {
                return id;
            } else if (id == "ingot") {
                return id;
            } else if (id == "honor") {
                return id;
            } else if (id == "worldBossTeach") {
                return id;
            } else if (id == "teach") {
                return id;
            } else {
                return null;
            }
            break;
    }
}