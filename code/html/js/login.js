/**
 * User: lipi
 * Date: 13-6-3
 * Time: 下午4:43
 */


function login(){
    //初始化标签中的Ext:Qtip属性。
    Ext.QuickTips.init();
    Ext.form.Field.prototype.msgTarget = 'side';
    //提交按钮处理方法
    var btnsubmitclick = function () {
        if (form.getForm().isValid()) {
            //通常发送到服务器端获取返回值再进行处理，我们在以后的教程中再讲解表单与服务器的交互问题。
            Ext.Msg.alert("提示", "登陆成功!");
        }
    }
    //重置按钮"点击时"处理方法
    var btnresetclick = function () {
        form.getForm().reset();
    }
    //提交按钮
    var btnsubmit = new Ext.Button({
        text: '提 交',
        handler: btnsubmitclick
    });
    //重置按钮
    var btnreset = new Ext.Button({
        text: '重 置',
        handler: btnresetclick
    });
    //用户名input
    var txtusername = new Ext.form.TextField({
        width: 200,
        allowBlank: false,
        maxLength: 20,
        name: 'username',
        fieldLabel: '用户名',
        blankText: '请输入用户名',
        maxLengthText: '用户名不能超过20个字符'
    });
    //密码input
    var txtpassword = new Ext.form.TextField({
        width: 140,
        allowBlank: false,
        maxLength: 20,
        inputType: 'password',
        name: 'password',
        fieldLabel: '密　码',
        blankText: '请输入密码',
        maxLengthText: '密码不能超过20个字符'
    });
    //验证码input
    var txtcheckcode = new Ext.form.TextField({
        fieldLabel: '验证码',
        id: 'checkcode',
        allowBlank: false,
        width: 76,
        blankText: '请输入验证码！',
        maxLength: 4,
        maxLengthText: '验证码不能超过4个字符!'
    });
    //表单
    var form = new Ext.form.FormPanel({
        url: '******',
        labelAlign: 'right',
        labelWidth: 45,
        frame: true,
        cls: 'loginform',
        buttonAlign: 'center',
        bodyStyle: 'padding:6px 0px 0px 15px',
        items: [txtusername, txtpassword, txtcheckcode],
        buttons: [btnsubmit, btnreset]
    });
    //窗体
    var win = new Ext.Window({
        title: '用户登陆',
        iconCls: 'loginicon',
        plain: true,
        width: 276,
        height: 174,
        resizable: false,
        shadow: true,
        modal: true,
        closable: false,
        animCollapse: true,
        items: form
    });
    win.show();
}
