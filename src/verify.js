import _ from 'lodash';
import assert from 'assert';

export function describe(it) {
  return require('util').inspect(it, {depth:10, colors:true, breakLength:150});
}

export function log(it) {
  console.log(`\n${describe(it)}`);
}

function findProblems(array, pred, foundProblem) {
  const problems = array
        .filter(pred)
        .map(item => foundProblem(describe(item)))
        .join('');
  return problems === '' ? undefined : problems;
}

function findAllProblems(array, ...problemFinders) {
  let retVal = '';
  _.each(problemFinders, problemFinder => {
    findProblems(array, problemFinder[0], problem => {
      if (problem) {
        retVal += problemFinder[1](problem);
        retVal += '\n---------------------------';
      }
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
  ], [
    method => {
      for (const param of method.params) {
        if (param.in === 'formData' && param.schema && param.schema.type !== 'file') {
          return method;
        }
      }
      return undefined;
    },
    problems => `\nFound methods with form data params that are not of type 'file': ${problems}`
  ]);
}

function verifyModels(models) {
  const names = _.map(models, m => m.name);
  const dupes = _.filter(names, function (value, index, iteratee) {
    return _.includes(iteratee, value, index + 1);
  });
  assert(dupes.length < 1, `Duplicate names! ${dupes}`);

  return findAllProblems(models, [
    model => !model.name,
    problem => `\nFound models without name: ${problem}`
  ], [
    model => !model.schema,
    problem => `\nFound models without schema: ${problem}`
  ], [
    model => model.schema && model.schema.type !== 'object' && model.schema.type !== 'enum',
    problem => `\nFound non-object-or-enum model: ${problem}`
  ]);
}

export function verify(data) {
  let problems = data.apis
      .map(api => verifyMethods(api.methods))
      .concat(verifyModels(data.objectModels))
      .concat(verifyModels(data.enumModels))
      .join('');
  return _.isEmpty(problems) ? undefined : problems;
}
