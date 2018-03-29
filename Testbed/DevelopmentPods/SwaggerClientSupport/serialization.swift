import Foundation


public protocol SwaggerSerializeable {
    // Serializes this object into a JSON object or fragment. This means
    // any type that could be returned by NSJSONSerialization.JSONObjectWithData with
    // the NSJSONReadingAllowFragments option.
    func serialize(format: String?) -> Any?
    // Returns a string representation of the JSON object or fragment returned by `serialize`
    func serializeToString(format: String?) -> String?
}

public protocol SwaggerDeserializeable {
    static func deserialize(json: Any?, format: String?) -> Self
}


public protocol SwaggerContainer: SwaggerSerializeable, SwaggerDeserializeable {}
extension SwaggerContainer {
    public func serializeToString(format: String?) -> String? {
        let jsonData = toJson(format: format)
        guard let string = String(data: jsonData, encoding: .utf8) else {
            fatalError("Serialization error: unable to convert JSON data \(jsonData) to String")
        }
        return string
    }
    
    public func toJson(format: String? = nil) -> Data {
        let serialized = serialize(format: format) as Any
        guard let data = try? JSONSerialization.data(withJSONObject: serialized, options: [.prettyPrinted]) else {
            fatalError("Serialization error: unable to convert \(serialized) to JSON")
        }
        return data
    }
}

public protocol SwaggerModel: SwaggerContainer { }
public protocol SwaggerEnum: SwaggerSerializeable, SwaggerDeserializeable { }

extension Array: SwaggerContainer {
    public func serialize(format: String?) -> Any? {
        return map { element -> Any in
            guard let serializeable = element as? SwaggerSerializeable else {
                fatalError("Unable to serialize array element: \(element)")
            }
            return serializeable.serialize(format: format) as Any
        }
    }
    
    public static func deserialize(json: Any?, format: String?) -> Array<Element> {
        guard let array = json as? [Any] else {
            fatalError("Deserialization error: expected array but got \(String(describing: json))")
        }
        return array.map { element in
            guard let deserializeable = Element.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Element.self)")
            }
            guard let deserializedElement = deserializeable.deserialize(json: element, format: format) as? Element else {
                fatalError("Deserialization error: expected \(Element.self) but got \(element)")
            }
            return deserializedElement
        }
    }
}


extension Dictionary: SwaggerContainer {
    public func serialize(format: String?) -> Any? {
        return mapValues { value -> Any in
            guard let serializeable = value as? SwaggerSerializeable else {
                fatalError("Unable to serialize dictionary value: \(value)")
            }
            return serializeable.serialize(format: format) as Any
        }
    }
    
    public static func deserialize(json: Any?, format: String?) -> Dictionary<Key, Value> {
        guard let dictionary = json as? [Key: Any] else {
            fatalError("Deserialization error: expected dictionary but got \(String(describing: json))")
        }
        return dictionary.mapValues { value in
            guard let deserializeable = Value.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Value.self)")
            }
            guard let deserializedValue = deserializeable.deserialize(json: value, format: format) as? Value else {
                fatalError("Deserialization error: expected \(Value.self) but got \(String(describing: json))")
            }
            return deserializedValue
        }
    }
}


private let dateTimeFormatter: DateFormatter = {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
    fmt.locale = Locale(identifier: "en_US_POSIX")
    return fmt
}()
private let dateFormatter: DateFormatter = {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.locale = Locale(identifier: "en_US_POSIX")
    return fmt
}()
private let dateParseFormats: [String] = [
    "yyyy-MM-dd",
    "yyyy-MM-dd'T'HH:mm:ssZZZZZ",
    "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ",
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
    "yyyy-MM-dd HH:mm:ss"
]
private let dateParseFormatters = dateParseFormats.map { format -> DateFormatter in
    let formatter = DateFormatter()
    formatter.dateFormat = format
    return formatter
}

extension Date: SwaggerSerializeable, SwaggerDeserializeable {
    public func serialize(format: String?) -> Any? {
        return serializeToString(format: format)
    }
    
    public func serializeToString(format: String?) -> String? {
        guard let format = format else {
            fatalError("Serialization error: Can't format a date without a format")
        }
        switch format {
        case "date-time": return dateTimeFormatter.string(from: self)
        case "date": return dateFormatter.string(from: self)
        default: fatalError("Serialization error: Unknown date format \(format)")
        }
    }
    
    public static func deserialize(json: Any?, format: String?) -> Date {
        if let sourceString = json as? String {
            for formatter in dateParseFormatters {
                if let date = formatter.date(from: sourceString) {
                    return date
                }
            }
        }
        if let sourceInt = json as? Int64 {
            // treat as a java date
            return Date(timeIntervalSince1970: Double(sourceInt / 1000) )
        }
        fatalError("Deserialization error: expected a Date but got \(String(describing: json))")
    }
}


extension Optional: SwaggerSerializeable, SwaggerDeserializeable {
    public func serialize(format: String?) -> Any? {
        guard let value = self else {
            return self as Any
        }
        guard let serializeable = value as? SwaggerSerializeable,
            let serialized = serializeable.serialize(format: format) as? Wrapped else {
            fatalError("Serialization error: don't know how to serialize \(value)")
        }
        return Optional(serialized)
    }
    public func serializeToString(format: String?) -> String? {
        guard let value = self else {
            return nil
        }
        guard let serializeable = value as? SwaggerSerializeable,
            let serialized = serializeable.serializeToString(format: format) else {
                fatalError("Serialization error: don't know how to serialize \(value)")
        }
        return serialized
    }
    public static func deserialize(json: Any?, format: String?) -> Optional<Wrapped> {
        if json is NSNull {
            return nil
        }
        switch json {
        case .none:
            return nil
        case let .some(wrapped):
            guard let deserializeable = Wrapped.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Wrapped.self)")
            }
            guard let deserializedValue = deserializeable.deserialize(json: wrapped, format: format) as? Wrapped else {
                fatalError("Deserialization error: expected \(Wrapped.self) but got \(json!)")
            }
            return deserializedValue

        }
    }
}


extension URL: SwaggerSerializeable, SwaggerDeserializeable {
    public func serialize(format: String?) -> Any? {
        return absoluteString
    }
    public func serializeToString(format: String?) -> String? {
        return absoluteString
    }
    public static func deserialize(json: Any?, format: String?) -> URL {
        guard let deserialized = json as? String,
            let retVal = URL(string: deserialized) else {
            fatalError("Deserialization error: Expected URL but got \(String(describing: json))")
        }
        return retVal
    }
}


public protocol SwaggerSerializeablePrimitive: SwaggerSerializeable, SwaggerDeserializeable {}
extension SwaggerSerializeablePrimitive {
    public func serialize(format: String?) -> Any? {
        return self
    }
    public static func deserialize(json: Any?, format: String?) -> Self {
        guard let deserialized = json as? Self else {
            fatalError("Deserialization error: Expected \(Self.self) but got \(String(describing: json))")
        }
        return deserialized
    }
}
extension String: SwaggerSerializeablePrimitive {
    public func serializeToString(format: String?) -> String? {
        return self
    }
}
extension Int: SwaggerSerializeablePrimitive {
    public func serializeToString(format: String?) -> String? {
        return "\(self)"
    }
}
extension Double: SwaggerSerializeablePrimitive {
    public func serializeToString(format: String?) -> String? {
        return "\(self)"
    }
}
extension Bool: SwaggerSerializeablePrimitive {
    public func serializeToString(format: String?) -> String? {
        return self ? "true" : "false"
    }
}
