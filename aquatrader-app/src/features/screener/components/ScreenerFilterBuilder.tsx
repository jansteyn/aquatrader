import {
    Alert,
    Box,
    Button,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type {
    ScreenerFieldDefinition,
    ScreenerFilterGroup,
    ScreenerOperator,
    ScreenerValueType,
} from '../models/screener';
import {
    validateScreenerFilterDraft,
    type ScreenerFilterDraft,
} from '../models/screenerFilterDraft';

interface ScreenerFilterBuilderProps {
    fields: readonly ScreenerFieldDefinition[];
    filters: readonly ScreenerFilterDraft[];
    logic: ScreenerFilterGroup['logic'];
    onFiltersChange: (filters: ScreenerFilterDraft[]) => void;
    onLogicChange: (logic: ScreenerFilterGroup['logic']) => void;
}

const OPERATOR_LABELS: Record<ScreenerOperator, string> = {
    eq: 'is equal to',
    neq: 'is not equal to',
    gt: 'is greater than',
    gte: 'is greater than or equal to',
    lt: 'is less than',
    lte: 'is less than or equal to',
    between: 'is between',
    isNull: 'is unavailable',
    isNotNull: 'is available',
};

function getInputType(valueType: ScreenerValueType): string {
    if (valueType === 'date') {
        return 'date';
    }
    if (valueType === 'number') {
        return 'number';
    }
    return 'text';
}

export function ScreenerFilterBuilder({
    fields,
    filters,
    logic,
    onFiltersChange,
    onLogicChange,
}: ScreenerFilterBuilderProps) {
    const filterableFields = fields.filter((field) => field.filterable && field.operators.length > 0);

    function addFilter() {
        const field = filterableFields[0];
        if (!field) {
            return;
        }
        onFiltersChange([
            ...filters,
            {
                id: Math.max(0, ...filters.map((filter) => filter.id)) + 1,
                fieldId: field.fieldId,
                operator: field.operators[0],
                value: '',
                secondValue: '',
            },
        ]);
    }

    function updateFilter(id: number, update: Partial<ScreenerFilterDraft>) {
        onFiltersChange(
            filters.map((filter) => (filter.id === id ? { ...filter, ...update } : filter)),
        );
    }

    function removeFilter(id: number) {
        onFiltersChange(filters.filter((filter) => filter.id !== id));
    }

    return (
        <Box component="section" aria-labelledby="filter-builder-title">
            <Stack spacing={2.5}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: { xs: 'stretch', sm: 'center' },
                    }}
                >
                    <Box>
                        <Typography id="filter-builder-title" variant="h5" component="h2">
                            Filters
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Filter fields and operators are supplied by backend metadata.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            onClick={addFilter}
                            disabled={filterableFields.length === 0}
                        >
                            Add filter
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => onFiltersChange([])}
                            disabled={filters.length === 0}
                        >
                            Clear filters
                        </Button>
                    </Stack>
                </Stack>

                {filterableFields.length === 0 && (
                    <Alert severity="info">
                        Filter capability metadata is not available yet. The backend does not
                        currently advertise supported screen fields or operators, so filters cannot
                        be added safely.
                    </Alert>
                )}

                {filters.length > 1 && (
                    <FormControl size="small" sx={{ maxWidth: 300 }}>
                        <InputLabel id="filter-logic-label">Match conditions using</InputLabel>
                        <Select
                            labelId="filter-logic-label"
                            label="Match conditions using"
                            value={logic}
                            onChange={(event) =>
                                onLogicChange(event.target.value as ScreenerFilterGroup['logic'])
                            }
                        >
                            <MenuItem value="and">AND — match all filters</MenuItem>
                            <MenuItem value="or">OR — match any filter</MenuItem>
                        </Select>
                    </FormControl>
                )}

                {filters.length === 0 ? (
                    <Box
                        sx={{
                            py: 4,
                            px: 2,
                            textAlign: 'center',
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                        }}
                    >
                        <Typography color="text.secondary">
                            No filters added. Add a filter when supported field metadata is available.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1.5}>
                        {filters.map((filter, index) => {
                            const field = fields.find((item) => item.fieldId === filter.fieldId);
                            if (!field) {
                                return null;
                            }
                            const error = validateScreenerFilterDraft(filter, fields);
                            const usesValue =
                                filter.operator !== 'isNull' && filter.operator !== 'isNotNull';

                            return (
                                <Box
                                    key={filter.id}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: 'minmax(0, 1fr) auto',
                                            md: 'minmax(150px, 1.2fr) minmax(180px, 1.2fr) minmax(170px, 1fr) auto',
                                        },
                                        alignItems: 'start',
                                        gap: 1.5,
                                        p: { xs: 1.5, sm: 2 },
                                        border: 1,
                                        borderColor: error ? 'error.main' : 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    <FormControl size="small" fullWidth>
                                        <InputLabel id={`filter-field-label-${filter.id}`}>
                                            Filter field {index + 1}
                                        </InputLabel>
                                        <Select
                                            labelId={`filter-field-label-${filter.id}`}
                                            label={`Filter field ${index + 1}`}
                                            value={field.fieldId}
                                            onChange={(event) => {
                                                const nextField = fields.find(
                                                    (item) => item.fieldId === event.target.value,
                                                );
                                                if (nextField?.operators[0]) {
                                                    updateFilter(filter.id, {
                                                        fieldId: nextField.fieldId,
                                                        operator: nextField.operators[0],
                                                        value: '',
                                                        secondValue: '',
                                                    });
                                                }
                                            }}
                                        >
                                            {filterableFields.map((availableField) => (
                                                <MenuItem
                                                    key={availableField.fieldId}
                                                    value={availableField.fieldId}
                                                >
                                                    {availableField.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel id={`filter-operator-label-${filter.id}`}>
                                            Operator for filter {index + 1}
                                        </InputLabel>
                                        <Select
                                            labelId={`filter-operator-label-${filter.id}`}
                                            label={`Operator for filter ${index + 1}`}
                                            value={filter.operator}
                                            onChange={(event) =>
                                                updateFilter(filter.id, {
                                                    operator: event.target.value as ScreenerOperator,
                                                    value: '',
                                                    secondValue: '',
                                                })
                                            }
                                        >
                                            {field.operators.map((operator) => (
                                                <MenuItem key={operator} value={operator}>
                                                    {OPERATOR_LABELS[operator]}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    {usesValue ? (
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            sx={{
                                                gridColumn: { xs: '1', md: 'auto' },
                                                minWidth: 0,
                                            }}
                                        >
                                            <FilterValueInput
                                                field={field}
                                                filter={filter}
                                                label={
                                                    filter.operator === 'between'
                                                        ? 'Lower value'
                                                        : `Value for filter ${index + 1}`
                                                }
                                                value={filter.value}
                                                error={error}
                                                onChange={(value) => updateFilter(filter.id, { value })}
                                            />
                                            {filter.operator === 'between' && (
                                                <FilterValueInput
                                                    field={field}
                                                    filter={filter}
                                                    label="Upper value"
                                                    value={filter.secondValue}
                                                    error={error}
                                                    onChange={(secondValue) =>
                                                        updateFilter(filter.id, { secondValue })
                                                    }
                                                />
                                            )}
                                        </Stack>
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                gridColumn: { xs: '1', md: 'auto' },
                                                alignSelf: 'center',
                                                px: 1,
                                            }}
                                        >
                                            No value required
                                        </Typography>
                                    )}
                                    <Button
                                        color="inherit"
                                        aria-label={`Remove filter ${index + 1}`}
                                        onClick={() => removeFilter(filter.id)}
                                        sx={{
                                            gridColumn: { xs: '2', md: 'auto' },
                                            gridRow: { xs: '1 / span 3', md: 'auto' },
                                            minWidth: 40,
                                        }}
                                    >
                                        <DeleteIcon />
                                    </Button>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}

function FilterValueInput({
    field,
    filter,
    label,
    value,
    error,
    onChange,
}: {
    field: ScreenerFieldDefinition;
    filter: ScreenerFilterDraft;
    label: string;
    value: string;
    error: string | null;
    onChange: (value: string) => void;
}) {
    const labelId = `filter-value-label-${filter.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    if (field.enumOptions?.length) {
        return (
            <FormControl size="small" fullWidth error={!!error}>
                <InputLabel id={labelId}>{label}</InputLabel>
                <Select
                    labelId={labelId}
                    label={label}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {field.enumOptions.map((option) => (
                        <MenuItem key={option.value} value={String(option.value)}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
                {error && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
        );
    }

    if (field.valueType === 'boolean') {
        return (
            <FormControl size="small" fullWidth error={!!error}>
                <InputLabel id={labelId}>{label}</InputLabel>
                <Select
                    labelId={labelId}
                    label={label}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                >
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                </Select>
                {error && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
        );
    }

    return (
        <TextField
            label={label}
            type={getInputType(field.valueType)}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            size="small"
            fullWidth
            error={!!error}
            helperText={error}
            slotProps={{
                htmlInput:
                    field.valueType === 'number'
                        ? {
                              step: 'any',
                              min: field.constraints?.minimum,
                              max: field.constraints?.maximum,
                          }
                        : undefined,
                inputLabel: field.valueType === 'date' ? { shrink: true } : undefined,
            }}
        />
    );
}
