/******************************************************************************
 * 宇宙第一联盟排行榜--cosmosLeagueEvaluation
 * Create by za.
 * key:actData21
 * Create at 15-1-15.
 *****************************************************************************/
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var ACTIVITY_CONFIG_NAME = "cosmosLeague";
var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var league = require("../model/league");
var gsData = require("../model/gsData");
var bitUtil = require("../alien/db/bitUtil");

//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME,function(err,res){
        if(err||res == null)callbackFn("configError");
        //活动开启状态
        if(res[0]){
            var sTime = res[4];
            var eTime = res[5];
            var activityArg = parseInt(res[1]);
            if(isNaN(activityArg))activityArg = 0;
            var currentConfig = null;
            if(activityArg == -1){
                // 取数据库配置，如果配置不存在取默认配置  PS:res[3]["1"]--json文件的默认格式，根据读取的文件订，可改（activityArg == -1同理）
                currentConfig = res[2]||res[3]["1"];
            }
            else{
                // 取指定配置，如果配置不存在取默认配置（一般去后台配置）
                currentConfig = res[3][activityArg]||res[3]["1"];
            }
            if(!currentConfig){
                callbackFn("configError");
            }else{
                callbackFn(null,[sTime,eTime,currentConfig]);
            }
        }
        //活动关闭状态
        else{
            callbackFn("notOpen");
        }
    });
}
//获取玩家的联盟信息
function getLeague(userUid,callbackFn){
    var leagueUid;//联盟ID
    var leagueContribution;//联盟贡献
    //取玩家所在的联盟ID
    user.getUser(userUid,function(err,res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res!=null && res["leagueUid"]!=null||res["leagueUid"]!=0){
            leagueUid = res["leagueUid"];
            leagueContribution = res["leagueContribution"];
        } else {
            callbackFn(",,,,,");
            return;
        }
        var mCode = bitUtil.parseUserUid(userUid);
        var mCountry = mCode[0];//大区
        var mCity = mCode[1];//分区

        var luId = leagueUid + '';//key
        luId += mCountry;
        luId += jutil.pad(mCity+'', 4, '0');//截取字符串后4位
        callbackFn(null,[leagueUid,luId,leagueContribution]);
    });
}
//添加玩家的消费记录
function addRecord(userUid,pay,callbackFn){
    var data = {"data":0};
    var key ="";
    var isAll = 0;//0为不跨服，1为跨服（根据配置判断）
    var reward;
    var sTime;
    var eTime;
    var luId;
    async.series([
        // 获取活动配置数据
        function(cb){
            getConfig(userUid,function(err,res){
                if(err||res == null)callbackFn("configError");
                else{
                    data["dataTime"] = res[0] - 0;
                    if(jutil.now() - res[0] > 86400){
                        cb("notOpen");
                        return;
                    }
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    reward = res[2]["reward"];
                    sTime = res[0];
                    eTime = res[1];
                    cb(null);
                }
            });
        },
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null || res["leagueUid"] == '' || res["leagueUid"] == 0){
                    cb('userError');
                } else {
                    var mCode = bitUtil.parseUserUid(userUid);
                    luId = res["leagueUid"] + '';//key
                    luId += mCode[0];
                    luId += jutil.pad(mCode[1]+'', 4, '0');//截取字符串后4位
                    cb(null);
                }
            });
        },
        function(cb){
            // 获取玩家消费数据
            activityData.getActivityData(userUid,activityData.PRACTICE_COSMOSLEAGUE,function(err,res){
                if(err){
                    cb(err);
                } else if(res != null && data["dataTime"] == res["dataTime"]){
                    data["data"] = res["data"] - 0 + pay;
                    cb(null);
                } else if(res != null && data["dataTime"] != res["dataTime"]){
                    data["data"] = pay;
                    data["status"] = 0;
                    data["statusTime"] = 0;
                    data["arg"] = '';
                    cb(null);
                }
            });
        },
        function(cb){
            getNumber(userUid, key, isAll, '24', luId, function(err, res){
                pay += res;
                cb(null);
            });
        },
        function(cb) {
            //添加彩票个数
            var time = eTime - jutil.now();
            var number = bitUtil.leftShift(pay,24)+time;//彩票个数
            async.eachSeries(Object.keys(reward),function(cType,esCb){
                if(jutil.now() < sTime + (cType-0)*3600){
                    redis[isAll?"loginFromUserUid":"domain"](userUid).z("cosmosLeague:"+key+":"+cType).add(number,luId,esCb);
                } else{
                    esCb(null);
                }
            },cb);
        },
        function(cb){
            //更新数据
            activityData.updateActivityData(userUid,activityData.PRACTICE_COSMOSLEAGUE,data,cb);
        }
    ],function(err,res){
        callbackFn(err,res);
    });
}
//排行榜
function getTopList(userUid, key, isAll, cType, callbackFn){//跟需求来判定排行人数
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("cosmosLeague:"+key+":"+cType).revrange(0 ,19 ,"WITHSCORES",function(err, res){
        var topList = [];
        for(var i = 0; i < res.length; i+=2){
            var number = bitUtil.rightShift(res[i+1]-0,24);//24
            topList.push({"leagueUid":res[i].substr(0, res[i].length-5),"number":number});
        }
        callbackFn(err, topList);
    });
}
//联盟消费数
function getNumber(userUid, key, isAll, cType,luId,callbackFn){
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("cosmosLeague:"+key+":"+cType).score(luId,function(err, res){
        var number = bitUtil.rightShift(res-0,24);//24
        callbackFn(err, number);
    });
}
//名次
function getTop(userUid,key, isAll, cType,luId,callbackFn){
    redis[isAll?"loginFromUserUid":"domain"](userUid).z("cosmosLeague:"+key+":"+cType).revrank(luId,callbackFn);
}
//设置领取奖励状态
function setRewardStatus(userUid, cType, callbackFn){
    var arg;
    //获取数据
    activityData.getActivityData(userUid, activityData.PRACTICE_COSMOSLEAGUE, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null){
            try{
                //三元运算，把参数转换为数组类型
                arg = res["arg"] == ''?{}:JSON.parse(res["arg"]);
            } catch (e){
                arg = {};
            }
            arg[cType] = 1;
            activityData.updateActivityData(userUid, activityData.PRACTICE_COSMOSLEAGUE,{"statusTime":jutil.now(),"arg":JSON.stringify(arg)}, callbackFn);
        }
    });
}
//获取领取奖励状态
function getRewardStatus(userUid, sTime, cType,callbackFn){
    var cStatus = 0;
    var arg;
    activityData.getActivityData(userUid, activityData.PRACTICE_COSMOSLEAGUE, function(err, res){
        if(err){
            callbackFn(err);
            return;
        }
        if(res != null && res["dataTime"] == sTime && res["arg"] != ''){
            try{
                arg = JSON.parse(res["arg"]);
            } catch (e){
                arg = {};
            }
            if(arg[cType] != undefined)
                cStatus = arg[cType];
        }
        callbackFn(err,cStatus);
    });
}

//设置数据统计
function setAnalytic(userUid, sTime, config,cType, callbackFn){
    if(parseInt(config["isAll"])){
        var topList = [];
        async.series([
            function(cb){
                getTopList(userUid, config["key"], parseInt(config["isAll"]),cType, function(err, res){
                    for(var i in res){
                        res[i]["top"] = i-0+1;
                        topList.push(res[i]);
                    }
                    cb(null);
                });
            },
            function(cb){
                async.eachSeries(topList, function(item, esCb){
                    user.getUser(item["userUid"], function(err, res){
                        item["userName"] = jutil.fromBase64(res["userName"]);
                        var mArr = bitUtil.parseUserUid(item["userUid"]);
                        try {
                            var serverList = require("../../config/" + mArr[0] + "_server.json")["serverList"];
                        } catch(err) {
                            esCb(null);
                            return;
                        }
                        item["serverName"] = serverList[mArr[1]]["name"];
                        esCb(null);
                    })
                }, cb);
            },
            function(cb){
                gsData.addGSDataInfo(userUid, "cosmosEvaluation", sTime, {"data":JSON.stringify(topList), "status":1}, cb);
            }
        ], callbackFn);
    } else {
        callbackFn(null);
    }
}

exports.getConfig = getConfig;//获取配置
exports.getLeague = getLeague;//获取玩家的联盟信息
exports.addRecord = addRecord;//添加玩家的消费记录
exports.getTopList = getTopList;//排行榜
exports.getNumber = getNumber;//联盟消费数
exports.getTop = getTop;//获取排名
exports.setRewardStatus = setRewardStatus;//设置领取奖励状态
exports.getRewardStatus = getRewardStatus;//获取领取奖励状态
exports.setAnalytic = setAnalytic;//设置数据统计
