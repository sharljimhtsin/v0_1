/**
 * User: liyuluan
 * Date: 14-3-25
 * Time: 下午5:13
 */


var mongo = require("../../alien/db/mongo");

//元宝消耗
var IngotExpendSchema = new mongo.Schema(
    {
        userUid:Number,
        ingot:Number, //元宝数
        typeId:String, //消耗类别
        time:{type:Number, default:Date.now}
    });

//元宝获得
var IngotReceiveSchema = new mongo.Schema(
    {
        userUid:Number,
        ingot:Number, //元宝数
        typeId:String,//获得类别
        time:{type:Number, default:Date.now}
    });


function getModelExpend(userUid) {
    return mongo.getModel(userUid, "IngotExpend", IngotExpendSchema);
}


function getModelReceive(userUid) {
    return mongo.getModel(userUid, "IngotReceive", IngotReceiveSchema);
}



//module.exports = Ingot;

exports.getModelExpend = getModelExpend;
exports.getModelReceive = getModelReceive;

