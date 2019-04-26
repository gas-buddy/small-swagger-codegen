// tslint:disable
interface FeatureAPIPromise<T> extends Promise<T>{
  abort();
  /**
   * Expect certain status codes and accept the promise rather than
   * throwing
   */
  expect(...statusCodes) : FeatureAPIPromise<T>;
}

interface EventSource {
  constructor(url: string, init?: any);
  removeAllListeners();
  addEventListener(name: string, handler: (data: any) => void);
  close();
}

interface FeatureAPIErrorResponse {
  code: string;
  message: string;
  domain: string;
  display_message?: string;
}

interface FeatureAPIRequestOptions {
  /**
   * Run before the request goes out with the parameters that will be used
   */
  requestInterceptor: (parameters: any) => void;
  /**
   * Run after the request comes back
   */
  responseInterceptor: (response: any, parameters: any) => void;
}

export class FeatureAPIConfiguration {
  /**
   * Will be prepended to the path defined in the Swagger spec
   */
  baseUrl?: string;

  /**
   * For streaming requests
   */
  EventSource: (url: string, init?: any) => EventSource;

  /**
   * For non-streaming requests
   */
  fetch: (url: string, init?: any) => Promise<Response>;

  /**
   * Run before the request goes out with the parameters that will be used
   */
  requestInterceptor: (parameters: any) => void;

  /**
   * Run after the request comes back
   */
  responseInterceptor: (response: any, parameters: any) => void;
}

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
  anonId?: string;
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
  tag: string,
  sampleQuery?: string,
  client: ClientData,
}

export default class FeatureAPI {
  constructor(configOrFunctionGeneratingConfig: FeatureAPIConfiguration);

  /**
   * Get a list of features and settings for a given device, user and app
   *
   * @parameter { string } tag: The tag (and its parents) for which features are being requested
   * @parameter { string } sampleQuery: A query parameter
   * @parameter { ClientData } client: Information about the client making the request
   */
  getFeatures(request: getFeaturesArguments, FeatureAPIRequestOptions) : FeatureAPIPromise<Features | FeatureAPIErrorResponse | null>;
}
