"use strict";

const scheme = /^[A-Za-z][A-Za-z\d+.-]*:/;

function isIgnoredDestination(destination) {
  return !destination ||
    destination.startsWith("#") ||
    destination.startsWith("//");
}

function isExternalDestination(destination) {
  return scheme.test(destination) ||
    destination.startsWith("//");
}

function isLocalDestination(destination) {
  return !isIgnoredDestination(destination) &&
    !isExternalDestination(destination);
}

function pathname(destination) {
  if (scheme.test(destination)) {
    try {
      return new URL(destination).pathname || "";
    } catch {
      return destination.split(/[?#]/, 1)[0];
    }
  }
  return destination.split(/[?#]/, 1)[0];
}

function lastPathSegment(destination) {
  const path = pathname(destination);
  return path.slice(path.lastIndexOf("/") + 1);
}

function isFileDestination(destination) {
  return lastPathSegment(destination)
    .split(".")
    .slice(1)
    .some((afterDot) => afterDot.length > 0 && !/(\s|%20)/iu.test(afterDot));
}

function isMarkdownFileDestination(destination) {
  return /\.md$/iu.test(lastPathSegment(destination));
}

function hasWhitespace(destination) {
  return /\s/u.test(destination);
}

function hasFilesDirectory(destination) {
  return pathname(destination).includes("/_files/");
}

function destinationWithoutTitle(text) {
  let end = text.length;
  while (end > 0 && /\s/u.test(text[end - 1])) {
    end--;
  }

  if (end > 0) {
    const close = text[end - 1];
    const open = close === "\"" ? "\"" :
      close === "'" ? "'" :
      close === ")" ? "(" :
      "";
    if (open) {
      const start = text.lastIndexOf(open, end - 2);
      if (start > 0 && /\s/u.test(text[start - 1])) {
        end = start - 1;
        while (end > 0 && /\s/u.test(text[end - 1])) {
          end--;
        }
      }
    }
  }

  return text.slice(0, end);
}

function destinationFromInlineBody(body) {
  const leadingWhitespaceLength = body.length - body.trimStart().length;
  const trimmed = body.trimStart();
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">");
    return {
      destination: close === -1 ? trimmed.slice(1) : trimmed.slice(1, close),
      offset: leadingWhitespaceLength + 1
    };
  }
  const destination = destinationWithoutTitle(trimmed);
  return {
    destination,
    offset: leadingWhitespaceLength
  };
}

function ignoredCodeRanges(params) {
  const ranges = [];
  const visit = (tokens) => {
    for (const token of tokens || []) {
      if ([ "codeFenced", "codeIndented", "codeText" ].includes(token.type)) {
        ranges.push(token);
      } else {
        visit(token.children);
      }
    }
  };
  visit(params.parsers.micromark.tokens);
  return ranges;
}

function isInIgnoredRange(lineNumber, column, ranges) {
  return ranges.some((range) => {
    if (lineNumber < range.startLine || lineNumber > range.endLine) {
      return false;
    }
    if (range.startLine === range.endLine) {
      return column >= range.startColumn && column < range.endColumn;
    }
    return (lineNumber > range.startLine || column >= range.startColumn) &&
      (lineNumber < range.endLine || column < range.endColumn);
  });
}

function rawInlineDestinations(params) {
  const destinations = [];
  const inlineLink = /!?\[[^\]\n]*\]\(([^)\n]*)\)/g;
  const ranges = ignoredCodeRanges(params);
  params.lines.forEach((line, index) => {
    for (const match of line.matchAll(inlineLink)) {
      const { destination, offset } = destinationFromInlineBody(match[1]);
      const bodyOffset = match[0].indexOf(match[1]);
      const column = match.index + bodyOffset + offset + 1;
      if (!isInIgnoredRange(index + 1, column, ranges)) {
        destinations.push({ destination, lineNumber: index + 1, column });
      }
    }
  });
  return destinations;
}

function parsedDestinations(params) {
  const destinations = [];
  const visit = (tokens) => {
    for (const token of tokens || []) {
      if (token.type === "resourceDestinationString" ||
          token.type === "definitionDestinationString") {
        destinations.push({
          destination: destinationWithoutTitle(token.text),
          lineNumber: token.startLine,
          column: token.startColumn
        });
      }
      visit(token.children);
    }
  };
  visit(params.parsers.micromark.tokens);
  return destinations;
}

function destinations(params) {
  const result = rawInlineDestinations(params);
  const seen = new Set(result.map(({ destination, lineNumber, column }) =>
    `${lineNumber}\0${column}\0${destination}`));
  for (const item of parsedDestinations(params)) {
    const key = `${item.lineNumber}\0${item.column}\0${item.destination}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function replaceDestinationFix(item, replacement) {
  return {
    lineNumber: item.lineNumber,
    editColumn: item.column,
    deleteCount: item.destination.length,
    insertText: replacement
  };
}

function insertAtDestinationStartFix(item, text) {
  return {
    lineNumber: item.lineNumber,
    editColumn: item.column,
    deleteCount: 0,
    insertText: text
  };
}

function replaceDestinationTextFix(item, index, deleteCount, insertText) {
  return {
    lineNumber: item.lineNumber,
    editColumn: item.column + index,
    deleteCount,
    insertText
  };
}

function removeMarkdownExtensionFix(item) {
  const path = pathname(item.destination);
  const extensionIndex = path.toLowerCase().lastIndexOf(".md");
  return {
    lineNumber: item.lineNumber,
    editColumn: item.column + extensionIndex,
    deleteCount: 3,
    insertText: ""
  };
}

function report(onError, params, item, detail, fixInfo) {
  const line = params.lines[item.lineNumber - 1] || "";
  const column = item.column || Math.max(1, line.indexOf(item.destination) + 1);
  const error = {
    lineNumber: item.lineNumber,
    detail,
    context: item.destination,
    range: [ column, Math.max(1, item.destination.length) ]
  };
  if (fixInfo) {
    error.fixInfo = fixInfo;
  }
  onError(error);
}

module.exports = {
  destinations,
  destinationWithoutTitle,
  hasFilesDirectory,
  hasWhitespace,
  isExternalDestination,
  isFileDestination,
  isIgnoredDestination,
  isLocalDestination,
  isMarkdownFileDestination,
  pathname,
  insertAtDestinationStartFix,
  removeMarkdownExtensionFix,
  replaceDestinationFix,
  replaceDestinationTextFix,
  report
};
