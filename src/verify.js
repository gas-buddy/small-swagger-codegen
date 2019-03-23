import _ from 'lodash';
import util from 'util';

export function describe(it) {
  return util.inspect(it, { depth: 10, colors: true, breakLength: 150 });
}

export function log(it) {
  console.log(`\n${describe(it)}`);
}

function findProblems(array, pred, foundProblem) {
  return array
    .filter(pred)
    .map(item => foundProblem(describe(item)))
    .join('');
}

function findAllProblems(array, ...problemFinders) {
  return _.reduce(problemFinders, (acc, problemFinder) => (
    acc + findProblems(array, problemFinder[0], problem => (
      problem ? `${problemFinder[1](problem)}\n---------------------------` : ''
    ))
  ), '');
}

function verifyMethods(methods) {
  return findAllProblems(methods, [
    method => (
      _.find([method.response].concat(method.params), param => !_.get(param, 'type'))
    ),
    problem => `\nFound method with param or response without a type: ${problem}`,
  ], [
    method => _.find(method.params, (param) => {
      if (param.in === 'formData' && param.schema && param.schema.type !== 'file') {
        return method;
      }
      return undefined;
    }),
    problem => `\nFound method with form data param that is not of type 'file': ${problem}`,
  ]);
}

function verifyModels(models) {
  const dupes = _.filter(_.map(models, (model) => {
    // Find any other models with the same name.
    const duplicates = _.filter(models, otherModel => otherModel !== model && otherModel.name === model.name);
    // If we found any duplicates, add this model to the list.
    return duplicates.length > 0 ? model : undefined;
  }));

  return findAllProblems(models, [
    model => dupes.includes(model),
    problem => `\nFound model with duplicated name: ${problem}`,
  ], [
    model => !model.name,
    problem => `\nFound model without name: ${problem}`,
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
  if (!_.isEmpty(problems)) {
    console.error(problems);
    process.exit(1);
  }
}
