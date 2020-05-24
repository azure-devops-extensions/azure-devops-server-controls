import * as VSSStore from "VSS/Flux/Store";
import { ScenarioType } from "Search/Scenarios/Shared/Components/ZeroData/ZeroData.Props";
import { InfoCodes } from "Search/Scripts/Generated/Search.Shared.Contracts";

export interface ZeroDataState {
    scenario: ScenarioType;
}

export class ZeroDataStore extends VSSStore.Store {
    protected _state: ZeroDataState = { scenario: ScenarioType.None } as ZeroDataState;

    public get state(): ZeroDataState {
        return this._state;
    }

    public onSearchFailed = (): void => {
        this._state.scenario = ScenarioType.ServiceError;
        this.emitChanged();
    }

    public onLandingPage = (): void => {
        this._state.scenario = ScenarioType.LandingPage;
        this.emitChanged();
    }

    public reset = (): void => {
        this._state.scenario = ScenarioType.None;
        this.emitChanged();
    }
}

export function getScenario(
    infoCode: InfoCodes,
    totalResultsCount: number,
    takeResults: number,
    showMoreScenario: boolean): ScenarioType {
    const scenarioType = getScenarioTypeFromInfoCode(infoCode);
    if (scenarioType === undefined) {
        if (totalResultsCount <= 0) {
            return ScenarioType.ZeroResults;
        }
        else {
            return !showMoreScenario
                ? ScenarioType.NoPermissionWithShowMore
                : ScenarioType.NoPermissionAfterShowMore;
        }
    }

    return scenarioType;
}

function getScenarioTypeFromInfoCode(infoCode: InfoCodes): ScenarioType {
    switch(infoCode) {
        case InfoCodes.AccountIsBeingOnboarded:
        case InfoCodes.AccountIsBeingReindexed:
            return ScenarioType.IndexingScenario;
        
        case InfoCodes.PrefixWildcardQueryNotSupported:
            return ScenarioType.PrefixWildCardNotSupported;
        
        case InfoCodes.WorkItemsNotAccessible:
            return ScenarioType.NoPermission;

        case InfoCodes.EmptyQueryNotSupported:
            return ScenarioType.EmptyQueryNotSupported;

        case InfoCodes.OnlyWildcardQueryNotSupported:
            return ScenarioType.OnlyWildcardQueryNotSupported;
        
        case InfoCodes.ZeroResultsWithWildcard:
            return ScenarioType.ZeroResultsWithWildcard;
        
        case InfoCodes.ZeroResultsWithFilter:
            return ScenarioType.ZeroResultsWithFilter;
        
        case InfoCodes.ZeroResultsWithWildcardAndFilter:
            return ScenarioType.ZeroResultsWithWildcardAndFilter;

        case InfoCodes.ZeroResultsWithNoWildcardNoFilter:
            return ScenarioType.ZeroResultsWithNoWildcardNoFilter;
        
        case InfoCodes.MultiWordWithCodeFacetNotSupported:
            // ToDo
        
        default:
            return undefined;
    }
}