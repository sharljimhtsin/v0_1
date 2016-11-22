/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya.bag 赛亚人图阵模块(背包)
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
    var bagData = [];
    var returnData = {};
    var tzItemType = 59;
    var list = {};
    var prismData = {};
    //展示：阵图值，已激活阵图，灵石   图阵id:155900,155901 itemType:59
    async.series([function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else if(res["arg"] == undefined || res["arg"]["prism"] == undefined){
                    cb("dbError");
                }else{
                    list = res["arg"];
                    prismData = list["prism"];
                    returnData["chips"] = list["chips"]-0;
                    cb(null);
                }
            });
        },function(cb){
            item.getItems(userUid,function(err,res){
                if(err)cb(err);
                else{
                    if(res == null || res.length == 0)cb("noItem");
                    else{
                        var itemData = res;
                        for(var i in itemData){
                            var id = i.substr(2,2);
                            if(tzItemType == id){
                                bagData.push({"id":itemData[i]["itemId"],"count":itemData[i]["number"],"haveActivatePrism":0,"canActivatePrism":0});
                            }else{
                                continue;
                            }
                        }
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            if(bagData.length <= 0){
                cb(null);
            }else{
                for(var p in bagData){
                    for(var a in prismData){
                        for(var b in prismData[a]["prismData"]){
                            if(prismData[a]["prismData"][b]["id"] == bagData[p]["id"]){
                                bagData[p]["canActivatePrism"]++;
                            }
                        }
                    }
                }
                cb(null);
            }
        },
        function(cb){
            list["bag"] = bagData;
            returnData["bag"] = list["bag"];
            mat.setUserData(userUid,list,cb);
    }],function(err,res){
        if(err){
            response.echo("matrix.bag.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.bag.get",returnData);
        }
    });
}
exports.start = start;