/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya.bag 赛亚人图阵模块(图阵)
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
function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;
    var returnData = {};
    var prismData = {};
    var prismCFG = {};
    var prism = [];
    var list ={};
    //展示：阵图值，已激活阵图，灵石
        async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    prismCFG = currentConfig["prism"];
                    for(var k in prismCFG){
                        if(k == 0){
                            prism.push({"prismData":prismCFG[k],"status":1});
                        }else{
                            prism.push({"prismData":prismCFG[k],"status":0});
                        }
                    }
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res["arg"];
                    returnData["chips"] = list["chips"]-0;
                    returnData["prismValue"] = list["prismValue"]-0;
                    returnData["activatePrism"] = list["activatePrism"]-0;
                    if(list["prism"][0] == undefined){
                        list["prism"] = prism;
                        returnData["prism"] = prism;
                        mat.setUserData(userUid,list,cb);
                    }else{
                        prismData = list["prism"];
                        returnData["prism"] = prismData;
                        cb(null);
                    }
                }
            });
    }],function(err,res){
        if(err){
            response.echo("matrix.prism.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.prism.get",returnData);
        }
    });
}
exports.start = start;