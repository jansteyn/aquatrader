import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ScreenerResults } from '../src/features/screener/ScreenerPage';
import { ScreenerFilterBuilder } from '../src/features/screener/components/ScreenerFilterBuilder';
import type { ScreenerFieldDefinition, ScreenerFilterGroup } from '../src/features/screener/models/screener';
import type { ScreenerFilterDraft } from '../src/features/screener/models/screenerFilterDraft';
import { useState } from 'react';

const dynamicFields: ScreenerFieldDefinition[] = [
    {
        fieldId: 'price.eod.close',
        label: 'Latest EOD close',
        valueType: 'number',
        category: 'price',
        filterable: true,
        operators: ['gt', 'between'],
    },
    {
        fieldId: 'price.eod.priceDate',
        label: 'Latest EOD date',
        valueType: 'date',
        category: 'price',
        filterable: true,
        operators: ['eq'],
    },
    {
        fieldId: 'currency.code',
        label: 'Currency',
        valueType: 'text',
        category: 'market',
        filterable: true,
        operators: ['eq'],
        enumOptions: [{ value: 'EUR', label: 'EUR — Euro' }],
    },
];

function FilterBuilderHarness() {
    const [filters, setFilters] = useState<ScreenerFilterDraft[]>([]);
    const [logic, setLogic] = useState<ScreenerFilterGroup['logic']>('and');
    return (
        <ScreenerFilterBuilder
            fields={dynamicFields}
            filters={filters}
            logic={logic}
            onFiltersChange={setFilters}
            onLogicChange={setLogic}
        />
    );
}

describe('Screener filter metadata controls', () => {
    afterEach(() => {
        cleanup();
    });

    it('adds and removes filter rows', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);

        await user.click(screen.getByRole('button', { name: 'Add filter' }));
        expect(screen.getByLabelText('Filter field 1')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Remove filter 1' }));
        expect(screen.queryByLabelText('Filter field 1')).toBeNull();
        expect(screen.getByText(/No filters added/)).toBeTruthy();
    });

    it('updates the operator and displays its matching value input', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);
        await user.click(screen.getByRole('button', { name: 'Add filter' }));

        await user.click(screen.getByRole('combobox', { name: 'Filter field 1' }));
        await user.click(await screen.findByRole('option', { name: 'Latest EOD close' }));

        await user.click(screen.getByRole('combobox', { name: 'Operator for filter 1' }));
        await user.click(await screen.findByRole('option', { name: 'is between' }));

        expect(screen.getByLabelText('Lower value')).toBeTruthy();
        expect(screen.getByLabelText('Upper value')).toBeTruthy();
    });

    it('shows validation feedback for missing filter values', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);
        await user.click(screen.getByRole('button', { name: 'Add filter' }));

        expect(await screen.findByText('Enter a value for this filter.')).toBeTruthy();
    });

    it('shows validation feedback for an invalid numeric range', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);
        await user.click(screen.getByRole('button', { name: 'Add filter' }));
        await user.click(screen.getByRole('combobox', { name: 'Filter field 1' }));
        await user.click(await screen.findByRole('option', { name: 'Latest EOD close' }));
        await user.click(screen.getByRole('combobox', { name: 'Operator for filter 1' }));
        await user.click(await screen.findByRole('option', { name: 'is between' }));
        await user.type(screen.getByLabelText('Lower value'), '20');
        await user.type(screen.getByLabelText('Upper value'), '10');

        expect(
            await screen.findAllByText('Lower value must not exceed upper value.'),
        ).toHaveLength(2);
    });

    it('shows the empty-results state without sample rows', () => {
        render(
            <MemoryRouter>
                <ScreenerResults state="empty" results={[]} />
            </MemoryRouter>,
        );

        expect(screen.getByText(/No matching listings/)).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('renders number and date inputs according to field metadata', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);
        await user.click(screen.getByRole('button', { name: 'Add filter' }));

        const numberInput = screen.getByLabelText('Value for filter 1');
        expect(numberInput.getAttribute('type')).toBe('number');

        await user.click(screen.getByRole('combobox', { name: 'Filter field 1' }));
        await user.click(await screen.findByRole('option', { name: 'Latest EOD date' }));

        expect(screen.getByLabelText('Value for filter 1').getAttribute('type')).toBe('date');
        await user.click(screen.getByRole('combobox', { name: 'Operator for filter 1' }));
        expect(await screen.findByRole('option', { name: 'is equal to' })).toBeTruthy();
        expect(screen.queryByRole('option', { name: 'is between' })).toBeNull();
    });

    it('renders enum values as a selector instead of a free-text input', async () => {
        const user = userEvent.setup();
        render(<FilterBuilderHarness />);
        await user.click(screen.getByRole('button', { name: 'Add filter' }));
        await user.click(screen.getByRole('combobox', { name: 'Filter field 1' }));
        await user.click(await screen.findByRole('option', { name: 'Currency' }));

        await user.click(screen.getByRole('combobox', { name: 'Operator for filter 1' }));
        await user.click(await screen.findByRole('option', { name: 'is equal to' }));
        expect(screen.getByRole('combobox', { name: 'Value for filter 1' })).toBeTruthy();

        await user.click(screen.getByRole('combobox', { name: 'Value for filter 1' }));
        expect(await screen.findByRole('option', { name: 'EUR — Euro' })).toBeTruthy();
    });

    it('does not offer any filter operators when backend capabilities are absent', () => {
        render(
            <ScreenerFilterBuilder
                fields={dynamicFields.map((field) => ({ ...field, filterable: false, operators: [] }))}
                filters={[]}
                logic="and"
                onFiltersChange={() => undefined}
                onLogicChange={() => undefined}
            />,
        );

        expect(screen.getByRole('button', { name: 'Add filter' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByText(/does not currently advertise supported screen fields or operators/)).toBeTruthy();
    });
});
