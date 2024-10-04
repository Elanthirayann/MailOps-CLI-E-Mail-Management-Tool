const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail(recipients, subject, body, attachmentPaths) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: subject,
    text: body,
    attachments: attachmentPaths.map((path) => ({ path })),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = sendEmail;
