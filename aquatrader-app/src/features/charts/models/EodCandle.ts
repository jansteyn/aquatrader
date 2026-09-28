import type { CandlestickData, Time } from 'lightweight-charts';

export interface EodCandle extends CandlestickData<Time> {
    volume?: number;
}