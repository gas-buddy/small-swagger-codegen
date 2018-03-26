import Foundation


public protocol SwaggerSerializeable {
    func shallowSerialize() -> Any?
}

public protocol SwaggerDeserializeable {
    static func deserialize(json: Any) -> Self
}

public protocol SwaggerObject: SwaggerSerializeable, SwaggerDeserializeable {
    
}


extension Array: SwaggerObject {
    public func shallowSerialize() -> Any? {
        return self
    }
    public static func deserialize(json: Any) -> Array<Element> {
        guard let array = json as? [Any] else {
            fatalError("Deserialization error: expected array but got \(json)")
        }
        return array.map { element in
            guard let deserializeable = Element.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Element.self)")
            }
            guard let deserializedElement = deserializeable.deserialize(json: element) as? Element else {
                fatalError("Deserialization error: expected \(Element.self) but got \(element)")
            }
            return deserializedElement
        }
    }
}

extension Dictionary: SwaggerObject {
    public func shallowSerialize() -> Any? {
        return self
    }
    public static func deserialize(json: Any) -> Dictionary<Key, Value> {
        guard let dictionary = json as? [Key: Any] else {
            fatalError("Deserialization error: expected dictionary but got \(json)")
        }
        return dictionary.mapValues { value in
            guard let deserializeable = Value.self as? SwaggerDeserializeable.Type else {
                fatalError("Deserialization error: don't know how to deserialize \(Value.self)")
            }
            guard let deserializedValue = deserializeable.deserialize(json: value) as? Value else {
                fatalError("Deserialization error: expected \(Value.self) but got \(json)")
            }
            return deserializedValue
        }
    }
}

extension Date: SwaggerObject {
    public func shallowSerialize() -> Any? {
        return "HEY ITS ME UR DATE"
    }
    public static func deserialize(json: Any) -> Date {
        return Date() // O NO
    }
}

extension Optional: SwaggerObject {
    public func shallowSerialize() -> Any? {
        guard let value = self else {
            return self as Any
        }
        guard let serializeable = value as? SwaggerSerializeable,
            let serialized = serializeable.shallowSerialize() as? Wrapped else {
            fatalError("Serialization error: don't know how to serialize \(value)")
        }
        return Optional(serialized)
    }
    public static func deserialize(json: Any) -> Optional<Wrapped> {
        let optional = json as Optional<Any>
        guard let deserializeable = Wrapped.self as? SwaggerDeserializeable.Type else {
            fatalError("Deserialization error: don't know how to deserialize \(Wrapped.self)")
        }
        guard let unwrapped = optional, let deserializedValue = deserializeable.deserialize(json: unwrapped) as? Wrapped else {
            fatalError("Deserialization error: expected \(Wrapped.self) but got \(json)")
        }
        return deserializedValue
    }
}

protocol SwaggerSerializeablePrimitive: SwaggerObject {}
extension SwaggerSerializeablePrimitive {
    public func shallowSerialize() -> Any? {
        return self
    }
    public static func deserialize(json: Any) -> Self {
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

func isOptional(_ instance: Any) -> Bool {
    let mirror = Mirror(reflecting: instance)
    let style = mirror.displayStyle
    return style == .optional
}
extension SwaggerSerializeable {
    public func serialize() -> Any? {
        guard let shallow = shallowSerialize() else {
            return nil
        }
        
        if let primitive = shallow as? SwaggerSerializeablePrimitive {
            return primitive.shallowSerialize()
            
        } else if let obj = shallow as? [String: Any?] {
            return obj.mapValues { value -> Any in
                let serializeable = value as SwaggerSerializeable
                return serializeable.serialize() as Any
            }
            
        } else if let arr = shallow as? [Any] {
            return arr.map { element -> Any in
                guard let serializeable = element as? SwaggerSerializeable else {
                    fatalError("Unable to serialize array element: \(element)")
                }
                return serializeable.serialize() as Any
            }
            
        } else {
            fatalError("Unable to serialize: \(shallow)")
        }
    }
    
    public func toJson() -> Data {
        return try! JSONSerialization.data(withJSONObject: serialize() as Any, options: [.prettyPrinted])
    }
}
