import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/BacklogTypeGrid";

import * as React from "react";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";

import { Fabric } from "OfficeFabric/Fabric";
import * as Button from "OfficeFabric/Button";
import * as DetailsList from "OfficeFabric/DetailsList";
import * as ContextualMenu from "OfficeFabric/ContextualMenu";
import * as Tooltip from "VSSUI/Tooltip";

import * as PopupMenu from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { WorkItemTypeIconComponent } from "Admin/Scripts/Components/WorkItemTypeIconComponent";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";

export interface IBacklogTypeGridProps {
    group: Interfaces.IBacklogLevelGroup;
    actionsCreator: ActionsCreator;
    canEdit: boolean;
    isInherited: boolean;
}

interface IBacklogWorkItemType {
    backlog?: Interfaces.IBacklogLevel;
    workItemType: Interfaces.IWorkItemType;
}

export class BacklogTypeGrid extends React.Component<IBacklogTypeGridProps, {}> {
    public render(): JSX.Element {
        let items: IBacklogWorkItemType[] = [];
        for (let level of this.props.group.backlogLevels) {
            if ($.isArray(level.workItemTypes) && level.workItemTypes.length > 0) {
                for (let i = 0; i < level.workItemTypes.length; i++) {
                    items.push({
                        workItemType: level.workItemTypes[i],
                        backlog: i === 0 ? level : null
                    });
                }
            }
            else {
                items.push({
                    workItemType: null,
                    backlog: level
                });
            }
        }

        let columnsDefinitions: DetailsList.IColumn[] = this._getDetailsListColumns();

        let detailsListProps: DetailsList.IDetailsListProps = {
            items: items,
            layoutMode: DetailsList.DetailsListLayoutMode.justified,
            constrainMode: DetailsList.ConstrainMode.unconstrained,
            columns: columnsDefinitions,
            selectionMode: DetailsList.SelectionMode.none,
            checkboxVisibility: DetailsList.CheckboxVisibility.hidden,
            onItemContextMenu: (item?: IBacklogWorkItemType, index?: number, ev?: Event) => {
                if (item && item.backlog && this.props.isInherited && this.props.group.type !== Interfaces.BacklogLevelGroupType.Unmapped) {
                    this.props.actionsCreator.showContextMenu(this.props.group.type, item.backlog, ev);
                }
            }
        };

        // Returning office fabric details-list
        return (
            <Fabric className="backlog-group-list">
                <div className="ms-font-l ms-fontColor-neutralPrimary backlog-list-title">{this.props.group.name}</div>
                <div className="ms-font-m ms-fontColor-neutralSecondary">{this.props.group.description}</div>
                {this._getNewBacklogButton()}
                <DetailsList.DetailsList {...detailsListProps} />
                {this._contextMenu()}
            </Fabric>
        );
    }

    private _onContextMenuDismiss = () => {
        this.props.actionsCreator.dismissContextMenu();
    }

    private _contextMenu(): JSX.Element {
        if (this.props.group.contextMenu) {
            var ev: Event = this.props.group.contextMenu.event;
            var props: ContextualMenu.IContextualMenuProps = {
                items: this._getMenuItems(this.props.group.contextMenu.level),
                target: ev as MouseEvent,
                onDismiss: this._onContextMenuDismiss
            }

            return <ContextualMenu.ContextualMenu {...props} />;
        }
        else {
            return null;
        }
    }

    private _getDetailsListColumns(): DetailsList.IColumn[] {
        var columns: DetailsList.IColumn[] = [];

        columns.push({
            fieldName: null,
            key: "backlog",
            minWidth: 400,
            maxWidth: 400,
            name: AdminResources.BacklogLevels_Grid_BacklogColumn_Title,
            onRender: (item?: IBacklogWorkItemType, index?: number, column?: DetailsList.IColumn) => {
                if (item && item.backlog) {
                    if (item.backlog.type === Interfaces.BacklogLevelType.Tasks || !item.backlog.color) {
                        return <div>{` ${item.backlog.name}`}</div>
                    }
                    let color = item.backlog.color;
                    color = "#" + color.substring(color.length - 6);
                    return (
                        <div className="backlog-level-name">
                            <Tooltip.TooltipHost content={item.backlog.name} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                <span className="bowtie-icon bowtie-backlog" style={{ color: color }}></span>
                                {` ${item.backlog.name}`}
                            </Tooltip.TooltipHost>
                        </div>
                    );
                }
            },
            columnActionsMode: DetailsList.ColumnActionsMode.disabled
        });

        if (this.props.isInherited === true) {
            //  Only show actions for custom processes.
            columns.push({
                fieldName: null,
                key: "popup-menu",
                minWidth: 20,
                maxWidth: 20,
                name: "",
                onRender: (item?: IBacklogWorkItemType, index?: number, column?: DetailsList.IColumn) => {
                    let groupLevelType = this.props.group.type;
                    if (item && item.backlog && groupLevelType !== Interfaces.BacklogLevelGroupType.Unmapped) {
                        let menuProps: PopupMenu.IPopupContextualMenuProps = {
                            iconClassName: "bowtie-ellipsis",
                            items: this._getMenuItems(item.backlog)
                        }

                        return <div>
                            <PopupMenu.PopupContextualMenu {...menuProps} />
                        </div>;
                    }
                },
                columnActionsMode: DetailsList.ColumnActionsMode.disabled
            });
        }

        columns.push({
            fieldName: null,
            key: "work-item-types",
            minWidth: 200,
            maxWidth: 600,
            name: AdminResources.BacklogLevels_Grid_WorkItemTypeColumn_Title,
            onRender: (item?: IBacklogWorkItemType, index?: number, column?: DetailsList.IColumn) => {
                // Work Item Type is null when the backlog level does not have any work item types associated yet
                if (item && item.workItemType) {
                    let title = item.workItemType.name;

                    if (item.workItemType.isDisabled) {
                        title += ` ${AdminResources.BacklogLevels_DisabledWorkItemType_Suffix}`;
                    }
                    else if (item.workItemType.isDefault) {
                        title += ` ${AdminResources.BacklogLevels_DefaultWorkItemType_Suffix}`;
                    }

                    return (
                        <div className="work-item-type">
                            <Tooltip.TooltipHost content={title} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                <WorkItemTypeIconComponent colorClass="bowtie-work-item-bar" color={item.workItemType.color} icon={item.workItemType.icon} />
                                {title}
                            </Tooltip.TooltipHost>
                        </div>
                    );
                }
            },
            columnActionsMode: DetailsList.ColumnActionsMode.disabled
        });

        return columns;
    }

    private _openEditDialog(backlogLevel: Interfaces.IBacklogLevel) {
        this.props.actionsCreator.launchEditBacklogLevelDialog(this.props.group.name, backlogLevel);
    }

    private _openAddNewBacklogDialog() {
        this.props.actionsCreator.launchAddNewBacklogLevelDialog();
    }

    private _openDeleteDialog(backlogLevel: Interfaces.IBacklogLevel) {
        this.props.actionsCreator.launchDeleteConfirmationDialog(backlogLevel);
    }

    private _openResetDialog(backlogLevel: Interfaces.IBacklogLevel) {
        this.props.actionsCreator.launchResetConfirmationDialog(backlogLevel);
    }

    private _getNewBacklogButton(): JSX.Element {
        if (this.props.group.type === Interfaces.BacklogLevelGroupType.Portfolio &&
            this.props.isInherited === true) {

            return <Tooltip.TooltipHost content={AdminResources.BacklogLevels_AddNewPortfolioBacklog_HelpText}>
                <Button.CommandButton
                    iconProps={contextualMenuIcon("bowtie-math-plus-light")}
                    text={AdminResources.BacklogLevels_NewBacklogLevel}
                    onClick={() => {
                        this._openAddNewBacklogDialog();
                    }} />
            </Tooltip.TooltipHost>;
        }
        return null;
    }

    private _getMenuItems(backlog: Interfaces.IBacklogLevel): ContextualMenu.IContextualMenuItem[] {

        //  'Edit' action in the context menu is:
        //      -   Enabled: when the process is inherited and the user has edit permissions.
        //      -   Hidden: when the process is OOB (i.e. non-inherited).
        let items: ContextualMenu.IContextualMenuItem[] = [{
            name: this.props.group.type === Interfaces.BacklogLevelGroupType.Tasks ? AdminResources.BacklogLevels_PopupMenu_Edit : AdminResources.BacklogLevels_PopupMenu_EditRename,
            key: AdminResources.BacklogLevels_PopupMenu_Edit + backlog.id,
            iconProps: contextualMenuIcon("bowtie-edit"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                this._openEditDialog(item.data as Interfaces.IBacklogLevel);
            },
            data: backlog,
        }];

        if (this.props.group.type === Interfaces.BacklogLevelGroupType.Portfolio) {
            //  'Delete' action in the context menu is:
            //      -   Enabled: when the process is inherited, current behavior is portfolio one,
            //          the backlog level is custom, the user has edit permissions, and the backlog level is at the top.
            //      -   Hidden: when the process is OOB (i.e. non-inherited).
            //          and:
            //              -   The backlog level is custom but user does not have edit permissions.
            //          or  -   The backlog level is not custom.
            if(backlog.isCustom){
                items.push({
                    name: AdminResources.BacklogLevels_PopupMenu_Delete,
                    key: AdminResources.BacklogLevels_PopupMenu_Delete + backlog.id,
                    onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                        this._openDeleteDialog(item.data as Interfaces.IBacklogLevel);
                    },
                    data: backlog,
                });
            }
        }

        if (!backlog.isCustom) {
            // 'Reset' action in the context menu if for system backlogs: Task, Requirement, Epic and Feature
            items.push({
                name: AdminResources.BacklogLevels_PopupMenu_Reset,
                key: AdminResources.BacklogLevels_PopupMenu_Reset + backlog.id,
                onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                    this._openResetDialog(item.data as Interfaces.IBacklogLevel);
                },
                data: backlog,
            });
        }


        return items;
    }
}