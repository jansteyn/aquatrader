import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { EodCandle } from '../../features/charts/models/EodCandle';
import { pricesPricesEodListingidFromdateTodate } from '../../api/aquatrader_prices';
import { toEodCandle } from '../../features/charts/mappers/eodPriceMapper';
import type { IPricesPricesEodListingidFromdateTodateRequest } from '../../api/aquatrader_pricesTypes';

export function ListingEodChart({
    listingId,
    fromDate,
    toDate,
}: {
    listingId: number;
    fromDate: string;
    toDate: string;
}) {
    const [data, setData] = useState<EodCandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const request: IPricesPricesEodListingidFromdateTodateRequest = {
                    listingId,
                    fromDate,
                    toDate,
                };
               
                const result =
                    await pricesPricesEodListingidFromdateTodate(request);

                if (cancelled) {
                    return;
                }

                const prices = Array.isArray(result)
                    ? result
                    : Object.values(result).find(Array.isArray) ?? [];

                const candles = prices
                    .map(toEodCandle)
                    .filter(
                        (x: any): x is EodCandle => x !== null
                    );

                setData(candles);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load prices.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [listingId, fromDate, toDate]);

    if (loading) {
        return <div>Loading chart...</div>;
    }

    if (error) {
        return <div>Unable to load chart: {error}</div>;
    }

    if (data.length === 0) {
        return <div>No price data available.</div>;
    }

    const option: EChartsOption = {
        animation: false,
        backgroundColor: '#10191b',
        grid: [
            {
                top: 24,
                height: 310,
                right: 24,
                left: 64,
            },
            {
                top: 366,
                right: 24,
                bottom: 48,
                left: 64,
            },
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
            },
        },
        xAxis: [
            {
                type: 'category',
                gridIndex: 0,
                data: data.map(candle => String(candle.time)),
                boundaryGap: true,
                axisLine: { lineStyle: { color: '#435354' } },
                axisLabel: { show: false },
                splitLine: { show: false },
            },
            {
                type: 'category',
                gridIndex: 1,
                data: data.map(candle => String(candle.time)),
                boundaryGap: true,
                axisLine: { lineStyle: { color: '#435354' } },
                axisLabel: { color: '#81908a' },
                splitLine: { show: false },
            },
        ],
        yAxis: [
            {
                gridIndex: 0,
                scale: true,
                axisLine: { lineStyle: { color: '#435354' } },
                axisLabel: { color: '#81908a' },
                splitLine: { lineStyle: { color: '#243336' } },
            },
            {
                gridIndex: 1,
                scale: true,
                axisLine: { lineStyle: { color: '#435354' } },
                axisLabel: { color: '#81908a' },
                splitLine: { lineStyle: { color: '#243336' } },
            },
        ],
        series: [
            {
                name: 'EOD price',
                type: 'candlestick',
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: data.map(candle => [
                    candle.open,
                    candle.close,
                    candle.low,
                    candle.high,
                ]),
                itemStyle: {
                    color: '#b9e769',
                    color0: '#ee806b',
                    borderColor: '#b9e769',
                    borderColor0: '#ee806b',
                },
            },
            {
                name: 'Volume',
                type: 'bar',
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: data.map(candle => ({
                    value: candle.volume ?? 0,
                    itemStyle: {
                        color: candle.close >= candle.open ? '#b9e769' : '#ee806b',
                    },
                })),
                barMaxWidth: 12,
            },
        ],
    };

    return (
        <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: 500 }}
        />
    );
}