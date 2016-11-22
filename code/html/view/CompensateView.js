/**
 * 补偿管理
 * User: liyuluan
 * Date: 14-3-3
 * Time: 下午2:00
 * To change this template use File | Settings | File Templates.
 */
function CompensateView() {

    var compensateStore = Ext.create("Ext.data.ArrayStore",{
        fields: ["id", "text", "reward", "sTime", "eTime", "city", "reg_sTime", "reg_eTime", "channel"],
        data:[]
    });



    function showWindow(title,callbackFn) {
        var mWindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:550,
            height: 550,
            fieldDefaults:{labelSeparator:":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    var sDate = new Date(newData["sTime"]);
                    var sTimeArray = newData["sTime2"].split(":");
                    sDate.setHours(sTimeArray[0]-0);
                    sDate.setMinutes(sTimeArray[1]-0);
                    newData["sTime"] = Math.floor(sDate.getTime()/1000);
                    var eDate = new Date(newData["eTime"]);
                    var eTimeArray = newData["eTime2"].split(":");
                    eDate.setHours(eTimeArray[0]-0);
                    eDate.setMinutes(eTimeArray[1]-0);
                    newData["eTime"] = Math.floor(eDate.getTime()/1000);
                    var reg_sDate = new Date(newData["reg_sTime"]);
                    var reg_sTimeArray = newData["reg_sTime2"].split(":");
                    reg_sDate.setHours(reg_sTimeArray[0]-0);
                    reg_sDate.setMinutes(reg_sTimeArray[1]-0);
                    newData["reg_sTime"] = Math.floor(reg_sDate.getTime()/1000);
                    var reg_eDate = new Date(newData["reg_eTime"]);
                    var reg_eTimeArray = newData["reg_eTime2"].split(":");
                    reg_eDate.setHours(reg_eTimeArray[0]-0);
                    reg_eDate.setMinutes(reg_eTimeArray[1]-0);
                    newData["reg_eTime"] = Math.floor(reg_eDate.getTime()/1000);
//                    console.log(newData);
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
//                        {xtype:"textfield", fieldLabel:"ID",name:"id", width:150, readOnly:true},
                        {xtype : 'textareafield',fieldLabel : '邮件文本',name:"text",width:500,height:60},
                        {xtype : 'textareafield',fieldLabel : '物品',name:"reward",width:500,height:60},
                        {
                            xtype:"fieldcontainer",
                            fieldLabel:'开始时间',
                            layout:{type:'hbox'},
                            items:[
                                {xtype:"datefield", name:"sTime",value:new Date(),format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype:"timefield", name:"sTime2",value:"08:00",format: 'H:i'}
                            ]
                        },
                        {
                            xtype:"fieldcontainer",
                            fieldLabel:'结束时间',
                            layout:{type:'hbox'},
                            items:[
                                {xtype:"datefield", name:"eTime",value:new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 3),format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype:"timefield", name:"eTime2",value:"08:00",format: 'H:i'}
                            ]
                        },
                        {xtype:"textareafield", fieldLabel:"生效分区",name:"city", value:"0"},
                        {xtype: "textareafield", fieldLabel: "渠道", name: "channel", value: "0"},
                        {
                            xtype: "fieldcontainer",
                            fieldLabel: '用户注册开始时间',
                            layout: {type: 'hbox'},
                            items: [
                                {xtype: "datefield", name: "reg_sTime", value: "1970-01-01", format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype: "timefield", name: "reg_sTime2", value: "08:00", format: 'H:i'}
                            ]
                        },
                        {
                            xtype: "fieldcontainer",
                            fieldLabel: '用户注册结束时间',
                            layout: {type: 'hbox'},
                            items: [
                                {
                                    xtype: "datefield",
                                    name: "reg_eTime",
                                    value: new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 3),
                                    format: 'Y-m-d'
                                },
                                {xtype: 'splitter'},
                                {xtype: "timefield", name: "reg_eTime2", value: "08:00", format: 'H:i'}
                            ]
                        }
                    ]
                }
            ]
        });
        mWindow.show();
    }



    var compensateTable = Ext.create("Ext.grid.Panel",{
        store:compensateStore,
    //        title:"商品 列表",
        y:0,
    //        selModel:selModel,
        tbar:[
            {xtype:'button',text: LipiUtil.t("添加补偿"),iconCls:"add",handler:function(){
                showWindow("添加补偿", function(data) {
                    LipiUtil.showLoading();
                    LHttp.post("compensate.add", data, function(resData) {
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(resData, "compensate.add") == false) return;
                        var mList = resData["compensate.add"];
                        LipiUtil.sortOn(mList, "sTime",  -1);
                        if (mList != null) compensateStore.loadData(mList);

                    });
                });
            }},
            {xtype:"button", text: LipiUtil.t("清除补偿列表缓存"), iconCls:"delete", handler:function(){
                Ext.Msg.confirm("提示", "确定删除缓存吗？", function(button) {
                    if (button == "yes") {
                        LipiUtil.showLoading();
                        LHttp.post("cache.del", {"key":"cMail"}, function(data){
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "cache.del") == false) return;
                            Ext.Msg.alert("提示", "清除成功");
                        });
                    }
                });
            }}
        ],
        anchor:"100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns:[
            {text:"ID",dataIndex:"id",flex:1},
            {text:LipiUtil.t("邮件文本"),dataIndex:"text",flex:1},
            {text:LipiUtil.t("补偿物品"),dataIndex:"reward",flex:1},
            {text:LipiUtil.t("开始时间"),dataIndex:"sTime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:LipiUtil.t("结束时间"),dataIndex:"eTime",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:LipiUtil.t("分区号"),dataIndex:"city",flex:1},
            {
                text: LipiUtil.t("用户注册开始时间"), dataIndex: "reg_sTime", flex: 1, renderer: function (v) {
                var dt = new Date((v - 0) * 1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }
            },
            {
                text: LipiUtil.t("用户注册结束时间"), dataIndex: "reg_eTime", flex: 1, renderer: function (v) {
                var dt = new Date((v - 0) * 1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }
            },
            {text: LipiUtil.t("渠道"), dataIndex: "channel", flex: 1},
            {xtype:"actioncolumn","text":"删除",align:"center",items:[{
                iconCls:"delete",
                handler:function(view,row,col,item,e){
                    var cData = view.store.getAt(row).data;
                    var mId = cData.id;
                    Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                        if (button == "yes") {
                            LipiUtil.showLoading();
                            LHttp.post("compensate.del", {"id":mId}, function(resData){
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(resData, "compensate.del") == false) return;
                                var mList = resData["compensate.del"];
                                LipiUtil.sortOn(mList, "sTime",  -1);
                                if (mList != null) compensateStore.loadData(mList);
                            });
                        }
                    });
                }
            }]}
        ]
    });


    var CompensatePanel = Ext.create("Ext.panel.Panel",{
        title:LipiUtil.t("商品列表"),
        frame:true,//是否渲染表单
        layout:{type:'fit'},
        items:[compensateTable]
    });


    function getCompensate() {
        LipiUtil.showLoading();
        LHttp.post("compensate.get",null,function(res){
            LipiUtil.hideLoading();
            if (res != null) {
                var mList = res["compensate.get"];
                LipiUtil.sortOn(mList, "sTime",  -1);
                if (mList != null) compensateStore.loadData(mList);
            }
        });
    }

    getCompensate();

    this.view = CompensatePanel;
}