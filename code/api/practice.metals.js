/**
 * 魔人炼金
 * User: joseppe
 * Date: 14-3-11
 * Time: 下午18:27
 */

var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var practice = require("../model/practice")
var async = require("async");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

/**
 * practice.eatbean
 * @param postData
 * @param response
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var mainConfig = configData.getConfig("alchemy");
    //var maxTimes = mainConfig.length;
    var times = 0;
    var metalsConfig = {};
    var backMoney = 0;
    var userData = null;
    var ingot = 0;
    async.series([
        function(callback){//取得用户炼金次数，和相应的配置文件
            userVariable.getVariable(userUid, 'metals', function(err, res){
                if(err){
                    callback(err);
                }else{
                    if(res == null){
                        times = 1;
                    }else{
                        times = res;
                    }
                    metalsConfig = mainConfig[times];
                    if(typeof metalsConfig == 'undefined')
                        callback('times error');
                    else
                        callback(null);
                }
            } );
        },
        function(callback){//判断用户当前币是否足够支付
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser");
                }else{
                    userData = res;
                    var createTime = res['createTime'];
                    var startTime = Math.floor(new Date(2014, 2, 21, 0, 0).getTime()/1000);
                    createTime = createTime < startTime?startTime:createTime;
                    ingot = res.ingot;
                    if(ingot < metalsConfig['putMoney']){
                        callback('ingot is not enough');
                    }else if(jutil.now() - createTime > 345600){
                        callback('time out');
                    }else{
                        callback(null);
                    }
                }
            });
        },
        function(callback)//计算随机值
        {
            var r = Math.random();
            var sum = 0;
            for(var i in metalsConfig['backProb'])
            {
                var data = metalsConfig['backProb'][i];
                if(r >= sum && r < sum+data['prob']){
                    backMoney = data['back'];
                    break;
                }
                sum += data['prob'];
            }
            callback(null);
        },
        function(callback){//为用户更新币
            ingot = ingot - metalsConfig['putMoney'] + backMoney;
            var updateData = {'ingot':ingot};
            stats.recordWithLevelIndex(times, [mongoStats.practiceMetals1, mongoStats.practiceMetals2, mongoStats.practiceMetals3, mongoStats.practiceMetals4, mongoStats.practiceMetals5], function (tag) {
                stats.events(userUid, "127.0.0.1", null, tag);
            });
            practice.addAlchemyNews(userUid, userData["userName"], backMoney);
            user.updateUser(userUid,updateData,function(err,res) {
                if (err)
                    callback("dbError");
                else {
                    callback(null);
                }
            });
        },
        function(callback){//为用户增加炼金次数
            times++;
            userVariable.setVariable(userUid, 'metals', times,function(err, res){
                callback(err,res);
            });
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo('error', resDate);
            //callBack(err,null);
        }else{
            var userIP = "127.0.0.1";
            mongoStats.expendStats("ingot",userUid,userIP,null,mongoStats.E_PRACTICEMETALS,metalsConfig['putMoney']);
            var resDate = {"ingot":ingot,"addedIngot":backMoney};
            response.echo('practice.metals', resDate);
        }
    });
}

exports.start = start;