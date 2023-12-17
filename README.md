<h1 align="center">scrapi-factory</h1>
<p align="center">
  <img src="/assets/scrap-factory-artwork.jpg" />
</p>
<p align="center">
  <strong>Validator and loader package for scrapiyard</strong>
</p>

["Parses"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
scrapiyard documentation entries to ensure they are properly formatted to follow the specs.
Details about the parsing process are outlined [here](/docs/Parsing-Pipeline.md).

This [can be ran standalone](#validating-locally) by cloning the repository,
or [added as an `npm` dependency](#as-a-typescript-package) when writing documentation-related projects.

---

## Usage

### Validating locally

A dump script can be run locally to generate a JSON file with the validated entries, or an error file.
It only runs Steps 1 to 4 in the [parsing pipeline](/docs/Parsing-Pipeline.md).

- Clone the repos. Make sure they're in the same folder.

  - `git clone https://github.com/ProjectIgnis/scrapiyard`
  - `git clone https://github.com/that-hatter/scrapi-factory`

> **NOTE:** For now, it's important that they're in the same folder for factory to find the doc files.
> Later, there will be an option to specify the local directory or remote repo of scrapiyard.

- Navigate to factory: `cd scrapi-factory`
- Install dependencies: `npm i`
- Run the dump script: `npm run dump`
- Check the `/dump/` folder for the output (or error).

### As a Typescript Package

The parser package can be installed with npm.

```
npm i @that-hatter/scrapi-factory
```

It provides loader functions that return strictly-typed parsed outputs.
A utility module for working with markdown AST is also included.

The most relevant function is `loadYard`.
It is recommended to use [`fp-ts`](https://gcanti.github.io/fp-ts/) for the least amount of friction.
Parts of the library are also re-exported with conventional acronyms
and additional functions, under the `/fp` export.

```ts
import * as sf from '@that-hatter/scrapi-factory';
import { pipe, TE } from '@that-hatter/scrapi-factory/fp';

const program = pipe(
  sy.loadYard(sy.DEFAULT_OPTIONS),
  TE.map(({ api }) => {
    // ...
  })
);
```

There are also more granular functions that perform specific steps,
such as `loadAPI`, `loadRawAPI`, and `loadSourceRecord`.
See [`dump.ts`](/src/dump.ts) for an example usage.

If not using `fp-ts`, you will need to call the result returned by `loadYard` to get a `Promise`,
and manually check if the wrapped value is a `Right` (meaning successful) value.

```ts
import * as sf from '@that-hatter/scrapi-factory';
import { E } from '@that-hatter/scrapi-factory/fp';

const yard = await sf.loadYard(sy.DEFAULT_OPTIONS)();

if (E.isRight(yard)) {
  const { api } = yard.right;
  // ...
} else {
  throw yard.left;
}
```

You'll also need to handle `Option` types when they come up.
You can use `O.toNullable` to convert `O.Option<T>` into `T | null`.

```ts
import { O } from '@that-hatter/scrapi-factory/fp';

const fnDocSummary = O.toNullable(fnDocEntry.summary);
```
