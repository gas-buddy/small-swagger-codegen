import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

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
    opts: config.opts,
    configDir,
  };
}

function resolveSpec(fullPath) {
  const ext = (path.extname(fullPath) || '').toLowerCase();
  const data = fs.readFileSync(fullPath, 'utf8');
  if (['.yml', '.yaml'].includes(ext)) {
    return yaml.safeLoad(data);
  }
  return JSON.parse(data);
}

export function readConfig(argv) {
  const { language, apis, output, opts, configDir } = readFromPath(argv._?.[0]);

  if (!language && !argv.language) {
    throw new Error('Missing language: Please add "language": "swift", "language": "js" or "language": "kotlin" to the top level of your config file.');
  }

  if (!apis && (!argv.spec || !argv.name)) {
    throw new Error('Missing configuration file or spec/name arguments');
  }

  const rawSpecs = apis || {
    [argv.name]: {
      spec: argv.spec,
      className: argv.className || argv.name,
      basePath: argv.basePath || undefined,
    },
  };

  // If there's an output path in a config file, resolve the path relative to that config file.
  const resolvedOutput = configDir && output && path.resolve(configDir, output);

  const finalConfig = {
    language: language || argv.language,
    apis: _.mapValues(rawSpecs, api => ({
      ...api,
      // Load the specs from the file system
      spec: resolveSpec(api.spec),
    })),
    output: argv.output || resolvedOutput || 'client',
    opts: opts || argv,
  };

  return finalConfig;
}
