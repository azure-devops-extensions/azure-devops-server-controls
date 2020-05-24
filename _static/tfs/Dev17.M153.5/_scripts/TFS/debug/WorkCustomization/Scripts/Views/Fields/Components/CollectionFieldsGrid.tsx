/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind, IPoint } from "OfficeFabric/Utilities";
import { IPopupContextualMenuProps, PopupContextualMenu } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import { Component, Props } from "VSS/Flux/Component";
import { KeyCode } from "VSS/Utils/UI";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { CollectionFieldsActionCreator } from "WorkCustomization/Scripts/Actions/CollectionFieldsActions";
import { ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import { CollectionFieldsStore } from "WorkCustomization/Scripts/Stores/CollectionFieldsStore";
import { FieldUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { IProcessesGridRow } from "WorkCustomization/Scripts/Views/Processes/Components/ProcessesGrid";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";
import FeatureAvailabilityServices = require("VSS/FeatureAvailability/Services");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import TFSServerWebAccessConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export interface ICollectionFieldGridState {
    fields: WorkContracts.WorkItemField[],
    isReady: boolean
}

export class CollectionFieldsGrid extends Component<Props, ICollectionFieldGridState> {
    private _store: CollectionFieldsStore;
    private _contextMenuOpenIndex: number;
    private _contextMenuTargetPoint: IPoint;
    private _list: ProcessNavDetailsList;
    private _rows: IProcessesGridRow[];

    public render() {
        if (!this.state.isReady) {
            return <Spinner type={SpinnerType.large} />;
        }

        let columns: IColumn[] = this._getColumns();

        return <ProcessNavDetailsList
            containerClassName="collection-fields-grid-container"
            ariaLabelForGrid={Resources.CollectionFieldsGrid}
            items={this.state.fields as any}
            columns={columns}
            className="collection-fields-grid"
            onItemContextMenu={this._onItemContextMenu}
            ref={this._onRef}
            onRowDidMount={this._onRowDidMount} />;
    }

    public componentWillMount(): void {
        if (!this.state.isReady) {
            CollectionFieldsActionCreator.beginGetCollectionFields();
        }
    }

    public componentWillUnmount(): void {
        if (this._store) {
            this._store.dispose();
            this._store = null;
        }
    }

    protected getStore(): CollectionFieldsStore {
        if (!this._store) {
            this._store = new CollectionFieldsStore();
        }

        return this._store;
    }

    protected getState(): ICollectionFieldGridState {
        return {
            isReady: this.getStore().isReady,
            fields: this.getStore().fields
        };
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({
            key: ColumnKeys.Name,
            name: Resources.GridNameColumn,
            fieldName: ColumnKeys.Name,
            minWidth: 300,
            maxWidth: 500,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            headerClassName: "grid-header ms-font-m",
            onRender: (itemRow: WorkContracts.WorkItemField, index: number) => {
                return (
                    <div>
                        <span>{itemRow.name}</span>
                        {this._createContextMenu(itemRow, index)}
                    </div>
                );
            }
        });

        columns.push({
            key: ColumnKeys.Type,
            name: Resources.GridTypeColumn,
            fieldName: ColumnKeys.Type,
            minWidth: 150,
            maxWidth: 150,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            headerClassName: "grid-header ms-font-m",
            onRender: (itemRow: WorkContracts.WorkItemField, index: number) => {

                return <span>{FieldUtils.getFriendlyFieldTypeName(itemRow.type, itemRow.isPicklist, itemRow.isIdentity)}</span>;
            }
        });

        columns.push({
            key: ColumnKeys.Description,
            name: Resources.GridDescriptionColumn,
            fieldName: ColumnKeys.Description,
            minWidth: 400,
            maxWidth: 500,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            headerClassName: "grid-header ms-font-m"
        });

        return columns;
    }

    private _createContextMenu(field: WorkContracts.WorkItemField, index: number): JSX.Element {
        let items: IContextualMenuItem[] = [];

        items.push({
            key: "DELETE_FIELD",
            name: Resources.DeleteFieldContextMenuText,
            data: field,
            disabled: !FieldUtils.isCustomField(field.referenceName),
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                DialogActions.setDialogAction.invoke({ dialogType: DialogActions.DialogType.DeleteWorkItemField, data: { field: field, hasDeleteFieldPermission: this.getStore().hasDeleteFieldPermission() } });
            }
        });

		let showContextMenu = false;                
		let targetPoint = null;

        if (this._contextMenuOpenIndex === index) {
            showContextMenu = true;
            this._contextMenuOpenIndex = -1;
			targetPoint = this._contextMenuTargetPoint;
            this._contextMenuTargetPoint = null;
        }

        let contextMenuProps: IPopupContextualMenuProps = {
            className: "popup-menu",
            iconClassName: "bowtie-ellipsis",
            items: items,
            menuClassName: "processes-popup-menu",
            showContextMenu: showContextMenu,
			target: targetPoint
        }
        return <PopupContextualMenu {...contextMenuProps} />
    }

    private _getRowHTMLElement(index: number): HTMLElement {
        if (this._list == null || this._list.refs == null || this._list.refs.root == null) {
            return null;
        }

        return this._list.refs.root.querySelector(`[role="row"][data-selection-index="${index}"]`) as HTMLElement;
    }

    @autobind
    private _onItemContextMenu(item?: any, index?: number, ev?: MouseEvent): void {
        this._contextMenuOpenIndex = index;
        this._contextMenuTargetPoint = { x: ev.clientX, y: ev.clientY };
        this.forceUpdate();
    }

    @autobind
    private _onRef(ref: ProcessNavDetailsList) {
        this._list = ref;
    }

    @autobind
    private _onRowDidMount(row: IProcessesGridRow, index: number): void {
        let rowElement: HTMLElement = this._getRowHTMLElement(index);
        if (rowElement == null) {
            return;
        }

        row.keyDownHandler = (event: KeyboardEvent) => {
            if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE || (event.shiftKey === true && event.keyCode === KeyCode.F10)) {
                event.stopPropagation();
                event.preventDefault();

                const popupMenuTrigger = (event.target as HTMLElement).querySelector(`.popup-menu-trigger`);
                popupMenuTrigger["click"]();
            }
        };

        rowElement.addEventListener("keydown", row.keyDownHandler);
    }
}

export namespace ColumnKeys {
    export const Name = "name";
    export const RefName = "referenceName";
    export const Description = "description";
    export const Type = "type";
}