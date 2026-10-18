import { describe, expect, it } from 'vitest';
import type {
    IMarketCurrenciesResponse,
    IMarketExchangesResponse,
} from '../src/api/aquatrader_marketTypes.ts';
import type {
    ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse,
    ITechnicalTechnicalIndicatorsResponse,
} from '../src/api/aquatrader_technicalTypes.ts';
import { mapScreenerMetadata } from '../src/features/screener/metadata/screenerMetadata';

const exchanges: IMarketExchangesResponse[] = [
    {
        id: 7,
        name: 'Example Exchange',
        shortName: 'EX',
        mic: 'XEXM',
        operatingMic: null,
        countryCode: 'ZZ',
        timezone: null,
        website: null,
        isActive: true,
    },
];

const currencies: IMarketCurrenciesResponse[] = [
    {
        id: 4,
        code: 'ZZD',
        name: 'Example Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isActive: true,
    },
];

describe('screener metadata mapping', () => {
    it('maps exchange, currency, and country enums from API metadata', () => {
        const fields = mapScreenerMetadata({
            exchanges,
            currencies,
            indicators: [],
            configurations: [],
        });
        const exchangeField = fields.find((field) => field.fieldId === 'exchange.id');
        const currencyField = fields.find((field) => field.fieldId === 'currency.code');
        const countryField = fields.find((field) => field.fieldId === 'market.countryCode');

        expect(exchangeField?.enumOptions).toEqual([{ value: 7, label: 'EX' }]);
        expect(currencyField?.enumOptions).toEqual([{ value: 'ZZD', label: 'ZZD — Example Dollar' }]);
        expect(countryField?.enumOptions).toEqual([{ value: 'ZZ', label: 'ZZ' }]);
        expect(exchangeField?.category).toBe('market');
        expect(exchangeField?.filterable).toBe(false);
        expect(exchangeField?.operators).toEqual([]);
    });

    it('maps configured technical outputs with indicator identity, output index, and parameters', () => {
    const indicators: ITechnicalTechnicalIndicatorsResponse[] = [
        {
            indicatorId: 3,
            code: 'RSI',
            name: 'Relative Strength Index',
            description: 'Momentum indicator',
            outputCount: 1,
        },
        {
            indicatorId: 4,
            code: 'MACD',
            name: 'MACD',
            description: null,
            outputCount: 3,
        },
    ];
    const configurations: ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse[] = [
        {
            indicatorConfigurationId: 31,
            indicatorId: 3,
            indicatorCode: 'RSI',
            indicatorName: 'Relative Strength Index',
            parameters: { period: 14 },
        },
        {
            indicatorConfigurationId: 32,
            indicatorId: 3,
            indicatorCode: 'RSI',
            indicatorName: 'Relative Strength Index',
            parameters: { period: 21 },
        },
        {
            indicatorConfigurationId: 40,
            indicatorId: 4,
            indicatorCode: 'MACD',
            indicatorName: 'MACD',
            parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        },
    ];

    const fields = mapScreenerMetadata({
        exchanges: [],
        currencies: [],
        indicators,
        configurations,
    }).filter((field) => field.category === 'technicalIndicator');

        expect(fields.map((field) => field.fieldId)).toEqual([
            'technical.indicator.31.value1',
            'technical.indicator.32.value1',
            'technical.indicator.40.value1',
            'technical.indicator.40.value2',
            'technical.indicator.40.value3',
        ]);
        expect(fields[0].technicalIndicator).toEqual({
        indicatorId: 3,
        indicatorCode: 'RSI',
        indicatorName: 'Relative Strength Index',
        configurationId: 31,
        parameters: { period: 14 },
        outputIndex: 1,
        outputSeriesName: 'Value 1',
    });
        expect(fields[1].technicalIndicator?.parameters).toBeInstanceOf(Object);
        expect(fields.every((field) => field.valueType === 'number')).toBe(true);
        expect(fields.every((field) => field.filterable === false)).toBe(true);
    });

    it('ignores incomplete or inconsistent indicator metadata', () => {
    const indicators: ITechnicalTechnicalIndicatorsResponse[] = [
        { indicatorId: 1, code: 'SMA', name: 'SMA', description: null, outputCount: 1 },
        { indicatorId: 2, code: 'MANY', name: 'Many outputs', description: null, outputCount: 5 },
    ];
    const configurations: ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse[] = [
        {
            indicatorConfigurationId: 11,
            indicatorId: 1,
            indicatorCode: 'EMA',
            indicatorName: 'EMA',
            parameters: {},
        },
        {
            indicatorConfigurationId: 21,
            indicatorId: 2,
            indicatorCode: 'MANY',
            indicatorName: 'Many outputs',
            parameters: {},
        },
        {
            indicatorConfigurationId: null,
            indicatorId: 1,
            indicatorCode: 'SMA',
            indicatorName: 'SMA',
            parameters: {},
        },
    ];

    const fields = mapScreenerMetadata({
        exchanges: [],
        currencies: [],
        indicators,
        configurations,
    });

        expect(fields.some((field) => field.category === 'technicalIndicator')).toBe(false);
    });
});
