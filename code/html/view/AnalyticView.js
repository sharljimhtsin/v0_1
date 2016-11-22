/**
 * User: joseppe
 * Date: 14-7-21
 * Time: 下午9:36
 */

function AnalyticView(){
    var logStore = Ext.create("Ext.data.ArrayStore",{ //搜索出来的日志数据
        fields:["userUid", "time", "typeId", "action"],
        data:[]
    });
    var modelStore = Ext.create("Ext.data.ArrayStore",{ //有哪些模块，对应的数据
        fields:["value","text"],
        data:[["IngotExpend","伊美加币消耗"],["IngotReceive","伊美加币获得"],["GoldGet","金币获得"],["GoldConsume","金币消耗"],["ItemGet","物品获得"], ["ItemConsume","物品消耗"]]
    });
    var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:gData["serverList"]
    });
    function showDetail(title,data){//显示详细信息
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    mWindow.close();
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "detailForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {xtype: "textareafield", fieldLabel: "内容",value:data["action"],  width: 600, height: 300}
                    ]
                }
            ]
        });
        mWindow.show();
    }
    var viewTable = Ext.create("Ext.grid.Panel",{
        store:logStore,
        //        title:"商品 列表",
        y:0,
        //        selModel:selModel,
        tbar:[
            {xtype : 'combobox',fieldLabel : '模块',name:"logModel", labelWidth:40, id:"logModel",  width:140,valueField:"value",
                store:modelStore, value:"IngotExpend", editable:false,
                listeners: {select: function () {
                    if(this.value == "ItemGet" || this.value == "ItemConsume"){
                        Ext.getCmp("itemId").setVisible(true);
                    } else {
                        Ext.getCmp("itemId").setVisible(false);
                    }
                }}
            },
            {xtype:'textfield',fieldLabel:'用户Uid',labelWidth:50,width:130,id:"userUid"},
            {xtype:'textfield',fieldLabel:'物品Id',labelWidth:50,width:100,id:"itemId",hidden:true},
            {xtype:'textfield',fieldLabel:'typeId',labelWidth:50,width:100,id:"typeId"},
            {
                xtype:"fieldcontainer",
                fieldLabel:'时间',
                labelWidth:40,
                layout:{type:'hbox'},
                items:[
                    {xtype:"datefield", id:"lsTime",value:new Date(new Date().getTime() - 24 * 60 * 60 * 1000 * 1),width:100,format: 'Y-m-d'},
                    {xtype: 'splitter'},
                    {xtype:"timefield", id:"lsTime2",value:"08:00",width:100,format: 'H:i'}
                ]
            },
            {
                xtype:"fieldcontainer",
                fieldLabel:'至',
                labelWidth:40,
                layout:{type:'hbox'},
                items:[
                    {xtype:"datefield", id:"leTime",value:new Date(),width:100,format: 'Y-m-d'},
                    {xtype: 'splitter'},
                    {xtype:"timefield", id:"leTime2",value:"08:00",width:100,format: 'H:i'}
                ]
            },
            {xtype:'button',text: LipiUtil.t("搜索"),handler:function(){//搜索日志
                var sendObj = {};
                var newData = {};
                newData["sTime"] = Ext.getCmp("lsTime").value;
                newData["sTime2"] = Ext.getCmp("lsTime2").value;
                newData["eTime"]= Ext.getCmp("leTime").value;
                newData["eTime2"] = Ext.getCmp("leTime2").value;
                var sDate = new Date(newData["sTime"]);
                sDate.setHours(newData["sTime2"].getHours());
                sDate.setMinutes(newData["sTime2"].getMinutes());
                newData["sTime"] = Math.floor(sDate.getTime()/1000);
                var eDate = new Date(newData["eTime"]);
                eDate.setHours(newData["eTime2"].getHours());
                eDate.setMinutes(newData["eTime2"].getMinutes());
                newData["eTime"] = Math.floor(eDate.getTime()/1000);
                sendObj["startTime"] = newData["sTime"];
                sendObj["endTime"]= newData["eTime"];
                sendObj["userUid"] = Ext.getCmp("userUid").value;
                sendObj["logModel"] = Ext.getCmp("logModel").value;
                sendObj["itemId"] = Ext.getCmp("itemId").value;
                sendObj["typeId"] = Ext.getCmp("typeId").value;
                if(sendObj["userUid"] == undefined || sendObj["userUid"] == null || sendObj["userUid"] == ''){
                    Ext.Msg.alert("提示", "userUid不能为空！");
                    return;
                }
                LipiUtil.showLoading();
                LHttp.post("analytic.search",sendObj,function(data){
                    LipiUtil.hideLoading();
                    if (LipiUtil.errorCheck(data, "analytic.search") == false) return;
                    logStore.loadData(data["analytic.search"]);
                })
            }}
        ],
        anchor:"100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns:[
            {text:"用户Uid",dataIndex:"userUid",flex:1},
            {text: LipiUtil.t("时间"),dataIndex:"time",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:"type",dataIndex:"typeId",flex:1},
            {text:"日志内容",dataIndex:"action",flex:1},
            {xtype: "actioncolumn", "text": "查看", align: "center", items: [
                {
                    iconCls: "edit",

                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showDetail("日志内容",cData);
                    }
                }]}
        ]
    });
    var ViewPanel = Ext.create("Ext.panel.Panel",{
        title: LipiUtil.t("数据统计"),
        frame:true,//是否渲染表单
        layout:{type:'fit'},
        items:[viewTable]
    });
    this.view = ViewPanel;
}