/**
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午6:02
 */



function CDKeyView(){
    var cdkeyStore = Ext.create("Ext.data.ArrayStore",{
        fields:["giftID","platformId","gift","sTime","eTime"],
        data:[]
    });

    var platformComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:[
            ["0", "所有平台"],
            ["test2", "开发版本"],
            ["uc", "测试版本"],
            ["p91", "91IOS"],
            ["PP", "PP助手"],
            ["tongbutui", "同步推"],
            ["kuaiyong", "快用"],
            ["a360", "360"],
            ["xiaomi", "小米"],
            ["ucweb", "UCWEB"],
            ["a91", "91Android"],
            ["baidu", "百度"],
            ["anzhi", "安智"],
            ["wandoujia", "豌豆夹"],
            ["OPPO", "OPPO"],
            ["185", "185"],
            ["dcn", "当乐"]
        ]
    });

    function sortOn(array, field, order) {
        array.sort(function(a, b) {
            return (a[field] - b[field]) * order;
        });
    }


    function showWindow(title,callbackFn) {
        var mWindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:580,
            height:440,
            fieldDefaults:{labelSeparator:":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons:[
                {xtype:"button",text:"确定",handler:function(){
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    newData["sTime"] = Math.floor(new Date(newData["sTime"]).getTime()/1000);
                    newData["eTime"] = Math.floor(new Date(newData["eTime"]).getTime()/1000);
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    mWindow.close();
                }}
            ],
            items:[
                {
                    xtype:"form",
                    border:false,
                    bodyPadding:5,
                    id:"mWindowForm",
                    defaultType:"textfield",
                    bodyStyle:"background:#DFE9F6",
                    fieldDefaults:{labelWidth:80},
                    items:[
                        {xtype : 'combobox',fieldLabel : '平台',name:"platformId",width:180,valueField:"value",
                            store:platformComboboxStore,value:"0",editable:false
                        },
                        {fieldLabel:"名字",name:"giftName"},
                        {xtype : 'textareafield',fieldLabel : '内容',name:"gift",width:500,height:160},
                        {xtype:"datefield", name:"sTime",value:new Date(),fieldLabel : '生效时间',format: 'Y-m-d'},
                        {xtype:"datefield", name:"eTime",value:new Date(2028,0,1),fieldLabel : '失效时间', format: 'Y-m-d'},
                        {xtype: "label", html: '<span>接收者ID用,号分隔; 内容为发给玩家的信息,格式为纯文本; </span><br/>' +
                            '<span>物品为发给玩家的物品, 格式为[{"id":"xxx", "count":[数量], "isPatch":[是否碎片],"level":[等级]}] ,除了id,其它参数，根据需要可选</span><br/>' +
                            '<span>示例: [{"id":"150010", "count":1, "isPatch":0,"level":1},{"id":"150011"}] ,游戏币id=gold,人民币id=ingot</span>', style:'color:#999'}

                    ]
                }
            ]
        });
        mWindow.show();
    }


    function addCDKey(giftID) {
        var mWindow = Ext.create("Ext.window.Window",{
            title: LipiUtil.t("添加CDKEY"),
            modal:true,
            width:300,
            height:160,
            fieldDefaults:{labelSeparator:":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var formObj = Ext.getCmp("addCDKeyForm").getValues();
                    if (formObj["count"] >= 1 && formObj["count"] <= 1000000) {
                        LipiUtil.showLoading();
                        var postData = {"count":formObj["count"], "giftID":giftID};
                        LHttp.post("cdkey.generate", postData, function(data){
                            LipiUtil.hideLoading();
                            //if (LipiUtil.errorCheck(data, "cdkey.generate") == false) return;
                            //var mKeys = data["cdkey.generate"];
                            Ext.Msg.alert("提示", "已提交");
                            mWindow.close();
                        });
                    } else {
                        Ext.Msg.alert("提示", "数量仅限1-1000000");
                    }
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    mWindow.close();
                }}
            ],
            items:[
                {
                    xtype:"form",
                    border:false,
                    bodyPadding:5,
                    id:"addCDKeyForm",
                    defaultType:"textfield",
                    bodyStyle:"background:#DFE9F6",
                    fieldDefaults:{labelWidth:80},
                    items:[

                        {fieldLabel:"物品ID",name:"giftID",disabled:true, value:giftID},
                        {fieldLabel:"生成个数",name:"count",xtype : 'numberfield', maxValue:1000000, minValue:1, value:1}
                    ]
                }
            ]
        });
        mWindow.show();
    }

    function showCDKey(giftID) {
        LipiUtil.showLoading();
        var postData = {"giftID":giftID};
        LHttp.post("cdkey.getkey", postData, function(data){
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data, "cdkey.getkey") == false) return;
            var mKeys = data["cdkey.getkey"];

//            var keysObject = {};
//            for (var i = 0; i < mKeys.length; i++) {
//                var mItem = mKeys[i];
//                var mKey = mItem["key"];
//                var mTime = mItem["time"];
//                if (keysObject[mTime] == null) keysObject[mTime] = [];
//                keysObject[mTime].push(mKey);
//            }
//            var keysArray = [];
//
//            for (var key in keysObject) {
//                keysArray.push({"time":key, "value":keysObject[key].join(",")});
//            }
//
//            var keysStore = Ext.create("Ext.data.ArrayStore",{
//                fields:["time","value"],
//                data:[]
//            });
//
//            keysStore.loadData(keysArray);

            var keysStore = Ext.create("Ext.data.ArrayStore",{
                fields:["time","c"],
                data:[]
            });

            keysStore.loadData(mKeys);

            var mWindow = Ext.create("Ext.window.Window",{
                title:LipiUtil.t("查看CDKEY"),
                modal:true,
                width:650,
                height:400,
                fieldDefaults:{labelSeparator:":"},
                bodyStyle: 'padding:5px 0px 20px 6px',
                items:[
                    {
                        xtype:"grid",
                        store:keysStore,
                        y:0,
                        anchor:"100% -355",
                        plugins:[{ptype:"cellediting"}],
                        columns:[
                            {text: LipiUtil.t("生成时间"),dataIndex:"time",flex:0.35,renderer:function(v){
                                var dt = new Date((v-0)*1000);
                                return Ext.Date.format(dt, 'Y-m-d H:s');
                            }},
                            {text:LipiUtil.t("key列表"),dataIndex:"c",flex:0.35, renderer:function(v){
                                return '生成数：'+v;
                            }},
                            {xtype: "actioncolumn", "text": "下载", flex:0.3, align: "center", items: [
                                {
                                    iconCls: "down",
                                    handler: function (view, row, col, item, e) {
                                        var cData = view.store.getAt(row).data;
                                        var time = cData["time"];

                                        LipiUtil.showLoading();
                                        var postData = {"giftID": giftID, "time": time, "action": "down"};
                                        LHttp.post("cdkey.getkey", postData, function (res) {
                                            LipiUtil.hideLoading();
                                            if (LipiUtil.errorCheck(res, "cdkey.getkey") == false) return;

                                            Ext.Msg.alert("提示","下载文件已生成");
                                        });
                                    }
                                }]},
                            {text: LipiUtil.t("下载地址"),dataIndex:"url",flex:1, renderer:function(v,cellmeta, record){
                                   var time = record.data["time"];
                                   var filename = giftID+"_"+time+".txt";
                                    return "请先点击下载生成下载文件后，在<a href='down/cdkey/"+filename+"' target='_blank'>右击另存为下载...</a>";
                            }}
                        ]
                    }
                ]
            });

            mWindow.show();

        });
    }


    var cdkeyTable = Ext.create("Ext.grid.Panel",{
        store:cdkeyStore,
//        title:"CDKEY 列表",
        y:0,
//        selModel:selModel,
        tbar:[
            {xtype:'button',text: LipiUtil.t("添加CDKEY物品"),iconCls:"add",handler:function(){
                showWindow('添加CDKEY物品', function(aData) {
                    try {
                        var mArray = JSON.parse(aData["gift"])
                        if (mArray instanceof Array) {
                            if (mArray.length == 0) throw new Error("err");
                            for (var i = 0 ; i < mArray.length; i++) {
                                if (mArray[i]["id"] == null) {
                                    throw new Error("err");
                                }
                            }
                        } else {
                            throw new Error("err");
                        }
                    } catch (err) {
                        Ext.Msg.alert("提示", "内容格式错误!");
                        return;
                    }
                    LipiUtil.showLoading();
                    LHttp.post("cdkey.newgift", aData, function(data){
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(data, "cdkey.newgift") == false) return;
                        var gifts = data["cdkey.newgift"];
                        sortOn(gifts, "giftID",  -1);
                        Ext.Msg.alert("提示", "保存成功!");
                        cdkeyStore.loadData(gifts);
                    });
                });
            }}
        ],
        anchor:"100% -355",
        columns:[
            {text:"ID",dataIndex:"giftID",flex:1},
            {text:"平台",dataIndex:"platformId",flex:1},
            {text:"名字",dataIndex:"giftName",flex:1},
            {text:"内容",dataIndex:"gift",flex:1},
            {text:"开始时间",dataIndex:"sTime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d');
            }},
            {text:"结束时间",dataIndex:"eTime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d');
            }},
            {xtype:"actioncolumn","text":"CDKEY",align:"center",items:[{
                iconCls:"add",
                handler:function(view,row,col,item,e){
                    var giftID = view.store.getAt(row).data.giftID;
                    addCDKey(giftID);
                }
            },"", {
                iconCls:"edit",
                handler:function(view,row,col,item,e){
                    var giftID = view.store.getAt(row).data.giftID;
                    showCDKey(giftID);
                }
            }]}
        ]
    });



    var CDKeyPanel = Ext.create("Ext.panel.Panel",{
        title: LipiUtil.t("CDKEY列表"),
        frame:true,//是否渲染表单
        layout:{type:'fit'},
        items:[cdkeyTable]
    });

    function getGifts() {
        LipiUtil.showLoading();
        LHttp.post("cdkey.getgifts",null,function(res){
            LipiUtil.hideLoading();
            if (res != null) {
                var gifts = res["cdkey.getgifts"];
                sortOn(gifts, "giftID",  -1);
                if (gifts != null) cdkeyStore.loadData(gifts);
            }
        });
    }

    getGifts();

    this.view = CDKeyPanel;
}
