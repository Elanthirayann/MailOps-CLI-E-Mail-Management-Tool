const Imap = require("node-imap");
const { format } = require("date-fns");
const sendEmail = require("./send"); // Import the sendEmail function
require("dotenv").config();

const config = {
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT, 10),
  tls: process.env.IMAP_TLS === "true",
};

const imap = new Imap(config);

function openMailbox(mailbox, readOnly, cb) {
  imap.openBox(mailbox, readOnly, cb);
}

function fetchMessages(searchCriteria, numMessages) {
  imap.search(searchCriteria, function (err, results) {
    if (err) {
      console.error("Search error:", err);
      imap.end();
      return;
    }

    const latestMessages = results.slice(-numMessages);
    if (latestMessages.length === 0) {
      console.log("No messages to fetch.");
      imap.end();
      return;
    }

    const f = imap.fetch(latestMessages, {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
      struct: true,
    });

    f.on("message", function (msg, seqno) {
      let header = "";
      let bodyParts = [];

      console.log(`Message #${seqno}`);

      msg.on("body", function (stream, info) {
        let buffer = "";
        stream.on("data", function (chunk) {
          buffer += chunk.toString("utf8");
        });
        stream.once("end", function () {
          if (info.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)") {
            header = buffer;
            const parsedHeader = Imap.parseHeader(header);

            console.log(
              `From: ${parsedHeader.from ? parsedHeader.from[0] : "N/A"}`
            );
            console.log(`To: ${parsedHeader.to ? parsedHeader.to[0] : "N/A"}`);
            console.log(
              `Subject: ${
                parsedHeader.subject ? parsedHeader.subject[0] : "N/A"
              }`
            );
            console.log(
              `Date: ${parsedHeader.date ? parsedHeader.date[0] : "N/A"}`
            );
          } else {
            bodyParts.push(buffer);
          }
        });
      });

      msg.once("attributes", function (attrs) {
        const fullBody = bodyParts.join("");
        const lines = fullBody.split("\n").slice(0, 2).join("\n");
        console.log("Body (first 2 lines):");
        console.log(lines);
        console.log("---");
      });
    });

    f.once("error", function (err) {
      console.error("Fetch error:", err);
    });

    f.once("end", function () {
      console.log("Done fetching messages!");
      imap.end();
    });
  });
}

function dateRange(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  return [
    ["SINCE", format(startDate, "dd-MMM-yyyy")],
    ["BEFORE", format(endDate, "dd-MMM-yyyy")],
  ];
}

function fetchAndProcessMessages(
  mailbox,
  numMessages,
  startDateStr,
  endDateStr
) {
  let searchCriteria;

  if (startDateStr && endDateStr) {
    searchCriteria = dateRange(startDateStr, endDateStr);
  } else {
    searchCriteria = ["ALL"];
  }

  imap.once("ready", function () {
    openMailbox(mailbox, true, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }
      fetchMessages(searchCriteria, numMessages);
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

function latest(numMessages) {
  fetchAndProcessMessages("INBOX", numMessages);
}

function all(startDateStr, endDateStr) {
  fetchAndProcessMessages(
    "INBOX",
    Number.MAX_SAFE_INTEGER,
    startDateStr,
    endDateStr
  );
}

function readOnDate(dateStr) {
  const searchCriteria = [["ON", format(new Date(dateStr), "dd-MMM-yyyy")]];

  imap.once("ready", function () {
    openMailbox("INBOX", true, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }
      fetchMessages(searchCriteria, Number.MAX_SAFE_INTEGER);
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

function starEmail(seqNo) {
  imap.once("ready", function () {
    openMailbox("INBOX", false, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }

      imap.addFlags(seqNo, ["\\Flagged"], function (err) {
        if (err) {
          console.error("Error starring message:", err);
        } else {
          console.log(`Message #${seqNo} has been starred.`);
        }
        imap.end();
      });
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

function fetchStarredEmails() {
  imap.once("ready", function () {
    openMailbox("INBOX", true, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }

      const searchCriteria = [["FLAGGED"]];
      fetchMessages(searchCriteria, Number.MAX_SAFE_INTEGER);
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

function markAsRead(seqNo, readStatus) {
  imap.once("ready", function () {
    openMailbox("INBOX", false, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }

      const flag = readStatus ? "\\Seen" : "\\Unseen";
      imap.addFlags(seqNo, [flag], function (err) {
        if (err) {
          console.error(
            `Error marking message #${seqNo} as ${
              readStatus ? "read" : "unread"
            }:`,
            err
          );
        } else {
          console.log(
            `Message #${seqNo} has been marked as ${
              readStatus ? "read" : "unread"
            }.`
          );
        }
        imap.end();
      });
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

// Function to search for emails from a specific sender
function searchBySender(senderEmail) {
  imap.once("ready", function () {
    openMailbox("INBOX", true, (err) => {
      if (err) {
        console.error("Open mailbox error:", err);
        imap.end();
        return;
      }

      const searchCriteria = [["FROM", senderEmail]];
      fetchMessages(searchCriteria, Number.MAX_SAFE_INTEGER);
    });
  });

  imap.once("error", function (err) {
    console.error("Connection error:", err);
  });

  imap.once("end", function () {
    console.log("Connection ended.");
  });

  imap.connect();
}

// Function to display available commands
function displayHelp() {
  console.log("Available commands:");
  console.log(
    "  send <recipients> <subject> <body> [attachmentPaths...] - Send an email"
  );
  console.log("  read latest <numMessages> - Fetch the latest messages");
  console.log(
    "  read all [startDate] [endDate] - Fetch all messages in a date range"
  );
  console.log("  read on <date> - Fetch messages on a specific date");
  console.log("  star <seqNo> - Star an email");
  console.log("  fetch starred - Fetch all starred emails");
  console.log(
    "  markread <seqNo> <true|false> - Mark an email as read or unread"
  );
  console.log("  searchsender <email> - Search emails from a specific sender");
  console.log("  help - Display this help message");
}

// Command-line arguments handling
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case "send":
    const [recipients, subject, body, ...attachments] = args;
    sendEmail(recipients, subject, body, attachments);
    break;
  case "read":
    const subCommand = args[0];
    if (subCommand === "latest") {
      const numMessages = parseInt(args[1], 10) || 1; // Default to 1 message
      latest(numMessages);
    } else if (subCommand === "all") {
      const startDate = args[1];
      const endDate = args[2];
      all(startDate, endDate);
    } else if (subCommand === "on") {
      const date = args[1];
      readOnDate(date);
    } else {
      console.log("Unknown read command. Type 'help' for usage information.");
    }
    break;
  case "star":
    const seqNo = parseInt(args[0], 10);
    starEmail(seqNo);
    break;
  case "fetch":
    if (args[0] === "starred") {
      fetchStarredEmails();
    } else {
      console.log("Unknown fetch command. Type 'help' for usage information.");
    }
    break;
  case "markread":
    const seqNoRead = parseInt(args[0], 10);
    const readStatus = args[1] === "true"; // Convert string to boolean
    markAsRead(seqNoRead, readStatus);
    break;
  case "searchsender":
    const senderEmail = args[0];
    searchBySender(senderEmail);
    break;
  case "help":
    displayHelp();
    break;
  default:
    console.log("Unknown command. Type 'help' for usage information.");
    break;
}
