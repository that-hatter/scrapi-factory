import * as sf from '.';
import { joinPath, mkdir, writeFile } from './FileSystem';
import { E, TE, flow, pipe } from './modules/fp';

const stringify = (val: unknown) =>
  typeof val === 'string' ? val : JSON.stringify(val, null, 2);

const getDumpPath = (subdir: string) =>
  joinPath(['.', 'dump', subdir + '.json']);

const dumpJSON = flow(getDumpPath, writeFile);

const program = pipe(
  mkdir(joinPath(['.', 'dump'])),
  TE.chain(() => sf.loadRawAPI(sf.DEFAULT_OPTIONS.directory)),
  TE.bimap(stringify, stringify),
  TE.tap(dumpJSON('api')),
  TE.tapError(dumpJSON('error'))
);

// ----------------------------------------------------------------------------
// imperative shell
// ----------------------------------------------------------------------------

/* eslint-disable functional/no-conditional-statements */
/* eslint-disable functional/no-expression-statements */

void program().then((res) => {
  if (E.isRight(res)) {
    console.log('Parsing successful. Check the output in the dump/ folder.');
    process.exit(0);
  } else {
    if (process.argv.slice(2).includes('--printErr')) {
      console.error(res.left);
    } else {
      console.error('Error encountered. Check details in the dump/ folder.');
    }
    process.exit(1);
  }
});
