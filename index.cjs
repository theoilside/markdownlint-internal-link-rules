"use strict";

module.exports = [
  require("./rules/encoded-link-spaces.cjs"),
  require("./rules/internal-link-leading-slash.cjs"),
  require("./rules/no-md-file-links.cjs"),
  require("./rules/internal-file-link-files-directory.cjs")
];
