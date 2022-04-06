#!/usr/bin/env node

const { writeFileSync, readFileSync } = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

const http = require('http');
const url = require('url');
const fs = require('fs');
const port = process.argv[3] || 9000;


function main() {
  const filePath = process.argv[2];
  const debugContent = readFileSync(filePath).toString().replaceAll("${", "\\${");

  // const gambiarraPath = path.join(__dirname, "src", "index.html");
  // const gambiarraFile = readFileSync(gambiarraPath);
  const newGambiarraContent = gambiarraContent(debugContent);


  http.createServer(function (req, res) {
    // console.log(`${req.method} ${req.url}`);

    // parse URL
    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;
    if (path.parse(pathname).name === ".") {
      res.end(gambiarraContent(debugContent));
      return;
    }

    // based on the URL path, extract the file extension. e.g. .js, .doc, ...
    const ext = path.parse(pathname).ext;
    // maps file extension to MIME typere
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

    pathname = path.join(__dirname, "src", pathname);
    fs.access(pathname, function (err) {
      if (err) {
        // if the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      }

      // if is a directory search for index file matching the extension
      // if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

      // read file from file system
      fs.readFile(pathname, function (err, data) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          // if the file is found, set Content-type and send data
          res.setHeader('Content-type', map[ext] || 'text/plain');
          res.end(data);
        }
      });
    });


  }).listen(parseInt(port));

  console.log(`Server listening on http://localhost:${port}`);
}

function gambiarraContent(debugContent) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Kindelia" />
    <title>Kindelia</title>
    <script>
      if (
        ((window.__REACT_DEVTOOLS_SHOW_INLINE_WARNINGS_AND_ERRORS__ = !1),
        (window.__REACT_DEVTOOLS_HIDE_CONSOLE_LOGS_IN_STRICT_MODE__ = !0),
        "object" == typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
      )
        for (let [_, O] of Object.entries(
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__
        ))
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__[_] =
            "function" == typeof O ? () => {} : null;
    </script>
    <script defer="defer" src="/static/js/main.de70d8c1.js"></script>
    <link href="/static/css/main.40e987fc.css" rel="stylesheet" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script>
      document.addEventListener("DOMContentLoaded", function (event) {
        const textarea = document.querySelector("textarea");
        const value = \`${debugContent} \`;
        textarea.value = value;
        document.querySelector("button").click();
      });
    </script>
  </body>
</html>  
`;
}

main();
