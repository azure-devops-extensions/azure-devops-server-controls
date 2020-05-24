import { ArtifactTypes, BuildVersionConstants } from "ReleaseManagement/Core/Constants";
import { IBuildDefinitionProperties, PipelineArtifactSourceReference } from "PipelineWorkflow/Scripts/Common/Types";
import { BranchInputType, WellKnownRepositoryTypes } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { PipelineBuildVersion, PipelineArtifactDefinitionConstants, PipelineArtifact, PipelineArtifactTypes, PipelineArtifactDefinition } from "PipelineWorkflow/Scripts/Common/Types";

import { STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";

import * as Utils_String from "VSS/Utils/String";

export class ArtifactUtility {
    
    public static getArtifactInputFieldsInUniqueSourceIdentifier (uniqueSourceIdentifierFields: string): string[] {
        if (!uniqueSourceIdentifierFields) {
            return [];
        }

        // example: "{{project}}:{{definition}}{{repository}}"
        // match() function returns array of {{project}} {{definition}} and {{repository}}

        let groupRegExp = new RegExp("{{(.*?)}}", "g");
        let mustacheMatchingRegExp = new RegExp("{|}", "g");
        
        let artifactInputFieldsInUniqueSourceIdentifier = [];
        uniqueSourceIdentifierFields.match(groupRegExp).map((matchedValue) => {
            artifactInputFieldsInUniqueSourceIdentifier.push(matchedValue.replace(mustacheMatchingRegExp, Utils_String.empty));
        });

        return artifactInputFieldsInUniqueSourceIdentifier;
    }

    public static getArtifactBowtieIcon(artifactType: string): string {
        let iconClass;
        switch (artifactType) {
            case ArtifactTypes.BuildArtifactType:
                iconClass = "bowtie-build";
                break;
            case ArtifactTypes.ExternalTfsBuildArtifactType:
                iconClass = "bowtie-external-build";
                break;
            case ArtifactTypes.ExternalTfsXamlBuildArtifactType:
                iconClass = "bowtie-external-xaml";
                break;
            case ArtifactTypes.GitArtifactType:
                iconClass = "bowtie-brand-git";
                break;
            case ArtifactTypes.GitHubArtifactType:
                iconClass = "bowtie-brand-github";
                break;
            case ArtifactTypes.JenkinsArtifactType:
                iconClass = "bowtie-brand-jenkins";
                break;
            case ArtifactTypes.NugetArtifactType:
                iconClass = "bowtie-brand-nuget";
                break;
            case ArtifactTypes.PackageManagementArtifactType:
                iconClass = "bowtie-package";
                break;
            case ArtifactTypes.TfsOnPremArtifactType:
                iconClass = "bowtie-brand-vsts";
                break;
            case ArtifactTypes.TfvcArtifactType:
                iconClass = "bowtie-brand-tfvc";
                break;
            default:
                iconClass = "bowtie-build";
                break;
        }

        return iconClass;
    }

    public static isDefinitionInput(inputId: string): boolean {
        return Utils_String.equals(inputId, PipelineArtifactDefinitionConstants.DefinitionId, true)
                || Utils_String.equals(inputId, PipelineArtifactDefinitionConstants.MultipleDefinitionsId, true);
    }

    public static isMultiDefinitionType(sourceInputs: IDictionaryStringTo<PipelineArtifactSourceReference>): boolean {
        if (sourceInputs && sourceInputs.hasOwnProperty(PipelineArtifactDefinitionConstants.IsMultiDefinitionType)) {
            if (Utils_String.equals(sourceInputs[PipelineArtifactDefinitionConstants.IsMultiDefinitionType].id, "true", true)) {
                return true;
            }
        }

        return false;
    }

    public static getDefinitionIds(currentValues: IDictionaryStringTo<string>): number[] {
        if (currentValues.hasOwnProperty(PipelineArtifactDefinitionConstants.IsMultiDefinitionType)
           && Utils_String.equals(currentValues[PipelineArtifactDefinitionConstants.IsMultiDefinitionType], "true", true) 
           && currentValues.hasOwnProperty(PipelineArtifactDefinitionConstants.MultipleDefinitionsId)) {
            let multipleDefinitionIdStrings: string = currentValues[PipelineArtifactDefinitionConstants.MultipleDefinitionsId];
            if (multipleDefinitionIdStrings) {
                return multipleDefinitionIdStrings.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter).map((definitionIdString: string) => {
                    return parseInt(definitionIdString);
                });
            }
        }

        return [parseInt(currentValues[PipelineArtifactDefinitionConstants.DefinitionId])];
    }

    public static getDefinitionIdOfArtifact(artifact: PipelineArtifactDefinition): string {
        if (ArtifactUtility.isMultiDefinitionType(artifact.definitionReference)
            && artifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.MultipleDefinitionsId)
            && artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId]) {
            let multipleDefinitionIdsString: string = artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].id;
            if (multipleDefinitionIdsString) {
                return multipleDefinitionIdsString.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter).map((definitionIdString: string) => {
                    return definitionIdString;
                })[0];
            }
        }

        return artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].id;
    }

    public static getDefinitionIdsFromArtifact(artifact: PipelineArtifact): number[] {
        if (ArtifactUtility.isMultiDefinitionType(artifact.definitionReference)
            && artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId]) {
            let multipleDefinitionIds = artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].id;
            if (multipleDefinitionIds) {
                return multipleDefinitionIds.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter).map((idString) => {
                    return parseInt(idString);
                });
            }
        }

        return [ parseInt(artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].id) ];
    }

    public static normalizeDefinitionInput(artifact: PipelineArtifact): void {
        if (artifact && artifact.definitionReference && artifact.type === PipelineArtifactTypes.Build) {
            if (artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId]
                && artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name) {
                artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name = 
                    ArtifactUtility.removeFolderPathAndGetBuildDefinitionName(artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name);
            }

            if (artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId]
                && artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name) {
                let multipleDefinitionNames = artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name;
                let multipleDefinitionNamesAfterFoldersRemoved = multipleDefinitionNames.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter).map((name) => {
                    return ArtifactUtility.removeFolderPathAndGetBuildDefinitionName(name);
                }).join(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter);

                artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name = multipleDefinitionNamesAfterFoldersRemoved;
            }
        }
    }

    public static removeFolderPathAndGetBuildDefinitionName(name: string): string {
        let nameArray: string[] = name ? name.split(STRING_BACKSLASH) : null;
        if (nameArray && nameArray.length > 0) {
            return nameArray[nameArray.length - 1];
        }

        return name;
    }

    public static isBranchSupportedForNonTfsGitBasedBuildDefinition(buildDefinitionProperties: IBuildDefinitionProperties): boolean {
        return buildDefinitionProperties && ArtifactUtility.isBranchSupportedForNonTfsGitBasedBuildSource(buildDefinitionProperties.repositoryType);
    }

    public static isBranchSupportedForNonTfsGitBasedBuildSource(buildArtifactSourceType: string): boolean {
        return Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.GitHub) === 0
            || Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.Bitbucket) === 0
            || Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.GitHubEnterprise) === 0
            || Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.Git) === 0;
    }

    public static getBuildBranchInputType(buildArtifactSourceType: string): BranchInputType {
        if (Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.TfsGit) === 0) {
            return BranchInputType.TfGitBranchFilter;
        }
        else if (Utils_String.ignoreCaseComparer(buildArtifactSourceType, WellKnownRepositoryTypes.Git) === 0) {
            return BranchInputType.Text;
        }
        else if (ArtifactUtility.isBranchSupportedForNonTfsGitBasedBuildSource(buildArtifactSourceType)) {
            return BranchInputType.Combo;
        }
        else {
            return BranchInputType.None;
        }
    }

    public static getArtifactVersionDisplayValue(version: PipelineBuildVersion): string {
        let versionDisplayValue: string;

        if (!version) {
            versionDisplayValue = Utils_String.empty;
        }
        else if (version.isMultiDefinitionType && version.definitionName) {
            versionDisplayValue = Utils_String.localeFormat("{0} ({1})", version.name, version.definitionName);
        }
        else if (!version.commitMessage) {
            versionDisplayValue = version.name;
        } else {
            versionDisplayValue = Utils_String.localeFormat("{0} ({1})", version.name, version.commitMessage);
        }

        return versionDisplayValue;
    }
    
    public static getArtifactInputDisplayValue(inputOption: IKeyValuePairWithData): string {
        let versionDisplayValue: string;
        if (!inputOption) {
            versionDisplayValue = Utils_String.empty;
        }
        else if (inputOption.Data == null || !inputOption.Data.hasOwnProperty(BuildVersionConstants.CommitMessageKey) || !inputOption.Data[BuildVersionConstants.CommitMessageKey]) {
            versionDisplayValue = inputOption.Value;
        } else {
            versionDisplayValue = Utils_String.format("{0} ({1})", inputOption.Value, inputOption.Data[BuildVersionConstants.CommitMessageKey]);
        }

        return versionDisplayValue;
    }
}