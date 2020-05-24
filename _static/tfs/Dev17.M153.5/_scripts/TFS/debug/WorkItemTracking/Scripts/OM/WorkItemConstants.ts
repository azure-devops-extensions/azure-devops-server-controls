export namespace ExtensionConstants {
    export const LayoutUserSettingsProvider = "ms.vss-work-web.work-item-layout-user-settings-data-provider";
    export const UnfollowsDataProvider = "ms.vss-work-web.work-item-unfollows-data-provider";
}

export enum ServerDefaultValueType {
    None = 0,
    ServerDateTime = 1,
    CallerIdentity = 2,
    RandomGuid = 3,
}

export enum WorkItemChangeType {
    FieldChange = "field-change",
    PreSave = "pre-save",
    Saving = "saving",
    SaveCompleted = "save-completed",
    Validating = "validating",
    ValidationCompleted = "validation-completed",
    Saved = "saved",
    Opened = "opened",
    Created = "created",
    Refresh = "refresh",
    Reset = "reset",
    ErrorChanged = "error-changed",
    Discarded = "discarded",
    Deleted = "deleted",
    ProjectChanging = "project-changing",
    ProjectChanged = "project-changed",
    TypeChanging = "type-changing",
    TypeChanged = "type-changed",
    // This is particularly for work item changes made outside one workitem to properly update history.
    WorkItemLinkChangedOutside = "workitem-link-updated-outside"
}

export namespace Exceptions {
    export const OperationCanceledException = "VSS.WorkItemTracking.OperationCanceledException";
    export const WorkItemBulkSaveException = "VSS.WorkItemTracking.WorkItemBulkSaveException";
    export const ProjectDoesNotExistException = "VSS.WorkItemTracking.ProjectDoesNotExistException";
    export const FieldDoesNotExistException = "VSS.WorkItemTracking.FieldDoesNotExistException";
    export const LinkTypeEndDoesNotExistException = "VSS.WorkItemTracking.LinkTypeEndDoesNotExistException";
    export const LinkTypeDoesNotExistException = "VSS.WorkItemTracking.LinkTypeDoesNotExistException";
    export const WorkItemSaveFailedDueToInvalidStatusException = "VSS.WorkItemTracking.WorkItemSaveFailedDueToInvalidStatusException";
    export const InvalidQuerySyntaxException = "VSS.WorkItemTracking.InvalidQuerySyntaxException";
    export const InvalidQueryFilterRowException = "VSS.WorkItemTracking.InvalidQueryFilterRowException";
    export const QueryItemAlreadyExistException = "VSS.WorkItemTracking.QueryItemAlreadyExistException";
    export const QueryFolderDoesNotExistException = "VSS.WorkItemTracking.QueryFolderDoesNotExistException";

    export const InvalidOperationException = "System.InvalidOperationException";
}

export enum FieldStatus {
    Valid = 0,
    InvalidEmpty = 1,
    InvalidNotEmpty = 2,
    InvalidFormat = 3,
    InvalidListValue = 4,
    InvalidOldValue = 5,
    InvalidNotOldValue = 6,
    InvalidEmptyOrOldValue = 7,
    InvalidNotEmptyOrOldValue = 8,
    InvalidValueInOtherField = 9,
    InvalidValueNotInOtherField = 10,
    InvalidDate = 11,
    InvalidTooLong = 12,
    InvalidType = 13,
    InvalidComputedField = 14,
    InvalidPath = 15,
    InvalidCharacters = 16,
    InvalidIdentity = 17,
    InvalidUnknown = 18,
}

export enum FieldStatusFlags {
    None = 0,
    AllowsOldValue = 0x40,
    HasFormats = 0x10,
    HasValues = 4,
    InvalidCharacters = 0x20000,
    InvalidComputedField = 0x20000000,
    InvalidDate = 0x2000,
    InvalidEmpty = 0x80000,
    InvalidEmptyOrOldValue = 0x2000000,
    InvalidFormat = 0x200000,
    InvalidID = 0x4000,
    InvalidListValue = 0x400000,
    InvalidMask = 0x7ffff000,
    InvalidNotEmpty = 0x100000,
    InvalidNotEmptyOrOldValue = 0x4000000,
    InvalidNotOldValue = 0x1000000,
    InvalidOldValue = 0x800000,
    InvalidPath = 0x8000,
    InvalidRule = 0x40000,
    InvalidTooLong = 0x10000,
    InvalidType = 0x1000,
    InvalidValueInOtherField = 0x8000000,
    InvalidValueNotInOtherField = 0x10000000,
    LimitedToFormats = 0x20,
    LimitedToValues = 8,
    ReadOnly = 2,
    Required = 1,
    SetByRule = 0x80,
    SetByDefaultRule = 0x100,
    SetByComputedRule = 0x200,
    InvalidIdentityField = 0x40000000,
}

export enum RuleEvaluatorExecutionPhase {
    DefaultRules = 1,
    CopyRules = 2,
    OtherRules = 3,
}

export enum FieldUsages {
    None = 0,
    WorkItem = 1,
    WorkItemLink = 2,
    Tree = 4,
    WorkItemTypeExtension = 8
}

export enum FieldFlags {
    None = 0x0000,
    Sortable = 0x0001,
    Computed = 0x0002,
    Editable = 0x0004,
    Ignored = 0x0008,
    Queryable = 0x0010,
    Reportable = 0x0020,
    PersonField = 0x0040,
    Cloneable = 0x0080,
    LongText = 0x0100,
    SupportsTextQuery = 0x0200,
}

export namespace WorkItemCategoryConstants {
    export const HIDDEN = "Microsoft.HiddenCategory";
    export const TEST_CASE = "Microsoft.TestCaseCategory";
    export const TEST_PLAN = "Microsoft.TestPlanCategory";
    export const TEST_SUITE = "Microsoft.TestSuiteCategory";
    export const TEST_SHAREDSTEP = "Microsoft.SharedStepCategory";
    export const TEST_SHAREDPARAMETER = "Microsoft.SharedParameterCategory";
}

export namespace Actions {
    /// <summary>Values to support WIT related actions</summary>
    export const NEW_PROJECT_DATA = "new-project-data";
    export const DISCUSSION_ADDED = "discussion-added";
    export const RESET_DISCUSSION = "reset-discussion";
    export const RESET_HISTORY = "reset-history";

    export const WORKITEM_DELETED = "workitem-deleted";
    export const WORKITEM_RESTORED = "workitem-restored";
    export const WORKITEM_DESTROYED = "workitem-destroyed";
    export const WORKITEM_DISCARDED = "workitem-discarded";
    export const WORKITEM_ID_UPDATED = "workitem-id-updated";
    export const WORKITEM_COPIED = "workitem-copied";
}

export namespace WorkItemUpdateResultState {
    export const NoResult = "NoResult";
    export const Error = "Error";
    export const Success = "Success";
}

export namespace BugWITFieldReferenceNames {
    export const ReproSteps = "Microsoft.VSTS.TCM.ReproSteps";
}

export namespace PageSizes {
    export const QUERY = 200;
    export const SAVE = 200;
}

export namespace WorkItemPaneMode {
    export const Off = "off";
    export const Right = "right";
    export const Bottom = "bottom";
}
