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
}

func _request<ResponseType: SwaggerDeserializeable>(
    params: [RequestParam] = [],
    completion: ((Error?, ResponseType) -> Void)
) {
    print(params)
}

func _request(
    params: [RequestParam] = [],
    completion: ((Error?, Void) -> Void)
    ) {
    print(params)
}

