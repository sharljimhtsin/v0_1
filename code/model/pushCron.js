/**
 * 推送处理
 * User: joseppe
 * Date: 14-12-1
 * Time: 下午7:2
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var login = require("../model/login");
var userOnline = require("../alien/stats/userOnline");

var configManager = require("../config/configManager");
var async = require("async");
var userVariable = require("../model/userVariable");
var jutil = require("../utils/jutil");
var apns = require('apn');
var server = require("../alien/server/server");


/***
 * pvePower 体力
 * pvpPower 精力
 * eatbean12 仙豆中午
 * eatbean18 仙豆晚上
 * worldBoss 比鲁斯
 * daily 占卜
 * logout3 3天未登录
 * logout7 7天未登录
 */
var pushCF = [{"name":"pvePower","addFn":"addPvePower"},{"name":"pvpPower","addFn":"addPvpPower"},{"name":"eatbean12","h":12},{"name":"eatbean18","h":18},{"name":"worldBoss","h":12,"m":25},{"name":"daily"},{"name":"logout3","d":3,"addFn":"addNow"},{"name":"logout7","d":7,"addFn":"addNow"}];

var cronFun = function(){};

cronFun.prototype.addPvePower = function (userUid, userData, config) {
    var configData = configManager.createConfig(userUid);
    var oldPower = userData["pvePower"] - 0;
    var oldTime = userData["lastRecoverPvePower"] - 0;
    var mainConfig = configData.getConfig("main")
    var maxPower = mainConfig["maxPower"] - 0;
    var powerRecoverTime = mainConfig["powerRecoverTime"] - 0;
    if(maxPower - oldPower > 0){
        var addPower = maxPower - oldPower;
        var newTime = addPower*powerRecoverTime+oldTime;
        if(jutil.now() - newTime < 0){
            redis.domain(userUid).z("push:"+config["name"]).add(newTime, userUid, function(err, res) {});
        }
    }
}

cronFun.prototype.addPvpPower = function(userUid, userData, config){
    var configData = configManager.createConfig(userUid);
    var oldPower = userData["pvpPower"] - 0;
    var oldTime = userData["lastRecoverPvpPower"] - 0;
    var mainConfig = configData.getConfig("main")
    var maxPower = mainConfig["maxMana"] - 0;
    var powerRecoverTime = mainConfig["manaRecoverTime"] - 0;
    if(maxPower - oldPower > 0){
        var addPower = maxPower - oldPower;
        var newTime = addPower*powerRecoverTime+oldTime;
        if(jutil.now() - newTime < 0){
            redis.domain(userUid).z("push:"+config["name"]).add(newTime, userUid, function(err, res) {});
        }
    }
}

cronFun.prototype.addNow = function(userUid, userData, config){
    this.add(userUid, config, jutil.now());
}
cronFun.prototype.addDay = function(userUid, userData, config){
    this.add(userUid, config, jutil.todayTime());
}
cronFun.prototype.add = function(userUid, config, time){
    if(config["d"] != undefined){
        time += config["d"]*86400;
    }
    if(config["h"] != undefined){
        time += config["h"]*3600;
    }
    if(config["m"] != undefined){
        time += config["m"]*60;
    }
    if(jutil.now() > time){
        return;
    }
    redis.domain(userUid).z("push:"+config["name"]).add(time, userUid, function(err, res) {});
}

var cronFunRun = new cronFun();

userOnline.onOffine("push", function(offineUser) {
    if (offineUser == null) return;
    var mOffineList = offineUser[1];

    async.eachSeries(Object.keys(mOffineList), function(userUid, cb){
        var configData = configManager.createConfig(userUid);
        var pushConfig = configData.getConfig("push")
        var pushCF = pushConfig["task"];
        user.getUser(userUid, function(err, res){
            if(err || res == null){
                cb(null);
            } else {
                var userData = res;
                for(var i in pushCF){
                    if(pushCF[i]["addFn"] != undefined && cronFunRun[pushCF[i]["addFn"]] && typeof(cronFunRun[pushCF[i]["addFn"]]) == 'function'){
                        cronFunRun[pushCF[i]["addFn"]](userUid, userData, pushCF[i]);
                    } else {
                        cronFunRun.addDay(userUid, userData, pushCF[i]);
                    }
                }
                cb(null);
            }
        });
    }, function(err, res){
    });
});

function toPush(county, city, h, m, callbackFn){
    var path = server.getPath();
    var configData = configManager.createConfigFromCountry(county);
    var pushConfig = configData.getConfig("push")
    var options = pushConfig["options"];
    if(options == null){
        setTimeout(function(){
            callbackFn(null);
        }, 10);
        return;
    }
    var certFile = "cert.pem";
    var keyFile = "key.pem";
    options["cert"] = require("path").normalize(path+"/../pushkey/"+county+"/")+certFile;
    options["key"] = require("path").normalize(path+"/../pushkey/"+county+"/")+keyFile;
    options["production"] = true;
    var apnsConnection = new apns.Connection(options);
    var pushCF = pushConfig["task"];

    async.eachSeries(pushCF, function(config, cb){
        var note = new apns.Notification();
        note.expiry = jutil.now() + 3600; // Expires 1 hour from now.
        note.badge = 1;
        note.sound = config["sound"];//'ping.aiff';
        note.alert = config["msg"];//'You have a new message';
        note.payload = config["payload"];//{'messageFrom': 'Caroline'};
        var device = [];
        redis.domain(county, city).z("push:"+config["name"]).remGetRangeByScore(0, jutil.now(), function(err, res){
            var userArr = [];
            for (var i = 0; i < res.length; i+= 2) {
                userArr.push(res[i]);
            }
            async.eachSeries(userArr, function(userUid, esCb){
                user.getToken(userUid,function(err, res){
                    if(err || res == null){
                        esCb(null);
                    } else if(pushWhileArr.indexOf(res) != -1) {
                        device.push(res);
                        esCb(null);
                    } else {
                        device.push(res);
                        esCb(null);
                    }
                });
            },function(err, res){
                if(device.length > 0){
                    apnsConnection.pushNotification(note,device);
                }
                cb(null);
            });
        });
    },function(err, res){
        callbackFn(null);
    });
}

function online(userUid){
    var configData = configManager.createConfig(userUid);
    var pushConfig = configData.getConfig("push")
    var pushCF = pushConfig["task"];
    for(var i in pushCF){
        var config = pushCF[i];
        redis.domain(userUid).z("push:"+config["name"]).rem(userUid);
    }
}
exports.toPush = toPush;
exports.online = online;

var pushWhileArr = [
    "d5ef2ab032706d881d007a7c8982ded4cfaecbab54111b6a7fbc0c3603705778",
    "a18f44c2e3943e760e3c32c41cbbd938d17cceecb77e07ed90a35c876f00a4f4",
    "32a5dc8a42917df4a71786aa4de5b25acf3e956802d26ed29d582125ece690a8",
    "47748e9f59eb574ef589c858baa2ad6fe49ca48ec90a2ba091c1416d5fefc629",
    "d686944bfc42766f1dbf8a2e376258e6f61b58b46115b2bdf934188f63087432",
    "a8f25a6faf7fbd81ea18dee83280d95303d4bc7fd03007488c205fd0404aee64",
    "a447b1c1909809d078601c12e6da732dcc018af269dc742696fd5ce9e36634f2"
]