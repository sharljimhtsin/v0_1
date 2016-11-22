/**
 * 数据收集
 * User: liyuluan
 * Date: 14-3-13
 * Time: 下午1:18
 */


var mysql = require("../alien/db/mysql");

function start(postData, response, query) {
    var m = query["type"];
    var city = query["code"] || 1;
    var country = query["country"] || "a";
    response.writeHead(200, {'Content-Type': 'text/plain', "charset":"utf-8"});
    if (m == "levelTop") {
        levelTop(country, city, function(err, res) {
            response.end(JSON.stringify(res, null, 2), "utf-8");
        });
    } else if (m == "pvpTop") {
        pvpTop(country, city, function(err, res) {
            response.end(JSON.stringify(res, null, 2), "utf-8");
        });
    } else if (m == "ltv") {
        var dateM = query["m"] || 0;
        var dateD = query["d"] || 1;

        ltv(country, city, dateM, dateD, function(err, res) {
            response.write("创建时间：" + dateM + "月" + dateD + "日\n");
            response.end(JSON.stringify(res, null, 2), "utf-8");
        });
    } else {
        response.end("请输入参数", "utf-8");
    }
}

function ltv(country, city, m, d,  callbackFn) {
    var sDate = new Date(2014, m - 1, d)/1000;
    var eDate = new Date(2014, m - 1, (d - 0) + 1) / 1000;

    if (isNaN(sDate) || isNaN(eDate)) {
        callbackFn(null, {});
        return;
    }

    var sql = "SELECT payOrder.orderMoney AS money, payOrder.createTime AS time " +
    "FROM user LEFT JOIN payOrder ON user.userUid=payOrder.userUid " +
    "WHERE user.createTime>" + sDate + " AND user.createTime<" + eDate + " AND payOrder.status=1";

    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) callbackFn(null, "");
        else {
            var arr = res || [];
            var returnObj = {};
            for (var i = 0; i < arr.length; i++) {
                var mTime = arr[i]["time"];
                var s = dateToString(mTime);
                if (returnObj[s] == null) {
                    returnObj[s] = 0;
                }
                returnObj[s] += (arr[i]["money"] - 0);
            }
            callbackFn(null, returnObj);
        }
    });
}



function dateToString(time) {
    var mDate = new Date(time * 1000);
    var m = mDate.getMonth() + 1;
    var d = mDate.getDate();
    return m + "-" + d;
}


//等级排行前50
function levelTop(country, city, callbackFn) {
    mysql.game(null, country, city).query("SELECT userUid, userName, exp FROM user ORDER BY exp DESC LIMIT 0, 50", function(err, res) {
        if (err) callbackFn(null, "");
        else callbackFn(null, res);
    });
}

//pvp排行前50
function pvpTop(country, city, callbackFn) {
    mysql.game(null, country, city).query("SELECT top, userUid FROM pvptop ORDER BY top  LIMIT 50", function(err, res) {
        if (err) callbackFn(null, "");
        else callbackFn(null, res);
    });
}










exports.start = start;
