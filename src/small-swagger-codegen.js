#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import minimist from 'minimist';
import { readConfig } from './configReader';
import render from './renderer';

// Process command line args.
const argv = minimist(process.argv.slice(2));

// eslint-disable-next-line consistent-return
function safeConfigRead() {
  try {
    return readConfig(argv);
  } catch (error) {
    console.error(error.message);
    process.exit(-1);
  }
}

const { language, apis, output, opts, exclude } = safeConfigRead();
const parts = render(language, apis, opts);

Object.entries(parts).forEach(([filename, content]) => {
  const fullPath = path.join(output, filename);
  if (!exclude || !exclude.includes(filename)) {
    mkdirp.sync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content);
  }
});
