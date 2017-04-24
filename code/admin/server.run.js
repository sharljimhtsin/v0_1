/**
 * User: liyuluan
 * Date: 14-3-26
 * Time: 下午3:51
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var cprocess = require('child_process');
var async = require("async");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["serverModify"], query["country"]) == false) {
        response.echo("server.run", admin.AUTH_ERROR);
        return;
    }

    if (query["host"] != "dbztest.gt.com" && query["host"] != "127.0.0.1") {
        response.echo("server.run", jutil.errorInfo("postError"));
        return;
    }

    if (jutil.postCheck(postData, "run") == false) {
        response.echo("server.run", jutil.errorInfo("postError"));
        return;
    }

    process["httpServer"].timeout = 0;
    var country = query["country"];
    var runStr = postData["run"];
    var location = (postData["location"] == "" ? "EN" : postData["location"]);
    var runSh = testRun;
    admin.addOneOperationLog("system", query, postData);
    var sh = "pwd";
    if (runSh.hasOwnProperty(runStr)) {
        sh = runSh[runStr];
    }

    if (typeof(sh) == "object" && sh.hasOwnProperty(country)) {
        sh = sh[country];

        if (location != '' && sh.hasOwnProperty(location)) {
            sh = sh[location];
        }
    } else if (typeof(sh) == "function") {
        sh = sh(country, location);
    }
    //var dateString = jutil.formatTime(new Date()/1000,"YYYYmmdd");

    if (runStr == "doalltest") {
        var shs = sh.split(",");
    } else if (typeof(sh) == 'string') {
        shs = [sh];
    } else {
        shs = sh;
    }
    var echoStr = {};
    async.eachSeries(shs, function (sh, cb) {
        execShell(sh, function (res) {
            echoStr = res;
            cb(null);
        });
    }, function (err, res) {
        process["httpServer"].timeout = 200000;
        response.echo("server.run", echoStr);
    });

    function execShell(sh, callBack) {
        //sh = sh.replace("#DATE#",'v'+dateString);
        console.log("*******" + sh + "********");
        cprocess.exec(sh, function (error, stdout, stderr) {
            //console.log(error, stdout, stderr);
            var status = 1;
            if (error != null) {
                status = 0;
                console.log(error);
                callBack({"status": status, "err": stderr});
            } else {
                if (runStr == "rsynccode") {
                    callBack({"status": status, "url": "diff/" + version + ".txt"});
                } else {
                    callBack({"status": status});
                }
            }
        });
    }
}


exports.start = admin.adminAPIProxy(start);


var testRun = {
    "svncodeup": "svn up /data/svnCode/code -q",
    "svnnodeup": "svn up /data/svnCode/node -q",
    "codefenli": {
        "c": "node /data/node/dev/v0_1/test/tool/fenli.js CHS /data/htdocs/src/p91/ /data/svnCode/code/",
        "d": "node /data/node/dev/v0_1/test/tool/fenli.js CHS /data/htdocs/src/ios/ /data/svnCode/code/",
        "e": "node /data/node/dev/v0_1/test/tool/fenli.js CHT /data/htdocs/src/tw_android/ /data/svnCode/code/",
        "f": "node /data/node/dev/v0_1/test/tool/fenli.js CHS /data/htdocs/src/android/ /data/svnCode/code/",
        "g": "node /data/node/dev/v0_1/test/tool/fenli.js CHTIOS /data/htdocs/src/tw_ios/ /data/svnCode/code/",
        "h": {
            "EN": "node /data/node/dev/v0_1/test/tool/fenli.js EN /data/htdocs/src/en_android/ /data/svnCode/code/",
            "ENIOS": "node /data/node/dev/v0_1/test/tool/fenli.js ENIOS /data/htdocs/src/en_ios/ /data/svnCode/code/",
            "EN,ENTW": "node /data/node/dev/v0_1/test/tool/fenli.js EN,ENTW /data/htdocs/src/ken_android/ /data/svnCode/code/"
        },
        "i": "node /data/node/dev/v0_1/test/tool/fenli.js USA /data/htdocs/src/usa/ /data/svnCode/code/",
        "j": {
            "THAI": "node /data/node/dev/v0_1/test/tool/fenli.js THAI /data/htdocs/src/thai_android/ /data/svnCode/code/",
            "THAIIOS": "node /data/node/dev/v0_1/test/tool/fenli.js THAIIOS /data/htdocs/src/thai_ios/ /data/svnCode/code/"
        },
        "k": "node /data/node/dev/v0_1/test/tool/fenli.js RUS /data/htdocs/src/rus/ /data/svnCode/code/",
        "l": "node /data/node/dev/v0_1/test/tool/fenli.js SAIYA /data/htdocs/src/saiya/ /data/svnCode/code/",
        "m": "node /data/node/dev/v0_1/test/tool/fenli.js LEJU /data/htdocs/src/leju/ /data/svnCode/code/",
        "n": "node /data/node/dev/v0_1/test/tool/fenli.js BAXI /data/htdocs/src/baxi/ /data/svnCode/code/",
        "o": "node /data/node/dev/v0_1/test/tool/fenli.js YUENAN /data/htdocs/src/yuenan/ /data/svnCode/code/",
        "r": "node /data/node/dev/v0_1/test/tool/fenli.js SANGUO /data/htdocs/src/sanguo/ /data/svnCode/code/",
        "s": "node /data/node/dev/v0_1/test/tool/fenli.js 185 /data/htdocs/src/185/ /data/svnCode/code/",
        "t": "node /data/node/dev/v0_1/test/tool/fenli.js LIANYUN /data/htdocs/src/lianyun/ /data/svnCode/code/"
    },
    "codepacket": {
        "c": "node /data/node/dev/v0_1/test/tool/dabao.js CHS /data/htdocs/packet/p91/ /data/svnCode/code/",
        "d": "node /data/node/dev/v0_1/test/tool/dabao.js CHS /data/htdocs/packet/ios/ /data/svnCode/code/",
        "e": "node /data/node/dev/v0_1/test/tool/dabao.js CHT /data/htdocs/packet/tw_android/ /data/svnCode/code/",
        "f": "node /data/node/dev/v0_1/test/tool/dabao.js CHS /data/htdocs/packet/android/ /data/svnCode/code/",
        "g": "node /data/node/dev/v0_1/test/tool/dabao.js CHTIOS /data/htdocs/packet/tw_ios/ /data/svnCode/code/",
        "h": {
            "EN": "node /data/node/dev/v0_1/test/tool/dabao.js EN /data/htdocs/packet/en_android/ /data/svnCode/code/",
            "ENIOS": "node /data/node/dev/v0_1/test/tool/dabao.js ENIOS /data/htdocs/packet/en_ios/ /data/svnCode/code/",
            "EN,ENTW": "node /data/node/dev/v0_1/test/tool/dabao.js EN,ENTW /data/htdocs/packet/ken_android/ /data/svnCode/code/"
        },
        "i": "node /data/node/dev/v0_1/test/tool/dabao.js USA /data/htdocs/packet/usa/ /data/svnCode/code/",
        "j": {
            "THAI": "node /data/node/dev/v0_1/test/tool/dabao.js THAI /data/htdocs/packet/thai_android/ /data/svnCode/code/",
            "THAIIOS": "node /data/node/dev/v0_1/test/tool/dabao.js THAIIOS /data/htdocs/packet/thai_ios/ /data/svnCode/code/"
        },
        "k": "node /data/node/dev/v0_1/test/tool/dabao.js RUS /data/htdocs/packet/rus/ /data/svnCode/code/",
        "l": "node /data/node/dev/v0_1/test/tool/dabao.js SAIYA /data/htdocs/packet/saiya/ /data/svnCode/code/",
        "m": "node /data/node/dev/v0_1/test/tool/dabao.js LEJU /data/htdocs/packet/leju/ /data/svnCode/code/",
        "n": "node /data/node/dev/v0_1/test/tool/dabao.js BAXI /data/htdocs/packet/baxi/ /data/svnCode/code/",
        "o": "node /data/node/dev/v0_1/test/tool/dabao.js YUENAN /data/htdocs/packet/yuenan/ /data/svnCode/code/",
        "r": "node /data/node/dev/v0_1/test/tool/dabao.js SANGUO /data/htdocs/packet/sanguo/ /data/svnCode/code/",
        "s": "node /data/node/dev/v0_1/test/tool/dabao.js 185 /data/htdocs/packet/185/ /data/svnCode/code/",
        "t": "node /data/node/dev/v0_1/test/tool/dabao.js LIANYUN /data/htdocs/packet/lianyun/ /data/svnCode/code/"

    },
    "overwritenode": {
        "c": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/p91/v0_1/",
        "d": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/ios/v0_1/",
        "e": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/zkingnet_a/v0_1/",
        "f": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/android/v0_1/",
        "g": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/zkingnet_ios/v0_1/",
        "h": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/zkingneten/v0_1/",
        "i": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/europe/v0_1/",
        "j": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/thai/v0_1/",
        "k": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/rus/v0_1/",
        "l": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/saiya/v0_1/",
        "m": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/leju/v0_1/",
        "n": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/baxi/v0_1/",
        "o": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/yuenan/v0_1/",
        "r": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/sanguo/v0_1/",
        "s": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/185/v0_1/",
        "t": "rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/svnCode/node/v0_1/ /data/node/lianyun/v0_1/"
    },
    "publishcode": {
        "c": "sh /data/shell/rsync_p91_dragonballsrc",
        "d": "pwd",
        "e": "sh /data/shell/rsync_twandroid_dragonballsrc",
        "f": "pwd",
        "g": "sh /data/shell/rsync_twios_dragonballsrc",
        "h": {
            "EN": "sh /data/shell/rsync_enandroid_dragonballsrc",
            "ENIOS": "sh /data/shell/rsync_enios_dragonballsrc",
            "EN,ENTW": "sh /data/shell/rsync_kenandroid_dragonballsrc"
        },
        "i": "pwd",
        "j": {
            "THAI": "sh /data/shell/rsync_thaiandroid_dragonballsrc",
            "THAIIOS": "sh /data/shell/rsync_thaiios_dragonballsrc"
        },
        "k": "sh /data/shell/rsync_rus_dragonballsrc",
        "l": "sh /data/shell/rsync_saiya_dragonballsrc",
        "m": "sh /data/shell/rsync_leju_dragonballsrc",
        "n": "sh /data/shell/rsync_baxi_dragonballsrc",
        "o": "sh /data/shell/rsync_yuenan_dragonballsrc",
        "r": "sh /data/shell/rsync_sanguo_dragonballsrc",
        "s": "sh /data/shell/rsync_185_dragonballsrc",
        "t": "sh /data/shell/rsync_lianyun_dragonballsrc"
    },
    "publishnode": {
        "c": "sh /data/shell/rsync_p91_nodesrc",
        "d": "pwd",
        "e": "sh /data/shell/rsync_twandroid_nodesrc",
        "f": "pwd",
        "g": "sh /data/shell/rsync_twios_nodesrc",
        "h": {
            "EN": "pwd",
            "ENIOS": "pwd",
            "EN,ENTW": "pwd"
        },
        "i": "pwd",
        "j": "sh /data/shell/rsync_thai_nodesrc",
        "k": "sh /data/shell/rsync_rus_nodesrc",
        "l": "sh /data/shell/rsync_saiya_nodesrc",
        "m": "sh /data/shell/rsync_leju_nodesrc",
        "n": "sh /data/shell/rsync_baxi_nodesrc",
        "o": "sh /data/shell/rsync_yuenan_nodesrc",
        "r": "sh /data/shell/rsync_sanguo_nodesrc",
        "s": "sh /data/shell/rsync_185_nodesrc",
        "t": "sh /data/shell/rsync_lianyun_nodesrc"
    },
    "noderestart": {
        "c": "sh /data/node/p91/appctl.sh restart",
        "d": "sh /data/node/ios/appctl.sh restart",
        "e": "sh /data/node/zkingnet_a/appctl.sh restart",
        "f": "sh /data/node/android/appctl.sh restart",
        "g": "sh /data/node/zkingnet_ios/appctl.sh restart",
        "h": "sh /data/node/zkingneten/appctl.sh restart",
        "i": "sh /data/node/europe/appctl.sh restart",
        "j": "sh /data/node/thai/appctl.sh restart",
        "k": "sh /data/node/rus/appctl.sh restart",
        "l": "sh /data/node/saiya/appctl.sh restart",
        "m": "sh /data/node/leju/appctl.sh restart",
        "n": "sh /data/node/baxi/appctl.sh restart",
        "o": "sh /data/node/yuenan/appctl.sh restart",
        "r": "sh /data/node/sanguo/appctl.sh restart",
        "s": "sh /data/node/185/appctl.sh restart",
        "t": "sh /data/node/lianyun/appctl.sh restart"
    },
    "versiondev": {
        "c": "node /data/node/dev/v0_1/test/tool/version.js dev p91",
        "d": "node /data/node/dev/v0_1/test/tool/version.js dev ios",
        "e": "node /data/node/dev/v0_1/test/tool/version.js dev kingnet",
        "f": "node /data/node/dev/v0_1/test/tool/version.js dev android",
        "g": "node /data/node/dev/v0_1/test/tool/version.js dev kingnetios",
        "h": {
            "EN": "node /data/node/dev/v0_1/test/tool/version.js dev kingnetenglish",
            "ENIOS": "node /data/node/dev/v0_1/test/tool/version.js dev kingnetenglishios",
            "EN,ENTW": "node /data/node/dev/v0_1/test/tool/version.js dev kenkingnetenglish"
        },
        "i": "node /data/node/dev/v0_1/test/tool/version.js dev usa",
        "j": {
            "THAI": "node /data/node/dev/v0_1/test/tool/version.js dev thai",
            "THAIIOS": "node /data/node/dev/v0_1/test/tool/version.js dev thaiios"
        },
        "k": "node /data/node/dev/v0_1/test/tool/version.js dev rus",
        "l": "node /data/node/dev/v0_1/test/tool/version.js dev saiya",
        "m": "node /data/node/dev/v0_1/test/tool/version.js dev leju",
        "n": "node /data/node/dev/v0_1/test/tool/version.js dev baxi",
        "o": "node /data/node/dev/v0_1/test/tool/version.js dev yuenan",
        "r": "node /data/node/dev/v0_1/test/tool/version.js dev sanguo",
        "s": "node /data/node/dev/v0_1/test/tool/version.js dev 185",
        "t": "node /data/node/dev/v0_1/test/tool/version.js dev lianyun"
    },
    "versiontest": {
        "c": "node /data/node/dev/v0_1/test/tool/version.js p91 p91_test p91",
        "d": "node /data/node/dev/v0_1/test/tool/version.js ios ios_test ios",
        "e": "node /data/node/dev/v0_1/test/tool/version.js zkingnet_a kingnet_test tw_android",
        "f": "node /data/node/dev/v0_1/test/tool/version.js android android_test android",
        "g": "node /data/node/dev/v0_1/test/tool/version.js zkingnet_ios kingnetios_test tw_ios",
        "h": {
            "EN": "node /data/node/dev/v0_1/test/tool/version.js zkingneten_a kingnetenglish_test en_android",
            "ENIOS": "node /data/node/dev/v0_1/test/tool/version.js zkingneten_a kingnetenglishios_test en_ios",
            "EN,ENTW": "node /data/node/dev/v0_1/test/tool/version.js zkingneten_a kenkingnetenglish_test ken_andriod"
        },
        "i": "node /data/node/dev/v0_1/test/tool/version.js usa usa_test usa",
        "j": {
            "THAI": "node /data/node/dev/v0_1/test/tool/version.js thai thai_test thai_android",
            "THAIIOS": "node /data/node/dev/v0_1/test/tool/version.js thai thaiios_test thai_ios"
        },
        "k": "node /data/node/dev/v0_1/test/tool/version.js rus rus_test rus",
        "l": "node /data/node/dev/v0_1/test/tool/version.js saiya saiya_test saiya",
        "m": "node /data/node/dev/v0_1/test/tool/version.js saiya2 saiya2_test leju",
        "n": "node /data/node/dev/v0_1/test/tool/version.js baxi baxi_test baxi",
        "o": "node /data/node/dev/v0_1/test/tool/version.js yuenan yuenan_test yuenan",
        "r": "node /data/node/dev/v0_1/test/tool/version.js sanguo sanguo_test sanguo",
        "s": "node /data/node/dev/v0_1/test/tool/version.js 185 185_test 185",
        "t": "node /data/node/dev/v0_1/test/tool/version.js lianyun lianyun_test lianyun"
    },
    "versionline": {
        "c": "sh /data/node/dev/v0_1/test/tool/version.js p91 p91 p91",
        "d": "sh /data/node/dev/v0_1/test/tool/version.js ios ios ios",
        "e": "sh /data/node/dev/v0_1/test/tool/version.js zkingnet_a kingnet tw_android",
        "f": "sh /data/node/dev/v0_1/test/tool/version.js android android android",
        "g": "sh /data/node/dev/v0_1/test/tool/version.js zkingnet_ios kingnetios tw_ios",
        "h": {
            "EN": "node /data/node/dev/v0_1/test/tool/version.js zkingneten_a kingnetenglish en_android",
            "ENIOS": "node /data/node/ dev/v0_1/test/tool/version.js zkingneten_a kingnetenglishios en_ios",
            "EN,ENTW": "node /data/node/dev/v0_1/test/tool/version.js zkingneten_a kenkingnetenglish ken_andriod"
        },
        "i": "node /data/node/dev/v0_1/test/tool/version.js usa usa usa",
        "j": {
            "THAI": "node /data/node/dev/v0_1/test/tool/version.js thai thai thai_android",
            "THAIIOS": "node /data/node/dev/v0_1/test/tool/version.js thai thaiios thai_ios"
        },
        "k": "node /data/node/dev/v0_1/test/tool/version.js rus rus rus",
        "l": "node /data/node/dev/v0_1/test/tool/version.js saiya saiya saiya",
        "m": "node /data/node/dev/v0_1/test/tool/version.js leju leju leju",
        "n": "node /data/node/dev/v0_1/test/tool/version.js baxi baxi baxi",
        "o": "node /data/node/dev/v0_1/test/tool/version.js yuenan yuenan yuenan",
        "r": "node /data/node/dev/v0_1/test/tool/version.js sanguo sanguo sanguo",
        "s": "node /data/node/dev/v0_1/test/tool/version.js 185 185 185",
        "t": "node /data/node/dev/v0_1/test/tool/version.js lianyun lianyun lianyun"
    },
    "doalltest": "svncodeup,codepacket,versiontest,svnnodeup,overwritenode,noderestart",
    "doallline": "",
    "rsyncall": function (country, location) {
        var path = 'dev';
        if (codePath.hasOwnProperty(country)) {
            path = codePath[country];
        }
        if (typeof(path) == "object" && path.hasOwnProperty(location)) {
            path = path[location];
        }
        var dateString = jutil.formatTime("ymd", jutil.now());
        var num = 1;
        var fs = require("fs");
        var files = fs.readdirSync("/data/dragonballsrc/" + path + "/");
        for (var i in files) {
            if (files[i].substr(1, 6) == dateString && files[i].substr(7) - 0 >= num) {
                num++
            }
        }
        num = num + '';
        version = 'v' + dateString + (num.length == 1 ? '0' + num : '' + num);
        var vnum = 0;
        for (var i in files) {
            if (files[i].substr(1) - 0 > vnum)
                vnum = files[i].substr(1) - 0;
        }
        if (vnum != 0) {
            vnum = 'v' + vnum;
            var sh = "rsync -avn /data/htdocs/packet/" + path + "/ /data/dragonballsrc/" + path + "/" + vnum;

            cprocess.exec(sh, function (error, stdout, stderr) {
                fs.writeFileSync('/data/htdocs/diff/' + path + '_' + version + '.txt', stdout, 'utf8');
            });
        }
        var nPath = 'dev';
        if (nodePath.hasOwnProperty(country)) {
            nPath = nodePath[country];
        }
        var returnArr = [
            //"rsync -aq --exclude-from=/data/node/dev/v0_1/test/tool/rsync.exclude /data/node/"+nPath+"/v0_1/ /data/svnCode/node/"+nPath+"/",
            "rsync -aq /data/htdocs/packet/" + path + "/ /data/dragonballsrc/" + path + "/" + version
        ];
        return returnArr;
    }
};

var nodePath = {
    "a": "dev",
    "b": "dev",
    "c": "p91",
    "d": "ios",
    "e": "zkingnet_a",
    "f": "android",
    "g": "zkingnet_ios",
    "h": "zkingneten",
    "i": "usa",
    "j": "thai",
    "k": "rus",
    "l": "saiya",
    "m": "leju",
    "n": "baxi",
    "o": "yuenan",
    "r": "sanguo",
    "s": "185",
    "t": "lianyun"
};

var codePath = {
    "a": "dev",
    "b": "dev",
    "c": "p91",
    "d": "ios",
    "e": "tw_android",
    "f": "android",
    "g": "tw_ios",
    "h": {
        "EN": "en_android",
        "ENIOS": "en_ios",
        "EN,ENTW": "ken_android"
    },
    "i": "usa",
    "j": {
        "THAI": "thai_android",
        "THAIIOS": "thai_ios"
    },
    "k": "rus",
    "l": "saiya",
    "m": "leju",
    "n": "baxi",
    "o": "yuenan",
    "r": "sanguo",
    "s": "185",
    "t": "lianyun"
};

var version = '';