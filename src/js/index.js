import path from 'path';

export default {
  templates: [{
    source: path.resolve(__dirname, 'packageTemplate.handlebars'),
    filename: () => 'package.json',
  }, {
    source: path.resolve(__dirname, 'babelTemplate.handlebars'),
    filename: () => 'babel.config.js',
  }, {
    source: path.resolve(__dirname, 'indexTemplate.handlebars'),
    filename: () => 'index.js',
  }, {
    source: path.resolve(__dirname, 'typingsTemplate.handlebars'),
    filename: () => 'index.d.ts',
  }, {
    source: path.resolve(__dirname, 'modelClassTemplate.handlebars'),
    partial: 'modelClassTemplate',
  }, {
    source: ({ spec }) => JSON.stringify(spec, null, '  '),
    filename: () => 'spec.json',
  }],
  typeMap: {
    any: 'any',
    undefined: 'void',
    boolean: 'boolean',
    number: 'number',
    file: 'string',
    object: additionalType => `Map<string, ${additionalType}>`,
    integer: 'number',
    string: { date: 'Date', 'date-time': 'Date', default: 'string' },
    array: typeName => `Array<${typeName}>`,
  },
};
