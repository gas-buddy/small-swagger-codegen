import Foundation


public protocol SwaggerSerializeable {
    func shallowSerialize() -> Any
}

public protocol SwaggerDeserializeable {
    static func deserialize(json: Any) -> Self
}

public protocol SwaggerObject: SwaggerSerializeable, SwaggerDeserializeable {
    
}


extension Array: SwaggerObject {
    public func shallowSerialize() -> Any {
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
    public func shallowSerialize() -> Any {
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
    public func shallowSerialize() -> Any {
        return "HEY ITS ME UR DATE"
    }
    public static func deserialize(json: Any) -> Date {
        return Date() // O NO
    }
}

protocol SwaggerSerializeablePrimitive: SwaggerObject {}
extension SwaggerSerializeablePrimitive {
    public func shallowSerialize() -> Any {
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

extension SwaggerSerializeable {
    public func serialize() -> Any {
        let shallow = shallowSerialize()
        
        if let primitive = shallow as? SwaggerSerializeablePrimitive {
            return primitive.shallowSerialize()
            
        } else if let obj = shallow as? [String: Any] {
            return obj.mapValues { value -> Any in
                guard let serializeable = value as? SwaggerSerializeable else {
                    fatalError("Unable to serialize object property: \(value)")
                }
                return serializeable.serialize()
            }
            
        } else if let arr = shallow as? [Any] {
            return arr.map { element -> Any in
                guard let serializeable = element as? SwaggerSerializeable else {
                    fatalError("Unable to serialize array element: \(element)")
                }
                return serializeable.serialize()
            }
            
        } else {
            fatalError("Unable to serialize: \(shallow)")
        }
    }
    
    public func toJson() -> Data {
        return try! JSONSerialization.data(withJSONObject: serialize(), options: [.prettyPrinted])
    }
}
