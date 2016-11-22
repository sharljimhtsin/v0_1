/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-22
 * Time: 下午9:00
 * To change this template use File | Settings | File Templates.
 */

//邮件功能

function MailViewApplyList(){
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

    var mailApplyStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "applyUser", "applyTime", "applyPlat", "applyServer",
            "receiverIds", "mailMessage","rewardMoney","mailReward", "mailRewardTranslate","mailPostScript",
            "checkStatus", "checkUser", "checkTime"],
        data: []
    });
    var comboBoxStatusStore = new Ext.data.SimpleStore({
        fields : ['value', 'text'],
        data : [[0, '申请中'], [1, '已发放'], [2, '已取消']]
    });

    var applyRowData = null;
    comboBoxStatus = new Ext.form.ComboBox({
        id:'checkstatus',
        name:'checkstatus',//name只是改下拉的名称
        hiddenName:'checkstatus',//提交到后台的input的name
        width : 120,
        store : comboBoxStatusStore,//填充数据
        emptyText : '申请中',
        mode : 'local',//数据模式，local代表本地数据
        readOnly : false,//是否只读
        value : 0,
        triggerAction : 'all',// 显示所有下列数据，一定要设置属性triggerAction为all
        valueField : 'value',//值
        displayField : 'text',//显示文本
        editable: false,//是否允许输入
        forceSelection: true//必须选择一个选项
    });

    var mailApplyGrid = Ext.create("Ext.grid.Panel", {
        store: mailApplyStore,
        tbar: [
            //{xtype: 'combo',store:comboStatus, id: "checkStatus", value:"申请中"},
            comboBoxStatus,
            '-',
            {xtype: 'button', text: LipiUtil.t('搜索'), id: "searchButton", iconCls: "settings", handler: searchButtonClick},
            '-',
            {xtype: 'button', text: LipiUtil.t('通过申请'), iconCls: "edit", handler: function () {
                var selectionArray = mailApplyGrid.getSelectionModel().getSelection();
                if (selectionArray == null || selectionArray.length <= 0) {
                    Ext.Msg.alert("提示", "需要选中一条数据");
                } else {
                    applyRowData =  selectionArray[0].data;
                    showWindow("通过申请", null);
                }
            }}
        ],
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", fixed : true, width: 55},
            {text: LipiUtil.t("平台"), dataIndex: "applyPlat", flex: 1},
            {text: LipiUtil.t("服"), dataIndex: "applyServer", flex: 1},
            {text: LipiUtil.t("标题"), dataIndex: "mailMessage", fixed : true, width: 180},
            {text: LipiUtil.t("金额"), dataIndex: "rewardMoney", fixed : true, width: 70},
            {text: LipiUtil.t("备注"), dataIndex: "mailPostScript", fixed : true, width: 100},
            {text: LipiUtil.t("接收者"), dataIndex: "receiverIds", flex: 1},
            //{text: "奖励物品", dataIndex: "mailReward", flex: 1},
            //{text: "奖励物品2", dataIndex: "mailRewardTranslate", flex: 1},
            {text: LipiUtil.t("申请人"), dataIndex: "applyUser", flex: 1},
            {text: LipiUtil.t("申请时间"),dataIndex: "applyTime", flex: 1 },
            {text: LipiUtil.t("审核"), dataIndex: "checkStatus", fixed : true, width: 70},
            {text: LipiUtil.t("审核人"), dataIndex: "checkUser", flex: 1},
            {text: LipiUtil.t("审核时间"), dataIndex: "checkTime", flex: 1},
            {xtype: "actioncolumn", "text": "", align: "center", fixed : true, width: 80,items: [
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        cData["action"] = "标题："+cData["mailMessage"]+"\r\n\r\n金额："+cData["rewardMoney"]+"\r\n\r\n物品："+cData["mailRewardTranslate"]+"\r\n\r\n物品："+cData["mailPostScript"];
                        showDetail("申请发放内容",cData);
                    }
                },
                '-',
                {
                    iconCls:"delete",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        if(cData["checkStatus"]=="申请中") {
                                Ext.MessageBox.confirm('提示', '确认要取消?', function (id) {
                                    if (id === "yes") {
                                        LipiUtil.showLoading();

                                        LHttp.post("mail.apply", {"id": cData["id"], "action": "cancel"}, function (data) {
                                            LipiUtil.hideLoading();

                                            if (LipiUtil.errorCheck(data, "mail.apply") == false) return;
                                            var returnData = data["mail.apply"];
                                            searchButtonClick();
                                        });
                                    }
                                });
                        }
                    }
                }
            ]}
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("奖励列表"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        //items: [viewTable]
        items: [mailApplyGrid]
    });

    var sendMailForm = function(callBack){
        var isSend = false;
        var sendMail = Ext.create("Ext.form.Panel",{
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items:[
                {xtype : 'textareafield',fieldLabel : '接收者ID',id:"receiverId",name:"receiverId",width:500,height:40},
                {xtype : 'textareafield',fieldLabel : '内容',id:"message",name:"message",width:500,height:60},
                {xtype : 'textareafield',fieldLabel : '物品',id:"reward",name:"reward",width:500,height:60},
                {xtype : 'textfield',id:"id",name:"id",hidden: true,hideLabel:true},
                {
                    layout:{type:"absolute"},
                    items:[
                        {xtype : 'button',text : '发送',width:60,x:150,y:20,handler:function(){
                            if(isSend) return;
                            var formValues = sendMail.form.getValues();
                            formValues["receiverId"] = formValues["receiverId"].toString().replace(/，/g,',');
                            formValues["reward"] = Ext.String.trim(formValues["reward"]);
                            if (formValues["reward"] == "") {
                                formValues["type"] = "mail";
                            } else {
                                formValues["type"] = "gift";
                                try {
                                    var mArray = JSON.parse(formValues["reward"])
                                    if (mArray instanceof Array) {
                                        if (mArray.length == 0) throw new Error("err");
                                        for (var i = 0 ; i < mArray.length; i++) {
                                            if (mArray[i]["id"] == null) throw new Error("err");
                                        }
                                    } else {
                                        throw new Error("err");
                                    }
                                } catch (err) {
                                    Ext.Msg.alert("提示", "物品格式错误!");
                                    return;
                                }
                            }
                            LipiUtil.showLoading();
                            isSend = true;
                            LHttp.post("mail.send",formValues,function(data){
                                LipiUtil.hideLoading();
                                isSend = false;
                                if (LipiUtil.errorCheck(data, "mail.send") == false) return;
                                var mObj = data["mail.send"];
                                for (var key in mObj) {
                                    if (mObj[key] == 0) {
                                        Ext.Msg.alert("提示", JSON.stringify(mObj));
                                        sendMail.form.reset();
                                        return;
                                    }
                                }
                                callBack();
                                Ext.Msg.alert("提示", "保存成功！");
                                //sendMail.form.reset();
                            });
                        }},
                        {xtype : 'button',text : LipiUtil.t('拒绝'),width:60,x:300,y:20,handler:function(){


                            if(isSend) return;
                            var formValues = sendMail.form.getValues();

                            if(formValues["id"]=="") return;

                            LipiUtil.showLoading();
                            isSend = true;

                            LHttp.post("mail.apply", {"id": formValues["id"], "action": "cancel"}, function (data) {
                                LipiUtil.hideLoading();
                                isSend = false;
                                if (LipiUtil.errorCheck(data) == false) return;
                                var returnData = data["mail.apply"];
                                if (returnData["ERROR"] != null) {
                                    Ext.Msg.alert("提示", returnData["info"]);
                                } else {
                                    callBack();
                                }
                            });
                        }}
                    ]
                },
                {xtype: "label", height:30},
                {xtype: "label", text: '接收者ID用,号分隔; 内容为发给玩家的信息,格式为纯文本; ', style:'color:#999'},
                {xtype: "label" , text: '物品为发给玩家的物品, 格式为[{"id":"xxx", "count":[数量], "isPatch":[是否碎片],"level":[等级]}] ,除了id,其它参数，根据需要可选', style:'color:#999'}
            ]
        });

        if(applyRowData != null){
            Ext.getCmp("id").setValue(applyRowData["id"]);
            Ext.getCmp("receiverId").setValue(applyRowData["receiverIds"]);
            Ext.getCmp("message").setValue(applyRowData["mailMessage"]);
            Ext.getCmp("reward").setValue(applyRowData["mailReward"]);
        }

        return sendMail;
    }

    var showWindow = function(title,data){
        if(title == '导入邮件'){

        }  else if(title == '通过申请'){
            var winform = sendMailForm(function(){
                searchButtonClick();
                mWindow.close();
            });
        }else {

        }
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 5px 5px 5px',
            items: [
                winform
            ]
        });
        mWindow.show();
    };

    function searchButtonClick() {
        LipiUtil.showLoading();

        var checkstatus = (Ext.getCmp("checkstatus").getValue()=="")? 0:Ext.getCmp("checkstatus").getValue();
        LHttp.post("mail.apply", {"checkstatus":checkstatus,"action":"getlist"}, function (data) {
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data) == false) return;

            var returnData = data["mail.apply"];
            if (returnData["ERROR"]!=null) {
                Ext.Msg.alert("提示", JSON.stringify(returnData["info"]));
            } else {
                mailApplyStore.loadData(returnData);
            }
        });
    }

    searchButtonClick();
    this.view = viewPanel;
}