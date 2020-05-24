/// <reference types="react" />

import * as React from "react";
import * as DetailsRowComponent from "OfficeFabric/components/DetailsList/DetailsRow";
import * as VSS from "VSS/VSS";
import * as Utils_Date from "VSS/Utils/Date";
import * as Async_Security from "Admin/Scripts/TFS.Admin.Security";
import * as Async_Dialogs from "VSS/Controls/Dialogs";

import { autobind } from "OfficeFabric/Utilities";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DetailsList, ConstrainMode, DetailsListLayoutMode, SelectionMode, IColumn, CheckboxVisibility } from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { getId as getTooltipId } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { Component as IdentityComponent } from "Presentation/Scripts/TFS/Components/InlineIdentity";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { NameColumn } from "ScaledAgile/Scripts/PlanHub/Components/NameColumn";
import { PlanColumnKey, IPlanSortOptions } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { PlanHubActionsCreator } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActionsCreator";
import { PlanUserPermissions } from "TFS/Work/Contracts";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";
import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Async_CopyPlanDialog from "ScaledAgile/Scripts/PlanHub/Components/CopyPlanDialog";

export interface IPlansListProps {
    ariaLabel: string;
    planHubActionsCreator: PlanHubActionsCreator;
    items: TabRowPlanData[];
    className?: string;
    sortedColumnKey?: string;
    isSortedDescending?: boolean;
}

export class PlansList extends React.Component<IPlansListProps, any> {
    private _setKey: string;
    public static planSecurityManager: Async_Security.SecurityManager;

    constructor(props: IPlansListProps) {
        super(props);
        this._setKey = GUIDUtils.newGuid();
    }

    public render(): JSX.Element {
        return <VssDetailsList
            setKey={this._setKey}
            layoutMode={DetailsListLayoutMode.justified}
            constrainMode={ConstrainMode.unconstrained}
            isHeaderVisible={true}
            columns={this._getColumns()}
            className={this.props.className}
            items={this.props.items}
            checkboxVisibility={CheckboxVisibility.hidden}
            onRenderRow={this._onRenderRow}
            selectionMode={SelectionMode.single}
            initialFocusedIndex={0}
            getKey={(item: TabRowPlanData) => item.id}
            actionsColumnKey={PlanColumnKey.Name}
            allocateSpaceForActionsButtonWhileHidden={true}
            shouldDisplayActions={(item: TabRowPlanData) => true}
            getMenuItems={this._getAllPlansContextMenuItems}
            getMenuItemProviders={this.getMenuItemProviders}
            onItemInvoked={this._onItemInvoked}
            />;
    }

    private _onItemInvoked = (item: TabRowPlanData) => {
        if (!item.isDeleted) {
            this.props.planHubActionsCreator.openPlan(item.id);
        }
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: PlanColumnKey.Name,
                name: ScaledAgileResources.PlanListNameHeader,
                fieldName: null,
                isResizable: true,
                isSorted: this.props.sortedColumnKey === PlanColumnKey.Name,
                isSortedDescending: this.props.sortedColumnKey === PlanColumnKey.Name ? this.props.isSortedDescending : false,
                minWidth: 350,
                maxWidth: 500,
                className: "plan-name-column",
                headerClassName: "plan-name-column-header",
                onColumnClick: this._onColumnClick,
                onRender: (row: TabRowPlanData, index: number) => {
                    return <NameColumn plan={row} planHubActionsCreator={this.props.planHubActionsCreator} />;
                }
            },
            {
                key: PlanColumnKey.CreatedBy,
                name: ScaledAgileResources.PlanListCreatedbyHeader,
                fieldName: null,
                isResizable: true,
                isSorted: this.props.sortedColumnKey === PlanColumnKey.CreatedBy,
                isSortedDescending: this.props.sortedColumnKey === PlanColumnKey.CreatedBy ? this.props.isSortedDescending : false,
                minWidth: 150,
                maxWidth: 200,
                className: "plan-createdby-column",
                onColumnClick: this._onColumnClick,
                onRender: (row: TabRowPlanData, index: number) => {
                    return <IdentityComponent
                        id={row.createdByIdentity.id}
                        displayName={row.createdByIdentity.displayName || " "}
                        tfsContext={TfsContext.getDefault()}
                        />;
                }
            },
            {
                key: PlanColumnKey.Description,
                name: ScaledAgileResources.PlanListDescriptionHeader,
                fieldName: PlanColumnKey.Description,
                isResizable: true,
                isSorted: this.props.sortedColumnKey === PlanColumnKey.Description,
                isSortedDescending: this.props.sortedColumnKey === PlanColumnKey.Description ? this.props.isSortedDescending : false,
                minWidth: 300,
                maxWidth: 800,
                className: "plan-description-column",
                onColumnClick: this._onColumnClick,
                onRender: (row: TabRowPlanData, index: number) => {
                    if (row.isDeleted) {
                        return <span className="favorite-deleted-message">
                            <span className="bowtie-icon bowtie-status-info-outline" style={{ marginRight: "5px" }}></span>
                            {ScaledAgileResources.DeletedPlanInfoMesage}
                        </span>;
                    }
                    const tooltipId = getTooltipId("plan-description-column");
                    return <TooltipHost
                            content={row.description}
                            directionalHint={DirectionalHint.bottomCenter}
                            overflowMode={TooltipOverflowMode.Parent}
                            id={tooltipId}>
                            {row.description}
                            </TooltipHost>;
                }
            },
            {
                key: PlanColumnKey.ModifiedDate,
                name: ScaledAgileResources.PlanListLastConfiguredHeader,
                fieldName: null,
                isResizable: true,
                isSorted: this.props.sortedColumnKey === PlanColumnKey.ModifiedDate,
                isSortedDescending: this.props.sortedColumnKey === PlanColumnKey.ModifiedDate ? this.props.isSortedDescending : false,
                minWidth: 220,
                maxWidth: 300,
                className: "plan-lastconfigured-column",
                onColumnClick: this._onColumnClick,
                onRender: (row: TabRowPlanData, index: number) => {
                    if (!row.isDeleted) {
                        return <span>{Utils_Date.friendly(row.modifiedDate)}</span>;
                    }
                    return null;
                }
            }
        ] as IColumn[];
    }

    private _onColumnClick = (event?: React.MouseEvent<HTMLElement>, column?: IColumn) => {
        this.props.planHubActionsCreator.sort({ columnKey: column.key, isSortedDescending: !column.isSortedDescending } as IPlanSortOptions);
    };

    private _onRenderRow = (props: DetailsRowComponent.IDetailsRowProps): JSX.Element => {
        const row: JSX.Element = <DetailsRowComponent.DetailsRow {...props} />;
        if (props.item.isDeleted) {
            return <div className="is-disabled">{row}</div>;
        }
        return row;
    }

    @autobind
    protected getMenuItemProviders(item: TabRowPlanData): IVssContextualMenuItemProvider[] {
        return [new ContributableMenuItemProvider(["ms.vss-plans.planlist-context-menu"], item)];
    }

    @autobind
    private _getAllPlansContextMenuItems(plan: TabRowPlanData): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];
        const isDeleteAllowed = (plan.userPermissions & PlanUserPermissions.Delete) === PlanUserPermissions.Delete;

        items.push({
            key: "delete-plan",
            name: ScaledAgileResources.View_ContextMenu_Delete_Title,
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            disabled: !isDeleteAllowed,
            onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                this._deletePlanContextMenu(plan);
            }
        });

        if (FeatureEnablement.isDeliveryTimelineCopyPlanEnabled()) {
            items.push({
                key: "copy-plan",
                name: ScaledAgileResources.View_ContextMenu_Copy_Title,
                iconProps: contextualMenuIcon("bowtie-edit-copy"),
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    this._copyPlanContextMenu(plan);
                }
            });
        }

        items.push({
            key: "plan-security",
            name: ScaledAgileResources.View_ContextMenu_Security_Title,
            iconProps: contextualMenuIcon("bowtie-security"),
            onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                this._showPlanSecurity(plan.id, plan.name);
            }
        });

        return items;
    }

    private _deletePlanContextMenu(plan: TabRowPlanData) {
        VSS.using(["VSS/Controls/Dialogs"], (Dialogs: typeof Async_Dialogs) => {
            Dialogs.Dialog.show(Dialogs.ConfirmationDialog, {
                title: ScaledAgileResources.DeletePlanDialogTitle,
                contentText: ScaledAgileResources.DeletePlanDialogMessage,
                resizeable: false,
                height: "150px",
                okText: ScaledAgileResources.View_ContextMenu_Delete_Title,
                okCallback: () => {
                    const missingFavoriteData = plan.favorite === undefined;
                    const isFavorite = !missingFavoriteData && !plan.isChangingFavoriteState;
                    this.props.planHubActionsCreator.deletePlan(plan, isFavorite);
                }
            }).setDialogResult(true);
        });
    }

    private _copyPlanContextMenu(plan: TabRowPlanData) {
        VSS.using(["ScaledAgile/Scripts/PlanHub/Components/CopyPlanDialog"],
            (CopyPlanDialogModule: typeof Async_CopyPlanDialog) => {
                CopyPlanDialogModule.CopyPlanDialog.show({
                    planName: plan.name,
                    onSave: (planName: string) => {
                        const missingFavoriteData = plan.favorite === undefined;
                        const isFavorite = !missingFavoriteData && !plan.isChangingFavoriteState;
                        this.props.planHubActionsCreator.copyPlan(plan.id, planName, isFavorite);
                    }
                });
            });
    }

    private _showPlanSecurity(planID: string, planName: string) {
        // Displaying permissions for the specified query item
        VSS.using(["Admin/Scripts/TFS.Admin.Security"], (TFS_Admin_Security: typeof Async_Security) => {
            if (!PlansList.planSecurityManager) {
                PlansList.planSecurityManager = TFS_Admin_Security.SecurityManager.create(Constants.PlanPermissionNamespaceID);
            }
            PlansList.planSecurityManager.showPermissions(planID, planName);
        });
    }
}
