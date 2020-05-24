/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as ComponentBase from "VSS/Flux/Component";
import * as Events_Services from "VSS/Events/Services";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as HeaderUtilities from "Presentation/Scripts/TFS/TFS.MyExperiences.HeaderHelper";
import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";
import { HubViewComponent } from "MyExperiences/Scenarios/Shared/Components/HubViewComponent";

import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { OrgInfoAndCollectionsPickerFluxAsync } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerFluxAsync";
import {
    HubItemGroup,
    HubData,
    IHubItem,
    Direction,
    ReorderActionPayload,
    IOrganizationInfoAndCollectionsPickerSectionProps
} from "MyExperiences/Scenarios/Shared/Models";
import * as Account_Settings_Service from "MyExperiences/Scenarios/Shared/SettingsService";

import { FavoritesHubActionsCreator } from "MyExperiences/Scenarios/Favorites/FavoritesHubActionsCreator";
import { FavoritesHubDataProvider } from "MyExperiences/Scenarios/Favorites/FavoritesHubDataProvider";
import { FavoritesHubStore, FavoritesHubState } from "MyExperiences/Scenarios/Favorites/FavoritesHubStore";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Favorites/View";
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/StarComponent";

class FavoritesViewComponent extends ComponentBase.Component<ComponentBase.Props, FavoritesHubState> {
    private favoritesActionsCreator: FavoritesHubActionsCreator;
    private favoritesHubStore: FavoritesHubStore;
    private orgInfoAndCollectionsPickerFluxAsync: OrgInfoAndCollectionsPickerFluxAsync;

    private setStoreStateDelegate = () => this.setStoreState();
    private filterDelegate = (filter: string) => this.filter(filter);
    private reorderDelegate = (payload: ReorderActionPayload) => this.reorder(payload.direction, payload.index, payload.groups);

    constructor(props: ComponentBase.Props) {
        super(props);

        this.initializeFavoritesFlux();

        if (isOrgAccountSelectorEnabled()) {
            this.orgInfoAndCollectionsPickerFluxAsync = new OrgInfoAndCollectionsPickerFluxAsync({
                onHeaderOrganizationInfoAndCollectionPickerPropsUpdate: this.onHeaderOrganizationInfoAndCollectionPickerPropsUpdate,
                onCollectionNavigationFailed: this._onCollectionNavigationFailed
            });
            this.orgInfoAndCollectionsPickerFluxAsync.initializeOrgInfoAndCollectionsPickerFlux();
        }

        this.state = this.favoritesHubStore.getState();
    }

    public render(): JSX.Element {
        return (
            <div className="favorites-view">
                <HubViewComponent {...this.state} />
            </div>
        );
    }

    public componentDidMount(): void {
        this.favoritesHubStore.addChangedListener(this.setStoreStateDelegate);

        if (this.orgInfoAndCollectionsPickerFluxAsync) {
            this.orgInfoAndCollectionsPickerFluxAsync.registerStoresChangedListeners();
        }

        HubActions.HubFilterAction.addListener(this.filterDelegate);
        HubActions.HubGroupSwapAction.addListener(this.reorderDelegate);
    }

    public componentWillUnmount(): void {
        this.favoritesHubStore.removeChangedListener(this.setStoreStateDelegate);

        if (this.orgInfoAndCollectionsPickerFluxAsync) {
            this.orgInfoAndCollectionsPickerFluxAsync.unregisterStoresChangedListeners();
        }

        HubActions.HubFilterAction.removeListener(this.filterDelegate);
        HubActions.HubGroupSwapAction.removeListener(this.reorderDelegate);
    }

    private navigate(url: string) {
        window.location.href = url;
    }

    private setStoreState() {
        this.setState(this.favoritesHubStore.getState());
    }

    private onHeaderOrganizationInfoAndCollectionPickerPropsUpdate = (props: IOrganizationInfoAndCollectionsPickerSectionProps): void => {
        this.favoritesActionsCreator.updateHeaderOrganizationInfoAndCollectionPickerProps(props);
    }

    private _onCollectionNavigationFailed = (): void => {
        this.favoritesActionsCreator.collectionNavigationFailed();
    }

    private filter(filter: string) {
        this.favoritesActionsCreator.filter(filter);
    }

    private reorder(direction: Direction, index: number, groups: HubItemGroup<IHubItem>[]) {
        this.favoritesActionsCreator.reorder(direction, index, groups);
    }

    private initializeFavoritesFlux(): void {
        const actions = new FavoritesActions();
        const favoritesDataProvider = new FavoritesHubDataProvider();
        this.favoritesHubStore = new FavoritesHubStore(actions);
        this.favoritesActionsCreator = new FavoritesHubActionsCreator(favoritesDataProvider, this.favoritesHubStore, actions);
        this.favoritesActionsCreator.initializeStore();
    }
}

SDK.registerContent("favoritesView.initialize", (context: SDK.InternalContentContextData) => {
    Performance.getScenarioManager().split("account.favoritesHub.start");
    HeaderUtilities.updateHeaderState();
    HeaderUtilities.TopLevelReactManager.renderTopLevelReact(React.createElement(FavoritesViewComponent, {}, null), context.container);

    HeaderUtilities.TopLevelReactManager.attachCleanUpEvents();

    VSS.globalProgressIndicator.registerProgressElement($(".pageProgressIndicator"));
    Service.getLocalService(Account_Settings_Service.SettingsService).updateHubSelection();
});
