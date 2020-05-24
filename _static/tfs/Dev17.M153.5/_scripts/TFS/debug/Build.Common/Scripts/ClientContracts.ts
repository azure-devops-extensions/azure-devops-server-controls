import BuildContracts = require("TFS/Build/Contracts");

export interface IBuildFilterBase {
    /**
     * Maximum number of builds to retrieve
     */
    $top?: number;

    /**
     * Minimum finish time
     */
    minFinishTime?: Date;

    /**
     * Maximum finish time
     */
    maxFinishTime?: Date;

    /**
     * Continuation token for retrieving builds in batches
     */
    continuationToken?: string;

    /**
     * Order in which to return builds
     */
    queryOrder?: BuildContracts.BuildQueryOrder;

    /**
     * Comma-delimited list of definition ids
     */
    definitions?: string;
}

/**
 * Filter for querying builds
 */
export interface IBuildFilter extends IBuildFilterBase {
    /**
     * Build status
     */
    statusFilter?: BuildContracts.BuildStatus;

    /**
     * BuildResultFilter
     */
    resultFilter?: BuildContracts.BuildResult;

    /**
     * Comma-delimited list of queue ids
     */
    queues?: string;

    /**
     * Identity the request is for
     */
    requestedFor?: string;

    /**
     * Tags
     */
    tagFilters?: string;

    /**
     * The type of builds to retrieve
     */
    type?: BuildContracts.DefinitionType;

    /**
     * The project name or id
     */
    project?: string;

    /**
     * The maximum number of builds to retrieve for any definition
     */
    maxBuildsPerDefinition?: number;

    /**
     * The deletion status of builds to retrieve
     */
    deletedFilter?: BuildContracts.QueryDeletedOption;

    /**
     * Comma-delimited list of build ids
     */
    buildIds?: string;

    /**
     * The name of the branch to query for
     */
    branchName?: string;

    /**
     * The repository ID to look in
     */
    repositoryId?: string;

    /**
     * The type of the repository
     */
    repositoryType?: string;

    /**
     * The build number
     */
    buildNumber?: string;
}

/**
 * Filter for querying definitions
 */
export interface GetDefinitionsOptions {
    /**
     * Maximum number of builds to retrieve
     */
    $top?: number;

    /**
     * Order in which to return builds
     */
    queryOrder?: BuildContracts.DefinitionQueryOrder;

    /**
     * Continuation token for retrieving builds in batches
     */
    continuationToken?: string;

    /**
     * The type of builds to retrieve
     */
    type?: BuildContracts.DefinitionType;

    /**
     * The project name or id
     */
    project?: string;

    /**
     * Comma-delimited list of definition ids
     */
    definitionIds?: string;

    /**
     * Name of the definition
     */
    name?: string;

    /**
     * Min datetime stamp to get metrics
     */
    minMetricsTime?: string;

    /**
     * path of the definition
     */
    path?: string;

    /**
     * get definitions that have builds that are built after this date
     */
    builtAfter?: string;

    /**
     * get definitions that have builds that are not built after this date
     */
    notBuiltAfter?: string;

    /**
     * get definitions that have tasks with this task id
     */
    taskIdFilter?: string;

    /**
     * include all properties of build definition instead of reducing to build definition reference
     */
    includeAllProperties?: boolean;

    /**
     * include the most recent build
     */
    includeLatestBuilds?: boolean;

    /**
     * Get definitions that have a process type that matches this number
     */
    processType?: number;

    /**
     * Get definitions that reference this repository
     */
    repositoryId?: string;

    /**
     * Get definitions that reference this repository type
     */
    repositoryType?: string;

    /**
     * Name of the file that is used in YAML definitions
     */
    yamlFilename?: string;
}

export interface StoredFolder {
    id: number;
    folder: BuildContracts.Folder;
}

export interface StoredDefinition extends BuildContracts.BuildDefinition {
    folderId?: number;
}
export interface GetBuildsResult {
    builds: BuildContracts.Build[];
    continuationToken?: string;
}

export interface GetDefinitionsResult {
    definitions: BuildContracts.BuildDefinitionReference[];
    continuationToken?: string;
}

export interface InformationNodesUpdatedEvent extends BuildContracts.RealtimeBuildEvent {
    nodes: BuildContracts.InformationNode[];
}

export enum ConnectedServiceKind {
    Custom = 0,
    AzureSubscription = 1,
    Chef = 2,
    Generic = 3,
    GitHub = 4
}

export interface ConnectedServiceMetadata {
    name: string;
    teamProject: string;
    kind: ConnectedServiceKind;
    friendlyName: string;
    description: string;
}

export interface ConnectedServiceWebApiData {
    id: string;
    teamProject: string;
    kind: ConnectedServiceKind;
    friendlyName: string;
    description: string;
}

export interface ConnectedServiceDetailsWebApiData {
    endpoint: string;
    credentialsXml: string;
}