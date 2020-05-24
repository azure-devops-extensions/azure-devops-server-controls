/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";

import { EnvironmentProperties } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentProperties";
import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";


export class EnvironmentCorePropertiesItem implements Item {

    constructor(private _releaseDefinitionFolderPath: string, 
                private _releaseDefinitionId: number, 
                private _instanceId: string,
                private _onMoveEnvironment: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void,
                private _isMoveEnvironmentEnabled: (instanceId: string, moveDirection: MoveDirection) => boolean) {

        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, this._instanceId);
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        if (this._environmentStore && this._environmentStore.isTemporary()) {
            return <div />;
        }

        // Key should be sent to ensure that react is able to distinguish between
        // components for different environments. 
        const envState = this._environmentStore.getCurrentState();
        return (
            <PermissionIndicator
                securityProps={PermissionHelper.createEditEnvironmentSecurityProps(this._releaseDefinitionFolderPath, this._releaseDefinitionId, envState.id)}
                overridingSecurityProps={PermissionHelper.createEditEnvironmentOverrideSecurityProps(this._releaseDefinitionFolderPath, this._releaseDefinitionId)}
                key={this.getKey()}
                message={Resources.EditEnvironmentPermissionMessage}
                telemetrySource={PermissionIndicatorSource.pipelineTab} >

                <div className="cd-environment-properties" key={this.getKey()}>
                    <EnvironmentProperties
                        instanceId={this._instanceId}
                        environment={envState}
                        releaseDefinitionFolderPath={this._releaseDefinitionFolderPath}
                        releaseDefinitionId={this._releaseDefinitionId}
                        onMoveEnvironment = {this._onMoveEnvironment}
                        isMoveEnvironmentEnabled = {this._isMoveEnvironmentEnabled} />
                </div>
            </PermissionIndicator>);
    }

    public getKey(): string {
        return "cd-environment-" + this._instanceId;
    }

    public getInstanceId(): string {
        return this._instanceId;
    }

    private _environmentStore: DeployEnvironmentStore;
}
