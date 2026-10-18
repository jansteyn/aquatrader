import { describe, expect, it, vi } from 'vitest';
import type {
    ExecuteScreenerRequest,
    ExecuteScreenerResponse,
    ScreenerBackendCapabilities,
    ScreenerFieldDefinition,
} from '../src/features/screener/models/screener';
import {
    serializeScreenerExecutionRequest,
    type ScreenerExecutionOptions,
} from '../src/features/screener/models/screenerExecution';
import {
    LatestScreenerExecution,
    type ScreenerExecutionApi,
} from '../src/features/screener/api/screenerExecutionApi';

const fields: ScreenerFieldDefinition[] = [
    {
        fieldId: 'price.eod.close',
        label: 'Latest EOD close',
        valueType: 'number',
        category: 'price',
        filterable: true,
        operators: ['between', 'gt'],
    },
];

const capabilities: ScreenerBackendCapabilities = {
    fields: [{ fieldId: 'price.eod.close', valueType: 'number', operators: ['between', 'gt'], sortable: true }],
    supportsFilterGroups: true,
    supportsNestedGroups: false,
    supportsOrGroups: true,
    supportsSorting: true,
    supportsPagination: true,
    supportsTotalCount: true,
    supportsSavedScreens: false,
};

function makeOptions(overrides: Partial<ScreenerExecutionOptions> = {}): ScreenerExecutionOptions {
    return {
        filters: [{ id: 1, fieldId: 'price.eod.close', operator: 'between', value: '10.25', secondValue: '20' }],
        logic: 'and',
        fields,
        scope: { exchangeIds: [1, 8], currencyCodes: ['USD', 'EUR'] },
        sort: { fieldId: 'price.eod.close', direction: 'desc' },
        pagination: { page: 2, pageSize: 50 },
        capabilities,
        ...overrides,
    };
}

function makeRequest(): ExecuteScreenerRequest {
    const result = serializeScreenerExecutionRequest(makeOptions());
    if (!result.valid) {
        throw new Error(result.errors.join('; '));
    }
    return result.request;
}

describe('screener execution contract', () => {
    it('serializes typed filters, multi-market scope, sort, pagination, and latest-per-listing date semantics', () => {
        const result = serializeScreenerExecutionRequest(makeOptions());
        expect(result.valid).toBe(true);
        if (!result.valid) return;

        expect(result.request).toEqual({
            scope: { exchangeIds: [1, 8], currencyCodes: ['USD', 'EUR'], marketCountryCodes: undefined },
            filters: {
                logic: 'and',
                conditions: [{
                    fieldId: 'price.eod.close',
                    valueType: 'number',
                    operator: 'between',
                    value: 10.25,
                    secondValue: 20,
                }],
            },
            sort: { fieldId: 'price.eod.close', direction: 'desc' },
            pagination: { page: 2, pageSize: 50 },
            eodDate: { mode: 'latestPerListing' },
        });
    });

    it('rejects invalid filters and unsupported sorting or pagination before serialization', () => {
        const invalidFilter = serializeScreenerExecutionRequest(
            makeOptions({
                filters: [{ id: 1, fieldId: 'price.eod.close', operator: 'between', value: 'not a number', secondValue: '' }],
            }),
        );
        expect(invalidFilter).toMatchObject({ valid: false });
        if (!invalidFilter.valid) {
            expect(invalidFilter.errors.join(' ')).toContain('valid number');
        }

        const unsupported = serializeScreenerExecutionRequest(
            makeOptions({
                capabilities: { ...capabilities, supportsSorting: false, supportsPagination: false },
            }),
        );
        expect(unsupported).toMatchObject({ valid: false });
        if (!unsupported.valid) {
            expect(unsupported.errors.join(' ')).toContain('Sorting is not supported');
            expect(unsupported.errors.join(' ')).toContain('Pagination is not supported');
        }
    });
});

describe('latest execution coordination', () => {
    it('passes AbortSignal, cancels the older call, and ignores its late response', async () => {
        let finishFirst!: (response: ExecuteScreenerResponse) => void;
        let finishSecond!: (response: ExecuteScreenerResponse) => void;
        const signals: AbortSignal[] = [];
        const api: ScreenerExecutionApi = {
            execute: vi.fn((_request, signal) => {
                if (signal) signals.push(signal);
                return new Promise((resolve) => {
                    if (signals.length === 1) finishFirst = resolve;
                    else finishSecond = resolve;
                });
            }),
        };
        const runner = new LatestScreenerExecution();

        const first = runner.execute(api, makeRequest());
        const second = runner.execute(api, makeRequest());
        expect(signals[0].aborted).toBe(true);

        finishSecond({ results: [], pagination: { page: 2, pageSize: 50, totalCount: 0 } });
        finishFirst({ results: [], pagination: { page: 1, pageSize: 50, totalCount: 99 } });
        await expect(second).resolves.toMatchObject({ status: 'success' });
        await expect(first).resolves.toEqual({ status: 'stale' });
    });

    it('returns API errors without discarding the caller-owned request or filter state', async () => {
        const request = makeRequest();
        const error = new Error('server unavailable');
        const api: ScreenerExecutionApi = { execute: vi.fn().mockRejectedValue(error) };

        await expect(new LatestScreenerExecution().execute(api, request)).resolves.toEqual({
            status: 'error',
            error,
        });
        expect(request.filters.conditions).toHaveLength(1);
    });

    it('treats an explicitly cancelled request as cancelled', async () => {
        let observedSignal: AbortSignal | undefined;
        const api: ScreenerExecutionApi = {
            execute: vi.fn((_request, signal) => {
                observedSignal = signal;
                return new Promise((_resolve, reject) => {
                    signal?.addEventListener('abort', () => reject(new Error('aborted')));
                });
            }),
        };
        const runner = new LatestScreenerExecution();
        const pending = runner.execute(api, makeRequest());
        runner.cancel();

        expect(observedSignal?.aborted).toBe(true);
        await expect(pending).resolves.toEqual({ status: 'cancelled' });
    });
});
