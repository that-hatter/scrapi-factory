import * as Decoder from 'io-ts/Decoder';
import { O, pipe } from '../../modules/fp';
import * as md from '../../modules/markdown';
import * as dc from '../decoders';

export type DescInfo = {
  readonly description: md.Paragraph;
  readonly summary: O.Option<md.Paragraph>;
  readonly guide: O.Option<md.Root>;
};

export const codec = pipe(
  Decoder.struct({ description: dc.paragraphMarkdown }),
  Decoder.intersect(
    Decoder.partial({
      summary: pipe(dc.maxChar(80), Decoder.compose(dc.paragraphMarkdown)),
      guide: Decoder.string,
    })
  )
);

export type Raw = Decoder.TypeOf<typeof codec>;

export const finalize = (raw: Raw): DescInfo => ({
  description: raw.description,
  summary: O.fromNullable(raw.summary),
  guide: pipe(raw.guide, O.fromNullable, O.map(md.parse)),
});
