/**
 * Created by xiazhengxin on 2016/1/12 3:52.
 */
var async = require("async");
var nodemailer = require('nodemailer');
var mailConfig = require('../code/config/mailConfig');
var smtpTransport = nodemailer.createTransport('SMTP', config.mail.from);

function sendMail(subject, html, receiver) {
    var mailOptions = {
        from: [config.mail.from.name, config.mail.from.auth.user].join(' '),
        to: receiver,
        subject: subject,
        html: html
    };

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log('Message sent: ' + response.message);
        }
        smtpTransport.close();
    });
};

exports.sendMail = sendMail;