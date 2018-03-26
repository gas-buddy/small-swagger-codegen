//
//  request.swift
//  Testbed
//
//  Created by Griffin Schneider on 3/26/18.
//  Copyright © 2018 Griffin Schneider. All rights reserved.
//

import Foundation

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

func _request<ResponseType: SwaggerDeserializeable>(
    method: String,
    path: String,
    params: [RequestParam] = [],
    completion: ((Error?, ResponseType?) -> Void)
) {
    print("\(method.uppercased()) \(path) -- \(params)")
}

func _request(
    method: String,
    path: String,
    params: [RequestParam] = [],
    completion: ((Error?, Void) -> Void)
    ) {
    print(params)
}

