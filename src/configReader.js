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
    specs: _.mapValues(config.specs, (specConfig) => {
      const specPath = path.resolve(path.join(configDir, specConfig.spec));
      return JSON.parse(fs.readFileSync(specPath));
    }),
    language: config.language,
  };
}

export function readConfig(argv) {
  const { language, specs } = readFromPath(argv._?.[0]);

  if (!specs && !argv.specs && !argv.className) {
    console.error('Missing configuration file or spec/className arguments');
    process.exit(-1);
  }

  const finalConfig = {
    language: language || argv.language,
    specs: specs || [{
      spec: argv.spec,
      className: argv.className,
      basePath: argv.basePath || undefined,
    }],
  };

  // Turn the specs into data we'll use to render our templates.
  if (!finalConfig.language) {
    console.error('Missing language: Please add "language": "swift", "language": "js" or "language": "kotlin" to the top level of your config file.');
    process.exit(1);
  }

  return finalConfig;
}
