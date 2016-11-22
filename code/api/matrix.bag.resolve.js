/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya 赛亚人图阵模块--图阵分解
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var currentConfig;
    var resolveCt = 0;
    var resolveItemId = "";
    var list = {};
    var prismData = {};
    var expItemId = "153678";
    var resolveInBag = {};
    var rateNum = 0;
    var bagData = [];
    var chips = 0;
    async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    resolveInBag = currentConfig["resolveInBag"];
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res["arg"];
                    bagData = list["bag"];
                    if(bagData[index] == undefined){
                        cb("typeError");
                    }else{
                        chips = list["chips"]-0;
                        prismData = bagData[index];
                        resolveItemId = prismData["id"];
                        resolveCt = prismData["count"]-0;
                        rateNum = resolveInBag[index] * resolveCt;
                        cb(null);
                    }
                }
            });
        },function(cb){
            var bList = [];
            for(var u in bagData){
                if(bagData[u]["id"] == resolveItemId){
                    continue;
                }else{
                    bList.push({"id":bagData[u]["id"],"count":bagData[u]["count"],"haveActivatePrism":bagData[u]["haveActivatePrism"],"canActivatePrism":bagData[u]["canActivatePrism"]});
                }
            }
            list["bag"] = bList;
            list["chips"] = chips + rateNum;//刷新碎片个数
            mat.setUserData(userUid,list,cb);
        },function(cb){//分解阵图
            item.updateItem(userUid,resolveItemId,-resolveCt,cb);
        },function(cb){//获得碎片
            item.updateItem(userUid,expItemId,rateNum,cb);
    }],function(err,res){
        if(err){
            response.echo("matrix.bag.resolve", jutil.errorInfo(err));
        } else{
            response.echo("matrix.bag.resolve",{"resolveId":resolveItemId,"resolveCt":resolveCt,"dropId":expItemId,"dropCt":rateNum,"chips":list["chips"]});
        }
    });
}
exports.start = start;