/**
 * English → ASL gloss.
 *
 * ASL is not word-for-word English. This applies the well-documented core
 * rules that make a signed rendering follow ASL rather than English order:
 *  - drop articles and "be"/auxiliary verbs (ASL has no signs for them in
 *    ordinary sentences: "Where is the hospital?" → WHERE HOSPITAL → HOSPITAL WHERE)
 *  - move WH-question words (WHERE, WHAT, WHO, WHEN, WHY, HOW) to the end
 *  - map pronouns (I/my → ME, you/your → YOU)
 *  - every word with a lexical sign in our vocabulary uses that sign;
 *    every other word is FINGERSPELLED letter by letter, which is exactly
 *    what ASL signers do for words without a known sign.
 * It is a rule-based gloss, not a full ASL grammar/translation model.
 */
import { WORD_TO_SIGN, type SignId } from "./signs";

export type GlossItem =
  | { kind: "sign"; sign: SignId; word: string; gloss: string }
  | { kind: "spell"; word: string; gloss: string };

const DROP = new Set([
  "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
  "to", "of", "do", "does", "did", "will", "shall", "please", "um", "uh",
]);

const WH = new Set(["where", "what", "who", "when", "why", "how", "which"]);

/** Short ASL sign glosses for common words beyond our 12 animated signs are
 * still fingerspelled — we never animate a sign we don't have. */

export function textToGloss(text: string): GlossItem[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/'s\b/g, "")
    .replace(/n't\b/g, " not")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !DROP.has(w));

  const whWords = words.filter((w) => WH.has(w));
  const rest = words.filter((w) => !WH.has(w));
  const ordered = rest.length > 0 && whWords.length > 0 ? [...rest, ...whWords] : words;

  return ordered.map((word): GlossItem => {
    const sign = WORD_TO_SIGN.get(word) ?? WORD_TO_SIGN.get(word.replace(/'/g, ""));
    if (sign) return { kind: "sign", sign, word, gloss: sign.replace("_", "-") };
    const clean = word.replace(/'/g, "");
    return { kind: "spell", word: clean, gloss: `fs-${clean.toUpperCase()}` };
  });
}
