const nodemailer = require("nodemailer");
const fs = require("fs");
const notifier = require("node-notifier");
require("dotenv").config();

// Function to log messages
function logMessage(message) {
  const logFilePath = "email-cli.log"; // Path to the log file
  const timestamp = new Date().toISOString();
  // Append to the log file
  fs.appendFileSync(logFilePath, `[${timestamp}] - ${message}\n`, "utf8");
}

async function sendEmail(recipients, subject, body, attachmentPaths = [], inReplyTo = null) {
  // Set up the email transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: "gmail", // You can replace with any SMTP provider
    auth: {
      user: process.env.EMAIL_USER, // Your email from .env
      pass: process.env.EMAIL_PASSWORD, // Your email password from .env
    },
  });

  // Build the mail options including attachments and reply header if present
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender email
    to: recipients, // Receiver email(s)
    subject: subject, // Subject of the email
    text: body, // Email body text
    inReplyTo: inReplyTo, // Reply-to ID for replying to an email
    references: inReplyTo ? [inReplyTo] : [], // References to chain the email
    attachments: attachmentPaths.map((path) => ({ path })), // Attachments list
  };

  try {
    // Attempt to send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);

    // Log the successful email send with the correct subject and recipients
    logMessage(`Sent email to ${recipients} with subject "${subject}"`);

    // Send a desktop notification
    notifier.notify({
      title: "Email Sent",
      message: `Your email to ${recipients} was sent successfully.`,
      sound: true, // Enable sound on notification
      wait: true, // Wait for user interaction before closing the notification
    });
  } catch (error) {
    // Log any errors if the email fails to send
    console.error("Error sending email:", error);

    // Log the error with correct subject and recipients
    logMessage(
      `Error sending email to ${recipients} with subject "${subject}": ${error.message}`
    );
  }
}

module.exports = sendEmail;
