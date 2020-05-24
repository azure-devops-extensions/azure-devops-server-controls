import { BacklogContentViewActions } from "Agile/Scripts/BacklogsHub/BacklogContentView/ActionsCreator/BacklogContentViewActions";
import { IBacklogsHubHeaderData } from "Agile/Scripts/BacklogsHub/BacklogContentView/BacklogContentViewContracts";
import { BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import { getService } from "VSS/Service";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";

export interface IBacklogContentViewActionsCreator {
    /* initailize header data from data provider and invoke data ready action */
    initializeHeaderData(): void;

    /** Change the current backlog level */
    changeBacklogLevel(levelName: string, teamId: string): void;
}

export class BacklogContentViewActionsCreator implements IBacklogContentViewActionsCreator {
    //Get teams in batch mode, each batch being TopTeamCount count. Picked 1000 since the API max is 1000.
    private _actions: BacklogContentViewActions;

    constructor(actions: BacklogContentViewActions) {
        this._actions = actions;
    }

    public initializeHeaderData(): void {
        const pageDataService = getService(WebPageDataService);
        const headerData = pageDataService.getPageData<IBacklogsHubHeaderData>(BacklogsHubConstants.HEADER_DATAPROVIDER_ID);

        if (headerData && !headerData.exceptionInfo && headerData.allBacklogLevels) {
            // Set MRU on backlog initialization
            const backlogLevel = headerData.allBacklogLevels.filter(backlogLevel => backlogLevel.id === headerData.backlogId);
            this._setBacklogMRU(backlogLevel[0].name, headerData.teamId);
        }
        this._actions.headerDataAvailable.invoke(headerData);
    }

    public changeBacklogLevel(levelName: string, teamId: string): void {
        this._setBacklogMRU(levelName, teamId);
        this._actions.changeBacklogLevel.invoke(levelName);
    }

    private _setBacklogMRU(levelName: string, teamId: string) {
        this._setMru(TfsSettingsScopeNames.WebTeam, teamId, BacklogsHubConstants.MruBacklogKey, levelName);
    }

    private _setMru(scopeName: string, scopeValue: string, key: string, value: string) {
        const settingsToUpdate: IDictionaryStringTo<string> = {
            [key]: value
        };
        getSettingsService().setEntries(settingsToUpdate, SettingsUserScope.Me, scopeName, scopeValue)
            .then(null, (reason): void => {
                publishErrorToTelemetry(new Error(`Backlog Hub - Could not store mru '${reason}', key: ${key}, value: ${value}, scopeName: ${scopeName}, scopeValue: ${scopeValue}`));
            });
    }
}