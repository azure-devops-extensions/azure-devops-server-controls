/// <reference types="react" />

import * as React from "react";
import { DiffEditor, IDiffEditor } from "CodeEditor/Components/DiffEditor";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { HistoryActionsCreator } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActionsCreator";
import { IRevisionsDiffData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { HistoryColumnKeys } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryConstants";
import { IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";
import { AuditAction } from "TFS/DistributedTask/Contracts";

import { IButton, CommandButton } from "OfficeFabric/Button";
import { DirectionalHint, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Link } from "OfficeFabric/Link";
import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsRow, IColumn, IDetailsRowProps, SelectionMode } from "OfficeFabric/DetailsList";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css, autobind } from "OfficeFabric/Utilities";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/History";

export enum HistoryContextMenuActions {
    Compare,
    Revert
}

export interface IHistoryProps extends Base.IProps {
    definitionId: number | string;
    sourceInstance: IHistorySource;
    columns?: string[]; // list of history column keys to be displayed. null for default
    actions?: HistoryContextMenuActions[];
    isRevertSupported: boolean;  // to deprecate
    displayHistory: boolean;
    revisions: IRevisionsData[];
    isRevertToRevisionAllowed?: (revision: IRevisionsData) => boolean;
    additionalColumns?: IColumn[];
    useNewDiffEditor?: boolean;
    revisionsDiffData?: IRevisionsDiffData;
}

export class History extends Base.Component<IHistoryProps, Base.IStateless> {

    public componentWillMount() {
        this._historyActionsCreator = ActionCreatorManager.GetActionCreator<HistoryActionsCreator>(HistoryActionsCreator);
        this._defaultColumnDefinitions = this._getDefaultHistoryColumnDefinitions();
        this._defaultColumnKeys = this._getDefaultHistoryColumnKeys();
        this._visibleColumnKeys = this._getColumnKeys();
        this._visibleColumnDefinitions = this._getColumns(this._visibleColumnKeys);
        History._activeItemIndex = 0;

        this._selection = new Selection();
        this._historyActionsCreator.displayHistory(true);

    }

    public componentDidMount() {
        window.addEventListener("resize", this._onResizeHandler);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this._onResizeHandler);
    }

    public render(): JSX.Element {

        const shouldDisplayActions = this._shouldDisplayActions();
        return (
            <div className="dtc-history-container" role="region" aria-label={Resources.ARIALabelHistoryTab}>
                {this.props.displayHistory ? (
                    <VssDetailsList
                        ref={(detailsList) => { this._detailsList = detailsList; }}
                        className={css("history-details-list")}
                        setKey={"history-list"}
                        isHeaderVisible={true}
                        initialFocusedIndex={History._activeItemIndex}
                        onActiveItemChanged={this._onActiveItemChanged}
                        constrainMode={ConstrainMode.unconstrained}
                        compact={true}
                        columns={this._visibleColumnDefinitions}
                        items={this._getItems(this._visibleColumnKeys)}
                        checkboxVisibility={CheckboxVisibility.onHover}
                        selection={this._selection}
                        selectionMode={shouldDisplayActions ? SelectionMode.multiple : SelectionMode.none}
                        actionsColumnKey={HistoryColumnKeys.changedBy}
                        shouldDisplayActions={this._shouldDisplayActions}
                        getMenuItems={this._getMenuItems}
                        onRenderItemColumn={this._onRenderItemColumn}
                        onRenderRow={this._onRenderRow}
                        ariaLabelForGrid={Resources.ARIALabelHistoryTab}
                        ariaLabelForSelectionColumn={Resources.ARIALabelHistoryAllVersionsSelector} />)
                    :
                    (<div className="history-diff-container">
                        <CommandButton
                            componentRef={(backButton) => {
                                this._backButtonDiff = backButton;
                            }}
                            className={css("history-back-button", "fabric-style-overrides")}
                            iconProps={{ iconName: "Back" }}
                            onClick={this._backToHistory}
                            ariaLabel={Resources.Back}>
                            {Resources.Back}
                        </CommandButton>
                        {
                            this.props.useNewDiffEditor && !!this.props.revisionsDiffData ? (
                            
                                <DiffEditor
                                    className={"history-revision-diff"}
                                    editorOptions={
                                        {
                                            readOnly: true
                                        }
                                    }
                                    originalContent={
                                        {
                                            content: this.props.revisionsDiffData.originalVersionContent,
                                            contentType: "application/json"
                                        }
                                    }
                                    modifiedContent={
                                        {
                                            content: this.props.revisionsDiffData.modifiedVersionContent,
                                            contentType: "application/json"
                                        }
                                    }
                                    editorRef={this._onEditorCreated}                                   
                                />
                            
                            )
                                : (
                                    <div className={"history-diff-viewer-container"} />
                                )}
                    </div>)
                }
            </div>
        );
    }

        public componentDidUpdate(prevProps: IHistoryProps, prevState: Base.IStateless) {
        if (!this.props.displayHistory && this._backButtonDiff) {
            this._backButtonDiff.focus();
        } else if (this.props.revisions && prevProps.revisions && this._detailsRow && this.props.revisions.length === prevProps.revisions.length + 1) {
            this._detailsRow.focus();
        }
    }

    private _onActiveItemChanged(item?: {}, index?: number, ev?: React.FocusEvent<HTMLElement>): void {
        History._activeItemIndex = index;
    }

    private _getColumnKeys(): string[] {
        let columnKeys: string[];
        if (this.props.columns) {
            columnKeys = this.props.columns;
        } else {
            columnKeys = Utils_Array.clone(this._defaultColumnKeys);
            if (this.props.additionalColumns) {
                this.props.additionalColumns.map((column) => {
                    if (columnKeys.findIndex((columnKey) => { return columnKey === column.key; }) === -1) {
                        columnKeys.push(column.key);
                    }
                });
            }
        }
        return columnKeys;
    }

    private _getColumns(columnKeys: string[]): IColumn[] {
        const columns: IColumn[] = [];

        columnKeys.forEach((columnKey: string, index: number) => {
            let columnData = this.props.additionalColumns && this.props.additionalColumns.find((additionalColumn: IColumn) => {
                return additionalColumn.key === columnKey;
            });
            if (!columnData) {
                columnData = this._defaultColumnDefinitions.find((columnDefinition) => {
                    return columnDefinition.key === columnKey;
                });
            }
            if (columnData) {
                columns.push(columnData);
            }
        });

        return columns;
    }

    private _getItems(columnKeys: string[]): { [key: string]: string | JSX.Element }[] {
        const revisions: IRevisionsData[] = this.props.revisions;
        const itemsToRender: { [key: string]: string | JSX.Element }[] = [];
        const totalItems: number = revisions.length;

        revisions.forEach((revision: IRevisionsData, index: number) => {

            const item: { [key: string]: string | JSX.Element } = {};
            columnKeys.forEach((columnKey: string, columnIndex: number) => {
                let itemFound = false;
                if (this.props.additionalColumns && this.props.additionalColumns.length > 0) {

                    const columnData = this.props.additionalColumns && this.props.additionalColumns.find((additionalColumn: IColumn) => {
                        return additionalColumn.key === columnKey;
                    });

                    if (columnData && columnData.fieldName && revision.hasOwnProperty(columnData.fieldName)) {
                        item[columnData.fieldName] = revision[columnData.fieldName];
                        itemFound = true;
                    }
                }

                if (!itemFound) {
                    switch (columnKey) {
                        case HistoryColumnKeys.index:
                            item[HistoryColumnKeys.index] = (totalItems - index).toString();
                            break;
                        case HistoryColumnKeys.changeType:
                            item[HistoryColumnKeys.changeType] = revision.changeType;
                            break;
                        case HistoryColumnKeys.changedDate:
                            item[HistoryColumnKeys.changedDate] = revision.changedDate;
                            break;
                        case HistoryColumnKeys.changeDetails:
                            if (revision.revisionNumber > 1) {
                                item[HistoryColumnKeys.changeDetails] = (
                                    <Link className={"change-details"} onClick={this._compareDiff} data-index={index.toString()}>
                                        {Resources.ViewDetails}
                                    </Link>);
                            } else {
                                item[HistoryColumnKeys.changeDetails] = (
                                    <div className="change-details">
                                        <TooltipHost content={revision.changeDetails} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Parent}>
                                            {revision.changeDetails}
                                        </TooltipHost>  
                                    </div>);
                            }
                            break;
                        case HistoryColumnKeys.changedBy:
                            item[HistoryColumnKeys.changedBy] = (
                                <div className="history-name-column">
                                    {revision.changedBy}
                                </div>);
                            break;
                        case HistoryColumnKeys.comment:
                            item[HistoryColumnKeys.comment] = (
                                <div className="comment-section">
                                    <TooltipHost content={revision.comment} directionalHint={DirectionalHint.bottomCenter} overflowMode={TooltipOverflowMode.Parent}>
                                        {revision.comment}
                                    </TooltipHost>
                                </div>
                            );
                            break;
                        default:
                            item[columnKey] = revision[columnKey];
                            break;
                    }
                }
            });
            itemsToRender.push(item);
        });
        return itemsToRender;
    }

    @autobind
    private _shouldDisplayActions(): boolean {
        // default actions (undefined) or explicity actions specified
        return this.props.actions === undefined || this.props.actions && this.props.actions.length > 0;
    }

    private _getDefaultHistoryColumnKeys(): string[] {
        return [HistoryColumnKeys.changedBy,
        HistoryColumnKeys.changeType,
        HistoryColumnKeys.changedDate,
        HistoryColumnKeys.comment];
    }

    private _getDefaultHistoryColumnDefinitions(): IColumn[] {
        const headerClass: string = "history-header details-list-header-column";
        const columns: IColumn[] = [{
            key: HistoryColumnKeys.changedBy,
            name: Resources.ChangedByText,
            fieldName: null,
            isResizable: true,
            minWidth: 300,
            maxWidth: 400,
            className: "history-ellipsis-icon",
            headerClassName: headerClass,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.ChangedByText
        },
        {
            key: HistoryColumnKeys.changeType,
            name: Resources.ChangeTypeText,
            fieldName: null,
            isResizable: true,
            minWidth: 200,
            maxWidth: 200,
            headerClassName: headerClass,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.ChangeTypeText
        },
        {
            key: HistoryColumnKeys.changedDate,
            name: Resources.ChangedDateText,
            fieldName: null,
            isResizable: true,
            minWidth: 200,
            maxWidth: 300,
            headerClassName: headerClass,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.ChangedDateText
        },
        {
            key: HistoryColumnKeys.changeDetails,
            name: Resources.ChangeDetailsText,
            fieldName: null,
            isResizable: true,
            minWidth: 300,
            maxWidth: 400,
            headerClassName: headerClass,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.ChangeDetailsText
        },
        {
            key: HistoryColumnKeys.comment,
            name: Resources.CommentText,
            fieldName: null,
            isResizable: true,
            minWidth: 400,
            maxWidth: 600,
            headerClassName: headerClass,
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.CommentText
        }];
        return columns;
    }

    private _onRenderRow = (props: IDetailsRowProps) => {
        const rowId = "revisionsViewRow-" + props.itemIndex;
        props.checkButtonAriaLabel = Resources.ARIALabelHistorySelectVersion;
        return (
            <DetailsRow
                ref={
                    (detailsRow) => {
                        // Store the details row if it is the row we want to focus
                        if (props.itemIndex === 0) {
                            this._detailsRow = detailsRow;
                        }
                    }
                }
                className={css("revisions-view-row")}
                key={rowId}
                {...props} />
        );
    }

    @autobind
    private _onRenderItemColumn(item: { [key: string]: string | JSX.Element }, index: number, column: IColumn): string | JSX.Element {

        // Externally added columns will have fieldName set. Internally we are setting them all to null
        // So for null or undefined fieldName we'll take key
        const keyToCheck = !!column.fieldName ? column.fieldName : column.key;
        const renderItem: string | JSX.Element = (item.hasOwnProperty(keyToCheck) && item[keyToCheck]) || Utils_String.empty;
        return renderItem;
    }

    @autobind
    private _getMenuItems(): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];

        // component will use item name attribute for aria label as well
        items.push({
            key: "CompareDifference",
            name: Resources.CompareDifference,
            onClick: this._compareDiff,
            disabled: this._isCompareDifferenceDisabled(),
            iconProps: { className: "bowtie-icon bowtie-diff-side-by-side" },
            className: "compare-difference"
        });

        if (this._isRevertSupported()) {
            items.push({
                key: "RevertDefinition",
                name: Resources.RevertDefinition,
                onClick: this._revertDefinition,
                disabled: this._isRevertDefinitionDisabled(),
                iconProps: { className: "bowtie-icon bowtie-switch" },
                className: "revert-definition"
            });
        }

        return items;
    }

    private _isRevertSupported(): boolean {
        return this.props.isRevertSupported || this.props.actions && this.props.actions.indexOf(HistoryContextMenuActions.Revert) !== -1;
    }

    @autobind
    private _compareDiff(e: React.MouseEvent<HTMLButtonElement>): void {
        let index1: number = -1;
        let index2: number = -1;
        const selection = this._detailsList.state.selection;

        if (e.currentTarget.dataset && e.currentTarget.dataset.index) {
            index1 = parseInt(e.currentTarget.dataset.index);
        } else {
            if (selection.getSelectedCount() > 0) {
                index1 = selection.getSelectedIndices()[0];
                if (selection.getSelectedCount() === 2) {
                    index2 = selection.getSelectedIndices()[1];
                }
            }
        }

        if (index1 >= 0 ) {
            if (index2 === -1) {
                    // Get the next index that is not Delete or Undelete
                    index2 = index1 + 1;
                    while (index2 < selection.getItems().length) {
                        if (this._isCompareDifferenceAllowed(selection.getItems(), index2)) {
                            break;
                        } else {
                            index2++;
                        }
                    }
            }
            this._displayRevisionsDiff(index1, index2);
        }
    }

    @autobind
    private _isCompareDifferenceDisabled(): boolean {
        // Enabled only when either 2 revisions are selected (but neither of them is 'Delete or Undelete')
        // or one is selected (but not the oldest and it's not Delete or Undelete)
        const selection = this._detailsList.state.selection;
        const endIndex = this.props.revisions.length - 1;
        if ((this._detailsList.state.selection.getSelectedCount() === 2
            && this._isCompareDifferenceAllowed(selection.getSelection(), 0)
            && this._isCompareDifferenceAllowed(selection.getSelection(), 1)) ||
            (selection.getSelectedCount() === 1
                && selection.getSelectedIndices()[0] !== endIndex
                && this._isCompareDifferenceAllowed(selection.getSelection(), 0))) {
            return false;
        }
        return true;
    }

    @autobind
    private _isCompareDifferenceAllowed(item: any, index: number): boolean {
        // Element at index 2 is ChangeType. Using this index to disable Compare Difference for Delete and Undelete type
        return (Utils_String.ignoreCaseComparer(item[index][HistoryColumnKeys.changeType], AuditAction[AuditAction.Delete]) !== 0
            && Utils_String.ignoreCaseComparer(item[index][HistoryColumnKeys.changeType], AuditAction[AuditAction.Undelete]) !== 0);
    }

    @autobind
    private _isRevertDefinitionDisabled(): boolean {
        // Enabled only when 1 revision is selected (but not the latest)
        const selection = this._detailsList.state.selection;

        if (selection.getSelectedCount() === 1 &&
            selection.getSelectedIndices()[0] !== 0 &&
            this._isRevertToRevisionAllowed(selection.getSelectedIndices()[0])) {
            return false;
        }
        return true;
    }

    @autobind
    private _isRevertToRevisionAllowed(revision: number): boolean {
        return this.props.isRevertToRevisionAllowed ? this.props.isRevertToRevisionAllowed(this._getRevisionFromIndex(revision)) : true;
    }

    @autobind
    private _revertDefinition(e: React.MouseEvent<HTMLButtonElement>): void {
        const selection = this._detailsList.state.selection;
        if (selection.getSelectedCount() === 1) {
            const targetIndex: number = selection.getSelectedIndices()[0];
            this._historyActionsCreator.setRevertToRevision(this._getRevisionNumberFromIndex(targetIndex));
        }
    }

    private _backToHistory = (): void => {
        this._historyActionsCreator.displayHistory(true);
    }

    private _displayRevisionsDiff(rowIndex1: number, rowIndex2: number): void {

        const newerRevision: number = this._getRevisionNumberFromIndex((rowIndex2 > rowIndex1) ? rowIndex1 : rowIndex2);
        const olderRevision: number = this._getRevisionNumberFromIndex((rowIndex2 > rowIndex1) ? rowIndex2 : rowIndex1) || newerRevision - 1;

        this._historyActionsCreator.getRevisionDiff(this.props.sourceInstance, this.props.definitionId, olderRevision, newerRevision);
    }

    private _getRevisionNumberFromIndex(index: number): number {
        return this._getRevisionFromIndex(index).revisionNumber;
    }

    private _getRevisionFromIndex(index: number): IRevisionsData {
        if (index < 0 || index >= this.props.revisions.length) {
            throw new Error("History row index is not valid");
        }
        return this.props.revisions[index];
    }

    @autobind
    private _onResizeHandler() {
        if (this._editor) {
            this._editor.layout();
        }
    }

    private _onEditorCreated = (editor: IDiffEditor) => {
        if (editor) {
            this._editor = editor;
        }
    }

    private _historyActionsCreator: HistoryActionsCreator;
    private _selection: Selection;
    private _detailsList: VssDetailsList;
    private _backButtonDiff: IButton;
    private _detailsRow: DetailsRow;

    private _defaultColumnKeys: string[];
    private _defaultColumnDefinitions: IColumn[];
    private _visibleColumnKeys: string[];
    private _visibleColumnDefinitions: IColumn[];
    private _editor: IDiffEditor;
    private static _activeItemIndex: number;
}
