import * as Q from "q";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import {FavoritesActions} from "Favorites/Controls/FavoritesActions";
import { FavoritesHubDataProvider } from "MyExperiences/Scenarios/Favorites/FavoritesHubDataProvider";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoritesHubStore, FavoritesHubState } from "MyExperiences/Scenarios/Favorites/FavoritesHubStore";
import { FavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { ArtifactScope } from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as Performance from "VSS/Performance";
import {
    HubItemGroup,
    IHubItem,
    IHubGroupColumn,
    Direction,
    ColumnType,
    IOrganizationInfoAndCollectionsPickerSectionProps
} from "MyExperiences/Scenarios/Shared/Models";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { WitQueryFavoriteRenderer } from "MyExperiences/Scenarios/Favorites/WitQueryFavoriteRenderer";
import * as Diag from "VSS/Diag";
import { FavoritesSettingsService } from "MyExperiences/Scenarios/Favorites/FavoritesSettingsService";
import * as Errors from "MyExperiences/Scenarios/Shared/Alerts";
import * as Service from "VSS/Service";
import Utils_Date = require("VSS/Utils/Date");

/**
 * Actions creation for favorites
 */
export class FavoritesHubActionsCreator extends FavoritesActionsCreator {
    protected _dataProvider: FavoritesHubDataProvider;
    protected _store: FavoritesHubStore;

    private _dataService: FavoritesSettingsService;

    private static readonly FeatureArea = "Dashboards";
    private static readonly TTIScenario = "Account.FavoritesHub.Load";
    private static readonly ExtendedDataScenario = "Account.FavoritesHub.ExtendedDataLoad";

    private scenarioManager = Performance.getScenarioManager();

    public initializeStore(artifactTypes?: string[], scope?: ArtifactScope, wrapException = true): IPromise<FavoritesHubState> | void {
        const initialState = this._store.getState();
        this._dataService = Service.getService(FavoritesSettingsService);

        // Same code as base, but hits different data provider
        let promise = this._dataProvider.loadFavoritesData(initialState, this, artifactTypes, scope).then((state) => {
            
            // Emitting initial receive data for non-extended data
            this._actions.ReceiveData.invoke(state);
            this.scenarioManager.recordPageLoadScenario(FavoritesHubActionsCreator.FeatureArea, FavoritesHubActionsCreator.TTIScenario);

            let extendedDataScenario = this.scenarioManager.startScenario(FavoritesHubActionsCreator.FeatureArea, FavoritesHubActionsCreator.ExtendedDataScenario);
            // Now extending data with additional metadata
            return this._dataProvider.extendFavoritesData(state, this).then((state) => {
                // Emitting receive data again to show extended favorites data (e.g. updated artefact names)
                this._actions.ReceiveData.invoke(state);
                extendedDataScenario.end();
                return state;
            }, () => {
                extendedDataScenario.abort();
            });
        });

        // The hub actions creator is last in the chain of promises - handling the promise via .done to throw correct exception, if there's one (instead of UnhandledQRejection)
        (promise as Q.Promise<FavoritesHubState>).done();
    }

    /**
     * Apply filter to the favorite store
     * @param filter
     */
    public filter(filter: string) {
        this._dataProvider.filterData(filter, this._store.getState()).then((state) => {
            this._actions.ReceiveData.invoke(state);

            if (filter === "") {
                return;
            }

            let count = 0;
            state.groups.forEach(group => count += group.items.length);
            if (count === 0) {
                Utils_Accessibility.announce(MyExperiencesResources.Search_NoResultsFound);
            } else {
                let message = Utils_String.format(MyExperiencesResources.AnnounceFilterResult, count, filter);
                Utils_Accessibility.announce(message);
            }
        });
    }

    private swap(groups: HubItemGroup<IHubItem>[], sourceIndex: number, targetIndex: number): void {
        let temp = groups[sourceIndex];
        groups[sourceIndex] = groups[targetIndex];
        groups[targetIndex] = temp;
    }

    public reorder(direction: Direction, index: number, groups: HubItemGroup<IHubItem>[]): void {
        var currentState = this._store.getState();
        var hubGroupOrder: string[] = [];
        
        if (direction === Direction.Up && index > 0) {
            this.swap(groups, index, index - 1);
        } else if (direction === Direction.Down && index < groups.length - 1) {
            this.swap(groups, index, index + 1);
        }
        currentState.groups = groups;
        for (var i = 0; i < groups.length; i++) {
            hubGroupOrder.push(groups[i].id);
        }
        
        /** storing id's of the reordered hub groups */
        Service.getService(FavoritesSettingsService).saveHubGroups(hubGroupOrder);

        this._store.receivedHubData(currentState);
    }

    public updateHeaderOrganizationInfoAndCollectionPickerProps(
        organizationInfoAndCollectionPickerProps: IOrganizationInfoAndCollectionsPickerSectionProps): void {
        let currentState = this._store.getState();
        currentState.header.organizationInfoAndCollectionPickerProps = organizationInfoAndCollectionPickerProps;

        this._store.receivedHubData(currentState);
    }

    public collectionNavigationFailed(): void {
        let currentState = this._store.getState();
        currentState.alert = Errors.createReloadPromptAlertMessage(MyExperiencesResources.AccountSwitcher_CollectionNavigationError);

        this._store.receivedHubData(currentState);
    }


    public getStore(): FavoritesHubStore {
        return this._store;
    }
}
