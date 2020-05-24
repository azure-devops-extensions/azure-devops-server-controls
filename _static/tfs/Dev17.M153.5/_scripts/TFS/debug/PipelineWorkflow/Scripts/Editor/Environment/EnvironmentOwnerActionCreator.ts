// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentOwnerActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerActionsHub";
import { GraphGroupUserSource } from "PipelineWorkflow/Scripts/Shared/Sources/GraphGroupUserSource";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

/**
 * Raises actions related to environment properties
 */
export class EnvironmentOwnerActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentOwnerActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._environmentOwnerActionsHub = ActionsHubManager.GetActionsHub<EnvironmentOwnerActionsHub>(EnvironmentOwnerActionsHub, instanceId);
    }

    /**
     * Triggers an action to update environment owner
     */
    public updateEnvironmentOwner(owner: Identities_Picker_RestClient.IEntity): void {

        // Clear error message if any
        this._updateMaterializationInProgress(false);
        this._updateUnmaterializedEnvironmentOwner(Utils_String.empty);
        this._updateMaterializeEnvironmentOwnerError(Utils_String.empty);

        if (!owner || !FeatureFlagUtils.isHostedAADAccount() || !FeatureFlagUtils.isAzureADSupportForIdentityPickerFeatureEnabled()) {
            this._environmentOwnerActionsHub.updateEnvironmentOwner.invoke(owner);
            return;
        }

        // Environment owner is already a local user
        if (!!owner.localId) {
            this._environmentOwnerActionsHub.updateEnvironmentOwner.invoke(owner);
            return;
        }

        // Make REST call to add AAD entity as local user
        this._addEntityAsLocalUser(owner);
    }

    public updateEnvironmentOwnerFromService(owner: WebApi_Contracts.IdentityRef) {
        this._environmentOwnerActionsHub.updateEnvironmentOwnerFromService.invoke(owner);
    }

    /**
     * Add AAD account as local user
     */
    private _addEntityAsLocalUser(owner: Identities_Picker_RestClient.IEntity): void {

        // Set materialization in progress flag to true to show the message
        this._updateMaterializationInProgress(true);

        // Make REST call to add AAD entity as local user
        this._graphSource.addEntityAsLocalUser(owner.entityType, owner.originId).then((member) => {
            // Reset materialization in progress flag to false to hide the message
            this._updateMaterializationInProgress(false);

            if (!member) {
                // Handle unmaterialized environment owner error condition
                this._updateUnmaterializedEnvironmentOwner(owner.displayName);
            }
            else {
                // Update materialized owner localId
                this._graphSource.getGraphMemberStorageKey(member).then((storageKey) => {
                    owner.localId = storageKey.value;
                    this._environmentOwnerActionsHub.updateEnvironmentOwner.invoke(owner);
               }, (error) => {
                   this._handleAddEntityAsLocalUserError(error);
               });
            }
        }, (error) => {
            this._handleAddEntityAsLocalUserError(error);
        });
    }

    private _handleAddEntityAsLocalUserError(error: any) {
        // Reset materialization in progress flag to false to hide the message
        this._updateMaterializationInProgress(false);

        // Handle materialization exception error condition
        this._updateMaterializeEnvironmentOwnerError(VSS.getErrorMessage(error));
    }

    /**
     * Updates the approvers count that failed to be added as local users in identity picker
     */
    private _updateUnmaterializedEnvironmentOwner(unmaterializedEnvironmentOwner: string) {
        this._environmentOwnerActionsHub.updateUnmaterializedEnvironmentOwner.invoke(unmaterializedEnvironmentOwner);
    }

    /**
     * Updates the REST call error message that failed to add environment owner as local user in identity picker
     */
    private _updateMaterializeEnvironmentOwnerError(errorMessage: string) {
        this._environmentOwnerActionsHub.updateMaterializeEnvironmentOwnerError.invoke(errorMessage);
    }

    /**
     * Updates the environment owner AAD account materialization in progress message for identity picker
     */
    private _updateMaterializationInProgress(inProgress: boolean) {
        this._environmentOwnerActionsHub.updateMaterializationInProgress.invoke(inProgress);
    }

    private _environmentOwnerActionsHub: EnvironmentOwnerActionsHub;
    private _graphSource: GraphGroupUserSource = GraphGroupUserSource.instance();
}


