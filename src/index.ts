import * as RTE from 'fp-ts/ReaderTaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import * as TE from 'fp-ts/TaskEither';
import * as API from './API';
import * as FS from './FileSystem';
import * as SourceRecord from './SourceRecord';
import { flow, pipe } from './modules/fp-ts-extended/function';
import * as BindingInfo from './shared/info/BindingInfo';
import './workaround';

// ----------------------------------------------------------------------------
// re-exports
// ----------------------------------------------------------------------------

export {
  API,
  APIGroup,
  ParseError as APIParseError,
  DocType,
  finalize as finalizeAPI,
  parseFiles,
  parseFilesAndFinalize,
  stringifyError as stringifyAPIError,
  Topic,
} from './API';

export type { Alias, BindingInfo, Status } from './shared/info/BindingInfo';

export type { DescInfo } from './shared/info/DescInfo';

export type {
  Overload,
  Parameter,
  Return,
  SignatureInfo,
  Variant,
} from './shared/info/SignatureInfo';

export type { SuggestedLink, TopicInfo } from './shared/info/TopicInfo';

export type { Constant } from './topics/Constant';

export type { Enum } from './topics/Enum';

export type { Function } from './topics/Function';

export type { Namespace } from './topics/Namespace';

export type { Tag } from './topics/Tag';

export { FUNCTION_TYPE_SYMBOL, TABLE_TYPE_SYMBOL } from './topics/Type';

export type {
  FunctionType,
  OtherType,
  TableType,
  TableTypeField,
  TableTypeMappedType,
  Type,
} from './topics/Type';

// ----------------------------------------------------------------------------
// loaders and options
// ----------------------------------------------------------------------------

export type SourceRecordOptions = SourceRecord.Options;

const DEFAULT_SOURCE_OPTIONS: SourceRecordOptions = {
  core: { owner: 'edo9300', repo: 'ygopro-core' },
  extended: { owner: 'ProjectIgnis', repo: 'CardScripts' },
};

export const loadSourceRecord = SourceRecord.load;

export const loadRawAPI = (dir: string) =>
  pipe(
    FS.getAllPaths(dir),
    TE.map(RA.map(FS.readFile)),
    TE.chainW(TE.sequenceArray),
    TE.map(RA.map(([c, path]) => [c, FS.relativePath(dir, path)] as const)),
    TE.chainEitherKW(API.parseFiles)
  );

export const loadAPI = flow(
  loadRawAPI,
  RTE.fromTaskEither,
  RTE.chainReaderKW(API.finalize)
);

export type YardOptions = {
  readonly directory: string;
} & SourceRecord.Options;

export const DEFAULT_OPTIONS: YardOptions = {
  directory: FS.joinPath([process.cwd(), 'api']),
  ...DEFAULT_SOURCE_OPTIONS,
};

export type Yard = {
  readonly api: API.API;
  readonly sourceRecord: BindingInfo.SourceRecord;
  readonly options: YardOptions;
};

export const loadYard = (
  options: YardOptions
): TE.TaskEither<API.ParseError, Yard> =>
  pipe(
    loadRawAPI(options.directory),
    TE.chainW((rawApi) =>
      pipe(
        options,
        loadSourceRecord,
        TE.map((sourceRecord) => ({
          api: API.finalize(rawApi)(sourceRecord),
          sourceRecord,
          options,
        }))
      )
    )
  );
