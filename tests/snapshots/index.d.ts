// tslint:disable
import type {
  EventSource,
  ResponseHeaders,
  ServiceCallPromise,
  SystemFetchResponse,
  AbortController,
  FetchConfig,
  FetchPerRequestOptions,
  RestApiErrorResponse,
  RestApiSuccessResponse,
} from 'rest-api-support';

export type GetFeaturesSampleQuery = "value1" | "value2";

/**
 * @export
 * @class ClientData
 */
export interface ClientData {
  locale?: string;
  ver?: string;
  dev: ClientData_Dev;
  app: ClientData_App;
  user?: ClientData_User;
  ctx?: Record<string, any>;
}
/**
 * @export
 * @class ClientData_Dev
 */
export interface ClientData_Dev {
  id?: string;
  os?: string;
  Ver?: string;
}

/**
 * @export
 * @class ClientData_App
 */
export interface ClientData_App {
  id?: string;
  ver?: string;
  hr?: number;
}

/**
 * @export
 * @class ClientData_User
 */
export interface ClientData_User {
  country?: string;
  anon_id?: string;
}


/**
 * @export
 * @class Features
 */
export interface Features {
  ver?: string;
  features?: Array<FeaturesFeatures>;
}

/**
 * @export
 * @class FeaturesFeatures
 */
export interface FeaturesFeatures {
  n: string;
  r?: boolean;
  v?: string;
  p?: Record<string, any>;
  l?: Record<string, any>;
}


export interface getFeaturesArguments {
  tag_name: string,
  sample_query?: GetFeaturesSampleQuery,
  client: ClientData,
}

export class FeatureAPI {
  constructor(configOrFunctionGeneratingConfig: FetchConfig);

  /**
   * Get a list of features and settings for a given device, user and app
   *
   * @parameter { string } tag_name: The tag (and its parents) for which features are being requested
   * @parameter { GetFeaturesSampleQuery } sample_query: A query parameter
   * @parameter { ClientData } client: Information about the client making the request
   */
  getFeatures(request: getFeaturesArguments, options?: FetchPerRequestOptions) : ServiceCallPromise<RestApiSuccessResponse<Features> | RestApiErrorResponse>;

  /**
   * A method with no parameters
   *
   */
  get_noargs(request?: null | undefined, options?: FetchPerRequestOptions) : ServiceCallPromise<RestApiSuccessResponse<Features> | RestApiErrorResponse>;
}

export default FeatureAPI;
