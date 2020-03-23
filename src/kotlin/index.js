import path from 'path';

export default {
  templates: [{
    source: path.resolve(__dirname, 'modelClassTemplate.handlebars'),
    partial: 'modelClassTemplate',
  }, {
    source: path.resolve(__dirname, 'template.handlebars'),
    filename({ apiClassName }) {
      return `${apiClassName}.kt`;
    },
  }],
  typeMap: {
    undefined: 'Response<Void>',
    boolean: 'Boolean',
    number: { int64: 'Long', int32: 'Int', default: 'Double' },
    file: 'MultipartBody.Part',
    object: additionalType => `Map<String, ${additionalType}>`,
    integer: { int64: 'Long', default: 'Int'},
    string: { date: 'OffsetDateTime', 'date-time': 'OffsetDateTime', default: 'String' },
    array: typeName => `List<${typeName}>`,
  },
};
