/**
 * SignBridge AI — sign vocabulary.
 *
 * HONEST SCOPE: recognition is a geometric rule classifier running on
 * MediaPipe hand landmarks (21 points per hand). It is NOT a trained neural
 * sign-language model, and the handshapes below are simplified,
 * ASL-inspired approximations designed to be reliably distinguishable by a
 * webcam. Only these 12 signs are supported; everything else is reported as
 * unsupported.
 */

export type SignId =
  | "HELLO"
  | "THANK_YOU"
  | "YES"
  | "NO"
  | "HELP"
  | "STOP"
  | "WATER"
  | "FOOD"
  | "HOSPITAL"
  | "WHERE"
  | "YOU"
  | "ME";

export interface SignDefinition {
  id: SignId;
  label: string;
  /** How the user should perform it for this classifier. */
  howTo: string;
  /** Words in spoken text that map to this sign. */
  synonyms: string[];
  hands: 1 | 2;
  emoji: string;
}

export const SIGNS: SignDefinition[] = [
  {
    id: "HELLO",
    label: "Hello",
    howTo: "Open hand, all five fingers extended, raised near head height, waving side to side.",
    synonyms: ["hello", "hi", "hey", "greetings"],
    hands: 1,
    emoji: "👋",
  },
  {
    id: "THANK_YOU",
    label: "Thank you",
    howTo: "Flat hand, fingers together, held near the chin and moved forward/down.",
    synonyms: ["thanks", "thank", "thankyou", "grateful"],
    hands: 1,
    emoji: "🙏",
  },
  {
    id: "YES",
    label: "Yes",
    howTo: "Closed fist held steady in front of you, nodding slightly up and down.",
    synonyms: ["yes", "yeah", "yep", "correct", "agree", "ok", "okay"],
    hands: 1,
    emoji: "✊",
  },
  {
    id: "NO",
    label: "No",
    howTo: "Index and middle finger extended and held close together, tapping toward the thumb.",
    synonyms: ["no", "nope", "not", "negative", "disagree"],
    hands: 1,
    emoji: "✌️",
  },
  {
    id: "HELP",
    label: "Help",
    howTo: "Two hands: one closed fist resting above the other open flat palm.",
    synonyms: ["help", "assist", "assistance", "support"],
    hands: 2,
    emoji: "🤝",
  },
  {
    id: "STOP",
    label: "Stop",
    howTo: "Flat vertical hand, fingers up and together, palm facing the camera, held still.",
    synonyms: ["stop", "wait", "halt", "pause"],
    hands: 1,
    emoji: "✋",
  },
  {
    id: "WATER",
    label: "Water",
    howTo: "Index, middle and ring fingers extended (W shape) held near the chin.",
    synonyms: ["water", "drink", "thirsty"],
    hands: 1,
    emoji: "💧",
  },
  {
    id: "FOOD",
    label: "Food",
    howTo: "All fingertips pinched together, moved toward the mouth.",
    synonyms: ["food", "eat", "hungry", "meal"],
    hands: 1,
    emoji: "🍽️",
  },
  {
    id: "HOSPITAL",
    label: "Hospital",
    howTo: "Index and middle finger extended in a V, drawing a small cross in the air.",
    synonyms: ["hospital", "doctor", "clinic", "medical", "emergency"],
    hands: 1,
    emoji: "🏥",
  },
  {
    id: "WHERE",
    label: "Where",
    howTo: "Index finger up, shaken quickly side to side.",
    synonyms: ["where", "location", "place"],
    hands: 1,
    emoji: "❓",
  },
  {
    id: "YOU",
    label: "You",
    howTo: "Index finger pointing forward at the camera, held steady.",
    synonyms: ["you", "your"],
    hands: 1,
    emoji: "👉",
  },
  {
    id: "ME",
    label: "Me",
    howTo: "Index finger pointing down toward your own chest, held steady.",
    synonyms: ["me", "i", "my", "mine", "myself"],
    hands: 1,
    emoji: "🙋",
  },
];

export const SIGN_BY_ID: Record<SignId, SignDefinition> = Object.fromEntries(
  SIGNS.map((s) => [s.id, s]),
) as Record<SignId, SignDefinition>;

export const WORD_TO_SIGN = new Map<string, SignId>();
for (const sign of SIGNS) {
  for (const word of sign.synonyms) WORD_TO_SIGN.set(word, sign.id);
}

export interface MappedToken {
  word: string;
  sign: SignId | null;
}

/** Map a spoken/typed sentence onto supported signs. Unsupported words stay null. */
export function mapTextToSigns(text: string): MappedToken[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, sign: WORD_TO_SIGN.get(word) ?? null }));
}

/** Turn a recognized sign sequence into a readable sentence. */
export function signsToSentence(sequence: SignId[]): string {
  if (sequence.length === 0) return "";
  const words = sequence.map((id) => {
    switch (id) {
      case "THANK_YOU":
        return "thank you";
      case "ME":
        return "I";
      default:
        return SIGN_BY_ID[id].label.toLowerCase();
    }
  });

  let sentence = words.join(" ");
  // Light grammar smoothing for the common patterns in this vocabulary.
  sentence = sentence
    .replace(/^where water$/, "where is water")
    .replace(/^where food$/, "where is food")
    .replace(/^where hospital$/, "where is the hospital")
    .replace(/^I help$/, "I need help")
    .replace(/^I water$/, "I need water")
    .replace(/^I food$/, "I need food")
    .replace(/^help me$/, "please help me");

  const isQuestion = sequence[0] === "WHERE";
  const final = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return final + (isQuestion ? "?" : ".");
}
