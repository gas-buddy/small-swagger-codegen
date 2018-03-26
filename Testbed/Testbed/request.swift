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
        method: String,
        path: String,
        params: [RequestParam] = [],
        completion: @escaping (Error?, ResponseType?) -> Void
    ) {
        var path = path
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
            case .body: break
            case .query: break
            case .header: break
            }
        }
        request(method: method, path: path) { err, response in
            guard let res = response else {
                return completion(err, nil)
            }
            return completion(err, ResponseType.deserialize(json: res, format: nil))
        }
    }
    
    static func request(
        method: String,
        path: String,
        params: [RequestParam] = [],
        completion: ((Error?, Void) -> Void)
    ) {
        print(params)
    }
    
    
    private static func request(method: String, path: String, completion: @escaping (Error?, Any?) -> Void) {
        print("\(method.uppercased()) \(baseUrl)\(path)")
    }
}




