import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
    ScreenerEodSnapshot,
    ScreenerFilterGroup,
    ScreenerResult,
} from './models/screener';
import {
    ScreenerFilterBuilder,
} from './components/ScreenerFilterBuilder';
import { validateScreenerFilterDraft, type ScreenerFilterDraft } from './models/screenerFilterDraft';
import { useScreenerMetadata } from './metadata/useScreenerMetadata';
import { SCREENER_METADATA_BACKEND_STATUS } from './metadata/screenerMetadataApi';

function formatPrice(
    snapshot: ScreenerEodSnapshot | null,
    currencyCode: string | null,
): string {
    if (snapshot?.close == null) {
        return '—';
    }

    return `${snapshot.close.toLocaleString(undefined, {
        maximumFractionDigits: 4,
    })}${currencyCode ? ` ${currencyCode}` : ''}`;
}

export type ScreenerResultState = 'idle' | 'loading' | 'error' | 'empty' | 'ready' | 'partial';

export interface ScreenerResultsProps {
    state: ScreenerResultState;
    results?: readonly ScreenerResult[];
    totalCount?: number;
    error?: string;
    onRetry?: () => void;
}

export function ScreenerResults({
    state,
    results = [],
    totalCount,
    error,
    onRetry,
}: ScreenerResultsProps) {
    const hasPartialData = results.some((result) => result.latestEod == null);
    const effectiveState = state === 'ready' && hasPartialData ? 'partial' : state;

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
                            Sorting and pagination will be available when the backend supports screen execution.
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label="Execution unavailable"
                        color="warning"
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
                        No matching listings. Results will appear here when a screener execution API
                        is available.
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
                            Run a screen to see matching listings. Screen execution is not connected
                            yet.
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
                                            {formatPrice(result.latestEod, result.currencyCode)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {result.latestEod?.volume?.toLocaleString() ?? '—'}
                                        </TableCell>
                                        <TableCell>{result.latestEod?.priceDate ?? '—'}</TableCell>
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
    const [screenName, setScreenName] = useState('Untitled screen');
    const [filters, setFilters] = useState<ScreenerFilterDraft[]>([]);
    const [filterLogic, setFilterLogic] = useState<ScreenerFilterGroup['logic']>('and');
    const [selectedExchangeIds, setSelectedExchangeIds] = useState<number[]>([]);
    const [selectedCurrencyCodes, setSelectedCurrencyCodes] = useState<string[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [saveAsOpen, setSaveAsOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const metadata = useScreenerMetadata();
    const { exchanges, currencies, fields } = metadata;

    function resetScreen(name = 'Untitled screen') {
        setScreenName(name);
        setFilters([]);
        setFilterLogic('and');
        setSelectedExchangeIds([]);
        setSelectedCurrencyCodes([]);
        setNotice('Started a new local screen.');
    }

    function saveCurrentScreen() {
        const screenErrors = filters.flatMap((filter) => {
            const error = validateScreenerFilterDraft(filter, fields);
            const field = fields.find((item) => item.fieldId === filter.fieldId);
            return error ? [`${field?.label ?? filter.fieldId}: ${error}`] : [];
        });
        if (!screenName.trim()) {
            screenErrors.unshift('Enter a screen name before saving.');
        }
        if (screenErrors.length > 0) {
            setNotice(screenErrors[0]);
            return;
        }

        setNotice('Screen saved in this session only. Backend screen saving is not connected.');
    }

    function saveAsScreen() {
        const name = saveAsName.trim();
        if (!name) {
            return;
        }
        setScreenName(name);
        setSaveAsName('');
        setSaveAsOpen(false);
        setNotice('Screen copy created in this session only. Backend screen saving is not connected.');
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
                        <Button variant="outlined" onClick={() => resetScreen()}>
                            New screen
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ContentCopyOutlinedIcon />}
                            onClick={() => {
                                setSaveAsName(`${screenName} copy`);
                                setSaveAsOpen(true);
                            }}
                        >
                            Save as
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<SaveOutlinedIcon />}
                            onClick={saveCurrentScreen}
                        >
                            Save
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            disabled
                            aria-describedby="screener-run-unavailable"
                        >
                            Run Screen
                        </Button>
                    </Stack>
                </Box>

                <Alert severity="info" id="screener-run-unavailable">
                    Screen execution and persistent saved screens are not available from the current
                    backend APIs. Filters and screen actions on this page are local presentation
                    interactions only.
                </Alert>

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

                <ScreenerResults state="idle" />

            </Stack>

            <Dialog open={saveAsOpen} onClose={() => setSaveAsOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Save screen as</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New screen name"
                        fullWidth
                        value={saveAsName}
                        onChange={(event) => setSaveAsName(event.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveAsOpen(false)}>Cancel</Button>
                    <Button onClick={saveAsScreen} disabled={!saveAsName.trim()} variant="contained">
                        Save copy
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={!!notice}
                autoHideDuration={5000}
                onClose={() => setNotice(null)}
                message={notice}
            />
        </Container>
    );
}
