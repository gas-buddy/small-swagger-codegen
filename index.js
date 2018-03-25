import fs from 'fs';
import _ from 'lodash';
import assert from 'assert';
import handlebars from 'handlebars';
import spec from '@gasbuddy/payment-api-spec';
// import spec from '@gasbuddy/mobile-orchestration-api-spec';
import { verify } from './verify';


const HTTP_METHODS = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];


// TODO:
// - allof


//////////////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////////////
function describe(it) {
  return require('util').inspect(it, {depth:10, colors:true, breakLength:150});
}

function log(it) {
  console.log(`\n${describe(it)}\n`);
}

function resolveRef(ref, refTarget) {
  const split = ref.split('/');
  assert(split[0] === '#', `No support for refs that don\'t start with '#': ${ref}`);
  let idx = 1;
  let retVal = refTarget;
  _.each(_.tail(split), s => {
    retVal = retVal && retVal[s];
  });
  return _.cloneDeep(retVal);
}

function objectByResolvingRef(obj, refTarget) {
  if (!obj) {
    return obj;
  }
  if (!obj.$ref) {
    return { ...obj };
  }
  let retVal = { ...resolveRef(obj.$ref, refTarget), ...obj };
  delete retVal.$ref;
  return retVal;
}

function typeFromRef(ref) {
  const lastItem = _.split(ref, '/').pop();
  return classNameFromComponents(lastItem);
}

function nameFromComponents(components) {
  return _.camelCase(components.join('/'));
}

function classNameFromComponents(...components) {
  return _.upperFirst(nameFromComponents(components));
}


//////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////

function nameAndModelsFromSchema(schema, defaultName, refTarget, indent) {
  if (!indent) { indent = ''; }
  // console.log(indent + describe(schema));

  let name = defaultName;
  if (schema.$ref) {
    name = typeFromRef(schema.$ref);
    schema = objectByResolvingRef(schema, refTarget);
  }

  if (schema.type === 'array') {
    const newSchema = schema.items;
    const nameAndSubModels = nameAndModelsFromSchema(newSchema, name, refTarget, indent+'  ');
    schema.type = `[${nameAndSubModels.name}]`;
    return {
      name: schema.type,
      models: nameAndSubModels.models
    };
  } else if (schema.type === 'string') {
    if (schema.format === 'date' || schema.format ==='date-time') {
      // TODO: format gets thrown out
      return { name: 'Date' };
    } else {
      return { name: 'String' };
    }
  } else if (schema.type === 'boolean') {
    return { name: 'Bool' };
  } else if (schema.type === 'integer') {
    return { name: 'Int' };
  } else if (schema.type === 'number') {
    return { name: 'Double' };
  } else if (schema.type === 'object') {
    delete schema.description;

    const properties = { ...schema.properties };
    const subModels = _.flatMap(schema.properties, (property, propertyName) => {
      const newDefaultName = classNameFromComponents(name, propertyName);
      let nameAndSubModels = { models:[] };
      nameAndSubModels = nameAndModelsFromSchema(property, newDefaultName, refTarget, indent+'  ');
      properties[propertyName] = {
        type: `${nameAndSubModels.name}`
      };
      return nameAndSubModels.models || [];
    });
    schema.properties = properties;

    const model = { name, schema };
    return { name, models: _.concat(model, subModels) };
  } else if (schema.type === 'enum') {
    schema.valueType = schema.type;
    schema.type = 'enum';
    return schema;
  } else if (!schema.type) {
    return { name: 'Void', models: []};
  }

  assert(false, `I don't know how to process a schema of type ${schema.type} 🤔\n  ${describe(schema)}`);
}

function nameAndModelsFromParam(param, methodName, refTarget) {
  if (!param.schema) {
    return [];
  }
  const defaultName = classNameFromComponents(methodName, param.name || 'response');
  return nameAndModelsFromSchema(param.schema, defaultName, refTarget);
}


//////////////////////////////////////////////////////////////////////
// Methods
//////////////////////////////////////////////////////////////////////

function methodFromSpec(path, pathParams, method, methodSpec, refTarget) {
  if (!methodSpec) {
    return undefined;
  }

  let models = [];
  const name = _.camelCase(`${path}/${method}`);
  const description = methodSpec.description;

  let params = _.concat(pathParams || [], methodSpec.parameters || []);
  params = _.map(params, param => {
    param = objectByResolvingRef(param, refTarget);
    // Sometimes params have a schema, sometimes they just have the properties
    // that a schema would normally have. This normalizes all params to be
    // objects that have a schema.
    let schema = param.schema;
    if (!schema) {
      schema = param;
      param = {
        name: param.name,
        description: param.description,
        schema,
      };
    }

    const paramModels = nameAndModelsFromParam(param, name, refTarget);
    models = models.concat(paramModels.models);
    param.type = paramModels.name || param.type;
    if (param.name) {
      param.name = _.camelCase(param.name);
    }
    return param;
  });

  const goodResponseKey = _.find(Object.keys(methodSpec.responses), k => k[0] === '2');
  let response = methodSpec.responses[goodResponseKey];

  // TODO: Many similarities with how we treat `param` above.
  response = objectByResolvingRef(response, refTarget);
  const responseModels = nameAndModelsFromParam(response, name, refTarget);
  models = models.concat(responseModels.models);
  response.type = responseModels.name || response.type || 'Void';
  //

  return { name, description, method, path, params, response, models };
}

function methodsFromPath(path, pathSpec, refTarget) {
  return _.flatMap(HTTP_METHODS, m => methodFromSpec(
    path,
    pathSpec.parameters,
    m,
    pathSpec[m],
    refTarget
  ));
}

function methodsFromPaths(paths, refTarget) {
  const methods = _(paths)
    .flatMap((pathSpec, path) => {
      return methodsFromPath(path, pathSpec, refTarget);
    })
    .filter()
    .sortBy('path')
    .value();
  return methods;
}


//////////////////////////////////////////////////////////////////////
// Script
//////////////////////////////////////////////////////////////////////

function moveModelsOffMethods(methods) {
  const models = _(methods)
        .flatMap(method => {
          const models = method.models;
          delete method.models;
          return models;
        })
        .filter()
        .uniqWith(_.isEqual)
        .value();
  return models;
}

const methods = methodsFromPaths(spec.paths, spec);
const models = moveModelsOffMethods(methods);
const data = { methods, models };
verify(data);

// console.log(JSON.stringify(data, null, 2));
log(data);

const template = handlebars.compile(fs.readFileSync('template.handlebars', 'utf8'));
const rendered = template(data);
fs.writeFileSync('/Users/griffin/Desktop/MyPlayground.playground/Sources/output.swift', rendered);
// console.log(rendered);

