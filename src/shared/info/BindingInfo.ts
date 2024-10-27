import * as Decoder from 'io-ts/Decoder';
import { O, RA, RR, pipe } from '../../modules/fp';
import * as md from '../../modules/markdown';
import * as dc from '../decoders';

// ----------------------------------------------------------------------------
// Status
// ----------------------------------------------------------------------------

export type Status = {
  readonly index: 'stable' | 'unstable' | 'deprecated' | 'deleted';
  readonly since: O.Option<string>;
  readonly message: O.Option<md.Paragraph>;
};

const statusIndexCodec = Decoder.union(
  Decoder.literal('stable'),
  Decoder.literal('unstable'),
  Decoder.literal('deprecated'),
  Decoder.literal('deleted')
);

const statusCodec = pipe(
  Decoder.struct({ index: statusIndexCodec }),
  Decoder.intersect(
    Decoder.partial({
      since: Decoder.string,
      message: pipe(dc.maxChar(80), Decoder.compose(dc.paragraphMarkdown)),
    })
  )
);

const finalizeStatus = (raw: Decoder.TypeOf<typeof statusCodec>): Status => ({
  index: raw.index,
  since: O.fromNullable(raw.since),
  message: O.fromNullable(raw.message),
});

// ----------------------------------------------------------------------------
// Alias
// ----------------------------------------------------------------------------

export type Alias = {
  readonly name: string;
  readonly status: Status;
};

const aliasCodec = Decoder.struct({
  name: dc.binding,
  status: statusCodec,
});

const aliasArrayCodec = pipe(Decoder.array(aliasCodec), dc.uniqName);

const finalizeAlias = (raw: Decoder.TypeOf<typeof aliasCodec>): Alias => ({
  name: raw.name,
  status: finalizeStatus(raw.status),
});

// ----------------------------------------------------------------------------
// BindingInfo
// ----------------------------------------------------------------------------

export type BindingInfo = {
  readonly name: string;
  readonly status: Status;
  readonly aliases: ReadonlyArray<Alias>;
  readonly aliasOf: O.Option<string>;
  readonly source: O.Option<string>;
};

export type SourceRecord = RR.ReadonlyRecord<string, string>;

export const codec = pipe(
  Decoder.struct({ name: dc.binding, status: statusCodec }),
  Decoder.intersect(Decoder.partial({ aliases: aliasArrayCodec }))
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize =
  (raw: Raw) =>
  (sr: SourceRecord): BindingInfo => {
    const aliases = RA.map(finalizeAlias)(raw.aliases ?? []);
    const status = finalizeStatus(raw.status);
    const source = pipe(
      [raw, ...aliases],
      RA.findFirstMap(({ name }) =>
        pipe(
          O.fromNullable(sr[name]),
          // special case: https://github.com/ProjectIgnis/scrapiyard/blob/master/api/namespaces/Auxiliary.yml#L2
          // can be made non-hardcoded later by resolving namespace aliases,
          // but this function would need access to all the raw namespaces
          O.orElse(() => O.fromNullable(sr[name.replace('aux.', 'Auxiliary.')]))
        )
      )
    );
    return { name: raw.name, status, aliases, aliasOf: O.none, source };
  };

export const appendAllAliases =
  <T extends BindingInfo>(aliasFn: (main: T) => (alias: Alias) => T) =>
  (xs: ReadonlyArray<T>): ReadonlyArray<T> =>
    [...xs, ...RA.chain((main: T) => RA.map(aliasFn(main))(main.aliases))(xs)];
