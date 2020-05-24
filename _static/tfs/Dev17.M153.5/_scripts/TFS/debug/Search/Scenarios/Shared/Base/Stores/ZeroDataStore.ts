import * as VSSStore from "VSS/Flux/Store";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { ErrorData } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props";
import { SearchFailedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
/**
 * Common Error codes for code and workitem
 */
export namespace ErrorStrings {
    export const AccountIsBeingIndexed: string = "AccountIsBeingIndexed";
    export const AccountIsBeingReindexed: string = "AccountIsBeingReindexed";
    export const AccountIsBeingOnboarded: string = "AccountIsBeingOnboarded";
    export const AliasNotFoundErrorCode: string = "AliasNotFound";
    export const IndexingNotStartedErrorCode: string = "IndexingNotStarted";
    export const PrefixWildcardQueryNotSupported: string = "PrefixWildcardQueryNotSupported";
    export const BranchesAreBeingIndexed: string = "BranchesAreBeingIndexed";
    export const WorkItemsNotAccessible: string = "WorkItemsNotAccessible";
    export const EmptyQueryNotSupported: string = "EmptyQueryNotSupported";
    export const OnlyWildcardQueryNotSupported: string = "OnlyWildcardQueryNotSupported";
    export const ZeroResultsWithWildcard: string = "ZeroResultsWithWildcard";
    export const ZeroResultsWithFilter: string = "ZeroResultsWithFilter";
    export const ZeroResultsWithWildcardAndFilter: string = "ZeroResultsWithWildcardAndFilter";
    export const ZeroResultsWithNoWildcardNoFilter: string = "ZeroResultsWithNoWildcardNoFilter";
    export const WildcardQueriesWithCEFacetsNotSupported: string = "WildcardQueriesWithCEFacetsNotSupported";
    export const PhraseQueriesWithCEFacetsNotSupported: string = "PhraseQueriesWithCEFacetsNotSupported";
}

export interface ZeroDataState {
    scenario: ScenarioType;
}

export class ZeroDataStore extends VSSStore.Store {
    protected _state: ZeroDataState = { scenario: ScenarioType.None } as ZeroDataState;

    public get state(): ZeroDataState {
        return this._state;
    }

    public onSearchFailed = (
        payload: SearchFailedPayload<_SearchSharedContracts.EntitySearchQuery>,
        query: _SearchSharedContracts.EntitySearchQuery): void => {
        if (this.areQueriesSame(payload.query, query)) {
            this._state.scenario = ScenarioType.ServiceError;
            this.emitChanged();
        }
    }

    public onLandingPage = (): void => {
        this._state.scenario = ScenarioType.LandingPage;
        this.emitChanged();
    }

    public reset = (): void => {
        this._state.scenario = ScenarioType.None;
        this.emitChanged();
    }

    /**
     * Return the results after comparing the queries.
     * @param queryInState
     * @param queryInPayload
     */
    protected areQueriesSame(
        queryInState: _SearchSharedContracts.EntitySearchQuery,
        queryInPayload: _SearchSharedContracts.EntitySearchQuery): boolean {
        return true;
    }
}

export function getScenario(
    errorData: ErrorData[],
    totalResultsCount: number,
    takeResults: number,
    showMoreScenario: boolean): ScenarioType {
    const isPrefixErrorScenario = check(errorData, ErrorStrings.PrefixWildcardQueryNotSupported),
        isProjectIndexingScenario = check(
            errorData,
            ErrorStrings.AliasNotFoundErrorCode,
            ErrorStrings.IndexingNotStartedErrorCode,
            ErrorStrings.AccountIsBeingOnboarded),
        isWorkItemNotAccessibleScenario = check(errorData, ErrorStrings.WorkItemsNotAccessible),
        isEmptyExpressionScenario = check(errorData, ErrorStrings.EmptyQueryNotSupported),
        isOnlyWildCardNotSupported = check(errorData, ErrorStrings.OnlyWildcardQueryNotSupported),
        isZeroResultsWithWildcard = check(errorData, ErrorStrings.ZeroResultsWithWildcard),
        isZeroResultsWithFilter = check(errorData, ErrorStrings.ZeroResultsWithFilter),
        isZeroResultsWithWildcardAndFilter = check(errorData, ErrorStrings.ZeroResultsWithWildcardAndFilter),
        isZeroResultsWithNoWildcardNoFilter = check(errorData, ErrorStrings.ZeroResultsWithNoWildcardNoFilter),
        isWildcardQueriesWithCEFacetsNotSupported = check(errorData, ErrorStrings.WildcardQueriesWithCEFacetsNotSupported),
        isPhraseQueriesWithCEFacetsNotSupported = check(errorData, ErrorStrings.PhraseQueriesWithCEFacetsNotSupported);

    if (isProjectIndexingScenario) {
        return ScenarioType.IndexingScenario;
    }

    if (isPrefixErrorScenario) {
        return ScenarioType.PrefixWildCardNotSupported;
    }

    if (isWorkItemNotAccessibleScenario) {
        return ScenarioType.NoPermission;
    }

    if (isEmptyExpressionScenario) {
        return ScenarioType.EmptyQueryNotSupported;
    }

    if (isOnlyWildCardNotSupported) {
        return ScenarioType.OnlyWildcardQueryNotSupported;
    }

    if (isPhraseQueriesWithCEFacetsNotSupported) {
        return ScenarioType.PhraseQueriesWithCEFacetsNotSupported;
    }

    if (isWildcardQueriesWithCEFacetsNotSupported) {
        return ScenarioType.WildcardQueriesWithCEFacetsNotSupported;
    }
    
    if (isZeroResultsWithWildcard) {
        return ScenarioType.ZeroResultsWithWildcard;
    }

    if (isZeroResultsWithFilter) {
        return ScenarioType.ZeroResultsWithFilter;
    }

    if (isZeroResultsWithWildcardAndFilter) {
        return ScenarioType.ZeroResultsWithWildcardAndFilter;
    }

    if (isZeroResultsWithNoWildcardNoFilter) {
        return ScenarioType.ZeroResultsWithNoWildcardNoFilter;
    }

    if (totalResultsCount <= 0) {
        return ScenarioType.ZeroResults;
    }

    if (totalResultsCount <= takeResults) {
        return ScenarioType.NoPermission;
    }
    else {
        // Lets present user with a show more link if one hasn't clicked it already.
        return !showMoreScenario
            ? ScenarioType.NoPermissionWithShowMore
            : ScenarioType.NoPermissionAfterShowMore;
    }
}

function check(errors: ErrorData[], ...args: string[]): boolean {
    return errors
        .some(e => args.some((arg: string) => e.errorCode === arg));
}