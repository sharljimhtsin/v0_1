/**
 * 重力修炼室
 * User: joseppe
 * Date: 14-12-17
 * Time: 下午21:47
 */
var jutil = require("../utils/jutil");
var gravity = require("../model/gravity");
var async = require("async");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];

    switch(action){
        case "vigour"://使用元气
            if (jutil.postCheck(postData, "heroUid") == false) {
                echo("postError");
                return false;
            }
            gravity.vigour(userUid, postData["heroUid"], function(err, res){
                if(err){
                    echo(err);
                } else {
                    for(var i in baseV){
                        res["heroData"][baseV[i]] = res["heroData"][baseV[i]]/10000;
                    }
                    echo(null, res);
                }
            });
            break;
        case "charge"://充元气
            var type = postData["type"] != undefined && postData["type"] == "ingot"?"ingot":"gold";
            gravity.charge(userUid, type, echo);
            break;
        case "getHero"://取英雄数据
            if (jutil.postCheck(postData, "heroUid") == false) {
                echo("postError");
                return false;
            }
            gravity.getHero(userUid, postData["heroUid"], function(err, res){
                if(err){
                    echo(err);
                } else {
                    for(var i in baseV){
                        res[baseV[i]] = res[baseV[i]]/10000;
                    }
                    echo(null, res);
                }
            });
            break;
        case "getGravity"://取元气
        default :
            gravity.getGravity(userUid, echo);
    }
    function echo(err, res){
        if(err)
            response.echo("practice.gravity", jutil.errorInfo(err));
        else{
            response.echo("practice.gravity", res);
        }
    }
}

var baseV = ["hpp","attackp","defencep","spiritp"];

exports.start = start;