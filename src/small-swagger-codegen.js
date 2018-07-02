#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import minimist from 'minimist';
import handlebars from 'handlebars';
import templateDatasFromSpecs from './templateDatasFromSpecs';
// eslint-disable-next-line no-unused-vars
import { describe, log, verify } from './verify';

// Process command line args.
const argv = minimist(process.argv.slice(2));
const pathArg = argv._ && argv._.length && argv._[0];
if (!pathArg) {
  console.error('Missing argument: pass the path to your config file as an argument.');
  process.exit(1);
}
const configPath = path.resolve(pathArg);
const configDir = path.dirname(configPath);

// Turn the specs into data we'll use to render our templates.
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const specs = _.mapValues(config.specs, (specConfig) => {
  const specPath = path.resolve(path.join(configDir, specConfig.spec));
  return JSON.parse(fs.readFileSync(specPath));
});
const lang = config.language;
if (!lang) {
  console.error(
    'Missing language: Please add "language": "swift" or "language": "kotlin" to the top level of your config file.',
  );
  process.exit(1);
}
const templateDatas = templateDatasFromSpecs(specs, config, lang);
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

handlebars.registerHelper('isNotBodyParam', function isNotBodyParam(arg, options) {
  if (!arg) { return arg; }
  if (arg.inCap !== 'Body') {
    return options.fn(this);
  }
  return options.inverse(this);
});

const templateFiles = [`${lang}-template.handlebars`, `${lang}-modelClassTemplate.handlebars`];
if (lang === 'swift') {
  templateFiles.push(`${lang}-podtemplate.handlebars`);
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
