import { useQueries, useQuery } from '@tanstack/react-query';
import {
    marketCurrencies,
    marketExchanges,
} from '../../../api/aquatrader_market';
import {
    marketCurrenciesKeys,
    marketExchangesKeys,
} from '../../../api/aquatrader_query_market';
import {
    technicalTechnicalIndicatorconfigurationsIndicatorid,
    technicalTechnicalIndicators,
} from '../../../api/aquatrader_technical';
import {
    technicalTechnicalIndicatorconfigurationsIndicatoridKeys,
    technicalTechnicalIndicatorsKeys,
} from '../../../api/aquatrader_query_technical';
import { mapScreenerMetadata } from './screenerMetadata';

const METADATA_STALE_TIME = 5 * 60 * 1000;

function requireSuccessfulResult<T>(result: {
    status: number;
    response: T;
    error?: { detail?: string | null; title?: string } | undefined;
}): T {
    if (result.status < 200 || result.status >= 300) {
        throw new Error(
            result.error?.detail ??
                result.error?.title ??
                `Metadata request failed (HTTP ${result.status}).`,
        );
    }
    return result.response;
}

export function useScreenerMetadata() {
    const exchangesQuery = useQuery({
        queryKey: marketExchangesKeys.all,
        queryFn: async () => requireSuccessfulResult(await marketExchanges()),
        staleTime: METADATA_STALE_TIME,
    });
    const currenciesQuery = useQuery({
        queryKey: marketCurrenciesKeys.all,
        queryFn: async () => requireSuccessfulResult(await marketCurrencies()),
        staleTime: METADATA_STALE_TIME,
    });
    const indicatorsQuery = useQuery({
        queryKey: technicalTechnicalIndicatorsKeys.all,
        queryFn: async () => requireSuccessfulResult(await technicalTechnicalIndicators()),
        staleTime: METADATA_STALE_TIME,
    });

    const indicators = indicatorsQuery.data ?? [];
    const activeIndicators = indicators.flatMap((indicator) =>
        indicator.indicatorId == null
            ? []
            : [{ ...indicator, indicatorId: indicator.indicatorId }],
    );
    const configurationsQueries = useQueries({
        queries: activeIndicators.map((indicator) => ({
            queryKey: technicalTechnicalIndicatorconfigurationsIndicatoridKeys.byRequest({
                indicatorId: indicator.indicatorId,
            }),
            queryFn: async () =>
                requireSuccessfulResult(
                    await technicalTechnicalIndicatorconfigurationsIndicatorid({
                        indicatorId: indicator.indicatorId,
                    }),
                ),
            staleTime: METADATA_STALE_TIME,
        })),
    });

    const exchanges = exchangesQuery.data ?? [];
    const currencies = currenciesQuery.data ?? [];
    const configurations = configurationsQueries.flatMap((query) =>
        query.data ?? [],
    );
    const metadataErrors = [
        exchangesQuery.error,
        currenciesQuery.error,
        indicatorsQuery.error,
        ...configurationsQueries.map((query) => query.error),
    ].filter((error): error is Error => error instanceof Error);

    const marketErrors = [exchangesQuery.error, currenciesQuery.error]
        .filter((error): error is Error => error instanceof Error);
    const technicalErrors = [
        indicatorsQuery.error,
        ...configurationsQueries.map((query) => query.error),
    ].filter((error): error is Error => error instanceof Error);
    const isLoading =
        exchangesQuery.isPending ||
        currenciesQuery.isPending ||
        indicatorsQuery.isPending ||
        configurationsQueries.some((query) => query.isPending);

    return {
        exchanges: exchanges.filter((exchange) => exchange.isActive !== false),
        currencies: currencies.filter((currency) => currency.isActive !== false),
        indicators,
        configurations,
        fields: mapScreenerMetadata({
            exchanges,
            currencies,
            indicators,
            configurations,
        }),
        isLoading,
        errors: metadataErrors,
        marketLoading: exchangesQuery.isPending || currenciesQuery.isPending,
        marketErrors,
        technicalLoading:
            indicatorsQuery.isPending ||
            configurationsQueries.some((query) => query.isPending),
        technicalErrors,
        exchangeError: exchangesQuery.error,
        currencyError: currenciesQuery.error,
        capabilitiesAvailable: false,
        async refetch() {
            await Promise.all([
                exchangesQuery.refetch(),
                currenciesQuery.refetch(),
                indicatorsQuery.refetch(),
                ...configurationsQueries.map((query) => query.refetch()),
            ]);
        },
    };
}
