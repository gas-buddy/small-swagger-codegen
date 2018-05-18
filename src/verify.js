import _ from 'lodash';
import assert from 'assert';
import util from 'util';

export function describe(it) {
  return util.inspect(it, { depth: 10, colors: true, breakLength: 150 });
}

export function log(it) {
  // eslint-disable-next-line no-console
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
  return _.reduce(problemFinders, (acc, problemFinder) => {
    findProblems(array, problemFinder[0], (problem) => {
      if (problem) {
        return `${acc}${problemFinder[1](problem)}\n---------------------------`;
      }
      return acc;
    });
  }, '');
}

function verifyMethods(methods) {
  return findAllProblems(methods, [
    (method) => {
      const params = _.concat(method.params || [], method.response);
      return _.find(params, param => !param.type);
    },
    problems => `\nFound methods with params or responses without a type: ${problems}`,
  ], [
    method => _.find(method.params, (param) => {
      if (param.in === 'formData' && param.schema && param.schema.type !== 'file') {
        return method;
      }
      return undefined;
    }),
    problems => `\nFound methods with form data params that are not of type 'file': ${problems}`,
  ]);
}

function verifyModels(models) {
  const dupes = _.filter(_.map(models, (model) => {
    // Find any other models with the same name.
    const duplicates = _.filter(models, otherModel => otherModel !== model && otherModel.name === model.name);
    // If we found any duplicates, add this model to the list.
    return duplicates.length > 0 ? model : undefined;
  }));
  assert(dupes.length < 1, `Duplicate names!\n${describe(dupes)}`);

  return findAllProblems(models, [
    model => !model.name,
    problem => `\nFound models without name: ${problem}`,
  ], [
    model => model.type !== 'object' && model.type !== 'enum',
    problem => `\nFound non-object-or-enum model: ${problem}`,
  ]);
}

function verifyTemplateData(data) {
  const problems = []
    .concat(verifyMethods(data.methods))
    .concat(verifyModels(data.objectModels))
    .concat(verifyModels(data.enumModels))
    .join('');
  return _.isEmpty(problems) ? undefined : problems;
}

export function verify(templateDatas) {
  const problems = _.map(templateDatas, (templateData, apiName) => {
    const apiProblems = verifyTemplateData(templateData);
    return _.isEmpty(apiProblems) ? '' : `Problems with ${apiName}: ${apiProblems}`;
  }).join('');
  assert(_.isEmpty(problems), problems);
}
