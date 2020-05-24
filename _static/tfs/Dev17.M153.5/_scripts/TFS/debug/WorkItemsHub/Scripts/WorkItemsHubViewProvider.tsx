import "VSS/LoaderPlugins/Css!fabric";

import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Context from "VSS/Context";
import { HubsService } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as NavigationServices from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { delay } from "VSS/Utils/Core";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import {
    IPivotBarAction,
    IPivotBarViewAction,
    PivotBarViewActionType,
    IOnOffViewActionProps
} from "VSSUI/PivotBar";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { ObservableArray } from "VSS/Core/Observable";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { ActionsHub } from "WorkItemsHub/Scripts/Actions/ActionsHub";
import { WorkItemsHubView } from "WorkItemsHub/Scripts/Components/WorkItemsHubView";
import { WorkItemsTabContent } from "WorkItemsHub/Scripts/Components/WorkItemsTabContent";
import { IWorkItemsTabContentData } from "WorkItemsHub/Scripts/Components/WorkItemsTabContent";
import { WorkItemsHubCommandProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubCommandProvider";
import { WorkItemsHubDataProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubDataProvider";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubRouteConstants } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import { PerformanceTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import {
    IWorkItemsGridColumnFactory,
    WorkItemsGridColumnFactory,
} from "WorkItemsHub/Scripts/Utils/WorkItemsGridColumnFactory";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import { WorkItemEventHandler } from "WorkItemsHub/Scripts/WorkItemEventHandler";
import { WorkItemsHubShortcutGroup } from "WorkItemsHub/Scripts/WorkItemsHubShortcutGroup";
import { WorkItemsHubData } from "WorkItemsHub/Scripts/Generated/Contracts";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { HubViewStateEventNames } from "VSSUI/Utilities/HubViewState";
import * as WorkItemsHubTabSettings from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabSettings";
import { IWorkItemsHubTriageData, setWorkItemsHubTriageData } from "WorkItemsHub/Scripts/WorkItemsViewRegistration";
import { DeviceTypeService } from "VSS/DeviceTypeService";
import * as WorkItemsXhrNavigationUtils from "WorkItemsHub/Scripts/Utils/WorkItemsXhrNavigationUtils";
import { ITabContributionInfo } from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";

const VIEWOPTIONS_SHOW_COMPLETED_ITEMS_KEY: string = "show-completed-items";

export const InitalizationStateKeys: string[] = ["filterText", "viewOption"];

export class WorkItemsHubViewProvider implements IDisposable {
    private _store: WorkItemsHubStore;
    private _actionsCreator: ActionsCreator;
    private _workItemEventHandler: WorkItemEventHandler;
    private _container: HTMLElement;
    private _gridColumnFactory: IWorkItemsGridColumnFactory;
    private _projectInfo: ContextIdentifier;
    private _performanceTelemetryHelper: PerformanceTelemetryHelper = new PerformanceTelemetryHelper();
    private _initialTabId: string;
    private _tagWidthsCache: IDictionaryStringTo<number> = {};
    private _hubViewState: IVssHubViewState;
    private _observableCommands: ObservableArray<IPivotBarAction>;
    private _observableViewActions: ObservableArray<IPivotBarViewAction>;
    private _workItemsHubCommandProvider: WorkItemsHubCommandProvider;
    private _workItemsHubShortcutGroup: WorkItemsHubShortcutGroup;
    private _viewActionCache: IDictionaryStringTo<IPivotBarViewAction[]> = {};
    private _lastContentData: IWorkItemsTabContentData;
    private _firstTabLoaded: boolean = false;
    private _scrollableContentContainer: Element = null;

    constructor(context: SDK_Shim.InternalContentContextData, state: IDictionaryStringTo<any>, private _tabContributionInfoList: ITabContributionInfo[]) {
        const { filterText, viewOption } = state;

        this._performanceTelemetryHelper.startInitialLoad();
        const pageContext: PageContext = Context.getPageContext();
        this._projectInfo = pageContext.webContext.project;
        this._container = context.container;
        this._gridColumnFactory = new WorkItemsGridColumnFactory();
        this._initializeFlux(viewOption);
        this._registerContents(WorkItemsHubTabUtils.TabIds);
        this._initView();
        this._setTitle();

        if (filterText != null) {
            this._actionsCreator.updateFilterState(this._initialTabId, { text: { "values": [filterText] } });
        }
    }

    private _initializeFlux(viewOption?: string): void {
        const actionsHub = new ActionsHub();
        const hubData: WorkItemsHubData = WorkItemsHubDataProvider.getDataForCurrentTab();
        const defaultTabId = hubData ? hubData.processSettings.tabId : WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.AssignedToMe];

        this._setInitialViewAction(defaultTabId);

        let showCompletedItemsOverride = null;
        if (viewOption) {
            showCompletedItemsOverride = Utils_String.equals(viewOption, "showCompleted", true);

            if (hubData && hubData.userSettings && hubData.userSettings.showCompleted !== showCompletedItemsOverride) {
                WorkItemsHubTabSettings.updateShowCompletedForTab(this._projectInfo.id, this._initialTabId, showCompletedItemsOverride);
            }
        }

        this._store = new WorkItemsHubStore(actionsHub, this._initialTabId, hubData, null, showCompletedItemsOverride);
        this._actionsCreator = new ActionsCreator(actionsHub);
        this._workItemEventHandler = new WorkItemEventHandler(this._actionsCreator);
    }

    private _registerContents(tabIds: string[]): void {
        tabIds.forEach(tabId => SDK_Shim.registerContent(`workitems.tab.${tabId}`, (context: SDK_Shim.InternalContentContextData) => {
            if (!this._scrollableContentContainer && this._container) {
                this._scrollableContentContainer = this._container.querySelector("[data-is-scrollable='true']");
            }

            ReactDOM.render(<WorkItemsTabContent
                tabId={tabId}
                gridClassName={`${tabId}-grid`}
                store={this._store}
                actionsCreator={this._actionsCreator}
                gridColumnFactory={this._gridColumnFactory}
                projectInfo={this._projectInfo}
                performanceTelemetry={this._performanceTelemetryHelper}
                tagWidthsCache={this._tagWidthsCache}
                filter={this._hubViewState.filter}
                commandProvider={this._workItemsHubCommandProvider}
                onTabContentChanged={this._onTabContentChanged}
                onOpenWorkItem={this._onOpenWorkItem}
                scrollableContentContainer={this._scrollableContentContainer} />,
                context.container);

            if (this._firstTabLoaded) {
                // persist tab location when we change tab
                WorkItemsHubTabSettings.updateRecentTabId(this._projectInfo.id, tabId);
            }
            else {
                this._firstTabLoaded = true;
            }

            // reregister the shortcuts since we're scoping the shortcut to the grid
            // note: scopeElement can be undefined with fast tab switch,
            // where the tabs prior to the previous has already called unmount on the container (likely due to the delay, see dispose below)
            const scopeElement: Element = document.getElementsByClassName(WorkItemsTabContent.BaseClassName)[0];
            if (scopeElement) {
                this._workItemsHubShortcutGroup.reregisterWorkItemsHubShortcuts(scopeElement);
            }

            return {
                // When XHR-navigating to another hub, this cleanup code might be called as a result of a React event handler. If
                // we dispose while the item is still being processed, we will run into React errors, so cleanup on the next tick.
                // See also mseng #1043955
                dispose: () => delay(null, 0, () => ReactDOM.unmountComponentAtNode(context.container))
            } as IDisposable;
        }));
    }

    private _setTitle(): void {
        // since our hub changes title in work form view, we need to make sure we reset the title under work items hub view
        const hubsService = Service.getLocalService(HubsService);
        const hub: Hub = hubsService.getHubById(hubsService.getSelectedHubId());
        document.title = NavigationServices.getDefaultPageTitle(hub.name);
    }

    private _initView(): void {
        this._hubViewState = new VssHubViewState({
            defaultPivot: this._initialTabId,
            pivotNavigationParamName: WorkItemsHubRouteConstants.TabRouteParameterName,
            viewOptionNavigationParameters: [
                { key: HubViewOptionKeys.showFilterBar, behavior: HistoryBehavior.none }
            ]
        });

        this._hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
        this._hubViewState.viewOptions.setViewOption(WorkItemsHubRouteConstants.TabRouteParameterName, this._initialTabId);
        this._setViewOptions(this._initialTabId);
        this._workItemsHubCommandProvider = new WorkItemsHubCommandProvider(this._store, this._hubViewState, this._actionsCreator);
        this._observableCommands = this._getObservableCommands({ selectionIds: [], hasFilter: false, tabId: this._initialTabId });
        const viewActions = this._getHubViewActions(this._initialTabId);
        // important: always create a new starting array for ObservableArray since we have caching logic
        this._observableViewActions = new ObservableArray<IPivotBarViewAction>([...viewActions]);

        this._hubViewState.subscribe(this._onPivotChanging, HubViewStateEventNames.pivotChanging);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        this._performanceTelemetryHelper.split("BeforeRender");

        ReactDOM.render(<WorkItemsHubView
            hubViewState={this._hubViewState}
            store={this._store}
            actionsCreator={this._actionsCreator}
            projectInfo={this._projectInfo}
            commands={this._observableCommands}
            viewActions={this._observableViewActions}
            ref={this._resolveWorkItemsHubView} />,
            this._container);
    }

    private _getHubViewActions(tabId: string): IPivotBarViewAction[] {
        const store = this._store;
        const data: WorkItemsHubData = store.getHubDisplayData(tabId);
        if (!data) {
            return [];
        }

        // cache for shallow compare to avoid unnecessary hub updates
        let cachedActions: IPivotBarViewAction[] = this._viewActionCache[tabId];
        if (this._viewActionCache[tabId]) {
            return cachedActions;
        }

        cachedActions = this._viewActionCache[tabId] = [];
        const isRecentlyCompletedPivot = tabId === WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted];
        cachedActions.push({
            key: VIEWOPTIONS_SHOW_COMPLETED_ITEMS_KEY,
            name: Resources.CompletedItemsViewOptionName,
            actionType: PivotBarViewActionType.OnOff,
            important: false,
            actionProps: {
                onText: Resources.CompletedItemsShow,
                offText: Resources.CompletedItemsHide,
                onAriaLabel: Utils_String.format(Resources.CompletedWorkItemsToggleLabel, Resources.CompletedWorkItemsOnText),
                offAriaLabel: Utils_String.format(Resources.CompletedWorkItemsToggleLabel, Resources.CompletedWorkItemsOffText)
            } as IOnOffViewActionProps,
            disabled: isRecentlyCompletedPivot
        });

        return cachedActions;
    }

    @autobind
    private _resolveWorkItemsHubView(workItemsHubView: WorkItemsHubView): void {
        // create the shortcut group once the hub view is available
        if (workItemsHubView) {
            this._workItemsHubShortcutGroup = new WorkItemsHubShortcutGroup(this._workItemsHubCommandProvider, workItemsHubView, this._hubViewState);
        }
    }

    private _setInitialViewAction(defaultTabId: string): void {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();
        const name = state[WorkItemsHubRouteConstants.TabRouteParameterName];

        // if name is empty or invalid, set a default name (persisted tab id or assignedtome if visited first time) in the URL
        if (!name || WorkItemsHubTabUtils.getTabIdByName(name) === null) {
            state[WorkItemsHubRouteConstants.TabRouteParameterName] = defaultTabId;
            navHistoryService.replaceState(state);
            this._initialTabId = defaultTabId;
        }
        else {
            this._initialTabId = WorkItemsHubTabUtils.getTabIdByName(name);
        }
    }

    public dispose(): void {
        if (this._hubViewState) {
            this._hubViewState.unsubscribe(this._onPivotChanging);
            this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
            this._hubViewState.dispose();
            this._hubViewState = null;
        }

        if (this._container) {
            // When XHR-navigating to another hub, this cleanup code might be called as a result of a React event handler. If
            // we dispose while the item is still being processed, we will run into React errors, so cleanup on the next tick.
            // See also mseng #1043955
            delay(null, 0, () => {
                if (this._container) {
                    ReactDOM.unmountComponentAtNode(this._container);
                    this._container = null;
                }
            });
        }

        if (this._store) {
            this._store.dispose();
            this._store = null;
        }

        this._actionsCreator = null;

        if (this._workItemEventHandler) {
            this._workItemEventHandler.dispose();
            this._workItemEventHandler = null;
        }
    }

    @autobind
    private _onOpenWorkItem(workItemId: number, ev?: React.MouseEvent<HTMLAnchorElement>): boolean | void {
        if (!ev) {
            const startingWorkItemId = this._initTriageData(workItemId);
            WorkItemsXhrNavigationUtils.navigateToEditWorkItemForm(startingWorkItemId);
            return;
        }

        if (WorkItemsHubViewProvider._isMobileDevice()) {
            // if on mobile, prevent XHR navigate and just do regular link click.
            return true;
        }

        const startingWorkItemId = this._initTriageData(workItemId, true /* mouse event */);
        const onEditAnchorClick = WorkItemsXhrNavigationUtils.getEditWorkItemFormNavigationHandler(startingWorkItemId);
        if (onEditAnchorClick(ev.nativeEvent)) {
            return; // event handler returned true to let browser handle event
        }

        // XHR navigating, so tell browser not to handle
        ev.preventDefault();
        ev.stopPropagation();
    }

    /**
     * Initializes triage data.
     * @param workItemId Starting work item ID
     * @param isFromMouseEvent True if triaging from mouse event
     * @returns Actual starting work item ID based on selections
     */
    private _initTriageData(workItemId: number, isFromMouseEvent: boolean = false): number {
        if (this._lastContentData) {
            const { tabId, selectionIds } = this._lastContentData;
            const tabInfo = Utils_Array.first(this._tabContributionInfoList, info => info.tabId === tabId);
            const tabName = tabInfo.friendlyName;
            let workItemIds = selectionIds;
            let scrollTopValue: number = this._scrollableContentContainer ? this._scrollableContentContainer.scrollTop : 0;

            const dataSource = this._store.getHubFilterDataSource(tabId);
            const filteredIds: number[] = dataSource ? dataSource.getFilteredIds() : null;

            if (!selectionIds || selectionIds.length < 2) {
                if (filteredIds) {
                    workItemIds = filteredIds;
                }
            }
            else if (!isFromMouseEvent) {
                // When triaging based on selection, start with the first item.
                // Feature flag check here because w/o triage mode, we should navigate to the original target item.
                workItemId = selectionIds[0];
            }

            if (!workItemIds || workItemIds.length === 0) {
                setWorkItemsHubTriageData(null);
                return workItemId;
            }

            if ((selectionIds && selectionIds.length === 0) || workItemIds.indexOf(workItemId) === -1) {
                // when nothing is selected or the target work item isn't in the triage list, fall back to the first item
                workItemId = workItemIds[0];
                scrollTopValue = 0;
            }

            // Get the index of the selected item from the full filtered list and not the workItemIds as it doesn't contain the full visible items list all the time
            const selectedItemIndexInVisibleList = Utils_Array.findIndex(filteredIds, (filteredId: number) => filteredId === workItemId);
            setWorkItemsHubTriageData({ tabId, tabName, workItemIds, lastTriagedWorkItemId: workItemId, selectedItemIndexInVisibleList, selectedIndexScrollTopValue: scrollTopValue } as IWorkItemsHubTriageData);
        }
        else {
            setWorkItemsHubTriageData(null);
        }

        return workItemId;
    }

    @autobind
    private _onTabContentChanged(data: IWorkItemsTabContentData): void {
        const { tabId } = data;
        this._lastContentData = data;

        this._workItemsHubCommandProvider.setTabData(data);

        if (this._store) {
            const newCommands = this._workItemsHubCommandProvider.getCommands(this._store.getWorkItemsHubPermission(), this._store.isSupportedFeature(tabId));
            if (!Utils_Array.shallowEquals(this._observableCommands.value, newCommands)) {
                this._observableCommands.value = newCommands;
            }

            const viewActions = this._getHubViewActions(tabId);
            if (!Utils_Array.shallowEquals(this._observableViewActions.value, viewActions)) {
                this._observableViewActions.value = viewActions;
            }
            this._setViewOptions(tabId);
        }
    }

    private _setViewOptions(tabId: string): void {
        if (!this._store.isHubDataInitialized(tabId)) {
            return;
        }

        const { viewOptions } = this._hubViewState;
        const option: IViewOptionsValues = viewOptions.getViewOptions();
        const dataSource = this._store.getHubFilterDataSource(tabId);

        const isRecentlyCompletedPivot = tabId === WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted];
        const shouldShowCompletedItems = isRecentlyCompletedPivot || dataSource.shouldShowCompletedItems();
        option[VIEWOPTIONS_SHOW_COMPLETED_ITEMS_KEY] = shouldShowCompletedItems;

        viewOptions.setViewOptions(option, true /* supress event */);
    }

    @autobind
    private _onPivotChanging(tabId: string): void {
        this._performanceTelemetryHelper.startTabSwitch();
        this._hubViewState.viewOptions.setViewOption(WorkItemsHubRouteConstants.TabRouteParameterName, tabId);
        setWorkItemsHubTriageData(null);
    }

    @autobind
    private _onViewOptionsChanged(value: IViewOptionsValues, action?: string): void {
        const { selectedPivot } = this._hubViewState;
        const tabId = selectedPivot.value;
        const store = this._store;
        const data: WorkItemsHubData = store.getHubDisplayData(tabId);

        if (!data) {
            return null;
        }

        const projectId: string = this._projectInfo.id;
        if (value.hasOwnProperty(VIEWOPTIONS_SHOW_COMPLETED_ITEMS_KEY)
            && tabId !== WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted]) {

            const showCompletedItems = value[VIEWOPTIONS_SHOW_COMPLETED_ITEMS_KEY];
            this._actionsCreator.setCompletedItemsVisibility(tabId, showCompletedItems);
            WorkItemsHubTabSettings.updateShowCompletedForTab(projectId, tabId, showCompletedItems);
            UsageTelemetryHelper.publishCompletedWorkItemsViewOptionTelemetry(tabId, showCompletedItems);
        }
    }

    private _getObservableCommands(data: IWorkItemsTabContentData): ObservableArray<IPivotBarAction> {
        const { tabId } = data;
        this._workItemsHubCommandProvider.setTabData(data);
        return new ObservableArray(this._workItemsHubCommandProvider.getCommands(this._store.getWorkItemsHubPermission(), this._store.isSupportedFeature(tabId)));
    }

    private static _isMobileDevice(): boolean {
        const deviceTypeService = Service.getService(DeviceTypeService);
        return deviceTypeService && deviceTypeService.isMobile();
    }
}
