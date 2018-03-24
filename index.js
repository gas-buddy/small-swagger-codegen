import _ from 'lodash';
import assert from 'assert';
import spec from '@gasbuddy/payment-api-spec';


const HTTP_METHODS = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];


// TODO:
// - allof


//////////////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////////////
function resolveRef(ref, refTarget) {
  const split = ref.split('/');
  assert(split[0] === '#', 'No support for refs that don\'t start with #');
  let idx = 1;
  let retVal = refTarget;
  _.each(_.tail(split), s => {
    retVal = retVal && retVal[s];
  });
  return retVal;
}

function objectByResolvingRef(obj, refTarget) {
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
  return _.split(ref, '/').pop();
}

function classNameFromComponents(components) {
  return _.upperFirst(_.camelCase(components.join('/')));
}

//////////////////////////////////////////////////////////////////////
// Methods
//////////////////////////////////////////////////////////////////////

function processResponseOrParam(obj) {
  if (!obj) {
    return obj;
  }
  obj = { ...obj };
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

function methodFromSpec(path, pathParams, method, methodSpec) {
  if (!methodSpec) {
    return undefined;
  }
  const name = _.camelCase(`${path}/${method}`);
  let params = _.concat(pathParams || [], methodSpec.parameters || []);
  params = _.map(params, processResponseOrParam);
  const goodResponseKey = _.find(Object.keys(methodSpec.responses), k => k[0] === '2');
  const response = processResponseOrParam(methodSpec.responses[goodResponseKey]);
  const description = methodSpec.description;
  return { name, description, method, path, params, response };
}

function methodsFromPath(path, spec) {
  return _.flatMap(HTTP_METHODS, m => methodFromSpec(
    path,
    spec.parameters,
    m,
    spec[m]
  ));
}

function methodsFromPaths(paths) {
  return _(paths)
    .flatMap((pathSpec, path) => {
      return methodsFromPath(path, pathSpec);
    })
    .filter()
    .sortBy('name')
    .value();
}


//////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////
function modelsFromSchema(schema, defaultName, refTarget) {
  const model = {};
  if (schema.$ref) {
    model.name = typeFromRef(schema.$ref);
    model.schema = objectByResolvingRef(schema, refTarget);
  } else {
    model.name = defaultName;
    model.schema = { ...schema };
  }
  delete model.schema.description;
  const properties = model.schema.properties;
  const subModels = _.flatMap(properties, (property, propertyName) => {
    const newDefaultName = classNameFromComponents([
      model.name,
      propertyName
    ]);
    let subModels = [];
    if (property.$ref) {
      subModels = modelsFromSchema(property, newDefaultName, refTarget);
      const subModel = subModels[0];
      properties[propertyName] = {
        type: `${subModel.name}`
      };
    } else if (property.type === 'object') {
      subModels = modelsFromSchema(property, newDefaultName, refTarget);
      const subModel = subModels[0];
      properties[propertyName] = {
        type: `${subModel.name}`
      };
    } else if (property.type === 'array') {
      const newSchema = property.items;
      subModels = modelsFromSchema(newSchema, newDefaultName, refTarget);
      const subModel = subModels[0];
      properties[propertyName] = {
        type: `[${subModel.name}]`
      };
    }
    return subModels;
  });
  return _.concat(model, subModels);
}

function modelsFromParam(param, method, refTarget) {
  if (!param.schema) {
    return [];
  }
  const defaultName = classNameFromComponents([
    method.name,
    param.name || 'response'
  ]);
  return modelsFromSchema(param.schema, defaultName, refTarget);
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
  console.log(require('util').inspect(models, {depth:10, colors:true, breakLength:100}));
  const names = _.map(models, m => m.name);
  assert(_.isEqual(names, _.uniq(names)), `Duplicate names! ${names}`);
  return models;
}


//////////////////////////////////////////////////////////////////////
// Script
//////////////////////////////////////////////////////////////////////

const methods = methodsFromPaths(spec.paths);
const models = modelsFromMethods(methods, spec);
const template = { methods, models };
console.log(require('util').inspect(template, {depth:10, colors:true, breakLength:100}));
// console.log(require('util').inspect(template.models, {depth:10, colors:true, breakLength:100}));
