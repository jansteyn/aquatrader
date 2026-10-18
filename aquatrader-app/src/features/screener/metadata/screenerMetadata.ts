import type {
    IMarketCurrenciesResponse,
    IMarketExchangesResponse,
} from '../../../api/aquatrader_marketTypes';
import type {
    ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse,
    ITechnicalTechnicalIndicatorsResponse,
} from '../../../api/aquatrader_technicalTypes';
import {
    createTechnicalIndicatorFieldDefinitions,
    SCREENER_FIELD_DEFINITIONS,
    type ScreenerFieldDefinition,
} from '../models/screener';

export interface ScreenerMetadataSources {
    exchanges: readonly IMarketExchangesResponse[];
    currencies: readonly IMarketCurrenciesResponse[];
    indicators: readonly ITechnicalTechnicalIndicatorsResponse[];
    configurations: readonly ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse[];
}

export function mapScreenerMetadata(
    sources: ScreenerMetadataSources,
): ScreenerFieldDefinition[] {
    const exchanges = sources.exchanges.flatMap((exchange) => {
        if (exchange.id == null) {
            return [];
        }
        const label = exchange.shortName ?? exchange.name ?? `Exchange ${exchange.id}`;
        return [{ value: exchange.id, label }];
    });

    const currencies = sources.currencies.flatMap((currency) => {
        if (currency.code == null) {
            return [];
        }
        return [{
            value: currency.code,
            label: currency.name ? `${currency.code} — ${currency.name}` : currency.code,
        }];
    });

    const fields = SCREENER_FIELD_DEFINITIONS.map((field) => {
        switch (field.fieldId) {
            case 'exchange.id':
                return { ...field, enumOptions: exchanges };
            case 'exchange.name':
            case 'exchange.mic':
                return {
                    ...field,
                    enumOptions: sources.exchanges.flatMap((exchange) => {
                        const value = field.fieldId === 'exchange.mic'
                            ? exchange.mic
                            : exchange.name ?? exchange.shortName;
                        return value == null ? [] : [{ value, label: value }];
                    }),
                };
            case 'currency.id':
                return {
                    ...field,
                    enumOptions: sources.currencies.flatMap((currency) =>
                        currency.id == null
                            ? []
                            : [{ value: currency.id, label: currency.code ?? String(currency.id) }],
                    ),
                };
            case 'currency.code':
                return { ...field, enumOptions: currencies };
            case 'market.countryCode':
                return {
                    ...field,
                    enumOptions: [...new Set(
                        sources.exchanges.flatMap((exchange) =>
                            exchange.countryCode == null ? [] : [exchange.countryCode],
                        ),
                    )].map((countryCode) => ({ value: countryCode, label: countryCode })),
                };
            default:
                return field;
        }
    });

    return [
        ...fields,
        ...createTechnicalIndicatorFieldDefinitions(
            sources.indicators,
            sources.configurations,
        ),
    ];
}
