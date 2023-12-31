## Parsing pipeline

These are the steps perfomed by the loader when parsing the yaml files.

1. Read all the `.yml` files from the supplied directory recursively.
   Subfolders do not matter and are only for developer organization.

2. Feed the yaml files into [`js-yaml`](https://github.com/nodeca/js-yaml).

   2.1. Check if the file is a properly formatted yaml file.

   2.2. Check if the top-level definition is a "mapping" (which translates to a JS object).

   2.3. Assign the yaml tag supplied at the top of the file as the JS object's `doctype` field.

   2.4. Check if the JS object has a recognized doctype (function, namespace, constant, enum, type, or tag).

   2.5. Assign the file path to the result's `filepath` field.

   2.5. If any of the files fail a check, stop the pipeline here, giving an error value that describes the invalid files.

   2.6. There's now an array of plain JS objects with a `doctype` and `filepath`.

3. Group all entries according to their `doctype`.

4. Decode each group using the "codecs" implemented in [`io-ts`](https://gcanti.github.io/io-ts/).
   These are fine-grained rules that each entry must follow, and are specific to each doctype.

   4.1. `io-ts` also narrows down the type as it checks each rule, going from plain JS objects into a stricter interface.

   4.2. Entries may also be transformed a bit while decoding, if needed.
   For example, the `name` of functions become `namespace + "." + name`,
   and markdown strings are parsed into markdown AST.

   4.3. If any of the entries or groups fail their respective codec, stop the pipeline here.
   Generate an error report that describes the invalid entries.

   4.4. All entries are now guaranteed to be correct and have a strict typing.

5. Finalize the entries, further transforming them to have better types and additional information.

   5.1. Some entries need a `SourceRecord` to get their source code link.
   This is generated by fetching the source files from the core and CardScripts repo,
   and parsing lua definitions in them.

Note that finalization did **NOT** need to be a separate step.
It could have been integrated in the codecs, like the transformations in `Step 4.2`.
However, it's pointless to finalize an entry when there's at least one other invalid file
that will cause the pipeline to fail anyway.
As such, only transformations that are _necessary for checking_ are included in `Step 4.2`.
