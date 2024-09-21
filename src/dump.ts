#!/usr/bin/env node

import * as sf from '.';
import { joinPath, mkdir, writeFile } from './FileSystem';
import { E, O, RA, RNEA, TE, flow, pipe, string } from './modules/fp';

const stringifyJSON = (val: unknown) => JSON.stringify(val, null, 2);

const getDumpPath = (subdir: string) => joinPath(['.', 'dump', subdir]);

const dumpFile = flow(getDumpPath, writeFile);

const program = (dir: string) =>
  pipe(
    mkdir(joinPath(['.', 'dump'])),
    TE.chain(() => sf.loadRawAPI(dir)),
    TE.map(stringifyJSON),
    TE.tap(dumpFile('api.json')),
    TE.mapError(sf.stringifyAPIError),
    TE.tapError(dumpFile('error.txt'))
  );

// ----------------------------------------------------------------------------
// imperative shell
// ----------------------------------------------------------------------------

/* eslint-disable functional/no-conditional-statements */
/* eslint-disable functional/no-expression-statements */

const args = process.argv.slice(2);
const dir = pipe(
  args,
  RA.findFirst((s) => s.startsWith('--api-path=')),
  O.map(string.split('=')),
  O.map(RNEA.tail),
  O.map(string.intercalate('=')),
  O.getOrElse(() => sf.DEFAULT_OPTIONS.directory)
);

void program(dir)().then((res) => {
  if (E.isRight(res)) {
    console.log('Parsing successful. Check the output in the dump/ folder.');
    process.exit(0);
  } else {
    if (args.includes('--printErr')) {
      console.error(res.left);
    } else {
      console.error('Error encountered. Check details in the dump/ folder.');
    }
    process.exit(1);
  }
});
