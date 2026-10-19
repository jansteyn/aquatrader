import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type {
    IMarketCurrenciesResponse,
} from '../../api/aquatrader_marketTypes';
import type {
    ExecuteScreenerRequest,
    ExecuteScreenerResponse,
    ScreenerComparisonOperator,
    ScreenerDefinition,
    ScreenerFilterCondition,
    ScreenerFilterGroup,
    ScreenerEodSnapshot,
    ScreenerFieldDefinition,
    ScreenerResult,
    ScreenerSort,
} from './models/screener';
import {
    ScreenerFilterBuilder,
} from './components/ScreenerFilterBuilder';
import { validateScreenerFilterDraft, type ScreenerFilterDraft } from './models/screenerFilterDraft';
import { useScreenerMetadata } from './metadata/useScreenerMetadata';
import { SCREENER_METADATA_BACKEND_STATUS } from './metadata/screenerMetadataApi';
import type { SavedScreenerDefinition } from './api/savedScreensApi';
import { hasUnsavedScreenChanges } from './models/savedScreenManagement';
import {
    screenerScreenerExecute,
    screenerScreenerSaved,
    screenerScreenerSaved1,
    screenerScreenerSavedId,
    screenerScreenerSavedId1,
    screenerScreenerSavedId2,
    screenerScreenerSavedIdDuplicate,
    screenerScreenerSavedIdName,
} from '../../api/aquatrader_screener';

const SAVED_SCREENS_QUERY_KEY = ['screener', 'saved'] as const;
const DEFAULT_PAGE_SIZE = 50;

interface ScreenDraftSnapshot {
    id: string | null;
    name: string;
    scope: {
        exchangeIds: number[];
        currencyCodes: string[];
        marketCountryCodes: string[];
    };
    filters: ScreenerFilterDraft[];
    filterLogic: ScreenerFilterGroup['logic'];
    sort: ScreenerSort | null;
}

type ScreenerApiResult<T> = {
    status: number;
    response: T;
    error?: { title?: string; detail?: string | null } | undefined;
};

function requireScreenerApiSuccess<T>(result: ScreenerApiResult<T>): T {
    if (result.status < 200 || result.status >= 300) {
        throw new Error(
            result.error?.detail ??
                result.error?.title ??
                `Screener request failed (HTTP ${result.status}).`,
        );
    }
    return result.response;
}

function isSavedScreenerDefinition(value: unknown): value is SavedScreenerDefinition {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const definition = value as Record<string, unknown>;
    const scope = definition.scope;
    const filters = definition.filters;
    if (
        typeof scope !== 'object' ||
        scope === null ||
        typeof filters !== 'object' ||
        filters === null
    ) {
        return false;
    }
    const screenScope = scope as Record<string, unknown>;
    const filterGroup = filters as Record<string, unknown>;
    return (
        typeof definition.id === 'string' &&
        typeof definition.name === 'string' &&
        (screenScope.exchangeIds === undefined ||
            (Array.isArray(screenScope.exchangeIds) &&
                screenScope.exchangeIds.every((id) => typeof id === 'number'))) &&
        (screenScope.currencyCodes === undefined ||
            (Array.isArray(screenScope.currencyCodes) &&
                screenScope.currencyCodes.every((code) => typeof code === 'string'))) &&
        (screenScope.marketCountryCodes === undefined ||
            (Array.isArray(screenScope.marketCountryCodes) &&
                screenScope.marketCountryCodes.every((code) => typeof code === 'string'))) &&
        (filterGroup.logic === 'and' || filterGroup.logic === 'or') &&
        Array.isArray(filterGroup.conditions)
    );
}

function readSavedScreenerDefinition(value: unknown): SavedScreenerDefinition {
    if (!isSavedScreenerDefinition(value)) {
        throw new Error('The screener API returned an invalid saved screen.');
    }
    return value;
}

function readSavedScreenerList(value: unknown): readonly SavedScreenerDefinition[] {
    if (!Array.isArray(value)) {
        throw new Error('The screener API returned an invalid saved-screen list.');
    }
    return value.map(readSavedScreenerDefinition);
}

function readExecutionResponse(value: unknown): ExecuteScreenerResponse {
    if (
        typeof value !== 'object' ||
        value === null ||
        !Array.isArray((value as Partial<ExecuteScreenerResponse>).results)
    ) {
        throw new Error('The screener API returned invalid results.');
    }
    return value as ExecuteScreenerResponse;
}

function createFilterGroup(
    filters: readonly ScreenerFilterDraft[],
    logic: ScreenerFilterGroup['logic'],
    fields: readonly ScreenerFieldDefinition[],
): ScreenerFilterGroup {
    const conditions = filters.map((filter): ScreenerFilterCondition => {
        const validationError = validateScreenerFilterDraft(filter, fields);
        if (validationError) {
            const field = fields.find((item) => item.fieldId === filter.fieldId);
            throw new Error(`${field?.label ?? filter.fieldId}: ${validationError}`);
        }

        const field = fields.find((item) => item.fieldId === filter.fieldId);
        if (!field) {
            throw new Error(`Unknown screener field "${filter.fieldId}".`);
        }
        if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
            return { fieldId: filter.fieldId, valueType: field.valueType, operator: filter.operator };
        }
        if (filter.operator === 'between') {
            if (field.valueType === 'number') {
                return {
                    fieldId: filter.fieldId,
                    valueType: field.valueType,
                    operator: filter.operator,
                    value: Number(filter.value),
                    secondValue: Number(filter.secondValue),
                };
            }
            if (field.valueType === 'date') {
                return {
                    fieldId: filter.fieldId,
                    valueType: field.valueType,
                    operator: filter.operator,
                    value: filter.value,
                    secondValue: filter.secondValue,
                };
            }
            throw new Error(`The between operator is not valid for "${field.label}".`);
        }
        if (field.valueType === 'number') {
            if (!isComparisonOperator(filter.operator)) {
                throw new Error(`The selected operator is not valid for "${field.label}".`);
            }
            return {
                fieldId: filter.fieldId,
                valueType: field.valueType,
                operator: filter.operator,
                value: Number(filter.value),
            };
        }
        if (field.valueType === 'date') {
            if (!isComparisonOperator(filter.operator)) {
                throw new Error(`The selected operator is not valid for "${field.label}".`);
            }
            return {
                fieldId: filter.fieldId,
                valueType: field.valueType,
                operator: filter.operator,
                value: filter.value,
            };
        }
        if (field.valueType === 'boolean') {
            if (filter.operator !== 'eq' && filter.operator !== 'neq') {
                throw new Error(`The selected operator is not valid for "${field.label}".`);
            }
            return {
                fieldId: filter.fieldId,
                valueType: field.valueType,
                operator: filter.operator,
                value: filter.value === 'true',
            };
        }
        if (filter.operator !== 'eq' && filter.operator !== 'neq') {
            throw new Error(`The selected operator is not valid for "${field.label}".`);
        }
        return {
            fieldId: filter.fieldId,
            valueType: field.valueType,
            operator: filter.operator,
            value: filter.value,
        };
    });
    return { logic, conditions };
}

function isComparisonOperator(
    operator: ScreenerFilterDraft['operator'],
): operator is ScreenerComparisonOperator {
    return (
        operator === 'eq' ||
        operator === 'neq' ||
        operator === 'gt' ||
        operator === 'gte' ||
        operator === 'lt' ||
        operator === 'lte'
    );
}

function createScreenDefinition(
    name: string,
    scope: ScreenerDefinition['scope'],
    filters: readonly ScreenerFilterDraft[],
    filterLogic: ScreenerFilterGroup['logic'],
    sort: ScreenerSort | null,
    fields: readonly ScreenerFieldDefinition[],
): ScreenerDefinition {
    return {
        name: name.trim(),
        scope,
        filters: createFilterGroup(filters, filterLogic, fields),
        ...(sort ? { sort } : {}),
    };
}

function flattenSavedFilters(group: ScreenerFilterGroup): ScreenerFilterDraft[] {
    return group.conditions.map((condition, index) => {
        if ('logic' in condition) {
            throw new Error('Nested saved-screen filters are not supported by this editor.');
        }
        return {
            id: index + 1,
            fieldId: condition.fieldId,
            operator: condition.operator,
            value: 'value' in condition ? String(condition.value) : '',
            secondValue: 'secondValue' in condition ? String(condition.secondValue) : '',
        };
    });
}

function formatPrice(
    snapshot: ScreenerEodSnapshot | null,
    currencyCode: string | null,
    currencies: readonly IMarketCurrenciesResponse[],
): string {
    if (snapshot?.close == null) {
        return '—';
    }

    const decimalPlaces = currencies.find((currency) => currency.code === currencyCode)?.decimalPlaces;
    const precisionOptions =
        decimalPlaces == null
            ? { maximumFractionDigits: 8 }
            : { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces };
    return `${snapshot.close.toLocaleString(undefined, precisionOptions)}${currencyCode ? ` ${currencyCode}` : ''}`;
}

export type ScreenerResultState = 'idle' | 'loading' | 'error' | 'empty' | 'ready' | 'partial';

export interface ScreenerResultsProps {
    state: ScreenerResultState;
    results?: readonly ScreenerResult[];
    totalCount?: number;
    error?: string;
    onRetry?: () => void;
    currencies?: readonly IMarketCurrenciesResponse[];
    fields?: readonly ScreenerFieldDefinition[];
}

export function ScreenerResults({
    state,
    results = [],
    totalCount,
    error,
    onRetry,
    currencies = [],
    fields = [],
}: ScreenerResultsProps) {
    const hasPartialData = results.some((result) => result.latestEod == null);
    const effectiveState = state === 'ready' && hasPartialData ? 'partial' : state;
    const metricFieldIds = [...new Set(results.flatMap((result) => Object.keys(result.metrics)))];

    return (
        <Card component="section" aria-labelledby="screener-results-title">
            <CardContent>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{
                        mb: 2,
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                    }}
                >
                    <Box>
                        <Typography id="screener-results-title" variant="h5" component="h2">
                            Results
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {totalCount == null
                                ? 'Result count is not available.'
                                : `${totalCount.toLocaleString()} matching listings`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Results are sorted and paginated by the screener service.
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={
                            effectiveState === 'loading'
                                ? 'Running'
                                : effectiveState === 'error'
                                  ? 'Execution failed'
                                  : effectiveState === 'idle'
                                    ? 'Not run'
                                    : 'Execution complete'
                        }
                        color={effectiveState === 'error' ? 'error' : 'default'}
                        variant="outlined"
                    />
                </Stack>

                {effectiveState === 'loading' && (
                    <Stack direction="row" spacing={1.5} role="status" sx={{ py: 4, alignItems: 'center' }}>
                        <CircularProgress size={22} />
                        <Typography>Loading screen results…</Typography>
                    </Stack>
                )}
                {effectiveState === 'error' && (
                    <Alert
                        severity="error"
                        action={
                            onRetry ? (
                                <Button color="inherit" size="small" onClick={onRetry}>
                                    Retry
                                </Button>
                            ) : undefined
                        }
                    >
                        {error ?? 'Unable to load screen results.'}
                    </Alert>
                )}
                {effectiveState === 'empty' && (
                    <Alert severity="info">
                        No matching listings.
                    </Alert>
                )}
                {effectiveState === 'idle' && (
                    <Box
                        sx={{
                            py: { xs: 4, sm: 6 },
                            px: 2,
                            textAlign: 'center',
                            border: 1,
                            borderColor: 'divider',
                            borderStyle: 'dashed',
                            borderRadius: 1,
                        }}
                    >
                        <Typography variant="h6" component="p">
                            No results yet
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            Run a screen to see matching listings.
                        </Typography>
                    </Box>
                )}
                {effectiveState === 'partial' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Some listings are missing latest EOD price data. Prices are shown in each
                        listing’s own currency.
                    </Alert>
                )}
                {(effectiveState === 'ready' || effectiveState === 'partial') && results.length > 0 && (
                    <TableContainer sx={{ maxHeight: 560 }}>
                        <Table stickyHeader size="small" aria-label="Screener results">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Symbol</TableCell>
                                    <TableCell>Instrument</TableCell>
                                    <TableCell>Exchange</TableCell>
                                    <TableCell>Currency</TableCell>
                                    <TableCell align="right">Latest close</TableCell>
                                    <TableCell align="right">Volume</TableCell>
                                    <TableCell>Price date</TableCell>
                                    {metricFieldIds.map((fieldId) => (
                                        <TableCell key={fieldId} align="right">
                                            {fields.find((field) => field.fieldId === fieldId)?.label ?? fieldId}
                                        </TableCell>
                                    ))}
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.map((result) => (
                                    <TableRow key={result.listingId} hover>
                                        <TableCell>{result.symbol ?? '—'}</TableCell>
                                        <TableCell>{result.displayName ?? '—'}</TableCell>
                                        <TableCell>{result.exchangeName ?? result.mic ?? '—'}</TableCell>
                                        <TableCell>{result.currencyCode ?? '—'}</TableCell>
                                        <TableCell align="right">
                                            {formatPrice(result.latestEod, result.currencyCode, currencies)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {result.latestEod?.volume?.toLocaleString() ?? '—'}
                                        </TableCell>
                                        <TableCell>{result.latestEod?.priceDate ?? '—'}</TableCell>
                                        {metricFieldIds.map((fieldId) => {
                                            const value = result.metrics[fieldId];
                                            return (
                                                <TableCell key={fieldId} align="right">
                                                    {typeof value === 'number'
                                                        ? value.toLocaleString()
                                                        : value == null
                                                          ? '—'
                                                          : String(value)}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell>
                                            <Button
                                                component={RouterLink}
                                                size="small"
                                                to={`/listing/eod-chart/${result.listingId}`}
                                                aria-label={`Open chart for ${result.symbol ?? result.listingId}`}
                                            >
                                                Open chart
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function ScreenerPage() {
    const queryClient = useQueryClient();
    const [screenName, setScreenName] = useState('Untitled screen');
    const [activeSavedScreenId, setActiveSavedScreenId] = useState<string | null>(null);
    const [filters, setFilters] = useState<ScreenerFilterDraft[]>([]);
    const [filterLogic, setFilterLogic] = useState<ScreenerFilterGroup['logic']>('and');
    const [selectedExchangeIds, setSelectedExchangeIds] = useState<number[]>([]);
    const [selectedCurrencyCodes, setSelectedCurrencyCodes] = useState<string[]>([]);
    const [selectedMarketCountryCodes, setSelectedMarketCountryCodes] = useState<string[]>([]);
    const [sort, setSort] = useState<ScreenerSort | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [saveAsOpen, setSaveAsOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [saveAsError, setSaveAsError] = useState<string | null>(null);
    const [saveAsSourceId, setSaveAsSourceId] = useState<string | null>(null);
    const [renameTarget, setRenameTarget] = useState<SavedScreenerDefinition | null>(null);
    const [renameName, setRenameName] = useState('');
    const [renameError, setRenameError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SavedScreenerDefinition | null>(null);
    const [resultState, setResultState] = useState<ScreenerResultState>('idle');
    const [results, setResults] = useState<readonly ScreenerResult[]>([]);
    const [totalCount, setTotalCount] = useState<number | undefined>();
    const [executionError, setExecutionError] = useState<string>();
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
    const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
    const [baseline, setBaseline] = useState<ScreenDraftSnapshot>(() => initialScreenDraft());
    const metadata = useScreenerMetadata();
    const { exchanges, currencies, fields } = metadata;
    const savedScreensQuery = useQuery({
        queryKey: SAVED_SCREENS_QUERY_KEY,
        queryFn: async () =>
            readSavedScreenerList(
                requireScreenerApiSuccess(await screenerScreenerSaved1()),
            ),
    });
    const createSavedScreen = useMutation({
        mutationFn: async (definition: ScreenerDefinition) =>
            readSavedScreenerDefinition(
                requireScreenerApiSuccess(await screenerScreenerSaved({ the: definition })),
            ),
    });
    const updateSavedScreen = useMutation({
        mutationFn: async ({ id, definition }: { id: string; definition: ScreenerDefinition }) =>
            readSavedScreenerDefinition(
                requireScreenerApiSuccess(await screenerScreenerSavedId2({ id, the: definition })),
            ),
    });
    const renameSavedScreen = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) =>
            readSavedScreenerDefinition(
                requireScreenerApiSuccess(
                    await screenerScreenerSavedIdName({ id, contains: { name } }),
                ),
            ),
    });
    const duplicateSavedScreen = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) =>
            readSavedScreenerDefinition(
                requireScreenerApiSuccess(
                    await screenerScreenerSavedIdDuplicate({ id, contains: { name } }),
                ),
            ),
    });
    const deleteSavedScreen = useMutation({
        mutationFn: async (id: string) =>
            requireScreenerApiSuccess(await screenerScreenerSavedId({ id })),
    });
    const executeScreener = useMutation({
        mutationFn: async (request: ExecuteScreenerRequest) =>
            readExecutionResponse(
                requireScreenerApiSuccess(await screenerScreenerExecute({ the: request })),
            ),
    });

    const currentDraft = {
        id: activeSavedScreenId,
        name: screenName,
        scope: {
            exchangeIds: selectedExchangeIds,
            currencyCodes: selectedCurrencyCodes,
            marketCountryCodes: selectedMarketCountryCodes,
        },
        filters,
        filterLogic,
        sort,
    };
    const hasUnsavedChanges = hasUnsavedScreenChanges(currentDraft, baseline);

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [hasUnsavedChanges]);

    function resetScreen(name = 'Untitled screen') {
        setActiveSavedScreenId(null);
        setScreenName(name);
        setFilters([]);
        setFilterLogic('and');
        setSelectedExchangeIds([]);
        setSelectedCurrencyCodes([]);
        setSelectedMarketCountryCodes([]);
        setSort(null);
        setBaseline(initialScreenDraft(name));
        setNotice('Started a new screen. It has not been saved.');
        setDiscardDialogOpen(false);
        setPendingLoadId(null);
    }

    function requestNewScreen() {
        if (hasUnsavedChanges) {
            setPendingLoadId(null);
            setDiscardDialogOpen(true);
            return;
        }
        resetScreen();
    }

    function currentScreenDefinition(name = screenName): ScreenerDefinition {
        if (!name.trim()) {
            throw new Error('Enter a screen name before saving.');
        }
        return createScreenDefinition(
            name,
            currentDraft.scope,
            filters,
            filterLogic,
            sort,
            fields,
        );
    }

    function updateBaseline(id: string | null, name = screenName) {
        setBaseline({
            id,
            name,
            scope: {
                exchangeIds: [...selectedExchangeIds],
                currencyCodes: [...selectedCurrencyCodes],
                marketCountryCodes: [...selectedMarketCountryCodes],
            },
            filters: filters.map((filter) => ({ ...filter })),
            filterLogic,
            sort,
        });
    }

    async function saveCurrentScreen() {
        try {
            const definition = currentScreenDefinition();
            const savedScreen = activeSavedScreenId
                ? await updateSavedScreen.mutateAsync({
                      id: activeSavedScreenId,
                      definition,
                  })
                : await createSavedScreen.mutateAsync(definition);
            setActiveSavedScreenId(savedScreen.id);
            setScreenName(savedScreen.name);
            updateBaseline(savedScreen.id, savedScreen.name);
            await queryClient.invalidateQueries({ queryKey: SAVED_SCREENS_QUERY_KEY });
            setNotice(`Saved "${savedScreen.name}".`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Unable to save this screen.');
        }
    }

    function requestLoadSavedScreen(id: string) {
        if (hasUnsavedChanges) {
            setPendingLoadId(id);
            setDiscardDialogOpen(true);
            return;
        }
        void loadSavedScreen(id);
    }

    function discardPendingScreenChanges() {
        const loadId = pendingLoadId;
        setPendingLoadId(null);
        setDiscardDialogOpen(false);
        if (loadId) {
            void loadSavedScreen(loadId);
        } else {
            resetScreen();
        }
    }

    async function saveAsScreen() {
        const name = saveAsName.trim();
        if (!name) {
            return;
        }
        try {
            if (saveAsSourceId) {
                const duplicate = await duplicateSavedScreen.mutateAsync({
                    id: saveAsSourceId,
                    name,
                });
                await queryClient.invalidateQueries({ queryKey: SAVED_SCREENS_QUERY_KEY });
                setSaveAsOpen(false);
                setSaveAsSourceId(null);
                setNotice(`Created "${duplicate.name}".`);
                return;
            }

            const definition = currentScreenDefinition(name);
            const savedScreen = await createSavedScreen.mutateAsync(definition);
            setActiveSavedScreenId(savedScreen.id);
            setScreenName(savedScreen.name);
            updateBaseline(savedScreen.id, savedScreen.name);
            await queryClient.invalidateQueries({ queryKey: SAVED_SCREENS_QUERY_KEY });
            setSaveAsOpen(false);
            setNotice(`Saved "${savedScreen.name}".`);
        } catch (error) {
            setSaveAsError(error instanceof Error ? error.message : 'Unable to save this screen.');
        }
    }

    async function loadSavedScreen(id: string) {
        try {
            const savedScreen = readSavedScreenerDefinition(
                requireScreenerApiSuccess(await screenerScreenerSavedId1({ id })),
            );
            const nextFilters = flattenSavedFilters(savedScreen.filters);
            const nextScope = savedScreen.scope;
            const nextExchangeIds = [...(nextScope.exchangeIds ?? [])];
            const nextCurrencyCodes = [...(nextScope.currencyCodes ?? [])];
            const nextMarketCountryCodes = [...(nextScope.marketCountryCodes ?? [])];
            setActiveSavedScreenId(savedScreen.id);
            setScreenName(savedScreen.name);
            setFilters(nextFilters);
            setFilterLogic(savedScreen.filters.logic);
            setSelectedExchangeIds(nextExchangeIds);
            setSelectedCurrencyCodes(nextCurrencyCodes);
            setSelectedMarketCountryCodes(nextMarketCountryCodes);
            setSort(savedScreen.sort ?? null);
            setBaseline({
                id: savedScreen.id,
                name: savedScreen.name,
                scope: {
                    exchangeIds: nextExchangeIds,
                    currencyCodes: nextCurrencyCodes,
                    marketCountryCodes: nextMarketCountryCodes,
                },
                filters: nextFilters,
                filterLogic: savedScreen.filters.logic,
                sort: savedScreen.sort ?? null,
            });
            setResultState('idle');
            setResults([]);
            setTotalCount(undefined);
            setNotice(`Loaded "${savedScreen.name}".`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Unable to load this screen.');
        }
    }

    async function saveRename() {
        if (!renameTarget || !renameName.trim()) {
            return;
        }
        try {
            const renamed = await renameSavedScreen.mutateAsync({
                id: renameTarget.id,
                name: renameName.trim(),
            });
            if (activeSavedScreenId === renamed.id) {
                setScreenName(renamed.name);
                updateBaseline(renamed.id, renamed.name);
            }
            await queryClient.invalidateQueries({ queryKey: SAVED_SCREENS_QUERY_KEY });
            setRenameTarget(null);
            setNotice(`Renamed screen to "${renamed.name}".`);
        } catch (error) {
            setRenameError(error instanceof Error ? error.message : 'Unable to rename this screen.');
        }
    }

    async function confirmDeleteSavedScreen() {
        if (!deleteTarget) {
            return;
        }
        try {
            await deleteSavedScreen.mutateAsync(deleteTarget.id);
            if (activeSavedScreenId === deleteTarget.id) {
                setActiveSavedScreenId(null);
            }
            await queryClient.invalidateQueries({ queryKey: SAVED_SCREENS_QUERY_KEY });
            setNotice(`Deleted "${deleteTarget.name}".`);
            setDeleteTarget(null);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Unable to delete this screen.');
        }
    }

    async function runScreen() {
        setResultState('loading');
        setExecutionError(undefined);
        setResults([]);
        setTotalCount(undefined);
        try {
            const definition = currentScreenDefinition();
            const request: ExecuteScreenerRequest = {
                scope: definition.scope,
                filters: definition.filters,
                ...(definition.sort ? { sort: definition.sort } : {}),
                pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE },
                eodDate: { mode: 'latestPerListing' },
            };
            const response = await executeScreener.mutateAsync(request);
            setResults(response.results);
            setTotalCount(response.pagination?.totalCount);
            setResultState(response.results.length === 0 ? 'empty' : 'ready');
        } catch (error) {
            setExecutionError(error instanceof Error ? error.message : 'Unable to run this screen.');
            setResultState('error');
        }
    }

    const selectedExchanges = exchanges.filter((exchange) =>
        selectedExchangeIds.includes(exchange.id ?? -1),
    );
    const selectedCurrencies = currencies.filter((currency) =>
        selectedCurrencyCodes.includes(currency.code ?? ''),
    );
    const exchangeError = metadata.exchangeError instanceof Error ? metadata.exchangeError : null;
    const currencyError = metadata.currencyError instanceof Error ? metadata.currencyError : null;
    const technicalError = metadata.technicalErrors[0] ?? null;

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
            <Stack spacing={3}>
                <Box
                    component="header"
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', lg: 'row' },
                        alignItems: { xs: 'stretch', lg: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography variant="overline" color="primary">
                            Research workspace
                        </Typography>
                        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                            Stock Screener
                        </Typography>
                        <Typography color="text.secondary">
                            Build a market-aware screen and review its matching listings.
                        </Typography>
                    </Box>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                    >
                        <TextField
                            label="Current screen name"
                            value={screenName}
                            onChange={(event) => setScreenName(event.target.value)}
                            size="small"
                            sx={{ minWidth: { sm: 210 } }}
                        />
                        <Chip
                            size="small"
                            label={
                                hasUnsavedChanges
                                    ? 'Unsaved changes'
                                    : activeSavedScreenId
                                      ? 'Saved screen'
                                      : 'New screen'
                            }
                            color={hasUnsavedChanges ? 'warning' : 'default'}
                        />
                        <Button
                            variant="outlined"
                            onClick={requestNewScreen}
                        >
                            New screen
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ContentCopyOutlinedIcon />}
                            onClick={() => {
                                setSaveAsName(`${screenName} copy`);
                                setSaveAsError(null);
                                setSaveAsSourceId(null);
                                setSaveAsOpen(true);
                            }}
                        >
                            Save as
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<SaveOutlinedIcon />}
                            onClick={saveCurrentScreen}
                            disabled={createSavedScreen.isPending || updateSavedScreen.isPending}
                        >
                            Save
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => void runScreen()}
                            disabled={executeScreener.isPending}
                        >
                            {executeScreener.isPending ? 'Running…' : 'Run Screen'}
                        </Button>
                    </Stack>
                </Box>

                <Card component="section" aria-labelledby="saved-screens-title">
                    <CardContent>
                        <Stack spacing={1.5}>
                            <Typography id="saved-screens-title" variant="h5" component="h2">
                                Saved screens
                            </Typography>
                            {savedScreensQuery.isPending && (
                                <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
                                    <CircularProgress size={18} />
                                    <Typography>Loading saved screens…</Typography>
                                </Stack>
                            )}
                            {savedScreensQuery.error && (
                                <Alert
                                    severity="error"
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={() => void savedScreensQuery.refetch()}
                                        >
                                            Retry
                                        </Button>
                                    }
                                >
                                    {savedScreensQuery.error instanceof Error
                                        ? savedScreensQuery.error.message
                                        : 'Unable to load saved screens.'}
                                </Alert>
                            )}
                            {savedScreensQuery.data?.length === 0 && (
                                <Typography color="text.secondary">
                                    No saved screens yet.
                                </Typography>
                            )}
                            {savedScreensQuery.data?.map((savedScreen) => (
                                <Stack
                                    key={savedScreen.id}
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={1}
                                    sx={{
                                        alignItems: { xs: 'stretch', md: 'center' },
                                        justifyContent: 'space-between',
                                        p: 1.25,
                                        border: 1,
                                        borderColor:
                                            savedScreen.id === activeSavedScreenId ? 'primary.main' : 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    <Box>
                                        <Typography sx={{ fontWeight: 600 }}>{savedScreen.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {savedScreen.filters.conditions.length} top-level filter
                                            {savedScreen.filters.conditions.length === 1 ? '' : 's'}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                        <Button
                                            size="small"
                                            onClick={() => requestLoadSavedScreen(savedScreen.id)}
                                        >
                                            Load
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setRenameTarget(savedScreen);
                                                setRenameName(savedScreen.name);
                                                setRenameError(null);
                                            }}
                                        >
                                            Rename
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setSaveAsSourceId(savedScreen.id);
                                                setSaveAsName(`${savedScreen.name} copy`);
                                                setSaveAsError(null);
                                                setSaveAsOpen(true);
                                            }}
                                        >
                                            Duplicate
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => setDeleteTarget(savedScreen)}
                                        >
                                            Delete
                                        </Button>
                                    </Stack>
                                </Stack>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>

                <Card component="section" aria-labelledby="market-scope-title">
                    <CardContent>
                        <Stack spacing={2}>
                            <Box>
                                <Typography id="market-scope-title" variant="h5" component="h2">
                                    Market scope
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Choose one or more exchanges and currencies. Listings retain their
                                    own trading currency.
                                </Typography>
                            </Box>
                            {(exchangeError || currencyError) && (
                                <Alert
                                    severity="error"
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={() => void metadata.refetch()}
                                        >
                                            Retry
                                        </Button>
                                    }
                                >
                                    Unable to load market options:{' '}
                                    {[exchangeError?.message, currencyError?.message]
                                        .filter(Boolean)
                                        .join(' ')}
                                </Alert>
                            )}
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                                    gap: 2,
                                }}
                            >
                                <FormControl
                                    size="small"
                                    fullWidth
                                    disabled={metadata.marketLoading || !!exchangeError}
                                >
                                    <InputLabel id="exchange-scope-label">Exchanges</InputLabel>
                                    <Select
                                        labelId="exchange-scope-label"
                                        label="Exchanges"
                                        multiple
                                        value={selectedExchangeIds}
                                        onChange={(event) =>
                                            setSelectedExchangeIds(
                                                typeof event.target.value === 'string'
                                                    ? event.target.value.split(',').map(Number)
                                                    : event.target.value,
                                            )
                                        }
                                        renderValue={(ids) =>
                                            ids.length
                                                ? ids
                                                      .map((id) => exchanges.find((exchange) => exchange.id === id)?.shortName ?? String(id))
                                                      .join(', ')
                                                : 'All exchanges'
                                        }
                                    >
                                        {exchanges
                                            .filter((exchange) => exchange.id != null)
                                            .map((exchange) => (
                                                <MenuItem key={exchange.id} value={exchange.id!}>
                                                    {exchange.name ?? exchange.shortName ?? `Exchange ${exchange.id}`}
                                                    {exchange.mic ? ` (${exchange.mic})` : ''}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    <FormHelperText>
                                        {metadata.marketLoading
                                            ? 'Loading exchanges…'
                                            : exchanges.length === 0
                                              ? 'No exchange metadata is available.'
                                              : 'Leave empty to include all available exchanges.'}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl
                                    size="small"
                                    fullWidth
                                    disabled={metadata.marketLoading || !!currencyError}
                                >
                                    <InputLabel id="currency-scope-label">Currencies</InputLabel>
                                    <Select
                                        labelId="currency-scope-label"
                                        label="Currencies"
                                        multiple
                                        value={selectedCurrencyCodes}
                                        onChange={(event) =>
                                            setSelectedCurrencyCodes(
                                                typeof event.target.value === 'string'
                                                    ? event.target.value.split(',')
                                                    : event.target.value,
                                            )
                                        }
                                        renderValue={(codes) => codes.length ? codes.join(', ') : 'All currencies'}
                                    >
                                        {currencies
                                            .filter((currency) => currency.code != null)
                                            .map((currency) => (
                                                <MenuItem key={currency.code} value={currency.code!}>
                                                    {currency.code} — {currency.name}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    <FormHelperText>
                                        {metadata.marketLoading
                                            ? 'Loading currencies…'
                                            : currencies.length === 0
                                              ? 'No currency metadata is available.'
                                              : 'Leave empty to include all available currencies.'}
                                    </FormHelperText>
                                </FormControl>
                            </Box>
                            <Box aria-label="Selected market scope">
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Selected scope
                                </Typography>
                                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                    {selectedExchanges.length === 0 && selectedCurrencies.length === 0 && (
                                        <Chip label="All available markets and currencies" size="small" />
                                    )}
                                    {selectedExchanges.map((exchange) => (
                                        <Chip
                                            key={`exchange-${exchange.id}`}
                                            label={`${exchange.shortName ?? exchange.name} · ${exchange.mic ?? 'Exchange'}`}
                                            size="small"
                                        />
                                    ))}
                                    {selectedCurrencies.map((currency) => (
                                        <Chip
                                            key={`currency-${currency.code}`}
                                            label={`${currency.code} · ${currency.name}`}
                                            size="small"
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Card component="section" aria-labelledby="field-metadata-title">
                    <CardContent>
                        <Accordion disableGutters elevation={0}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="field-metadata-content"
                                id="field-metadata-summary"
                            >
                                <Box>
                                    <Typography id="field-metadata-title" variant="h6" component="h2">
                                        Filter metadata
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {metadata.fields.length} known fields ·{' '}
                                        {metadata.fields.filter((field) => field.filterable).length}{' '}
                                        backend-enabled
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails id="field-metadata-content">
                                <Stack spacing={2}>
                                    {metadata.technicalLoading && (
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            role="status"
                                            sx={{ alignItems: 'center' }}
                                        >
                                            <CircularProgress size={18} />
                                            <Typography>Loading technical indicator metadata…</Typography>
                                        </Stack>
                                    )}
                                    {technicalError && (
                                        <Alert
                                            severity="error"
                                            action={
                                                <Button
                                                    color="inherit"
                                                    size="small"
                                                    onClick={() => void metadata.refetch()}
                                                >
                                                    Retry
                                                </Button>
                                            }
                                        >
                                            Unable to load technical indicator metadata: {technicalError.message}
                                        </Alert>
                                    )}
                                    {!metadata.technicalLoading &&
                                        !technicalError &&
                                        metadata.indicators.length === 0 && (
                                            <Alert severity="info">
                                                No technical indicators are currently exposed by the
                                                indicator catalog.
                                            </Alert>
                                        )}
                                    <Alert severity="info">
                                        Market and indicator metadata is loaded from existing HTTP APIs.
                                        Those APIs do not expose screener field operators or filter
                                        support. Candidate fields below are not enabled for filtering
                                        until the proposed metadata contract (
                                        {SCREENER_METADATA_BACKEND_STATUS.proposedRoute}) is
                                        implemented. This is not a registered endpoint.
                                    </Alert>
                                    <TableContainer sx={{ maxHeight: 380 }}>
                                        <Table size="small" aria-label="Screener field metadata">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Field</TableCell>
                                                    <TableCell>Category</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell>Operators</TableCell>
                                                    <TableCell>Constraints / configuration</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {metadata.fields.map((field) => (
                                                    <TableRow key={field.fieldId}>
                                                        <TableCell>{field.label}</TableCell>
                                                        <TableCell>{field.category}</TableCell>
                                                        <TableCell>
                                                            {field.enumOptions?.length
                                                                ? 'enum'
                                                                : field.valueType}
                                                        </TableCell>
                                                        <TableCell>
                                                            {field.operators.length
                                                                ? field.operators.join(', ')
                                                                : 'Not advertised'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {field.technicalIndicator
                                                                ? `Config ${field.technicalIndicator.configurationId} · ${JSON.stringify(field.technicalIndicator.parameters)} · ${field.technicalIndicator.outputSeriesName}`
                                                                : field.enumOptions?.length
                                                                  ? `${field.enumOptions.length} values`
                                                                  : field.constraints
                                                                    ? JSON.stringify(field.constraints)
                                                                    : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {metadata.fields.length === 0 && !metadata.isLoading && (
                                                    <TableRow>
                                                        <TableCell colSpan={5}>
                                                            No field metadata is available.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Typography variant="caption" color="text.secondary">
                                        Indicator series are the persisted output columns Value 1–4.
                                        Indicator configurations (including their parameter JSON) have
                                        distinct field IDs.
                                    </Typography>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card component="section" aria-labelledby="filter-builder-title">
                    <CardContent>
                        <ScreenerFilterBuilder
                            fields={fields}
                            filters={filters}
                            logic={filterLogic}
                            onFiltersChange={setFilters}
                            onLogicChange={setFilterLogic}
                        />
                    </CardContent>
                </Card>

                <ScreenerResults
                    state={resultState}
                    results={results}
                    totalCount={totalCount}
                    error={executionError}
                    onRetry={() => void runScreen()}
                    currencies={currencies}
                    fields={fields}
                />

            </Stack>

            <Dialog open={saveAsOpen} onClose={() => setSaveAsOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{saveAsSourceId ? 'Duplicate saved screen' : 'Save screen as'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Screen name"
                        fullWidth
                        value={saveAsName}
                        onChange={(event) => setSaveAsName(event.target.value)}
                        error={!!saveAsError}
                    />
                    {saveAsError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {saveAsError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveAsOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => void saveAsScreen()}
                        disabled={
                            !saveAsName.trim() ||
                            createSavedScreen.isPending ||
                            duplicateSavedScreen.isPending
                        }
                        variant="contained"
                    >
                        {saveAsSourceId ? 'Duplicate' : 'Save copy'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={renameTarget !== null}
                onClose={() => setRenameTarget(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Rename saved screen</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Screen name"
                        fullWidth
                        value={renameName}
                        onChange={(event) => setRenameName(event.target.value)}
                        error={!!renameError}
                    />
                    {renameError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {renameError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
                    <Button
                        onClick={() => void saveRename()}
                        disabled={!renameName.trim() || renameSavedScreen.isPending}
                        variant="contained"
                    >
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                aria-labelledby="delete-saved-screen-title"
            >
                <DialogTitle id="delete-saved-screen-title">Delete saved screen?</DialogTitle>
                <DialogContent>
                    This will permanently delete “{deleteTarget?.name}”.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button
                        color="error"
                        onClick={() => void confirmDeleteSavedScreen()}
                        disabled={deleteSavedScreen.isPending}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <UnsavedChangesDialog
                open={discardDialogOpen}
                onCancel={() => {
                    setDiscardDialogOpen(false);
                    setPendingLoadId(null);
                }}
                onDiscard={discardPendingScreenChanges}
                message={
                    pendingLoadId
                        ? 'Loading another screen will discard your current changes.'
                        : undefined
                }
                discardLabel={pendingLoadId ? 'Discard and load' : 'Discard changes'}
            />
            <Snackbar
                open={!!notice}
                autoHideDuration={5000}
                onClose={() => setNotice(null)}
                message={notice}
            />
        </Container>
    );
}

function initialScreenDraft(name = 'Untitled screen'): ScreenDraftSnapshot {
    return {
        id: null,
        name,
        scope: {
            exchangeIds: [],
            currencyCodes: [],
            marketCountryCodes: [],
        },
        filters: [],
        filterLogic: 'and',
        sort: null,
    };
}

export function UnsavedChangesDialog({
    open,
    onCancel,
    onDiscard,
    message = 'Your current screen has unsaved changes. Starting a new screen will discard them.',
    discardLabel = 'Discard changes',
}: {
    open: boolean;
    onCancel: () => void;
    onDiscard: () => void;
    message?: string;
    discardLabel?: string;
}) {
    return (
        <Dialog open={open} onClose={onCancel} aria-labelledby="discard-screen-title">
            <DialogTitle id="discard-screen-title">Discard unsaved changes?</DialogTitle>
            <DialogContent>
                {message}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Keep editing</Button>
                <Button color="error" onClick={onDiscard}>{discardLabel}</Button>
            </DialogActions>
        </Dialog>
    );
}
