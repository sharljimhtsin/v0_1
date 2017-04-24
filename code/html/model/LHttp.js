/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-18
 * Time: 下午4:15
 * To change this template use File | Settings | File Templates.
 */

Ext.define('LHttp', {
    statics:{
        uid:null,
        country:null,
        pw:null,
        url:"/admin?method=",
        post:function(method,data,callbackFn){
            var host = document.domain;
            var mUrl = LHttp.url+method+"&host="+host;
            if(LHttp.uid != null) {
                mUrl += "&uid="+LHttp.uid+"&country="+LHttp.country+"&pw="+LHttp.pw+"&gmPW=C9DA987779C51F22";
            }
            Ext.Ajax.request({
                url:mUrl,
                params:{"data":Ext.encode(data)},
                method:"POST",
                callback:function(mRequest,isSuccess,result) {
                    var mResponseJSON = Ext.decode(result["responseText"]);
                    callbackFn(mResponseJSON);

                }
            })
        },
        jsonp:function(method,data,callbackFn){
            var host = document.domain;
            var mUrl = LHttp.url+method+"&host="+host;
            if(this.isTest()){
                var port = 8900;
                switch(LHttp.country){
                    case 'c':
                        port = 8906;
                        break;
                    case 'd':
                        port = 8907;
                        break;
                    case 'e':
                        port = 8910;
                        break;
                    case 'f':
                        port = 8908;
                        break;
                    case 'g':
                        port = 8909;
                        break;
                    case 'h':
                        port = 8911;
                        break;
                    case 'i':
                        port = 8912;
                        break;
                    case 'j':
                        port = 8913;
                        break;
                    case 'k':
                        port = 8914;
                        break;
                    case 'l':
                        port = 8915;
                        break;
                    case 'm':
                        port = 8916;
                        break;
                    case 'n':
                        port = 8917;
                        break;
                    case 'o':
                        port = 8918;
                        break;
                    case 'p':
                        port = 8919;
                        break;
                    case 'q':
                        port = 8920;
                        break;
                    case 'r':
                        port = 8921;
                        break;
                    case 's':
                        port = 8922;
                        break;
                    case 't':
                        port = 8923;
                        break;
                }
                mUrl = "http://"+host+":"+port+LHttp.url+method+"&host="+host;
            }
            if(LHttp.uid != null) {
                mUrl += "&uid="+LHttp.uid+"&country="+LHttp.country+"&pw="+LHttp.pw+"&gmPW=C9DA987779C51F22";
            }
            if(this.isTest()){
                Ext.data.JsonP.request({
                    url:mUrl,
                    params:{"data":Ext.encode(data)},
                    success:function(mResponseJSON) {
                        callbackFn(mResponseJSON);
                    }
                });
            } else {
                Ext.Ajax.request({
                    url:mUrl,
                    params:{"data":Ext.encode(data)},
                    method:"POST",
                    callback:function(mRequest,isSuccess,result) {
                        var mResponseJSON = Ext.decode(result["responseText"]);
                        callbackFn(mResponseJSON);
                    }
                })
            }
        },
        isTest:function(){
            return document.domain == "dbztest.gt.com";
        },
        isDev:function(){
            var testList = ["dbztest.gt.com", "node.mysite.com", "test-df.gameforest.in.th", "detest.opogame.com", "183.129.161.38","127.0.0.1"];
            return testList.indexOf(document.domain) != -1 || document.domain.indexOf("172.24.16") != -1;
        }
    }
});