import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { FieldUsages, FieldFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { INodeStructureType, IReferencedNodes } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { IStateColor } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { Cancelable } from "VSS/Utils/Core";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IExternalLinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

export interface IProjectProcessData {
    id: string;
    name: string;
    isInherited: boolean;
    isSystem: boolean;
    canEditProcess: boolean;
}

export interface IProjectData {
    id: number;
    name: string;
    guid: string;
    workItemTypes: string[];
    fieldIds: number[];
    extras: any;
    process?: IProjectProcessData;
}

export interface IFieldProjectData {
    projects: IProjectData[];
    fields: IFieldEntry[];
}

export interface IFailure {
    error: string;
    index: number;
    id: any;
}

export interface IWorkItemTypeCategory {
    workItemTypeNames: string[];
}

export interface IWorkItemCategory {
    referenceName: string;
}

export interface IFieldEntry {
    id: number;
    name: string;
    referenceName: string;
    type: WITConstants.FieldType;
    flags: FieldFlags;
    usages: FieldUsages;
    isIdentity: boolean;
    isHistoryEnabled: boolean;
}

export interface IWorkItemTypeExtensionFieldEntry {
    localName: string;
    localReferenceName: string;
    extensionScoped: boolean;
    field: IFieldEntry;
}

export interface IWorkItemTypeExtension {
    id: string;
    name: string;
    description: string;
    markerField: IWorkItemTypeExtensionFieldEntry;
    fields: IWorkItemTypeExtensionFieldEntry[];
    form: string;
    fieldRules?: any;
    globals?: string[];
}

export interface IWorkItemLinkTypeEnd {
    id: number;
    immutableName: string;
    name: string;
    isForwardLink: boolean;
    linkType?: IWorkItemLinkType;
    oppositeEnd?: IWorkItemLinkTypeEnd;
}

export interface IWorkItemLinkType {
    referenceName: string;
    topology: string;
    canDelete: boolean;
    canEdit: boolean;
    isActive: boolean;
    isDirectional: boolean;
    isNonCircular: boolean;
    isOneToMany: boolean;
    isRemote: boolean;

    forwardEnd: IWorkItemLinkTypeEnd;
    reverseEnd: IWorkItemLinkTypeEnd;
}

export interface IRegisteredLinkType {
    name: string;
    toolId: string;
}

export interface ILinkTypes {
    witLinkTypes: IWorkItemLinkType[];
    registeredLinkTypes: IRegisteredLinkType[];
}

export interface WitUserContext {
    displayName: string;
    identityRef: IdentityRef;
}

export interface WorkItemIdentityRef {
    distinctDisplayName: string;
    identityRef: IdentityRef;
}

export interface IResourceLink {
    AddedDate: Date;
    AreaId: number;
    Comment: string;
    CreationDate: Date;
    ExtId: number;
    FilePath: string;
    FilePathHash: number;
    FldId: number;
    LastWriteDate: Date;
    Length: number;
    OriginalName: string;
    RemovedDate: Date;
    WorkItemId: number;
}

export interface IWorkItemTypeData {
    fields: number[];
    id: number;
    name: string;
    referenceName: string;
    rules: {
        transitions: { [state: string]: string[] };
        triggerList: number[];
        fieldRules: { [fieldId: number]: FieldRuleType[] };
        fieldHelpTexts: { [id: number]: string };
        globals: string[];
        processId: string;
        stateColors: IStateColor[]
        /** JSON.stringified form data */
        form: string;
    };
    projectGuid: string;
    /** Color is only filled for phase 2 */
    color?: string;
}

export namespace DataProviderInterfaces {

    export interface IWorkItemType {
        fields: IFieldEntry[];
        id: number;
        name: string;
        referenceName: string;
        fieldHelpTexts: { [id: number]: string };
        stateColors: IStateColor[];
        /** JSON.stringified form data */
        form: string;
        /** Color is only filled for phase 2 */
        color?: string;
    }
}

export type RuleName =
    'Block' |
    'Required' |
    'ReadOnly' |
    'Empty' |
    'Frozen' |
    'CannotLoseValue' |
    'OtherField' |
    'ValidUser' |
    'AllowExistingValue' |
    'Match' |
    'AllowedValues' |
    'SuggestedValues' |
    'ProhibitedValues' |
    'Default' |
    'Copy' |
    'ServerDefault' |
    'Map' |
    'When' |
    'WhenWas' |
    'WhenChanged' |
    'WhenBecameNonEmpty' |
    'WhenRemainedNonEmpty' |
    'Computed' |
    'Trigger' |
    'Collection' |
    'Project' |
    'WorkItemType' |
    'ScopedIdentity';

/** See RuleEvaluator.<RuleName> For argument type */
export type RuleParameters = any[];
export type FieldRuleType = RuleName | RuleParameters;

export interface IFieldDataDictionary {
    [fieldId: number]: any;
}

export interface IFieldUpdate {
    value: any;
    setByRule?: boolean;
}

export interface IFieldUpdateDictionary {
    [fieldId: string]: IFieldUpdate;
}

export interface ILinkUpdates {
    deletedLinks?: ILinkInfo[];
    updatedLinks?: ILinkInfo[];
    addedLinks?: ILinkInfo[];
}

export interface IWorkItemUpdatePackage {
    id: number;
    rev: number;
    projectId: string;
    tempId?: number;
    isDirty: boolean; //true if it has user changes not rule changes

    fields?: IFieldDataDictionary;
    links?: ILinkUpdates;
    tags?: any;
}

export interface ITag {
    tagId: string;
    name: string;
}

export interface ILinkUpdateResult {
    ExtID?: number;
    LinkType?: number;
    SourceID?: number;
    TargetID?: number;
    ChangedDate?: Date;
    ChangedBy?: number;
    FilePath?: string;
    RemoteHostId?: string;
}

export interface IWorkItemUpdateResult {
    id: number;
    rev: number;
    loadTime: Date;
    tempId?: number;
    state: string;//WorkItemUpdateResultState
    error?: Error;

    fields: IFieldDataDictionary;

    addedLinks: ILinkUpdateResult[];
    deletedLinks: ILinkUpdateResult[];
    updatedLinks: ILinkUpdateResult[];

    tags?: ITag[];

    currentExtensions: string[];
    attachedExtensions: string[];
    detachedExtensions: string[];
}

/**
* Interface to tag additional data on the work item
*/
export interface IWorkItemRelatedData {
}

export interface IWorkItemError extends Error {
    errorCode: number;
    eventId: number;
    fieldReferenceName: string;
    isRemoteException: boolean;
    stack: string;
    type: string;
}

export interface IWorkItemInfoText {
    text: string;

    /**
     * Flag indicating if the info text is an error message
     */
    invalid: boolean;
}

export interface RemoteLinkContext {
    remoteHostId: string;
    remoteProjectId: string;
    remoteHostUrl: string;
    remoteHostName: string;
}

export interface ILinkInfo {
    ID?: number;
    FldID?: number;
    Comment?: string;
    CommentChanged?: boolean;
    Lock?: boolean;
    LockChanged?: boolean;
    AddedDate?: Date;
    RemovedDate?: Date;
    CreationDate?: Date;
    LastWriteDate?: Date;
    OriginalName?: string;
    FilePath?: string;
    Length?: number;
    LinkType?: number;
    ExtID?: number;
    [key: string]: any;
    targetId?: number;
    sourceId?: number;
    command?: string;
    linkData?: ILinkInfo;
    isAddedBySystem?: boolean;
    externalLinkContext?: IExternalLinkedArtifact;
}

export interface IWorkItemData {
    isReadOnly?: boolean;
    projectId: string;
    fields: IFieldDataDictionary;
    revisions: any;
    tags: ITag[];
    files: ILinkInfo[];
    relations?: ILinkInfo[];
    relationRevisions?: ILinkInfo[];
    referencedPersons: IDictionaryNumberTo<WorkItemIdentityRef>;
    tempId: number;
    loadTime: Date;
    currentExtensions: string[]
    referencedNodes: IReferencedNodes;
}

export interface IValueStatus {
    value: any;
    status: number;
    error?: any;
}

export interface IItemGlobalValue {
    items: string[];
    globals?: string[];
}

export interface IItemGlobalValueList {
    allowedValues: IItemGlobalValue[];
    suggestedValues: IItemGlobalValue[];
    prohibitedValues: IItemGlobalValue[];
    allowExistingValue: boolean;
}

export interface IFieldIdValue {
    fieldName: string | number;
    value: any;
}

export interface PendingWorkItem {
    id: number;
    cbQueue: any;
    cookie?: number;
}

export interface IFieldRule {
    fieldId: number;
    rules: FieldRuleType[];
}

export interface IEvalStateValue {
    state: boolean;
    prevValue: any;
    requiresControlUpdate: boolean;
}

export interface IFieldSetValueOptions {

    /**
     * Flag to indicate if a field change event should be fired if the field is updated
     */
    preventFire?: boolean;

    /**
     * Flag to indicate if a server validation call should be fired if the field is updated
     */
    fireIdentityEagerValidation?: boolean;

    /**
     * If set to true mark setByRule=true on the field update
     */
    setByRule?: boolean;

    /**
     *  If set to true the set value is re-evaluated with the rule engine even if it did not change
     */
    forceEvaluate?: boolean;
}

export interface IBeginGetWorkItemsOptions {
    pageSize?: number;
    cancelable?: Cancelable;
    pageOperationCallback?: (workItems: any[]) => void;
    isDeleted?: boolean;
    includeExtensionFields?: boolean;
    retryOnExceedingJsonLimit?: boolean;
    excludeFromUserRecentActivity?: boolean;
}

/**
* The work item cache stamp metadata retrieved from data provider
*/
export interface IWorkItemMetadataCacheData {
    workItemMetadataCacheStamp: IDictionaryStringTo<string>;
    workItemMetadataCacheMaxAgeInDays: number;
    rawWorkItemTypesEtagForCI: string;
}

export interface IWorkItemMetadataLocalStorageData {
    stamp: string;
    timestamp: number;
}

export interface IFieldsToEvaluate {
    projectId: string;
    workItemType: string;
    fields: String[];
    fieldValues: IDictionaryStringTo<any>;
    fieldUpdates: IDictionaryStringTo<any>;
}

export interface IRuleEnginePayload {
    exception: null | {
        customProperties?: IDictionaryStringTo<string>;
        message: string;
    }
}