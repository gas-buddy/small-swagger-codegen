import { parameterBuilder, fetchHelper, eventSourceHelper } from 'rest-api-support';

/**
 *
 * @export
 * @class FeatureAPI
 */
export default class FeatureAPI {
  constructor(configOrGenerator) {
    let config = configOrGenerator;
    if (typeof configOrGenerator === 'function') {
      config = configOrGenerator(FeatureAPI);
    }
    const {
      baseUrl = '',
      fetch,
      EventSource,
      requestInterceptor,
      responseInterceptor,
    } = config || {}
    Object.assign(this, { baseUrl, fetch, requestInterceptor, responseInterceptor, EventSource });
  }

  /**
   * Get a list of features and settings for a given device, user and app
   *
   * @parameter { string } tag: The tag (and its parents) for which features are being requested
   * @parameter { string } sampleQuery: A query parameter
   * @parameter { ClientData } client: Information about the client making the request
   */
  async getFeatures({
    tag,
    sampleQuery,
    client,
  }, fetchOptions) {
    // Build parameters, run request interceptors, fetch, and then run response interceptors
    const source = { method: 'getFeatures', client: '', args: arguments[0] };
    const fetchArgs = parameterBuilder('POST', this.baseUrl, '/feature/features/{tag}')
      .path('tag', tag)
      .query('sample_query', sampleQuery)
      .body('client', client)
      .build();
    return fetchHelper(this, fetchArgs, fetchOptions, source);
  }

}
