import "VSS/LoaderPlugins/Css!Queries/Components/QueriesFolderView";

import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import * as Utils_String from "VSS/Utils/String";
import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, PivotBarItemDeselectionBehavior } from "VSSUI/PivotBar";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { VssIconType } from "VSSUI/VssIcon";
import { ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { QueriesFolderPivot } from "WorkItemTracking/Scripts/Queries/Components/QueriesFolderPivot";
import { IQueriesHubState, QueriesHub } from "WorkItemTracking/Scripts/Queries/Components/QueriesHub";
import { IQueriesHubProps } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubProps";
import { QueriesPivotShortcutGroup } from "WorkItemTracking/Scripts/Queries/Components/QueriesPivotShortcutGroup";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryContribution, QuerySaveDialogMode } from "WorkItemTracking/Scripts/Queries/Models/Models";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";

export class QueriesFolderView extends QueriesHub<IQueriesHubProps, IQueriesHubState> {
    private _filterBar: IFilterBar;
    private _shortcutGroup: QueriesPivotShortcutGroup;

    constructor(props: IQueriesHubProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this.state = this._getStateFromStore();
    }

    public componentDidMount() {
        this._queriesHubContext.stores.queryErrorMessageStore.addChangedListener(this._onStoreChanged);
        this._queriesHubContext.stores.queryHierarchyItemStore.addChangedListener(this._onStoreChanged);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._initializeShortcut();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._queriesHubContext.stores.queryErrorMessageStore.removeChangedListener(this._onStoreChanged);
        this._queriesHubContext.stores.queryHierarchyItemStore.removeChangedListener(this._onStoreChanged);
        this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    public render(): JSX.Element {
        const folder = this._getFolder();
        return <div className="queries-folder-view-hub-container">
            <div className="hub-messages">
                {this._renderMessages()}
            </div>
            <Hub
                hubViewState={this._hubViewState}
                className="queries-folder-view-hub"
                pivotHeaderAriaLabel={folder && folder.name}
                minDisplayedBreadcrumbItems={this._getMinDisplayedBreadcrumbItems()}
                breadcrumbIsExpandable
                commands={[
                    { key: "new-query", name: Resources.NewQuery, important: true, iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric }, onClick: this._onNewQueryClick },
                    { key: "new-folder", name: Resources.NewFolder, important: true, iconProps: { iconName: "FabricNewFolder", iconType: VssIconType.fabric }, onClick: this._onNewFolderClick }
                ]} >
                {this._getHubHeader()}
                <FilterBar componentRef={this._resolveFilterBar}>
                    <KeywordFilterBarItem filterItemKey={QueriesHubConstants.SearchKeyword} />
                </FilterBar>
                <PivotBarItem
                    className="queries-folder-pivot"
                    name={Resources.QueriesView_FolderPivotName}
                    itemKey={QueriesHubConstants.QueryFoldersPageAction}
                    deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}
                    url={this._hubViewState.createObservableUrl({ view: QueriesHubConstants.QueryFoldersPageAction })}>
                    <QueriesFolderPivot folderName={folder && folder.name} folderIdOrPath={this._getFolderIdOrPath()} onFolderClick={this._onFolderClick} />
                </PivotBarItem>
            </Hub>
        </div>;
    }

    protected _shouldNavigate(path: string): boolean {
        return !Utils_String.equals(this._getFolderPath(), path, true);
    }

    protected _renderMessages(): JSX.Element {
        return this.state.errorMessage ?
            <MessageBar
                className="error-message"
                messageBarType={MessageBarType.error}
                onDismiss={()=>this._queriesHubContext.actionsCreator.dismissErrorMessageForQueriesView()}
            >
                {this.state.errorMessage}
            </MessageBar> : null;
    }

    private _onViewOptionsChanged = (changedState: IViewOptionsValues): void => {
        // Since we are in one hub, when we try to navigate away from folders view we may get an event for view option changes. 
        // We dont want to react to those, since the component will get unmounted.
        if (changedState.hasOwnProperty(ActionParameters.FULLSCREEN) && !changedState.hasOwnProperty(ActionParameters.VIEW)) {
            this.forceUpdate();
        }
    }

    private _getFolderIdOrPath = () => {
        return this._hubViewState.viewOptions.getViewOption(ActionParameters.ID) || this._hubViewState.viewOptions.getViewOption(ActionParameters.PATH);
    }

    private _onFolderClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault();
        this._queriesHubContext.navigationActionsCreator.navigateToQueriesFolderPage(id, false);
    }

    private _resolveFilterBar = (filterBar: IFilterBar) => {
        this._filterBar = filterBar;
    }

    private _onNewQueryClick = () => {
        this._queriesHubContext.navigationActionsCreator.navigateToNewQuery(false, this._queriesHubContext.stores.queryHierarchyItemStore.getItem(this._getFolderIdOrPath()).id);
    }

    private _onNewFolderClick = () => {
        showDialog(this._queriesHubContext, QuerySaveDialogMode.NewFolder, null, this._getFolderPath());
    }

    private _onStoreChanged = () => {
        this.setState(this._getStateFromStore());
    }

    private _focusFilterBar = () => {
        if (this._filterBar) {
            this._filterBar.focus();
        }
    }

    private _initializeShortcut(): void {
        this._shortcutGroup = new QueriesPivotShortcutGroup(this._onNewQueryClick, this._focusFilterBar);
    }

    private _getHubHeader(): React.ReactNode {
        const folderOrPath = this._getFolderIdOrPath();
        const item = this._queriesHubContext.stores.queryHierarchyItemStore.getItem(folderOrPath);
        const path = item ? item.path : null;
        const breadcrumbItems = this._getBreadCrumbItems(path);
        return <HubHeader
            maxBreadcrumbItemWidth={QueriesHubConstants.MaxBreadcrumbItemWidth}
            breadcrumbItems={breadcrumbItems}
            breadcrumbProps={this._getBreadCrumbProps(breadcrumbItems.length)}
            pickListMaxWidth={QueriesHubConstants.PickListMaxWidth}
            pickListMaxHeight={QueriesHubConstants.PickListMaxHeight}
            pickListClassName={"queries-breadcrumb-picker"}
        />;
    }

    private _getFolder() {
        return this._queriesHubContext.stores.queryHierarchyItemStore.getItem(this._getFolderIdOrPath());
    }

    private _getFolderPath(): string {
        return this._getFolder().path;
    }

    private _getStateFromStore() {
        return { errorMessage: this._queriesHubContext.stores.queryErrorMessageStore.getErrorForContribution(QueryContribution.Directory) };
    }
}
