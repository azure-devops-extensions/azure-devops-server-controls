/// <reference types="react" />
/// <reference types="react-dom" />
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/PlanPage";

import * as React from "react";
import * as ReactDOM from "react-dom";

import Events_Services = require("VSS/Events/Services");
import { autobind } from "OfficeFabric/Utilities";
import * as Diag from "VSS/Diag";

import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { HubEventNames } from "VSS/Navigation/HubsService";
import { BasePage, IBasePageProps, IBasePageState } from "ScaledAgile/Scripts/BasePage";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { BasePageStore } from "ScaledAgile/Scripts/Main/Stores/BasePageStore";
import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { getPlansDirectoryUrl, getPlanURL, onClickNavigationHandler } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { ViewBounds } from "ScaledAgile/Scripts/Main/Models/ViewsImplementations";
import { IViewActionsCreator, ViewActionsCreator } from "ScaledAgile/Scripts/Main/Actions/ViewActionsCreator";
import { ViewsDataProvider } from "ScaledAgile/Scripts/Main/DataProviders/ViewsDataProvider";
import { ViewsMapper } from "ScaledAgile/Scripts/Main/Models/ViewsMapper";
import { ViewsStore, IViewsStore } from "ScaledAgile/Scripts/Main/Stores/ViewsStore";
import { ViewsActions } from "ScaledAgile/Scripts/Main/Actions/ViewsActions";
import { PlanType } from "TFS/Work/Contracts";

import { init as initDeliveryTimeLine } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DeliveryTimeLineMain";
import { DeliveryTimelinePreferences } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DeliveryTimelinePreferences";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

import { IHubBreadcrumbItem, IHeaderItemPicker } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { VssIconType } from "VSSUI/VssIcon";
import { IPivotBarViewAction, PivotBarItem, PivotBarViewActionType, ISliderViewActionProps } from "VSSUI/PivotBar";
import { Hub, IHubProps } from "VSSUI/Hub";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HubHeader } from "VSSUI/HubHeader";

import { FavoriteItemPicker, IFavoriteItemPickerProps, IFavoriteItem } from "Favorites/Controls/FavoriteItemPicker";
import { PlanHubFavoritesDataProvider } from "./PlanHub/DataProviders/PlanHubFavoritesDataProvider";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { FavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { FavoritesFailureState } from "Favorites/Controls/FavoritesModels";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { ArtifactScope } from "Favorites/Contracts";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { DeliveryTimeLineEvents } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { format } from "VSS/Utils/String";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
/**
 * Receive only the view data. We do not get any payload since at this level we are agnostic of what will be loaded on the right panel
 */
export interface IPlanPageProps extends IBasePageProps {
    /**
     * What: The view store
     * Why: Used to get notification when the view gets updated, get the selected plan
     */
    viewsStore: IViewsStore;

    /**
     * The views action creator
     */
    actionsCreator: IViewActionsCreator;

    /**
     * The ID of the plan that this page is loading
     */
    planId: string;
}

export interface IPlanPageState extends IBasePageState {
    /**
     * The current view store data, which describes overall page state
     */
    storeData: IViewsStoreData;
}

export interface IViewContentElements {
    /**
     *  The View to be rendered
     */
    view: JSX.Element;

    /**
     * Optional callback to be invoked when the "settings" cog is clicked.
     * 
     * If omitted, no button will be shown.
     */
    settingsAction?: () => void;

    /**
     * Optional callback to be invoked when the "zoom" slider value is changed.
     * 
     * If omitted, no slider will be shown.
     */
    zoomChanged?: (newValue: number) => void;

    /**
     * Optional filter control that will be rendered in the command bar area.
     */
    filter?: JSX.Element;

    /**
     * Optional callback to be invoked to set focus on filter bar.
     */
    onSetFilterBarFocus?: () => void;

    /**
     * Callback method for cleanup logic on unloading the component.
     * Invoked by the PlanPage while being unmounted.
     */
    dispose: () => void;
}

const PLAN_ZOOM_KEY = "plan-zoom";

/**
 * Page which renders the Delivery Timeline for a Plan and associated header elements
 */
export class PlanPage extends BasePage<IPlanPageProps, IPlanPageState> {
    private _viewContent: IViewContentElements;
    private _hubViewState: IVssHubViewState;

    private _favoritesStore: FavoritesStore;
    private _favoritesActionsCreator: FavoritesActionsCreator;
    private _plansArtifactScope: ArtifactScope;
    private _viewPreference: DeliveryTimelinePreferences;
    private _css_pivot_item_class = "plan-pivot-item";

    constructor(props: IPlanPageProps, context?: any) {
        super(props, context);

        this._viewPreference = new DeliveryTimelinePreferences();
        const preference = this._viewPreference.get(props.planId);
        this._hubViewState = new PlanPageHubViewState(props.planId);
        this._hubViewState.viewOptions.setViewOption(PLAN_ZOOM_KEY, preference.zoomLevel);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        const currentProject = TfsContext.getDefault().contextData.project;
        this._plansArtifactScope = {
            id: currentProject.id,
            name: currentProject.name,
            type: 'Project'
        };

        this._initializeFavoriteActionsCreator();
    }

    private _initializeFavoriteActionsCreator() {
        const actions = new FavoritesActions();
        this._favoritesStore = new FavoritesStore(actions);
        this._favoritesActionsCreator = new FavoritesActionsCreator(new FavoritesDataProvider(), this._favoritesStore, actions);
        this._favoritesActionsCreator.initializeStore([PlanHubFavoritesDataProvider.FavoriteType], this._plansArtifactScope);

        const favoritesActions = this._favoritesActionsCreator.getActions();
        favoritesActions.FavoritingFailed.addListener(this._favoriteActionFailed);
        favoritesActions.UnfavoritingFailed.addListener(this._favoriteActionFailed);
    }

    @autobind
    private _favoriteActionFailed(failure: FavoritesFailureState) {
        // This handler was invoked by a FavoritePicker action; we can't invoke actions inside of
        // other actions, so do this asynchronously
        setTimeout(() => this.props.actionsCreator.displayError(failure.exceptionMessage), 0);
    }

    public componentDidMount() {
        super.componentDidMount();

        if (this.state.storeData && this.state.storeData.view) {
            this._setDocumentTitle();
        }

        Events_Services.getService().attachEvent(DeliveryTimeLineEvents.SHOW_AND_FOUCS_PLANFILTER_KEY_PRESSED, this._onDisplayAndFocusFilter);
        this.props.viewsStore.addChangedListener(this._viewChangedHandler);
    }

    public componentDidUpdate(prevProps: IPlanPageProps, prevState: IPlanPageState) {
        // BasePage will end performance scenario event
        super.componentDidUpdate(prevProps, prevState);

        if (
            this.state.storeData && this.state.storeData.view && (
                !prevState.storeData || !prevState.storeData.view || prevState.storeData.view.name !== this.state.storeData.view.name
            )
        ) {
            this._setDocumentTitle();
        }
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        if (this._viewContent) {
            this._viewContent.dispose();
        }
        Events_Services.getService().detachEvent(DeliveryTimeLineEvents.SHOW_AND_FOUCS_PLANFILTER_KEY_PRESSED, this._onDisplayAndFocusFilter);
        this.props.viewsStore.removeChangedListener(this._viewChangedHandler);

        if (this._hubViewState) {
            this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged);
            this._hubViewState.dispose();
        }

        const favoritesActions = this._favoritesActionsCreator.getActions();
        favoritesActions.FavoritingFailed.removeListener(this._favoriteActionFailed);
        favoritesActions.UnfavoritingFailed.removeListener(this._favoriteActionFailed);
    }

    @autobind
    private _viewChangedHandler(data: ViewsStore) {
        this.setState({ storeData: data.getValue() });
    }

    protected _getName(): string {
        return "plan-view";
    }

    protected startScenario(): void {
        ViewPerfScenarioManager.startDeliveryTimelineLoadScenario();
    }

    protected endScenario(): boolean {
        let handled = false;
        if (this.state && this.state.pageLoadingState) {
            if (this.state.pageLoadingState === PageLoadingState.WithMinimumData ||
                this.state.pageLoadingState === PageLoadingState.FullyLoaded) {
                ViewPerfScenarioManager.end();
                handled = true;
            }
            else if (this.state.pageLoadingState === PageLoadingState.Fail) {
                ViewPerfScenarioManager.abort();
                handled = true;
            }
        }
        return handled;
    }

    private _getFavoriteItemPicker(): IHeaderItemPicker {
        let view = this.props.viewsStore.getValue().view;
        const props: IFavoriteItemPickerProps = {
            favoritesContext: {
                artifactTypes: [PlanHubFavoritesDataProvider.FavoriteType],
                artifactScope: this._plansArtifactScope,
                actionsCreator: this._favoritesActionsCreator
            },
            selectedItem: {
                id: this.props.planId,
                name: view ? view.name : null
            },
            onFavoriteClick: this._onFavoriteClick,
            getFavoriteItemIcon: (item: IFavoriteItem) => ({ iconName: "plan", iconType: VssIconType.bowtie })
        };
        return new FavoriteItemPicker(props);
    }

    @autobind
    private _onFavoriteClick(artifact?: IFavoriteItem) {
        if (artifact && artifact.id !== this.props.planId) {
            onClickNavigationHandler(getPlanURL(artifact.id));
        }
    }

    private _renderHubHeader(): JSX.Element {
        const breadcrumbItems: IHubBreadcrumbItem[] = [{
            key: "plans-directory-hub-breadcrumb",
            onClick: ev => onClickNavigationHandler(getPlansDirectoryUrl(), ev),
            text: ScaledAgileResources.PlansHubTitle
        }];
        const viewData = this.props.viewsStore.getValue().view;
        return <HubHeader
            breadcrumbItems={breadcrumbItems}
            iconProps={{ iconName: "plan", iconType: VssIconType.bowtie }}
            title={viewData ? viewData.name : null}
            headerItemPicker={this._getFavoriteItemPicker()}
        />;
    }

    private _getViewActions(): IPivotBarViewAction[] {
        if (this.state.pageLoadingState === PageLoadingState.None
            || this.state.pageLoadingState === PageLoadingState.Initial
            || this.state.pageLoadingState === PageLoadingState.Fail) {
            return [];
        }

        let viewActions: IPivotBarViewAction[] = [];

        if (this._viewContent && this._viewContent.zoomChanged) {
            const sliderProps: ISliderViewActionProps = {
                minValue: DeliveryTimeLineViewConstants.zoomLevelMin,
                maxValue: DeliveryTimeLineViewConstants.zoomLevelMax,
                step: 1
            };

            viewActions.push({
                key: PLAN_ZOOM_KEY,
                title: ScaledAgileResources.PlansZoomSliderTooltip,
                actionType: PivotBarViewActionType.Slider,
                important: true,
                ariaLabel: ScaledAgileResources.PlansZoomSliderAriaLabel,
                actionProps: sliderProps
            });
        }

        if (this._viewContent && this._viewContent.settingsAction) {
            viewActions.push({
                key: "plan-settings",
                title: ScaledAgileResources.ConfigurationButtonTitle,
                actionType: PivotBarViewActionType.Command,
                important: true,
                iconProps: { iconName: "settings-gear", iconType: VssIconType.bowtie },
                onClick: () => this._viewContent.settingsAction()
            });
        }

        return viewActions;
    }

    /**
     * What: Render the content but also handle the loading experience
     * Why: We need to have a way to indicate to the user that something is happening. We remove the spinner when viewContent is available 
     */
    protected _renderContent(): JSX.Element {
        if (this.state.pageLoadingState === PageLoadingState.Fail) {
            // The BasePage will render any error messages above the content; we don't need to handle it here.
            return null;
        }

        if (this.state.storeData && !this._viewContent) {
            Diag.Debug.assertIsNotNull(this.state.storeData);
            this._viewContent = this._initializeDeliveryTimeline(this.state.storeData);
        }

        const isLoading = this.state.pageLoadingState === PageLoadingState.None || this.state.pageLoadingState === PageLoadingState.Initial;
        const content = isLoading ? <Spinner className="plans-loading-spinner" aria-busy={true} type={SpinnerType.large} label={ScaledAgileResources.LoadingSpinner} /> : this._viewContent.view;
        const filter = this._viewContent === undefined ? null : this._viewContent.filter;
        const hubProps: IHubProps = {
            hubViewState: this._hubViewState,
            onRenderFilterBar: () => filter
        };

        const viewActions = this._getViewActions();
        return <Hub {...hubProps} className="plan-page-hub" >
            {this._renderHubHeader()}
            <PivotBarItem itemKey={this.props.planId} name={this.props.planId} style={{ position: "relative" }} viewActions={viewActions}>
                <div className="plan-view">
                    <div className="plan-content" >
                        {content}
                    </div>
                </div>
            </PivotBarItem>
        </Hub>;
    }

    @autobind
    private _onViewOptionsChanged(value: IViewOptionsValues, action?: string) {
        if (PLAN_ZOOM_KEY in value && this._viewContent && this._viewContent.zoomChanged) {
            this._viewContent.zoomChanged(value[PLAN_ZOOM_KEY]);
        }
    }

    @autobind
    private _onDisplayAndFocusFilter() {
        if (this._hubViewState) {
            this._hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
        }

        if (this._viewContent && this._viewContent.onSetFilterBarFocus) {
            this._viewContent.onSetFilterBarFocus();
        }
    }

    private _initializeDeliveryTimeline(view: IViewsStoreData): IViewContentElements {
        let rect = this.containerReference.getBoundingClientRect();
        let viewBounds = new ViewBounds(rect.width - DeliveryTimeLineViewConstants.planMarginRight, rect.height - DeliveryTimeLineViewConstants.titleHeaderHeight);
        return initDeliveryTimeLine(view,
            viewBounds,
            this.containerReference,
            this.props.pageActions,
            this.props.actionsCreator,
            this.props.viewsStore,
            this._viewPreference,
            this._hubViewState ? this._hubViewState.filter : null
        );
    }

    private _setDocumentTitle(): void {
        document.title = getDefaultPageTitle(this.state.storeData.view.name);
    }
}

class PlanPageHubViewState extends VssHubViewState {
    constructor(pivot: string) {
        super({
            pivotNavigationParamName: Constants.PlansRouteParameterKey,
            defaultPivot: pivot
        });
        this.setupNavigation();
    }
}

/**
 * Renders the PlanPage component into the specified HTMLElement.
 * @param {HTMLElement} container - The container element, under which the control needs to be rendered
 */
export function initPlanPage(container: HTMLElement, planId: string): void {
    const events = Events_Services.getService();
    const pageActions = new PageActions();
    const pageStore = new BasePageStore(pageActions);

    const planDataProvider = new ViewsDataProvider(new ViewsMapper());
    const planActions = new ViewsActions();
    const planStore = new ViewsStore(planActions);
    const planActionsCreator = new ViewActionsCreator(planDataProvider, planActions, pageActions);

    const dispose = () => {
        ReactDOM.unmountComponentAtNode(container);
        events.detachEvent(HubEventNames.PreXHRNavigate, dispose);
        events.detachEvent("refresh-planpage", refresh);
    };

    const refresh = () => {
        dispose();
        initPlanPage(container, planId);
    };

    ReactDOM.render(<PlanPage
        planId={planId}
        pageActions={pageActions}
        pageStore={pageStore}
        actionsCreator={planActionsCreator}
        viewsStore={planStore}
    />, container);

    events.attachEvent(HubEventNames.PreXHRNavigate, dispose);
    events.attachEvent("refresh-planpage", refresh);
    planActionsCreator.initializeViewsStore(planId);
}
