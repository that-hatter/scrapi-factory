import * as A from 'fp-ts/Array';
import * as Decoder from 'io-ts/Decoder';
import { O, RA, RNEA, constant, pipe } from '../../modules/fp';
import * as dc from '../decoders';
import * as DescInfo from './DescInfo';

// ----------------------------------------------------------------------------
// Parameter
// ----------------------------------------------------------------------------

export type Parameter = {
  readonly name: string;
  readonly type: RNEA.ReadonlyNonEmptyArray<string>;
  readonly defaultValue: O.Option<string | bigint | boolean>;
  readonly required: boolean;
} & DescInfo.DescInfo;

const paramCodec = pipe(
  Decoder.partial({
    defaultValue: dc.expression,
    required: Decoder.boolean,
  }),
  Decoder.intersect(
    Decoder.struct({
      name: dc.bindingOrVariadic,
      type: dc.typenameArray,
    })
  ),
  Decoder.intersect(DescInfo.codec)
);

type RawParameter = Decoder.TypeOf<typeof paramCodec>;

const finalizeParam = (raw: RawParameter): Parameter => ({
  name: raw.name,
  type: raw.type,
  defaultValue: O.fromNullable(raw.defaultValue),
  required: raw.required !== false,
  ...DescInfo.finalize(raw),
});

const allOptionalParamsLast = (
  rs: Array<RawParameter>
): rs is Array<RawParameter> =>
  pipe(
    rs,
    A.dropLeftWhile((r) => r.required !== false),
    A.every((r) => r.required === false)
  );

const variadicParamLast = (
  rs: Array<RawParameter>
): rs is Array<RawParameter> =>
  pipe(
    A.init(rs),
    O.map(A.every((r) => r.name !== '...')),
    O.getOrElse(constant(true))
  );

const paramArrayCodec = pipe(
  Decoder.array(paramCodec),
  Decoder.refine(allOptionalParamsLast, 'all optional parameters are last'),
  Decoder.refine(variadicParamLast, 'variadic parameter is last'),
  dc.uniqName
);

// ----------------------------------------------------------------------------
// Return
// ----------------------------------------------------------------------------

export type Return = {
  readonly name: O.Option<string>;
  readonly type: RNEA.ReadonlyNonEmptyArray<string>;
  readonly guaranteed: boolean;
} & DescInfo.DescInfo;

const returnCodec = pipe(
  Decoder.partial({
    name: dc.bindingOrVariadic,
    guaranteed: Decoder.boolean,
  }),
  Decoder.intersect(Decoder.struct({ type: dc.typenameArray })),
  Decoder.intersect(DescInfo.codec)
);

type RawReturn = Decoder.TypeOf<typeof returnCodec>;

const finalizeReturn = (raw: RawReturn): Return => ({
  name: O.fromNullable(raw.name),
  type: raw.type,
  guaranteed: raw.guaranteed !== false,
  ...DescInfo.finalize(raw),
});

const allUnguaranteedReturnsLast = (
  rs: Array<RawReturn>
): rs is Array<RawReturn> =>
  pipe(
    rs,
    A.dropLeftWhile((r) => r.guaranteed !== false),
    A.every((r) => r.guaranteed === false)
  );

const variadicReturnLast = (rs: Array<RawReturn>): rs is Array<RawReturn> =>
  pipe(
    A.init(rs),
    O.map(A.every((r) => r.name !== '...')),
    O.getOrElse(constant(true))
  );

const returnArrayCodec = pipe(
  Decoder.array(returnCodec),
  Decoder.refine(
    allUnguaranteedReturnsLast,
    'all unguaranteed returns are last'
  ),
  Decoder.refine(variadicReturnLast, 'variadic return is last'),
  // can't use uniqByName because return name is optional
  dc.uniqBy<RawReturn>((x) => x.name ?? '', 'names')
);

// ----------------------------------------------------------------------------
// Signature Info
// ----------------------------------------------------------------------------

export type SignatureInfo = {
  readonly parameters: ReadonlyArray<Parameter>;
  readonly returns: ReadonlyArray<Return>;
  readonly overloads: ReadonlyArray<Overload>;
};

export type Overload = Omit<SignatureInfo, 'overloads'> & DescInfo.DescInfo;

export type Variant<T extends SignatureInfo> = T | Overload;

const baseSigCodec = Decoder.partial({
  parameters: paramArrayCodec,
  returns: returnArrayCodec,
});

const overloadCodec = Decoder.intersect(baseSigCodec)(DescInfo.codec);

export const codec = Decoder.intersect(baseSigCodec)(
  Decoder.partial({ overloads: Decoder.array(overloadCodec) })
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw): SignatureInfo => ({
  parameters: RA.map(finalizeParam)(raw.parameters ?? []),
  returns: RA.map(finalizeReturn)(raw.returns ?? []),
  overloads: pipe(
    raw.overloads ?? [],
    RA.map((rawOv) => ({ ...finalize(rawOv), ...DescInfo.finalize(rawOv) }))
  ),
});
