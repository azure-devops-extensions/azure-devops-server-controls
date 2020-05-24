/// Copyright (c) Microsoft Corporation. All rights reserved.

import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { SettingKeys } from "VersionControl/Scripts/VersionControlSettings";

export interface SettingsBase {
    filenamePatterns?: string[];
    ignoreIfSourceIsInScope?: boolean;
    addedFilesOnly?: boolean;

    scope?: any[];
}

export namespace RepoSettingsPolicy {
    export const id: string = "7ed39669-655c-494e-b4a0-a08b4da0fcce";

    export interface Settings extends SettingsBase {
        enforceConsistentCase: boolean;
    }

    export function shouldGlobalPolicyApply(local: PolicyConfiguration, global: PolicyConfiguration): boolean {
        // for this policy, if we have a non-null local value, it overrides any global values
        if (local && local.settings.enforceConsistentCase != null) {
            return false;
        }

        // if we don't have a global policy, or if the consistent case setting is unset,
        // don't use it
        if (!global || global.settings.enforceConsistentCase == null) {
            return false;
        }

        return global.isEnabled && !global.isDeleted;
    }
}

export namespace BlobSizePolicy {
    export const id: string = "2e26e725-8201-4edd-8bf5-978563c34a80";
    export const DefaultBlobSizeLimitInMB: number = 100;

    export interface Settings extends SettingsBase {
        maximumGitBlobSizeInBytes: number;
        useUncompressedSize: boolean;
    }

    export function shouldGlobalPolicyApply(local: PolicyConfiguration, global: PolicyConfiguration): boolean {
        // if we don't have a global policy, it can't apply
        if (!global || global.isDeleted || !global.isEnabled) {
            return false;
        }

        // if we have an active global policy, but no active local policy, use the global
        if (!local || local.isDeleted || !local.isEnabled) {
            return true;
        }

        // if we have both, and the global one is more restrictive, return true
        return global.settings.maximumGitBlobSizeInBytes < local.settings.maximumGitBlobSizeInBytes;
    }
}

export namespace SecretsScanningPolicy {
    export const id: string = "e67ae10f-cf9a-40bc-8e66-6b3a8216956e";

    export function shouldGlobalPolicyApply(local: PolicyConfiguration, global: PolicyConfiguration): boolean {
        // if we don't have a global policy, it can't apply
        if (!global || global.isDeleted || !global.isEnabled) {
            return false;
        }

        // if we have an active global policy, but no active local policy, use the global
        return !local || local.isDeleted || !local.isEnabled;
    }
}

export namespace PathLengthPolicy {
    export const id: string = "001A79CF-FDA1-4C4E-9E7C-BAC40EE5EAD8";

    export interface Settings extends SettingsBase {
        maxPathLength: number;
    }

    export function shouldGlobalPolicyApply(local: PolicyConfiguration, global: PolicyConfiguration): boolean {
        // if we don't have a global policy, it can't apply
        if (!global || global.isDeleted || !global.isEnabled) {
            return false;
        }

        // if we have an active global policy, but no active local policy, use the global
        if (!local || local.isDeleted || !local.isEnabled) {
            return true;
        }

        return global.settings.maxPathLength < local.settings.maxPathLength;
    }
}

export namespace ReservedNamesPolicy {
    export const id: string = "DB2B9B4C-180D-4529-9701-01541D19F36B";

    export function shouldGlobalPolicyApply(local: PolicyConfiguration, global: PolicyConfiguration): boolean {
        // if we don't have a global policy, it can't apply
        if (!global || global.isDeleted || !global.isEnabled) {
            return false;
        }
        // if we have an active global policy, but no active local policy, use the global
        return !local || local.isDeleted || !local.isEnabled;
    }
}

export namespace Constants {
    export const AllReposId: string = "00000000-0000-0000-0000-000000000000";
    export const GlobalScope: string = "";
    export const GravatarKey: string = "GravatarEnabled";
    export const ForksKey: string = "ForksEnabled";
    export const WitMentionsKey: string = "WitMentionsEnabled";
    export const WitTransitionsKey: string = "WitTransitionsSticky";
    export const WebEditKey: string = SettingKeys.tfvcWebEditEnabled;
}

export namespace Css {
    export const OptionHeader: string = "vc-option-header";
    export const OptionGroup: string = "vc-option-group";
    export const InputContainer: string = "vc-option-inputcontainer";
    export const OptionInherited: string = "vc-option-inherited";
    export const Error: string = "vc-option-error";
    export const Link: string = "vc-option-link";
    export const Subheader: string = "vc-subheader";
    export const Inline: string = "inline";
    export const TextField: string = "textfield";
    export const Baseline: string = "baseline";
    export const AlignFlexStart: string = "align-start";
    export const NoTopMargin: string = "no-margin-top";
    export const Toggle: string = "toggle";
}

export interface RepositoryOption extends VCWebAccessContracts.VersionControlRepositoryOption {
    usesSettingsService?: boolean;
    updateError: Error;
}

export interface RepoOptionUpdateError {
    error: Error;
    optionKey: string;
}

export interface HashTable<T> {
    [key: string]: T;
}

export namespace PolicyHelpers {
    export function coalesceRepoId(repoId: string): string {
        if (repoId === Constants.AllReposId) {
            return "";
        }
        return repoId;
    }

    export function repoIdToPolicyScope(repoId: string): string {
        const localRepoId = coalesceRepoId(repoId).replace(/-/g, "");

        return `${localRepoId}`;
    }

    export function doesPolicyConfigHaveProjectScope(config: PolicyConfiguration): boolean {
        // if we are querying for empty repo id, we get entries for all repos in the project
        // for our purposes, we want only 'global' entries, so filter out any entries that
        // don't match the repo id (ie they have a repo id scope, but we want policy records
        // with *no* repo id scope)
        for (const scope of config.settings.scope) {
            // checks to see if currentScope is non-null,
            // and if the currentScope.repositoryId is non-null and not empty string
            // ie if we have a non-empty scope, return false
            if (scope && scope.repositoryId) {
                return false;
            }
        }

        return true;
    }
}

export namespace Utils {
    export function bytesToMB(bytes: number): number {
        return bytes / 1024 / 1024;
    }

    export function mbToBytes(mb: number): number {
        return mb * 1024 * 1024;
    }
}

export type GlobalPolicyChecker = (local: PolicyConfiguration, global: PolicyConfiguration) => boolean;

export class PolicyLoadPayload {
    public configs: PolicyConfiguration[];
    public targetRepoId: string;
    public shouldGlobalPolicyApply: GlobalPolicyChecker;
}

export class PolicyContainerState {
    public policyConfigs: PolicyConfiguration[];
    public localPolicy: PolicyConfiguration;
    public projectPolicy: PolicyConfiguration;
    public error: Error;
    public policyInherited: boolean;
    public initialized: boolean;
}
