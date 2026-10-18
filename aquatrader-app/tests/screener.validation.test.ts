import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createFilterCondition,
    createFilterGroup,
    validateFilterGroup,
    validateScreenerDefinition,
} from '../src/features/screener/models/screener.validation.ts';
import type {
    ScreenerBackendCapabilities,
    ScreenerDefinition,
    ScreenerFilterCondition,
} from '../src/features/screener/models/screener.ts';
import { createTechnicalIndicatorFieldDefinitions } from '../src/features/screener/models/screener.ts';

const capabilities: ScreenerBackendCapabilities = {
    fields: [
        {
            fieldId: 'price.eod.close',
            valueType: 'number',
            operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
            sortable: true,
        },
        {
            fieldId: 'price.eod.priceDate',
            valueType: 'date',
            operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'],
            sortable: true,
        },
        {
            fieldId: 'listing.symbol',
            valueType: 'text',
            operators: ['eq', 'neq'],
            sortable: true,
        },
    ],
    supportsFilterGroups: true,
    supportsNestedGroups: true,
    supportsOrGroups: true,
    supportsSorting: true,
    supportsPagination: true,
    supportsTotalCount: true,
    supportsSavedScreens: false,
};

test('constructs a supported numeric filter', () => {
    const result = createFilterCondition(
        { fieldId: 'price.eod.close', valueType: 'number', operator: 'gte', value: 10 },
        capabilities,
    );

    assert.deepEqual(result, {
        valid: true,
        value: { fieldId: 'price.eod.close', valueType: 'number', operator: 'gte', value: 10 },
    });
});

test('rejects fields and operators that the backend has not advertised', () => {
    const unsupportedField = createFilterCondition(
        { fieldId: 'price.eod.volume', valueType: 'number', operator: 'gt', value: 1000 },
        capabilities,
    );
    const unsupportedOperator = createFilterCondition(
        { fieldId: 'listing.symbol', valueType: 'text', operator: 'eq', value: 'ABC' },
        {
            ...capabilities,
            fields: capabilities.fields.map((field) =>
                field.fieldId === 'listing.symbol' ? { ...field, operators: [] } : field,
            ),
        },
    );

    assert.equal(unsupportedField.valid, false);
    assert.equal(unsupportedOperator.valid, false);
});

test('requires ordered, valid range values', () => {
    const missingUpperValue = createFilterCondition(
        { fieldId: 'price.eod.close', valueType: 'number', operator: 'between', value: 10 },
        capabilities,
    );
    const reversedRange = createFilterCondition(
        {
            fieldId: 'price.eod.close',
            valueType: 'number',
            operator: 'between',
            value: 20,
            secondValue: 10,
        },
        capabilities,
    );
    const invalidDate = createFilterCondition(
        { fieldId: 'price.eod.priceDate', valueType: 'date', operator: 'eq', value: '2026-02-30' },
        capabilities,
    );

    assert.equal(missingUpperValue.valid, false);
    assert.equal(reversedRange.valid, false);
    assert.equal(invalidDate.valid, false);
});

test('validates null checks without comparison values', () => {
    const result = createFilterCondition(
        { fieldId: 'price.eod.close', valueType: 'number', operator: 'isNotNull' },
        capabilities,
    );

    assert.equal(result.valid, true);
});

test('validates AND/OR groups against advertised group support', () => {
    const group = createFilterGroup('or', [
        { fieldId: 'price.eod.close', valueType: 'number', operator: 'gt', value: 10 },
        { fieldId: 'listing.symbol', valueType: 'text', operator: 'eq', value: 'ABC' },
    ]);

    assert.deepEqual(validateFilterGroup(group, capabilities), []);
    assert.ok(
        validateFilterGroup(group, { ...capabilities, supportsOrGroups: false }).some((error) =>
            error.includes('OR'),
        ),
    );
});

test('validates the screen name, filter tree, and sortable field', () => {
    const definition: ScreenerDefinition = {
        name: '  ',
        scope: {},
        filters: createFilterGroup('and', [
            { fieldId: 'price.eod.close', valueType: 'number', operator: 'gt', value: 10 },
        ]),
        sort: { fieldId: 'price.eod.close', direction: 'desc' },
    };

    assert.ok(validateScreenerDefinition(definition, capabilities).some((error) => error.includes('name')));
    assert.deepEqual(
        validateScreenerDefinition({ ...definition, name: 'Liquid stocks' }, capabilities),
        [],
    );
});

test('filter conditions retain the field-specific value types', () => {
    const condition: ScreenerFilterCondition = {
        fieldId: 'price.eod.close',
        valueType: 'number',
        operator: 'between',
        value: 1,
        secondValue: 2,
    };

    assert.equal(condition.secondValue, 2);
});

test('exposes technical indicator outputs only when metadata and configuration agree', () => {
    const fields = createTechnicalIndicatorFieldDefinitions(
        [
            { indicatorId: 1, code: 'MACD', name: 'MACD', description: null, outputCount: 3 },
        ],
        [
            {
                indicatorConfigurationId: 12,
                indicatorId: 1,
                indicatorCode: 'MACD',
                indicatorName: 'MACD',
                parameters: {},
            },
            {
                indicatorConfigurationId: 13,
                indicatorId: 2,
                indicatorCode: 'RSI',
                indicatorName: 'RSI',
                parameters: {},
            },
        ],
    );

    assert.deepEqual(fields.map((field) => field.fieldId), [
        'technical.indicator.12.value1',
        'technical.indicator.12.value2',
        'technical.indicator.12.value3',
    ]);
});
