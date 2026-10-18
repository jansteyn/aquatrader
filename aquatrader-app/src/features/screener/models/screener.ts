import type {
    ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse,
    ITechnicalTechnicalIndicatorsResponse,
} from '../../../api/aquatrader_technicalTypes';

export type ScreenerFieldId =
    | 'listing.id'
    | 'listing.symbol'
    | 'listing.listingType'
    | 'listing.isPrimary'
    | 'instrument.id'
    | 'instrument.name'
    | 'instrument.isin'
    | 'instrument.type'
    | 'instrument.sector'
    | 'instrument.industry'
    | 'exchange.id'
    | 'exchange.name'
    | 'exchange.mic'
    | 'currency.id'
    | 'currency.code'
    | 'market.countryCode'
    | 'price.eod.priceDate'
    | 'price.eod.open'
    | 'price.eod.high'
    | 'price.eod.low'
    | 'price.eod.close'
    | 'price.eod.adjustedClose'
    | 'price.eod.volume'
    | `technical.indicator.${number}.value${number}`;

export type ScreenerValueType = 'text' | 'number' | 'boolean' | 'date';

export type ScreenerFieldCategory =
    | 'listing'
    | 'market'
    | 'price'
    | 'technicalIndicator'
    | 'fundamental';

export interface ScreenerEnumOption {
    value: string | number;
    label: string;
}

export interface ScreenerFieldConstraints {
    minimum?: number;
    maximum?: number;
    minimumLength?: number;
    maximumLength?: number;
    pattern?: string;
    nullable?: boolean;
}

export interface ScreenerTechnicalFieldMetadata {
    indicatorId: number;
    indicatorCode: string;
    indicatorName: string;
    configurationId: number;
    parameters: unknown;
    outputIndex: number;
    outputSeriesName: string;
}

export interface ScreenerFieldDefinition {
    fieldId: ScreenerFieldId;
    label: string;
    valueType: ScreenerValueType;
    category: ScreenerFieldCategory;
    filterable: boolean;
    operators: readonly ScreenerOperator[];
    enumOptions?: readonly ScreenerEnumOption[];
    constraints?: ScreenerFieldConstraints;
    technicalIndicator?: ScreenerTechnicalFieldMetadata;
}

export const SCREENER_FIELD_DEFINITIONS: readonly ScreenerFieldDefinition[] = [
    { fieldId: 'listing.id', label: 'Listing ID', valueType: 'number', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'listing.symbol', label: 'Symbol', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'listing.listingType', label: 'Listing type', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'listing.isPrimary', label: 'Primary listing', valueType: 'boolean', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.id', label: 'Instrument ID', valueType: 'number', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.name', label: 'Instrument name', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.isin', label: 'ISIN', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.type', label: 'Instrument type', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.sector', label: 'Sector', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'instrument.industry', label: 'Industry', valueType: 'text', category: 'listing', filterable: false, operators: [] },
    { fieldId: 'exchange.id', label: 'Exchange ID', valueType: 'number', category: 'market', filterable: false, operators: [] },
    { fieldId: 'exchange.name', label: 'Exchange', valueType: 'text', category: 'market', filterable: false, operators: [] },
    { fieldId: 'exchange.mic', label: 'Exchange MIC', valueType: 'text', category: 'market', filterable: false, operators: [] },
    { fieldId: 'currency.id', label: 'Currency ID', valueType: 'number', category: 'market', filterable: false, operators: [] },
    { fieldId: 'currency.code', label: 'Currency', valueType: 'text', category: 'market', filterable: false, operators: [] },
    { fieldId: 'market.countryCode', label: 'Market country', valueType: 'text', category: 'market', filterable: false, operators: [] },
    { fieldId: 'price.eod.priceDate', label: 'Latest EOD date', valueType: 'date', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.open', label: 'Latest EOD open', valueType: 'number', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.high', label: 'Latest EOD high', valueType: 'number', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.low', label: 'Latest EOD low', valueType: 'number', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.close', label: 'Latest EOD close', valueType: 'number', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.adjustedClose', label: 'Latest adjusted close', valueType: 'number', category: 'price', filterable: false, operators: [] },
    { fieldId: 'price.eod.volume', label: 'Latest EOD volume', valueType: 'number', category: 'price', filterable: false, operators: [] },
];

export function createTechnicalIndicatorFieldDefinitions(
    indicators: readonly ITechnicalTechnicalIndicatorsResponse[],
    configurations: readonly ITechnicalTechnicalIndicatorconfigurationsIndicatoridResponse[],
): ScreenerFieldDefinition[] {
    const indicatorsById = new Map<number, ITechnicalTechnicalIndicatorsResponse>();
    for (const indicator of indicators) {
        if (indicator.indicatorId != null && indicator.outputCount != null) {
            indicatorsById.set(indicator.indicatorId, indicator);
        }
    }

    return configurations.flatMap((configuration) => {
        const indicatorId = configuration.indicatorId;
        const configurationId = configuration.indicatorConfigurationId;
        const indicatorCode = configuration.indicatorCode;
        const indicatorName = configuration.indicatorName;
        if (indicatorId == null || configurationId == null || indicatorCode == null || indicatorName == null) {
            return [];
        }

        const indicator = indicatorsById.get(indicatorId);
        if (
            !indicator ||
            indicator.code !== indicatorCode ||
            indicator.name !== indicatorName ||
            indicator.outputCount == null ||
            indicator.outputCount <= 0 ||
            indicator.outputCount > 4
        ) {
            return [];
        }

        const outputCount = indicator.outputCount;
        return Array.from({ length: outputCount }, (_, index) => {
            const outputNumber = index + 1;
            return {
                fieldId: `technical.indicator.${configurationId}.value${outputNumber}`,
                label: `${indicator.name} · ${configuration.parameters == null ? '{}' : JSON.stringify(configuration.parameters)} · Value ${outputNumber}`,
                valueType: 'number',
                category: 'technicalIndicator',
                filterable: false,
                operators: [],
                technicalIndicator: {
                    indicatorId,
                    indicatorCode,
                    indicatorName,
                    configurationId,
                    parameters: configuration.parameters,
                    outputIndex: outputNumber,
                    outputSeriesName: `Value ${outputNumber}`,
                },
            } satisfies ScreenerFieldDefinition;
        });
    });
}

export type ScreenerComparisonOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte';

export type ScreenerOperator =
    | ScreenerComparisonOperator
    | 'between'
    | 'isNull'
    | 'isNotNull';

export type ScreenerFilterCondition =
    | {
          fieldId: ScreenerFieldId;
          valueType: 'text';
          operator: 'eq' | 'neq';
          value: string;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: 'number';
          operator: ScreenerComparisonOperator;
          value: number;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: 'date';
          operator: ScreenerComparisonOperator;
          value: string;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: 'boolean';
          operator: 'eq' | 'neq';
          value: boolean;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: 'number';
          operator: 'between';
          value: number;
          secondValue?: number;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: 'date';
          operator: 'between';
          value: string;
          secondValue?: string;
      }
    | {
          fieldId: ScreenerFieldId;
          valueType: ScreenerValueType;
          operator: 'isNull' | 'isNotNull';
      };

export interface ScreenerFilterGroup {
    logic: 'and' | 'or';
    conditions: readonly (ScreenerFilterCondition | ScreenerFilterGroup)[];
}

export interface ScreenerMarketScope {
    marketCountryCodes?: readonly string[];
    exchangeIds?: readonly number[];
    currencyCodes?: readonly string[];
}

export interface ScreenerSort {
    fieldId: ScreenerFieldId;
    direction: 'asc' | 'desc';
}

export interface ScreenerMetadata {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface ScreenerDefinition extends ScreenerMetadata {
    id?: string;
    name: string;
    description?: string;
    scope: ScreenerMarketScope;
    filters: ScreenerFilterGroup;
    sort?: ScreenerSort;
}

export interface ScreenerFieldCapability {
    fieldId: ScreenerFieldId;
    valueType: ScreenerValueType;
    operators: readonly ScreenerOperator[];
    sortable: boolean;
}

export interface ScreenerBackendCapabilities {
    fields: readonly ScreenerFieldCapability[];
    supportsFilterGroups: boolean;
    supportsNestedGroups: boolean;
    supportsOrGroups: boolean;
    supportsSorting: boolean;
    supportsPagination: boolean;
    supportsTotalCount: boolean;
    supportsSavedScreens: boolean;
}

export interface ScreenerPaginationRequest {
    page: number;
    pageSize: number;
}

export interface ScreenerPagination {
    page: number;
    pageSize: number;
    totalCount?: number;
    totalPages?: number;
    hasNextPage?: boolean;
}

export interface ExecuteScreenerRequest {
    scope: ScreenerMarketScope;
    filters: ScreenerFilterGroup;
    sort?: ScreenerSort;
    pagination?: ScreenerPaginationRequest;
    eodDate: {
        mode: 'latestPerListing';
    };
}

export interface ScreenerEodSnapshot {
    priceDate: string | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    adjustedClose: number | null;
    volume: number | null;
}

export type ScreenerMetricValue = number | string | boolean | null;

export interface ScreenerResult {
    listingId: number;
    instrumentId: number | null;
    symbol: string | null;
    displayName: string | null;
    isin: string | null;
    exchangeId: number | null;
    exchangeName: string | null;
    mic: string | null;
    currencyId: number | null;
    currencyCode: string | null;
    marketCountryCode: string | null;
    latestEod: ScreenerEodSnapshot | null;
    metrics: Readonly<Record<string, ScreenerMetricValue>>;
}

export interface ExecuteScreenerResponse {
    results: readonly ScreenerResult[];
    pagination?: ScreenerPagination;
}
