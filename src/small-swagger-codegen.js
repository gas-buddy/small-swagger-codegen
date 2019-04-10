#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import minimist from 'minimist';
import handlebars from 'handlebars';
import templateDatasFromSpecs from './templateDatasFromSpecs';
import { readConfig } from './configReader';

// Process command line args.
const argv = minimist(process.argv.slice(2));
const { language, specs } = readConfig(argv);
const templateDatas = templateDatasFromSpecs(specs, config, language);

verify(templateDatas);

// Setup handlebars.
handlebars.registerHelper('maybeComment', function maybeComment(arg, options) {
  if (!arg) { return arg; }
  const data = options.data ? undefined : { data: handlebars.createFrame(options.data) };
  const string = options.fn ? options.fn(this, data) : '';
  if (!string || string.trim() === '') {
    return undefined;
  }
  const trimmed = string.trim().replace(/\n/g, ' ');
  const numSpaces = string.search(/\S/);
  return `${' '.repeat(numSpaces)}/// ${trimmed}\n`;
});

handlebars.registerHelper('oneline', function oneline(options) {
  return options.fn(this).trim().replace(/\n/g, ' ').trim();
});

handlebars.registerHelper('isNotBodyParam', function isNotBodyParam(arg, options) {
  if (!arg) { return arg; }
  if (arg.inCap !== 'Body') {
    return options.fn(this);
  }
  return options.inverse(this);
});

const templateFiles = [`${language}-template.handlebars`, `${language}-modelClassTemplate.handlebars`];
if (lang === 'swift') {
  templateFiles.push(`${language}-podtemplate.handlebars`);
}
const [
  template, modelClassTemplate, podtemplate,
] = _.map(templateFiles, t => handlebars.compile(fs.readFileSync(path.join(__dirname, t), 'utf8')));

handlebars.registerPartial('modelClassTemplate', modelClassTemplate);

// Render everything and write output files.
_.forEach(templateDatas, (templateData, apiName) => {
  const specConfig = config.specs[apiName];
  const apiVersion = specs[apiName].info.version;

  const rendered = template({ ...templateData, apiClassName: specConfig.className });
  const extension = { kotlin: 'kt', swift: 'swift' }[lang];
  fs.writeFileSync(path.join(configDir, config.output, `${apiName}.${extension}`), rendered);
  if (podtemplate) {
    const renderedPodSpec = podtemplate({ apiName, apiVersion });
    fs.writeFileSync(path.join(configDir, config.output, `${apiName}.podspec`), renderedPodSpec);
  }
});
