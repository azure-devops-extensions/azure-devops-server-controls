/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Q = require("q");

import { css } from "OfficeFabric/Utilities";
import { Icon } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";
import { DetailsList, IColumn, CheckboxVisibility, ColumnActionsMode } from "OfficeFabric/DetailsList";

import Component_Base = require("VSS/Flux/Component");

import DistributedTask = require("TFS/DistributedTask/Contracts");
import Resources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { AdminBuildQueueComponentProps } from "Build/Scripts/Components/AdminBuildQueue";
import { Component as FriendlyDateTime } from "Build/Scripts/Components/FriendlyDateTime";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/Scripts/AdminBuildAndRelease/Components/ViewInprogressJobsView";

export interface IProps extends Component_Base.Props {
    projectsTitle: string;
    imgUrl: string;
    concurrencyTitle: string;
    resourceUsage: DistributedTask.ResourceUsage;
    onClosed?: () => void;
    elementToFocusOnDismiss?: HTMLElement;
}

export class ViewInprogressJobsView extends Component_Base.Component<IProps, Component_Base.State> {

    public render(): JSX.Element {

        let runningRequests: DistributedTask.TaskAgentJobRequest[] = this.props.resourceUsage.runningRequests || [];
        
        return (<PanelComponent
                showPanel={true}
                panelWidth={800}
                onClosed={this.props.onClosed}
                isBlocking={true}
                hasCloseButton={true}
                cssClass={"view-inprogress-jobs-panel"}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                <div className="inprogress-jobs-view">
                    <div className={css('title-section')}>
                        <label className={css('large-font bold-text')}>{this.props.projectsTitle}</label>
                        <label className={css('large-font')}>{Resources.InProgressJobsSuffixText}</label>
                    </div>
                    <div className={css('subtitle-section')}>
                        <img className="concurrency-type-icon" src={this.props.imgUrl} />
                        <div className={css('concurrency-title')}>
                            <label className={css('medium-font')}>{this.props.concurrencyTitle}</label>
                        </div>
                    </div>
                    <label className={css('medium-font')}>{Utils_String.format(Resources.CurrentlyRunningJobsFormat, this.props.resourceUsage.usedCount, this.props.resourceUsage.resourceLimit.totalCount)}</label>
                    <DetailsList 
                        className="inprogress-jobs-grid"
                        checkboxVisibility={CheckboxVisibility.hidden}
                        items={runningRequests} 
                        columns={this._getColumns()} />
                </div>
            </PanelComponent>);
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: "Name",
                name: Resources.JobNameColumnLabel,
                fieldName: null,
                minWidth: 100,
                isResizable: true,
                className: "name-column",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (itemRow: DistributedTask.TaskAgentJobRequest, index: number) => {
                    if (itemRow.owner) {
                        return <Link className={css('medium-font')} target="_blank" href={itemRow.owner._links.web.href} >{itemRow.owner.name}</Link>;
                    }

                    return null;
                }
            },
            {
                key: "Type",
                name: Resources.JobTypeColumnLabel,
                fieldName: null,
                minWidth: 100,
                isResizable: true,
                className: "type-column",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (itemRow: DistributedTask.TaskAgentJobRequest, index: number) => {
                    return <label className={css('medium-font')}>{itemRow.planType}</label>;
                }
            },
            {
                key: "Agent",
                name: Resources.AgentNameColumnLabel,
                fieldName: null,
                minWidth: 100,
                isResizable: true,
                className: "name-column",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (itemRow: DistributedTask.TaskAgentJobRequest, index: number) => {

                    if (itemRow.reservedAgent) {
                        return <label className={css('medium-font')}>{itemRow.reservedAgent.name}</label>;
                    }

                    return null;
                }
            },
            {
                key: "StartedOn",
                name: Resources.StartedOnColumnLabel,
                fieldName: null,
                minWidth: 100,
                isResizable: true,
                className: "startedon-column",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (itemRow: DistributedTask.TaskAgentJobRequest, index: number) => {
                    if (itemRow.queueTime) {
                        return <FriendlyDateTime time={itemRow.queueTime} />;
                    }

                    return null;
                }
            }
        ];
    }
}