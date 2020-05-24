import * as Navigation_Services from "VSS/Navigation/Services";
import { TfvcHistoryListSource } from "VersionControl/Scenarios/History/TfvcHistory/Sources/TfvcHistoryListSource";
import { TfvcShelveSetsActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionsHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TfvcChangeListItems } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { TfvcShelveSetsStoreHub, ShelveSetsPageState} from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStoreHub";
import { ShelveSetsUrlState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/ShelveSetUrlStore"
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import { ShelveSetsTelemetrySpy } from "VersionControl/Scenarios/History/TfvcHistory/Sources/ShelveSetsTelemetrySpy";

export class TfvcShelveSetsActionCreator
{
    private _delayAnnounceHelper: DelayAnnounceHelper;

    constructor(
        private _actionsHub: TfvcShelveSetsActionsHub,
        private _tfsContext: TfsContext,
        private _repositoryContext: RepositoryContext,
        private _storesHub: TfvcShelveSetsStoreHub,
        private _telemetrySpy?: ShelveSetsTelemetrySpy,
        private _tfvcListSource?: TfvcHistoryListSource,) {
        this._delayAnnounceHelper = new DelayAnnounceHelper();
    }

    private get tfvcListSource(): TfvcHistoryListSource {
        if (!this._tfvcListSource) {
            this._tfvcListSource = new TfvcHistoryListSource((this._repositoryContext));
        }
        return this._tfvcListSource;
    }

    public UpdateFilters = (e?: JQueryEventObject, searchCriteria?: ShelveSetsUrlState): void => {
        if (this._shouldFetchShelveSets(searchCriteria)) {
            this.fetchShelvesets(searchCriteria);
            const newSearchCriteria = $.extend(this._storesHub.getshelveSetUrlState(), searchCriteria);
            Navigation_Services.getHistoryService().addHistoryPoint(null, newSearchCriteria);
        }
    }

    private _shouldFetchShelveSets(nextState: ShelveSetsUrlState): boolean {
        if (this._storesHub.getshelveSetUrlState().user === nextState.user
            && this._storesHub.getshelveSetUrlState().userId === nextState.userId) {
            return false;
        }
        else {
            return true;
        }
    }

    private _chooseOwner(searchCriteria: ShelveSetsUrlState): string {
        if (searchCriteria && searchCriteria.userId) {
            return searchCriteria.userId;
        }
        else if (searchCriteria && searchCriteria.user) {
            return searchCriteria.user;
        }

        return this._tfsContext.currentIdentity.id;
    }

    public notifyContentRendered = (splitTimingName: string): void =>
        this._telemetrySpy && this._telemetrySpy.notifyContentRendered(splitTimingName);
    
    public applyNavigatedUrl(rawState: ShelveSetsUrlState): void {
        if (this._shouldFetchShelveSets(rawState)) {
            this._actionsHub.urlChanged.invoke(rawState);
            this.fetchShelvesets(rawState);
        }
    }

    public fetchShelvesets(searchCriteria?: ShelveSetsUrlState): void {
        if (!this.tfvcListSource) {
            return;
        }
        const author = this._chooseOwner(searchCriteria);
        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);
        this._actionsHub.shelvesetsLoadStarted.invoke(null);

        this.tfvcListSource.getShelveSets(author).then(
            (results: TfvcChangeListItems) => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);
                this._actionsHub.shelvesetsLoaded.invoke(results);
            },
            (error: Error) => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
                this._actionsHub.shelvesetsLoadErrorRaised.invoke(error);
            });
    }

    public loadShelvesets(): void {
        if (!this.tfvcListSource) {
            return;
        }

        const results = this.tfvcListSource.getShelveSetsFromJsonIsland();
        if (results) {
            this._actionsHub.shelvesetsLoaded.invoke(results);
        } else {
            this.fetchShelvesets();
        }
    }

    public clearAllErrors(): void {
        this._actionsHub.shelvesetsClearAllErrorsRaised.invoke(null);
    }
}