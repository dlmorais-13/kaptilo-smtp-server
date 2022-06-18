const { createTransport } = require('nodemailer');
const { resolve } = require('path');
require('dotenv').config();

const user = Math.floor(Math.random() * 2 + 1);

const transport = createTransport({
  host: 'localhost',
  port: Number(process.env.SMTP_PORT),
  ignoreTLS: true,
  auth: {
    user: `user${user.toString().padStart(2, '0')}`,
    pass: `pass${user.toString().padStart(2, '0')}`
  },
});

transport.sendMail({
    from: '"Test @ Example.com" <test@example.com>',
    to: ['test2@example.com', 'test4@example.com'],
    subject: 'Test mail',
    cc: 'test3@example.com',
    replyTo: 'no-reply@example.com',
    sender: 'test@example.com',
    html: '<html><body><h1>E-mail content</h1><img src="cid:panda"/></body></html>',
    attachments: [{
        filename: 'panda.jpg',
        path: resolve(__dirname, 'panda.jpg'),
        cid: 'panda'
    }]
});
