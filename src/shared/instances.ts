import { Eq, Ord, string } from '../modules/fp';

export const nameStringOrd = Ord.contramap(
  ({ name }: { name: string }) => name
)(string.Ord);

export const nameStringEq = Eq.contramap(({ name }: { name: string }) => name)(
  string.Eq
);
