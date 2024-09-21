import * as NEA from 'fp-ts/NonEmptyArray';
import * as Decoder from 'io-ts/Decoder';
import { E, O, RA, RNEA, RR, identity, pipe } from '../modules/fp';
import * as md from '../modules/markdown';

export const uniqBy =
  <T>(valFn: (x: T) => string, id: string) =>
  <I, A extends ReadonlyArray<T>>(dc: Decoder.Decoder<I, A>) =>
    Decoder.parse((xs: A) => {
      return pipe(
        RNEA.fromArray([...xs]),
        O.map(RNEA.groupBy(valFn)),
        O.map(RR.values),
        // treat empty strings as non-equal to support optionals
        O.map(RA.filter((a) => a.length > 1 && valFn(a[0]) !== '')),
        O.chain(RNEA.fromReadonlyArray),
        O.map(RNEA.map(RNEA.map(valFn))),
        O.map((a) => Decoder.failure(a, 'unique ' + id)),
        O.getOrElseW(() => Decoder.success(xs))
      );
    })(dc);

export const uniqName = uniqBy(
  ({ name }: { name: string }) => name,
  'unique names'
);

export const uniqStrict = uniqBy<string>(identity, '');

export const nonemptyArray = <B>(dc: Decoder.Decoder<unknown, B>) =>
  pipe(
    Decoder.array(dc),
    Decoder.refine(
      (xs): xs is NEA.NonEmptyArray<B> => xs.length > 0,
      'nonempty'
    )
  );

const keywordLookup = pipe(
  [
    'and',
    'break',
    'do',
    'else',
    'elseif',
    'end',
    'false',
    'for',
    'function',
    'if',
    'in',
    'local',
    'nil',
    'not',
    'or',
    'repeat',
    'return',
    'then',
    'true',
    'until',
    'while',
  ],
  RA.toRecord(identity)
);

export const nonKeyword = Decoder.fromRefinement(
  (str: string): str is string => pipe(keywordLookup, RR.lookup(str), O.isNone),
  'non-keyword'
);

export const expression = pipe(
  Decoder.union(
    Decoder.boolean,
    pipe(
      Decoder.number,
      Decoder.parse((n) =>
        E.tryCatch(
          () => BigInt(n),
          () => Decoder.error(n, 'integer')
        )
      )
    ),
    Decoder.literal('nil'),
    pipe(
      Decoder.string,
      Decoder.compose(nonKeyword),
      Decoder.map((str) => {
        const int = O.tryCatch(() => BigInt(str));
        if (O.isSome(int)) return int.value;
        if (str === 'true') return true;
        if (str === 'false') return false;
        return str;
      })
    )
  )
);

export const regex = (rgx: RegExp, expected: string) =>
  Decoder.fromRefinement(
    (str: string): str is string => rgx.test(str),
    expected
  );

export const binding = Decoder.union(
  pipe(
    Decoder.string,
    Decoder.compose(regex(/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/, 'lua binding')),
    Decoder.compose(nonKeyword)
  ),
  Decoder.literal('(Global)')
);

export const bindingOrVariadic = Decoder.union(Decoder.literal('...'), binding);

export const typename = Decoder.union(
  Decoder.literal('function'),
  Decoder.literal('nil'),
  pipe(
    Decoder.string,
    Decoder.compose(regex(/^[A-Za-z_]\w*$/, '')),
    Decoder.compose(nonKeyword)
  )
);

export const typenameArray = pipe(nonemptyArray(typename), uniqStrict);

export const tagName = Decoder.string;

export const tagNameArray = pipe(Decoder.array(tagName), uniqStrict);

export const paragraphMarkdown = pipe(
  Decoder.string,
  Decoder.map(md.parseParagraph),
  Decoder.refine(O.isSome, 'a markdown paragraph'),
  Decoder.map(({ value }) => value)
);

export const maxChar = (max: number) =>
  pipe(
    Decoder.string,
    Decoder.refine(
      (str): str is string => str.length <= max,
      `${max} or fewer characters`
    )
  );
