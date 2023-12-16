import * as Decoder from 'io-ts/Decoder';
import { O, RA } from '../../modules/fp';
import * as md from '../../modules/markdown';
import * as dc from '../decoders';

// ----------------------------------------------------------------------------
// Suggested Link
// ----------------------------------------------------------------------------

export type SuggestedLink = {
  readonly name: string;
  readonly link: string;
  readonly message: O.Option<md.Paragraph>;
};

const suggestedLinkCodec = Decoder.intersect(
  Decoder.partial({
    message: dc.paragraphMarkdown,
  })
)(
  Decoder.struct({
    name: Decoder.string,
    link: Decoder.string,
  })
);

const finalizeSuggestedLink = (
  raw: Decoder.TypeOf<typeof suggestedLinkCodec>
): SuggestedLink => ({
  name: raw.name,
  link: raw.link,
  message: O.fromNullable(raw.message),
});

// ----------------------------------------------------------------------------
// Topic Info
// ----------------------------------------------------------------------------

export type TopicInfo = {
  readonly filepath: O.Option<string>;
  readonly suggestedLinks: ReadonlyArray<SuggestedLink>;
};

export const codec = Decoder.partial({
  filepath: Decoder.string,
  suggestedLinks: Decoder.array(suggestedLinkCodec),
});

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw): TopicInfo => ({
  filepath: O.fromNullable(raw.filepath),
  suggestedLinks: RA.map(finalizeSuggestedLink)(raw.suggestedLinks ?? []),
});
