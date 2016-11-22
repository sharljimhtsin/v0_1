/**
 * User: liyuluan
 * Date: 14-5-27
 * Time: 上午11:14
 */


var mongo = require("../code/alien/db/mongo");
var async = require("async");

var IngotExpendSchema = new mongo.Schema(
    {
        userUid:Number,
        ingot:Number, //元宝数
        typeId:String, //消耗类别
        time:{type:Number, default:Date.now}
    });

var userUids = [
    17263865205
];

var IngotExpendData = {};

async.forEach(userUids, function(userUid, forCb) {
    var where = {"userUid":userUid, "typeId":{"$in":["9", "10", "11"]}, "time":{"$gt":1400947200000, "$lt":1400976900000}};

    mongo.game(userUid).model('IngotExpend', IngotExpendSchema).find(where, function(err, res) {
        if (err) {
            IngotExpendData[userUid] = null;
            forCb(null);
        } else {
            var arr = res || [];
            IngotExpendData[userUid] = {"9":0, "10":0, "11":0};
            for (var i = 0; i < arr.length; i++) {
                var arrItem = arr[i];
                var typeId = arrItem["typeId"];
                IngotExpendData[userUid][typeId]++;
            }
            forCb(null);
        }
    });
}, function(err, res) {
    console.log(IngotExpendData);
});



