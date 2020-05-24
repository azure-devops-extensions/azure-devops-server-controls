import "VSS/LoaderPlugins/Css!Queries/Components/ColumnOptions/ColumnOptionsPanelContent";

import * as React from "react";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import Utils_UI = require("VSS/Utils/UI");
import { ColumnFields } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnFields";
import { ColumnOptionConstants, IColumnField } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/Constants";

import { CommandBarButton } from "OfficeFabric/Button";
import { Fabric } from "OfficeFabric/Fabric";

import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";

import { PivotBar, PivotBarItem } from "VSSUI/PivotBar";

export interface IColumnOptionsPanelContentProps {
    onDisplayColumnsChange: (newColumns: IColumnField[]) => void;
    onSortColumnsChange: (newColumns: IColumnField[]) => void;
    availableDisplayColumnFields: IColumnField[];
    availableSortColumnFields: IColumnField[];
    displayColumnFields: IColumnField[];
    sortColumnFields: IColumnField[];
    allowSort: boolean;
    getField: (fieldReference: string) => IColumnField;
}

export interface IColumnOptionsPanelContentState {
    selectedPivotKey: string;
}

export class ColumnOptionsPanelContent extends React.Component<IColumnOptionsPanelContentProps, IColumnOptionsPanelContentState> {
    public static DISPLAY_COLUMNS_PIVOT_KEY = "displaycolumns";
    public static SORT_COLUMNS_PIVOT_KEY = "sortcolumns";

    private _focusIndex = -2;
    private _isAdd = false;

    constructor(props: IColumnOptionsPanelContentProps) {
        super(props);

        this.state = {
            selectedPivotKey: ColumnOptionsPanelContent.DISPLAY_COLUMNS_PIVOT_KEY
        };
    }

    public render(): JSX.Element {
        const focusIndex = this._focusIndex;
        const shouldFocusOnAddButton = focusIndex === -1;
        const isAdd = this._isAdd;
        this._isAdd = false;
        this._focusIndex = -2;

        const usesCommandKey = Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl();
        const keyboardShortcutText = usesCommandKey ? WITResources.ColumnOptionsPanelKeyboardShortCutWithCommand : WITResources.ColumnOptionsPanelKeyboardShortCutWithControl;

        return <Fabric className="column-options-panel-contents">
            <div className="column-options-panel-title">{WITResources.ColumnOptionsPanelText + keyboardShortcutText}</div>
            {this._renderPivots(focusIndex, isAdd)}
            <CommandBarButton
                className="add-column-button"
                autoFocus={shouldFocusOnAddButton}
                onClick={this.state.selectedPivotKey === ColumnOptionsPanelContent.DISPLAY_COLUMNS_PIVOT_KEY
                    ? this._addDisplayColumn
                    : this._addSortColumn}
                iconProps={{ iconName: "Add" }}>
                {WITResources.AddAColumn}
            </CommandBarButton>
        </Fabric>;
    }

    private _renderPivots(focusIndex: number, isAdd: boolean): JSX.Element {
        if (this.props.allowSort) {
            return <PivotBar selectedPivot={this.state.selectedPivotKey} onPivotClicked={this._changePivotKey} className={"column-options-pivot-bar"} pivotBarContentClassName={"column-options-pivot-bar-content"}>
                <PivotBarItem name={WITResources.ColumnOptionsColumns} itemKey={ColumnOptionsPanelContent.DISPLAY_COLUMNS_PIVOT_KEY}>
                    {this._renderDisplayColumnFields(focusIndex, isAdd)}
                </PivotBarItem>
                <PivotBarItem name={WITResources.ColumnOptionsSorting} itemKey={ColumnOptionsPanelContent.SORT_COLUMNS_PIVOT_KEY}>
                    {this._renderSortColumnFields(focusIndex, isAdd)}
                </PivotBarItem>
            </PivotBar>;
        } else {
            return this._renderDisplayColumnFields(focusIndex, isAdd);
        }
    }

    private _renderDisplayColumnFields(focusIndex: number, isAdd: boolean): JSX.Element {
        return <DragAndDropZoneEnclosure
            idContext={ColumnOptionConstants.DRAGDROP_COLUMNS_CONTEXT_ID}
            showPlaceHolderOnHover={false}
            showPossibleDropOnDragStart={false}
            className={"column-options-panel-dragdropzone bowtie-fabric"}>
            <ColumnFields
                deleteRow={this._deleteDisplayColumn}
                availableFields={this.props.availableDisplayColumnFields}
                selectedFields={this.props.displayColumnFields}
                disabled={false}
                focusIndex={focusIndex}
                isAdd={isAdd}
                getField={this.props.getField}
                onChanged={this.props.onDisplayColumnsChange}
                dragDropContextId={ColumnOptionConstants.DRAGDROP_COLUMNS_CONTEXT_ID} />
        </DragAndDropZoneEnclosure>;
    }

    private _renderSortColumnFields(focusIndex: number, isAdd: boolean): JSX.Element {
        return <DragAndDropZoneEnclosure
            idContext={ColumnOptionConstants.DRAGDROP_SORT_CONTEXT_ID}
            showPlaceHolderOnHover={false}
            showPossibleDropOnDragStart={false}
            className={"column-options-panel-dragdropzone bowtie-fabric"}>
            <ColumnFields
                deleteRow={this._deleteSortColumn}
                availableFields={this.props.availableSortColumnFields}
                selectedFields={this.props.sortColumnFields}
                disabled={false}
                focusIndex={focusIndex}
                isAdd={isAdd}
                isSortable={true}
                getField={this.props.getField}
                onChanged={this.props.onSortColumnsChange}
                dragDropContextId={ColumnOptionConstants.DRAGDROP_SORT_CONTEXT_ID} />
        </DragAndDropZoneEnclosure>;
    }

    private _addDisplayColumn = () => {
        const newColumns = [...this.props.displayColumnFields];
        this._focusIndex = newColumns.length;
        this._isAdd = true;
        newColumns.push({
            identifier: GUIDUtils.newGuid(),
            fieldRefName: "",
            fieldId: null,
            name: "",
            isInvalid: false
        } as IColumnField);

        this.props.onDisplayColumnsChange(newColumns);
    }

    private _addSortColumn = () => {
        const newColumns = [...this.props.sortColumnFields];
        this._focusIndex = newColumns.length;
        this._isAdd = true;
        newColumns.push({
            identifier: GUIDUtils.newGuid(),
            fieldRefName: "",
            fieldId: null,
            name: "",
            isInvalid: false,
            asc: true, // default to ascending order when adding a new column
        } as IColumnField);

        this.props.onSortColumnsChange(newColumns);
    }

    private _deleteDisplayColumn = (index: number) => {
        this._focusIndex = index;

        const newColumns = [...this.props.displayColumnFields];
        newColumns.splice(index, 1);

        // If we've removed the last item in the list, focus goes to the previous item instead of the next.
        if (this._focusIndex === newColumns.length) {
          this._focusIndex--;
        }

        this.props.onDisplayColumnsChange(newColumns);
    }

    private _deleteSortColumn = (index: number) => {
        this._focusIndex = index;

        const newColumns = [...this.props.sortColumnFields];
        newColumns.splice(index, 1);

        // If we've removed the last item in the list, focus goes to the previous item instead of the next.
        if (this._focusIndex === newColumns.length) {
          this._focusIndex--;
        }

        this.props.onSortColumnsChange(newColumns);
    }

    private _changePivotKey = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pivotKey: string) => {
        this.setState({ selectedPivotKey: pivotKey });
    }
}
