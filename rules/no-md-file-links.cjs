"use strict";

const {
  destinations,
  isLocalDestination,
  isMarkdownFileDestination,
  removeMarkdownExtensionFix,
  report
} = require("./link-utils.cjs");

/** @type {import("markdownlint").Rule} */
module.exports = {
  names: [ "CR003", "no-md-file-links" ],
  description: "Local links should not use the .md extension",
  tags: [ "links" ],
  parser: "micromark",
  function: (params, onError) => {
    for (const item of destinations(params)) {
      if (isLocalDestination(item.destination) &&
          isMarkdownFileDestination(item.destination)) {
        report(
          onError,
          params,
          item,
          "Remove the .md extension from local links",
          removeMarkdownExtensionFix(item)
        );
      }
    }
  }
};
