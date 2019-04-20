import path from 'path';

export default {
  templates: [{
    source: path.resolve(__dirname, 'template.handlebars'),
    filename({ apiName }) {
      return `${apiName}.swift`;
    },
  }, {
    source: path.resolve(__dirname, 'podTemplate.handlebars'),
    filename({ apiName }) {
      return `${apiName}.podspec`;
    },
  }, {
    source: path.resolve(__dirname, 'modelClassTemplate.handlebars'),
    partial: 'modelClassTemplate',
  }],
  typeMap: {
    undefined: 'Void',
    boolean: 'Bool',
    number: { int64: 'Int64', int32: 'Int32', default: 'Double' },
    file: 'URL',
    object: additionalType => `Dictionary<String, ${additionalType}>`,
    integer: { int64: 'Int64', default: 'Int32' },
    string: { date: 'Date', 'date-time': 'Date', default: 'String' },
    array: typeName => `Array<${typeName}>`,
  },
};
