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

function resolveRefsRecursive(obj, refTarget) {
  if (Array.isArray(obj)) {
    return obj.map(o => resolveRefsRecursive(o, refTarget));
  } else if (obj instanceof Object) {
    let retVal;
    if (obj.$ref) {
      retVal = { ...resolveRef(obj.$ref, refTarget), ...obj };
    } else {
      retVal = { ...obj };
    }
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

//////////////////////////////////////////////////////////////////////
// Preprocessed Methods
//////////////////////////////////////////////////////////////////////


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


function _modelsFromSpec(obj, context) {
  
}

function modelsFromSpec(spec) {
  const paths = spec.paths;
}


//////////////////////////////////////////////////////////////////////
// Script
//////////////////////////////////////////////////////////////////////

const methods = methodsFromPaths(spec.paths);
const models = modelsFromSpec(spec);
const template = { methods, models };
// console.log(require('util').inspect(template, {depth:10, colors:true, breakLength:100}));
console.log(require('util').inspect(template, {depth:10, colors:true, breakLength:100}));
