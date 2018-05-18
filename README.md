# small-swagger-codegen
A small version of swagger-codegen. Does fewer things with less code.

## How To Do
- Clone this repo into the same folder that [`gasbuddy-ios`](https://github.com/gas-buddy/gasbuddy-ios) is in.
- In this folder, run:
```
npm install
npm run gen
```
- That's it.

If you want to update a swagger spec, do this (replacing `payment-api-spec` with the spec you want to update):
```
npm install --save @gasbuddy/payment-api-spec@latest
```

## The future
Things I would like to improve, in the order that I'm probably going to address them:
- This repo should not include our specs or codegen config, those belong in `gasbuddy-ios`. There should be a way to pass in the specs and config.
- There should be some tests.
- This repo should not be public once the above issues are addressed.
