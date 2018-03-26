import fs from 'fs';
import _ from 'lodash';
import assert from 'assert';
import handlebars from 'handlebars';
import spec from '@gasbuddy/payment-api-spec';
// import spec from '@gasbuddy/mobile-orchestration-api-spec';
import { describe, log, verify } from './verify';

const HTTP_METHODS = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];

//////////////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////////////
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

function nameFromComponents(...components) {
  return _.camelCase(components.join('/'));
}

function classNameFromComponents(...components) {
  return _.upperFirst(nameFromComponents(...components));
}

function mapPrimitiveType(type) {
  if (type === 'string') {
    return 'String';
  } else if (type === 'boolean') {
    return 'Bool';
  } else if (type === 'integer') {
    return 'Int';
  } else if (type === 'number') {
    return 'Double';
  } else if (type === 'object') {
    return 'Dictionary<String, Any>';
  }
  return undefined;
}

function mapPrimitiveValue(value, type) {
  if (type === 'string') {
    return `"${value}"`;
  }
  return value;
}


//////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////

function typeInfoAndModelsFromSchema(schema, defaultName, refTarget, indent) {
  if (!indent) { indent = ''; }
  // console.log(indent + describe(schema));

  let name = defaultName;
  if (schema.$ref) {
    name = typeFromRef(schema.$ref);
    schema = objectByResolvingRef(schema, refTarget);
  }

  if (schema.enum) {
    const enumSchema = {
      type: 'enum',
      enumType: mapPrimitiveType(schema.type),
      values: _.map(schema.enum, e => ({
        name: nameFromComponents(e),
        value: mapPrimitiveValue(e, schema.type)
      }))
    };
    const model = { name, schema: enumSchema };
    return { typeInfo: { name }, models: [model] };

  } else if (schema.type === 'array') {
    const newSchema = schema.items;
    const { typeInfo: elementTypeInfo, models: elementModels } = typeInfoAndModelsFromSchema(
      newSchema, name, refTarget, indent+'  '
    );
    return { typeInfo: { name: `Array<${elementTypeInfo.name}>`, format: elementTypeInfo.format }, models: elementModels };

  } else if (schema.type === 'string') {
    if (schema.format === 'date' || schema.format ==='date-time') {
      return { typeInfo: { name: 'Date', format: schema.format }, models: [] };
    } else {
      return { typeInfo: { name: 'String' }, models: [] };
    }
  } else if (schema.type === 'object' && schema.properties) {
    delete schema.description;

    const properties = { ...schema.properties };
    const model = { name, schema };
    const models = _.flatMap(schema.properties, (property, propertyName) => {
      const newDefaultName = classNameFromComponents(name, propertyName);
      const { typeInfo: propertyTypeInfo, models: propertyModels } = typeInfoAndModelsFromSchema(
        property,
        newDefaultName,
        refTarget,
        indent+'  '
      );
      const isRequired = !!_.find(schema.required, r => r === propertyName);
      let clientName = nameFromComponents(propertyName);
      delete properties[propertyName];
      properties[clientName] = {
        type: propertyTypeInfo.name,
        format: propertyTypeInfo.format,
        isRequired,
        specName: propertyName
      };
      return propertyModels || [];
    });
    schema.properties = properties;

    return { typeInfo: { name }, models: _.concat(model, models) };

  } else if (mapPrimitiveType(schema.type)) {
    return { typeInfo: { name: mapPrimitiveType(schema.type) }, models: []};

  } else if (!schema.type) {
    return { typeInfo: { name: 'Void' }, models: []};
  }

  assert(false, `I don't know how to process a schema of type ${schema.type} 🤔\n  ${describe(schema)}`);
}

function typeInfoAndModelsFromParam(param, methodName, refTarget) {
  if (!param.schema) {
    return { typeInfo: {}, models: [] };
  }
  const defaultName = classNameFromComponents(methodName, param.name || 'response');
  return typeInfoAndModelsFromSchema(param.schema, defaultName, refTarget);
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
    if (!param.schema) {
      const schema = param;
      param = {
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema,
      };
    }

    const { typeInfo: paramTypeInfo, models: paramModels } = typeInfoAndModelsFromParam(param, name, refTarget);
    models = models.concat(paramModels);
    param.type = paramTypeInfo.name || param.type;
    param.format = paramTypeInfo.format || param.format;
    if (param.name) {
      param.serverName = param.name;
      param.name = _.camelCase(param.name);
    }
    return param;
  });

  const goodResponseKey = _.find(Object.keys(methodSpec.responses), k => k[0] === '2');
  let response = methodSpec.responses[goodResponseKey];

  // TODO: Many similarities with how we treat `param` above.
  response = objectByResolvingRef(response, refTarget);
  const { typeInfo: responseTypeInfo, models: responseModels } = typeInfoAndModelsFromParam(response, name, refTarget);
  models = models.concat(responseModels);
  response.type = responseTypeInfo.name || response.type || 'Void';
  response.format = responseTypeInfo.format;
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

function splitModels(models) {
  const retVal = {
    objectModels: [],
    enumModels: []
  };
  _.forEach(models, model => {
    if (model.schema && model.schema.type === 'object') {
      retVal.objectModels.push(model);
    } else if (model.schema && model.schema.type === 'enum') {
      retVal.enumModels.push(model);
    } else {
      assert(false, `Found non-object-or-enum model: ${describe(model)}`);
    }
  });
  return retVal;
}

const methods = methodsFromPaths(spec.paths, spec);
const models = splitModels(moveModelsOffMethods(methods));
const data = { methods, ...models };
const problems = verify(data);
if (problems) {
  log(data);
  console.log(problems);
  process.exit(1);
}
log(data);

const template = handlebars.compile(fs.readFileSync('template.handlebars', 'utf8'));
const rendered = template(data);
fs.writeFileSync('./Testbed/Testbed/output.swift', rendered);
