import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Projects/Components/ProjectsPivot";

import * as React from "react";
import { autobind, KeyCodes } from "OfficeFabric/Utilities";
import { Component, Props, State } from "VSS/Flux/Component";
import { getProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { IProjectData } from "WorkCustomization/Scripts/Contracts/Process";
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import * as VSS_Locations from "VSS/Locations";
import { Link } from "OfficeFabric/Link";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { LinkedGridCell } from "WorkCustomization/Scripts/Common/Components/LinkedGridCell";
import { showMessageAction, clearMessageAction, IMessageActionPayload } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import Utils_String = require("VSS/Utils/String");
import { announce } from "VSS/Utils/Accessibility";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { showMigrateProjectsPanel } from "WorkCustomization/Scripts/Panels/Components/MigrateProjectPanel";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import ArrayUtils = require("VSS/Utils/Array");

export namespace ColumnKeys {
    export const Name = "name";
    export const Description = "description";
}

export class ProjectsPivot extends Component<Props, State> {
    private _projects: IProjectData[];
    private _projectsCount: number;
    private _processName: string;
    private _isXmlProcess: boolean;
    private _isCloneXmlToInheritedEnabled: boolean;
    private _list: ProcessNavDetailsList;

    constructor(props: Props) {
        super(props);
        this._isCloneXmlToInheritedEnabled = !FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingCloneHostedXmlToInheritedDisabled);

        this._processName = UrlUtils.getCurrentProcessNameFromUrl();
        var process: IProcess = getProcessesDataStore().getProcessByName(this._processName);
        this._isXmlProcess = (!process.isInheritedTemplate && !process.isSystemTemplate)
        this._projects = process.projects.sort((a, b) => a.name.localeCompare(b.name));
        this._projectsCount = process.allProjectsCount;
    }

    public render(): JSX.Element {
        let columns: IColumn[] = this._getColumns();
        let initialFocusedIndex = (this._projects.length > 0) ? 0 : -1;
        return <ProcessNavDetailsList
            containerClassName="projects-pivot-grid-container"
            ariaLabelForGrid={Resources.ProjectsGrid}
            items={this._projects as any}
            initialFocusedIndex={initialFocusedIndex}
            columns={columns}
            className="projects-grid"
            onRowDidMount={this._onRowDidMount}
            ref={this._onRef} />
    }

    public componentDidMount(): void {
        // announce information on component load for users with special abilities
        announce(Utils_String.format(Resources.ProcessProjectPageLoadAnnouncement, this._processName));

        let accessibleProjectsCount = this._projects.length;

        // Hiding some projects due to permission settings
        if (accessibleProjectsCount !== this._projectsCount) {
            if (accessibleProjectsCount > 0) { // If have access to at least one project
                showMessageAction.invoke({ message: Utils_String.format(Resources.YouCanAccessSubsetProjects, this._projectsCount, accessibleProjectsCount, this._processName) } as IMessageActionPayload);
            }
            else { // If no access to any of projects
                showMessageAction.invoke({ message: Utils_String.format(Resources.YouDontHaveAccessToProjects, this._projectsCount, this._processName) } as IMessageActionPayload);
            }
        }
    }

    public componentWillUnmount(): void {
        if (this._projects.length !== this._projectsCount) {
            clearMessageAction.invoke(null);
        }
    }

    @autobind
    private _onRef(ref: ProcessNavDetailsList) {
        this._list = ref;
    }

    private _getRowHTMLElement(index: number): HTMLElement {
        if (this._list == null || this._list.refs == null || this._list.refs.root == null) {
            return null;
        }

        return this._list.refs.root.querySelector(`[role="row"][data-selection-index="${index}"]`) as HTMLElement;
    }

    @autobind
    private _onRowDidMount(row: any, index: number) {
        let rowElement: HTMLElement = this._getRowHTMLElement(index);
        if (rowElement == null) {
            return;
        }

        let keyDownHandler = (ev: KeyboardEvent) => {
            if(ev.keyCode == KeyCodes.space){
                rowElement.focus();
                ev.stopPropagation();
            }          
        };

        rowElement.addEventListener("keydown", keyDownHandler);
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({
            key: ColumnKeys.Name,
            name: Resources.GridNameColumn,
            fieldName: null,
            minWidth: 200,
            maxWidth: 400,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            headerClassName: "grid-header ms-font-m",
            onRender: (itemRow: IProjectData, index: number) => {
                let mvcOptions: VSS_Locations.MvcRouteOptions = { project: itemRow.name };
                return <LinkedGridCell
                    className="project-name-cell"
                    contextMenuItems={(this._isCloneXmlToInheritedEnabled && this._isXmlProcess) ? this._getContextMenuItems(itemRow) : null}
                    href={VSS_Locations.urlHelper.getMvcUrl(mvcOptions)}
                    text={itemRow.name}
                />
            }
        });

        columns.push({
            key: ColumnKeys.Description,
            name: Resources.GridDescriptionColumn,
            fieldName: ColumnKeys.Description,
            minWidth: 200,
            maxWidth: 400,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            className: "project-description-cell",
            headerClassName: "grid-header ms-font-m"
        });

        return columns;
    }

    private _getContextMenuItems(itemRow: IProjectData): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];


        if (this._isCloneXmlToInheritedEnabled && this._isXmlProcess) {
            items.push({
                key: "MIGRATE_XML_BACKED_PROJECT",
                name: Resources.ChangeXMLProcessToInheritedMenuItem,
                iconProps: contextualMenuIcon("bowtie-arrow-right"),
                data: itemRow,
                onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {

                    showMigrateProjectsPanel({ currentProject: itemRow.name, currentProcessName: this._processName});
                }
            });

        }
        return items;

    }
}
