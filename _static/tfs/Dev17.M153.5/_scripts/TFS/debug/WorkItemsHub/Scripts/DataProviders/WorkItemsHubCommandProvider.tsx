import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { autobind } from "OfficeFabric/Utilities";
import { PivotBarActionHelper } from "Presentation/Scripts/TFS/FeatureRef/NewWorkItem";
import * as WorkItemTypeColorAndIconsProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as React from "react";
import { delay } from "VSS/Utils/Core";
import * as VSS from "VSS/VSS";
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { IWorkItemsTabContentData } from "WorkItemsHub/Scripts/Components/WorkItemsTabContent";
import { IWorkItemsGridRow } from "WorkItemsHub/Scripts/DataContracts/IWorkItemsGridData";
import {
    WorkItemsHubColumnOption,
    WorkItemsHubPermissionsData,
    WorkItemsHubSortOption,
} from "WorkItemsHub/Scripts/Generated/Contracts";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { IWorkItemsHubFilterDataSource } from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import * as ColumnOptionsPanelLauncher_Async from "WorkItemsHub/Scripts/Utils/ColumnOptionsPanelLauncher";
import * as NavigationUtils from "WorkItemsHub/Scripts/Utils/NavigationUtils";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import * as UrlUtils from "WorkItemsHub/Scripts/Utils/UrlUtils";
import { getFieldFriendlyName } from "WorkItemsHub/Scripts/Utils/WorkItemsHubDataUtils";
import { WorkItemsHubDeleteHelper } from "WorkItemsHub/Scripts/Utils/WorkItemsHubDeleteHelper";
import { WorkItemsHubReportUtils } from "WorkItemsHub/Scripts/Utils/WorkItemsHubReportUtils";
import { navigateToNewWorkItemForm } from "WorkItemsHub/Scripts/Utils/WorkItemsXhrNavigationUtils";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export class WorkItemsHubCommandProvider {
    public static readonly columnOptionsCommandKey = "column-options";
    public static readonly recycleBinCommandKey = "recycle-bin";
    public static readonly openQueryCommandKey = "open-in-queries";
    public static readonly copyToClipboardCommandKey = "copy-to-clipboard";
    public static readonly emailCommandKey = "email";
    public static readonly deleteCommandKey = "delete";

    private readonly _addNewWorkItemPrimary = PivotBarActionHelper.getNewWorkItemPivotBarAction({ addNewItem: this._onAddNewItem, important: true });

    private readonly _columnOptionsAction: IPivotBarAction = {
        key: WorkItemsHubCommandProvider.columnOptionsCommandKey,
        name: Resources.ColumnOptions,
        important: true,
        iconProps: { iconName: "Repair" },
        onClick: this._onColumnOptionsClick
    };

    private readonly _openFilteredInQueriesAction: IPivotBarAction = {
        key: WorkItemsHubCommandProvider.openQueryCommandKey,
        name: Resources.OpenFilteredInQueriesCommand,
        important: true,
        iconProps: { iconName: "bowtie-arrow-open", iconType: VssIconType.bowtie },
        onClick: this._onOpenQueryClick
    };

    private readonly _openInQueriesAction: IPivotBarAction = {
        key: WorkItemsHubCommandProvider.openQueryCommandKey,
        name: Resources.OpenInQueriesCommand,
        important: true,
        iconProps: { iconName: "bowtie-arrow-open", iconType: VssIconType.bowtie },
        onClick: this._onOpenQueryClick
    };

    private readonly _recycleBinAction: IPivotBarAction = {
        key: WorkItemsHubCommandProvider.recycleBinCommandKey,
        name: WITResources.RecycleBin,
        important: true,
        iconProps: { iconName: "bowtie-recycle-bin", iconType: VssIconType.bowtie },
        onClick: this._onRecycleBinClick
    };

    private _tabContentData: IWorkItemsTabContentData = null;
    private _deleteCommandHelper: WorkItemsHubDeleteHelper = null;

    constructor(private _store: WorkItemsHubStore, private _hubViewState: IVssHubViewState, private _actionCreator: ActionsCreator) {
        this._deleteCommandHelper = new WorkItemsHubDeleteHelper(_actionCreator);
    }

    /**
     * Sets the current tab data.
     * @param tabData The data containing information about tab content.
     */
    public setTabData(tabData: IWorkItemsTabContentData): void {
        this._tabContentData = tabData;
    }

    /**
     * Gets commands for work items hub.
     * @param permission permission set for work items hub
     * @param isSupportedFeature whether current page is supported or not. 
     * @returns Returns commands for work items hub.
     */
    public getCommands(permission: WorkItemsHubPermissionsData, isSupportedFeature: boolean): IPivotBarAction[] {
        if (!permission) {
            return [];
        }

        const { hasFilter } = this._tabContentData;
        const pivotBarActions: IPivotBarAction[] = [];

        if (permission.newWorkItem.hasPermission) {
            pivotBarActions.push(this._addNewWorkItemPrimary);
        }

        if (permission.query.hasPermission) {
            const openQueryCommand: IPivotBarAction = hasFilter ? this._openFilteredInQueriesAction : this._openInQueriesAction;

            if (isSupportedFeature) {
                pivotBarActions.push(openQueryCommand);
                pivotBarActions.push(this._columnOptionsAction);
            }
            
            pivotBarActions.push(this._recycleBinAction);
        }

        return pivotBarActions;
    }

    /**
     * Gets context menu items for work items hub.
     * @param targetRow the row where the context menu is targeted
     * @returns Returns context menu items if there are any, undefined if there aren't any.
     */
    public getContextMenuItems(permission: WorkItemsHubPermissionsData, targetRow?: IWorkItemsGridRow): IContextualMenuItem[] {
        const selectionIds = this._tabContentData.selectionIds ? [...this._tabContentData.selectionIds] : [];
        if (selectionIds.length === 0) {
            return undefined;
        }

        const items: IContextualMenuItem[] = [];
        if (permission.query.hasPermission) {
            items.push({
                name: Resources.OpenSelectionInQueriesCommand,
                key: WorkItemsHubCommandProvider.openQueryCommandKey,
                onClick: this._onOpenSelectedInQueryClick,
                iconProps: { className: "bowtie-icon bowtie-arrow-open" }
            });
        }

        items.push({
            name: WITResources.CopyToClipboard,
            key: WorkItemsHubCommandProvider.copyToClipboardCommandKey,
            title: WITResources.CommandBarTitle_CopyWorkItems,
            onClick: this._onCopyWorkItemsToClipboardClick,
            data: targetRow,
            iconProps: { className: "bowtie-icon bowtie-edit-copy" }
        });

        if (permission.sendEmail.hasPermission) {
            items.push({
                name: WITResources.EmailSelectedWorkItems,
                key: WorkItemsHubCommandProvider.emailCommandKey,
                onClick: this._onEmailWorkItemsClick,
                iconProps: { className: "bowtie-icon bowtie-mail-message" }
            });
        }

        const dataSource = this.getHubFilterDataSource();
        const shouldShowDeleteCommand = this.getDeleteHelper().shouldShowDeleteCommand(dataSource, selectionIds);
        if (shouldShowDeleteCommand) {
            items.push({
                name: WITResources.DeleteSelectedWorkItems,
                key: WorkItemsHubCommandProvider.deleteCommandKey,
                title: WITResources.CommandBarTitle_DeleteWorkItems,
                onClick: this._onDeleteWorkItemsClick,
                iconProps: { className: "bowtie-icon bowtie-trash" }
            });
        }

        return items;
    }

    /**
     * Copies the selected work items to clipboard.
     * @param keyboardShortcutEvent Indicates whether it was invoked using keyboard shortcut or not, used for telemetry
     * @param e Mouse event
     * @param targetRow Target row
     */
    public copyWorkItemsToClipboard(keyboardShortcutEvent: boolean, e?: React.MouseEvent<HTMLElement>, targetRow?: IWorkItemsGridRow) {
        if (this._tabContentData.selectionIds.length === 0) {
            return;
        }

        const dataSource = this.getHubFilterDataSource();
        const filteredData = dataSource.getFilteredData();
        const fieldReferenceNames = dataSource.getDisplayedFieldReferenceNames();
        const fieldFriendlyNames = fieldReferenceNames.map(fieldReferenceName => getFieldFriendlyName(fieldReferenceName, filteredData.processSettings));
        const fieldValues = dataSource.getFieldValues(this._tabContentData.selectionIds, fieldReferenceNames);
        WorkItemsHubReportUtils.copyWorkItemsToClipboard(fieldReferenceNames, fieldFriendlyNames, fieldValues, e, targetRow);
        UsageTelemetryHelper.publishCopyToClipboardTelemetry(this._getSelectedTabId(), keyboardShortcutEvent);
    }

    /**
     * Deletes the selected work items.
     * @param keyboardShortcutEvent Indicates whether it was invoked using keyboard shortcut or not, used for telemetry
     */
    public deleteWorkItems(keyboardShortcutEvent: boolean): void {
        const selectedWorkItemIds = this._tabContentData.selectionIds;
        const deleteHelper = this.getDeleteHelper();
        const dataSource = this.getHubFilterDataSource();
        if (deleteHelper.shouldShowDeleteCommand(dataSource, selectedWorkItemIds)) {
            const tabId = this._getSelectedTabId();
            deleteHelper.deleteWorkItems(tabId, selectedWorkItemIds);
            UsageTelemetryHelper.publishDeleteTelemetry(tabId, keyboardShortcutEvent);
        }
    }

    /**
     * Returns the WorkItemsHubDeleteHelper, public for unit testing.
     */
    public getDeleteHelper(): WorkItemsHubDeleteHelper {
        return this._deleteCommandHelper;
    }

    /**
     * Returns the WorkItemsHubDeleteHelper, public for unit testing.
     */
    public getHubFilterDataSource(): IWorkItemsHubFilterDataSource {
        return this._store.getHubFilterDataSource(this._getSelectedTabId());
    }

    private _getSelectedTabId(): string {
        return this._hubViewState.selectedPivot.value;
    }

    @autobind
    private _onColumnOptionsClick() {
        UsageTelemetryHelper.publishColumnOptionsCommand(this._getSelectedTabId());
        const dataSource = this.getHubFilterDataSource();
        const tabId = this._getSelectedTabId();
        const currentColumns: WorkItemsHubColumnOption[] = dataSource.getCurrentColumnOptions();
        const sortOptions: WorkItemsHubSortOption[] = dataSource.getSortOptions();
        const version: number = dataSource.getCurrentColumnSettingsVersion();

        VSS.using(["WorkItemsHub/Scripts/Utils/ColumnOptionsPanelLauncher"], (module: typeof ColumnOptionsPanelLauncher_Async) => {
            const columnOptionsPanelLauncher = new module.ColumnOptionsPanelLauncher(tabId, this._actionCreator);
            columnOptionsPanelLauncher.openColumnOptionPanel(currentColumns, sortOptions, version);
        });
    }

    @autobind
    private _onRecycleBinClick() {
        UsageTelemetryHelper.publishRecycleBinCommand(this._getSelectedTabId());
        window.open(UrlUtils.getRecycleBinUrl());
    }

    @autobind
    private _onOpenQueryClick() {
        const dataSource = this.getHubFilterDataSource();
        NavigationUtils.openInQueries(this._getSelectedTabId(), dataSource);
    }

    @autobind
    private _onOpenSelectedInQueryClick() {
        const dataSource = this.getHubFilterDataSource();
        NavigationUtils.openInQueries(this._getSelectedTabId(), dataSource, this._tabContentData.selectionIds);
    }

    @autobind
    private _onAddNewItem(e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction, workItemTypeName: string) {
        // Delay this call so that processing will continue and context menu will be dismissed cleanly
        // If we navigate immediately the context menu is destroyed but we still try to set state on it
        // which results in an error in the console.
        delay(this, 0, () => navigateToNewWorkItemForm(WorkItemTypeColorAndIconsProvider.getNormalizedValue(item.key)));
        e.preventDefault();
        e.stopPropagation();
    }

    @autobind
    private _onEmailWorkItemsClick(): void {
        const selectedIds = this._tabContentData.selectionIds;
        if (selectedIds.length === 0) {
            return;
        }

        const dataSource = this.getHubFilterDataSource();
        const fieldReferenceNames = dataSource.getDisplayedFieldReferenceNames();
        WorkItemsHubReportUtils.openSendEmailDialog(fieldReferenceNames, selectedIds);
        UsageTelemetryHelper.publishEmailTelemetry(this._getSelectedTabId());
    }

    @autobind
    private _onCopyWorkItemsToClipboardClick(e?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem): void {
        this.copyWorkItemsToClipboard(false, e, menuItem && menuItem.data);
    }

    @autobind
    private _onDeleteWorkItemsClick(): void {
        this.deleteWorkItems(false);
    }
}
