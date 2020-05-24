import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_String from "VSS/Utils/String";

import {
    PipelineArtifactTypes,
    PipelineArtifactTriggerConfiguration
} from "PipelineWorkflow/Scripts/Common/Types";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

export namespace ArtifactTriggerTextKeys {
    export const BranchHeader: string = "BranchHeader";
    export const TriggerFilters: string = "TriggerFilters";
    export const TriggerDescription: string = "TriggerDescription";
    export const TriggerDisabledMessage: string = "TriggerDisabledMessage";
    export const TriggerFilterHelpText: string = "TriggerFilterHelpText";
    export const ToggleHelpText: string = "ToggleHelpText";
}

export class ArtifactTriggerStrings {

    public static getTriggerDescription(type: string): string {
        return this.getText(type, ArtifactTriggerTextKeys.TriggerDescription);
    }

    public static getToggleHelpText(type: string): string {
        return this.getText(type, ArtifactTriggerTextKeys.ToggleHelpText);
    }

    public static getTriggerFilterHelpText(type: string): string {
        return this.getText(type, ArtifactTriggerTextKeys.TriggerFilterHelpText);
    }

    public static getTriggerFilters(type: string): string {
        return this.getText(type, ArtifactTriggerTextKeys.TriggerFilters);
    }

    public static getBranchHeader(type: string): string {
        return this.getText(type, ArtifactTriggerTextKeys.BranchHeader);
    }

    public static getTriggerDisabledMessage(type: string, artifactTriggerConfiguration?: PipelineArtifactTriggerConfiguration): string {
        return this.getText(type, ArtifactTriggerTextKeys.TriggerDisabledMessage, artifactTriggerConfiguration);
    }

    private static getText(type: string, key: string, artifactTriggerConfiguration?: PipelineArtifactTriggerConfiguration): string {
        switch (type) {
            case PipelineArtifactTypes.Build:
                if (this._buildResources.hasOwnProperty(key))
                {
                    return this._buildResources[key];
                }

            case PipelineArtifactTypes.GitId:
                if (this._gitResources.hasOwnProperty(key))
                {
                    return this._gitResources[key];
                }

            case PipelineArtifactTypes.GitHubId:
                if (this._gitResources.hasOwnProperty(key))
                {
                    return this._gitHubResources[key];
                }

            case PipelineArtifactTypes.DockerHubId:
                if (this._dockerResources.hasOwnProperty(key)) {
                    return this._dockerResources[key];
                }

            case PipelineArtifactTypes.PackageManagement:
                if (this._packageManagementResources.hasOwnProperty(key)) {
                    return this._packageManagementResources[key];
                }

            case PipelineArtifactTypes.AzureContainerRepositoryId:
                if (this._azureContainerRepositoryResources.hasOwnProperty(key)) {
                    return this._azureContainerRepositoryResources[key];
                }

            default:
                let text: string;
                if (!!artifactTriggerConfiguration) {
                    if (!!artifactTriggerConfiguration.resources && !!artifactTriggerConfiguration.resources[key]) {
                        text = artifactTriggerConfiguration.resources[key];
                    }
                    else {
                        text = this._customArtifactDefaultResources[key];
                    }
                }

                return (!!text) ? text : Utils_String.empty;
        }
    }

    private static _buildResources: IDictionaryStringTo<string> = {
        "BranchHeader" : Resources.Branch,
        "TriggerFilters" : Resources.BranchFiltersBuild,
        "TriggerDescription" : Resources.ArtifactTriggerDescriptionForBuild,
        "TriggerDisabledMessage" : Resources.ArtifactTriggerDisabledMessageForBuild,
        "TriggerFilterHelpText" : Resources.ArtifactTriggerBranchFiltersHelpTextForBuild,
        "ToggleHelpText" : Resources.ArtifactTriggerToggleHelpTextForBuild,
    };

    private static _gitResources: IDictionaryStringTo<string> = {
        "BranchHeader" : Resources.BranchText,
        "TriggerFilters" : Resources.BranchFiltersGit,
        "TriggerDescription" : Resources.ArtifactTriggerDescriptionForGit,
        "TriggerDisabledMessage" : Resources.ArtifactTriggerDisabledMessageForGit,
        "TriggerFilterHelpText" : Resources.ArtifactTriggerBranchFiltersHelpTextForGit,
        "ToggleHelpText" : Resources.ArtifactTriggerToggleHelpTextForGit
    };

    private static _gitHubResources: IDictionaryStringTo<string> = {
        "BranchHeader" : Resources.BranchText,
        "TriggerFilters" : Resources.BranchFiltersGitHub,
        "TriggerDescription" : Resources.ArtifactTriggerDescriptionForGitHub,
        "TriggerDisabledMessage" : Resources.ArtifactTriggerDisabledMessageForGitHub,
        "TriggerFilterHelpText" : Resources.ArtifactTriggerBranchFiltersHelpTextForGitHub,
        "ToggleHelpText" : Resources.ArtifactTriggerToggleHelpTextForGitHub
    };

    private static _dockerResources: IDictionaryStringTo<string> = {
        "TriggerDescription": Resources.ArtifactTriggerDescriptionForDockerHub,
        "TriggerFilters" : Resources.TagFilterForDockerHub,
        "TriggerFilterHelpText" : Resources.TagFilterHelpTextForDockerHub,
        "TriggerDisabledMessage": Resources.ArtifactTriggerDisabledMessageForDockerHub,
        "ToggleHelpText": Resources.ArtifactTriggerToggleHelpTextForDockerHub
    };

    private static _azureContainerRepositoryResources: IDictionaryStringTo<string> = {
        "TriggerDescription": Resources.ArtifactTriggerDescriptionForAzureContainerRepository,
        "TriggerFilters" : Resources.TagFilterForAzureContainerRegistry,
        "TriggerFilterHelpText" : Resources.TagFilterHelpTextForAzureContainerRegistry,
        "TriggerDisabledMessage": Resources.ArtifactTriggerDisabledMessageForAzureContainerRepository,
        "ToggleHelpText": Resources.ArtifactTriggerToggleHelpTextForAzureContainerRepository
    };

    private static _packageManagementResources: IDictionaryStringTo<string> = {
        "TriggerDescription": Resources.ArtifactTriggerDescriptionForPackageManagement,
        "TriggerDisabledMessage": Resources.ArtifactTriggerDisabledMessageForPackageManagement,
        "ToggleHelpText": Resources.ArtifactTriggerToggleHelpTextForPackageManagement
    };

    private static _customArtifactDefaultResources: IDictionaryStringTo<string> = {
        "TriggerDisabledMessage" : Resources.ArtifactTriggerDisabledMessageForBuild
    };
}