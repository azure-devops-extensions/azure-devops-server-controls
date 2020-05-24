/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { PersonaActivityComponent, IPersonaProps } from "DistributedTaskControls/SharedControls/PersonaActivityComponent/PersonaActivityComponent";

import { List } from "OfficeFabric/List";
import { autobind, css } from "OfficeFabric/Utilities";

import { IReleaseApprovalReassignHistory } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";

import * as Utils_Array from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalReassignHistory";

export interface IReleaseApprovalReassignHistoryProps extends Base.IProps {
    historyData: IReleaseApprovalReassignHistory[];
}

export class ReleaseApprovalReassignHistory extends Base.Component<IReleaseApprovalReassignHistoryProps, Base.IStateless> {

    public render(): JSX.Element {
        if (this.props.historyData) {
            return (
                <div className="reassign-history-container" >
                    <List
                        items={Utils_Array.clone(this.props.historyData)}
                        className="reassign-history-list"
                        onRenderCell={this._renderHistoryItem} />
                </div>
            );
        }
    }

    @autobind
    private _renderHistoryItem(item: IReleaseApprovalReassignHistory): JSX.Element {
        return (
            <div className="reassign-history-item-container">
                {this._getHistoryInfo(item)}
                {this._getCommentSection(item)}
            </div>
        );
    }

    private _getCommentSection(item: IReleaseApprovalReassignHistory): JSX.Element {
        const doesCommentExist = !!item.comment;
        if (doesCommentExist) {
            return (
                <div className="reassign-history-item-comment-section">
                    {item.comment}
                </div>
            );
        }
        return null;
    }

    private _getHistoryInfo(item: IReleaseApprovalReassignHistory): JSX.Element {
        return (
            <PersonaActivityComponent
                personaActivityInfoContainerClassName="reassign-history-item-info"
                personaTextContainerClassName="reassign-history-item-info-right"
                personaProps={
                    {
                        displayName: item.name,
                        iconUrl: item.iconProps.url
                    }
                }
                personaTextProps={
                    {
                        personaText: item.name                        
                    }
                }
                activityProps={
                    {
                        activityText: item.reassignedStatusProps && item.reassignedStatusProps.reassignedStatusText ? item.reassignedStatusProps.reassignedStatusText : null,
                        activityStatusIcon: this._getApprovalStatusIcon(item),
                        activityStatusCss: "reassign-history-item-status"
                    }
                } />
        );
    }

    private _getApprovalStatusIcon(item: IReleaseApprovalReassignHistory): string {
        const reassignedStatusProps = item.reassignedStatusProps;
        if (reassignedStatusProps) {
            return css("reassign-history-item-status-icon", "bowtie-icon", "bowtie-user");
        }
        return null;
    }
}