/**
 * @file Contains interfaces shared across backlog levels controls
 */
import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";

export interface IWorkItemType {
    processId: string;
    id: string;
    name: string;
    customization: ProcessContracts.CustomizationType;
    color: string;
    icon: string;
    description: string;
    inherits: string;
    isDefault: boolean;
    isDisabled: boolean;
    isCustom: boolean; /* allow changing backlog level for only custom wit */
    isBug: boolean;
    isTask: boolean;
}

export enum BacklogLevelType {
    Portfolio,
    Requirements,
    Tasks,
    Unmapped
}

export interface IBacklogLevel {
    id: string;
    name: string;
    color: string;
    type: BacklogLevelType;
    workItemTypes: IWorkItemType[];
    isCustom: boolean;
    fields: { id: string, name: string }[];
}

export enum BacklogLevelGroupType {
    Portfolio,
    Requirements,
    Tasks,
    Unmapped
}

export interface IPermission {
    value: boolean;
    reason?: string;
}

export interface IBacklogLevelGroup {
    name: string;
    description: string;
    type: BacklogLevelGroupType;
    backlogLevels: IBacklogLevel[];
    addBacklogLevelPermission: IPermission;
    contextMenu?: IContextMenuData;
}


export enum BacklogLevelOperation {
    FetchHierarchy,
    DeleteBacklogLevel
}

export interface IBacklogLevelError {
    operation: BacklogLevelOperation;
    backlogLevel: IBacklogLevel;
    errors: Error[];
}

export interface IBacklogLevelHierarchy {
    groups: IBacklogLevelGroup[];
    unmappedWorkItemTypes: IWorkItemType[]; //unmapped work items (include bug wit?)
    fieldsMap: IDictionaryStringTo<string>; //Map of field id to name
    defaultFieldNames: string[];
}

export interface IUserAddedWorkItemType {
    name: string;
    color: string;
    icon: string;
}

export interface IDialogWorkItemType {
    id: string;
    name: string;
    color: string;
    icon: string;
    isDefault: boolean;
    isSelected: boolean;
    // The work item type is disabled or not (this does not mean the checkbox is disabled or not)
    isDisabled: boolean;
    isCustom: boolean;
}

export enum DialogMode {
    AddEdit,
    Delete,
    Reset
}

export interface IDialogState {
    groupName: string; // Name of the group under which the backlog level resides e.g. Portfolio backlogs
    backlogLevel: IBacklogLevel;
    mode: DialogMode;

    name: string; // used for both backlog and work item type
    color: string; // used for both backlog and work item type
    icon?: string; // used only when creating a new work item type

    workItemTypes: IDialogWorkItemType[];
    newWorkItemTypes: IDialogWorkItemType[]; // New work item types that are not saved at server yet.
    userAddedWorkItemType: IUserAddedWorkItemType; // Stores work item type info for the work item type in edit backlog dialog that is being created when user clicks on New Work Item Type button

    isLoading: boolean;
    showCancelConfirmation: boolean;
    errors: Error[];

    validationError: string;
    isDirty: boolean;

    defaultFieldNames: string[];
}

export interface IMessageDialogData {
    title: string;
    message: string;
}

export interface IBacklogLevelsComponentState {
    processId: string;
    canEdit: boolean; /** used for globally controlling edit behavior e.g. for system process disable everything */
    isInherited: boolean;
    hierarchy: IBacklogLevelHierarchy;
    error?: IBacklogLevelError;
    isLoading: boolean;
    dialogState: IDialogState;
    messageDialog?: IMessageDialogData;
}

export interface ISetDefaultWorkItemTypePayload {
    name: string;
    referenceName?: string;
    isClientOnlyWorkItemType: boolean;
}

export interface IWorkItemTypeSelectionChangedPayload {
    name: string;
    id?: string;
    isClientOnlyWorkItemType: boolean;
    isSelected: boolean;
}

export interface IWorkItemTypeAssociationPayload {
    backlogId: string;
    workItemTypeReferenceName: string;
}

export interface IEndBacklogLevelSavePayload {
    id: string,
    errors: Error[]
}

export interface IBehaviorUpdatedPayload {
    id: string;
    name: string;
    color: string;
}

export interface IEditBacklogLevelPayload {
    backlogLevel: IBacklogLevel;
    groupName: string;
}

export interface IProcessDescriptor {
    processTypeId: string,
    isInherited: boolean,
    inherits: string,
    canEdit: boolean,
}

export interface IContextMenuData {
    groupType: BacklogLevelGroupType;
    level: IBacklogLevel;
    // The event that triggered the context menu
    event: Event;
}