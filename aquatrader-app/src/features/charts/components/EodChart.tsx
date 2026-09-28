import { useEffect, useRef } from 'react';
import {
    CandlestickSeries,
    ColorType,
    createChart,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type Time,
} from 'lightweight-charts';

interface EodChartProps {
    data: CandlestickData<Time>[];
    height?: number;
}

export function EodChart({
    data,
    height = 500,
}: EodChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef =
        useRef<ISeriesApi<'Candlestick'> | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height,

            layout: {
                background: {
                    type: ColorType.Solid,
                    color: '#ffffff',
                },
                textColor: '#333333',
            },

            grid: {
                vertLines: {
                    color: '#eeeeee',
                },
                horzLines: {
                    color: '#eeeeee',
                },
            },

            rightPriceScale: {
                borderColor: '#dddddd',
            },

            timeScale: {
                borderColor: '#dddddd',
                timeVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        series.setData(data);

        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = series;

        const resizeObserver = new ResizeObserver(entries => {
            const width = entries[0]?.contentRect.width;

            if (width) {
                chart.applyOptions({
                    width,
                });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();

            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [height]);

    useEffect(() => {
        if (!seriesRef.current) {
            return;
        }

        seriesRef.current.setData(data);
        chartRef.current?.timeScale().fitContent();
    }, [data]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height,
            }}
        />
    );
}