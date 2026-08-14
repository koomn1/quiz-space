export type StorePriceInput = {
  price_egp?: number | string | null;
  price_points?: number | null;
  price_coins?: number | null;
};

export type StorePaymentMode = 'cash' | 'points' | 'coins' | 'unavailable';

export function getStorePaymentMode(item: StorePriceInput): {
  mode: StorePaymentMode;
  amount: number;
} {
  const cash = Number(item.price_egp) || 0;
  const coins = Number(item.price_coins) || 0;
  const points = Number(item.price_points) || 0;

  if (cash > 0) return { mode: 'cash', amount: cash };
  if (coins > 0) return { mode: 'coins', amount: coins };
  if (points > 0) return { mode: 'points', amount: points };
  return { mode: 'unavailable', amount: 0 };
}
