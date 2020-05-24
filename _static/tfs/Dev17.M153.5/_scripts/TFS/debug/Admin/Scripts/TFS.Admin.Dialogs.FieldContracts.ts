import VSS = require("VSS/VSS");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import WorkItemDialogBase = require("Admin/Scripts/Dialogs/WorkItemDialogBase");

export interface Field extends ProcessContracts.FieldModel {
    isReadOnly ?: boolean;
    isRequired ?: boolean;
    defaultValue ?: string;
    /** Whether this field has already been added  */
    addedToWIT?: boolean;
};

export interface RemoveFieldDialogOptions extends Dialogs.IModalDialogOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    processTypeId: string;
    workItemTypeId: string;
    workItemTypeName: string;
    fieldId: string;
    fieldName: string;
    refresh: () => void;
};

export interface AddFieldDialogOptions extends WorkItemDialogBase.IWorkItemDialogBaseOptions<Field> {
    workItemType: ProcessContracts.ProcessWorkItemType;
    processId: string;
    processName: string;
    processRefName: string;
    /** Called after the field is created */
    refresh: (pageId: string, groupId: string, fieldId: string) => void;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    disableGroup?: boolean;
    hideShowFieldInForm?: boolean;
    focusLayoutTab?: boolean;
    hideLayoutTab?: boolean;
    /** All already used fields **/
    allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData;
    groupId?: string;
    page?: ProcessContracts.Page;
    showRemovedLayoutFields?: boolean;
    sectionId?: string;
    disablePageAndSectionSelection?: boolean;

    // Callback to ensure new nav UI gets notified of updates
    // Must be specified for add control dialog, not needed for show control dialog
    beginAddFieldToWorkItemType: (field: ProcessContracts.AddProcessWorkItemTypeFieldRequest, processId: string, witRefName: string) => IPromise<ProcessContracts.ProcessWorkItemTypeField>;
}

export interface AddControlExtensionDialogOptions extends Dialogs.IModalDialogOptions, IControlExtensionData {
    workItemType: ProcessContracts.ProcessWorkItemType;
    processId: string;
    processName: string;
    processRefName: string;
    controlContributionInputLimit: number;
    /** Called after the field is created */
    refresh: (pageId: string, groupId: string, controlId: string) => void;
    allProcessFields?: AdminProcessContracts.ProcessDefinitionFieldUsageData;
    page?: ProcessContracts.Page;

    // Callback to ensure new nav UI gets notified of updates
    // Must be specified for add field dialog, not needed for edit field dialog
    beginAddFieldToWorkItemType: (field: ProcessContracts.AddProcessWorkItemTypeFieldRequest, processId: string, witRefName: string) => IPromise<ProcessContracts.ProcessWorkItemTypeField>;
}

export interface EditFieldDialogOptions extends AddFieldDialogOptions {
    fieldData: FieldData;
    isInherited?: boolean;
    isRequiredInParent?: boolean;
}

export interface ErrorMessageDialogOptions extends Dialogs.IDialogOptions {
    title: string;
    okText?: string;
}

export interface ConfirmDialogOptions extends Dialogs.IConfirmationDialogOptions {
    dialogTextStrings: string[];
}

export interface AddEditFieldDialogTabItem {
    id: string;
    label: string;
    controls?: string; // tab item will have aria-controls attribute set to this (should be id of what will appear)
    callback: () => void;
    contents: JQuery;
    visible: boolean;
    /** Id for error icon DOM element (exclamation mark at the right of the tab) */
    errorId?: string;
}

export interface FieldData {
    id?: string;
    name: string;
    type?: ProcessContracts.FieldType;
    existing: boolean;
    label: string;
    description?: string;
    order?: number;
    required: boolean;
    default: AdminProcessContracts.IDefault;
    groupName: string;
    groupId: string;
    existingField?: Field;
    isVisibleOnForm: boolean;
    pickListId: string;
    allowGroups?: boolean;
}

export interface IControlExtensionData {
    contributionId: string;
    controlId?: string;
    inputs?: IDictionaryStringTo<Object>;
    label: string;
    groupName?: string;
    groupId: string;
}

//TODO this needs to be blocked in the backend, before APIs public
//These fields are non-editable in Admin page
export var CoreFields: string[] = [
    WITConstants.CoreFieldRefNames.Id,
    WITConstants.CoreFieldRefNames.Title,
    WITConstants.CoreFieldRefNames.State,
    WITConstants.CoreFieldRefNames.AssignedTo,
    WITConstants.CoreFieldRefNames.WorkItemType,
    WITConstants.CoreFieldRefNames.AreaPath,
    WITConstants.CoreFieldRefNames.IterationPath,
    WITConstants.CoreFieldRefNames.ChangedDate,
    WITConstants.CoreFieldRefNames.ChangedBy,
    WITConstants.CoreFieldRefNames.NodeName,
    WITConstants.CoreFieldRefNames.IterationId,
    WITConstants.CoreFieldRefNames.AreaId,
    WITConstants.CoreFieldRefNames.AuthorizedAs,
    WITConstants.CoreFieldRefNames.AuthorizedDate,
    WITConstants.CoreFieldRefNames.Watermark,
    WITConstants.CoreFieldRefNames.History,
    WITConstants.CoreFieldRefNames.Tags
];

//TODO this needs to be blocked in the backend, before APIs public
//Only Layout editable, options locked
export var OtherCoreFields: string[] = [
    WITConstants.CoreFieldRefNames.TeamProject,
    WITConstants.CoreFieldRefNames.Rev,
    WITConstants.CoreFieldRefNames.Reason,
    WITConstants.CoreFieldRefNames.CreatedBy,
    WITConstants.CoreFieldRefNames.CreatedDate,
    WITConstants.CoreFieldRefNames.AttachedFileCount,
    WITConstants.CoreFieldRefNames.ExternalLinkCount,
    WITConstants.CoreFieldRefNames.HyperLinkCount,
    WITConstants.CoreFieldRefNames.RelatedLinkCount,
    WITConstants.CoreFieldRefNames.BoardColumn,
    WITConstants.CoreFieldRefNames.BoardColumnDone,
    WITConstants.CoreFieldRefNames.BoardLane
];

VSS.tfsModuleLoaded("TFS.Admin.Dialogs.FieldContracts", exports)
