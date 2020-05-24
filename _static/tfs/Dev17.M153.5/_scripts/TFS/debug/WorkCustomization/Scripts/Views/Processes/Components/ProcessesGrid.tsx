/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Processes/Components/ProcessesGrid";

import * as React from "react";
import { autobind, css, KeyCodes, IPoint } from "OfficeFabric/Utilities";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { LinkedGridCell } from "WorkCustomization/Scripts/Common/Components/LinkedGridCell";
import { ProcessesGridStore, getProcessesGridStore, disposeStore } from "WorkCustomization/Scripts/Views/Processes/Stores/ProcessesGridStore";
import { Selection, ISelectionOptions } from "OfficeFabric/utilities/selection/Selection";
import { IObjectWithKey } from "OfficeFabric/utilities/selection/interfaces";
import { Component, Props, State } from "VSS/Flux/Component";
import { SystemProcesses } from "WorkCustomization/Scripts/Constants";
import { toggleGridExpanderAction } from "WorkCustomization/Scripts/Views/Processes/Actions/ToggleGridExpander";
import { IUrlParameters, MyExperiencesUrls } from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { ChevronButton, IChevronButtonProps } from "WorkCustomization/Scripts/Common/Components/ChevronButton";
import { IProcessesNavDetailsListRow, ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import { DetailsRow, IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { WorkCustomizationHub } from "WorkCustomization/Scripts/Constants";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { getCollectionService, getService } from "VSS/Service";
import { SetEnableProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/SetEnableProcess";
import { SetDefaultProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/SetDefaultProcess";
import { CloneProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/CloneProcess";
import { showUpgradeToInheritancePanel } from "WorkCustomization/Scripts/Panels/Components/UpgradeToInheritancePanel";
import * as Tooltip from "VSSUI/Tooltip";
import { ExportProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/ExportProcess";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ICloneProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessesHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");

const tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const isInheritedProcessEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebaccessProcessHierarchy);
const isXmlCustomizationProcessEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProcessUpload);
const isXmlTemplateProcessEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessXmlTemplateProcess);
const isCloneXmlToInheritedEnabled = !FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingCloneHostedXmlToInheritedDisabled);
const isVerticalNavigationEnabled = getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");

function isXmlProcess(process: IProcess): boolean {
    return isXmlTemplateProcessEnabled && // If Xml Process ('Phase 0') is not enabled, it is not Xml Process
        (!isInheritedProcessEnabled || // if Inherited Process ('Phase 2') is not enabled, it is Xml Process
            (!process.isInheritedTemplate && !process.isSystemTemplate)); // or, it is Xml Process except system/inherited process 
}

function canCopyXMLProcess(process: IProcess): boolean {
    return (!isInheritedProcessEnabled ||
        (!process.isInheritedTemplate && !process.isSystemTemplate)) && (isXmlCustomizationProcessEnabled && isCloneXmlToInheritedEnabled)
}

export interface IProcessesGridRow extends IProcessesNavDetailsListRow {
    item: IProcess;
    hasChildren: boolean;
    isExpanded: boolean;
    parentIndex: number;
    keyDownHandler: (ev: KeyboardEvent) => void; // for removing listener on row unmount
}

export interface IProcessesGridProps extends Props {
    initialSelectedProcessName?: string;
    gridContainerClassName?: string;
}

export class ProcessesGrid extends Component<IProcessesGridProps, State>{
    private _initialSelectedProcessName: string;
    private _list: ProcessNavDetailsList;
    private _rows: IProcessesGridRow[];
    private _contextMenuOpenIndex: number;
    private _contextMenuTargetPoint: IPoint;

    constructor(props: IProcessesGridProps) {
        super(props);

        this._initialSelectedProcessName = props.initialSelectedProcessName;
    }

    public render(): JSX.Element {
        let columns: IColumn[] = this._getColumns();
        this._rows = this._getRows();

        let initialFocusedIndex: number = -1;
        if (this._initialSelectedProcessName != null) {
            initialFocusedIndex = Utils_Array.findIndex(this._rows, (r: IProcessesGridRow) => Utils_String.equals(r.item.name, this._initialSelectedProcessName, true));
            this._initialSelectedProcessName = null;
        }
        if (initialFocusedIndex === -1) {
            let lastCreatedTypeId = this.getStore().getLastCreatedProcessTypeId();
            if (lastCreatedTypeId != null) {
                initialFocusedIndex = Utils_Array.findIndex(this._rows, (r: IProcessesGridRow) => Utils_String.equals(r.item.templateTypeId, lastCreatedTypeId, true));
            }
        }

        return <ProcessNavDetailsList
            containerClassName={this.props.gridContainerClassName}
            items={this._rows}
            ariaLabelForGrid={Resources.ProcessesGrid}
            columns={columns}
            className="processes-grid"
            onRowDidMount={this._onRowDidMount}
            onRowWillUnmount={this._onRowWillUnmount}
            initialFocusedIndex={initialFocusedIndex}
            setKey={"process-grid-set-key"}
            ref={this._onRef}
            onItemContextMenu={this._onItemContextMenu}
        />;
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        disposeStore();
    }

    protected getStore(): ProcessesGridStore {
        return getProcessesGridStore();
    }

    protected getState(): State {
        return {};
    }

    @autobind
    private _onRef(ref: ProcessNavDetailsList) {
        this._list = ref;
    }

    // note: this is black magic to get left+right arrow expand collapse functionality for our processes grid (given the urgency from PM)
    // nevertheless this prototype is a good starting points for anyone who wants to create an Office Fabric tree-grid control
    // (be sure to check out the stylings under LinkedGridCell.scss too)
    @autobind
    private _onRowDidMount(row: IProcessesGridRow, index: number) {
        let rowElement: HTMLElement = this._getRowHTMLElement(index);
        if (rowElement == null) {
            return;
        }

        let isParent: boolean = row.hasChildren;
        let templateTypeId: string = row.item.templateTypeId;
        if (isParent) {
            this._tryUpdateExpandedAttribute(rowElement, row.isExpanded);
        }

        row.keyDownHandler = (ev: KeyboardEvent) => {
            let target = ev.target as HTMLElement;
            let isFirstActive = target.classList.contains("first-active");
            let isRowActive = target.getAttribute("role") === "row";

            if (!isRowActive && !isFirstActive) {
                return;
            }

            if (isFirstActive && ev.which === KeyCodes.left) {
                target.tabIndex = -1;
                rowElement.focus();
                ev.stopPropagation();
                return;
            }

            if (isParent) {
                let isExpanded = this.getStore().isProcessExpanded(templateTypeId);
                if ((ev.which === KeyCodes.right && !isExpanded) ||
                    (ev.which === KeyCodes.left && isExpanded)) {
                    toggleGridExpanderAction.invoke({ templateTypeId: templateTypeId });
                    ev.stopPropagation();
                }
            }
        };

        rowElement.addEventListener("keydown", row.keyDownHandler);
    }

    @autobind
    private _onRowWillUnmount(row: IProcessesGridRow, index: number) {
        let rowElement: HTMLElement = this._getRowHTMLElement(index);
        if (rowElement == null || row.keyDownHandler == null) {
            return;
        }

        rowElement.removeEventListener("keydown", row.keyDownHandler);
    }

    private _getRowHTMLElement(index: number): HTMLElement {
        if (this._list == null || this._list.refs == null || this._list.refs.root == null) {
            return null;
        }

        return this._list.refs.root.querySelector(`[role="row"][data-selection-index="${index}"]`) as HTMLElement;
    }

    private _tryUpdateExpandedAttribute(element: HTMLElement, expanded: boolean): boolean {
        if (element != null) {
            element.setAttribute("aria-expanded", expanded ? "true" : "false");
            return true;
        }

        return false;
    }

    // let the method be there so that when u right click popup menu still appears
    @autobind
    private _onItemContextMenu(item?: any, index?: number, ev?: MouseEvent): void {
		this._contextMenuOpenIndex = index;
        this._contextMenuTargetPoint = { x: ev.clientX, y: ev.clientY };
        this.forceUpdate();
	}

    private _getRows(): IProcessesGridRow[] {
        let rows: IProcessesGridRow[] = [];

        let nodes: IProcessTreeNode[] = this._createProcessTreeNodes();
        let currentParentIndex: number = 0;
        for (let node of nodes) {
            let hasChildren: boolean = isInheritedProcessEnabled && node.children != null;
            let isExpanded = hasChildren ? this.getStore().isProcessExpanded(node.process.templateTypeId) : false

            let processLink: string = null;
            if (isInheritedProcessEnabled && !isXmlProcess(node.process)) {
                processLink = UrlUtils.getProcessWorkItemTypesUrl(node.process.name);
            }

            rows.push({
                item: node.process,
                hasChildren: hasChildren,
                isExpanded: isExpanded,
                key: this._getRowKey(node.process),
                rowInvokeUrl: processLink,
                keyDownHandler: null,
                parentIndex: -1
            });
            if (hasChildren && isExpanded && isInheritedProcessEnabled) {
                for (let child of node.children) {
                    processLink = UrlUtils.getProcessWorkItemTypesUrl(child.name);
                    rows.push({
                        item: child,
                        hasChildren: false,
                        isExpanded: false,
                        key: this._getRowKey(child),
                        rowInvokeUrl: processLink,
                        keyDownHandler: null,
                        parentIndex: currentParentIndex
                    });
                }
            }
            ++currentParentIndex;
        }

        return rows;
    }

    private _getRowKey(process: IProcess) {
        return process.templateTypeId;
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({
            key: ColumnKeys.Name,
            name: Resources.GridNameColumn,
            fieldName: null,
            minWidth: 300,
            maxWidth: 600,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            className: "name-column",
            headerClassName: "name-column-header grid-header ms-font-m",
            ariaLabel: Resources.ProcessGridNameColumnDescription,
            onRender: (itemRow: IProcessesGridRow, index: number) => {
                let process: IProcess = itemRow.item;
                let tag: string = process.isDefault ? Resources.DefaultTag :
                    !process.isEnabled ? Resources.DisabledTag : "";

                let icon: string = "bowtie bowtie-icon bowtie-file-type-xml";
                let iconAriaLabel: string = Resources.XmlProcessText;
                let className: string = "xml-process";

                if (process.isSystemTemplate) {
                    icon = "bowtie bowtie-icon bowtie-security-lock";
                    iconAriaLabel = Resources.SystemProcessText;
                    className = "system-process";
                }
                else if (process.isInheritedTemplate) {
                    icon = "bowtie bowtie-icon bowtie-row-child";
                    iconAriaLabel = Resources.InheritedProcessText;
                    className = "inherited-process";
                }

                this._tryUpdateExpandedAttribute(this._getRowHTMLElement(index), itemRow.isExpanded);
                let chevronButton: JSX.Element = process.isInheritedTemplate ? null : <span className="no-chevron" />;
                if (itemRow.hasChildren) {
                    let onChevronClick = () => {
                        toggleGridExpanderAction.invoke({ templateTypeId: itemRow.item.templateTypeId });
                    }
                    chevronButton = <ChevronButton isExpanded={itemRow.isExpanded} onClick={onChevronClick} />;
                }

				let isContextMenuOpen = false;
                let targetPoint = null;
                if (this._contextMenuOpenIndex === index) {
                    isContextMenuOpen = true;
                    this._contextMenuOpenIndex = -1;
                    targetPoint = this._contextMenuTargetPoint;
                    this._contextMenuTargetPoint = null;
                }

                return <LinkedGridCell
                    className={css("process-name-column", className)}
                    contextMenuItems={getAllDefinitionsContextualMenuItems(process, this.getStore())}
                    iconClassName={icon}
                    iconAriaLabel={iconAriaLabel}
                    href={itemRow.rowInvokeUrl}
                    disabled={isXmlProcess(process)}
                    chevronButton={chevronButton}
                    text={process.name}
                    tag={tag}
                    showContextMenu={isContextMenuOpen}
                    target={targetPoint} />
            }
        });

        columns.push({
            key: ColumnKeys.Description,
            name: Resources.GridDescriptionColumn,
            fieldName: null,
            minWidth: 300,
            maxWidth: 800,
            isResizable: true,
            className: "description-column",
            headerClassName: "grid-header ms-font-m",
            columnActionsMode: ColumnActionsMode.disabled,
            ariaLabel: Resources.ProcessGridDescriptionColumnDescription,
            onRender: (itemRow: IProcessesGridRow, index: number) => {
                let description = itemRow.item.description;
                return <Tooltip.TooltipHost content={description} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                    <span className="ms-font-m">{description}</span>
                </Tooltip.TooltipHost>;
            }
        });

        if (isXmlCustomizationProcessEnabled || isInheritedProcessEnabled) {
            columns.push({
                key: ColumnKeys.Projects,
                name: Resources.ProcessGridTeamProjectsColumn,
                fieldName: null,
                minWidth: 80,
                maxWidth: 80,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                className: "projects-column",
                headerClassName: "grid-header ms-font-m",
                ariaLabel: Resources.ProcessGridProjectCountColumnDescription,
                onRender: (itemRow: IProcessesGridRow, index: number) => {
                    if (itemRow.item.projects) {
                        let projectsCount: string = itemRow.item.allProjectsCount.toString();
                        if (!isXmlProcess(itemRow.item)) {
                            return <LinkedGridCell
                                className={css("projects-column-cell")}
                                href={UrlUtils.getProcessProjectsUrl(itemRow.item.name)}
                                text={projectsCount}
                                turnOffFirstActive={true}
                            />;
                        }
                        else {
                            return <span className="ms-font-m numerical-cell">{projectsCount}</span>;
                        }
                    }
                    return null;
                }
            });
        }

        return columns;
    }

    // break down processes into tree nodes
    private _createProcessTreeNodes(): IProcessTreeNode[] {
        let processes: IProcess[] = this._sortProcesses(this.getStore().getAllProcesses());

        // OOB processes
        let oobProcesses: IDictionaryStringTo<IProcess> = {};

        // custom processes
        let customProcesses: IProcess[] = [];

        // inherited processes
        let inheritedProcesses: IDictionaryStringTo<IProcess[]> = {};

        for (let process of processes) {
            if (process.isSystemTemplate) {

                oobProcesses[process.templateTypeId] = process;
            }
            else if (process.isInheritedTemplate) {

                if (inheritedProcesses[process.parentTemplateTypeId]) {

                    inheritedProcesses[process.parentTemplateTypeId].push(process);
                }
                else {

                    inheritedProcesses[process.parentTemplateTypeId] = [process];
                }
            }
            else {

                customProcesses.push(process);
            }
        }

        let nodes: IProcessTreeNode[] = [];

        // processes will appear in below order
        //   Agile
        //       Agile child processes sorted in alphabetical order
        //   Scrum
        //       Scrum child processes sorted in alphabetical order
        //   CMMI
        //       CMMI child processes sorted in alphabetical order
        //   Custom
        //       Custom processes sorted in alphabetical order

        nodes.push(this._createNode(
            oobProcesses[SystemProcesses.AGILE_TYPE_ID],
            inheritedProcesses[SystemProcesses.AGILE_TYPE_ID]
        ));


        nodes.push(this._createNode(
            oobProcesses[SystemProcesses.SCRUM_TYPE_ID],
            inheritedProcesses[SystemProcesses.SCRUM_TYPE_ID]
        ));

        nodes.push(this._createNode(
            oobProcesses[SystemProcesses.CMMI_TYPE_ID],
            inheritedProcesses[SystemProcesses.CMMI_TYPE_ID]
        ));

        nodes = nodes.concat(customProcesses.map((p: IProcess, i: number) => {
            return this._createNode(p);
        }));

        return nodes;
    }

    private _createNode(process: IProcess, children?: IProcess[]): IProcessTreeNode {
        return {
            process: process,
            children: children
        };
    }

    private _sortProcesses(processes: IProcess[]): IProcess[] {
        if (!processes || processes.length === 0) {
            return null;
        }

        return processes.sort((a: IProcess, b: IProcess) => {
            return Utils_String.ignoreCaseComparer(a.name, b.name);
        });
    }
}

export namespace ColumnKeys {
    export const Name = "name";
    export const Description = "description";
    export const Projects = "projectCount";
}

interface IProcessTreeNode {
    process: IProcess;
    children?: IProcess[];
}


function getAllDefinitionsContextualMenuItems(data: IProcess, store: ProcessesGridStore): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];

    if (data.isEnabled) {
        items.push({
            key: "NEW_TEAM_PROJECT",
            name: Resources.NewTeamProjectContextMenuText,
            iconProps: contextualMenuIcon("bowtie-math-plus-light"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                if (isVerticalNavigationEnabled) {
                    DialogActions.setDialogAction.invoke({
                        dialogType: DialogActions.DialogType.CreateProjectPanel,
                        data: {
                            processTemplate: item.data.name,
                            invokingSource: WorkCustomizationHub.Name
                        }
                    });
                } else {
                    MyExperiencesUrls.getCreateNewProjectUrl(
                        tfsContext.navigation.collection.name,
                        { source: WorkCustomizationHub.Name, processTemplate: item.data.name } as IUrlParameters
                    ).then((url) => window.location.href = url);
                }
            }
        });
    }

    if (isInheritedProcessEnabled && data.isInheritedTemplate) {
        items.push({
            key: "EDIT_PROCESS",
            name: Resources.EditProcessContextMenuText,
            data: data,
            iconProps: contextualMenuIcon("bowtie-edit"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.EditProcess,
                    data: {
                        templateTypeId: item.data.templateTypeId,
                        processName: item.data.name,
                        processDescription: item.data.description,
                        isInputDisabled: !item.data.editPermission,
                        upfrontErrorMessage: item.data.editPermission ? null : Resources.EditProcessPermissionError
                    }
                });
            }
        });
    }

    if (isInheritedProcessEnabled && data.isInheritedTemplate) {
        items.push({
            key: "CLONE_PROCESS",
            name: Resources.CloneProcessContextMenuText,
            data: data,
            iconProps: contextualMenuIcon("bowtie-edit-copy"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.CloneProcess,
                    data: {
                        processName: item.data.name,
                        templateTypeId: item.data.templateTypeId,
                        processDescription: item.data.description,
                        isEnabled: item.data.isEnabled,
                        parentTemplateTypeId: item.data.parentTemplateTypeId,
                        isInputDisabled: !item.data.createPermission,
                        upfrontErrorMessage: item.data.createPermission ? null : Resources.CloneProcessPermissionError,
                        isXmlProcess: false
                    }
                });
            }
        });
    }

    if (canCopyXMLProcess(data)) { // Export on Inherited Process is not enabled yet
        items.push({
            key: "UPGRADE_PROCESS_TO_INHERITED",
            name: Resources.UpgradeProcessToInherited,
            iconProps: contextualMenuIcon("bowtie-edit-copy"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                showUpgradeToInheritancePanel({ processId: data.templateTypeId, processNameToClone: data.name });
            }
        });
    }

    if (isInheritedProcessEnabled && data.isSystemTemplate) {
        items.push({
            key: "CREATE_INHERITED_PROCESS",
            name: Resources.CreateProcessContextMenuText,
            iconProps: contextualMenuIcon("bowtie-row-child"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.CreateProcess,
                    data: {
                        parentProcessName: item.data.name,
                        parentTemplateTypeId: item.data.templateTypeId,
                        isInputDisabled: !item.data.createPermission,
                        upfrontErrorMessage: item.data.createPermission ? null : Resources.CreateProcessPermissionError
                    }
                });
            }
        });
    }

    if (isInheritedProcessEnabled && (data.isSystemTemplate || data.isInheritedTemplate) && data.isEnabled) {
        items.push({
            key: "MIGRATE_PROJECTS",
            name: Utils_String.format(Resources.MigrateProjectsContextMenuText, data.name),
            iconProps: contextualMenuIcon("bowtie-arrow-right"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.MigrateProjects,
                    data: {
                        targetProcess: item.data
                    }
                });
            }
        });
    }

    if (!data.isDefault && data.isEnabled) {
        items.push({
            key: "SET_AS_DEFAULT_PROCESS",
            name: Resources.SetAsDefaultProcessContextMenuText,
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let actionCreator = getCollectionService(SetDefaultProcessActionCreator);
                actionCreator.beginSetDefaultProcess({ templateTypeId: item.data.templateTypeId });
            }
        });
    }

    if (!data.isDefault) {
        items.push({
            key: "DISABLE_PROCESS",
            name: data.isEnabled ? Resources.DisableProcessContextMenuText : Resources.EnableProcessContextMenuText,
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                let actionCreator = getCollectionService(SetEnableProcessActionCreator);
                actionCreator.beginSetEnableProcess({ templateTypeId: item.data.templateTypeId, isEnabled: !item.data.isEnabled });
            }
        });
    }

    if ((isXmlCustomizationProcessEnabled || isXmlTemplateProcessEnabled) &&
        !data.isInheritedTemplate) { // Export on Inherited Process is not enabled yet
        items.push({
            key: "EXPORT_PROCESS",
            name: Resources.ExportProcessMenuItem,
            iconProps: contextualMenuIcon("bowtie-arrow-export"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                ExportProcessActionCreator.exportProcess(item.data.templateTypeId)
            }
        });
    }

    const hasProject: boolean = data.projects.length > 0;
    if (!data.isSystemTemplate &&
        !data.isDefault &&
        (!hasProject
            || isXmlProcess(data) // Force enable delete for Xml Process - projects might have been created on TFS 2017 through server PCW and stamped template information. 
        )) {
        items.push({
            key: "DELETE_PROCESS",
            name: Resources.DeleteProcessContextMenuText,
            data: data,
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.DeleteProcess,
                    data: {
                        templateTypeId: item.data.templateTypeId,
                        processName: item.data.name,
                        isInputDisabled: !item.data.createPermission,
                        upfrontErrorMessage: item.data.deletePermission ? null : Resources.DeleteProcessPermissionError
                    }
                });
            }
        });

    }

    if (isInheritedProcessEnabled && (data.isSystemTemplate || data.isInheritedTemplate)) {
        items.push({
            key: "PROCESS_SECURITY",
            name: Resources.SecurityMenuItem,
            iconProps: contextualMenuIcon("bowtie-security"),
            data: data,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.EditProcessPermission,
                    data: {
                        process: item.data
                    }
                });
            }
        });
    }
    return items;
}