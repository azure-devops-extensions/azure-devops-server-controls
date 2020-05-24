/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Link } from "OfficeFabric/Link";

import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ActionClickTarget, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";

import { empty } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { IdentityRef } from "VSS/WebApi/Contracts";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { VssPersona } from "VSSUI/VssPersona";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Timeline/DeploymentCanceledMessageBar";

export class DeploymentCanceledMessageBar extends Base.Component<Types.IDeploymentCanceledMessageBarProps, Types.IDeploymentCanceledMessageBarState> {

    public render(): JSX.Element {
        const deploymentAttempt = this.props.deploymentAttemptHelper.getDeploymentAttempt();

        if (deploymentAttempt) {
            const deploymentStatus = this.props.deploymentAttemptHelper.getComputedStatus();
            const attemptLastModifiedBy = deploymentAttempt.lastModifiedBy;

            if (deploymentStatus === ComputedDeploymentStatus.CanceledBeforeExecution || deploymentStatus === ComputedDeploymentStatus.CanceledDuringExecution) {
                return (
                    <div className="deployment-canceled-message-bar">
                        {this._getDeploymentCanceledMessageBar(attemptLastModifiedBy, deploymentAttempt.lastModifiedOn)}
                    </div>
                );
            }
        }

        return null;
    }

    private _getDeploymentCanceledMessageBar(attemptLastModifiedBy: IdentityRef, attemptLastModifiedOn: Date) {
        const canceledByUserDisplayName: string = attemptLastModifiedBy && attemptLastModifiedBy.displayName;
        const canceledByUserImageUrl: string = attemptLastModifiedBy && IdentityHelper.getIdentityAvatarUrl(attemptLastModifiedBy);
        const canceledOnTimeStampString = DateTimeUtils.getLocaleTimestamp(attemptLastModifiedOn as Date);

        const redeployManuallyElement: JSX.Element = this._getRedeployManuallyElement();
        return (
            <div>
                <div className="deployment-cancelled-text">
                    <VssIcon
                        className="message-bar-icon"
                        iconName={"Blocked"}
                        iconType={VssIconType.fabric}
                    />
                    <FormatComponent format={Resources.TimelineDescriptionByOnFormat} elementType="div">
                        <span>{Resources.TimelineDescriptionDeploymentCanceledPrefix}</span>
                        {(!this.state.imageError && canceledByUserImageUrl)
                            ? (
                                <VssPersona
                                    size={"extra-extra-small"}
                                    onImageError={this._onImageError}
                                    cssClass={"canceled-by-persona"}
                                    suppressPersonaCard={true}
                                    imgAltText={empty}
                                    identityDetailsProvider={{
                                        getIdentityImageUrl: (size: number): string => {
                                            return canceledByUserImageUrl;
                                        },
                                        getDisplayName: (): string => {
                                            return empty;
                                        }
                                    }}
                                />)
                            : (<span />)}
                        <span>{canceledByUserDisplayName}</span>
                        <span>{canceledOnTimeStampString}</span>
                    </FormatComponent>
                </div>

                {redeployManuallyElement}
            </div>
        );
    }

    private _getRedeployManuallyElement() {
        if (this.props.deploymentActionsMap) {
            const deployActionInfo = this.props.deploymentActionsMap[ReleaseEnvironmentAction.Redeploy];

            if (deployActionInfo && deployActionInfo.isVisible && !deployActionInfo.isDisabled) {
                return (
                    <FormatComponent format={Resources.UserActionTextFormat} elementType="div">
                        <Link
                            onClick={this._onDeployClick}
                            onKeyDown={this._handleKeyDownOnRedeployManually}
                            className="redeploy-link"
                        >
                            {Resources.RedeployManuallyActionText}
                        </Link>
                    </FormatComponent>
                );
            }
        }

        return null;
    }

    private _onDeployClick = () => {
        const deployActionInfo = this.props.deploymentActionsMap[ReleaseEnvironmentAction.Redeploy];
        deployActionInfo.onExecute(this.props.instanceId, ActionClickTarget.environmentSummary);
    }

    private _handleKeyDownOnRedeployManually = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._onDeployClick();
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }
}