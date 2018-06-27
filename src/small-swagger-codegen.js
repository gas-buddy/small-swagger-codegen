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
const outputArg = argv._ && argv._.length && argv._[1];
if (!pathArg) {
  console.log('Missing argument: pass the path to your config file as an argument.');
  process.exit(1);
}
if (!outputArg || !_.includes(["swift", "kotlin"], _.lowerCase(outputArg)) ) {
  console.log('Missing argument: pass either kotlin or swift for output.');
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
const templateDatas = templateDatasFromSpecs(specs, config);
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

if (outputArg == "kotlin") {
  const kotlinTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'template-kotlin.handlebars'), 'utf8'));
  // Render everything and write output files.
  _.forEach(templateDatas, (templateData, apiName) => {
    const specConfig = config.specs[apiName];
    const apiVersion = specs[apiName].info.version;
    const kotlinRendered = kotlinTemplate({ ...templateData, apiClassName: specConfig.className });

    _.forEach([[kotlinRendered, `${apiName}.kt`]], ([output, file]) => {
      fs.writeFileSync(path.join(configDir, config.output, file), output);
    });
  });
} else {
  const [template, modelClassTemplate, podtemplate] = _.map([
    'template.handlebars', 'modelClassTemplate.handlebars', 'podtemplate.handlebars',
  ], t => handlebars.compile(fs.readFileSync(path.join(__dirname, t), 'utf8')));

  handlebars.registerPartial('modelClassTemplate', modelClassTemplate);

  // Render everything and write output files.
  _.forEach(templateDatas, (templateData, apiName) => {
    const specConfig = config.specs[apiName];
    const apiVersion = specs[apiName].info.version;

    const rendered = template({ ...templateData, apiClassName: specConfig.className });
    const kotlinRendered = kotlinTemplate({ ...templateData, apiClassName: specConfig.className });
    const renderedPodSpec = podtemplate({ apiName, apiVersion });

    _.forEach([
      [rendered, `${apiName}.swift`],
      [renderedPodSpec, `${apiName}.podspec`],
      [kotlinRendered, `${apiName}.kt`]
    ], ([output, file]) => {
      fs.writeFileSync(path.join(configDir, config.output, file), output);
    });
  });
}

