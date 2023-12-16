import * as Decoder from 'io-ts/Decoder';
import { RA, RR, flow, pipe } from '../modules/fp';
import { DescInfo, TopicInfo, dc, inst } from '../shared';

export type Enum = {
  readonly doctype: 'enum';
  readonly name: string;
  readonly bitmaskInt: boolean;
  readonly tags: ReadonlyArray<string>;
} & DescInfo.DescInfo &
  TopicInfo.TopicInfo;

export const codec = pipe(
  Decoder.struct({
    doctype: Decoder.literal('enum'),
    name: dc.typename, // enum names follow the same rules as types
  }),
  Decoder.intersect(
    Decoder.partial({
      bitmaskInt: Decoder.boolean,
      tags: dc.tagNameArray,
    })
  ),
  Decoder.intersect(DescInfo.codec),
  Decoder.intersect(TopicInfo.codec)
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw) => ({
  doctype: raw.doctype,
  name: raw.name,
  bitmaskInt: raw.bitmaskInt === true,
  tags: raw.tags ?? [],
  ...DescInfo.finalize(raw),
  ...TopicInfo.finalize(raw),
});

export const arrayCodec = pipe(
  Decoder.record(codec),
  Decoder.map(RR.values),
  dc.uniqName
);

export const finalizeArray = flow(
  RA.map(finalize),
  RA.sort(inst.nameStringOrd)
);
