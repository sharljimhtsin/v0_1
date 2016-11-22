/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-22
 * Time: 下午9:00
 * To change this template use File | Settings | File Templates.
 */

//邮件功能

function MailViewApply() {
    var isSend = false;
    var viewTable = Ext.create("Ext.form.Panel", {
        frame: true,//是否渲染表单
        layout: {type: "vbox"},
        bodyPadding: "10px 0px 0px 10px",
        fieldDefaults: {labelWidth: 70},
        defaults: {border: false, bodyPadding: "0 0 0 0", bodyStyle: 'background-color:#DFE9F6'},
        items: [
            {xtype: 'textareafield', fieldLabel: '接收者ID', name: "receiverIds", width: 700, height: 40},
            {xtype: 'textareafield', fieldLabel: '邮件内容', name: "message", width: 700, height: 60},
            {xtype: 'textareafield', fieldLabel: '金额', name: "rewardMoney", width: 210, height: 25,allowBlank :false,blankText:'GS必填，玩家充值金额',emptyText:'GS必填，玩家充值金额'},
            {xtype: 'textareafield', fieldLabel: '备注', name: "mailPostScript", width: 700, height: 25,maxLength:200},
            {xtype: 'textareafield', fieldLabel: '物品', name: "reward", width: 700, height: 150},
            {
                layout: {type: "absolute"},
                items: [
                    {xtype: 'button', text:LipiUtil.t('申请'), width: 60, x: 200, y: 20, handler: function () {
                        if (isSend) return;
                        var formValues = viewTable.form.getValues();
                        formValues["receiverIds"] = formValues["receiverIds"].toString().replace(/，/g, ',');
                        formValues["reward"] = Ext.String.trim(formValues["reward"]);
                        formValues["rewardMoney"] = formValues["rewardMoney"].replace(/(^\s*)|(\s*$)/g, '');
                        formValues["action"] = "apply";

                            if( formValues["rewardMoney"] =="" || parseInt(formValues["rewardMoney"])<=0){
                                Ext.Msg.alert("提示", "请输入金额!");
                                return;
                            }
                            try {
                                var mArray = JSON.parse(formValues["reward"])
                                if (mArray instanceof Array) {
                                    if (mArray.length == 0) throw new Error("err");
                                    for (var i = 0; i < mArray.length; i++) {
                                        if (mArray[i]["id"] == null) throw new Error("err");
                                    }
                                } else {
                                    throw new Error("err");
                                }
                            } catch (err) {
                                Ext.Msg.alert("提示", "物品格式错误!");
                                return;
                            }

                        LipiUtil.showLoading();
                        isSend = true;

                        LHttp.post("mail.apply", formValues, function (data) {
                            LipiUtil.hideLoading();
                            isSend = false;
                            if (LipiUtil.errorCheck(data, "mail.apply") == false) return;
                            var mObj = data["mail.apply"];

                            if(mObj["ERROR"]=="0") {
                                Ext.Msg.alert("提示", "保存成功！");
                            }else{
                                Ext.Msg.alert("提示", JSON.stringify(data));
                            }
                        });
                    }}
                ]
            },
            {xtype: "label", height: 30},
            {xtype: "label", text: LipiUtil.t('接收者ID用,号分隔; 内容为发给玩家的信息,格式为纯文本'), style: 'color:#999'},
            {
                xtype: "label",
                text: LipiUtil.t('物品为发给玩家的物品, 格式为[{"id":"xxx", "count":[数量], "isPatch":[是否碎片],"level":[等级]}] ,除了id,其它参数，根据需要可选'),
                style: 'color:#999'
            }
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("奖励申请"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [viewTable]
    });

    this.view = viewPanel;
}