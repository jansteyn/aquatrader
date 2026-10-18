import type {
    ExecuteScreenerRequest,
    ExecuteScreenerResponse,
} from '../models/screener';

export interface ScreenerExecutionApi {
    execute(
        request: ExecuteScreenerRequest,
        signal?: AbortSignal,
    ): Promise<ExecuteScreenerResponse>;
}

export const SCREENER_EXECUTION_BACKEND_STATUS = {
    state: 'not-implemented',
    proposedRoute: 'POST /api/screener/execute',
    blocker:
        'No existing HTTP endpoint accepts arbitrary screener filters, market scope, sorting, or pagination.',
} as const;

export const SCREENER_EXECUTION_CONTRACT_REQUIREMENTS = [
    'Filter active listings on the server using typed field identifiers and field-specific operators.',
    'Apply exchange, currency, and market-country scope conjunctively across multiple selected markets.',
    'Resolve latest EOD independently for each listing; when a requested as-of date is added, use the latest price date on or before that date.',
    'Evaluate technical-indicator conditions from persisted backend-calculated indicator values keyed by configuration ID and output index.',
    'Apply server-side sorting and pagination before returning rows, and provide total count when supported.',
    'Return stable listing and instrument IDs, exchange and currency identity, EOD date/OHLCV, and matched metric values.',
    'Honor an optional HTTP AbortSignal in the eventual client implementation.',
] as const;

export type ScreenerExecutionOutcome =
    | { status: 'success'; response: ExecuteScreenerResponse }
    | { status: 'error'; error: unknown }
    | { status: 'cancelled' }
    | { status: 'stale' };

export class LatestScreenerExecution {
    private sequence = 0;
    private activeController: AbortController | null = null;
    private readonly manuallyCancelled = new WeakSet<AbortController>();

    async execute(
        api: ScreenerExecutionApi,
        request: ExecuteScreenerRequest,
    ): Promise<ScreenerExecutionOutcome> {
        this.activeController?.abort();
        const controller = new AbortController();
        this.activeController = controller;
        const sequence = ++this.sequence;

        try {
            const response = await api.execute(request, controller.signal);
            return sequence === this.sequence
                ? { status: 'success', response }
                : { status: 'stale' };
        } catch (error) {
            if (this.manuallyCancelled.has(controller)) {
                return { status: 'cancelled' };
            }
            if (sequence !== this.sequence) {
                return { status: 'stale' };
            }
            if (controller.signal.aborted) {
                return { status: 'cancelled' };
            }
            return { status: 'error', error };
        } finally {
            if (sequence === this.sequence) {
                this.activeController = null;
            }
        }
    }

    cancel(): void {
        ++this.sequence;
        if (this.activeController) {
            this.manuallyCancelled.add(this.activeController);
            this.activeController.abort();
        }
        this.activeController = null;
    }
}
