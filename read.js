const Imap = require("node-imap");
const { format } = require("date-fns");
require("dotenv").config();

const config = {
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT, 10),
  tls: process.env.IMAP_TLS === "true",
};

const imap = new Imap(config);

function openMailbox(mailbox, cb) {
  imap.openBox(mailbox, true, cb);
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
      let body = "";
      let isHtml = false;
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
            const contentTypeMatch = buffer.match(/Content-Type:\s*([^;]+)/);
            if (contentTypeMatch) {
              isHtml = contentTypeMatch[1].toLowerCase() === "text/html";
            }
          }
        });
      });

      msg.once("attributes", function (attrs) {
        const structure = attrs.struct;

        if (structure && structure.length > 1) {
          let multipartBody = "";
          structure.forEach((part) => {
            if (part.body && part.body.type === "TEXT") {
              multipartBody += bodyParts.join("");
            }
          });

          
          const lines = multipartBody.split("\n").slice(0, 2).join("\n");
          console.log("Body (first 2 lines):");
          console.log(lines);
          console.log("---");
        } else {
          
          const fullBody = bodyParts.join("");
          const lines = fullBody.split("\n").slice(0, 2).join("\n");
          console.log("Body (first 2 lines):");
          console.log(lines);
          console.log("---");
        }
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
    openMailbox(mailbox, (err) => {
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

module.exports = {
  latest,
  all,
};
