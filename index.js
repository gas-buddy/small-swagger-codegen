import fs from 'fs';
import _ from 'lodash';
import assert from 'assert';
import handlebars from 'handlebars';
import spec from '@gasbuddy/payment-api-spec';
// import spec from '@gasbuddy/mobile-orchestration-api-spec';


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

function resolveRefsRecursive(obj, refTarget) {
  if (Array.isArray(obj)) {
    return obj.map(o => resolveRefsRecursive(o, refTarget));
  } else if (obj instanceof Object) {
    let retVal = objectByResolvingRef(obj, refTarget);
    _.each(Object.keys(retVal), k => {
      retVal[k] = resolveRefsRecursive(obj[k], refTarget);
    });
    return retVal;
  }
  return obj;
}

function mapType(type) {
  return {
    string: 'String',
    boolean: 'Bool',
    integer: 'Int'
  }[type] || type || 'Any';
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
// Methods
//////////////////////////////////////////////////////////////////////

function processResponseOrParam(obj, refTarget) {
  if (!obj) {
    return obj;
  }
  obj = objectByResolvingRef(obj, refTarget);
  if (obj.name) {
    obj.name = _.camelCase(obj.name);
  }
  if (obj.schema && obj.schema.$ref) {
    obj.type = typeFromRef(obj.schema.$ref);
  } else {
    obj.type = mapType(obj.type);
  }
  return obj;
}

function methodFromSpec(path, pathParams, method, methodSpec, refTarget) {
  if (!methodSpec) {
    return undefined;
  }
  const name = _.camelCase(`${path}/${method}`);
  let params = _.concat(pathParams || [], methodSpec.parameters || []);
  params = _.map(params, p => processResponseOrParam(p, refTarget));
  const goodResponseKey = _.find(Object.keys(methodSpec.responses), k => k[0] === '2');
  const response = processResponseOrParam(methodSpec.responses[goodResponseKey], refTarget);
  const description = methodSpec.description;
  return { name, description, method, path, params, response };
}

function methodsFromPath(path, spec, refTarget) {
  return _.flatMap(HTTP_METHODS, m => methodFromSpec(
    path,
    spec.parameters,
    m,
    spec[m],
    refTarget
  ));
}

function methodsFromPaths(paths, refTarget) {
  const methods = _(paths)
    .flatMap((pathSpec, path) => {
      return methodsFromPath(path, pathSpec, refTarget);
    })
    .filter()
    .sortBy('name')
    .value();
  return methods;
}


//////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////

function nameAndModelsFromSchema(schema, defaultName, refTarget, indent) {
  if (!indent) { indent = ''; }
  console.log(indent + describe(schema));

  let name = defaultName;
  if (schema.$ref) {
    name = typeFromRef(schema.$ref);
  }
  schema = objectByResolvingRef(schema, refTarget);

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
  // } else if (schema.type === 'enum') {
  //   schema.valueType = schema.type;
  //   schema.type = 'enum';
  //   return schema;
  }

  assert(false, `I don't know how to process a schema of type ${schema.type} 🤔 ${describe(schema)}`);
}

function modelsFromParam(param, method, refTarget) {
  if (!param.schema) {
    return [];
  }
  const defaultName = classNameFromComponents(method.name, param.name || 'response');
  return nameAndModelsFromSchema(param.schema, defaultName, refTarget).models;
}

function modelsFromMethod(method, refTarget) {
  const params = _.concat(method.params || [], method.response);
  return _.flatMap(params, param => modelsFromParam(param, method, refTarget));
}

function modelsFromMethods(methods, refTarget) {
  const models = _(methods)
        .flatMap(method => modelsFromMethod(method, refTarget))
        .filter()
        .uniqWith(_.isEqual)
        .sortBy('name')
        .value();
  return models;
}


//////////////////////////////////////////////////////////////////////
// Verification
//////////////////////////////////////////////////////////////////////
function findProblems(array, pred, foundSome) {
  const problems = _.filter(array, pred);
  if (problems.length > 0) {
    return foundSome(describe(problems));
  }
  return '';
}

function findAllProblems(array, ...problemFinders) {
  let retVal = '';
  _.each(problemFinders, problemFinder => {
    findProblems(array, problemFinder[0], problem => {
      retVal += problemFinder[1](problem);
    });
  });
  return retVal;
}

function verifyMethods(methods) {
  return findAllProblems(methods, [
    method => {
      const params = _.concat(method.params || [], method.response);
      return _.find(params, param => !param.type);
    },
    problems => `\nFound params or response without type: ${problems}`
  ]);
}

function verifyModels(models) {
  const names = _.map(models, m => m.name);
  assert(_.isEqual(names, _.uniq(names)), `Duplicate names! ${names}`);

  return findAllProblems(models, [
    model => !model.name,
    problems => `\nFound models without names: ${problems}`
  ], [
    model => !model.schema,
    problems => `\nFound models without schemas: ${problems}`
  ], [
    model => model.schema.type !== 'object' && model.schema.type !== 'enum',
    problems => `\nFound non-object-or-enum models: ${problems}`
  ]);
}

function verify(data) {
  log(data);
  const error = verifyMethods(data.methods) + verifyModels(data.models);
  console.log(error);
  if (!_.isEmpty(error)) {
    assert(false, error);
  }
}


//////////////////////////////////////////////////////////////////////
// Script
//////////////////////////////////////////////////////////////////////

const methods = methodsFromPaths(spec.paths, spec);
const models = modelsFromMethods(methods, spec);
const data = { methods, models };
verify(data);

// console.log(JSON.stringify(data, null, 2));
log(data);

const template = handlebars.compile(fs.readFileSync('template.handlebars', 'utf8'));
const rendered = template(data);
fs.writeFileSync('/Users/griffin/Desktop/MyPlayground.playground/Sources/output.swift', rendered);
// console.log(rendered);

