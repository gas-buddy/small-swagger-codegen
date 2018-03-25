import Foundation

public protocol SwaggerSerializeable {
    func shallowSerialize() -> Any
}

extension String: SwaggerSerializeable {
    public func shallowSerialize() -> Any {
        return self
    }
}
extension Int: SwaggerSerializeable {
    public func shallowSerialize() -> Any {
        return self
    }
}
extension Bool: SwaggerSerializeable {
    public func shallowSerialize() -> Any {
        return self
    }
}
extension Array: SwaggerSerializeable {
    public func shallowSerialize() -> Any {
        return self
    }
}
extension Date: SwaggerSerializeable {
    public func shallowSerialize() -> Any {
        return "HEY ITS ME UR DATE"
    }
}

extension SwaggerSerializeable {
    public func serialize() -> Any {
        let shallow = shallowSerialize()
        if let obj = shallow as? [String: Any] {
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
            
        } else if let str = shallow as? String {
            return str
        } else if let str = shallow as? Int {
            return str
        } else if let str = shallow as? Bool {
            return str

        } else {
            fatalError("Unable to serialize: \(shallow)")
        }
    }
    
    public func toJson() -> Data {
        return try! JSONSerialization.data(withJSONObject: serialize(), options: [.prettyPrinted])
    }
}
