# small-swagger-codegen

[![wercker status](https://app.wercker.com/status/3da8a3d8992ce63c2db82c29f02a584b/s/master "wercker status")](https://app.wercker.com/project/byKey/3da8a3d8992ce63c2db82c29f02a584b)

A small version of swagger-codegen. Does fewer things with less code. Supports Swift, Kotlin, and Javascript (using fetch/EventSource).

Usage
=====
You can either pass parameters on the command line or a configuration file.

Command line example:
This will build a Javascript module named my-spec-js-client with a default export of MyApi using snake casing (as opposed to the default camel casing) for methods and parameters, and output to the default directory - `client` (which can be overridden with `--output=someotherdir`)
```
npx small-swagger-codegen --language=js --spec=./my-spec.json --name=MyApi --packageName=my-spec-js-client --snake
```

Configuration files can be useful when you want to generate a number of clients at the same time, such as in a native app.

```
{
  "language": "swift",
  "output": "./DevelopmentPods/Generated/",
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

Which, if saved in a file called `config.json` is run with
```
npx small-swagger-codegen ./config.json
```
