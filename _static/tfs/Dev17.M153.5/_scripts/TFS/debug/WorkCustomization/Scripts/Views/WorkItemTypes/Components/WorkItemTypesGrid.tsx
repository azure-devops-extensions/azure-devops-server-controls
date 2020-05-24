import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/WorkItemTypes/Components/WorkItemTypesGrid";

import * as React from "react";
import { autobind, css, IPoint } from "OfficeFabric/Utilities";
import { LinkedGridCell } from "WorkCustomization/Scripts/Common/Components/LinkedGridCell";
import { Component, Props, State } from "VSS/Flux/Component";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { IProcessesNavDetailsListRow, ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import { IColumn } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { CustomizationType, ProcessWorkItemType } from "TFS/WorkItemTracking/ProcessContracts";
import { IconUtils } from "Admin/Scripts/Common/IconUtils";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import Utils_Array = require("VSS/Utils/Array");
import { SystemProcesses } from "WorkCustomization/Scripts/Constants";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

interface IWorkItemTypeRow extends IProcessesNavDetailsListRow {
    value: IWorkItemTypeData;
}

export interface IWorkItemTypesGridProps extends Props {
    processId: string;
    initialSelectedWorkItemTypeId?: string;
    canEditProcess: boolean;
}

export class WorkItemTypesGrid extends Component<IWorkItemTypesGridProps, State> {
    private _initialSelectedKey: string;
    private _contextMenuOpenIndex: number;
    private _contextMenuTargetPoint: IPoint;

    constructor(props: IWorkItemTypesGridProps) {
        super(props);

        this._initialSelectedKey = props.initialSelectedWorkItemTypeId == null ? null : props.initialSelectedWorkItemTypeId;
    }

    public render(): JSX.Element {
        if (this.getStore().getWorkItemTypes(this.props.processId) == null) {
            // trigger work item types load action
            WorkItemTypesActionCreator.beginGetWorkItemTypes(this.props.processId);

            return <Spinner
                className="work-item-types-grid-spinner"
                type={SpinnerType.large} />;
        }

        let columns: IColumn[] = this._getColumns();
        let rows: IWorkItemTypeRow[] = this._getRows();
        let initialFocusedIndex = this._initialSelectedKey == null ?
            -1 : Utils_Array.findIndex(rows, (r: IWorkItemTypeRow) => r.key === this._initialSelectedKey);
        this._initialSelectedKey = null;

        return <ProcessNavDetailsList
            containerClassName="work-item-types-grid-container"
            ariaLabelForGrid={Resources.WorkItemTypesGrid}
            items={rows}
            columns={columns}
            className="workitemtypes-grid"
            initialFocusedIndex={initialFocusedIndex}
            onItemContextMenu={this._onItemContextMenu}
        />;
    }

    protected getStore(): WorkItemTypesStore {
        return getWorkItemTypesStore();
    }

    protected getState(): State {
        return {};
    }

    private _getRows(): IWorkItemTypeRow[] {
        let currentProcess: IProcess = this.getStore().getCurrentProcess();
        return this.getStore().getWorkItemTypes(this.props.processId).map(
            (value) => {
                let workItemTypeId: string = value.workItemType.referenceName;
                let workItemTypeUrl: string = null;

                let isXMLProcess: boolean = currentProcess != null && !currentProcess.isInheritedTemplate && !currentProcess.isSystemTemplate;
                if (!isXMLProcess && currentProcess != null) {
                    workItemTypeUrl = UrlUtils.getWorkItemTypeLayoutUrl(currentProcess.name, workItemTypeId);
                }

                return { key: workItemTypeId, rowInvokeUrl: workItemTypeUrl, value: value } as IWorkItemTypeRow;
            });
    }

    private _getColumns(): IColumn[] {
        const columns: IColumn[] = [];
        const currentProcess: IProcess = this.getStore().getCurrentProcess();
        const isInheritedTemplate: boolean = currentProcess != null && currentProcess.isInheritedTemplate;
        const isXMLProcess: boolean = currentProcess != null && !currentProcess.isInheritedTemplate && !currentProcess.isSystemTemplate;

        columns.push({
            key: ColumnKeys.Name,
            name: Resources.GridNameColumn,
            fieldName: null,
            minWidth: 300,
            maxWidth: 400,
            isResizable: true,
            className: "name-column",
            headerClassName: "grid-header ms-font-m",
            onRender: (row: IWorkItemTypeRow, index: number) => {
                const item: IWorkItemTypeData = row.value;
                const iconClass = IconUtils.getIconClass(item.workItemType.icon);
                const iconColorStyle: React.CSSProperties = IconUtils.getIconColorStyle(item.workItemType.color);

                let isContextMenuOpen = false;
                let targetPoint = null;
                if (this._contextMenuOpenIndex === index) {
                    isContextMenuOpen = true;
                    this._contextMenuOpenIndex = -1;
                    targetPoint = this._contextMenuTargetPoint;
                    this._contextMenuTargetPoint = null;
                }

                return <LinkedGridCell
                    className={css("workitemtype-name-column", "icon")}
                    contextMenuItems={isInheritedTemplate ? createWorkItemTypeContextMenuItems(item, this.props.canEditProcess) : null}
                    iconStyle={iconColorStyle}
                    iconClassName={css("bowtie-icon", iconClass)}
                    href={row.rowInvokeUrl}
                    text={item.workItemType.name}
                    tag={item.workItemType.isDisabled ? Resources.DisabledTag : ""}
                    disabled={isXMLProcess}
                    showContextMenu={isContextMenuOpen}
                    target={targetPoint}
                />;
            }
        });

        columns.push({
            key: ColumnKeys.Description,
            name: Resources.GridDescriptionColumn,
            fieldName: null,
            minWidth: 300,
            isResizable: true,
            className: "description-column",
            headerClassName: "grid-header ms-font-m",
            onRender: (itemRow: IWorkItemTypeRow, index: number) => {
                return <span className="ms-font-m">{itemRow.value.workItemType.description}</span>
            }
        });

        return columns;
    }

    @autobind
    private _onItemContextMenu(item?: any, index?: number, ev?: MouseEvent): void {
        this._contextMenuOpenIndex = index;
        this._contextMenuTargetPoint = { x: ev.clientX, y: ev.clientY };
        this.forceUpdate();
    }
}

export namespace ColumnKeys {
    export const Name = "name";
    export const Description = "description";
}

function createWorkItemTypeContextMenuItems(workItemTypeData: IWorkItemTypeData, canEditProcess: boolean): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];
    if (workItemTypeData == null || workItemTypeData.workItemType == null) {
        return items;
    }
    let isCustomWorkItemType: boolean = workItemTypeData.workItemType.customization === CustomizationType.Custom;

    items.push({
        key: "EDIT_WORK_ITEM_TYPE",
        name: Resources.EditWorkItemTypeContextMenuText,
        iconProps: contextualMenuIcon("bowtie-edit"),
        data: workItemTypeData,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
            DialogActions.setDialogAction.invoke({
                dialogType: DialogActions.DialogType.EditWorkItemType,
                data: {
                    processTypeId: item.data.processId,
                    workItemType: item.data.workItemType,
                    isInputDisabled: !canEditProcess,
                    upfrontErrorMessage: canEditProcess ? null : Resources.EditWorkItemTypePermissionError
                }
            });
        }
    });

    if (isWorkItemAllowedToBeDisabled(workItemTypeData)) {
        items.push({
            key: "DISABLE_WORK_ITEM_TYPE",
            name: workItemTypeData.workItemType.isDisabled ?
                Resources.EnableWorkItemTypeContextMenuText : Resources.DisableWorkItemTypeContextMenuText,
            data: workItemTypeData,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                const wit: ProcessWorkItemType = item.data.workItemType;
                if (wit.customization == CustomizationType.System) {
                    WorkItemTypesActionCreator.beginCreateDerivedWorkItemType(
                        item.data.processId, wit, !wit.isDisabled, null);
                }
                else {
                    WorkItemTypesActionCreator.beginUpdateWorkItemType(item.data.workItemType.referenceName, item.data.processId,
                        null, null, null, !item.data.workItemType.isDisabled, null);
                }
            }
        });
    }

    if (isCustomWorkItemType) {
        items.push({
            key: "DELETE_WORK_ITEM_TYPE",
            name: Resources.DeleteWorkItemTypeContextMenuText,
            iconProps: contextualMenuIcon("bowtie-trash"),
            data: workItemTypeData,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                let props = item.data;
                props.isInputDisabled = !canEditProcess;
                props.upfrontErrorMessage = canEditProcess ? null : Resources.DeleteWorkItemTypePermissionError;
                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.DeleteWorkItemType,
                    data: props
                });
            }
        });
    }

    return items.length === 0 ? null : items;
}

function isWorkItemAllowedToBeDisabled(workItemTypeData : IWorkItemTypeData) : Boolean {
    return  ((SystemProcesses.WorkItemTypesBlockedFromDisabling.indexOf(workItemTypeData.workItemType.referenceName.toLocaleLowerCase()) === -1)
            // to check for whether a WorkItemType is customizable do not check inherits property since it can be null for a workItem which has never been edited
            // instead check for processId it should never be that of OOb processes. 
        &&  (workItemTypeData.processId && SystemProcesses.OutOfBoxProcessIds.indexOf(workItemTypeData.processId.toLocaleLowerCase()) === -1)
        &&  ((workItemTypeData.workItemType.inherits == null) || (SystemProcesses.WorkItemTypesBlockedFromDisabling.indexOf(workItemTypeData.workItemType.inherits.toLocaleLowerCase()) === -1)));
}