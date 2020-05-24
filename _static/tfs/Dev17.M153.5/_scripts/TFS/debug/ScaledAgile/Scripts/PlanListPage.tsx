/// <reference types="react" />
/// <reference types="react-dom" />
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/PlanListPage";
import "VSS/LoaderPlugins/Css!fabric";

import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Settings_RestClient from "VSS/Settings/RestClient";

import VSS_Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import Context = require("VSS/Context");

import { HubEventNames } from "VSS/Navigation/HubsService";
import { BasePage, IBasePageProps, IBasePageState } from "ScaledAgile/Scripts/BasePage";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { BasePageStore } from "ScaledAgile/Scripts/Main/Stores/BasePageStore";
import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { isDirectoryPage } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { PlansDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/PlansDataProvider";
import { PlanHubFavoritesDataProvider } from "ScaledAgile/Scripts/PlanHub/DataProviders/PlanHubFavoritesDataProvider";
import { PlanHubIndexedSearchStrategy } from "ScaledAgile/Scripts/PlanHub/DataProviders/PlanHubIndexedSearchStrategy";
import { PlanHubActions } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActions";
import { PlanHubActionsCreator } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActionsCreator";
import { PlanHubStore } from "ScaledAgile/Scripts/PlanHub/Stores/PlanHubStore";

import { PlansLoadingState, IPlanHubData } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";

import { AllPlansTab } from "ScaledAgile/Scripts/PlanHub/Components/AllPlansTab";
import { FavoritePlansTab } from "ScaledAgile/Scripts/PlanHub/Components/FavoritePlansTab";
import { IMessage } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { Component as TitleBarComponent } from "VSSPreview/Flux/Components/TitleBar";
import { autobind } from "OfficeFabric/Utilities";

import { PivotBar, PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { HubHeader } from "VSSUI/HubHeader";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";
import { MessageBarType } from "OfficeFabric/MessageBar";

export interface IPlanListPageProps extends IBasePageProps {
    planHubActionsCreator: PlanHubActionsCreator;
    planHubStore: PlanHubStore;
    initialPivot: string;
}

export interface IPlanListPageState extends IBasePageState {
    selectedPivot: string;
}


const filterKey = "plansDirectoryFilterKey";

/**
 * The main list of plans or plan hub page. Includes the Favorites and All plans tabs.
 */
export class PlanListPage extends BasePage<IPlanListPageProps, IPlanListPageState> {
    private _hubViewState: PlanDirectoryHubViewState;
    private _allPivotUrl: IObservableViewStateUrl;
    private _favoritesPivotUrl: IObservableViewStateUrl;
    private _css_pivot_item_class = "planlist-pivot-item";

    public componentWillReceiveProps(newProps: IPlanListPageProps) {
        this.setState({
            selectedPivot: newProps.initialPivot
        });
    }

    protected _getName(): string {
        return "plan-list";
    }

    public componentWillMount() {
        this._hubViewState = new PlanDirectoryHubViewState(this.props.initialPivot);

        this._allPivotUrl = this._hubViewState.createObservableUrl({ [Constants.PlansRouteParameterKey]: Constants.PlansDirectoryPageAllPivot });
        this._favoritesPivotUrl = this._hubViewState.createObservableUrl({ [Constants.PlansRouteParameterKey]: Constants.PlansDirectoryPageFavoritesPivot });

        this._hubViewState.selectedPivot.subscribe(this._onSelectedPivotChanged);
        if (this._hubViewState.selectedPivot.value) {
            this._loadDataForPivot(this._hubViewState.selectedPivot.value);
        }

        this._hubViewState.filter.subscribe(this._onFilterChanged);
    }

    public componentDidMount() {
        super.componentDidMount();
        this.props.planHubStore.addChangedListener(this._onPlanHubStoreChanged);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this.props.planHubStore.removeChangedListener(this._onPlanHubStoreChanged);
        this._onPlanHubStoreChanged = null;
    }

    protected startScenario() {
        // If this is starting as one of our tabs (ie a customer contribution) initialize telemetry.
        if (this.props.initialPivot) {
            const initialTabName = this.props.initialPivot.toLowerCase();
            if (initialTabName === Constants.PlansDirectoryPageAllPivot) {
                ViewPerfScenarioManager.startAllPlansHubInitialLoad();
            } else if (initialTabName === Constants.PlansDirectoryPageFavoritesPivot) {
                ViewPerfScenarioManager.startFavoritePlansHubInitialLoad();
            }
        }
    }

    protected endScenario(prevProps: IPlanListPageProps, prevState: IPlanListPageState) {
        let handled = false;
        if (this.props.initialPivot) {
            if (this.state) {
                if (this.state.pageLoadingState === PageLoadingState.FullyLoaded) {
                    const currentState = this.props.planHubStore.getValue();
                    ViewPerfScenarioManager.addData({ plansCount: currentState.displayedPlans.length });
                    ViewPerfScenarioManager.end();
                    handled = true;
                }
                else if (this.state.pageLoadingState === PageLoadingState.Fail) {
                    ViewPerfScenarioManager.abort();
                    handled = true;
                }
            }
        }
        else {
            // Not our tab, count it as finished.
            handled = true;
        }
        return handled;
    }

    public render(): JSX.Element {
        const commands: IPivotBarAction[] = [{
            key: "new-plan-button",
            name: ScaledAgileResources.NewPlanCTA,
            onClick: this._onNewPlanClick,
            iconProps: { iconType: VssIconType.bowtie, iconName: "bowtie-math-plus-light" },
            important: true
        }];

        return <div className="hub-view plan-list">
            {this._renderMessages()}
            <Hub hubViewState={this._hubViewState} commands={commands}>
                <HubHeader title={ScaledAgileResources.PlanListPageTitle} />
                <FilterBar>
                    <KeywordFilterBarItem
                        key="plan-hub-filter"
                        filterItemKey={filterKey}
                        placeholder={ScaledAgileResources.FilterPlansPlaceholder} />
                </FilterBar>
                <PivotBarItem
                    className={this._css_pivot_item_class}
                    itemKey={Constants.PlansDirectoryPageFavoritesPivot}
                    name={ScaledAgileResources.DirectoryFavoritesPivotTitle}
                    url={this._favoritesPivotUrl}
                    data-is-scrollable={true}
                >
                    <FavoritePlansTab planHubActionsCreator={this.props.planHubActionsCreator} planHubStore={this.props.planHubStore} />
                </PivotBarItem>
                <PivotBarItem
                    className={this._css_pivot_item_class}
                    itemKey={Constants.PlansDirectoryPageAllPivot}
                    name={ScaledAgileResources.DirectoryAllPivotTitle}
                    url={this._allPivotUrl}
                    data-is-scrollable={true}
                >
                    <AllPlansTab planHubActionsCreator={this.props.planHubActionsCreator} planHubStore={this.props.planHubStore} />
                </PivotBarItem>
            </Hub>
        </div>;
    }

    private _loadDataForPivot(pivotKey: string) {
        const currentStoreData = this.props.planHubStore.getValue();
        const allPlansLoadingState = currentStoreData.allPlansLoadingState;
        const favoritePlansLoadingState = currentStoreData.favoritesLoadingState;

        if (pivotKey === Constants.PlansDirectoryPageAllPivot) {
            this.props.planHubActionsCreator.refreshStore(
                allPlansLoadingState === PlansLoadingState.None,
                favoritePlansLoadingState === PlansLoadingState.None);
            this.props.planHubActionsCreator.filterPlansOnFavorites(false);
        }
        else if (pivotKey === Constants.PlansDirectoryPageFavoritesPivot) {
            if (favoritePlansLoadingState === PlansLoadingState.None) {
                this.props.planHubActionsCreator.refreshStore(false, true);
            }
            this.props.planHubActionsCreator.filterPlansOnFavorites(true);
        }
    }

    private _getTabLoadingState(currentState: IPlanHubData): PageLoadingState {
        if (this.state.messages.filter(m => m.messageType === MessageBarType.error).length > 0) {
            return PageLoadingState.Fail;
        }
        if ((this.props.initialPivot === Constants.PlansDirectoryPageAllPivot && (currentState.allPlansLoadingState === PlansLoadingState.Ready && currentState.favoritesLoadingState === PlansLoadingState.Ready))
            || (this.props.initialPivot === Constants.PlansDirectoryPageFavoritesPivot && (currentState.favoritesLoadingState === PlansLoadingState.Ready))) {
            return PageLoadingState.FullyLoaded;
        }
        return PageLoadingState.None;
    }

    private _updateLastVisitedPivotAsync(pivotKey: string) {
        const settingsClient = VSS_Service.getClient(Settings_RestClient.SettingsHttpClient);
        const pageContext = Context.getPageContext();
        const project = pageContext.webContext.project;
        if (project && project.id) {
            const entries: IDictionaryStringTo<any> = {};
            entries[Constants.MruTabKey] = pivotKey;
            settingsClient.setEntriesForScope(entries, "me", "project", project.id);
        }
    }

    @autobind
    private _onFilterChanged(value: IFilterState) {
        if (value[filterKey]) {
            this.props.planHubActionsCreator.setFilterText(value[filterKey].value);
        }
    }

    @autobind
    private _onSelectedPivotChanged(newPivotKey: string) {
        if (isDirectoryPage(newPivotKey)) {
            this._loadDataForPivot(newPivotKey);
            this._updateLastVisitedPivotAsync(newPivotKey);
        }
    }

    @autobind
    private _onNewPlanClick(event: React.MouseEvent<HTMLElement>) {
        this.props.planHubActionsCreator.openPlan(Constants.CreateWizardViewId);
    }

    private _onPlanHubStoreChanged = (store: PlanHubStore) => {
        const tabLoadingState = this._getTabLoadingState(store.getValue());
        this.setState({ pageLoadingState: tabLoadingState } as IPlanListPageState);
    };
}

class PlanDirectoryHubViewState extends VssHubViewState {
    constructor(defaultPivot: string) {
        super({
            defaultPivot: defaultPivot,
            pivotNavigationParamName: Constants.PlansRouteParameterKey
        });
        this.setupNavigation();
    }
}

export function initPlanListPage(container: HTMLElement, pivotKey: string): void {
    const hubFlux = __getHubFlux();

    ReactDOM.render(<PlanListPage
        hubViewClass="plan-list bowtie"
        pageStore={hubFlux.pageStore}
        planHubActionsCreator={hubFlux.actionsCreator}
        planHubStore={hubFlux.store}
        initialPivot={pivotKey} />, container);

    // Subscribe to PreXHRNavigate event in order to clean up the store on navigating away using xhr.
    const eventService = Events_Services.getService();
    const preXhrNavigateHandler = () => {
        disposeHubFlux();
        eventService.detachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
    };
    eventService.attachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
}

export function disposeHubFlux() {
    if (__hubFlux) {
        __hubFlux.store.dispose();
        __hubFlux.pageStore.dispose();
        __hubFlux = null;
    }
}

/**
 * Global actions/store/actions creator. Shared across all tabs.
 */
var __hubFlux: { pageStore: BasePageStore, actions: PlanHubActions, store: PlanHubStore, actionsCreator: PlanHubActionsCreator };
function __getHubFlux() {
    if (!__hubFlux) {
        const pageActions = new PageActions();
        const pageStore = new BasePageStore(pageActions);

        const planHubActions = new PlanHubActions();
        const planHubStore = new PlanHubStore(planHubActions, new PlanHubIndexedSearchStrategy());
        const planHubActionsCreator = new PlanHubActionsCreator(new PlansDataProvider(), new PlanHubFavoritesDataProvider(), planHubActions, pageActions);

        __hubFlux = {
            pageStore: pageStore,
            actions: planHubActions,
            store: planHubStore,
            actionsCreator: planHubActionsCreator
        };
    }

    return __hubFlux;
}