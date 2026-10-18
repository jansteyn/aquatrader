import { describe, expect, it, vi } from 'vitest';
import type { SavedScreensApi, SavedScreenerDefinition } from '../src/features/screener/api/savedScreensApi';
import {
    InvalidSavedScreenError,
    SavedScreenManager,
    hasUnsavedScreenChanges,
} from '../src/features/screener/models/savedScreenManagement';
import type {
    ScreenerBackendCapabilities,
    ScreenerDefinition,
} from '../src/features/screener/models/screener';

const capabilities: ScreenerBackendCapabilities = {
    fields: [{
        fieldId: 'price.eod.close',
        valueType: 'number',
        operators: ['gt'],
        sortable: true,
    }],
    supportsFilterGroups: true,
    supportsNestedGroups: false,
    supportsOrGroups: true,
    supportsSorting: true,
    supportsPagination: true,
    supportsTotalCount: true,
    supportsSavedScreens: true,
};

const definition: ScreenerDefinition = {
    name: 'High close',
    description: 'Close above threshold',
    scope: { exchangeIds: [4], currencyCodes: ['EUR'] },
    filters: {
        logic: 'and',
        conditions: [{
            fieldId: 'price.eod.close',
            valueType: 'number',
            operator: 'gt',
            value: 20,
        }],
    },
    sort: { fieldId: 'price.eod.close', direction: 'desc' },
};

const saved: SavedScreenerDefinition = { ...definition, id: 'saved-1' };

function createApi(overrides: Partial<SavedScreensApi> = {}): SavedScreensApi {
    return {
        list: vi.fn().mockResolvedValue([saved]),
        get: vi.fn().mockResolvedValue(saved),
        create: vi.fn().mockResolvedValue(saved),
        update: vi.fn().mockResolvedValue(saved),
        rename: vi.fn().mockResolvedValue({ ...saved, name: 'Renamed' }),
        duplicate: vi.fn().mockResolvedValue({ ...saved, id: 'saved-2', name: 'Copy' }),
        delete: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('saved screen management', () => {
    it('creates and updates a complete screen definition after validation', async () => {
        const api = createApi();
        const manager = new SavedScreenManager(api);

        await expect(manager.create(definition, capabilities)).resolves.toEqual(saved);
        await expect(manager.update('saved-1', definition, capabilities)).resolves.toEqual(saved);
        expect(api.create).toHaveBeenCalledWith(definition);
        expect(api.update).toHaveBeenCalledWith('saved-1', definition);
    });

    it('loads and validates saved definitions against current capabilities', async () => {
        const api = createApi();
        const manager = new SavedScreenManager(api);
        const controller = new AbortController();

        await expect(manager.load('saved-1', capabilities, controller.signal)).resolves.toEqual(saved);
        expect(api.get).toHaveBeenCalledWith('saved-1', controller.signal);

        const invalidManager = new SavedScreenManager(createApi({
            get: vi.fn().mockResolvedValue({
                ...saved,
                filters: {
                    logic: 'and',
                    conditions: [{
                        fieldId: 'technical.indicator.90.value1',
                        valueType: 'number',
                        operator: 'gt',
                        value: 20,
                    }],
                },
            }),
        }));
        await expect(invalidManager.load('saved-1', capabilities)).rejects.toBeInstanceOf(
            InvalidSavedScreenError,
        );
    });

    it('rejects an invalid definition before sending it to persistence', async () => {
        const api = createApi();
        const manager = new SavedScreenManager(api);
        const invalid = {
            ...definition,
            filters: {
                logic: 'and' as const,
                conditions: [{
                    fieldId: 'price.eod.close' as const,
                    valueType: 'number' as const,
                    operator: 'gt' as const,
                    value: Number.NaN,
                }],
            },
        };

        expect(() => manager.create(invalid, capabilities)).toThrow(InvalidSavedScreenError);
        expect(api.create).not.toHaveBeenCalled();
    });

    it('renames and duplicates with trimmed names, and rejects blank names', async () => {
        const api = createApi();
        const manager = new SavedScreenManager(api);

        await expect(manager.rename('saved-1', '  Renamed  ')).resolves.toMatchObject({ name: 'Renamed' });
        await expect(manager.duplicate('saved-1', '  Copy  ')).resolves.toMatchObject({ name: 'Copy' });
        expect(api.rename).toHaveBeenCalledWith('saved-1', 'Renamed');
        expect(api.duplicate).toHaveBeenCalledWith('saved-1', 'Copy');
        expect(() => manager.rename('saved-1', '  ')).toThrow('Screen name is required.');
        expect(() => manager.duplicate('saved-1', '')).toThrow('Screen name is required.');
    });

    it('deletes by saved-screen ID and propagates API failures without mutating the definition', async () => {
        const failure = new Error('Persistence unavailable');
        const api = createApi({ delete: vi.fn().mockRejectedValue(failure) });
        const manager = new SavedScreenManager(api);
        const before = JSON.stringify(definition);

        await expect(manager.delete('saved-1')).rejects.toBe(failure);
        expect(api.delete).toHaveBeenCalledWith('saved-1');
        expect(JSON.stringify(definition)).toBe(before);
    });

    it('detects unsaved changes in full screen state while ignoring object key order', () => {
        const baseline = {
            name: definition.name,
            scope: definition.scope,
            filters: definition.filters,
            sort: definition.sort,
        };
        const sameWithDifferentKeyOrder = {
            sort: definition.sort,
            filters: definition.filters,
            scope: definition.scope,
            name: definition.name,
        };

        expect(hasUnsavedScreenChanges(baseline, sameWithDifferentKeyOrder)).toBe(false);
        expect(hasUnsavedScreenChanges({ ...baseline, name: 'Changed' }, baseline)).toBe(true);
        expect(hasUnsavedScreenChanges({
            ...baseline,
            scope: { ...definition.scope, currencyCodes: ['USD'] },
        }, baseline)).toBe(true);
    });
});
