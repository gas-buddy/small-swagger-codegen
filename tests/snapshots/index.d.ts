// tslint:disable
interface FeatureAPIPromise<T> extends Promise<T>{
  abort(): void;
  /**
   * Expect certain status codes and accept the promise rather than
   * throwing
   */
  expect(...statusCodes: number[]) : FeatureAPIPromise<T>;
}

interface EventSource {
  constructor(url: string, init?: any): this;
  removeAllListeners(): this;
  addEventListener(name: string, handler: (data: any) => void): this;
  close(): this;
}

interface AbortController {
  constructor(): this;
  abort(): void;
  signal: any;
}

interface FeatureAPIResponseHeaders {
  get(header: string) : any;
}

interface FeatureAPIFetchResponse {
  status: number;
  headers?: FeatureAPIResponseHeaders;
  blob(): Promise<any>;
  json(): Promise<any>;
}

interface FeatureAPIResponse<T> {
  body: T;
  status: number;
  headers: FeatureAPIResponseHeaders;
  type: 'response';
}

interface FeatureAPIErrorResponse {
  code: string;
  message: string;
  domain: string;
  display_message?: string;
  type: 'error';
}

interface FeatureAPIRequestOptions {
  /**
   * Run before the request goes out with the parameters that will be used
   */
  requestInterceptor?: (parameters: any) => void;
  /**
   * Run after the request comes back
   */
  responseInterceptor?: (response: any, parameters: any) => void;
}

export class FeatureAPIConfiguration {
  /**
   * Will be prepended to the path defined in the Swagger spec
   */
  baseUrl?: string;

  /**
   * For timeout support
   */
  AbortController: new () => AbortController;

  /**
   * For streaming requests
   */
  EventSource: new (url: string, init?: any) => EventSource;

  /**
   * For non-streaming requests
   */
  fetch: (url: string, init?: any) => Promise<FeatureAPIFetchResponse>;

  /**
   * Run before the request goes out with the parameters that will be used
   */
  requestInterceptor?: (parameters: any) => void;

  /**
   * Run after the request comes back
   */
  responseInterceptor?: (response: any, parameters: any) => void;
}

type GetFeaturesSampleQuery = "value1" | "value2";

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
  ctx?: Map<string, any>;
}
/**
 * @export
 * @class ClientData_Dev
 */
export interface ClientData_Dev {
  id?: string;
  os?: string;
  ver?: string;
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
  p?: Map<string, any>;
  l?: Map<string, any>;
}


export interface getFeaturesArguments {
  tag_name: string,
  sample_query?: GetFeaturesSampleQuery,
  client: ClientData,
}

export class FeatureAPI {
  constructor(configOrFunctionGeneratingConfig: FeatureAPIConfiguration);

  /**
   * Get a list of features and settings for a given device, user and app
   *
   * @parameter { string } tag_name: The tag (and its parents) for which features are being requested
   * @parameter { GetFeaturesSampleQuery } sample_query: A query parameter
   * @parameter { ClientData } client: Information about the client making the request
   */
  getFeatures(request: getFeaturesArguments, options?: FeatureAPIRequestOptions) : FeatureAPIPromise<FeatureAPIResponse<Features> | FeatureAPIErrorResponse>;

  /**
   * A method with no parameters
   *
   */
  get_noargs(request?: null | undefined, options?: FeatureAPIRequestOptions) : FeatureAPIPromise<FeatureAPIResponse<Features> | FeatureAPIErrorResponse>;
}

export default FeatureAPI;
