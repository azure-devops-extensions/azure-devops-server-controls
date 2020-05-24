import "VSS/LoaderPlugins/Css!Queries/Components/QueriesView";

import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, PivotBarItemDeselectionBehavior } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";
import { PerformanceEvents, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { AllQueriesPivot } from "WorkItemTracking/Scripts/Queries/Components/AllQueriesPivot";
import { FavoriteQueriesPivot } from "WorkItemTracking/Scripts/Queries/Components/FavoriteQueriesPivot";
import { IQueriesHubState, QueriesHub } from "WorkItemTracking/Scripts/Queries/Components/QueriesHub";
import { IQueriesHubProps } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubProps";
import { QueriesPivotShortcutGroup } from "WorkItemTracking/Scripts/Queries/Components/QueriesPivotShortcutGroup";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryContribution, QuerySaveDialogMode, QueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";
import * as Utils_String from "VSS/Utils/String";
import { IPivotBarAction } from "VSSUI/PivotBar";

export interface IQueriesViewState extends IQueriesHubState {
    infoMessage: string | JSX.Element;
}

export class QueriesView extends QueriesHub<IQueriesHubProps, IQueriesViewState> {

    private _shortcutGroup: QueriesPivotShortcutGroup;
    private _filterBar: IFilterBar;

    constructor(props: IQueriesHubProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);
        this.state = this._getStateFromStore();

        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        this._updatePageTitle();

        if (this._hubViewState.filter.getState()) {
            this._onSearchTextChanged(this._hubViewState.filter.getState());
        }
    }

    public componentWillMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERIESVIEW_COMPONENT_MOUNT, true);
    }

    public componentDidMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERIESVIEW_COMPONENT_MOUNT, false);

        this._queriesHubContext.stores.queryErrorMessageStore.addChangedListener(this._onStoreChanged);
        this._queriesHubContext.stores.queryInfoMessageStore.addChangedListener(this._onStoreChanged);

        this._initializeShortcut();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this._queriesHubContext.actionsCreator.dismissErrorMessageForQueriesView();
        this._queriesHubContext.stores.queryErrorMessageStore.removeChangedListener(this._onStoreChanged);

        this._queriesHubContext.actionsCreator.dismissInfoMessageForQueriesView();
        this._queriesHubContext.stores.queryInfoMessageStore.removeChangedListener(this._onStoreChanged);

        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);

        if (this._shortcutGroup) {
            this._shortcutGroup.removeShortcutGroup();
            this._shortcutGroup = null;
        }
    }

    private _onStoreChanged = (): void => {
        this.setState(this._getStateFromStore());
    }

    private _getStateFromStore() {
        const { queryErrorMessageStore, queryInfoMessageStore } = this._queriesHubContext.stores;
        return {
            errorMessage: queryErrorMessageStore.getErrorForContribution(QueryContribution.Directory),
            infoMessage: queryInfoMessageStore.getInfoForContribution(QueryContribution.Directory),
        };
    }

    private _initializeShortcut(): void {
        this._shortcutGroup = new QueriesPivotShortcutGroup(this._onNewQueryClick, this._focusFilterBar);
    }

    public render(): JSX.Element {
        return <div className="queries-view-hub-container">
            <div className="hub-messages">
                {this._renderInfoMessage()}
                {this._renderErrorMessage()}
            </div>
            <Hub
                hubViewState={this._hubViewState}
                className="queries-view-hub"
                commands={this._getCommands()}
                pivotHeaderAriaLabel={Resources.Queries}
                minDisplayedBreadcrumbItems={this._getMinDisplayedBreadcrumbItems()}
                breadcrumbIsExpandable
            >
                <HubHeader title={Resources.Queries} />

                <FilterBar componentRef={this._resolveFilterBar}>
                    <KeywordFilterBarItem filterItemKey={QueriesHubConstants.SearchKeyword} />
                </FilterBar>

                <PivotBarItem
                    className="favorite-queries-pivot"
                    name={Resources.QueriesView_MinePivotName}
                    itemKey={QueriesHubConstants.MinePageAction}
                    url={this._hubViewState.createObservableUrl({ view: QueriesHubConstants.MinePageAction })}>
                    <FavoriteQueriesPivot />
                </PivotBarItem>
                <PivotBarItem
                    className="all-queries-pivot"
                    name={Resources.QueriesView_AllPivotName}
                    itemKey={QueriesHubConstants.AllQueriesPageAction}
                    url={this._hubViewState.createObservableUrl({ view: QueriesHubConstants.AllQueriesPageAction })}>
                    <AllQueriesPivot />
                </PivotBarItem>
            </Hub>
        </div>;
    }

    private _getCommands(): IPivotBarAction[] {
        const commands: IPivotBarAction[] = [
            { key: "new-query", name: Resources.NewQuery, important: true, iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric }, onClick: this._onNewQueryClick }
        ];

        const pivotKey = this._hubViewState.selectedPivot.value;
        if (pivotKey && pivotKey === QueriesHubConstants.AllQueriesPageAction) {
            commands.push(
                { key: "new-folder", name: Resources.NewFolder, important: true, iconProps: { iconName: "FabricNewFolder", iconType: VssIconType.fabric }, onClick: this._onNewFolderClick }
            );
        }

        return commands;
    }

    protected _renderErrorMessage(): JSX.Element {
        return this.state.errorMessage ?
            <MessageBar
                className="error-message"
                messageBarType={MessageBarType.error}
                onDismiss={() => this._queriesHubContext.actionsCreator.dismissErrorMessageForQueriesView()}
            >
                {this.state.errorMessage}
            </MessageBar> : null;
    }

    protected _renderInfoMessage(): JSX.Element {
        return this.state.infoMessage ?
            <MessageBar
                className="info-message"
                messageBarType={MessageBarType.info}
                onDismiss={() => this._queriesHubContext.actionsCreator.dismissInfoMessageForQueriesView()}
            >
                {this.state.infoMessage}
            </MessageBar> : null;
    }

    private _updatePageTitle(): void {
        document.title = QueryUtilities.getPivotWindowTitle();
    }

    private _onPivotChanged = (pivotKey: string) => {
        // Whenever pivot changed, reset query performance scenarios
        QueryUtilities.resetQueryPerformanceScenarios();
    }

    private _onNewQueryClick = () => {
        publishEvent(new TelemetryEventData(
            WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
            WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_QUERY_ACTION,
            {
                "key": "new-query",
                "pivot": this._hubViewState.selectedPivot.value,
                "source": "command-button"
            }));

        this._queriesHubContext.navigationActionsCreator.navigateToNewQuery(false);
    }

    private _onNewFolderClick = async () => {
        const { actionsCreator, stores } = this._queriesHubContext;

        await actionsCreator.ensureRootQueryFolders();
        const myQueriesFolder = stores.queryHierarchyItemStore.getMyQueriesFolderItem();

        showDialog(this._queriesHubContext, QuerySaveDialogMode.NewFolder, null, myQueriesFolder.path,
            (savedQueryItem: QueryItem) => {
                const message = <span>
                    {`${Utils_String.localeFormat(Resources.QueriesHub_NewFolderCreated_MessageText, savedQueryItem.name)} `}
                    <a onClick={() => this._queriesHubContext.navigationActionsCreator.navigateToQueriesFolderPage(savedQueryItem.id, true)}>
                        {Resources.QueriesHub_NewFolderCreated_LinkText}
                    </a>
                </span>;
                actionsCreator.showInfoMessageForQueriesView(message);
            });
    }

    private _focusFilterBar = () => {
        if (this._filterBar) {
            this._filterBar.focus();
        }
    }

    private _resolveFilterBar = (filterBar: IFilterBar) => {
        this._filterBar = filterBar;
    }
}
