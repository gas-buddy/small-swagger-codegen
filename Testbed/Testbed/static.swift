import Foundation


public protocol SwaggerSerializeable {
    func serialize(format: String?) -> Any?
}

public protocol SwaggerDeserializeable {
    static func deserialize(json: Any?, format: String?) -> Self
}

public protocol SwaggerObject: SwaggerSerializeable, SwaggerDeserializeable {
    
}


extension Array: SwaggerObject {
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
            fatalError("Deserialization error: expected array but got \(json)")
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

extension Dictionary: SwaggerObject {
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
            fatalError("Deserialization error: expected dictionary but got \(json)")
        }
        return dictionary.mapValues { value in
            guard let deserializeable = Value.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Value.self)")
            }
            guard let deserializedValue = deserializeable.deserialize(json: value, format: format) as? Value else {
                fatalError("Deserialization error: expected \(Value.self) but got \(json)")
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

extension Date: SwaggerObject {
    public func serialize(format: String?) -> Any? {
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
        fatalError("Deserialization error: expected a Date but got \(json)")
    }
}

extension Optional: SwaggerObject {
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
    public static func deserialize(json: Any?, format: String?) -> Optional<Wrapped> {
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

protocol SwaggerSerializeablePrimitive: SwaggerObject {}
extension SwaggerSerializeablePrimitive {
    public func serialize(format: String?) -> Any? {
        return self
    }
    public static func deserialize(json: Any?, format: String?) -> Self {
        guard let deserialized = json as? Self else {
            fatalError("Deserialization error: Expected \(Self.self) but got \(json)")
        }
        return deserialized
    }
}
extension String: SwaggerSerializeablePrimitive {}
extension Int: SwaggerSerializeablePrimitive {}
extension Double: SwaggerSerializeablePrimitive {}
extension Bool: SwaggerSerializeablePrimitive {}


extension SwaggerSerializeable {
    public func toJson(format: String? = nil) -> Data {
        return try! JSONSerialization.data(withJSONObject: serialize(format: format) as Any, options: [.prettyPrinted])
    }
}
