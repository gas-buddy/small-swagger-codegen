# small-swagger-codegen

![Node CI](https://github.com/gas-buddy/small-swagger-codegen/workflows/Node%20CI/badge.svg)

A small version of swagger-codegen. Does fewer things with less code. Supports Swift, Kotlin, and Javascript (using fetch/EventSource).

## Installation

```bash
# Global installation
npm install -g small-swagger-codegen

# Local installation
npm install --save-dev small-swagger-codegen
```

## Usage

You can use small-swagger-codegen in two ways:

1. **Command line arguments**: Pass parameters directly via command line
2. **Configuration file**: Use a JSON configuration file to define one or more APIs

### Command Line Usage

```bash
# Using npx
npx small-swagger-codegen --language=<language> --spec=<path-to-spec> --name=<api-name> [options]

# If installed globally
small-swagger-codegen --language=<language> --spec=<path-to-spec> --name=<api-name> [options]
```

#### Required Parameters

- `--language`: The target language (`js`, `swift`, or `kotlin`)
- `--spec`: Path to the OpenAPI/Swagger specification file (JSON or YAML)
- `--name`: Name of the API (used for class naming)

#### Optional Parameters

- `--output`: Output directory (default: `client`)
- `--className`: Class name for the API (defaults to the value of `--name`)
- `--packageName`: Name of the package/module
- `--basePath`: Base path for API endpoints
- `--snake`: Use snake_case for method and parameter names (default is camelCase)
- `--exclude`: File(s) to exclude from generation

#### Example

```bash
npx small-swagger-codegen --language=js --spec=./my-spec.json --name=MyApi --packageName=my-spec-js-client --snake
```

This will generate a Javascript module named `my-spec-js-client` with a default export of `MyApi` using snake_case for methods and parameters.

### Configuration File Usage

For more complex scenarios, you can define a configuration file:

```bash
npx small-swagger-codegen ./config.json
```

#### Configuration File Format

```json
{
  "language": "swift",
  "output": "./DevelopmentPods/Generated/",
  "exclude": ["unwanted-file.swift"],
  "opts": {
    "additionalOption": "value"
  },
  "specs": {
    "ApiOne": {
      "spec": "./node_modules/api-one-spec/api-one-spec.json",
      "className": "ApiOneAPI",
      "basePath": "api1"
    },
    "OtherApi": {
      "spec": "./node_modules/other-api-spec/other-api-spec.json",
      "className": "OtherAPI",
      "basePath": "other"
    }
  }
}
```

#### Configuration Properties

- `language`: Target language (`js`, `swift`, or `kotlin`)
- `output`: Output directory for generated code
- `exclude`: Array of filenames to exclude from generation
- `opts`: Additional options passed to the generator
- `specs`: Object containing API specifications
  - Each key is a unique name for the API
  - Each value is an object with:
    - `spec`: Path to the OpenAPI/Swagger specification file
    - `className`: Class name for the API (optional, defaults to the key)
    - `basePath`: Base path for API endpoints (optional)

## Supported Languages

- **JavaScript**: Generates client using fetch/EventSource
- **Swift**: Generates Swift client for iOS applications
- **Kotlin**: Generates Kotlin client for Android applications

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Generate client from config file
npm run gen ./config.json
```

## License

MIT