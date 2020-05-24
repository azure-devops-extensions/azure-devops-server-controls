/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as VSSStore from "VSS/Flux/Store";
import { VCAdminActionsHub } from "VersionControl/Scenarios/VCAdmin/Actions/VCAdminActionsHub"
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"

// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";

export class PolicyStore extends VSSStore.Store {
    private _error: Error;
    private _policyConfigs: PolicyConfiguration[];
    private _localPolicy: PolicyConfiguration;
    private _projectPolicy: PolicyConfiguration;
    private _policyInherited: boolean;
    private _initialized: boolean;

    constructor() {
        super();
        this._policyConfigs = null;
        this._error = null;
        this._localPolicy = null;
        this._projectPolicy = null;
        this._policyInherited = false;
        this._initialized = false;
    }

    public onLoad(payload: VCTypes.PolicyLoadPayload) {
        this._initialized = true;
        this._policyConfigs = payload.configs;
        this._error = null;

        if (payload.targetRepoId === VCTypes.Constants.AllReposId) {
            this._policyConfigs = this._policyConfigs.filter(VCTypes.PolicyHelpers.doesPolicyConfigHaveProjectScope);
            this._localPolicy = this._policyConfigs[0];
            this._policyInherited = false;
        } else {
            // check to see if the policy is overriden by a higher-level policy
            for (const config of this._policyConfigs) {
                if (config.settings.scope) {
                    for (const scope of config.settings.scope) {
                        // if there's no scope object (shouldn't happen)
                        // or if the repo id of the scope is null or empty string
                        // then we've found the global/project policy
                        if (!scope || !scope.repositoryId) {
                           this._projectPolicy = config;
                        }

                        // if the repo id in the scope matches our target repo id,
                        // we found the repo policy
                        if (scope && scope.repositoryId === payload.targetRepoId) {
                            this._localPolicy = config;
                        }
                    }
                }
            }
            this._policyInherited = payload.shouldGlobalPolicyApply(this._localPolicy, this._projectPolicy);
        }

        this.emitChanged();
    }

    public onLoadFailed(error: Error) {
        this._policyConfigs = [];
        this._error = error;
        this.emitChanged();
    }

    public getData(): VCTypes.PolicyContainerState {
        return {
            policyConfigs: this._policyConfigs,
            error: this._error,
            localPolicy: this._localPolicy,
            projectPolicy: this._projectPolicy,
            policyInherited: this._policyInherited,
            initialized: this._initialized
        };
    }
}
