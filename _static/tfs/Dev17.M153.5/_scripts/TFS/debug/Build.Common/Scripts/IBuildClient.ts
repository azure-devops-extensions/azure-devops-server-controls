import { GetBuildsResult, IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import * as BuildContracts from "TFS/Build/Contracts";
import TMContracts = require("TFS/TestManagement/Contracts");
import * as VCContracts from "TFS/VersionControl/Contracts";

export interface IBuildClient {
    /**
     * Adds a tag to a build
     * @param buildId The build id
     * @param tag The tag
     */
    addBuildTag(buildId: number, tag: string): IPromise<string[]>;

    /**
     * Cancels a build
     * @param buildId buildId
     */
    cancelBuild(buildId: number): IPromise<BuildContracts.Build>;

    /**
     * Deletes a build in vNext
     * @param buildId The build id
     */
    deleteBuild(buildId: number): IPromise<any>;

    /**
     * Removes a tag from a build
     * @param buildId The build id
     * @param tag The tag
     */
    deleteBuildTag(buildId: number, tag: string): IPromise<string[]>;

    /**
     * Gets the build with the specified id
     * @param buildId The build id
     */
    getBuild(buildId: number): IPromise<BuildContracts.Build>;

    /**
     * Gets an artifact
     * @param buildId The build id
     * @param artifactName The artifact name
     */
    getBuildArtifact(buildId: number, artifactName: string): IPromise<BuildContracts.BuildArtifact>;

    /**
     * Gets build artifacts
     * @param buildId The build id
     */
    getBuildArtifacts(buildId: number): IPromise<BuildContracts.BuildArtifact[]>;

    /**
     * Gets builds
     * @param filter filter
     */
    getBuilds(filter?: IBuildFilter): IPromise<GetBuildsResult>;

    /**
     * Gets build changes
     * @param buildId The build id
     * @param top The number of changes to return
     * @param includeSourceChange Gets at least the source change
     */
    getBuildChanges(buildId: number, top?: number, includeSourceChange?: boolean): IPromise<BuildContracts.Change[]>;

    /**
     * Gets the build report with the specified id
     * @param buildId The build id
     */
    getBuildReport(buildId: number): IPromise<BuildContracts.BuildReportMetadata>;

    /**
     * Gets build workitems
     * @param buildId The build id
     * @param commitIds Array of commitIds
     */
    getBuildWorkItems(buildId: number, commitIds: string[]): IPromise<VCContracts.AssociatedWorkItem[]>;

    /**
     * Gets a definition, optionally at a specific revision
     * @param definitionId The definition id
     * @param revision The revision number
     * @param minMetricsTime Minimum metrics time
     */
    getDefinition(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<BuildContracts.BuildDefinition> | IPromise<BuildContracts.DefinitionReference>;

    /**
     * Gets suggested tags for the current project
     */
    getSuggestedTags(): IPromise<string[]>;

    /**
     * Gets a timeline
     * @param buildId The build id
     * @param timelineId The timeline id
     * @param changeId The earliest change to retrieve
     */
    getTimeline(buildId: number, timelineId: string, changeId: number, planId: string): IPromise<BuildContracts.Timeline>;

    /**
     * Updates the retain flag of a build
     * @param buildId The build id
     * @param keepForever The flag
     */
    updateBuildRetainFlag(buildId: number, keepForever: boolean): IPromise<BuildContracts.Build>;

    /**
     * Gets attachments for a build.
     * @param buildId The build id
     * @param type The type of attachment
     */
    getAttachments(buildId: number, type: string): IPromise<BuildContracts.Attachment[]>;

    // XAML stuff
    getInformationNodes(buildId: number, types?: string[], skip?: number, top?: number): IPromise<BuildContracts.InformationNode[]>;
    getBuildDeployments(buildId: number): IPromise<BuildContracts.Deployment[]>;
    updateXamlBuildQuality(buildId: number, quality: string): IPromise<any>;
    updateXamlQualities(toAdd: string[], toRemove: string[]): IPromise<any[]>;
}