import assert from 'assert';
import _ from 'lodash';
import urlJoin from 'url-join';
// eslint-disable-next-line no-unused-vars
import { describe, log, verify } from './verify';

const HTTP_METHODS = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace',
];

// ////////////////////////////////////////////////////////////////////
// Helpers
// ////////////////////////////////////////////////////////////////////

// Given an object and a key name, return a clone of the object where any fields matching the name
//   are removed deeply.
// For example:
//   deepOmit({ a: 1, b: 2, c: [ { a: 42 } ] }, 'a')
// Results in this (all the 'a' have been omitted):
//   { b: 2, c: [ { } ] }
function deepOmit(obj, keyName) {
  if (_.isArray(obj)) {
    return obj.map(value => deepOmit(value, keyName));
  } else if (obj instanceof Object) {
    const picked = _.pickBy(obj, (value, key) => key !== keyName);
    return _.mapValues(picked, value => deepOmit(value, keyName));
  }
  return obj;
}

// Merge all the argument objects together. If any of the objects have properties with the
//   same name where the values are arrays, then combine those arrays in the output.
// For example:
//   deepMerge({ a: [1, 2], b: 1 }, { a: [3], b: 2 })
// The result would be:
//   { a: [1, 2, 3], b: 2 }
function deepMerge(...objs) {
  return _.mergeWith({}, ...objs, (objValue, srcValue) => (
    // Returning undefined will fallback to default merge behavior
    _.isArray(objValue) ? objValue.concat(srcValue) : undefined
  ));
}

// Deeply omit any fields named 'description' from the arguments and check if the results are equal.
// Useful to compare swagger schemas since we generally care whether the 'real stuff' (types, formats, etc.)
// are equal, and not whether the descriptions (i.e. comments) are equal.
function isEqualIgnoringDescription(a, b) {
  return _.isEqual(deepOmit(a, 'description'), deepOmit(b, 'description'));
}

function nameFromComponents(...components) {
  const name = _.camelCase(components.join('/'));
  // Don't create names that start with a number.
  const nonNumberName = Number.isNaN(Number(name[0])) ? name : `_${name}`;
  // Names that are reserved words would be escaped.
  return [
    'default',
    'as',
  ].includes(nonNumberName) ? `\`${nonNumberName}\`` : nonNumberName;
}

// Create a class name by combining the given component strings.
// One of the arguments my be an options object. Currently the only option is 'skip'.
// If 'skip' is given, skip the first N components when creating the name.
// For example:
//   classNameFromComponents('aa', 'bb', 'cc', 'dd', { skip: 2 })
// The result would be 'CcDd'.
function classNameFromComponents(...args) {
  // The options are the first argument that isn't a string.
  // The components are all arguments that are strings.
  const [components, [options]] = _.partition(args, _.isString);
  const { skip } = options || { skip: 0 };
  const skippedComponents = _.drop(components, skip);
  const name = _.upperFirst(nameFromComponents(...skippedComponents));
  // If we're about to name this class a reserved word becuase we skipped some components,
  //   then fallback to using all the components.
  if (name === 'Type' && skip) {
    return classNameFromComponents(...components);
  }
  return name;
}

function lastRefComponent(ref) {
  return ref ? _.last(_.split(ref, '/')) : ref;
}

function classNameFromRef(ref) {
  return classNameFromComponents(lastRefComponent(ref));
}

function mapPrimitiveValue(value, type) {
  return type === 'string' ? `"${value}"` : value;
}


// ////////////////////////////////////////////////////////////////////
// Resolving $ref and allOf
// ////////////////////////////////////////////////////////////////////

// Given a $ref string and an object, return the value that the reference points to
//   in refTarget.
// For example: resolveRef('#/definitions/Something', { definitions: { Something: 42 } }) => 42
function resolveRef(ref, refTarget) {
  assert(ref.substring(0, 2) === '#/', `No support for refs that don't start with '#/': ${ref}`);
  return _.get(refTarget, ref.substring(2).split('/'));
}

function objectByResolving(args) {
  const { obj, refTarget, shouldResolveRef, shouldResolveAllOf, ignoreRef } = args;
  const { $ref: ref, allOf } = obj;
  const needsRefResolution = shouldResolveRef && ref;
  const needsAllOfResolution = shouldResolveAllOf && allOf;
  // Omit any fields that we're about to resolve
  const filtered = _.omit(obj, [shouldResolveRef && '$ref', shouldResolveAllOf && 'allOf']);
  // If this obj doesn't have any of the things we're trying to resolve, then we don't have to do
  //   anything.
  if (!needsRefResolution && !needsAllOfResolution) { return filtered; }
  // If we have a ref, get the object referenced by it
  const objFromRef = needsRefResolution && ref !== ignoreRef && resolveRef(ref, refTarget);
  // If we have an allOf, get an array of the resolved version of each object in the allOf.
  // We always have to resolve the $refs of any objects in the allOf, or else when we merge
  //   the objects together, if there are multiple objects with a $ref, all but one $ref will be
  //   overwritten.
  const objsFromAllOf = _.flatMap(needsAllOfResolution && allOf, item => (
    objectByResolving({ ...args, obj: item, shouldResolveRef: true })
  ));
  // Merge this object and all the objects from its ref and/or allOf together.
  const resolved = deepMerge(objFromRef, ...objsFromAllOf, filtered);
  // Ensure we don't return an object containing anything we're trying to resolve by recursing.
  return objectByResolving({ ...args, obj: resolved });
}

function objectByResolvingRef(obj, refTarget, opts) {
  return objectByResolving({
    obj, refTarget, ...opts, shouldResolveRef: true,
  });
}

function objectByResolvingRefAndAllOf(obj, refTarget, opts) {
  return objectByResolving({
    obj, refTarget, ...opts, shouldResolveRef: true, shouldResolveAllOf: true,
  });
}


// ////////////////////////////////////////////////////////////////////
// Models
// ////////////////////////////////////////////////////////////////////
function typeInfoAndModelsFromObjectSchema(schema, name, specName, unresolvedSuperclassSchema, refTarget) {
  const superclassRef = _.get(unresolvedSuperclassSchema, '$ref');
  const superclass = classNameFromRef(superclassRef);

  // When there is an object with a property that's also an object, the spec can do one of two things:
  //   use a '$ref', or declare the object 'inline', i.e. without using a $ref.
  // If this object has any properties definied that are inline objects, we want to nest the class
  //   generated for that inline object inside the class generated for this object.

  // Get the type info and models for each of this object's properties, and then add on as 'isNested'
  //   flag to mark properties that are inline objects.
  const propertyTypeInfoAndModels = _.mapValues(schema.properties, (property, propertyName) => {
    const isNested = property.type === 'object' && property.properties;
    const defaultTypeName = classNameFromComponents(name, propertyName, { skip: isNested ? 1 : 0 });
    const typeInfoAndModels = typeInfoAndModelsFromSchema(property, defaultTypeName, refTarget);
    return { ...typeInfoAndModels, isNested };
  });

  // Get all the nested models (models representing classes of inline objects) from this object's properties.
  const nestedModels = _.flatMap(propertyTypeInfoAndModels, ({ models, isNested }) => (
    // If this info was from an inline object, then the first model of models will represent the inline object's class.
    isNested ? _.head(models) : []
  ));

  // All the other models from this object's properties.
  const propertyModels = _.flatMap(propertyTypeInfoAndModels, ({ models, isNested }) => (
    isNested ? _.tail(models) : models
  ));

  const properties = _.map(propertyTypeInfoAndModels, ({ typeInfo, isNested }, propertyName) => ({
    name: nameFromComponents(propertyName),
    description: schema.properties[propertyName].description,
    type: isNested ? `${name}.${typeInfo.name}` : typeInfo.name,
    format: typeInfo.format,
    isRequired: !!_.find(schema.required, r => r === propertyName),
    specName: propertyName,
  }));

  const superclassModels = superclass && typeInfoAndModelsFromSchema(unresolvedSuperclassSchema, '', refTarget).models;
  const superModel = _.first(superclassModels);

  // This model's inherited properties are all the non-inherited properties of its superclass
  //   plus all the inherited properties of its superclass.
  const inheritedProperties = _.get(superModel, 'properties', []).concat(_.get(superModel, 'inheritedProperties', []));

  // If this model has any properties with the same name and type as one of its inherited
  //   properties, then remove the non-inherited property and use the inherited one.
  const nonInheritedProperties = _.filter(properties, prop => (
    !_.find(inheritedProperties, iProp => isEqualIgnoringDescription(prop, iProp))
  ));

  const myModel = {
    name,
    specName,
    superclass,
    nestedModels,
    ..._.pick(schema, 'discriminator', 'description', 'type'),
    properties: nonInheritedProperties,
    inheritedProperties: [...inheritedProperties],
    initializerProperties: [...nonInheritedProperties, ...inheritedProperties],
  };

  return { typeInfo: { name }, models: _.concat(myModel, propertyModels, superclassModels) };
}

function typeInfoFromPrimitiveSchema(schema) {
  if (!schema) { return { name: 'Void' }; }
  const mapped = _.get({
    undefined: 'Void',
    boolean: 'Bool',
    number: 'Double',
    file: 'URL',
    object: 'Dictionary<String, Any>',
    integer: { int64: 'Int64', default: 'Int32' },
    string: { date: 'Date', 'date-time': 'Date', default: 'String' },
  }, schema.type);
  const preserveFormat = _.get({
    string: { date: true, 'date-time': true },
  }, [schema.type, schema.format], false);
  assert(!!mapped, `I don't know how to process a schema of type ${schema.type} 🤔\n  ${describe(schema)}`);
  const name = mapped[schema.format] || mapped.default || mapped;
  return { name, format: preserveFormat ? schema.format : undefined };
}

function typeInfoAndModelsFromSchema(unresolvedSchema, defaultName, refTarget) {
  const ref = unresolvedSchema.$ref;
  const name = ref ? classNameFromRef(ref) : defaultName;
  const specName = ref ? lastRefComponent(ref) : defaultName;

  const refResolvedSchema = objectByResolvingRef(unresolvedSchema, refTarget);
  const unresolvedSuperclassSchema = _.find(refResolvedSchema.allOf, item => item.$ref);
  const superclassRef = _.get(unresolvedSuperclassSchema, '$ref');
  const schema = objectByResolvingRefAndAllOf(unresolvedSchema, refTarget, { ignoreRef: superclassRef });

  if (schema.enum) {
    const model = {
      name,
      type: 'enum',
      enumType: typeInfoFromPrimitiveSchema(schema).name,
      values: _.map(schema.enum, e => ({
        name: nameFromComponents(e),
        value: mapPrimitiveValue(e, schema.type),
      })),
    };
    return { typeInfo: { name }, models: [model] };
  } else if (schema.type === 'array') {
    const { typeInfo: itemTypeInfo, models: itemModels } = typeInfoAndModelsFromSchema(schema.items, name, refTarget);
    const typeName = `Array<${itemTypeInfo.name}>`;
    return { typeInfo: { name: typeName, format: itemTypeInfo.format }, models: itemModels };
  } else if (schema.type === 'object' && schema.properties) {
    return typeInfoAndModelsFromObjectSchema(schema, name, specName, unresolvedSuperclassSchema, refTarget);
  }
  return { typeInfo: typeInfoFromPrimitiveSchema(schema), models: [] };
}

function typeInfoAndModelsFromParam(param, methodName, refTarget) {
  const defaultName = classNameFromComponents(methodName, param.name || 'response');
  return typeInfoAndModelsFromSchema(param.schema, defaultName, refTarget);
}


// ////////////////////////////////////////////////////////////////////
// Methods
// ////////////////////////////////////////////////////////////////////
function paramAndModelsFromSpec(unresolvedParamSpec, name, refTarget) {
  const resolved = objectByResolvingRefAndAllOf(unresolvedParamSpec, refTarget);
  // Sometimes params have a schema, sometimes they just have the properties that a schema would normally have.
  // This normalizes all params to be objects that have a schema.
  const paramSpec = resolved.schema ? resolved : { ...resolved, schema: resolved };
  const { typeInfo: responseTypeInfo, models: responseModels } = typeInfoAndModelsFromParam(paramSpec, name, refTarget);
  const param = {
    ...paramSpec,
    type: responseTypeInfo.name || paramSpec.type || 'Void',
    format: responseTypeInfo.format,
    serverName: paramSpec.name,
    name: _.camelCase(paramSpec.name),
  };
  return { param, models: responseModels };
}

function methodFromSpec(endPath, pathParams, basePath, method, methodSpec, refTarget) {
  if (!methodSpec) { return undefined; }

  const name = _.camelCase(methodSpec.operationId || urlJoin(endPath, method));
  const { description } = methodSpec;

  const paramSpecs = _.concat(pathParams || [], methodSpec.parameters || []);
  const mappedParams = _.map(paramSpecs, paramSpec => paramAndModelsFromSpec(paramSpec, name, refTarget));
  const paramModels = _.flatMap(mappedParams, paramAndModels => paramAndModels.models);
  const params = _.map(mappedParams, paramAndModels => paramAndModels.param);

  const goodResponseKey = _.find(Object.keys(methodSpec.responses), k => k[0] === '2') ||
    _.find(Object.keys(methodSpec.responses), k => k[0] === '3') ||
    'default';
  const responseSpec = methodSpec.responses[goodResponseKey];
  const { param: response, models: responseModels } = paramAndModelsFromSpec(responseSpec, name, refTarget);

  const models = paramModels.concat(responseModels);
  const path = urlJoin('/', basePath, endPath);
  return { path, name, description, method, params, response, models };
}

function methodsFromPath(path, pathSpec, basePath, refTarget) {
  return _.map(HTTP_METHODS, method => methodFromSpec(
    path, pathSpec.parameters, basePath, method, pathSpec[method], refTarget,
  ));
}

function methodsFromPaths(paths, basePath, refTarget) {
  const rawMethods = _.flatMap(paths, (pathSpec, path) => methodsFromPath(path, pathSpec, basePath, refTarget));
  return _.sortBy(rawMethods.filter(m => m), 'path');
}


// ////////////////////////////////////////////////////////////////////
// Process Specs
// ////////////////////////////////////////////////////////////////////

function moveModelsOffMethods(methodsWithModels) {
  const rawModels = _.flatMap(methodsWithModels, method => method.models);
  const combinedModels = _.uniqWith(_.filter(rawModels), isEqualIgnoringDescription);
  const methods = _.map(methodsWithModels, method => _.omit(method, 'models'));
  return { combinedModels, methods };
}

function splitModels(combinedModels) {
  const [objectModels, enumModels] = _.partition(combinedModels, model => model.type === 'object');
  return { objectModels, enumModels };
}

// For any model that is the superclass of another model, find all of that model's subclasses
//   and put some information about those subclasses on the superclass model.
function resolveSubclasses(objectModelsWithoutResolvedSubclasses) {
  const om = objectModelsWithoutResolvedSubclasses;
  return _.map(om, (model) => {
    const subclasses = _.filter(_.map(om, (subModel) => {
      if (subModel.superclass !== model.name) { return undefined; }
      return _.pick(subModel, ['specName', 'name']);
    }));
    return { ...model, subclasses };
  });
}

function templateDataFromSpec(spec, apiName, config) {
  const basePath = urlJoin(config.specs[apiName].basePath, spec.basePath || '');
  const methodsWithModels = methodsFromPaths(spec.paths, basePath, spec);
  const { combinedModels, methods } = moveModelsOffMethods(methodsWithModels);
  const { objectModels, enumModels } = splitModels(combinedModels);
  return { methods, objectModels: resolveSubclasses(objectModels), enumModels, apiName };
}

export default function templateDatasFromSpecs(specs, config) {
  return _.mapValues(specs, (spec, apiName) => templateDataFromSpec(spec, apiName, config));
}
