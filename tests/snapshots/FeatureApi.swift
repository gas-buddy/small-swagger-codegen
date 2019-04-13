import Foundation
import SwaggerClientSupport

open class FeatureAPIClass: SwaggerApi {
    /// Get a list of features and settings for a given device, user and app
    /// - parameter tag: The tag (and its parents) for which features are being requested
    /// - parameter sampleQuery: A query parameter
    /// - parameter client: Information about the client making the request
    open func getFeatures(
        tag: String,
        sampleQuery: String? = nil,
        client: ClientData,
        timeout: TimeInterval? = nil,
        completion: @escaping (Features?, ErrorResponse?) -> Void
    ) {
        self.request(method: .post, path: "/feature/features/{tag}", timeout: timeout, params: [
            .init(name: "tag", in: .path, value: tag, format: nil),
            .init(name: "sample_query", in: .query, value: sampleQuery, format: nil),
            .init(name: "client", in: .body, value: client, format: nil)
        ], completion: completion)
    }

}

public let FeatureAPI = FeatureAPIClass()


open class ClientData: SwaggerModel {
    /// The locale desired for returned resources
    public var locale: String?
    /// The "ver" value returned from a previous call to this API which will cause features having a return_if_before value generated before ver not to be returned
    public var ver: String?
    public var dev: ClientData.Dev
    public var app: ClientData.App
    public var user: ClientData.User?
    /// Arbitrary key value pairs
    public var ctx: Dictionary<String, Any>?

    public init(
        locale: String?=nil,
        ver: String?=nil,
        dev: ClientData.Dev,
        app: ClientData.App,
        user: ClientData.User?=nil,
        ctx: Dictionary<String, Any>?=nil
    ) {
        self.locale = locale
        self.ver = ver
        self.dev = dev
        self.app = app
        self.user = user
        self.ctx = ctx
    }

    public func serialize(format: String? = nil) -> Any? {
        let retVal: [String: Any?] = [
            "locale": locale?.serialize(format: nil),
            "ver": ver?.serialize(format: nil),
            "dev": dev.serialize(format: nil),
            "app": app.serialize(format: nil),
            "user": user?.serialize(format: nil),
            "ctx": ctx?.serialize(format: nil),
        ]
        return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
    }

    public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
        guard let dictionary = json as? [String: Any] else {
            throw deserializationError("Trying to deserialize a ClientData but got \(String(describing: json))")
        }
        let object = ClientData(
            locale: try Optional<String>.deserialize(json: dictionary["locale"], format: nil),
            ver: try Optional<String>.deserialize(json: dictionary["ver"], format: nil),
            dev: try ClientData.Dev.deserialize(json: dictionary["dev"], format: nil),
            app: try ClientData.App.deserialize(json: dictionary["app"], format: nil),
            user: try Optional<ClientData.User>.deserialize(json: dictionary["user"], format: nil),
            ctx: try Optional<Dictionary<String, Any>>.deserialize(json: dictionary["ctx"], format: nil)
        )
        return try cast(object)
    }

    open class Dev: SwaggerModel {
        /// A unique identifier for the device
        public var id: String?
        public var os: String?
        public var ver: String?
    
        public init(
            id: String?=nil,
            os: String?=nil,
            ver: String?=nil
        ) {
            self.id = id
            self.os = os
            self.ver = ver
        }
    
        public func serialize(format: String? = nil) -> Any? {
            let retVal: [String: Any?] = [
                "id": id?.serialize(format: nil),
                "os": os?.serialize(format: nil),
                "ver": ver?.serialize(format: nil),
            ]
            return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
        }
    
        public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
            guard let dictionary = json as? [String: Any] else {
                throw deserializationError("Trying to deserialize a Dev but got \(String(describing: json))")
            }
            let object = Dev(
                id: try Optional<String>.deserialize(json: dictionary["id"], format: nil),
                os: try Optional<String>.deserialize(json: dictionary["os"], format: nil),
                ver: try Optional<String>.deserialize(json: dictionary["ver"], format: nil)
            )
            return try cast(object)
        }
    }

    open class App: SwaggerModel {
        public var id: String?
        public var ver: String?
        /// Hours since app install
        public var hr: Double?
    
        public init(
            id: String?=nil,
            ver: String?=nil,
            hr: Double?=nil
        ) {
            self.id = id
            self.ver = ver
            self.hr = hr
        }
    
        public func serialize(format: String? = nil) -> Any? {
            let retVal: [String: Any?] = [
                "id": id?.serialize(format: nil),
                "ver": ver?.serialize(format: nil),
                "hr": hr?.serialize(format: nil),
            ]
            return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
        }
    
        public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
            guard let dictionary = json as? [String: Any] else {
                throw deserializationError("Trying to deserialize a App but got \(String(describing: json))")
            }
            let object = App(
                id: try Optional<String>.deserialize(json: dictionary["id"], format: nil),
                ver: try Optional<String>.deserialize(json: dictionary["ver"], format: nil),
                hr: try Optional<Double>.deserialize(json: dictionary["hr"], format: nil)
            )
            return try cast(object)
        }
    }

    open class User: SwaggerModel {
        /// The country in which the user is acting or to which they are assigned
        public var country: String?
        /// If the user is not an authenticated user, an anonymous identifier for them (such as a guid)
        public var anonId: String?
    
        public init(
            country: String?=nil,
            anonId: String?=nil
        ) {
            self.country = country
            self.anonId = anonId
        }
    
        public func serialize(format: String? = nil) -> Any? {
            let retVal: [String: Any?] = [
                "country": country?.serialize(format: nil),
                "anon_id": anonId?.serialize(format: nil),
            ]
            return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
        }
    
        public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
            guard let dictionary = json as? [String: Any] else {
                throw deserializationError("Trying to deserialize a User but got \(String(describing: json))")
            }
            let object = User(
                country: try Optional<String>.deserialize(json: dictionary["country"], format: nil),
                anonId: try Optional<String>.deserialize(json: dictionary["anon_id"], format: nil)
            )
            return try cast(object)
        }
    }
}

open class Features: SwaggerModel {
    /// A version value which should be passed to future calls such that features marked with a "return_if_before" value that comes before ver will not be returned
    public var ver: String?
    /// A list of feature-variant assignments for the user. Note that if the user is assigned to the "control group" for a feature, no entry will be sent for that feature
    public var features: Array<FeaturesFeatures>?

    public init(
        ver: String?=nil,
        features: Array<FeaturesFeatures>?=nil
    ) {
        self.ver = ver
        self.features = features
    }

    public func serialize(format: String? = nil) -> Any? {
        let retVal: [String: Any?] = [
            "ver": ver?.serialize(format: nil),
            "features": features?.serialize(format: nil),
        ]
        return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
    }

    public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
        guard let dictionary = json as? [String: Any] else {
            throw deserializationError("Trying to deserialize a Features but got \(String(describing: json))")
        }
        let object = Features(
            ver: try Optional<String>.deserialize(json: dictionary["ver"], format: nil),
            features: try Optional<Array<FeaturesFeatures>>.deserialize(json: dictionary["features"], format: nil)
        )
        return try cast(object)
    }
}

open class FeaturesFeatures: SwaggerModel {
    /// Feature name
    public var n: String
    /// FALSE if this feature should not be recorded via analytics events (e.g. we don't need to measure anymore)
    public var r: Bool?
    /// Variant for feature. If the variant and feature name are the same, only the feature name will be sent
    public var v: String?
    /// Payload for the feature and the variant, if available
    public var p: Dictionary<String, Any>?
    /// Localized resources associated with the variant
    public var l: Dictionary<String, Any>?

    public init(
        n: String,
        r: Bool?=nil,
        v: String?=nil,
        p: Dictionary<String, Any>?=nil,
        l: Dictionary<String, Any>?=nil
    ) {
        self.n = n
        self.r = r
        self.v = v
        self.p = p
        self.l = l
    }

    public func serialize(format: String? = nil) -> Any? {
        let retVal: [String: Any?] = [
            "n": n.serialize(format: nil),
            "r": r?.serialize(format: nil),
            "v": v?.serialize(format: nil),
            "p": p?.serialize(format: nil),
            "l": l?.serialize(format: nil),
        ]
        return retVal.filter { (_: String, val: Any?) -> Bool in return val != nil }
    }

    public class func deserialize(json: Any?, format: String? = nil) throws -> Self {
        guard let dictionary = json as? [String: Any] else {
            throw deserializationError("Trying to deserialize a FeaturesFeatures but got \(String(describing: json))")
        }
        let object = FeaturesFeatures(
            n: try String.deserialize(json: dictionary["n"], format: nil),
            r: try Optional<Bool>.deserialize(json: dictionary["r"], format: nil),
            v: try Optional<String>.deserialize(json: dictionary["v"], format: nil),
            p: try Optional<Dictionary<String, Any>>.deserialize(json: dictionary["p"], format: nil),
            l: try Optional<Dictionary<String, Any>>.deserialize(json: dictionary["l"], format: nil)
        )
        return try cast(object)
    }
}


