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
        case formData
    }
    let name: String
    let `in`: Location
    let value: SwaggerSerializeable
    let format: String?
}

private struct UploadFile {
    let url: URL
    let name: String
}

open class SwaggerApi {
    public static var baseUrl = "https://api.gasbuddy.io/payment"
    public static var defaultHeaders: [String: String] = [
        "Authorization": "Basic butts"
    ]
    
    static func request(
        method: HTTPMethod,
        path: String,
        params: [RequestParam] = [],
        completion: @escaping (Error?, Void) -> Void
    ) {
        internalRequest(method: method, path: path, params: params) { err, response in
            return completion(err, ())
        }
    }
    
    static func request<ResponseType: SwaggerDeserializeable>(
        method: HTTPMethod,
        path: String,
        params: [RequestParam] = [],
        completion: @escaping (Error?, ResponseType?) -> Void
    ) {
        internalRequest(method: method, path: path, params: params) { err, response in
            guard let res = response else {
                return completion(err, nil)
            }
            return completion(err, ResponseType.deserialize(json: res, format: nil))
        }
    }
    
    static func internalRequest(
        method: HTTPMethod,
        path: String,
        params: [RequestParam] = [],
        completion: @escaping (Error?, Any?) -> Void
    ) {
        var path = path
        var queryParams: [URLQueryItem] = []
        var body: Data? = nil
        var uploadFile: UploadFile? = nil
        var headers: HTTPHeaders = [:]
        params.forEach { param in
            switch param.in {
            case .path:
                guard let value = param.value.serializeToString(format: param.format) else {
                    fatalError("Failed to serialize path parameter to string: \(param)")
                }
                guard let escapedValue = value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else {
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
                if !value.isEmpty {
                    queryParams.append(URLQueryItem(name: param.name, value: value))
                }
            case .header:
                headers[param.name] = param.value.serializeToString(format: nil)
            case .formData:
                guard let url = param.value as? URL else {
                    fatalError("Attempted to send something other than a file in form data: \(param)")
                }
                uploadFile = UploadFile(url: url, name: param.name)
            }
        }
        internalRequest(method: method, path: path, queryParams: queryParams, headers: headers, body: body, uploadFile: uploadFile) { err, response in
            return completion(err, response)
        }
    }
    
    private static func internalRequest(
        method: HTTPMethod,
        path: String,
        queryParams: [URLQueryItem],
        headers: HTTPHeaders?,
        body: Data?,
        uploadFile: UploadFile?,
        completion: @escaping (Error?, Any?) -> Void
    ) {
        guard !(body != nil && uploadFile != nil) else {
            fatalError("Tried to upload a file and send a request body in the same request: \(method) \(path)")
        }
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
        
        if let uploadFile = uploadFile {
            return internalRequest(method: method, url: url, allHeaders: allHeaders, uploadFile: uploadFile, completion: completion)
        }
        return internalRequest(method: method, url: url, allHeaders: allHeaders, body: body, completion: completion)
    }
    
    private static func internalRequest(
        method: HTTPMethod,
        url: URL,
        allHeaders: HTTPHeaders,
        body: Data?,
        completion: @escaping (Error?, Any?) -> Void
    ) {
        let urlRequest = try! URLRequest(url: url, method: method, headers: allHeaders)
        let req = Alamofire.request(urlRequest)
        debugPrint(req)
        req.responseJSON { res in handleResponse(req, res, completion) }
    }
    
    private static func internalRequest(
        method: HTTPMethod,
        url: URL,
        allHeaders: HTTPHeaders,
        uploadFile: UploadFile,
        completion: @escaping (Error?, Any?) -> Void
    ) {
        Alamofire.upload(multipartFormData: { multiPartFormData in
            multiPartFormData.append(uploadFile.url, withName: uploadFile.name)
        }, to: url, method: method, headers: allHeaders, encodingCompletion: { encodingResult in
            switch encodingResult {
            case .success(let upload, _, _):
                upload.responseJSON { res in handleResponse(upload, res, completion) }
            case .failure(let encodingError):
                completion(encodingError, nil)
            }
        })
    }
    
    private static func handleResponse(
        _ req: Request,
        _ res: DataResponse<Any>,
        _ completion: @escaping (Error?, Any?) -> Void
    ) {
        var error = res.error
        guard error == nil else {
            return completion(error, nil)
        }
        guard let statusCode = res.response?.statusCode else {
            fatalError("Server didn't return a status code, but also didn't error?? \(res.debugDescription)")
        }
        guard let data = res.data else {
            return completion(error, nil)
        }
        var jsonObj: Any? = nil
        do {
            jsonObj = try JSONSerialization.jsonObject(with: data, options: [.allowFragments])
        } catch {
            let dataString = String(data: data, encoding: .utf8) ?? data.debugDescription
            print("Server returned invalid json for request \(req.debugDescription): \(dataString)")
        }
        if statusCode > 200 {
            var userInfo: [String: Any]? = nil
            if let dict = jsonObj as? [String: Any] {
                userInfo = [
                    NSLocalizedDescriptionKey: (dict["message"] as? String) as Any
                ]
            }
            error = NSError(domain: "GBPay", code: statusCode, userInfo: userInfo)
            return completion(error, nil)
        }
        return completion(error, jsonObj)
    }
}




