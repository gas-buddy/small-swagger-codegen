//
//  request.swift
//  Testbed
//
//  Created by Griffin Schneider on 3/26/18.
//  Copyright © 2018 Griffin Schneider. All rights reserved.
//

import Foundation
import Alamofire

struct RequestParam {
    enum Location {
        case path
        case body
        case query
        case header
    }
    let name: String
    let `in`: Location
    let value: SwaggerSerializeable
    let format: String?
}

open class SwaggerApi {
    public static var baseUrl = "https://api.gasbuddy.io/payment"
    public static var defaultHeaders: [String: String] = [
        "Authorization": "Basic butts"
    ]
    
    static func request<ResponseType: SwaggerDeserializeable>(
        method: HTTPMethod,
        path: String,
        params: [RequestParam] = [],
        completion: @escaping (Error?, ResponseType?) -> Void
    ) {
        var path = path
        var queryParams: [URLQueryItem] = []
        var body: Data? = nil
        var headers: HTTPHeaders = [:]
        params.forEach { param in
            switch param.in {
            case .path:
                guard let value = param.value.serializeToString(format: param.format) else {
                    fatalError("Failed to serialize path parameter to string: \(param)")
                }
                guard let escapedValue = value.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) else {
                    fatalError("Failed to escape path parameter?? \(value)")
                }
                path = path.replacingOccurrences(of: "{\(param.name)}", with: escapedValue)
            case .body:
                guard body == nil else {
                    fatalError("Attempted to make a request with multiple body parameters: \(method.rawValue) \(path) \(params)")
                }
                guard let serializeable = param.value as? SwaggerContainer else {
                    fatalError("Failed to send \(param.value) as a body parameter, unable to convert to JSON")
                }
                body = serializeable.toJson()
            case .query:
                var value = ""
                if let array = param.value as? [SwaggerSerializeable] {
                    for (idx, ele) in array.enumerated() {
                        value = "\(value)\(idx > 0 ? "," : "")\(ele.serializeToString(format: param.format) ?? "")"
                    }
                } else {
                    value = param.value.serializeToString(format: param.format) ?? ""
                }
                queryParams.append(URLQueryItem(name: param.name, value: value))
            case .header:
                headers[param.name] = param.value.serializeToString(format: nil)
            }
        }
        request(method: method, path: path, queryParams: queryParams, headers: headers, body: body) { err, response in
            guard let res = response else {
                return completion(err, nil)
            }
            return completion(err, ResponseType.deserialize(json: res, format: nil))
        }
    }
    
    static func request(
        method: HTTPMethod,
        path: String,
        params: [RequestParam] = [],
        completion: ((Error?, Void) -> Void)
    ) {
        print(params)
    }
    
    
    private static func request(
        method: HTTPMethod,
        path: String,
        queryParams: [URLQueryItem],
        headers: HTTPHeaders?,
        body: Data?,
        completion: @escaping (Error?, Any?) -> Void
    ) {
        let urlString = "\(baseUrl)\(path)"
        guard var components = URLComponents(string: urlString) else {
            fatalError("Failed to create URL components from URL string: \(urlString)")
        }
        if queryParams.count > 0 {
            components.queryItems = queryParams
        }
        guard let url = components.url else {
            fatalError("Failed to construct URL: \(urlString) \(components)")
        }
        let allHeaders = defaultHeaders.merging(headers ?? [:], uniquingKeysWith: { (first, _) in first })
        let request = try! URLRequest(url: url, method: method, headers: allHeaders)
        let r = Alamofire.request(request)
        debugPrint(r)
        r.responseJSON { res in
            debugPrint(res)
        }
    }
}




