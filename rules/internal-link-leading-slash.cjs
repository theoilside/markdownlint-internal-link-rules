"use strict";

const {
  destinations,
  insertAtDestinationStartFix,
  isLocalDestination,
  report
} = require("./link-utils.cjs");

const autoFixPrefixes = [
  "Внутренняя%20документация",
  "Внутренняя документация",
  "Агентская%20документация",
  "Агентская документация",
  "Публичная%20документация",
  "Публичная документация"
];

function leadingSlashFixInfo(item) {
  return autoFixPrefixes.some((prefix) => item.destination.startsWith(prefix)) ?
    insertAtDestinationStartFix(item, "/") :
    undefined;
}

/** @type {import("markdownlint").Rule} */
module.exports = {
  names: [ "CR002", "internal-link-leading-slash" ],
  description: "Local links should start with /",
  tags: [ "links" ],
  parser: "micromark",
  function: (params, onError) => {
    for (const item of destinations(params)) {
      if (isLocalDestination(item.destination) &&
          !item.destination.startsWith("/")) {
        report(
          onError,
          params,
          item,
          "Start local links with /",
          leadingSlashFixInfo(item)
        );
      }
    }
  }
};
