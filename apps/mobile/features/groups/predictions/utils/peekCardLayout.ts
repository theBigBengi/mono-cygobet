export const CARD_GAP = 12;
export const PEEK = 48;

export function getCardLayout(screenHeight: number) {
  const CARD_HEIGHT = screenHeight - PEEK - CARD_GAP;
  const STEP = CARD_HEIGHT + CARD_GAP;
  const EXPAND_AMOUNT = PEEK + CARD_GAP;
  return { CARD_HEIGHT, STEP, EXPAND_AMOUNT };
}
