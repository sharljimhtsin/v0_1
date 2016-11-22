//var async = require("./async.js");
function NoticeView() {
    function getTotleServer(){
        var returnData = [];
        var addAll = {boxLabel: "添加所有分区", name: "all",checked: true,listeners: {afterrender: function (obj) {
            obj.getEl().last().last().last().first().dom.onclick = function (obj) {
                var checkGroup = Ext.getCmp('noticeChang').items;
                var checkL = checkGroup.length;
                var check = checkGroup.get(0).checked == false ? true : false;
                for(var j = 1 ; j < checkL ; j ++){
                    var item = checkGroup.get(j);
                    item.setValue(check);
                }
            }
        }
        }};
        returnData.push(addAll);
        for(var i = 0 ; i < gData["serverList"].length ; i ++){
            var name = gData["serverList"][i][1];
            var id = gData["serverList"][i][0];
            if(id == Ext.getCmp("cityA").value || id == '0') continue;
            var obj = {boxLabel: name, name: id,checked: true};
            returnData.push(obj);
        }
        return returnData;
    }
    var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:gData["serverList"]
    });
    var noticeStore = Ext.create("Ext.data.ArrayStore",{
        fields:["id","channel","sort","title","scrollText","text","stime","etime"],
        data:[]
    });

    var languageComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:languageData
    });
    var language = Ext.util.Cookies.get("language") == null ? languageData[0][0] : Ext.util.Cookies.get("language");
    var cashServer = Ext.util.Cookies.get("country") == null ? platformData[0][0] : Ext.util.Cookies.get("country");

    var platform = Ext.util.Cookies.get();
    Ext.Msg.alert("国家： =>" + JSON.stringify(cashServer),"语言： =>" + JSON.stringify(language));//cData["cityList"]

//    var xx = JSON.stringify(cashServer);
    console.log(cashServer);//country,language
//    ["de","德文"], ["fr","法语"],["es","西班牙]  country:r,s,t  根据country判断用某国语言language
    if(cashServer == "r"){
        console.log("法语",language);
    }else if(cashServer == "s"){
        console.log("德语",language);
    }else if(cashServer == "t"){
        console.log("西班牙语",language);
    }else{
        console.log("...");
    }
//    Ext.getCmp('paramKey').getValue()



    var formFun = function(data){
        data["stime"] = data["stime"] != null ? data["stime"] * 1000 : (new Date(2015,0,1)).getTime();
        data["etime"] = data["etime"] != null ? data["etime"] * 1000 : (new Date(2028,0,1)).getTime();
        var city = Ext.getCmp("cityA").value;
        var addNoticeForm = Ext.create("Ext.form.Panel",{
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            height:360,
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70,labelSeparator:":"},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items:[
                {xtype : 'combobox',fieldLabel : '分区',name:"city",width:180,valueField:"value",
                    store:typeComboboxStore,value:city,editable:false,
                    listeners:{select:function(){
                        getNotices(this.value);
                    }}
                },
                {xtype : 'textfield',fieldLabel : '排序',name:"sort",width:500,value:(data["sort"] || "")},
                {xtype : 'textfield',fieldLabel : '标题',name:"title",width:500,value:(data["title"] || "")},
                {xtype : 'textfield',fieldLabel : '渠道',name:"channel",width:500,value:(data["channel"] || "")},
                {xtype : 'textfield',fieldLabel : '滚动文本',name:"scrollText",width:500,value:(data["scrollText"] || "")},
                {xtype : 'textfield',fieldLabel : '跳转名',name:"name",width:180},
                {
                    layout:{type:"hbox",defaultMargins:{bottom:10,right:5}},
                    defaultType:"datefield",
                    items:[
                        {name:"stime",value:new Date(data["stime"]),fieldLabel : '生效时间', inputWidth: '110', format: 'Y-m-d'},
                        {xtype: "timefield", name: "stime2", value: new Date(data["stime"]), format: 'H:i', inputWidth: '80', increment:60},
                        {xtype:"label",text:LipiUtil.t(" 至 ")},
                        {name:"etime",value:new Date(data["etime"]),format: 'Y-m-d', inputWidth: '110'},
                        {xtype: "timefield", name: "etime2", inputWidth: '80', value: new Date(data["etime"]), format: 'H:i', increment:60}
                    ]
                },
                {xtype : 'textareafield',fieldLabel : '内容',name:"text",width:500,height:200,value:(data["text"] || "")},
                {xtype: "label" , text: 'test2:2,uc:2,p91:3,pp:4,tb:5,ky:6,a360:7,xiaomi:8,ucweb:9,a91:10,baidu:11,anzhi:12, wandoujia:13,OPPO:14,dcn:15', style:'color:#999'},
                {xtype : 'combobox',fieldLabel : LipiUtil.t('语言'),name:"language",width:180,valueField:"value",
                    store:languageComboboxStore,value:language, editable:false
                }
            ],
            buttons:[{xtype:"button",text:LipiUtil.t("保存"),handler:function(){
                var noticeFormObj = addNoticeForm.form.getValues();

                var sTimeArray = noticeFormObj["stime2"].split(":");
                var sDate = new Date(noticeFormObj["stime"]);
                sDate.setHours(sTimeArray[0] - 0);
                sDate.setMinutes(sTimeArray[1] - 0);

                var eTimeArray = noticeFormObj["etime2"].split(":");
                var eDate = new Date(noticeFormObj["etime"]);
                eDate.setHours(eTimeArray[0] - 0);
                eDate.setMinutes(eTimeArray[1] - 0);

                noticeFormObj["stime"] = Math.floor(sDate.getTime()/1000);
                noticeFormObj["etime"] = Math.floor(eDate.getTime()/1000);
                //var mText = noticeFormObj["text"];
                //console.log(JSON.stringify(mText));
                //return ;
                //var toJSON = '{"a":"' + mText + '"}';
                //try {
                //    var toJSONObj = JSON.parse(toJSON);
                //} catch(err) {
                //    Ext.Msg.alert("提示", "文本格式不对");
                //    return;
                //}
                noticeFormObj["sort"] = noticeFormObj["sort"] == "" ? 0 : noticeFormObj["sort"];
                noticeFormObj["channel"] = noticeFormObj["channel"] == "" ? "all" : noticeFormObj["channel"];
//                if(noticeFormObj["title"] != "") {
                if(noticeFormObj["channel"] == ""){
                    Ext.Msg.alert("渠道不能为空");
                }else{
                    LipiUtil.showLoading();
                    LHttp.post("notice.add",noticeFormObj,function(data){
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(data, "notice.add") == false) return;
                        var bb = Object.keys(data["notice.add"]);
                        Ext.Msg.alert("公告编辑成功！影响大区： =>" + JSON.stringify(bb));//cData["cityList"]
                        getNotices(noticeFormObj["city"]);//city
                        Ext.getCmp('noticeWindow').close();
                    });
                }
            }}]
        });
        return addNoticeForm;
    }
    function showWindow(title) {
        var data = arguments[1] ? arguments[1] : {};
        var aa = formFun(data);
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            "id":"noticeWindow",
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            items: [
                aa
            ]
        });
        mWindow.show();
    }

    var viewTable = Ext.create("Ext.grid.Panel", {
        store: noticeStore,
        y: 0,
        tbar: [
            {xtype : 'combobox',fieldLabel : '分区',name:"com",labelWidth:40, "id":"cityA",width: 160,valueField:"value",
                store:typeComboboxStore,value:'0',editable:false,
                listeners:{select:function(){
                    getNotices(this.value);
                }}
            },
            {xtype: 'button', text: LipiUtil.t('添加公告'), iconCls: "add", handler: function () {
                showWindow("添加公告");
            }},
            {xtype: 'button', text: LipiUtil.t('拷贝所有公告到指定分区'), iconCls: "add", handler: function () {
                var city = Ext.getCmp("cityA").value;
                var cData = {};
                cData["notice"] = [];
                for(var i = 0 ; i < noticeStore.getCount() ; i ++){
                    cData["notice"].push(noticeStore.getAt(i).data);
                }
                showCopyServerWindow("拷贝活动", city, function (newData) {
                    if(newData.length == 0) {
                        Ext.Msg.alert("提示", "未选择拷贝区！");
                        return;
                    }//if
                    LipiUtil.showLoading();
                    cData["cityList"] = newData;
                    async.forEach(newData,function(item,cb){
                        cData["city"] = item;
                        cData["name"] = "";
                        LHttp.post("notice.coby",cData,function(data){
                            if (LipiUtil.errorCheck(data, "notice.coby") == false) {
                                LipiUtil.hideLoading();
                                return;
                            }
                            cb(null,null);
                        });//Lhttp.post
                    },function(err,res){
                        LipiUtil.hideLoading();
                        if(city == "0"||city == "all")city = "全区";
                        Ext.Msg.alert("公告拷贝成功！影响大区： =>" + JSON.stringify(cData["cityList"]));//cData["cityList"]

                    });//async
                });//showCopyServerWindow
            }}
//            {xtype : 'combobox',fieldLabel : LipiUtil.t('语言'),name:"language",width:180,valueField:"value",
//                store:languageComboboxStore,value:language, editable:false
//            }
//            {xtype : 'combobox',fieldLabel : '多国语言',name:"com",labelWidth:40, "id":"multiLanguage",width: 160,valueField:cashServer,//"value"
//                store:typeComboboxStore,value:'0',editable:false,
//                listeners:{select:function(){
//                    getNotices(this.value);
//                }}
//            }
        ],
        anchor: "100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns: [
            {text:LipiUtil.t("ID"),dataIndex:"id",flex:1},
            {text:LipiUtil.t("渠道"),dataIndex:"channel",flex:1},
            {text:LipiUtil.t("排序"),dataIndex:"sort",flex:1},
            {text:LipiUtil.t("标题"),dataIndex:"title",flex:1, renderer: function (v) {
                    return "<span style='font-weight: bold;color: red'>" + v + "</span>";
                }
            },
            {text:LipiUtil.t("滚动标题"),dataIndex:"scrollText",flex:1},
            {text:LipiUtil.t("跳转名"),dataIndex:"name",flex:1},
            {text:LipiUtil.t("内容"),dataIndex:"text",flex:1},
            {text:LipiUtil.t("开始时间"),dataIndex:"stime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d');
            }},
            {text:LipiUtil.t("结束时间"),dataIndex:"etime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d');
            }},
            {xtype:"actioncolumn","text":"编辑",align:"center",items:[
                {
                    iconCls: "add",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showCopyServerWindow("拷贝公告", cData, function (newData) {
                            if(newData.length == 0) {
                                Ext.Msg.alert("提示", "未选择拷贝区！");
                                return;
                            }//if
                            LipiUtil.showLoading();
                            cData["cityList"] = newData;
                            async.forEach(newData,function(item,cb){
                                cData["city"] = item;
                                cData["name"] = "";
                                LHttp.post("notice.add",cData,function(data){
                                    if (LipiUtil.errorCheck(data, "notice.add") == false) return;
                                    cb(null,null);
                                });//Lhttp.post
                            },function(err,res){
                                LipiUtil.hideLoading();
                                Ext.Msg.alert("公告拷贝成功！影响大区： =>" + JSON.stringify(cData["cityList"]));
                            });//async
                        });//showCopyServerWindow
                    }//handler
                },
                "-",
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        var mName = cData.name;
                        showWindow("修改公告",cData);
                    }
                },
                "-",
                {
                iconCls:"delete",
                handler:function(view,row,col,item,e){
                    var noticeId = view.store.getAt(row).data.id;
                    var mCity = Ext.getCmp('cityA')["value"];
                    var tipText = (mCity == 0)?"！！！！ 确认删除所有分区的同一公告？":'确认删除这条公告';
                    Ext.Msg.confirm('提示', tipText, function(btn){
                        if(btn == 'yes') {
                            LipiUtil.showLoading();
                            LHttp.post("notice.del",{"id":noticeId, "city":mCity},function(data){
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "notice.del") == false) return;
                                var delRes = data["notice.del"];
                                var jj = Object.keys(delRes);
                                Ext.Msg.alert("公告删除成功！影响大区： =>" + JSON.stringify(jj));//delRes
                                getNotices(mCity);
                            });
                        }
                    });
//                    console.log(view.store.getAt(row).data.id,"del id");//取公告id
                }
            }
            ]}
        ]
    });
    function showCopyServerWindow(title, city, callbackFn){
        var aindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:572,
            minHeight:220,
            items : [{
                xtype: 'checkboxgroup',
                name: 'aaa',
                width: 572,
                minHeight: 220,
                columns: 3,
                align:"center",
                id:"noticeChang",
                items:getTotleServer()
            }],
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var checkGroup = Ext.getCmp('noticeChang').items;
                    var checkL = checkGroup.length;
                    var serverList = [];
                    for(var j = 1 ; j < checkL ; j ++){
                        var item = checkGroup.get(j);
                        var checked = item.checked;
                        var sendData = {};
                        if(checked == true && item.name != city){
                            serverList.push(item.name);
                        }
                    }
                    aindow.close();
                    callbackFn(serverList);
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    aindow.close();
                }}
            ]
        });
        aindow.show();
    }
    var viewPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("公告配置"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [viewTable]
    });
        function getNotices(city) {
        var mCity = city || 1;
        mCity = (mCity == 0)?1:mCity;
        LHttp.post("notice.get",{"city":mCity},function(res){
            var noticeList = res["notice.get"];
            noticeStore.loadData(noticeList);
        });
//        function getLanguage(useUid) {
//            var mCity = city || 1;
//            mCity = (mCity == 0)?1:mCity;
//            LHttp.post("notice.get",{"city":mCity},function(res){
//                var noticeList = res["notice.get"];
//                noticeStore.loadData(noticeList);
//        });
    }
    var conditionsClection = Ext.create('Ext.data.Store',{

        fields:['value','displayName'],

        data:[[1,"360"],[2,"91"],[3,"pp"],[4,"tongbu"],[5,"ios"]]

    });
    function getChannelList(){//获取渠道列表

    }
    getNotices();
    this.view = viewPanel;
}