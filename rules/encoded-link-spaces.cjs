"use strict";

const {
  destinations,
  hasWhitespace,
  replaceDestinationTextFix,
  report
} = require("./link-utils.cjs");

/** @type {import("markdownlint").Rule} */
module.exports = {
  names: [ "CR001", "encoded-link-spaces" ],
  description: "Spaces in links should be encoded as %20",
  tags: [ "links" ],
  parser: "micromark",
  function: (params, onError) => {
    for (const item of destinations(params)) {
      if (hasWhitespace(item.destination)) {
        for (const match of item.destination.matchAll(/\s/gu)) {
          report(
            onError,
            params,
            item,
            "Encode spaces in links as %20",
            replaceDestinationTextFix(item, match.index, match[0].length, "%20")
          );
        }
      }
    }
  }
};
