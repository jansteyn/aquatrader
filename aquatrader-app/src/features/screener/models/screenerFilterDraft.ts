import type {
    ScreenerFieldDefinition,
    ScreenerFieldId,
    ScreenerOperator,
} from './screener';

export interface ScreenerFilterDraft {
    id: number;
    fieldId: ScreenerFieldId;
    operator: ScreenerOperator;
    value: string;
    secondValue: string;
}

export function validateScreenerFilterDraft(
    filter: ScreenerFilterDraft,
    fields: readonly ScreenerFieldDefinition[],
): string | null {
    const field = fields.find((item) => item.fieldId === filter.fieldId);
    if (!field || !field.filterable || !field.operators.includes(filter.operator)) {
        return 'This field or operator is not supported by the screener backend.';
    }
    if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
        return null;
    }

    if (field.enumOptions?.length) {
        const values = field.enumOptions.map((option) => String(option.value));
        if (!values.includes(filter.value)) {
            return 'Select a value from the available options.';
        }
    } else if (!filter.value.trim()) {
        return 'Enter a value for this filter.';
    }

    if (field.valueType === 'number') {
        const value = Number(filter.value);
        if (!Number.isFinite(value)) {
            return 'Enter a valid number.';
        }
        if (field.constraints?.minimum != null && value < field.constraints.minimum) {
            return `Value must be at least ${field.constraints.minimum}.`;
        }
        if (field.constraints?.maximum != null && value > field.constraints.maximum) {
            return `Value must be no greater than ${field.constraints.maximum}.`;
        }
        if (filter.operator === 'between') {
            if (!filter.secondValue.trim() || !Number.isFinite(Number(filter.secondValue))) {
                return 'Enter a valid upper value.';
            }
            const upperValue = Number(filter.secondValue);
            if (field.constraints?.minimum != null && upperValue < field.constraints.minimum) {
                return `Value must be at least ${field.constraints.minimum}.`;
            }
            if (field.constraints?.maximum != null && upperValue > field.constraints.maximum) {
                return `Value must be no greater than ${field.constraints.maximum}.`;
            }
            if (value > upperValue) {
                return 'Lower value must not exceed upper value.';
            }
        }
    }

    if (field.valueType === 'date') {
        if (!isIsoDate(filter.value)) {
            return 'Enter a valid date.';
        }
        if (filter.operator === 'between') {
            if (!isIsoDate(filter.secondValue)) {
                return 'Enter a valid upper date.';
            }
            if (filter.value > filter.secondValue) {
                return 'Start date must not be after end date.';
            }
        }
    }

    if (field.valueType === 'boolean' && filter.value !== 'true' && filter.value !== 'false') {
        return 'Select Yes or No.';
    }

    if (field.valueType === 'text') {
        if (
            field.constraints?.minimumLength != null &&
            filter.value.length < field.constraints.minimumLength
        ) {
            return `Enter at least ${field.constraints.minimumLength} characters.`;
        }
        if (
            field.constraints?.maximumLength != null &&
            filter.value.length > field.constraints.maximumLength
        ) {
            return `Enter no more than ${field.constraints.maximumLength} characters.`;
        }
        if (field.constraints?.pattern && !new RegExp(field.constraints.pattern).test(filter.value)) {
            return 'Value does not match the required format.';
        }
    }

    return null;
}

function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
