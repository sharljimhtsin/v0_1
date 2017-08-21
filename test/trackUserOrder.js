/**
 * Created by xiazhengxin on 2017/7/21.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");
var fs = require("fs");
var argList = [78483822734, 78416714419, 78467042718, 77963742756, 77997287529, 78450268020, 78450264849, 78467044289, 78483824589, 78467049609, 77359806946, 78483817641, 78483821003, 78366380973, 77930181177, 78064397579, 78450266645, 78467043177, 78450267045, 78467043305, 78450265713, 78450266782, 78433490479, 78450267368, 78416707981, 78399937412, 78483818955, 77376521315, 78248939667, 77930180525, 77410088345, 78282494050, 78467047148, 78450267766, 78450267535, 78399935226, 77963742476, 78030839040, 77745631918, 78030841812, 78483817885, 78248942825, 78433490513, 78450268068, 78450267672, 78467040106, 78248942767, 78399933909, 78148274116, 78366377861, 78416710333, 78383154604, 78248941917, 77762416653, 77997286893, 78198607276, 78316044724, 77728903678, 78416708998, 78299272260, 77997287315, 77443638689, 78416713646, 78383159584, 77963726332, 78366376496, 78383158796, 77728862285, 78081170489, 78248937112, 77946956092, 78232164953, 78383154805, 77779195756, 77980507711, 77896623840, 78366376802, 78399931551, 78332825378, 78366378308, 77712083932, 77896614196, 78131496340, 77963742054, 78349599282, 78399933889, 77644960822, 78332821543, 78248936833, 78299271486, 78332823178, 78383157256, 77611402426, 78014063146, 78383153172, 78248941093, 78332823755, 77712087830, 78316044305, 78215381720, 77879843345, 78097941880, 78332821645, 78064389089, 77997286926, 78215383548, 77863085011, 77896618646, 78030834905, 78248941701, 78316048201, 77410085378, 77477191432, 77343003902, 78198603947, 78215382097, 77343003245, 77812751855, 77577858000, 77846298341, 77980501778, 77997281693, 78064396839, 78131499198, 77443638436, 77493967301, 77561070604, 77930169937, 77879849777, 77426856276, 77527523888, 77443647031, 78148275513, 77493960894, 77343006288, 77863083562, 77963736664, 78181828769, 77846306468, 77879839864, 77863089410, 77359744291, 77410084833, 77930179275, 77762412815, 78030831634, 77879840426, 77745642231, 77359743189, 77342988052, 77359744390, 77863081106, 77510746406, 77443639849, 77661745602, 77695308666, 78030832259, 77779190290, 77443629281, 77493967594, 77661749833, 77762409267, 77946948270, 77342990147, 77477183809, 77544299928, 77779186282, 77661749360, 77359753488, 77443635042, 77577850054, 77359743167, 77477187339, 77561069849, 77930181178, 78467039258, 78450265100, 78265717281, 78265713355, 77712087607, 77443644333, 78483816508, 78467044750, 78064393254, 77443642651, 78064397102, 78349601252, 77963723776, 78383154726, 78316044300, 78433490665, 78416709506, 78450265094, 78064386512, 77326208021, 78081168752, 78198612396, 78215381817, 78399937718, 78316048811, 78450266744, 77493964880, 77879836957, 78450266601, 78450268074, 78131494928, 78450267557, 78416714019, 77762411560, 77661751564, 78097940505, 77795963422, 78014063946, 77795966395, 78450262017, 77795972227, 78014055627, 77980499970, 78383153607, 78064397302, 78181831733, 78232158817, 78265718351, 78450268188, 78450267219, 78282494913, 77443629748, 78467045845, 77678523119, 77644957100, 77326212944, 78416714030, 78450265364, 78483816926, 78450267554, 78433491045, 78450268493, 78416712674, 78030842019, 78483819548, 78467045882, 78450266570, 78467049213, 78450267393, 78450266536, 77946948325, 78416714525, 78165056037];
var userList = [];
var csv = "";

async.forEachSeries(argList, function (userUid, forCb) {
    console.log(userUid, 'start');
    var sql = 'SELECT count(*) as ct FROM  `payOrder` WHERE  `orderMoney` >0 and `uin` != "test" and `createTime` between 1496894400 and 1498881600 and userUid = ' + userUid;
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) {
            console.log(userUid, err);
            forCb();
        } else {
            console.log(res);
            if (res[0]["ct"] == 0) {
                userList.push(userUid);
                csv += userUid.toString();
                csv += "\n";
            }
            forCb();
        }
    });
}, function (err) {
    console.log(userList);
    console.log('write file start');
    fs.writeFileSync("payOrderList.csv", csv);
    console.log('write file end');
    process.exit();
});