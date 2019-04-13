import fs from 'fs';
import path from 'path';
import tap from 'tap';
import { readConfig } from '../src/configReader';
import render from '../src/renderer';

function compareFiles(test, items) {
  Object.entries(items).forEach(([fname, content]) => {
    const snapshot = fs.readFileSync(path.resolve(__dirname, 'snapshots', fname), 'utf8');
    test.strictEquals(snapshot, content, 'Content should match');
  });
}

tap.test('test_generators', (test) => {
  test.throws(() => readConfig({}), 'Should fail on empty config');
  test.throws(() => readConfig({ spec: './feature-api-spec.json' }), 'Should fail on incomplete config');

  const cliSwiftSpec = readConfig({
    spec: 'tests/feature-api-spec.json',
    name: 'FeatureApi',
    language: 'swift',
    basePath: '/feature',
    className: 'FeatureAPI',
  });

  const items = render(cliSwiftSpec.language, cliSwiftSpec.apis);
  test.strictEquals(Object.values(items).length, 2, 'Should return 2 items to be rendered');
  compareFiles(test, items);

  const cliKtSpec = readConfig({
    spec: 'tests/feature-api-spec.json',
    name: 'FeatureAPI',
    language: 'kotlin',
    basePath: '/feature',
  });

  const ktCliItem = render(cliKtSpec.language, cliKtSpec.apis);
  test.strictEquals(Object.values(ktCliItem).length, 1, 'Should return 1 item to be rendered');
  compareFiles(test, ktCliItem);

  const fsConfig = readConfig({ _: ['tests/config.json'] });
  const ktItem = render(fsConfig.language, fsConfig.apis);
  test.strictEquals(Object.values(ktItem).length, 1, 'Should return 1 item to be rendered');
  compareFiles(test, ktItem);

  test.end();
});
