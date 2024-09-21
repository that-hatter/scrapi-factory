import * as Decoder from 'io-ts/Decoder';
import { O, RA, RNEA, RR, constant, flow, pipe } from '../modules/fp';
import { DescInfo, SignatureInfo, TopicInfo, dc, inst } from '../shared';

// ----------------------------------------------------------------------------
// Common
// ----------------------------------------------------------------------------

type TypeCommonInfo = {
  readonly doctype: 'type';
  readonly name: string;
  readonly tags: ReadonlyArray<string>;
} & DescInfo.DescInfo &
  TopicInfo.TopicInfo;

const commonInfoCodec = pipe(
  Decoder.struct({
    doctype: Decoder.literal('type'),
    name: dc.typename,
  }),
  Decoder.intersect(Decoder.partial({ tags: dc.tagNameArray })),
  Decoder.intersect(DescInfo.codec),
  Decoder.intersect(TopicInfo.codec)
);

const finalizeCommonInfo = (
  raw: Decoder.TypeOf<typeof commonInfoCodec>
): TypeCommonInfo => ({
  doctype: raw.doctype,
  name: raw.name,
  tags: raw.tags ?? [],
  ...DescInfo.finalize(raw),
  ...TopicInfo.finalize(raw),
});

// ----------------------------------------------------------------------------
// Function Type
// ----------------------------------------------------------------------------

// use a symbol so the type can be narrowed against string
export const FUNCTION_TYPE_SYMBOL = Symbol('functionType');

type FunctionTypeInfo = {
  supertype: typeof FUNCTION_TYPE_SYMBOL;
} & SignatureInfo.SignatureInfo;

export type FunctionType = TypeCommonInfo & FunctionTypeInfo;

const functionTypeCodec = pipe(
  Decoder.struct({
    supertype: pipe(
      Decoder.literal('function'),
      Decoder.map(constant(FUNCTION_TYPE_SYMBOL))
    ),
  }),
  Decoder.intersect(SignatureInfo.codec)
);

const finalizeFunctionTypeInfo = (
  raw: Decoder.TypeOf<typeof functionTypeCodec>
): FunctionTypeInfo => ({
  supertype: FUNCTION_TYPE_SYMBOL,
  ...SignatureInfo.finalize(raw),
});

// ----------------------------------------------------------------------------
// Table Type
// ----------------------------------------------------------------------------

// use a symbol so the type can be narrowed against string
export const TABLE_TYPE_SYMBOL = Symbol('tableType');

export type TableTypeField = {
  readonly name: string | bigint | boolean;
  readonly valueType: RNEA.ReadonlyNonEmptyArray<string>;
} & DescInfo.DescInfo;

export type TableTypeMappedType = {
  readonly keyType: string;
  readonly valueType: RNEA.ReadonlyNonEmptyArray<string>;
} & DescInfo.DescInfo;

type TableTypeInfo = {
  readonly supertype: typeof TABLE_TYPE_SYMBOL;
  readonly fields: ReadonlyArray<TableTypeField>;
  readonly mappedTypes: ReadonlyArray<TableTypeMappedType>;
};

export type TableType = TypeCommonInfo & TableTypeInfo;

const tableFieldCodec = pipe(
  Decoder.struct({
    name: dc.expression,
    valueType: dc.typenameArray,
  }),
  Decoder.intersect(DescInfo.codec)
);

const tableMappedTypeCodec = pipe(
  Decoder.struct({
    keyType: dc.typename,
    valueType: dc.typenameArray,
  }),
  Decoder.intersect(DescInfo.codec)
);

const tableTypeCodec = pipe(
  Decoder.struct({
    supertype: pipe(
      Decoder.literal('table'),
      Decoder.map(constant(TABLE_TYPE_SYMBOL))
    ),
  }),
  Decoder.intersect(
    Decoder.partial({
      fields: pipe(
        Decoder.array(tableFieldCodec),
        dc.uniqBy<{ name: boolean | bigint | string }>(
          (x) => String(x.name),
          'names'
        )
      ),
      mappedTypes: pipe(
        Decoder.array(tableMappedTypeCodec),
        dc.uniqBy<{ keyType: string }>((x) => x.keyType, 'key types')
      ),
    })
  )
);

const finalizeTableTypeInfo = (
  raw: Decoder.TypeOf<typeof tableTypeCodec>
): TableTypeInfo => ({
  supertype: TABLE_TYPE_SYMBOL,
  fields: pipe(
    raw.fields ?? [],
    RA.map((r) => ({ ...r, ...DescInfo.finalize(r) }))
  ),
  mappedTypes: pipe(
    raw.mappedTypes ?? [],
    RA.map((r) => ({ ...r, ...DescInfo.finalize(r) }))
  ),
});

// ----------------------------------------------------------------------------
// Other Type
// ----------------------------------------------------------------------------

type OtherTypeInfo = { readonly supertype: O.Option<string> };

export type OtherType = TypeCommonInfo & OtherTypeInfo;

const otherTypeInfoCodec = Decoder.partial({
  supertype: pipe(
    dc.typename,
    Decoder.refine(
      (t): t is string => t !== 'function' && t !== 'table',
      'non-table and non-function'
    )
  ),
});

const finalizeOtherTypeInfo = (
  raw: Decoder.TypeOf<typeof otherTypeInfoCodec>
): OtherTypeInfo => ({ supertype: O.fromNullable(raw.supertype) });

// ----------------------------------------------------------------------------
// Type
// ----------------------------------------------------------------------------

export type Type = FunctionType | TableType | OtherType;

export const codec = pipe(
  Decoder.union(functionTypeCodec, tableTypeCodec, otherTypeInfoCodec),
  Decoder.intersect(commonInfoCodec)
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw): Type => {
  const common = finalizeCommonInfo(raw);
  if (raw.supertype === FUNCTION_TYPE_SYMBOL)
    return { ...common, ...finalizeFunctionTypeInfo(raw) };
  if (raw.supertype === TABLE_TYPE_SYMBOL)
    return { ...common, ...finalizeTableTypeInfo(raw) };
  return { ...common, ...finalizeOtherTypeInfo(raw) };
};

export const arrayCodec = pipe(
  Decoder.record(codec),
  Decoder.map(RR.values),
  dc.uniqName
);

export const finalizeArray = flow(
  RA.map(finalize),
  RA.sort(inst.nameStringOrd)
);
