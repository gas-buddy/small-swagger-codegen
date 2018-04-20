import fs from 'fs';
import _ from 'lodash';
import assert from 'assert';
import handlebars from 'handlebars';
import urlJoin from 'url-join';
import { describe, log, verify } from './verify';

const config = require('../config.json');
const HTTP_METHODS = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];


//////////////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////////////

// Merge all the argument objects together. If any of the objects have properties with the
//   same name where the values are arrays, then combine those arrays in the output.
// For example:
//   deepMerge({ a: [1, 2], b: 1 }, { a: [3], b: 2 })
// The result would be:
//   { a: [1, 2, 3], b: 2 }
function deepMerge(...objs) {
  return _.mergeWith({}, ...objs, (objValue, srcValue) => {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
    return undefined;
  });
}

function propertiesToArray(props) {
  return Object.entries(props).map(([name, value]) => {
    return { name, ...value };
  });
}

function typeFromRef(ref) {
  if (!ref) {
    return ref;
  }
  const lastItem = _.split(ref, '/').pop();
  return classNameFromComponents(lastItem);
}

function nameFromComponents(...components) {
  const name = _.camelCase(components.join('/'));
  if (!isNaN(name[0])) {
    return `_${name}`;
  }
  return name;
}

function classNameFromComponents(...components) {
  return _.upperFirst(nameFromComponents(...components));
}

function mapPrimitiveType(type) {
  if (type === 'string') {
    return 'String';
  } else if (type === 'boolean') {
    return 'Bool';
  } else if (type === 'number') {
    return 'Double';
  } else if (type === 'file') {
    return 'URL';
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
// Resolving $ref and allOf
//////////////////////////////////////////////////////////////////////

// Given a $ref string and an object, return the value that the reference points to
//   in refTarget.
// For example: resolveRef('#/definitions/Something', { definitions: { Something: 42 } }) => 42
function resolveRef(ref, refTarget) {
  if (!ref) {
    return undefined;
  }
  const split = ref.split('/');
  assert(split[0] === '#', `No support for refs that don\'t start with '#': ${ref}`);
  let idx = 1;
  let retVal = refTarget;
  _.each(_.tail(split), s => {
    retVal = retVal && retVal[s];
  });
  return _.cloneDeep(retVal);
}

function objectByResolving(args) {
  const { obj, refTarget, shouldResolveRef, shouldResolveAllOf, ignoreRef } = args;
  const ref = obj.$ref;
  const allOf = obj.allOf;
  const clone = _.clone(obj);

  // If this obj doesn't have any of the things we're trying to resolve, then we don't have to do
  //   anything. Return a clone of obj for consistency.
  const needsRefResolution = shouldResolveRef && ref;
  const needsAllOfResolution = shouldResolveAllOf && allOf;
  if (!clone || (!needsRefResolution && !needsAllOfResolution)) {
    return clone;
  }

  // Remove any fields that we're about to resolve
  if (shouldResolveRef) {
    delete clone.$ref;
  }
  if (shouldResolveAllOf) {
    delete clone.allOf;
  }

  // If we have a ref, get the object referenced by it
  const objFromRef = shouldResolveRef && ref !== ignoreRef && resolveRef(ref, refTarget);

  // If we have an allOf, get an array of the resolved version of each object in the allOf.
  // We always have to resolve the $refs of any objects in the allOf, or else when we merge
  //   the objects together, if there are multiple objects with a $ref, all but one $ref will be
  //   overwritten.
  const objsFromAllOf = shouldResolveAllOf ?
        _.flatMap(allOf, item => objectByResolving({ ...args, obj: item, shouldResolveRef: true }))
        : [];

  // Merge this object and all the objects from its ref and/or allOf together.
  const resolved = deepMerge(objFromRef, ...objsFromAllOf, clone);

  // Ensure we don't return an object containing anything we're trying to resolve by recursing.
  return objectByResolving({ ...args, obj: resolved });
}

function objectByResolvingRef(obj, refTarget, opts) {
  return objectByResolving({ obj, refTarget, ...opts, shouldResolveRef: true });
}

function objectByResolvingRefAndAllOf(obj, refTarget, opts) {
  return objectByResolving({ obj, refTarget, ...opts, shouldResolveRef: true, shouldResolveAllOf: true });
}


//////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////

function typeInfoAndModelsFromSchema(unresolvedSchema, defaultName, refTarget) {
  let name = defaultName;
  if (unresolvedSchema.$ref) {
    name = typeFromRef(unresolvedSchema.$ref);
  }

  const refResolvedSchema = objectByResolvingRef(unresolvedSchema, refTarget);
  const superclassSchema = refResolvedSchema.allOf && _.find(refResolvedSchema.allOf, item => item.$ref);
  const superclassRef = superclassSchema && superclassSchema.$ref;
  const superclassType = typeFromRef(superclassRef);
  const { models: superclassModels } = superclassType ? typeInfoAndModelsFromSchema(superclassSchema, undefined, refTarget) : {};

  const schema = objectByResolvingRefAndAllOf(unresolvedSchema, refTarget, { ignoreRef: superclassRef });

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
      newSchema, name, refTarget
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

    const propertiesObj = { ...schema.properties };
    const model = { name, schema, superclass: superclassType };
    const models = _.flatMap(schema.properties, (property, propertyName) => {
      const newDefaultName = classNameFromComponents(name, propertyName);
      const { typeInfo: propertyTypeInfo, models: propertyModels } = typeInfoAndModelsFromSchema(
        property,
        newDefaultName,
        refTarget
      );
      const isRequired = !!_.find(schema.required, r => r === propertyName);
      let clientName = nameFromComponents(propertyName);

      // TODO: Sneaky mutation
      const desc = propertiesObj[propertyName].description;
      delete propertiesObj[propertyName];
      propertiesObj[clientName] = {
        description: desc,
        type: propertyTypeInfo.name,
        format: propertyTypeInfo.format,
        isRequired,
        specName: propertyName
      };
      //
      return propertyModels || [];
    });
    const properties = propertiesToArray(propertiesObj);
    // This model's inherited properties are all the non-inherited properties of its superclass
    //   plus all the inherited properties of its superclass.
    let inheritedProperties = [];
    const superSchema = superclassModels
                     && superclassModels[0]
                     && superclassModels[0].schema;
    if (superSchema && superSchema.properties) {
      inheritedProperties = inheritedProperties.concat(superSchema.properties);
    }
    if (superSchema && superSchema.inheritedProperties) {
      inheritedProperties = inheritedProperties.concat(superSchema.inheritedProperties);
    }
    schema.properties = properties;
    schema.inheritedProperties = [...inheritedProperties];
    schema.initializerProperties = [...properties,  ...inheritedProperties];

    return { typeInfo: { name }, models: _.concat(model, models, superclassModels) };
  } else if (schema.type === 'integer') {
      if (schema.format === 'int64') {
          return { typeInfo: { name: 'Int64' }, models: [] };
      } else {
          return { typeInfo: { name: 'Int32' }, models: [] };
      }

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

function methodFromSpec(path, pathParams, basePath, method, methodSpec, refTarget) {
  if (!methodSpec) {
    return undefined;
  }

  let models = [];
  const name = _.camelCase(methodSpec.operationId || urlJoin(path, method));
  const description = methodSpec.description;

  let params = _.concat(pathParams || [], methodSpec.parameters || []);
  params = _.map(params, param => {
    param = objectByResolvingRefAndAllOf(param, refTarget);
    // Sometimes params have a schema, sometimes they just have the properties
    //   that a schema would normally have. This normalizes all params to be
    //   objects that have a schema.
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
  response = objectByResolvingRefAndAllOf(response, refTarget);
  const { typeInfo: responseTypeInfo, models: responseModels } = typeInfoAndModelsFromParam(response, name, refTarget);
  models = models.concat(responseModels);
  response.type = responseTypeInfo.name || response.type || 'Void';
  response.format = responseTypeInfo.format;
  //

  return { path: urlJoin('/', basePath, path), name, description, method, params, response, models };
}

function methodsFromPath(path, pathSpec, basePath, refTarget) {
  return _.flatMap(HTTP_METHODS, method => methodFromSpec(
    path,
    pathSpec.parameters,
    basePath,
    method,
    pathSpec[method],
    refTarget
  ));
}

function methodsFromPaths(paths, basePath, refTarget) {
  const methods = _(paths)
    .flatMap((pathSpec, path) => {
      return methodsFromPath(path, pathSpec, basePath, refTarget);
    })
    .filter()
    .sortBy('path')
    .value();
  return methods;
}


//////////////////////////////////////////////////////////////////////
// Process Specs
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

function templateDataFromSpec(spec, apiName) {
  const basePath = urlJoin(config.specs[apiName].basePath, spec.basePath || '');
  const methods = methodsFromPaths(spec.paths, basePath, spec);
  const models = moveModelsOffMethods(methods);
  const { objectModels, enumModels } = splitModels(models);
  const templateData = { methods, objectModels, enumModels, apiName };
  return templateData;
}

function templateDatasFromSpecs(specs) {
  return _.mapValues(specs, (spec, apiName) => templateDataFromSpec(spec, apiName));
}

function verifyTemplateDatas(templateDatas) {
  const problems = _.map(templateDatas, (templateData, apiName) => {
    const problems = verify(templateData);
    if (!_.isEmpty(problems)) {
      return `Problems with ${apiName}: ${problems}`;
    }
    return '';
  });
  const problemsString = _.join(problems, '');
  if (!_.isEmpty(problemsString)) {
    console.log(problemsString);
    process.exit(1);
  }
}


//////////////////////////////////////////////////////////////////////
// Script
//////////////////////////////////////////////////////////////////////

const specs = _.mapValues(config.specs, c => require(c.spec));
const templateDatas = templateDatasFromSpecs(specs);
verifyTemplateDatas(templateDatas);

handlebars.registerHelper('maybeComment', function(arg, options) {
  if (!arg)  {
    return arg;
  }
  const data = options.data ? undefined : { data: handlebars.createFrame(options.data) };
  let string = options.fn ? options.fn(this, data) : '';
  const numSpaces = string.search(/\S/);
  if (!string || string.trim() === '') {
    return undefined;
  }
  string = string.trim();
  string = string.replace(/\n/g, ' ');
  return `${' '.repeat(numSpaces)}/// ${string}\n`;
});

const template = handlebars.compile(fs.readFileSync('src/template.handlebars', 'utf8'));
const podtemplate = handlebars.compile(fs.readFileSync('src/podtemplate.handlebars', 'utf8'));
_.forEach(templateDatas, (templateData, apiName) => {
  const specConfig = config.specs[apiName];
  const apiVersion = require(`../node_modules/${specConfig.spec}/package.json`).version;

  templateData.apiClassName = specConfig.className;
  const rendered = template(templateData);
  fs.writeFileSync(`../gasbuddy-ios/DevelopmentPods/Generated/${apiName}.swift`, rendered);

  const renderedPodSpec = podtemplate({ apiName, apiVersion });
  fs.writeFileSync(`../gasbuddy-ios/DevelopmentPods/Generated/${apiName}.podspec`, renderedPodSpec);
});

