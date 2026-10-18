import type { ScreenerDefinition } from '../models/screener';

export type SavedScreenerDefinition = ScreenerDefinition & { id: string };

export interface SavedScreensApi {
    list(signal?: AbortSignal): Promise<readonly SavedScreenerDefinition[]>;
    get(id: string, signal?: AbortSignal): Promise<SavedScreenerDefinition>;
    create(definition: ScreenerDefinition): Promise<SavedScreenerDefinition>;
    update(id: string, definition: ScreenerDefinition): Promise<SavedScreenerDefinition>;
    rename(id: string, name: string): Promise<SavedScreenerDefinition>;
    duplicate(id: string, name: string): Promise<SavedScreenerDefinition>;
    delete(id: string): Promise<void>;
}

export const SAVED_SCREENS_BACKEND_STATUS = {
    state: 'not-implemented',
    routes: {
        list: 'GET /api/screener/saved',
        create: 'POST /api/screener/saved',
        get: 'GET /api/screener/saved/{id}',
        update: 'PUT /api/screener/saved/{id}',
        rename: 'PATCH /api/screener/saved/{id}/name',
        duplicate: 'POST /api/screener/saved/{id}/duplicate',
        delete: 'DELETE /api/screener/saved/{id}',
    },
    userScope:
        'The server must scope every operation to request.user_id from the authenticated NpgsqlRest context; clients must not submit an owner ID.',
    examplesSupported: false,
    blocker:
        'The current backend exposes no saved-screen persistence or predefined-screen endpoints.',
} as const;
