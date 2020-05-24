/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://vsowiki.com/index.php?title=Rest_Client_Generation
 */

"use strict";

import TFS_Core_Contracts = require("TFS/Core/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

/**
 * Data representation of a build
 */
export interface Build {
    /**
     * Build number/name of the build
     */
    buildNumber: string;
    compilationStatus: BuildPhaseStatus;
    containerId: number;
    controller: ShallowReference;
    /**
     * The definition associated with the build
     */
    definition: ShallowReference;
    /**
     * Drop location of the build
     */
    drop: DropLocationReference;
    /**
     * Relative server location for the build drop
     */
    dropLocation: string;
    dropUrl: string;
    /**
     * Time that the build was completed
     */
    finishTime: Date;
    /**
     * Indicates whether the build has diagnostics
     */
    hasDiagnostics: boolean;
    /**
     * Id of the build
     */
    id: number;
    informationNodesLocation: string;
    isDeleted: boolean;
    keepForever: boolean;
    labelName: string;
    /**
     * Process or person that last changed the build
     */
    lastChangedBy: VSS_Common_Contracts.IdentityRef;
    lastChangedDate: Date;
    /**
     * Log location of the build
     */
    log: LogLocationReference;
    logLocation: string;
    processParameters: string;
    project: string;
    /**
     * Quality of the build (good, bad, etc.)
     */
    quality: string;
    /**
     * The controller of the build
     */
    queue: QueueReference;
    /**
     * Reason that the build was created
     */
    reason: BuildReason;
    /**
     * Requests for this build
     */
    requests: RequestReference[];
    /**
     * If the build should be kept forever
     */
    retainIndefinitely: boolean;
    /**
     * Version of the build
     */
    sourceGetVersion: string;
    /**
     * Time that the build was started
     */
    startTime: Date;
    /**
     * Status of the build
     */
    status: BuildStatus;
    testStatus: BuildPhaseStatus;
    /**
     * Uri of the build
     */
    uri: string;
    /**
     * Http location of the build
     */
    url: string;
}

export interface BuildController extends QueueReference {
    agents: ShallowReference[];
    createdDate: Date;
    customAssemblyPath: string;
    description: string;
    enabled: boolean;
    maxConcurrentBuilds: number;
    messageQueueUrl: string;
    queueCount: number;
    server: ShallowReference;
    status: ControllerStatus;
    statusMessage: string;
    updatedDate: Date;
    uri: string;
}

export interface BuildDefinition extends DefinitionReference {
    /**
     * Batch size of the definition
     */
    batchSize: number;
    buildArgs: string;
    buildController: ShallowReference;
    /**
     * The continuous integration quiet period
     */
    continuousIntegrationQuietPeriod: number;
    /**
     * The date this definition was created
     */
    dateCreated: Date;
    /**
     * Default drop location for builds from this definition
     */
    defaultDropLocation: string;
    /**
     * Description of the definition
     */
    description: string;
    /**
     * The last build on this definition
     */
    lastBuild: ShallowReference;
    lastGoodBuild: ShallowReference;
    processParameters: string;
    processTemplate: ShallowReference;
    properties: PropertyValue[];
    propertyCollection: PropertyValue[];
    /**
     * Shallow reference to the definitions build controller
     */
    queue: QueueReference;
    retentionPolicies: RetentionPolicy[];
    schedules: Schedule[];
    sourceProviders: BuildDefinitionSourceProvider[];
    /**
     * The reasons supported by the template
     */
    supportedReasons: BuildReason;
    /**
     * How builds are triggered from this definition
     */
    triggerType: DefinitionTriggerType;
    /**
     * The Uri of the definition
     */
    uri: string;
    workspaceTemplate: WorkspaceTemplate;
}

export interface BuildDefinitionSourceProvider {
    /**
     * Uri of the associated definition
     */
    definitionUri: string;
    /**
     * fields associated with this build definition
     */
    fields: { [key: string] : string; };
    /**
     * Id of this source provider
     */
    id: number;
    /**
     * The lst time this source provider was modified
     */
    lastModified: Date;
    /**
     * Name of the source provider
     */
    name: string;
    /**
     * Which trigger types are supported by this definition source provider
     */
    supportedTriggerTypes: DefinitionTriggerType;
}

export enum BuildPhaseStatus {
    /**
     * The state is not known.
     */
    Unknown = 0,
    /**
     * The build phase completed unsuccessfully.
     */
    Failed = 1,
    /**
     * The build phase completed successfully.
     */
    Succeeded = 2,
}

export enum BuildReason {
    /**
     * No reason. This value should not be used.
     */
    None = 0,
    /**
     * The build was started manually.
     */
    Manual = 1,
    /**
     * The build was started for the trigger TriggerType.ContinuousIntegration.
     */
    IndividualCI = 2,
    /**
     * The build was started for the trigger TriggerType.BatchedContinuousIntegration.
     */
    BatchedCI = 4,
    /**
     * The build was started for the trigger TriggerType.Schedule.
     */
    Schedule = 8,
    /**
     * The build was started for the trigger TriggerType.ScheduleForced.
     */
    ScheduleForced = 16,
    /**
     * The build was created by a user.
     */
    UserCreated = 32,
    /**
     * The build was started manually for private validation.
     */
    ValidateShelveset = 64,
    /**
     * The build was started for the trigger ContinuousIntegrationType.Gated.
     */
    CheckInShelveset = 128,
    /**
     * The build was triggered for retention policy purposes.
     */
    Triggered = 191,
    /**
     * All reasons.
     */
    All = 255,
}

export interface BuildRequest extends RequestReference {
    batchId: string;
    builds: ShallowReference[];
    controller: ShallowReference;
    customGetVersion: string;
    definition: ShallowReference;
    definitionId: number;
    definitionStatus: DefinitionQueueStatus;
    getOption: GetOption;
    priority: QueuePriority;
    processParameters: string;
    project: TFS_Core_Contracts.TeamProjectReference;
    queue: QueueReference;
    queuePosition: number;
    queueTime: Date;
    reason: BuildReason;
    requestDropLocation: string;
    requestedBy: VSS_Common_Contracts.IdentityRef;
    shelvesetName: string;
    status: QueueStatus;
    teamProject: string;
    uri: string;
}

export enum BuildStatus {
    /**
     * No status.
     */
    None = 0,
    /**
     * The build is currently in progress.
     */
    InProgress = 1,
    /**
     * The build completed successfully.
     */
    Succeeded = 2,
    /**
     * The build completed compilation successfully but had other errors.
     */
    PartiallySucceeded = 4,
    /**
     * The build completed unsuccessfully.
     */
    Failed = 8,
    /**
     * The build was stopped.
     */
    Stopped = 16,
    /**
     * The build has not yet started.
     */
    NotStarted = 32,
    /**
     * All status.
     */
    All = 63,
}

export enum ControllerStatus {
    /**
     * Indicates that the build controller cannot be contacted.
     */
    Unavailable = 0,
    /**
     * Indicates that the build controller is currently available.
     */
    Available = 1,
    /**
     * Indicates that the build controller has taken itself offline.
     */
    Offline = 2,
}

export enum DefinitionQueueStatus {
    /**
     * When enabled the definition queue allows builds to be queued by users, the system will queue scheduled, gated and continuous integration builds, and the queued builds will be started by the system.
     */
    Enabled = 0,
    /**
     * When paused the definition queue allows builds to be queued by users and the system will queue scheduled, gated and continuous integration builds. Builds in the queue will not be started by the system.
     */
    Paused = 1,
    /**
     * When disabled the definition queue will not allow builds to be queued by users and the system will not queue scheduled, gated or continuous integration builds. Builds already in the queue will not be started by the system.
     */
    Disabled = 2,
}

/**
 * A reference to a definition.
 */
export interface DefinitionReference extends ShallowReference {
    /**
     * The type of the definition.
     */
    definitionType: DefinitionType;
    /**
     * If builds can be queued from this definition
     */
    queueStatus: DefinitionQueueStatus;
}

export enum DefinitionTriggerType {
    /**
     * Manual builds only.
     */
    None = 1,
    /**
     * A build should be started for each changeset.
     */
    ContinuousIntegration = 2,
    /**
     * A build should be started for multiple changesets at a time at a specified interval.
     */
    BatchedContinuousIntegration = 4,
    /**
     * A build should be started on a specified schedule if changesets exist.
     */
    Schedule = 8,
    /**
     * A build should be started on a specified schedule whether or not changesets exist.
     */
    ScheduleForced = 16,
    /**
     * A validation build should be started for each check-in.
     */
    GatedCheckIn = 32,
    /**
     * A validation build should be started for each batch of check-ins.
     */
    BatchedGatedCheckIn = 64,
    /**
     * All types.
     */
    All = 127,
}

export enum DefinitionType {
    Xaml = 1,
}

export enum DeleteOptions {
    /**
     * No data should be deleted. This value should not be used.
     */
    None = 0,
    /**
     * The drop location should be deleted.
     */
    DropLocation = 1,
    /**
     * The test results should be deleted.
     */
    TestResults = 2,
    /**
     * The version control label should be deleted.
     */
    Label = 4,
    /**
     * The build should be deleted.
     */
    Details = 8,
    /**
     * Published symbols should be deleted.
     */
    Symbols = 16,
    /**
     * All data should be deleted.
     */
    All = 31,
}

export interface DeploymentEnvironmentApiData {
    cert: string;
    deploymentName: string;
    disconnectSubscription: boolean;
    password: string;
    projectName: string;
    subscriptionId: string;
    subscriptionName: string;
    userName: string;
}

export enum DeploymentEnvironmentKind {
    /**
     * Custom or unknown environment. Requires custom workflow activities to deploy
     */
    Custom = 0,
    /**
     * Uses MSDeploy to deploy to an Azure web site
     */
    AzureWebsite = 1,
    /**
     * Uses CSPack and the Azure management API to deploy to an Azure Cloud App
     */
    AzureCloudApp = 2,
}

export interface DeploymentEnvironmentMetadata {
    connectedServiceName: string;
    description: string;
    friendlyName: string;
    kind: DeploymentEnvironmentKind;
    name: string;
    teamProject: string;
}

/**
 * Data representation of a build drop location reference
 */
export interface DropLocationReference {
    /**
     * Full http link to the drop resource with query parameters to download as a zip file
     */
    downloadUrl: string;
    /**
     * Relative server location for the build drop
     */
    location: string;
    /**
     * The type of the drop location.
     */
    type: DropLocationReferenceType;
    /**
     * Full http link to the drop resource
     */
    url: string;
}

export enum DropLocationReferenceType {
    /**
     * Default value. Currently is never sent over the wire.
     */
    Unknown = 0,
    /**
     * UNC or local folder path E.g. \\vscsstor\CIDrops\CloudU.Gated\140317.115955 or file://vscsstor/CIDrops/CloudU.Gated/140317.115955
     */
    LocalPath = 1,
    /**
     * TF VC server folder path E.g. $/Dev1/Drops/CloudU.Gated/140317.115955
     */
    VersionControl = 2,
    /**
     * Build container reference E.g. #/2121/drop
     */
    Container = 3,
}

export enum GetOption {
    /**
     * Use the latest changeset at the time the build is queued.
     */
    LatestOnQueue = 0,
    /**
     * Use the latest changeset at the time the build is started.
     */
    LatestOnBuild = 1,
    /**
     * A user-specified version has been supplied.
     */
    Custom = 2,
}

/**
 * Data representation of an information node associated with a build
 */
export interface InformationNode {
    /**
     * Fields of the information node
     */
    fields: { [key: string] : string; };
    /**
     * Process or person that last modified this node
     */
    lastModifiedBy: string;
    /**
     * Date this node was last modified
     */
    lastModifiedDate: Date;
    /**
     * Node Id of this information node
     */
    nodeId: number;
    /**
     * Id of parent node (xml tree)
     */
    parentId: number;
    /**
     * The type of the information node
     */
    type: string;
}

/**
 * Data representation of a build log drop location reference
 */
export interface LogLocationReference {
    /**
     * Full http link to the log resource with query parameters to download as a zip file
     */
    downloadUrl: string;
    /**
     * The type of the drop location.
     */
    type: DropLocationReferenceType;
    /**
     * Full http link to the log resource
     */
    url: string;
}

export interface PropertyValue {
    /**
     * Guid of identity that changed this property value
     */
    changedBy: string;
    /**
     * The date this property value was changed
     */
    changedDate: Date;
    /**
     * Name in the name value mapping
     */
    propertyName: string;
    /**
     * Value in the name value mapping
     */
    value: any;
}

export enum QueuePriority {
    /**
     * Low priority.
     */
    Low = 5,
    /**
     * Below normal priority.
     */
    BelowNormal = 4,
    /**
     * Normal priority.
     */
    Normal = 3,
    /**
     * Above normal priority.
     */
    AboveNormal = 2,
    /**
     * High priority.
     */
    High = 1,
}

/**
 * A reference to a queue.
 */
export interface QueueReference extends ShallowReference {
    /**
     * The type of the queue.
     */
    queueType: QueueType;
}

export enum QueueStatus {
    /**
     * No status.
     */
    None = 0,
    /**
     * The build is currently in progress.
     */
    InProgress = 1,
    /**
     * The build has been requeued for a retry most likely due to failure.
     */
    Retry = 2,
    /**
     * The build is active in the queue.
     */
    Queued = 4,
    /**
     * The build is inactive in the queue.
     */
    Postponed = 8,
    /**
     * The build completed.
     */
    Completed = 16,
    /**
     * The build was canceled before starting.
     */
    Canceled = 32,
    /**
     * All status values.
     */
    All = 63,
}

export enum QueueType {
    BuildController = 1,
}

export interface RequestReference {
    /**
     * Id of the resource
     */
    id: number;
    /**
     * Name of the requestor
     */
    requestedFor: VSS_Common_Contracts.IdentityRef;
    /**
     * Full http link to the resource
     */
    url: string;
}

export interface RetentionPolicy {
    /**
     * Reason build was created
     */
    buildReason: BuildReason;
    /**
     * Status of the build
     */
    buildStatus: BuildStatus;
    /**
     * Uri of the associated definition
     */
    definitionUri: string;
    /**
     * Options for deletion of build
     */
    deleteOptions: DeleteOptions;
    /**
     * number of builds to keep
     */
    numberToKeep: number;
}

export interface Schedule {
    /**
     * Time zone of the build schedule
     */
    timeZoneId: string;
    /**
     * Days for a build
     */
    utcDaysToBuild: ScheduleDays;
    /**
     * Coordinated universal start time
     */
    utcStartTime: number;
}

export enum ScheduleDays {
    /**
     * Do not run.
     */
    None = 0,
    /**
     * Run on Monday.
     */
    Monday = 1,
    /**
     * Run on Tuesday.
     */
    Tuesday = 2,
    /**
     * Run on Wednesday.
     */
    Wednesday = 4,
    /**
     * Run on Thursday.
     */
    Thursday = 8,
    /**
     * Run on Friday.
     */
    Friday = 16,
    /**
     * Run on Saturday.
     */
    Saturday = 32,
    /**
     * Run on Sunday.
     */
    Sunday = 64,
    /**
     * Run on all days of the week.
     */
    All = 127,
}

/**
 * An abstracted reference to some other resource. This class is used to provide the build data contracts with a uniform way to reference other resources in a way that provides easy traversal through links.
 */
export interface ShallowReference {
    /**
     * Id of the resource
     */
    id: number;
    /**
     * Name of the linked resource (definition name, controller name, etc.)
     */
    name: string;
    /**
     * Full http link to the resource
     */
    url: string;
}

/**
 * Mapping for a workspace
 */
export interface WorkspaceMapping {
    /**
     * Uri of the associated definition
     */
    definitionUri: string;
    /**
     * Depth of this mapping
     */
    depth: number;
    /**
     * local location of the definition
     */
    localItem: string;
    /**
     * type of workspace mapping
     */
    mappingType: WorkspaceMappingType;
    /**
     * Server location of the definition
     */
    serverItem: string;
    /**
     * Id of the workspace
     */
    workspaceId: number;
}

export enum WorkspaceMappingType {
    /**
     * The path is mapped in the workspace.
     */
    Map = 0,
    /**
     * The path is cloaked in the workspace.
     */
    Cloak = 1,
}

export interface WorkspaceTemplate {
    /**
     * Uri of the associated definition
     */
    definitionUri: string;
    /**
     * The identity that last modified this template
     */
    lastModifiedBy: string;
    /**
     * The last time this template was modified
     */
    lastModifiedDate: Date;
    /**
     * List of workspace mappings
     */
    mappings: WorkspaceMapping[];
    /**
     * Id of the workspace for this template
     */
    workspaceId: number;
}

export var TypeInfo = {
    Build: <any>{
    },
    BuildController: <any>{
    },
    BuildDefinition: <any>{
    },
    BuildDefinitionSourceProvider: <any>{
    },
    BuildPhaseStatus: {
        enumValues: {
            "unknown": 0,
            "failed": 1,
            "succeeded": 2,
        }
    },
    BuildReason: {
        enumValues: {
            "none": 0,
            "manual": 1,
            "individualCI": 2,
            "batchedCI": 4,
            "schedule": 8,
            "scheduleForced": 16,
            "userCreated": 32,
            "validateShelveset": 64,
            "checkInShelveset": 128,
            "triggered": 191,
            "all": 255,
        }
    },
    BuildRequest: <any>{
    },
    BuildStatus: {
        enumValues: {
            "none": 0,
            "inProgress": 1,
            "succeeded": 2,
            "partiallySucceeded": 4,
            "failed": 8,
            "stopped": 16,
            "notStarted": 32,
            "all": 63,
        }
    },
    ControllerStatus: {
        enumValues: {
            "unavailable": 0,
            "available": 1,
            "offline": 2,
        }
    },
    DefinitionQueueStatus: {
        enumValues: {
            "enabled": 0,
            "paused": 1,
            "disabled": 2,
        }
    },
    DefinitionReference: <any>{
    },
    DefinitionTriggerType: {
        enumValues: {
            "none": 1,
            "continuousIntegration": 2,
            "batchedContinuousIntegration": 4,
            "schedule": 8,
            "scheduleForced": 16,
            "gatedCheckIn": 32,
            "batchedGatedCheckIn": 64,
            "all": 127,
        }
    },
    DefinitionType: {
        enumValues: {
            "xaml": 1,
        }
    },
    DeleteOptions: {
        enumValues: {
            "none": 0,
            "dropLocation": 1,
            "testResults": 2,
            "label": 4,
            "details": 8,
            "symbols": 16,
            "all": 31,
        }
    },
    DeploymentEnvironmentKind: {
        enumValues: {
            "custom": 0,
            "azureWebsite": 1,
            "azureCloudApp": 2,
        }
    },
    DeploymentEnvironmentMetadata: <any>{
    },
    DropLocationReference: <any>{
    },
    DropLocationReferenceType: {
        enumValues: {
            "unknown": 0,
            "localPath": 1,
            "versionControl": 2,
            "container": 3,
        }
    },
    GetOption: {
        enumValues: {
            "latestOnQueue": 0,
            "latestOnBuild": 1,
            "custom": 2,
        }
    },
    InformationNode: <any>{
    },
    LogLocationReference: <any>{
    },
    PropertyValue: <any>{
    },
    QueuePriority: {
        enumValues: {
            "low": 5,
            "belowNormal": 4,
            "normal": 3,
            "aboveNormal": 2,
            "high": 1,
        }
    },
    QueueReference: <any>{
    },
    QueueStatus: {
        enumValues: {
            "none": 0,
            "inProgress": 1,
            "retry": 2,
            "queued": 4,
            "postponed": 8,
            "completed": 16,
            "canceled": 32,
            "all": 63,
        }
    },
    QueueType: {
        enumValues: {
            "buildController": 1,
        }
    },
    RetentionPolicy: <any>{
    },
    Schedule: <any>{
    },
    ScheduleDays: {
        enumValues: {
            "none": 0,
            "monday": 1,
            "tuesday": 2,
            "wednesday": 4,
            "thursday": 8,
            "friday": 16,
            "saturday": 32,
            "sunday": 64,
            "all": 127,
        }
    },
    WorkspaceMapping: <any>{
    },
    WorkspaceMappingType: {
        enumValues: {
            "map": 0,
            "cloak": 1,
        }
    },
    WorkspaceTemplate: <any>{
    },
};

TypeInfo.Build.fields = {
    compilationStatus: {
        enumType: TypeInfo.BuildPhaseStatus
    },
    drop: {
        typeInfo: TypeInfo.DropLocationReference
    },
    finishTime: {
        isDate: true,
    },
    lastChangedDate: {
        isDate: true,
    },
    log: {
        typeInfo: TypeInfo.LogLocationReference
    },
    queue: {
        typeInfo: TypeInfo.QueueReference
    },
    reason: {
        enumType: TypeInfo.BuildReason
    },
    startTime: {
        isDate: true,
    },
    status: {
        enumType: TypeInfo.BuildStatus
    },
    testStatus: {
        enumType: TypeInfo.BuildPhaseStatus
    },
};

TypeInfo.BuildController.fields = {
    createdDate: {
        isDate: true,
    },
    queueType: {
        enumType: TypeInfo.QueueType
    },
    status: {
        enumType: TypeInfo.ControllerStatus
    },
    updatedDate: {
        isDate: true,
    },
};

TypeInfo.BuildDefinition.fields = {
    dateCreated: {
        isDate: true,
    },
    definitionType: {
        enumType: TypeInfo.DefinitionType
    },
    properties: {
        isArray: true,
        typeInfo: TypeInfo.PropertyValue
    },
    propertyCollection: {
        isArray: true,
        typeInfo: TypeInfo.PropertyValue
    },
    queue: {
        typeInfo: TypeInfo.QueueReference
    },
    queueStatus: {
        enumType: TypeInfo.DefinitionQueueStatus
    },
    retentionPolicies: {
        isArray: true,
        typeInfo: TypeInfo.RetentionPolicy
    },
    schedules: {
        isArray: true,
        typeInfo: TypeInfo.Schedule
    },
    sourceProviders: {
        isArray: true,
        typeInfo: TypeInfo.BuildDefinitionSourceProvider
    },
    supportedReasons: {
        enumType: TypeInfo.BuildReason
    },
    triggerType: {
        enumType: TypeInfo.DefinitionTriggerType
    },
    workspaceTemplate: {
        typeInfo: TypeInfo.WorkspaceTemplate
    },
};

TypeInfo.BuildDefinitionSourceProvider.fields = {
    lastModified: {
        isDate: true,
    },
    supportedTriggerTypes: {
        enumType: TypeInfo.DefinitionTriggerType
    },
};

TypeInfo.BuildRequest.fields = {
    definitionStatus: {
        enumType: TypeInfo.DefinitionQueueStatus
    },
    getOption: {
        enumType: TypeInfo.GetOption
    },
    priority: {
        enumType: TypeInfo.QueuePriority
    },
    queue: {
        typeInfo: TypeInfo.QueueReference
    },
    queueTime: {
        isDate: true,
    },
    reason: {
        enumType: TypeInfo.BuildReason
    },
    status: {
        enumType: TypeInfo.QueueStatus
    },
};

TypeInfo.DefinitionReference.fields = {
    definitionType: {
        enumType: TypeInfo.DefinitionType
    },
    queueStatus: {
        enumType: TypeInfo.DefinitionQueueStatus
    },
};

TypeInfo.DeploymentEnvironmentMetadata.fields = {
    kind: {
        enumType: TypeInfo.DeploymentEnvironmentKind
    },
};

TypeInfo.DropLocationReference.fields = {
    type: {
        enumType: TypeInfo.DropLocationReferenceType
    },
};

TypeInfo.InformationNode.fields = {
    lastModifiedDate: {
        isDate: true,
    },
};

TypeInfo.LogLocationReference.fields = {
    type: {
        enumType: TypeInfo.DropLocationReferenceType
    },
};

TypeInfo.PropertyValue.fields = {
    changedDate: {
        isDate: true,
    },
};

TypeInfo.QueueReference.fields = {
    queueType: {
        enumType: TypeInfo.QueueType
    },
};

TypeInfo.RetentionPolicy.fields = {
    buildReason: {
        enumType: TypeInfo.BuildReason
    },
    buildStatus: {
        enumType: TypeInfo.BuildStatus
    },
    deleteOptions: {
        enumType: TypeInfo.DeleteOptions
    },
};

TypeInfo.Schedule.fields = {
    utcDaysToBuild: {
        enumType: TypeInfo.ScheduleDays
    },
};

TypeInfo.WorkspaceMapping.fields = {
    mappingType: {
        enumType: TypeInfo.WorkspaceMappingType
    },
};

TypeInfo.WorkspaceTemplate.fields = {
    lastModifiedDate: {
        isDate: true,
    },
    mappings: {
        isArray: true,
        typeInfo: TypeInfo.WorkspaceMapping
    },
};
