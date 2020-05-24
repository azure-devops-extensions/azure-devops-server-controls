/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";

import { PreDeploymentConditionView } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/PreDeploymentConditionControllerView";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export class EnvironmentPreDeploymentApprovalsItem implements Item {

    constructor(private _releaseDefinitionFolderPath: string, private _releaseDefinitionId: number, private _environmentId: number, private _environmentName: string, private _instanceId: string, private _isReleaseView: boolean = false) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {

        // Key should be sent to ensure that react is able to distinguish between
        // components for different environments. 
        return (
            <PermissionIndicator
                securityProps={PermissionHelper.createEditEnvironmentSecurityProps(this._releaseDefinitionFolderPath, this._releaseDefinitionId, this._environmentId)}
                overridingSecurityProps={PermissionHelper.createEditEnvironmentOverrideSecurityPropsForReleaseView(this._releaseDefinitionFolderPath, this._releaseDefinitionId)}
                key={this.getKey()}
                message={Resources.EditEnvironmentPermissionMessage}
                telemetrySource={PermissionIndicatorSource.pipelineTab}>

                <div className="pre-deployment-approvers-container" key={this.getKey()}>
                    <PreDeploymentConditionView
                        releaseDefinitionId={this._releaseDefinitionId}
                        environmentId={this._environmentId}
                        environmentName={this._environmentName}
                        instanceId={this._instanceId}
                        isReleaseView={this._isReleaseView}>
                    </PreDeploymentConditionView>
                </div>

            </PermissionIndicator>);
    }

    public getKey(): string {
        return "cd-preapprovals-" + this._instanceId;
    }

    public getInstanceId(): string {
        return this._instanceId;
    }
}
