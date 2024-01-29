import * as sf from '.';
import { joinPath, mkdir, writeFile } from './FileSystem';
import { E, TE, flow, pipe } from './modules/fp';

const stringifyJSON = (val: unknown) => JSON.stringify(val, null, 2);

const getDumpPath = (subdir: string) => joinPath(['.', 'dump', subdir]);

const dumpFile = flow(getDumpPath, writeFile);

const program = pipe(
  mkdir(joinPath(['.', 'dump'])),
  TE.chain(() => sf.loadRawAPI(sf.DEFAULT_OPTIONS.directory)),
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
