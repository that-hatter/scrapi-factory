import * as Decoder from 'io-ts/Decoder';
import { O, R, RA, RR, flow, pipe } from '../modules/fp';
import {
  BindingInfo,
  DescInfo,
  SignatureInfo,
  TopicInfo,
  dc,
  inst,
} from '../shared';

// avoid clashing with the standard js 'Function' type just for this file
type Function_ = {
  readonly doctype: 'function';
  readonly namespace: O.Option<string>;
  readonly partialName: string;
  readonly tags: ReadonlyArray<string>;
} & SignatureInfo.SignatureInfo &
  DescInfo.DescInfo &
  BindingInfo.BindingInfo &
  TopicInfo.TopicInfo;

export type Function = Function_;

export const codec = pipe(
  Decoder.struct({
    doctype: Decoder.literal('function'),
  }),
  Decoder.intersect(
    Decoder.partial({
      namespace: dc.binding,
      tags: dc.tagNameArray,
    })
  ),
  Decoder.intersect(SignatureInfo.codec),
  Decoder.intersect(DescInfo.codec),
  Decoder.intersect(BindingInfo.codec),
  Decoder.intersect(TopicInfo.codec),
  Decoder.map((r) => ({
    ...r,
    partialName: r.name,
    name: r.namespace ? r.namespace + '.' + r.name : r.name,
  }))
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw) =>
  flow(
    BindingInfo.finalize(raw),
    (bindingInfo): Function_ => ({
      doctype: raw.doctype,
      namespace: O.fromNullable(raw.namespace),
      partialName: raw.partialName,
      tags: raw.tags ?? [],
      ...SignatureInfo.finalize(raw),
      ...TopicInfo.finalize(raw),
      ...DescInfo.finalize(raw),
      ...bindingInfo,
    })
  );

export const arrayCodec = pipe(
  Decoder.record(codec),
  Decoder.map(RR.values),
  dc.uniqName
);

const createAlias =
  (fn: Function_) =>
  (alias: BindingInfo.Alias): Function_ => {
    const [namespace, partialName] = alias.name.split('.');
    return {
      ...fn,
      name: alias.name,
      namespace: partialName ? O.fromNullable(namespace) : O.none,
      partialName: partialName ?? alias.name,
      status: alias.status,
      aliasOf: O.some(fn.name),
      aliases: [],
    };
  };

export const finalizeArray = flow(
  RA.map(finalize),
  R.sequenceArray,
  R.map(BindingInfo.appendAllAliases(createAlias)),
  R.map(RA.sort(inst.nameStringOrd))
);
