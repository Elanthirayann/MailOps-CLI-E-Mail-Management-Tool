const { format, isValid, parse } = require("date-fns");

function validateDate(dateStr) {
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  return isValid(date) && dateStr === format(date, "yyyy-MM-dd");
}

const [, , command, ...args] = process.argv;

if (command === "send") {
  const sendEmail = require("./send");

  const [recipients, subject, body, ...attachmentPaths] = args;
  sendEmail(recipients.split(","), subject, body, attachmentPaths);
} else if (command === "read") {
  const subCommand = args[0];
  const subArgs = args.slice(1);

  switch (subCommand) {
    case "latest":
      if (subArgs.length === 1 && !isNaN(subArgs[0])) {
        require("./read").latest(parseInt(subArgs[0], 10));
      } else {
        console.log("Usage: read latest <number-of-messages>");
        process.exit(1);
      }
      break;

    case "all":
      if (
        subArgs.length === 2 &&
        validateDate(subArgs[0]) &&
        validateDate(subArgs[1])
      ) {
        require("./read").all(subArgs[0], subArgs[1]);
      } else if (subArgs.length === 0) {
        require("./read").all();
      } else {
        console.log("Usage: read all [<start-date> <end-date>]");
        console.log("Date format: YYYY-MM-DD");
        process.exit(1);
      }
      break;

    default:
      console.log(
        "Usage: read [latest <number-of-messages> | all [<start-date> <end-date>]]"
      );
      process.exit(1);
  }
} else {
  console.log("Usage: [send|read] [arguments]");
}
