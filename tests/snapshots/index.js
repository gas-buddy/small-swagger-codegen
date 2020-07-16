// eslint-disable camelcase
// eslint-disable-next-line no-unused-vars
import { parameterBuilder, fetchHelper, eventSourceHelper } from 'rest-api-support';

const CONFIG_FUNCTION = Symbol.for('small-swagger-codegen::configurationGenerator');
export const CONFIG_PROPERTY = Symbol.for('small-swagger-codegen::configuration');

/**
 *
 * @export
 * @class FeatureAPI
 */
export class FeatureAPI {
  constructor(configOrGenerator) {
    let config = (configOrGenerator && configOrGenerator[CONFIG_FUNCTION]) || configOrGenerator;
    if (typeof config === 'function') {
      config = config(FeatureAPI);
    }
    this[CONFIG_PROPERTY] = config;
    this[CONFIG_PROPERTY].baseUrl = this[CONFIG_PROPERTY].baseUrl || '';
  }

  get baseUrl() {
    return this[CONFIG_PROPERTY].baseUrl;
  }


  /**
   * Get a list of features and settings for a given device, user and app
   *
   * @parameter { string } tag_name: The tag (and its parents) for which features are being requested
   * @parameter { GetFeaturesSampleQuery } sample_query: A query parameter
   * @parameter { ClientData } client: Information about the client making the request
   */
  getFeatures({
    tag_name,
    sample_query,
    client,
  }, $$fetchOptions) {
    // Build parameters, run request interceptors, fetch, and then run response interceptors
    // eslint-disable-next-line prefer-rest-params
    const $$source = { method: 'getFeatures', client: '', arguments: arguments[0] };
    const $$fetchArgs = parameterBuilder('POST', this.baseUrl, '/feature/features/{tag_name}', this[CONFIG_PROPERTY])
      .path('tag_name', tag_name)
      .query('sample_query', sample_query)
      .body('client', client)
      .build();
    return fetchHelper(this[CONFIG_PROPERTY], $$fetchArgs, $$fetchOptions, $$source);
  }

  /**
   * A method with no parameters
   *
   */
  get_noargs(hasNoArguments, $$fetchOptions) {
    // Build parameters, run request interceptors, fetch, and then run response interceptors
    // eslint-disable-next-line prefer-rest-params
    const $$source = { method: 'get_noargs', client: '', arguments: arguments[0] };
    const $$fetchArgs = parameterBuilder('GET', this.baseUrl, '/feature/noargs', this[CONFIG_PROPERTY])
      .build();
    return fetchHelper(this[CONFIG_PROPERTY], $$fetchArgs, $$fetchOptions, $$source);
  }
}

export default FeatureAPI;
