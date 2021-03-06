/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*
* ---------------------------------------------------------
* Generated file, DO NOT EDIT
* ---------------------------------------------------------
*
* See following wiki page for instructions on how to regenerate:
*   https://vsowiki.com/index.php?title=Rest_Client_Generation
*/

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Gallery_Contracts = require("VSS/Gallery/Contracts");

export interface AcquisitionOperation {
    /**
     * State of the the AcquisitionOperation for the current user
     */
    operationState: AcquisitionOperationState;
    /**
     * AcquisitionOperationType: install, request, buy, etc...
     */
    operationType: AcquisitionOperationType;
    /**
     * Optional reason to justify current state. Typically used with Disallow state.
     */
    reason: string;
}

export enum AcquisitionOperationState {
    /**
     * Not allowed to use this AcquisitionOperation
     */
    Disallow = 0,
    /**
     * Allowed to use this AcquisitionOperation
     */
    Allow = 1,
    /**
     * Operation has already been completed and is no longer available
     */
    Completed = 3,
}

export enum AcquisitionOperationType {
    /**
     * Not yet used
     */
    Get = 0,
    /**
     * Install this extension into the host provided
     */
    Install = 1,
    /**
     * Buy licenses for this extension and install into the host provided
     */
    Buy = 2,
    /**
     * Not yet used
     */
    Try = 3,
    /**
     * Not yet used
     */
    Request = 4,
    /**
     * No action found
     */
    None = 5,
}

/**
 * Market item acquisition options (install, buy, etc) for an installation target.
 */
export interface AcquisitionOptions {
    /**
     * Default Operation for the ItemId in this target
     */
    defaultOperation: AcquisitionOperation;
    /**
     * The item id that this options refer to
     */
    itemId: string;
    /**
     * Operations allowed for the ItemId in this target
     */
    operations: AcquisitionOperation[];
    /**
     * The target that this options refer to
     */
    target: string;
}

/**
 * An individual contribution made by an extension
 */
export interface Contribution extends ContributionBase {
    /**
     * List of constraints (filters) that should be applied to the availability of this contribution
     */
    constraints: ContributionConstraint[];
    /**
     * Includes is a set of contributions that should have this contribution included in their targets list.
     */
    includes: string[];
    /**
     * Properties/attributes of this contribution
     */
    properties: any;
    /**
     * The ids of the contribution(s) that this contribution targets. (parent contributions)
     */
    targets: string[];
    /**
     * Id of the Contribution Type
     */
    type: string;
}

/**
 * Base class shared by contributions and contribution types
 */
export interface ContributionBase {
    /**
     * Description of the contribution/type
     */
    description: string;
    /**
     * Fully qualified identifier of the contribution/type
     */
    id: string;
    /**
     * VisibleTo can be used to restrict whom can reference a given contribution/type. This value should be a list of publishers or extensions access is restricted too.  Examples: "ms" - Means only the "ms" publisher can reference this. "ms.vss-web" - Means only the "vss-web" extension from the "ms" publisher can reference this.
     */
    visibleTo: string[];
}

/**
 * Specifies a constraint that can be used to dynamically include/exclude a given contribution
 */
export interface ContributionConstraint {
    /**
     * An optional property that can be specified to group constraints together. All constraints within a group are AND'd together (all must be evaluate to True in order for the contribution to be included). Different groups of constraints are OR'd (only one group needs to evaluate to True for the contribution to be included).
     */
    group: number;
    /**
     * If true, negate the result of the filter (include the contribution if the applied filter returns false instead of true)
     */
    inverse: boolean;
    /**
     * Name of the IContributionFilter class
     */
    name: string;
    /**
     * Properties that are fed to the contribution filter class
     */
    properties: any;
}

/**
 * Description about a property of a contribution type
 */
export interface ContributionPropertyDescription {
    /**
     * Description of the property
     */
    description: string;
    /**
     * Name of the property
     */
    name: string;
    /**
     * True if this property is required
     */
    required: boolean;
    /**
     * The type of value used for this property
     */
    type: ContributionPropertyType;
}

export enum ContributionPropertyType {
    /**
     * Contribution type is unknown (value may be anything)
     */
    Unknown = 0,
    /**
     * Value is a string
     */
    String = 1,
    /**
     * Value is a Uri
     */
    Uri = 2,
    /**
     * Value is a GUID
     */
    Guid = 4,
    /**
     * Value is True or False
     */
    Boolean = 8,
    /**
     * Value is an integer
     */
    Integer = 16,
    /**
     * Value is a double
     */
    Double = 32,
    /**
     * Value is a DateTime object
     */
    DateTime = 64,
    /**
     * Value is a generic Dictionary/JObject/property bag
     */
    Dictionary = 128,
    /**
     * Value is an array
     */
    Array = 256,
    /**
     * Value is an arbitrary/custom object
     */
    Object = 512,
}

/**
 * A contribution type, given by a json schema
 */
export interface ContributionType extends ContributionBase {
    /**
     * Controls whether or not contributions of this type have the type indexed for queries. This allows clients to find all extensions that have a contribution of this type.  NOTE: Only TrustedPartners are allowed to specify indexed contribution types.
     */
    indexed: boolean;
    /**
     * Friendly name of the contribution/type
     */
    name: string;
    /**
     * Describes the allowed properties for this contribution type
     */
    properties: { [key: string] : ContributionPropertyDescription; };
}

/**
 * Contextual information that data providers can examine when populating their data
 */
export interface DataProviderContext {
    /**
     * Generic property bag that contains context-specific properties that data providers can use when populating their data dictionary
     */
    properties: { [key: string] : any; };
}

/**
 * A query that can be issued for data provider data
 */
export interface DataProviderQuery {
    /**
     * Contextual information to pass to the data providers
     */
    context: DataProviderContext;
    /**
     * The contribution ids of the data providers to resolve
     */
    contributionIds: string[];
}

/**
 * Result structure from calls to GetDataProviderData
 */
export interface DataProviderResult {
    /**
     * Property bag of data keyed off of the data provider contribution id
     */
    data: { [key: string] : any; };
    /**
     * List of data providers resolved in the data-provider query
     */
    resolvedProviders: ResolvedDataProvider[];
}

/**
 * Represents the state of an extension request
 */
export interface ExtensionAuditAction {
}

/**
 * Audit log for an extension
 */
export interface ExtensionAuditLog {
    /**
     * Collection of audit log entries
     */
    entries: ExtensionAuditLogEntry[];
    /**
     * Extension that the change was made for
     */
    extensionName: string;
    /**
     * Publisher that the extension is part of
     */
    publisherName: string;
}

/**
 * An audit log entry for an extension
 */
export interface ExtensionAuditLogEntry {
    /**
     * Change that was made to extension
     */
    auditAction: string;
    /**
     * Date at which the change was made
     */
    auditDate: Date;
    /**
     * Extra information about the change
     */
    comment: string;
    /**
     * Represents the user who made the change
     */
    updatedBy: VSS_Common_Contracts.IdentityRef;
}

/**
 * Represents a single collection for extension data documents
 */
export interface ExtensionDataCollection {
    /**
     * The name of the collection
     */
    collectionName: string;
    /**
     * A list of documents belonging to the collection
     */
    documents: any[];
    /**
     * The type of the collection's scope, such as Default or User
     */
    scopeType: string;
    /**
     * The value of the collection's scope, such as Current or Me
     */
    scopeValue: string;
}

/**
 * Represents a query to receive a set of extension data collections
 */
export interface ExtensionDataCollectionQuery {
    /**
     * A list of collections to query
     */
    collections: ExtensionDataCollection[];
}

/**
 * Base class for an event callback for an extension
 */
export interface ExtensionEventCallback {
    /**
     * The uri of the endpoint that is hit when an event occurs
     */
    uri: string;
}

/**
 * Collection of event callbacks - endpoints called when particular extension events occur.
 */
export interface ExtensionEventCallbackCollection {
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension disable has occurred.
     */
    postDisable: ExtensionEventCallback;
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension enable has occurred.
     */
    postEnable: ExtensionEventCallback;
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension install has completed.
     */
    postInstall: ExtensionEventCallback;
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension uninstall has occurred.
     */
    postUninstall: ExtensionEventCallback;
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension update has occurred.
     */
    postUpdate: ExtensionEventCallback;
    /**
     * Optional.  Defines an endpoint that gets called via a POST reqeust to notify that an extension install is about to occur.  Response indicates whether to proceed or abort.
     */
    preInstall: ExtensionEventCallback;
    /**
     * For multi-version extensions, defines an endpoint that gets called via an OPTIONS request to determine the particular version of the extension to be used
     */
    versionCheck: ExtensionEventCallback;
}

export enum ExtensionFlags {
    /**
     * A built-in extension is installed for all VSTS accounts by default
     */
    BuiltIn = 1,
    /**
     * The extension comes from a fully-trusted publisher
     */
    Trusted = 2,
}

/**
 * Base class for extension properties which are shared by the extension manifest and the extension model
 */
export interface ExtensionManifest {
    /**
     * Uri used as base for other relative uri's defined in extension
     */
    baseUri: string;
    /**
     * List of contributions made by this extension
     */
    contributions: Contribution[];
    /**
     * List of contribution types defined by this extension
     */
    contributionTypes: ContributionType[];
    /**
     * List of explicit demands required by this extension
     */
    demands: string[];
    /**
     * Collection of endpoints that get called when particular extension events occur
     */
    eventCallbacks: ExtensionEventCallbackCollection;
    /**
     * Language Culture Name set by the Gallery
     */
    language: string;
    /**
     * Version of the extension manifest format/content
     */
    manifestVersion: number;
    /**
     * List of all oauth scopes required by this extension
     */
    scopes: string[];
    /**
     * The ServiceInstanceType(Guid) of the VSTS service that must be available to an account in order for the extension to be installed
     */
    serviceInstanceType: string;
}

/**
 * A request for an extension (to be installed or have a license assigned)
 */
export interface ExtensionRequest {
    /**
     * Required message supplied if the request is rejected
     */
    rejectMessage: string;
    /**
     * Date at which the request was made
     */
    requestDate: Date;
    /**
     * Represents the user who made the request
     */
    requestedBy: VSS_Common_Contracts.IdentityRef;
    /**
     * Optional message supplied by the requester justifying the request
     */
    requestMessage: string;
    /**
     * Represents the state of the request
     */
    requestState: ExtensionRequestState;
    /**
     * Date at which the request was resolved
     */
    resolveDate: Date;
    /**
     * Represents the user who resolved the request
     */
    resolvedBy: VSS_Common_Contracts.IdentityRef;
}

export enum ExtensionRequestState {
    /**
     * The request has been opened, but not yet responded to
     */
    Open = 0,
    /**
     * The request was accepted (extension installed or license assigned)
     */
    Accepted = 1,
    /**
     * The request was rejected (extension not installed or license not assigned)
     */
    Rejected = 2,
}

/**
 * The state of an extension
 */
export interface ExtensionState extends InstalledExtensionState {
    extensionName: string;
    /**
     * The time at which the version was last checked
     */
    lastVersionCheck: Date;
    publisherName: string;
    version: string;
}

export enum ExtensionStateFlags {
    /**
     * No flags set
     */
    None = 0,
    /**
     * Extension is disabled
     */
    Disabled = 1,
    /**
     * Extension is a built in
     */
    BuiltIn = 2,
    /**
     * Extension has multiple versions
     */
    MultiVersion = 4,
    /**
     * Extension is not installed.  This is for builtin extensions only and can not otherwise be set.
     */
    UnInstalled = 8,
    /**
     * Error performing version check
     */
    VersionCheckError = 16,
    /**
     * Trusted extensions are ones that are given special capabilities. These tend to come from Microsoft and can't be published by the general public.  Note: BuiltIn extensions are always trusted.
     */
    Trusted = 32,
    /**
     * Extension is currently in an error state
     */
    Error = 64,
    /**
     * Extension scopes have changed and the extension requires re-authorization
     */
    NeedsReauthorization = 128,
}

/**
 * Represents a VSTS extension along with its installation state
 */
export interface InstalledExtension extends ExtensionManifest {
    /**
     * The friendly extension id for this extension - unique for a given publisher.
     */
    extensionId: string;
    /**
     * The display name of the extension.
     */
    extensionName: string;
    /**
     * This is the set of files available from the extension.
     */
    files: VSS_Gallery_Contracts.ExtensionFile[];
    /**
     * Extension flags relevant to contribution consumers
     */
    flags: ExtensionFlags;
    /**
     * Information about this particular installation of the extension
     */
    installState: InstalledExtensionState;
    /**
     * This represents the date/time the extensions was last updated in the gallery. This doesnt mean this version was updated the value represents changes to any and all versions of the extension.
     */
    lastPublished: Date;
    /**
     * Unique id of the publisher of this extension
     */
    publisherId: string;
    /**
     * The display name of the publisher
     */
    publisherName: string;
    /**
     * Unique id for this extension (the same id is used for all versions of a single extension)
     */
    registrationId: string;
    /**
     * Version of this extension
     */
    version: string;
}

export interface InstalledExtensionQuery {
    assetTypes: string[];
    monikers: VSS_Gallery_Contracts.ExtensionIdentifier[];
}

/**
 * The state of an installed extension
 */
export interface InstalledExtensionState {
    /**
     * States of an installed extension
     */
    flags: ExtensionStateFlags;
    /**
     * The time at which this installation was last updated
     */
    lastUpdated: Date;
}

/**
 * A request for an extension (to be installed or have a license assigned)
 */
export interface RequestedExtension {
    /**
     * THe unique name of the extensions
     */
    extensionName: string;
    /**
     * A list of each request for the extension
     */
    extensionRequests: ExtensionRequest[];
    /**
     * DisplayName of the publisher that owns the extension being published.
     */
    publisherDisplayName: string;
    /**
     * Represents the Publisher of the requested extension
     */
    publisherName: string;
    /**
     * The total number of requests for an extension
     */
    requestCount: number;
}

/**
 * Entry for a specific data provider's resulting data
 */
export interface ResolvedDataProvider {
    /**
     * The total time the data provider took to resolve its data (in milliseconds)
     */
    duration: number;
    error: string;
    id: string;
}

export interface Scope {
    description: string;
    title: string;
    value: string;
}

/**
 * Information about the extension
 */
export interface SupportedExtension {
    /**
     * Unique Identifier for this extension
     */
    extension: string;
    /**
     * Unique Identifier for this publisher
     */
    publisher: string;
    /**
     * Supported version for this extension
     */
    version: string;
}

export var TypeInfo = {
    AcquisitionOperation: <any>{
    },
    AcquisitionOperationState: {
        enumValues: {
            "disallow": 0,
            "allow": 1,
            "completed": 3,
        }
    },
    AcquisitionOperationType: {
        enumValues: {
            "get": 0,
            "install": 1,
            "buy": 2,
            "try": 3,
            "request": 4,
            "none": 5,
        }
    },
    AcquisitionOptions: <any>{
    },
    ContributionPropertyDescription: <any>{
    },
    ContributionPropertyType: {
        enumValues: {
            "unknown": 0,
            "string": 1,
            "uri": 2,
            "guid": 4,
            "boolean": 8,
            "integer": 16,
            "double": 32,
            "dateTime": 64,
            "dictionary": 128,
            "array": 256,
            "object": 512,
        }
    },
    ContributionType: <any>{
    },
    ExtensionAuditLog: <any>{
    },
    ExtensionAuditLogEntry: <any>{
    },
    ExtensionFlags: {
        enumValues: {
            "builtIn": 1,
            "trusted": 2,
        }
    },
    ExtensionManifest: <any>{
    },
    ExtensionRequest: <any>{
    },
    ExtensionRequestState: {
        enumValues: {
            "open": 0,
            "accepted": 1,
            "rejected": 2,
        }
    },
    ExtensionState: <any>{
    },
    ExtensionStateFlags: {
        enumValues: {
            "none": 0,
            "disabled": 1,
            "builtIn": 2,
            "multiVersion": 4,
            "unInstalled": 8,
            "versionCheckError": 16,
            "trusted": 32,
            "error": 64,
            "needsReauthorization": 128,
        }
    },
    InstalledExtension: <any>{
    },
    InstalledExtensionState: <any>{
    },
    RequestedExtension: <any>{
    },
};

TypeInfo.AcquisitionOperation.fields = {
    operationState: {
        enumType: TypeInfo.AcquisitionOperationState
    },
    operationType: {
        enumType: TypeInfo.AcquisitionOperationType
    },
};

TypeInfo.AcquisitionOptions.fields = {
    defaultOperation: {
        typeInfo: TypeInfo.AcquisitionOperation
    },
    operations: {
        isArray: true,
        typeInfo: TypeInfo.AcquisitionOperation
    },
};

TypeInfo.ContributionPropertyDescription.fields = {
    type: {
        enumType: TypeInfo.ContributionPropertyType
    },
};

TypeInfo.ContributionType.fields = {
    properties: {
        isDictionary: true,
        dictionaryValueTypeInfo: TypeInfo.ContributionPropertyDescription
    },
};

TypeInfo.ExtensionAuditLog.fields = {
    entries: {
        isArray: true,
        typeInfo: TypeInfo.ExtensionAuditLogEntry
    },
};

TypeInfo.ExtensionAuditLogEntry.fields = {
    auditDate: {
        isDate: true,
    },
};

TypeInfo.ExtensionManifest.fields = {
    contributionTypes: {
        isArray: true,
        typeInfo: TypeInfo.ContributionType
    },
};

TypeInfo.ExtensionRequest.fields = {
    requestDate: {
        isDate: true,
    },
    requestState: {
        enumType: TypeInfo.ExtensionRequestState
    },
    resolveDate: {
        isDate: true,
    },
};

TypeInfo.ExtensionState.fields = {
    flags: {
        enumType: TypeInfo.ExtensionStateFlags
    },
    lastUpdated: {
        isDate: true,
    },
    lastVersionCheck: {
        isDate: true,
    },
};

TypeInfo.InstalledExtension.fields = {
    contributionTypes: {
        isArray: true,
        typeInfo: TypeInfo.ContributionType
    },
    flags: {
        enumType: TypeInfo.ExtensionFlags
    },
    installState: {
        typeInfo: TypeInfo.InstalledExtensionState
    },
    lastPublished: {
        isDate: true,
    },
};

TypeInfo.InstalledExtensionState.fields = {
    flags: {
        enumType: TypeInfo.ExtensionStateFlags
    },
    lastUpdated: {
        isDate: true,
    },
};

TypeInfo.RequestedExtension.fields = {
    extensionRequests: {
        isArray: true,
        typeInfo: TypeInfo.ExtensionRequest
    },
};
