const Imap = require("node-imap");
const { inspect } = require("util");

// Email credentials and IMAP configuration
const imapConfig = {
  user: "your-email@example.com",
  password: "your-application-password",
  host: "imap.example.com", // Change this to your email provider's IMAP server
  port: 993,
  tls: true,
};

const imap = new Imap(imapConfig);

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

function fetchEmails(criteria, fetchOptions, callback) {
  imap.once("ready", function () {
    openInbox(function (err, box) {
      if (err) throw err;
      imap.search(criteria, function (err, results) {
        if (err) throw err;
        if (!results.length) {
          console.log("No emails found.");
          imap.end();
          return;
        }
        const fetch = imap.fetch(results, fetchOptions);
        fetch.on("message", function (msg, seqno) {
          console.log("Message #%d", seqno);
          const prefix = "(#" + seqno + ") ";
          msg.on("body", function (stream, info) {
            let buffer = "";
            stream.on("data", function (chunk) {
              buffer += chunk.toString("utf8");
            });
            stream.once("end", function () {
              console.log(
                prefix + "Parsed header: %s",
                inspect(Imap.parseHeader(buffer))
              );
            });
          });
          msg.once("attributes", function (attrs) {
            console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
          });
          msg.once("end", function () {
            console.log(prefix + "Finished");
          });
        });
        fetch.once("error", function (err) {
          console.log("Fetch error: " + err);
        });
        fetch.once("end", function () {
          console.log("Done fetching all messages!");
          imap.end();
        });
      });
    });
  });

  imap.once("error", function (err) {
    console.log("Connection error: " + err);
  });

  imap.once("end", function () {
    console.log("Connection ended");
  });

  imap.connect();
}

function deleteEmailsByCriteria(criteria) {
  imap.once("ready", function () {
    openInbox(function (err, box) {
      if (err) throw err;
      imap.search(criteria, function (err, results) {
        if (err) throw err;
        if (!results.length) {
          console.log("No emails to delete.");
          imap.end();
          return;
        }
        const fetch = imap.fetch(results, { bodies: "" });
        fetch.on("message", function (msg) {
          msg.once("attributes", function (attrs) {
            const { uid } = attrs;
            imap.addFlags(uid, ["\\Deleted"], function (err) {
              if (err) throw err;
              console.log("Marked message UID %d for deletion.", uid);
            });
          });
        });
        fetch.once("end", function () {
          imap.expunge(function (err) {
            if (err) throw err;
            console.log("Deleted marked messages.");
            imap.end();
          });
        });
      });
    });
  });

  imap.once("error", function (err) {
    console.log("Connection error: " + err);
  });

  imap.once("end", function () {
    console.log("Connection ended");
  });

  imap.connect();
}

module.exports = {
  fetchEmails,
  deleteEmailsByCriteria,
};
