/// Copyright (c) Microsoft Corporation. All rights reserved.

import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import {
    GitPermissionsKey,
    GitPermissionSet,
    createRepositoryGitPermissionsKey
} from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { VCAdminActionsHub } from "VersionControl/Scenarios/VCAdmin/Actions/VCAdminActionsHub";
import { VCAdminSourcesHub } from "VersionControl/Scenarios/VCAdmin/Sources/VCAdminSourcesHub";
import { VCAdminStoresHub } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminStoresHub";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class VCAdminActionCreator {
    private _actionsHub: VCAdminActionsHub;
    private _sourcesHub: VCAdminSourcesHub;
    private _storesHub: VCAdminStoresHub;

    private _repoContext: RepositoryContext;

    constructor(repositoryContext: RepositoryContext, actionsHub: VCAdminActionsHub, sourcesHub: VCAdminSourcesHub, storesHub: VCAdminStoresHub) {
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
        this._storesHub = storesHub;
        this._repoContext = repositoryContext;
    }

    public getRepositoryOptions(): void {
        this._sourcesHub.repoOptionsSource.getVCOptions().then(
        (data) => {
            this._actionsHub.repoOptionsLoaded.invoke(data);
        },
        (error) => {
            this._actionsHub.repoOptionsLoadFailed.invoke(error);
        });
    }

    public updateRepositoryOption(key: string, value: boolean) {
        this._sourcesHub.repoOptionsSource.updateVCOption(key, value).then(
        () => {
            this._actionsHub.repoOptionsUpdated.invoke({});
            this.getRepositoryOptions();
        },
        (error: Error) => {
            this._actionsHub.repoOptionUpdateFailed.invoke({error: error, optionKey: key});
        });
    }

    public getCaseEnforcementSetting() {
        this._sourcesHub.policySource.fetchPolicy(VCTypes.RepoSettingsPolicy.id, this._repoContext, VCTypes.Constants.GlobalScope).then(
        (data) => {
            this._actionsHub.caseEnforcementLoaded.invoke({
                configs: data,
                targetRepoId: this._repoContext.getRepositoryId(),
                shouldGlobalPolicyApply: VCTypes.RepoSettingsPolicy.shouldGlobalPolicyApply
            });
        },
        (error) => {
            this._actionsHub.caseEnforcementLoadFailed.invoke(error);
        });
    }

    public getRepoPermissions() {
        const permissionKeys: GitPermissionsKey[] = [];
        const repoId = this._repoContext.getRepositoryId() === VCTypes.Constants.AllReposId
            ? null
            : this._repoContext.getRepositoryId();

        permissionKeys.push(
            createRepositoryGitPermissionsKey(
                this._repoContext.getTfsContext().contextData.project.id,
                repoId));

        this._sourcesHub.gitPermissionsSource.queryGitPermissionsAsync(permissionKeys).then(
            (data) => {
                this._actionsHub.permissionsUpdated.invoke({permissionSet: data, repositoryId: repoId});
            },
            (error) => {
                this._actionsHub.permissionsUpdateFailed.invoke(error);
            }
        );
    }

    public setCaseEnforcementSetting(policyConfiguration: PolicyConfiguration, enabled: boolean) {
        if (policyConfiguration) {
            this._updateCaseEnforcementSetting(policyConfiguration, enabled);
        } else {
            this._createCaseEnforcementSetting(enabled);
        }
    }

    public getBlobSizeSetting() {
        this._sourcesHub.policySource.fetchPolicy(VCTypes.BlobSizePolicy.id, this._repoContext, VCTypes.Constants.GlobalScope).then(
        (data) => {
            this._actionsHub.blobSizeLoaded.invoke({
                configs: data,
                targetRepoId: this._repoContext.getRepositoryId(),
                shouldGlobalPolicyApply: VCTypes.BlobSizePolicy.shouldGlobalPolicyApply
            });
        },
        (error) => {
            this._actionsHub.blobSizeLoadFailed.invoke(error);
        });
    }

    public setBlobSizeSetting(policyConfiguration: PolicyConfiguration, enabled: boolean, sizeInMB: number) {
        const sizeInBytes: number = VCTypes.Utils.mbToBytes(sizeInMB);
        if (policyConfiguration) {
            this._updateBlobSizeSetting(policyConfiguration, enabled, sizeInBytes);
        } else {
            this._createBlobSizeSetting(enabled, sizeInBytes, true);
        }
    }

    public getSecretsScanningSetting() {
        this._sourcesHub.policySource.fetchPolicy(
            VCTypes.SecretsScanningPolicy.id,
            this._repoContext,
            VCTypes.Constants.GlobalScope)
            .then(
        (data) => {
            this._actionsHub.secretsScanningLoaded.invoke({
                configs: data,
                targetRepoId: this._repoContext.getRepositoryId(),
                shouldGlobalPolicyApply: VCTypes.SecretsScanningPolicy.shouldGlobalPolicyApply
            });
        },
        (error) => {
            this._actionsHub.secretsScanningLoadFailed.invoke(error);
        });
    }

    public setSecretsScanningSetting(policyConfiguration: PolicyConfiguration, enabled: boolean) {
        if (policyConfiguration) {
            this._updateSecretsScanningSetting(policyConfiguration, enabled);
        } else {
            this._createSecretsScanningSetting(enabled);
        }
    }

    public getPathLengthSetting() {
        this._sourcesHub.policySource.fetchPolicy(
            VCTypes.PathLengthPolicy.id,
            this._repoContext,
            VCTypes.Constants.GlobalScope)
            .then(
        (data) => {
            this._actionsHub.pathLengthLoaded.invoke({
                configs: data,
                targetRepoId: this._repoContext.getRepositoryId(),
                shouldGlobalPolicyApply: VCTypes.PathLengthPolicy.shouldGlobalPolicyApply
            });
        },
        (error) => {
            this._actionsHub.pathLengthLoadFailed.invoke(error);
        });
    }

    public setPathLengthSetting(policyConfiguration: PolicyConfiguration, enabled: boolean, length: number) {
        if (policyConfiguration) {
            this._updatePathLengthSetting(policyConfiguration, enabled, length);
        } else {
            this._createPathLengthSetting(enabled, length);
        }
    }

    public getReservedNamesSetting() {
        this._sourcesHub.policySource.fetchPolicy(
            VCTypes.ReservedNamesPolicy.id,
            this._repoContext,
            VCTypes.Constants.GlobalScope)
            .then(
        (data) => {
            this._actionsHub.reservedNamesLoaded.invoke({
                configs: data,
                targetRepoId: this._repoContext.getRepositoryId(),
                shouldGlobalPolicyApply: VCTypes.ReservedNamesPolicy.shouldGlobalPolicyApply
            });
        },
        (error) => {
            this._actionsHub.reservedNamesLoadFailed.invoke(error);
        });
    }

    public setReservedNamesSetting(policyConfiguration: PolicyConfiguration, enabled: boolean) {
        if (policyConfiguration) {
            this._updateReservedNamesSetting(policyConfiguration, enabled);
        } else {
            this._createReservedNamesSetting(enabled);
        }
    }

    private _updateBlobSizeSetting(config: PolicyConfiguration, enabled: boolean, sizeInBytes: number) {
        // only set the value if the policy is enabled.  Otherwise, leave it at the current value,
        // so a user that toggles the setting off doesn't lose the previous value
        if (enabled) {
            config.settings.MaximumGitBlobSizeInBytes = sizeInBytes;
        }
        config.isEnabled = enabled;

        // if the selected value is negative (ie -1 for 'no restriction', disable the policy)
        if (sizeInBytes < 0) {
            config.isEnabled = false;
        }

        this._sourcesHub.policySource.updatePolicy(
            config,
            this._repoContext)
            .then(
                (data) => {
                    this._actionsHub.blobSizeUpdated.invoke({});
                    this.getBlobSizeSetting();
                },
                (error) => {
                    this._actionsHub.blobSizeUpdateFailed.invoke(error);
                }
        );
    }

    private _createBlobSizeSetting(enabled: boolean, sizeInBytes: number, useUncompressedSize: boolean) {
        const settings = {
            maximumGitBlobSizeInBytes: sizeInBytes,
            useUncompressedSize: useUncompressedSize,
            scope: [{ repositoryId: VCTypes.PolicyHelpers.coalesceRepoId(this._repoContext.getRepositoryId()) }]
        } as VCTypes.BlobSizePolicy.Settings;

        this._sourcesHub.policySource.createPolicy(VCTypes.BlobSizePolicy.id, settings).then(
            (data) => {
                this._actionsHub.blobSizeUpdated.invoke({});
                this.getBlobSizeSetting();
            },
            (error) => {
                this._actionsHub.blobSizeUpdateFailed.invoke(error);
            }
        );
    }

    private _createCaseEnforcementSetting(enabled: boolean) {
        const settings = {
            enforceConsistentCase: enabled,
            scope: [{ repositoryId: VCTypes.PolicyHelpers.coalesceRepoId(this._repoContext.getRepositoryId()) }]
        } as VCTypes.RepoSettingsPolicy.Settings;

        this._sourcesHub.policySource.createPolicy(VCTypes.RepoSettingsPolicy.id, settings).then(
            (data) => {
                this._actionsHub.caseEnforcementUpdated.invoke({});
                this.getCaseEnforcementSetting();
            },
            (error) => {
                this._actionsHub.caseEnforcementUpdateFailed.invoke(error);
            }
        );
    }

    private _updateCaseEnforcementSetting(config: PolicyConfiguration, enabled: boolean) {
        config.settings.enforceConsistentCase = enabled;
        this._sourcesHub.policySource.updatePolicy(
            config,
            this._repoContext)
            .then(
                (data) => {
                    this._actionsHub.caseEnforcementUpdated.invoke({});
                    this.getCaseEnforcementSetting();
                },
                (error) => {
                    this._actionsHub.caseEnforcementUpdateFailed.invoke(error);
                }
        );
    }

    private _createSecretsScanningSetting(enabled: boolean) {
        const settings = {
            scope: [{ repositoryId: VCTypes.PolicyHelpers.coalesceRepoId(this._repoContext.getRepositoryId()) }]
        } as VCTypes.SettingsBase;

        this._sourcesHub.policySource.createPolicy(VCTypes.SecretsScanningPolicy.id, settings).then(
            (data) => {
                this._actionsHub.secretsScanningUpdated.invoke({});
                this.getSecretsScanningSetting();
            },
            (error) => {
                this._actionsHub.secretsScanningUpdateFailed.invoke(error);
            }
        );
    }

    private _updateSecretsScanningSetting(config: PolicyConfiguration, enabled: boolean) {
        config.isEnabled = enabled;
        this._sourcesHub.policySource.updatePolicy(
            config,
            this._repoContext)
            .then(
                (data) => {
                    this._actionsHub.secretsScanningUpdated.invoke({});
                    this.getSecretsScanningSetting();
                },
                (error) => {
                    this._actionsHub.secretsScanningUpdateFailed.invoke(error);
                }
        );
    }

    private _createPathLengthSetting(enabled: boolean, length: number) {
        const settings = {
            scope: [{ repositoryId: VCTypes.PolicyHelpers.coalesceRepoId(this._repoContext.getRepositoryId()) }],
            maxPathLength: length
        } as VCTypes.PathLengthPolicy.Settings;

        this._sourcesHub.policySource.createPolicy(VCTypes.PathLengthPolicy.id, settings).then(
            (data) => {
                this._actionsHub.pathLengthUpdated.invoke({});
                this.getPathLengthSetting();
            },
            (error) => {
                this._actionsHub.pathLengthUpdateFailed.invoke(error);
            }
        );
    }

    private _updatePathLengthSetting(config: PolicyConfiguration, enabled: boolean, length: number) {
        config.isEnabled = enabled;
        config.settings.maxPathLength = length;

        this._sourcesHub.policySource.updatePolicy(
            config,
            this._repoContext)
            .then(
                (data) => {
                    this._actionsHub.pathLengthUpdated.invoke({});
                    this.getPathLengthSetting();
                },
                (error) => {
                    this._actionsHub.pathLengthUpdateFailed.invoke(error);
                }
        );
    }

    private _createReservedNamesSetting(enabled: boolean) {
        const settings = {
            scope: [{ repositoryId: VCTypes.PolicyHelpers.coalesceRepoId(this._repoContext.getRepositoryId()) }]
        } as VCTypes.SettingsBase;

        this._sourcesHub.policySource.createPolicy(VCTypes.ReservedNamesPolicy.id, settings).then(
            (data) => {
                this._actionsHub.reservedNamesUpdated.invoke({});
                this.getReservedNamesSetting();
            },
            (error) => {
                this._actionsHub.reservedNamesUpdateFailed.invoke(error);
            }
        );
    }

    private _updateReservedNamesSetting(config: PolicyConfiguration, enabled: boolean) {
        config.isEnabled = enabled;
        this._sourcesHub.policySource.updatePolicy(
            config,
            this._repoContext)
            .then(
                (data) => {
                    this._actionsHub.reservedNamesUpdated.invoke({});
                    this.getReservedNamesSetting();
                },
                (error) => {
                    this._actionsHub.reservedNamesUpdateFailed.invoke(error);
                }
        );
    }
}
