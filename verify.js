import _ from 'lodash';
import assert from 'assert';

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
    problems => `\nFound methods with params or responses without a type: ${problems}`
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

export function verify(data) {
  // log(data);
  const error = verifyMethods(data.methods) + verifyModels(data.models);
  if (!_.isEmpty(error)) {
    assert(false, error);
  }
}
