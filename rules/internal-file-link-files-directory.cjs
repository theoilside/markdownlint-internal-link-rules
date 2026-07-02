"use strict";

const {
  destinations,
  hasFilesDirectory,
  isFileDestination,
  isLocalDestination,
  report
} = require("./link-utils.cjs");

/** @type {import("markdownlint").Rule} */
module.exports = {
  names: [ "CR004", "internal-file-link-files-directory" ],
  description: "Local file links should contain /_files/ in the path",
  tags: [ "links" ],
  parser: "micromark",
  function: (params, onError) => {
    for (const item of destinations(params)) {
      if (isLocalDestination(item.destination) &&
          isFileDestination(item.destination) &&
          !hasFilesDirectory(item.destination)) {
        report(
          onError,
          params,
          item,
        );
      }
    }
  }
};
