import * as Decoder from 'io-ts/Decoder';
import { O, R, RA, RR, flow, pipe } from '../modules/fp';
import { BindingInfo, DescInfo, TopicInfo, dc, inst } from '../shared';

export type Namespace = {
  readonly doctype: 'namespace';
  readonly tags: ReadonlyArray<string>;
} & DescInfo.DescInfo &
  BindingInfo.BindingInfo &
  TopicInfo.TopicInfo;

export const codec = pipe(
  Decoder.struct({ doctype: Decoder.literal('namespace') }),
  Decoder.intersect(Decoder.partial({ tags: dc.tagNameArray })),
  Decoder.intersect(DescInfo.codec),
  Decoder.intersect(BindingInfo.codec),
  Decoder.intersect(TopicInfo.codec)
);

type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw) =>
  flow(
    BindingInfo.finalize(raw),
    (bindingInfo): Namespace => ({
      doctype: raw.doctype,
      tags: raw.tags ?? [],
      ...DescInfo.finalize(raw),
      ...bindingInfo,
      ...TopicInfo.finalize(raw),
    })
  );

export const arrayCodec = pipe(
  Decoder.record(codec),
  Decoder.map(RR.values),
  dc.uniqName
);

const createAlias =
  (ns: Namespace) =>
  (alias: BindingInfo.Alias): Namespace => ({
    ...ns,
    name: alias.name,
    status: alias.status,
    aliasOf: O.some(ns.name),
    aliases: [],
  });

export const finalizeArray = flow(
  RA.map(finalize),
  R.sequenceArray,
  R.map(BindingInfo.appendAllAliases(createAlias)),
  R.map(RA.sort(inst.nameStringOrd))
);
