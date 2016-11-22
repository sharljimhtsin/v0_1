/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.crystalShop 灵石商店模块 需求：仅限灵石结晶购买
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var list = {};
    var crystalShop = {};
    var returnData = {};
    var currentConfig;
    var limi = 0;
    var refeshTime = [];
    var nowTime = 0;

    async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    limi = currentConfig["cShopLimitCt"]-0;
                    crystalShop = currentConfig["crystalShop"];
                    refeshTime = currentConfig["cShopFreshTime"];
                    returnData["nowTime"] = jutil.now();
                    cb(null);
                }
            });
        },function(cb){//取用户数据
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    if(res["arg"] == undefined){
                        cb("dbError");
                    }else{
                        list = res["arg"];
                        returnData["chips"] = list["chips"]-0;
                        if(list["crystalShop"][0] == undefined){
                            var cShop = [];
                            while(cShop.length < limi){
                                var randomRate = Math.random();
                                var p = 0;
                                for(var i in crystalShop){
                                    p += crystalShop[i]["prob"] - 0;
                                    if (randomRate <= p) {
                                        cShop.push({"id":crystalShop[i]["id"],"count":crystalShop[i]["count"],"costType":crystalShop[i]["costType"],"cost":crystalShop[i]["cost"]});
                                        break;
                                    }
                                }
                            }
                            list["crystalShop"] = cShop;
                            returnData["crystalShop"] = list["crystalShop"];
                            mat.setUserData(userUid,list,cb);
                        }else{
                            returnData["crystalShop"] = list["crystalShop"];
                            cb(null);
                        }
                    }
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("matrix.crystalShop.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.crystalShop.get",returnData);
        }
    });
}
exports.start = start;