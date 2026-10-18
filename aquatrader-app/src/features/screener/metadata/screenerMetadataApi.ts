import type {
    ScreenerFieldCategory,
    ScreenerFieldConstraints,
    ScreenerFieldId,
    ScreenerMarketScope,
    ScreenerOperator,
    ScreenerValueType,
} from '../models/screener';

export interface GetScreenerMetadataRequest {
    scope?: ScreenerMarketScope;
}

export interface ScreenerMetadataFieldContract {
    fieldId: ScreenerFieldId;
    label: string;
    valueType: ScreenerValueType;
    category: ScreenerFieldCategory;
    filterable: boolean;
    operators: readonly ScreenerOperator[];
    enumOptions?: readonly { value: string | number; label: string }[];
    constraints?: ScreenerFieldConstraints;
    indicator?: {
        indicatorId: number;
        indicatorCode: string;
        indicatorName: string;
        configurationId: number;
        parameters: unknown;
        outputIndex: number;
        outputSeriesName: string;
    };
}

export interface GetScreenerMetadataResponse {
    fields: readonly ScreenerMetadataFieldContract[];
}

export interface ScreenerMetadataApi {
    getMetadata(request?: GetScreenerMetadataRequest): Promise<GetScreenerMetadataResponse>;
}

export const SCREENER_METADATA_BACKEND_STATUS = {
    state: 'not-implemented',
    proposedRoute: 'GET /api/screener/metadata',
} as const;
