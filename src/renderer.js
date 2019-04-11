import fs from 'fs';
import _ from 'lodash';
import handlebars from 'handlebars';
import { verify } from './verify';
import templateDatasFromSpecs from './templateDatasFromSpecs';
import setupHandlebars from './handlebarHelpers';
import swift from './swift';
import kotlin from './kotlin';
import js from './js';

const languages = { swift, kotlin, js };

export default function render(languageName, apis, options) {
  const language = languages[languageName];
  const templateDatas = templateDatasFromSpecs(apis, language);
  verify(templateDatas);

  setupHandlebars(handlebars);

  const templateSpecs = language.templates;
  const compiledTemplates = templateSpecs.map(({ source }) => handlebars.compile(fs.readFileSync(source, 'utf8')));

  templateSpecs.forEach(({ partial }, index) => {
    if (partial) {
      handlebars.registerPartial('modelClassTemplate', compiledTemplates[index]);
    }
  });

  // Render everything and write output files.
  const outputs = _.map(templateDatas, (templateData, apiName) => {
    const specConfig = apis[apiName].spec;
    const apiVersion = specConfig.info.version;

    return templateSpecs
      .map(({ filename, partial }, index) => {
        if (partial) {
          return null;
        }

        const templateArgs = {
          ...templateData,
          options,
          apiClassName: apis[apiName].className || apis[apiName].name,
          apiName,
          apiVersion,
        };
        const rendered = compiledTemplates[index](templateArgs);
        return [filename(templateArgs), rendered];
      })
      .filter(_.identity);
  });
  return _.fromPairs(_.flatten(outputs));
}
