import type { SavedScreensApi, SavedScreenerDefinition } from '../api/savedScreensApi';
import type {
    ScreenerBackendCapabilities,
    ScreenerDefinition,
} from './screener';
import { validateScreenerDefinition } from './screener.validation';

export class InvalidSavedScreenError extends Error {
    readonly validationErrors: readonly string[];

    constructor(validationErrors: readonly string[]) {
        super(`Saved screen is no longer valid: ${validationErrors.join(' ')}`);
        this.name = 'InvalidSavedScreenError';
        this.validationErrors = validationErrors;
    }
}

function validateDefinition(
    definition: ScreenerDefinition,
    capabilities: ScreenerBackendCapabilities,
): void {
    const errors = validateScreenerDefinition(definition, capabilities);
    if (errors.length > 0) {
        throw new InvalidSavedScreenError(errors);
    }
}

export class SavedScreenManager {
    private readonly api: SavedScreensApi;

    constructor(api: SavedScreensApi) {
        this.api = api;
    }

    list(signal?: AbortSignal): Promise<readonly SavedScreenerDefinition[]> {
        return this.api.list(signal);
    }

    async load(
        id: string,
        capabilities: ScreenerBackendCapabilities,
        signal?: AbortSignal,
    ): Promise<SavedScreenerDefinition> {
        const definition = await this.api.get(id, signal);
        validateDefinition(definition, capabilities);
        return definition;
    }

    create(
        definition: ScreenerDefinition,
        capabilities: ScreenerBackendCapabilities,
    ): Promise<SavedScreenerDefinition> {
        validateDefinition(definition, capabilities);
        return this.api.create(definition);
    }

    update(
        id: string,
        definition: ScreenerDefinition,
        capabilities: ScreenerBackendCapabilities,
    ): Promise<SavedScreenerDefinition> {
        validateDefinition(definition, capabilities);
        return this.api.update(id, definition);
    }

    rename(id: string, name: string): Promise<SavedScreenerDefinition> {
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new Error('Screen name is required.');
        }
        return this.api.rename(id, normalizedName);
    }

    duplicate(id: string, name: string): Promise<SavedScreenerDefinition> {
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new Error('Screen name is required.');
        }
        return this.api.duplicate(id, normalizedName);
    }

    delete(id: string): Promise<void> {
        return this.api.delete(id);
    }
}

export function hasUnsavedScreenChanges(
    current: unknown,
    baseline: unknown,
): boolean {
    return stableStringify(current) !== stableStringify(baseline);
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
        return `{${entries
            .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
}
