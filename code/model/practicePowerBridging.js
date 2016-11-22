/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-4-1
 * Time: 下午12:29
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityConfig = require("../model/activityConfig");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var async = require("async");
var mysql = require("../alien/db/mysql");
var hero = require("../model/hero");
var mongoStats = require("../model/mongoStats");
var redis = require("../alien/db/redis");
var heroSoul = require("../model/heroSoul");
var itemModel = require("../model/item");


/**
 * 获取玩家保存的能量晋阶活动数据
 * @param userUid
 * @param callbackFn
 */
exports.get = function(userUid, callbackFn) {

    var heroUid = null;
    var heroInfo = null;
    var userInfo = null;
    var configData = configManager.createConfig(userUid);

    async.series([

        // 检查玩家是否存在
        function(cb){
            user.getUser(userUid, function(err, res){
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb("dbError");
                } else {
                    userInfo = res;
                    cb(null);
                }
            });
        },

//        // 检查玩家等级是否大于12
//        function(cb) {
//            var level = configData.userExpToLevel(userInfo["exp"]);
//            if (level < 12) {
//                cb("userLevelNotMatch");
//            } else {
//                cb(null);
//            }
//        },

        // 获取选择的卡片数据
        function(cb) {
            redis.user(userUid).s("PowerBridging").getObj(function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        heroUid = res["heroUid"];
                    }
                    cb(null);
                }
            });
        },

        // 获取卡片的充能情况
        function(cb) {
            if (heroUid == null) {
                cb(null);
                return;
            }

            hero.getHero(userUid, function(err, res){

                if (err) cb(err);
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        if (!res.hasOwnProperty(heroUid)) {
                            redis.user(userUid).s("PowerBridging").del(function(){
                                cb(null);// 缓存的数据失效，删除
                            });
                        } else {
                            heroInfo = res[heroUid];
                            cb(null);
                        }
                    }
                }
            });
        }

    ], function(err){
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, heroInfo || {});
        }
    });
};

/**
 * 使用能量球
 * @param userUid
 * @param ballNum
 * @param callbackFn
 */
exports.useBall = function(userUid, ballNum, callbackFn) {

    var heroUid = null;
    var heroInfo = null;

    var userConfig = configManager.createConfig(userUid);
    var energyBallCfg = userConfig.getConfig("enegyBall");

    var heroEBC = null;

    var newItemNumber = 0;  // 使用能量球后剩余的能量球数量
    var energyAdd = 0;  // 能量获取
    var addRes = null;  // 额外道具获取

    async.series([

        // 检查玩家是否存在
        function(cb){
            user.getUser(userUid, function(err, res){
                if (err || res == null) {
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },

        // 获取选择的卡片数据
        function(cb) {
            redis.user(userUid).s("PowerBridging").getObj(function(err, res){
                if (err) cb("dbError");
                else {
                    if (res) {
                        heroUid = res["heroUid"];
                    }
                    cb(null);
                }
            });
        },

        // 获取卡片的充能情况
        function(cb) {
            if (heroUid == null) {
                cb("noHeroSelected");
                return;
            }

            hero.getHero(userUid, function(err, res){
                if (err) cb("dbError");
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        if (!res.hasOwnProperty(heroUid)) {
                            cb("dbError");
                        } else {
                            heroInfo = res[heroUid];
                            cb(null);
                        }
                    }
                }
            });
        },

        // 获取当前英雄的能量球配置
        function(cb) {
            if (!heroInfo) {
                cb("dbError");
                return;
            }

            var heroId = heroInfo["heroId"];

            if (energyBallCfg.hasOwnProperty(heroId)) {
                heroEBC = energyBallCfg[heroId];
            }

            if (!heroEBC) {
                cb("configError");
                return;
            }

            cb(null);
        },

        /**
         * 判断能量球是否足够
         * @param cb
         */
        function(cb) {
            itemModel.getItem(userUid, "152301", function(err, res) {
                if (err) cb("dbError");
                else {
                    var ballNum = 0;
                    if (res) {
                        ballNum = res["number"];
                    }

                    if (ballNum < heroEBC["clickNeedBall"]) {
                        cb("noEnoughBall");
                    } else {
                        cb(null);
                    }
                }
            });
        },

        // 充能
        function(cb) {

            var energy = heroInfo["energy"];
            energy = parseInt(energy);
            if (isNaN(energy)) energy = 0;

            // 检查是否已经充满
            if (energy >= heroEBC["getSoulNeedBall"]) {
                cb("alreadyPowerFull");
                return;
            }

            // 计算暴击
            var crit = (Math.random() <= heroEBC["crit"]);
            if (crit) {
                ballNum = ballNum * 2;
            }

            energyAdd = ballNum;

            energy += ballNum;

            hero.updateHero(userUid, heroInfo["heroUid"],{
                "energy" : energy
            }, function(err, res){
                if (err) cb("dbError");
                else {
                    heroInfo["energy"] = energy;

                    if (crit) {
                        // 玩家获得额外灵魂
                        var soulId = heroInfo["heroId"];
                        mongoStats.dropStats(soulId, userUid, '127.0.0.1', null, mongoStats.ENERGY_BALL, 1);
                        heroSoul.addHeroSoul(userUid, soulId, 1, function(err, res){
                            if (err) {console.error(err); cb(null);}
                            else {
                                addRes = res;
                                cb(null);
                            }
                        });
                    } else {
                        cb(null);
                    }
                }
            });
        },

        // 扣除玩家能量球
        function(cb) {
            var minusBall = heroEBC["clickNeedBall"];
            itemModel.updateItem(userUid, "152301", -minusBall, function(err, res) {
                if (err) console.error("dbError");
                else if (res != null) {
                    mongoStats.expendStats("152301", userUid, '127.0.0.1', null, mongoStats.ENERGY_BALL, minusBall);
                    newItemNumber = res["number"];
                }
                cb(null);
            });
        }

    ], function(err){
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, {
                "heroInfo" : heroInfo,
                "ballNum" : newItemNumber,
                "add" : {
                    "powerAdd" : energyAdd,
                    "res" : addRes
                }
            });
        }
    });
};

/**
 * 充能
 * @param userUid
 * @param callbackFn
 */
exports.addPower = function(userUid, callbackFn){
    var heroUid = null;
    var heroInfo = null;

    var userConfig = configManager.createConfig(userUid);
    var energyBallCfg = userConfig.getConfig("enegyBall");

    var heroEBC = null;

    var rwInfo = null;

    async.series([

        // 检查玩家是否存在
        function(cb){
            user.getUser(userUid, function(err, res){
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },

        // 获取选择的卡片数据
        function(cb) {
            redis.user(userUid).s("PowerBridging").getObj(function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        heroUid = res["heroUid"];
                    }
                    cb(null);
                }
            });
        },

        // 获取卡片的充能情况
        function(cb) {
            if (heroUid == null) {
                cb(null);
                return;
            }

            hero.getHero(userUid, function(err, res){

                if (err) cb(err);
                else {
                    if (res == null) {
                        cb("dbError");
                    } else {
                        if (!res.hasOwnProperty(heroUid)) {
                            cb("dbError");
                        } else {
                            heroInfo = res[heroUid];
                            cb(null);
                        }
                    }
                }
            });
        },

        // 获取当前英雄的能量球配置
        function(cb) {
            if (!heroInfo) {
                cb("dbError");
                return;
            }

            var heroId = heroInfo["heroId"];

            if (energyBallCfg.hasOwnProperty(heroId)) {
                heroEBC = energyBallCfg[heroId];
            }

            if (!heroEBC) {
                cb("configError");
                return;
            }

            cb(null);
        },

        // 检查是否可以充能
        function(cb) {

            var energy = heroInfo["energy"];
            energy = parseInt(energy);
            if (isNaN(energy)) energy = 0;

            if (energy >= heroEBC["getSoulNeedBall"]) {
                cb(null);
            } else {
                cb("noEnoughPower");
            }
        },

        // 充能
        function(cb) {
            // 给玩家发道具
            var rewardId = heroEBC["targetSoul"];

            mongoStats.dropStats(rewardId, userUid, '127.0.0.1', null, mongoStats.ENERGY_BALL, 1);
            heroSoul.addHeroSoul(userUid, rewardId, 1, function(err, res){
                if (err) cb("dbError");
                else {
                    rwInfo = res;
                    cb(null);
                }
            });
        },

        // 扣除卡片能量
        function(cb) {
            var energy = heroInfo["energy"];
            energy = parseInt(energy);

            energy -= heroEBC["getSoulNeedBall"];

            hero.updateHero(userUid, heroInfo["heroUid"],{
                "energy" : energy
            }, function(err, res){
                if (err) cb(err);
                else {
                    heroInfo["energy"] = energy;
                    cb(null);
                }
            });
        }

    ], function(err){
        if (err) {
            callbackFn(err, null);
        } else {
            callbackFn(null, {
                "rwInfo" : rwInfo,
                "heroInfo" : heroInfo
            });
        }
    });
};