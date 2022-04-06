#!/usr/bin/env node

const { writeFileSync, readFileSync } = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

const express = require('express')
const app = express()

function main() {
  const filePath = process.argv[2];
  const debugContent = readFileSync(filePath).toString().replaceAll("${", "\\${");

  const gambiarraPath = path.join(__dirname, "src", "gambiarra.js");
  const gambiarraFile = readFileSync(gambiarraPath);
  const newGambiarraContent = gambiarraFile.toString().replace(/const value = `.*`;/sm, "const value = `" + debugContent + "`;");

  writeFileSync(gambiarraPath, newGambiarraContent);

  
  app.use(express.static('src'));
  app.listen(4000, () => {
    console.log("Serving... in http://localhost:4000");
  })
}

main();
