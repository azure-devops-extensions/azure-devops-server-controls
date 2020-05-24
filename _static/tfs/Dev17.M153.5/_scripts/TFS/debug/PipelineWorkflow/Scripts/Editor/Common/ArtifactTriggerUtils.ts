import {
    IBuildDefinitionProperties,
    PipelineArtifactFilter,
    PipelineTagFilter,
    PipelineArtifactTypes,
    PipelineTriggerBase,
    PipelineArtifactSourceTrigger,
    PipelineSourceRepoTrigger,
    PipelineTriggerType,
    PipelineContainerImageTrigger,
    PipelineReleaseTriggerType,
    PipelineArtifactTriggerConfiguration
} from "PipelineWorkflow/Scripts/Common/Types";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IArtifactTriggerCondition } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";

import { ArtifactTypes } from "ReleaseManagement/Core/Constants";

import { WellKnownRepositoryTypes } from "PipelineWorkflow/Scripts/Editor/Common/Constants";

import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { ContainerImageTrigger, TagFilter } from "ReleaseManagement/Core/Contracts";

export class ArtifactTriggerUtils {

    public static ExcludeOperator: string = "-";

    public static isExcludeTrigger(branch: string): boolean {
        if (branch) {
            return Utils_String.startsWith(branch, this.ExcludeOperator);
        }
        return false;
    }

    public static getDefaultTriggerCondition() {
        return {
            sourceBranch: null,
            tags: [],
            useBuildDefinitionBranch: false,
            createReleaseOnBuildTagging: false,
            tagFilter: null
        };
    }

    public static trimSourceBranch(sourceBranch: string): string {
        let displayValue = sourceBranch;
        if (sourceBranch && this.isExcludeTrigger(sourceBranch)) {
            displayValue = sourceBranch.substr(this.ExcludeOperator.length);
        }
        return displayValue;
    }

    /*Utils method to compare trigger conditions*/
    public static compareTriggerConditions(originalConditions: IArtifactTriggerCondition[], modifiedConditions: IArtifactTriggerCondition[]): boolean {
        //As array utils matches arrayContains, passing sorted as true to maintain index based equality check
        return Utils_Array.arrayEquals(originalConditions, modifiedConditions, ArtifactTriggerUtils._areTriggerConditionEqual, false, true);
    }

    public static isReleaseTriggerSupportedInArtifact(artifactType: string, artifactTriggerConfiguration?: PipelineArtifactTriggerConfiguration): boolean {

        let isTriggerType: boolean = false;

        // If artifact supports trigger from contribution decide on basis of artifactTriggerConfiguration 
        // else decide on basis of artifactType
        if (this.supportsTriggerFromContribution(artifactType)) {
            if (!!artifactTriggerConfiguration) {
                if (RMUtilsCore.FeatureFlagUtils.isHostedSetup()) {
                    isTriggerType = artifactTriggerConfiguration.isTriggerSupported;
                }
                else {
                    isTriggerType = artifactTriggerConfiguration.isTriggerSupported
                        && !artifactTriggerConfiguration.isTriggerSupportedOnlyInHosted;
                }
            }
        }
        else {
            isTriggerType = artifactType === PipelineArtifactTypes.Build || artifactType === PipelineArtifactTypes.GitId || artifactType === PipelineArtifactTypes.PackageManagement;

            if (RMUtilsCore.FeatureFlagUtils.isHostedSetup()) {
                isTriggerType = isTriggerType || artifactType === PipelineArtifactTypes.GitHubId || artifactType === PipelineArtifactTypes.AzureContainerRepositoryId || artifactType === PipelineArtifactTypes.DockerHubId;
            }
        }

        return isTriggerType;
    }

    public static supportsTriggerFromContribution(artifactType: string): boolean {
        if (artifactType === PipelineArtifactTypes.Build
            || artifactType === PipelineArtifactTypes.GitId
            || artifactType === PipelineArtifactTypes.GitHubId
            || artifactType === PipelineArtifactTypes.PackageManagement
            || artifactType === PipelineArtifactTypes.AzureContainerRepositoryId
            || artifactType === PipelineArtifactTypes.DockerHubId) {
            return false;
        }
        else {
            return true;
        }
    }

    public static supportsTriggerWithConditions(artifactType: string): boolean {
        if (ArtifactTriggerUtils.isReleaseTriggerSupportedInArtifact(artifactType)) {
            return artifactType !== PipelineArtifactTypes.PackageManagement
                    && !(ArtifactTriggerUtils.isContainerImageArtifact(artifactType) && !FeatureFlagUtils.isRegexTagFilterInDockerAndAcrArtifactsEnabled());
        }

        return false;
    }

    public static getReleaseTriggerTypeOfArtifact(artifactType: string): PipelineReleaseTriggerType {
        let triggerType: PipelineReleaseTriggerType;
        switch (artifactType) {
            case "Build":
                triggerType = PipelineTriggerType.ArtifactSource;
                break;
            case "ContainerImage":
                triggerType = PipelineTriggerType.ContainerImage;
                break;
            default:
                triggerType = PipelineTriggerType.Undefined;
                break;
        }

        return triggerType;
    }

    public static getTriggerFromFilter(alias: string, artifactType: string, artifactFilter: IArtifactTriggerCondition, releaseTriggerType: PipelineReleaseTriggerType): PipelineTriggerBase {
        let trigger: PipelineTriggerBase;
        switch (artifactType) {
            case ArtifactTypes.BuildArtifactType:
                trigger = {
                    triggerType: PipelineTriggerType.ArtifactSource,
                    triggerConditions: this._getTriggerConditions(artifactFilter),
                    artifactAlias: alias
                } as PipelineArtifactSourceTrigger;
                break;

            case PipelineArtifactTypes.GitId:
            case PipelineArtifactTypes.GitHubId:
                trigger = {
                    triggerType: PipelineTriggerType.SourceRepo,
                    branchFilters: (artifactFilter.sourceBranch) ? [artifactFilter.sourceBranch] : [],
                    alias: alias
                } as PipelineSourceRepoTrigger;
                break;

            case PipelineArtifactTypes.DockerHubId:
            case PipelineArtifactTypes.AzureContainerRepositoryId:
                trigger = {
                    triggerType: PipelineTriggerType.ContainerImage,
                    tagFilters: (artifactFilter.tagFilter) ? [artifactFilter.tagFilter] : [],
                    alias: alias
                } as PipelineContainerImageTrigger;
                break;

            default:
                break;
        }

        if (!trigger && releaseTriggerType !== PipelineTriggerType.Undefined) {
            trigger = this.getTriggerForArtifactSupportingTriggerFromContribution(alias, artifactFilter, releaseTriggerType);
        }

        return trigger;
    }

    public static getTriggerForArtifactSupportingTriggerFromContribution(alias: string, artifactFilter: IArtifactTriggerCondition, releaseTriggerType: PipelineReleaseTriggerType): PipelineTriggerBase {
        let trigger: PipelineTriggerBase;
        switch (releaseTriggerType) {
            case PipelineTriggerType.ArtifactSource:
                trigger = {
                    triggerType: releaseTriggerType,
                    triggerConditions: this._getTriggerConditions(artifactFilter),
                    artifactAlias: alias
                } as PipelineArtifactSourceTrigger;
                break;

            case PipelineTriggerType.SourceRepo:
                trigger = {
                    triggerType: releaseTriggerType,
                    branchFilters: (artifactFilter.sourceBranch) ? [artifactFilter.sourceBranch] : [],
                    alias: alias
                } as PipelineSourceRepoTrigger;
                break;

            case PipelineTriggerType.ContainerImage:
                trigger = {
                    triggerType: releaseTriggerType,
                    tagFilters: (artifactFilter.tagFilter) ? [artifactFilter.tagFilter] : [],
                    alias: alias
                } as PipelineContainerImageTrigger;
                break;

            default:
                break;
        }

        return trigger;
    }

    /*Finding out all the trigger filters in the trigger. Should trim all filters with source branch and empty tags*/
    public static getTriggerConditions(trigger: PipelineTriggerBase): IArtifactTriggerCondition[] {
        if (!trigger) {
            return [];
        }

        let triggerConditionsData: IArtifactTriggerCondition[] = [];

        switch (trigger.triggerType) {
            case PipelineTriggerType.ArtifactSource:
                let artifactSourceTriggerFilters = this._getArtifactSourceTriggerCondition(trigger);
                if (artifactSourceTriggerFilters.length > 0) {
                    artifactSourceTriggerFilters.forEach((triggerCondition: IArtifactTriggerCondition) => {
                        triggerConditionsData.push(triggerCondition);
                    });
                }
                break;

            case PipelineTriggerType.SourceRepo:
                let sourceRepoTriggerFilters = this._getSourceRepoTriggerCondition(trigger);
                if (sourceRepoTriggerFilters.length > 0) {
                    sourceRepoTriggerFilters.forEach((triggerCondition: IArtifactTriggerCondition) => {
                        triggerConditionsData.push(triggerCondition);
                    });
                }
                break;

            case PipelineTriggerType.ContainerImage:
                let containerImageTriggerFilters = this._getContainerImageTriggerCondition(trigger);
                if (containerImageTriggerFilters.length > 0) {
                    containerImageTriggerFilters.forEach((triggerCondition: IArtifactTriggerCondition) => {
                        triggerConditionsData.push(triggerCondition);
                    });
                }
                break;
        }

        return triggerConditionsData;
    }

    /*Input triggers are of same type and only differs in trigger conditions*/
    public static getTriggerWithConsolidatedConditions(triggers: PipelineTriggerBase[]): PipelineTriggerBase {
        if (!triggers || triggers.length === 0) {
            return undefined;
        }

        if (triggers.length === 1) {
            return triggers[0];
        }

        let isInvalid = false;
        let trigger: PipelineTriggerBase = triggers[0];

        switch (trigger.triggerType) {
            case PipelineTriggerType.ArtifactSource:
                let artifactSourceTrigger = trigger as PipelineArtifactSourceTrigger;
                let triggerConditions: PipelineArtifactFilter[] = [];
                // Consolidate trigger conditions
                triggers.forEach((t: PipelineTriggerBase) => {
                    if (t.triggerType !== PipelineTriggerType.ArtifactSource) {
                        isInvalid = true;
                        return;
                    }
                    else {
                        Utils_Array.addRange(triggerConditions, (t as PipelineArtifactSourceTrigger).triggerConditions);
                    }
                });
                artifactSourceTrigger.triggerConditions = triggerConditions;
                break;

            case PipelineTriggerType.SourceRepo:
                let sourceRepoTrigger = trigger as PipelineSourceRepoTrigger;
                let branchFilters: string[] = [];
                // Consolidate branch filters
                triggers.forEach((t: PipelineTriggerBase) => {
                    if (t.triggerType !== PipelineTriggerType.SourceRepo) {
                        isInvalid = true;
                        return;
                    }
                    else {
                        Utils_Array.addRange(branchFilters, (t as PipelineSourceRepoTrigger).branchFilters);
                    }
                });
                sourceRepoTrigger.branchFilters = branchFilters;
                break;

            case PipelineTriggerType.ContainerImage:
                let containerImageTrigger = trigger as ContainerImageTrigger;
                let tagFilters: TagFilter[] = [];
                //Consolidate trigger filters
                triggers.forEach((t: PipelineTriggerBase) => {
                    if (t.triggerType !== PipelineTriggerType.ContainerImage) {
                        isInvalid = true;
                        return;
                    }
                    else {
                        Utils_Array.addRange(tagFilters, (t as ContainerImageTrigger).tagFilters);
                    }
                });
                containerImageTrigger.tagFilters = tagFilters;
                break;

            default:
                isInvalid = true;
                break;
        }

        if (isInvalid) {
            return undefined;
        }

        return trigger;
    }

    public static isCreateReleaseOnBuildTagging(trigger: PipelineTriggerBase): boolean {
        if (!trigger || trigger.triggerType !== PipelineTriggerType.ArtifactSource) {
            return false;
        }

        let createReleaseOnBuildTagging = false;
        let artifactSourceTrigger = trigger as PipelineArtifactSourceTrigger;

        if (!!artifactSourceTrigger && !!artifactSourceTrigger.triggerConditions && artifactSourceTrigger.triggerConditions.length > 0) {
            createReleaseOnBuildTagging = artifactSourceTrigger.triggerConditions[0].createReleaseOnBuildTagging;
        }

        return createReleaseOnBuildTagging;
    }

    public static isBuildSourceTfsGit(buildDefinitionProperties: IBuildDefinitionProperties): boolean {
        return buildDefinitionProperties && Utils_String.ignoreCaseComparer(buildDefinitionProperties.repositoryType, WellKnownRepositoryTypes.TfsGit) === 0;
    }

    public static isPullRequestTriggerSupported(artifactType: string): boolean {
        let result: boolean = false;
        result = artifactType === PipelineArtifactTypes.Build || artifactType === PipelineArtifactTypes.GitId;
        return result;
    }

    public static isPullRequestTriggerSupportedForBuildArtifact(repositoryType: string): boolean {
        // For build artifact we support TfsGit and GitHub
        return repositoryType === WellKnownRepositoryTypes.TfsGit || repositoryType === WellKnownRepositoryTypes.GitHub;
    }

    public static isTagFilterBasedTriggerCondition(artifactType: string): boolean {
        return ArtifactTriggerUtils.isContainerImageArtifact(artifactType);
    }

    private static isContainerImageArtifact(artifactType: string): boolean {
        return Utils_String.equals(artifactType, ArtifactTypes.DockerHubArtifactType, true)
            || Utils_String.equals(artifactType, ArtifactTypes.AzureContainerRepositoryArtifactType, true);
    }

    private static _getTriggerConditions(artifactFilter: PipelineArtifactFilter): PipelineArtifactFilter[] {
        if (artifactFilter.sourceBranch || (artifactFilter.tags && artifactFilter.tags.length > 0) || artifactFilter.useBuildDefinitionBranch) {
            return [artifactFilter];
        } else {
            return null;
        }
    }

    /*trim empty trigger conditions here*/
    private static _getArtifactSourceTriggerCondition(trigger: PipelineTriggerBase): PipelineArtifactFilter[] {
        let artifactSourceTrigger = trigger as PipelineArtifactSourceTrigger;
        let triggerConditions: PipelineArtifactFilter[] = [];

        if (artifactSourceTrigger && artifactSourceTrigger.triggerConditions && artifactSourceTrigger.triggerConditions.length > 0) {
            artifactSourceTrigger.triggerConditions.forEach((triggerCondition: PipelineArtifactFilter) => {
                if ((triggerCondition.sourceBranch && triggerCondition.sourceBranch.length > 0) ||
                    (triggerCondition.tags && triggerCondition.tags.length > 0) ||
                    triggerCondition.useBuildDefinitionBranch) {
                    triggerConditions.push(triggerCondition);
                }
            });
        }

        return triggerConditions;
    }

    /*trim empty trigger conditions here*/
    private static _getSourceRepoTriggerCondition(trigger: PipelineTriggerBase): PipelineArtifactFilter[] {
        let sourceRepoTrigger = trigger as PipelineSourceRepoTrigger;
        let triggerConditions: PipelineArtifactFilter[] = [];

        if (sourceRepoTrigger && sourceRepoTrigger.branchFilters && sourceRepoTrigger.branchFilters.length > 0) {
            sourceRepoTrigger.branchFilters.forEach((branchFilter: string) => {
                if (branchFilter) {
                    triggerConditions.push({
                        sourceBranch: branchFilter,
                        tags: [],
                        useBuildDefinitionBranch: false,
                        createReleaseOnBuildTagging: false
                    });
                }
            });
        }

        return triggerConditions;
    }

    private static _getContainerImageTriggerCondition(trigger: PipelineTriggerBase): IArtifactTriggerCondition[] {
        let containerImageTrigger = trigger as PipelineContainerImageTrigger;
        let triggerConditions: IArtifactTriggerCondition[] = [];

        if (containerImageTrigger && containerImageTrigger.tagFilters && containerImageTrigger.tagFilters.length > 0) {
            containerImageTrigger.tagFilters.forEach((tagFilter: TagFilter) => {
                if (tagFilter) {
                    triggerConditions.push({
                        tagFilter: tagFilter,
                        sourceBranch: Utils_String.empty,
                        tags: [],
                        useBuildDefinitionBranch: false,
                        createReleaseOnBuildTagging: false
                    });
                }
            });
        }

        return triggerConditions;
    }

    /*Utils method to compare trigger condition*/
    private static _areTriggerConditionEqual(sourceCondition: IArtifactTriggerCondition, modifiedCondition: IArtifactTriggerCondition): boolean {
        if (!sourceCondition && !modifiedCondition) {
            return true;
        }

        if ((Utils_String.defaultComparer(sourceCondition.sourceBranch, modifiedCondition.sourceBranch) === 0)
            && ArtifactTriggerUtils._compareTagsEqual(sourceCondition.tags, modifiedCondition.tags)
            && sourceCondition.useBuildDefinitionBranch === modifiedCondition.useBuildDefinitionBranch
            && ArtifactTriggerUtils._compareTagFilterEqual(sourceCondition.tagFilter, modifiedCondition.tagFilter)) {
            return true;
        }

        return false;
    }

    /*Utils method to compare trigger TagFilter*/
    private static _compareTagFilterEqual(sourceTagFilter: TagFilter, modifiedTagFilter: TagFilter): boolean {
        if (!sourceTagFilter && !modifiedTagFilter) {
            return true;
        }
        else if (!sourceTagFilter || !modifiedTagFilter) {
            return false;
        }

        return Utils_String.defaultComparer(sourceTagFilter.pattern, modifiedTagFilter.pattern) === 0 ? true : false;
    }

    /*Utils method to compare trigger Tags*/
    private static _compareTagsEqual(sourceTags: string[], modifiedTags: string[]): boolean {
        if (!sourceTags && !modifiedTags) {
            return true;
        }

        return Utils_Array.arrayEquals(sourceTags, modifiedTags, ArtifactTriggerUtils._areTagsEqual);

    }

    private static _areTagsEqual(sourceTag: string, modifiedTag: string): boolean {
        return Utils_String.defaultComparer(sourceTag, modifiedTag) === 0 ? true : false;
    }
}