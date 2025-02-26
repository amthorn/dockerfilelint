'use strict';
import chalk from 'chalk';
import cliui from 'cliui';
import Reporter from './reporter.js';

const DEFAULT_TOTAL_WIDTH = process.stdout.columns;
const ISSUE_COL0_WIDTH = 5;
const ISSUE_COL1_WIDTH = 16;
const ISSUE_TITLE_WIDTH_MAX = 40;

const PAD_TOP0_LEFT2 = [0, 0, 0, 2];
const PAD_TOP1_LEFT0 = [1, 0, 0, 0];

export default class CliReporter extends Reporter {
  constructor (opts) {
    super(opts);
    opts = opts || { width: DEFAULT_TOTAL_WIDTH, wrap: true };
    opts.width = parseInt(opts.width, 10) || DEFAULT_TOTAL_WIDTH;
    this.ui = cliui(opts);
    this.issueTitleWidth = Math.min(ISSUE_TITLE_WIDTH_MAX, parseInt((opts.width - ISSUE_COL0_WIDTH - ISSUE_COL1_WIDTH - 2) / 3.95, 10));
    this.categoryStyles = {
      'Deprecation': chalk.red,
      'Possible Bug': chalk.yellow,
      'Clarity': chalk.cyan,
      'Optimization': chalk.cyan,
      'Cisco Standard': chalk.white,
    };
    this.severityStyles = {
      'Info': chalk.cyan,
      'Warning': chalk.yellow,
      'Error': chalk.red
    };
  }

  // build a report object for data given via addFile
  buildReport () {
    let self = this;
    let totalIssues = 0;
    let error = false;
    Object.keys(self.fileReports).forEach((file) => {
      let fileReport = self.fileReports[file];
      self.ui.div(
        { text: 'File:   ' + file, padding: PAD_TOP1_LEFT0 }
      );
      if(typeof fileReport.customRulesetPath === 'string' && fileReport.customRulesetPath){
        self.ui.div('Custom Ruleset:   ' + fileReport.customRulesetPath);
      }
      let linesWithItems = Object.keys(fileReport.itemsByLine);
      if (linesWithItems.length === 0) {
        self.ui.div('Issues: ' + chalk.green('None found') + ' 👍');
        return;
      }
      totalIssues += fileReport.uniqueIssues;
      self.ui.div('Issues: ' + String(fileReport.uniqueIssues));

      let itemNum = 1;
      linesWithItems.forEach((lineNum) => {
        if (lineNum !== "-1") {
          self.ui.div({
            text: 'Line ' + lineNum + ': ' + chalk.magenta(fileReport.contentArray[parseInt(lineNum, 10) - 1]),
            padding: PAD_TOP1_LEFT0
          });
        }
        self.ui.div(
          { text: 'Issue', width: ISSUE_COL0_WIDTH },
          { text: 'Rule', padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
          { text: 'Severity', padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
          { text: 'Category', padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
          { text: 'Title', padding: PAD_TOP0_LEFT2, width: self.issueTitleWidth },
          { text: 'Description', padding: PAD_TOP0_LEFT2 }
        );
        fileReport.itemsByLine[lineNum].forEach((item) => {
          let cat = item.category;
          let categoryStyle = self.categoryStyles[cat] || self.categoryStyles['Clarity'];
          let severityStyle = self.severityStyles[item.severity] || self.severityStyles['Error'];
          if (item.severity === 'Error') error = true;
          self.ui.div(
            { text: categoryStyle(String(itemNum++)), width: ISSUE_COL0_WIDTH, align: 'right' },
            { text: item.rule, padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
            { text: severityStyle.inverse(item.severity), padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
            { text: categoryStyle.inverse(item.category), padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
            { text: categoryStyle(item.title), padding: PAD_TOP0_LEFT2, width: self.issueTitleWidth },
            { text: chalk.gray(item.description), padding: PAD_TOP0_LEFT2 }
          );
        });
      });
    });
    self.ui.div();
    return { toString: self.ui.toString.bind(self.ui), totalIssues: totalIssues, error: error };
  }
}
