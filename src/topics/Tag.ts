import * as Decoder from 'io-ts/Decoder';
import { RA, RR, flow, pipe } from '../modules/fp';
import { DescInfo, TopicInfo, dc, inst } from '../shared';

export type Tag = {
  readonly doctype: 'tag';
  readonly name: string;
} & DescInfo.DescInfo &
  TopicInfo.TopicInfo;

const codec = pipe(
  Decoder.struct({
    doctype: Decoder.literal('tag'),
    name: Decoder.string,
  }),
  Decoder.intersect(DescInfo.codec),
  Decoder.intersect(TopicInfo.codec)
);

export type Raw = Decoder.TypeOf<typeof codec>;

const finalize = (raw: Raw): Tag => ({
  doctype: raw.doctype,
  name: raw.name,
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
