import type {
    ScreenerBackendCapabilities,
    ScreenerDefinition,
    ScreenerFieldCapability,
    ScreenerFilterCondition,
    ScreenerFilterGroup,
    ScreenerValueType,
} from './screener';

export type ScreenerValidationResult<T> =
    | { valid: true; value: T }
    | { valid: false; errors: readonly string[] };

function isValidIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getCapability(
    fieldId: ScreenerFilterCondition['fieldId'],
    capabilities: ScreenerBackendCapabilities,
): ScreenerFieldCapability | undefined {
    return capabilities.fields.find((field) => field.fieldId === fieldId);
}

function conditionValueType(condition: ScreenerFilterCondition): ScreenerValueType {
    return condition.valueType;
}

export function validateFilterCondition(
    condition: ScreenerFilterCondition,
    capabilities: ScreenerBackendCapabilities,
): string[] {
    const errors: string[] = [];
    const field = getCapability(condition.fieldId, capabilities);

    if (!field) {
        return [`Field "${condition.fieldId}" is not supported by the screener backend.`];
    }

    if (field.valueType !== conditionValueType(condition)) {
        errors.push(`Field "${condition.fieldId}" expects a ${field.valueType} value.`);
    }

    if (!field.operators.includes(condition.operator)) {
        errors.push(`Operator "${condition.operator}" is not supported for "${condition.fieldId}".`);
    }

    if (condition.operator === 'between') {
        if (condition.secondValue === undefined) {
            errors.push('BETWEEN requires a second value.');
            return errors;
        }

        if (condition.valueType === 'number') {
            if (!Number.isFinite(condition.value) || !Number.isFinite(condition.secondValue)) {
                errors.push('BETWEEN values must be finite numbers.');
            } else if (condition.value > condition.secondValue) {
                errors.push('BETWEEN lower value must not exceed its upper value.');
            }
        } else if (
            condition.valueType === 'date' &&
            (!isValidIsoDate(condition.value) ||
                !isValidIsoDate(condition.secondValue) ||
                condition.value > condition.secondValue)
        ) {
            errors.push('BETWEEN requires valid ISO dates in ascending order.');
        }

        return errors;
    }

    if (!('value' in condition)) {
        return errors;
    }

    switch (condition.valueType) {
        case 'number':
            if (!Number.isFinite(condition.value)) {
                errors.push('Filter value must be a finite number.');
            }
            break;
        case 'date':
            if (!isValidIsoDate(condition.value)) {
                errors.push('Filter value must be a valid ISO date (YYYY-MM-DD).');
            }
            break;
        case 'text':
            if (typeof condition.value !== 'string') {
                errors.push('Filter value must be text.');
            }
            break;
        case 'boolean':
            if (typeof condition.value !== 'boolean') {
                errors.push('Filter value must be a boolean.');
            }
            break;
    }

    return errors;
}

export function createFilterCondition(
    condition: ScreenerFilterCondition,
    capabilities: ScreenerBackendCapabilities,
): ScreenerValidationResult<ScreenerFilterCondition> {
    const errors = validateFilterCondition(condition, capabilities);
    return errors.length > 0
        ? { valid: false, errors }
        : { valid: true, value: condition };
}

export function createFilterGroup(
    logic: ScreenerFilterGroup['logic'] = 'and',
    conditions: ScreenerFilterGroup['conditions'] = [],
): ScreenerFilterGroup {
    return { logic, conditions };
}

export function validateFilterGroup(
    group: ScreenerFilterGroup,
    capabilities: ScreenerBackendCapabilities,
    depth = 0,
): string[] {
    const errors: string[] = [];

    if (group.conditions.length === 0) {
        errors.push('Filter groups must contain at least one condition.');
    }
    if (depth > 0 && !capabilities.supportsNestedGroups) {
        errors.push('Nested filter groups are not supported by the screener backend.');
    }
    if (group.logic === 'or' && !capabilities.supportsOrGroups) {
        errors.push('OR filter groups are not supported by the screener backend.');
    }
    if (depth === 0 && !capabilities.supportsFilterGroups) {
        errors.push('Filter groups are not supported by the screener backend.');
    }

    for (const condition of group.conditions) {
        errors.push(
            ...(isFilterGroup(condition)
                ? validateFilterGroup(condition, capabilities, depth + 1)
                : validateFilterCondition(condition, capabilities)),
        );
    }

    return errors;
}

function isFilterGroup(
    condition: ScreenerFilterCondition | ScreenerFilterGroup,
): condition is ScreenerFilterGroup {
    return 'conditions' in condition;
}

export function validateScreenerDefinition(
    definition: ScreenerDefinition,
    capabilities: ScreenerBackendCapabilities,
): string[] {
    const errors: string[] = [];
    if (definition.name.trim().length === 0) {
        errors.push('Screen name is required.');
    }

    errors.push(...validateFilterGroup(definition.filters, capabilities));

    if (definition.sort) {
        if (!capabilities.supportsSorting) {
            errors.push('Sorting is not supported by the screener backend.');
        }

        const field = getCapability(definition.sort.fieldId, capabilities);
        if (!field || !field.sortable) {
            errors.push(`Field "${definition.sort.fieldId}" is not supported for sorting.`);
        }
    }

    return errors;
}
