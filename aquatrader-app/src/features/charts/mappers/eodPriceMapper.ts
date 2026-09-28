import type { Time } from 'lightweight-charts';
import type { IPricesPricesEodListingidFromdateTodateResponse } from '../../../api/aquatrader_pricesTypes'
import type { EodCandle } from '../models/EodCandle';

export function toEodCandle(
    price: IPricesPricesEodListingidFromdateTodateResponse
): EodCandle | null {
    if (
        price.priceDate == null ||
        price.open == null ||
        price.high == null ||
        price.low == null ||
        price.close == null
    ) {
        return null;
    }

    return {
        time: price.priceDate as Time,
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume ?? undefined,
    };
}