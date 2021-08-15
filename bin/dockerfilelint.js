#!/usr/bin/env node
import process from 'process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yargs from 'yargs';
import { run } from '../lib/index.js';
import chalk from 'chalk';
import json_reporter from '../lib/reporter/json_reporter.js';
import cli_reporter from '../lib/reporter/cli_reporter.js';
var usage = 'Usage: dockerfilelint [files | content..] [options]';

let argv = yargs
  .usage(usage)
  .option('o', {
    alias: 'output',
    desc: 'Specify the format to use for output of linting results. Valid values are `json` or `cli` (default).',
    type: 'string'
  })
  .option('j', {
    alias: 'json',
    desc: 'Output linting results as JSON, equivalent to `-o json`.',
    type: 'boolean'
  })
  .option('c', {
    alias: 'config',
    desc: 'Path for .dockerfilelintrc configuration file',
    type: 'string'
  })
  .option('r', {
    alias: 'ruleset',
    desc: 'Path for custom ruleset js file',
    type: 'string'
  })
  .alias('v', 'version')
  .help().alias('h', 'help')
  .example('dockerfilelint Dockerfile', 'Lint a Dockerfile in the current working directory\n')
  .example('dockerfilelint test/example/* -j', 'Lint all files in the test/example directory and output results in JSON\n')
  .example(`dockerfilelint 'FROM latest'`, 'Lint the contents given as a string on the command line\n')
  .example('dockerfilelint < Dockerfile', 'Lint the contents of Dockerfile via stdin')
  .example('dockerfilelint -r custom-ruleset.js Dockerfile', 'Lint the contents of Dockerfile using the default rules plus a set of custom rules defined in custom-ruleset.js')
  .wrap(86)
  .check(argv => {
    if (!argv.output && argv.json) argv.output = 'json'
    return true
  })
  .argv;


var Reporter = argv.output === 'json' ? json_reporter : cli_reporter;
var reporter = new Reporter();

var fileContent, configFilePath, customRuleset;
if (argv._.length === 0 || argv._[0] === '-') {
  // read content from stdin
  fileContent = '';
  configFilePath = '.';

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (chunk) {
    fileContent += chunk;
  });
  process.stdin.on('end', function () {
    if (fileContent.length === 0) {
      console.error(usage);
      return process.exit(1);
    }
    processContent(configFilePath, '<stdin>', fileContent);
    report();
  });
}

argv._.forEach((fileName) => {
  try {
    var stats = fs.lstatSync(fileName);
    if (stats.isFile()) {
      fileContent = fs.readFileSync(fileName, 'UTF-8');
      var root = (os.platform == "win32") ? process.cwd().split(path.sep)[0] : "/";
      configFilePath = argv.config || path.resolve(path.dirname(fileName));
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      fileContent = fileName;
      fileName = '<contents>';
      configFilePath = './';
    }
  }

  if (!fileContent) {
    console.error(chalk.red('Invalid input:'), fileName);
    return process.exit(1);
  }
  let customRules = {};
  if (argv.ruleset){
    const absPath = path.join(process.cwd(), argv.ruleset);
    import(absPath).then((customRules) => {
      execute(configFilePath, fileName, fileContent, customRules.rules);
    })
  }else{
    execute(configFilePath, fileName, fileContent, customRules);
  }
});

function execute(configFilePath, fileName, fileContent, customRules){
  processContent(configFilePath, fileName, fileContent, customRules)
  report();
}

function processContent (configFilePath2, name, content, customRules) {
  let items = run({
    configFilePath2: configFilePath2,
    content: content,
    ruleContents: customRules
  })
  reporter.addFile(name, content, items, customRules);
}

function report () {
  var report = reporter.buildReport();
  console.log(report.toString());
  process.exit(report.error ? report.totalIssues : 0);
}
