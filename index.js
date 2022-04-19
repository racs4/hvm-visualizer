#!/usr/bin/env node

const { writeFileSync, readFileSync } = require("fs");
const path = require("path");
const exec = require("child_process").spawnSync;

const http = require('http');
const url = require('url');
const fs = require('fs');
const port = 9000;

async function read(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  // Reading args
  const type = process.argv[2];
  const arg = process.argv[3];
  if (!type || (!arg && type !== "s") || (type != "t" && type != "f" && type != "s")) {
    showMessage();
    return;
  }

  // Getting debug content
  let debugContent = (await (async function () {
    switch (type) {
      case "f": // from a file
        return readFileSync(arg).toString();
      case "s": // from stdin
        return await read(process.stdin);
      case "t": // from cli text
        return arg;
    }
  })()).replaceAll("${", "\\${"); // replace is needed because of JS syntax ${}
  
  // Create server
  http.createServer(function (req, res) {
    // Parse URL
    const parsedUrl = url.parse(req.url);
    // Extract URL path
    let pathname = `.${parsedUrl.pathname}`;

    // =========================
    // Index route
    if (path.parse(pathname).name === ".") {
      res.end(getHTML(debugContent));
      return;
    }

    // =========================
    // All other routes

    // Based on the URL path, extract the file extension. e.g. .js, .doc, ...
    const ext = path.parse(pathname).ext;

    // Getting the file in the app build folder
    pathname = path.join(__dirname, "app", "build", pathname);
    fs.access(pathname, function (err) {
      if (err) {
        // If the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      }

      // Read file from file system
      fs.readFile(pathname, function (err, data) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          // If the file is found, set Content-type and send data
          res.setHeader('Content-type', getMIME(ext) || 'text/plain');
          res.end(data);
        }
      });
    });

  }).listen(parseInt(port)); // listen in the port

  console.log(`Server listening on http://localhost:${port}`);
}

function getHTML(debugContent) {
  // Get index.html in /app/build folder
  // Replace the necessary place with the debug content
  return fs
    .readFileSync(path.join(__dirname, "app", "build", "index.html"))
    .toString()
    .replace(".value=\"\"", ".value = `" + debugContent + "`");
}

function showMessage() {
  console.log(
    "To use with text: hvm-visualizer t <text-content>\n" +
    "To use with stdin (assumes that you have hvm installed): hvm d <hvm-file> <hvm-arg> | hvm-visualizer s\n" +
    "To use with file: hvm-visualizer f <file>\n"
  );
}

function getMIME(extension) {
  // Maps file extension to MIME typere
  const map = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
  };

  return map[extension];
}

main().then().catch(err => { console.error(err); showMessage(); });
