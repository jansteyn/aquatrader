import type {
    ExecuteScreenerRequest,
    ScreenerBackendCapabilities,
    ScreenerComparisonOperator,
    ScreenerFieldDefinition,
    ScreenerFilterCondition,
    ScreenerFilterGroup,
    ScreenerMarketScope,
    ScreenerPaginationRequest,
    ScreenerSort,
} from './screener';
import type { ScreenerFilterDraft } from './screenerFilterDraft';
import { validateScreenerFilterDraft } from './screenerFilterDraft';

export interface ScreenerExecutionOptions {
    filters: readonly ScreenerFilterDraft[];
    logic: ScreenerFilterGroup['logic'];
    fields: readonly ScreenerFieldDefinition[];
    scope: ScreenerMarketScope;
    sort?: ScreenerSort;
    pagination: ScreenerPaginationRequest;
    capabilities: ScreenerBackendCapabilities;
}

export type ScreenerRequestValidation =
    | { valid: true; request: ExecuteScreenerRequest }
    | { valid: false; errors: readonly string[] };

export function serializeScreenerExecutionRequest(
    options: ScreenerExecutionOptions,
): ScreenerRequestValidation {
    const errors: string[] = [];
    const conditions: ScreenerFilterCondition[] = [];

    for (const [index, draft] of options.filters.entries()) {
        const field = options.fields.find((item) => item.fieldId === draft.fieldId);
        const error = validateScreenerFilterDraft(draft, options.fields);
        if (error) {
            errors.push(`Filter ${index + 1}: ${error}`);
            continue;
        }
        if (!field) {
            errors.push(`Filter ${index + 1}: unsupported field.`);
            continue;
        }
        const condition = serializeCondition(draft, field.valueType);
        if (!condition) {
            errors.push(`Filter ${index + 1}: operator is incompatible with the field type.`);
            continue;
        }
        conditions.push(condition);
    }

    const pagination = options.pagination;
    if (
        !Number.isInteger(pagination.page) ||
        pagination.page < 1 ||
        !Number.isInteger(pagination.pageSize) ||
        pagination.pageSize < 1
    ) {
        errors.push('Page and page size must be positive integers.');
    } else if (!options.capabilities.supportsPagination) {
        errors.push('Pagination is not supported by the backend.');
    }

    if (options.sort) {
        if (!options.capabilities.supportsSorting) {
            errors.push('Sorting is not supported by the backend.');
        }
        const sortableField = options.capabilities.fields.find(
            (field) => field.fieldId === options.sort?.fieldId,
        );
        if (!sortableField?.sortable) {
            errors.push(`Field "${options.sort.fieldId}" is not supported for sorting.`);
        }
    }

    const filters: ScreenerFilterGroup = { logic: options.logic, conditions };
    if (!options.capabilities.supportsFilterGroups) {
        errors.push('Filter groups are not supported by the backend.');
    }
    if (filters.logic === 'or' && !options.capabilities.supportsOrGroups) {
        errors.push('OR filter groups are not supported by the backend.');
    }
    if (filters.conditions.length === 0) {
        errors.push('Add at least one valid filter before running the screen.');
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        request: {
            scope: {
                marketCountryCodes: options.scope.marketCountryCodes,
                exchangeIds: options.scope.exchangeIds,
                currencyCodes: options.scope.currencyCodes,
            },
            filters,
            sort: options.sort,
            pagination,
            eodDate: { mode: 'latestPerListing' },
        },
    };
}

function serializeCondition(
    draft: ScreenerFilterDraft,
    valueType: ScreenerFieldDefinition['valueType'],
): ScreenerFilterCondition | null {
    const { fieldId, operator } = draft;
    if (operator === 'isNull' || operator === 'isNotNull') {
        return { fieldId, valueType, operator };
    }

    if (operator === 'between') {
        if (valueType === 'number') {
            return {
                fieldId,
                valueType,
                operator,
                value: Number(draft.value),
                secondValue: Number(draft.secondValue),
            };
        }
        if (valueType === 'date') {
            return {
                fieldId,
                valueType,
                operator,
                value: draft.value,
                secondValue: draft.secondValue,
            };
        }
        return null;
    }

    switch (valueType) {
        case 'text':
            return operator === 'eq' || operator === 'neq'
                ? { fieldId, valueType, operator, value: draft.value }
                : null;
        case 'number':
            return isComparisonOperator(operator)
                ? {
                      fieldId,
                      valueType,
                      operator,
                      value: Number(draft.value),
                  }
                : null;
        case 'date':
            return isComparisonOperator(operator)
                ? {
                      fieldId,
                      valueType,
                      operator,
                      value: draft.value,
                  }
                : null;
        case 'boolean':
            return operator === 'eq' || operator === 'neq'
                ? { fieldId, valueType, operator, value: draft.value === 'true' }
                : null;
    }
}

function isComparisonOperator(operator: string): operator is ScreenerComparisonOperator {
    return (
        operator === 'eq' ||
        operator === 'neq' ||
        operator === 'gt' ||
        operator === 'gte' ||
        operator === 'lt' ||
        operator === 'lte'
    );
}
