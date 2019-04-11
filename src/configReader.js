import _ from 'lodash';
import fs from 'fs';
import path from 'path';

function readFromPath(pathArg) {
  if (!pathArg) {
    return {};
  }

  const configPath = path.resolve(pathArg);
  const configDir = path.dirname(configPath);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    apis: _.mapValues(config.specs, specConfig => ({
      ...specConfig,
      spec: path.resolve(path.join(configDir, specConfig.spec)),
    })),
    language: config.language,
    output: config.output,
  };
}

export function readConfig(argv) {
  const { language, apis, output } = readFromPath(argv._?.[0]);

  if (!language && !argv.language) {
    throw new Error('Missing language: Please add "language": "swift", "language": "js" or "language": "kotlin" to the top level of your config file.');
  }

  if (!apis && (!argv.spec || !argv.name)) {
    throw new Error('Missing configuration file or spec/className arguments');
  }

  const rawSpecs = apis || {
    [argv.name]: {
      spec: argv.spec,
      className: argv.className || argv.name,
      basePath: argv.basePath || undefined,
    },
  };

  const finalConfig = {
    language: language || argv.language,
    apis: _.mapValues(rawSpecs, api => ({
      ...api,
      // Load the specs from the file system
      spec: JSON.parse(fs.readFileSync(api.spec, 'utf8')),
    })),
    output: output || argv.output || 'client',
  };

  return finalConfig;
}
