/// <reference types="react" />
import * as React from "react";


import * as Base from "DistributedTaskControls/Common/Components/Base";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import {
    ICurrentlyDeployedRelease,
    IEnvironmentSkeleton
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";

import { CheckboxVisibility, ConstrainMode, DetailsListLayoutMode, IColumn, Selection, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { css, getId } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

import * as Utils_String from "VSS/Utils/String";
import { Status, StatusSize, IStatusProps, Statuses } from "VSSUI/Status";
import { TooltipDelay, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { VssDetailsList, VssDetailsListRowStyle } from "VSSUI/VssDetailsList";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsList";

export interface IDeployMultipleEnvironmentsListProps extends Base.IProps {
    environments: IEnvironmentSkeleton[];
    releaseToCompare: { [id: number]: ICurrentlyDeployedRelease };
    demands: { [id: number]: string };
    setSelectedEnvironments: (selectedEnvironments: IEnvironmentSkeleton[]) => void;
    disabled: boolean;
}

interface IEnvironmentDeploymentListItem {
    key: number;
    environment: IEnvironmentSkeleton;
    currentlyDeployedRelease: ICurrentlyDeployedRelease;
    demands: string;
}

export class DeployMultipleEnvironmentsList extends Base.Component<IDeployMultipleEnvironmentsListProps, Base.IStateless> {

    constructor(props) {
        super(props);
        this._environmentListSelection = new Selection({
            onSelectionChanged: this._setSelectedEnvironments.bind(this),
            selectionMode: props.disabled ? SelectionMode.none : SelectionMode.multiple
        });
    }

    private _setSelectedEnvironments() {
        const selection = (this._environmentListSelection.getSelection()) as IEnvironmentDeploymentListItem[];
        let selectedEnvironments: IEnvironmentSkeleton[] = [];
        for (let element of selection) {
            selectedEnvironments.push(element.environment);
        }

        this.props.setSelectedEnvironments(selectedEnvironments);
    }

    public componentWillMount() {
        this._environmentListSelection.setItems(this._getEnvironmentItems());
    }

    public render(): JSX.Element {
        if (this.props.environments.length > 0) {
            return this.renderList();
        }
        else {
            return this.renderNoEnvironments();
        }
    }

    private renderList(): JSX.Element {
        return (<VssDetailsList
            rowStyle={VssDetailsListRowStyle.oneLine}
            items={this._getEnvironmentItems()}
            selectionPreservedOnEmptyClick={true}
            setKey={"deploy-multiple-environments"}
            selectionMode={this.props.disabled ? SelectionMode.none : SelectionMode.multiple}
            selection={this._environmentListSelection}
            constrainMode={ConstrainMode.horizontalConstrained}
            className={"deploy-environments-container"}
            layoutMode={DetailsListLayoutMode.fixedColumns}
            columns={this._getEnvironmentColumns()}
            checkboxVisibility={this.props.disabled ? CheckboxVisibility.hidden : CheckboxVisibility.always}
            ariaLabelForSelectAllCheckbox={Resources.SelectAllEnvironments}
            checkButtonAriaLabel={Resources.SelectEnvironment}
        />

        );
    }

    private renderNoEnvironments(): JSX.Element {
        return (<div className="no-environments-to-deploy">{Resources.NoEnvironmentsToDeploy}</div>);
    }

    private _getEnvironmentItems(): IEnvironmentDeploymentListItem[] {
        let items: IEnvironmentDeploymentListItem[] = [];
        if (this.props.environments) {
            for (let environment of this.props.environments) {
                items.push(
                    {
                        key: environment.id,
                        environment: environment,
                        currentlyDeployedRelease: this.props.releaseToCompare[environment.id],
                        demands: this.props.demands[environment.id],
                    } as IEnvironmentDeploymentListItem
                );
            }
        }
        return items;
    }

    private _getEnvironmentColumns(): IColumn[] {
        const _columns: IColumn[] = [
            {
                key: "environment",
                name: Resources.Environment,
                fieldName: "environment",
                minWidth: 100,
                maxWidth: 200,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderEnvironment.bind(this)
            },
            {
                key: "currently_deployed_status_release",
                name: Resources.CurrentlyDeployedOnEnvironment,
                fieldName: "currently_deployed_status_release",
                minWidth: 105,
                maxWidth: 405,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderCurrentlyDeployedStatusRelease.bind(this)
            },
        ];

        if (Object.keys(this.props.demands).length > 0) {
            _columns.unshift({
                key: "demands",
                name: Resources.DemandsWarningHeader,
                fieldName: "demands",
                minWidth: 5,
                maxWidth: 5,
                isIconOnly: true,
                isResizable: false,
                onRender: this._renderDemands.bind(this)
            });
        }

        return _columns;
    }

    private _renderEnvironment(item: IEnvironmentDeploymentListItem, index: number, column: IColumn): JSX.Element {
        return (<div className="deploy-list-cell environment-name-container">
            <TooltipHost
                content={item.environment.name}
                overflowMode={TooltipOverflowMode.Parent}
                className="environment-element" >
                <span>{item.environment.name}</span>
            </TooltipHost>
        </div>);
    }

    private _renderDemands(item: IEnvironmentDeploymentListItem, index: number, column: IColumn): JSX.Element {
        const tooltipId = getId("demandsTooltip");
        return (<div className="deploy-list-cell environment-demands-container">
            {item.demands && <div className="demands-warning-icon-container">
                <TooltipHost
                    id={tooltipId}
                    directionalHint={DirectionalHint.bottomCenter}
                    content={item.demands}
                    delay={TooltipDelay.medium}>
                    {this._getIcon("demands-icon", Statuses.Warning, Utils_String.localeFormat(Resources.DemandsWarningFullText, Resources.DemandsWarningHeaderInfo, item.demands))}
                </TooltipHost>
            </div>}
        </div>);
    }

    private _renderCurrentlyDeployedStatusRelease(item: IEnvironmentDeploymentListItem, index: number, column: IColumn): JSX.Element {
        const tooltipIddeploymentstatus = getId("deploy-list-cell currentlyDeployedStatusTooltip");
        const deploymentInfo = item.currentlyDeployedRelease ? Utils_String.localeFormat(Resources.OldDeploymentStatus, item.currentlyDeployedRelease.deploymentStatus, item.currentlyDeployedRelease.completedOn) : null;
        return (<div>
            <div className="currently-deployed-status-container">
                {item.currentlyDeployedRelease && <TooltipHost
                    id={tooltipIddeploymentstatus}
                    directionalHint={DirectionalHint.bottomCenter}
                    content={deploymentInfo}
                    delay={TooltipDelay.medium}>
                    {
                        this._getIcon("deployment-status", item.currentlyDeployedRelease.deploymentStatusIconProps, deploymentInfo)
                    }
                </TooltipHost>}
            </div>
            <div className="deploy-list-cell currently-deployed-name-container">
                {item.currentlyDeployedRelease && <TooltipHost
                    content={item.currentlyDeployedRelease.name}
                    overflowMode={TooltipOverflowMode.Parent}
                    className="environment-element" >
                    {this._getLink(item.currentlyDeployedRelease.id, item.currentlyDeployedRelease.name)}
                </TooltipHost>}
            </div>
        </div>);
    }

    private _getIcon(className: string, statusProps: IStatusProps, ariaLabel: string): JSX.Element {
        return <div
            tabIndex={0}
            data-is-focusable={true}
            aria-label={ariaLabel}>
            <Status {...statusProps} size={StatusSize.s} className={className} />
        </div>;
    }

    private _getLink(releaseId: number, releaseName: string): JSX.Element {
        let releaseLink = ReleaseUrlUtils.getReleaseProgressUrl(releaseId);
        return (
            <SafeLink href={releaseLink} target="_blank" allowRelative={true} >
                {releaseName}
            </SafeLink>
        );
    }

    private _environmentListSelection: Selection;

}