import RichTextPreRenderUtility = require("WorkItemTracking/Scripts/Utils/RichTextPreRenderUtility");
import Utils_Html = require("VSS/Utils/Html");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WorkItem, Field } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export enum EditActionType {
    None = 0,
    Revision = 1,
    AddAttachment = 2,
    DelAttachment = 3,
    AddHyperLink = 4,
    DelHyperLink = 5,
    AddExternalLink = 6,
    DelExternalLink = 7,
    AddWorkItemLink = 8,
    DelWorkItemLink = 9,
}

export enum EditActionFlags {
    FieldChanges = 0x0001,
    AttachmentChanges = 0x0002,
    HyperLinkChanges = 0x0004,
    ExternalLinkChanges = 0x0008,
    WorkItemLinkChanges = 0x0010,
}

export interface IEditAction {
    index: number;
    type: EditActionType;
    changedDate: Date;
    changedBy: number;
}

export interface IEditActionResult {
    state: string;
    project: string;
    type: string;
    changedByIdentity: WorkItemIdentityRef;
}

export class EditActionSet {

    public actions: IEditAction[];
    public fieldAction: IEditAction;
    public message: string;
    public htmlMessage: string;
    private _plaintextMessage: string;
    public stateChanges: string[];
    public projectChanges: string[];
    public witChanges: string[];
    public assignedToChanged: boolean;
    public authorizedAsIdentity: WorkItemIdentityRef;
    public changedByIdentity: WorkItemIdentityRef;
    public flags: number;
    private _workItemFieldsCache: { [id: number]: Field };

    // This is the set of fields which are used to determine if a revision is 'empty'.  If only fields in this set are changed
    // and there are no link/attachment changes then the revision is considered empty (isEmpty() returns true).
    private static _excludedFields = [
        WITConstants.CoreField.Id,
        WITConstants.CoreField.Rev,
        WITConstants.CoreField.RevisedDate,
        WITConstants.CoreField.AuthorizedDate,
        WITConstants.CoreField.AuthorizedAs,
        WITConstants.CoreField.ChangedBy,
        WITConstants.CoreField.ChangedDate,
        WITConstants.CoreField.Watermark,
        WITConstants.CoreField.AreaPath,        // If area/iteration actually change we will get Area/Iteration Id, these are sent down with all revisions.
        WITConstants.CoreField.IterationPath,
        WITConstants.CoreField.TeamProject,     // Check team project changes separately, team project is sent for each revision.
        WITConstants.DalFields.PersonID,
        WITConstants.CoreField.History,         // This is checked separately since history behaves differently than other fields.
        WITConstants.CoreField.NodeName];

    private static _excludedHash: IDictionaryStringTo<boolean>;

    constructor() {
        this.actions = [];
        this._workItemFieldsCache = {};
    }

    public add(action: IEditAction) {
        // Adding action to the actionSet
        this.actions.push(action);

        if (action.type === EditActionType.Revision) {
            this.fieldAction = action;
        }
    }

    /**
     * @param workItem
     * @param nextRevState State value in the next revision
     * @param nextRevChangedByIdentity Changed By identity value in the next revision
     * @param nextRevProject Project value in the next revision
     * @param nextRevType Work Item Type value in the next revision
     */
    public finalize(workItem: WorkItem, nextRevState: string, nextRevChangedByIdentity: WorkItemIdentityRef, nextRevProject: string, nextRevType: string): IEditActionResult {
        let currentRevState = nextRevState; // In the case this is not a field change, we won't lose the correct state passing on to next action.
        let currentRevProject = nextRevProject;
        let currentRevType = nextRevType;

        const fieldAction = this.fieldAction;

        this.authorizedAsIdentity = workItem.getPerson(this.getChangedBy());

        if (this.fieldsChanged()) {
            const identityRef = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.ChangedBy, this.getRev(), nextRevChangedByIdentity && nextRevChangedByIdentity.identityRef, true);
            const distinctDisplayName = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.ChangedBy, this.getRev(), nextRevChangedByIdentity && nextRevChangedByIdentity.distinctDisplayName, false);
            this.changedByIdentity = {
                distinctDisplayName: distinctDisplayName || "",
                identityRef: identityRef || {} as IdentityRef
            };
        } else {
            this.changedByIdentity = this.authorizedAsIdentity;
        }

        // Determining whether the state, project or type has changed within this actionSet
        if (fieldAction) {
            if (fieldAction.index > 0) {
                currentRevState = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.State, fieldAction.index, nextRevState) || "";
                const lastRevState = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.State, fieldAction.index - 1, currentRevState) || "";

                if (currentRevState !== lastRevState) {
                    this.stateChanges = [lastRevState, currentRevState];
                }

                currentRevProject = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.TeamProject, fieldAction.index, nextRevProject) || "";
                const lastRevProject = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.TeamProject, fieldAction.index - 1, currentRevProject) || "";

                if (currentRevProject !== lastRevProject) {
                    this.projectChanges = [lastRevProject, currentRevProject];
                }

                currentRevType = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.WorkItemType, fieldAction.index, nextRevType) || "";
                const lastRevType = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.WorkItemType, fieldAction.index - 1, currentRevType) || "";

                if (currentRevType !== lastRevType) {
                    this.witChanges = [lastRevType, currentRevType];
                }

                const currentAssignedTo = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.AssignedTo, fieldAction.index, "") || "";
                const lastAssignedTo = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.AssignedTo, fieldAction.index - 1, currentAssignedTo) || "";

                this.assignedToChanged = (currentAssignedTo !== lastAssignedTo);
            }

            // Getting the message if exists
            this.message = workItem.getFieldValueByRevision(WITConstants.CoreField.History, fieldAction.index);
        }

        return {
            state: currentRevState,
            project: currentRevProject,
            type: currentRevType,
            changedByIdentity: this.fieldsChanged() ? this.changedByIdentity : nextRevChangedByIdentity // Only send the changedBy when there's an actual revision here, skip the link only ones (as they are not part of revision history)
        };
    }

    public isEmpty(workItem: WorkItem): boolean {

        if (this.linksChanged() || this.attachmentsChanged() || this.projectChanged() || this.messageAdded()) {
            // The team project field is sent down with each revision unlike other fields.
            // Due to this oddity we add it to the set of _excludedFields and handle the condition where it did actually change here.
            // History is also sent down as 'null' in revisions the come after history is actually changed, so we handle it separately as well.
            return false;
        }

        const fieldAction = this.fieldAction;

        if (!fieldAction) {
            return true;
        }

        // Determine which fields changed, if it's only non-user editable fields then it's an empty revision.
        // work item.  This can happen when comments are updated on an attachment/link.
        if (!EditActionSet._excludedHash) {
            EditActionSet._excludedHash = {};

            // Populating hash to make check faster
            for (const id of EditActionSet._excludedFields) {
                EditActionSet._excludedHash[id] = true;
            }
        }

        const revisions = workItem.getRevisions();

        if (fieldAction.index <= 0) {
            // This is the first revision which is never considered 'empty'
            return false;
        }

        const currentRevision: IDictionaryStringTo<Object> = revisions[fieldAction.index - 1];

        for (const id in currentRevision) {
            if (currentRevision.hasOwnProperty(id)) {
                // Populate work item field cache.
                if (!(id in this._workItemFieldsCache)) {
                    this._workItemFieldsCache[id] = workItem.getField(id);
                }

                // If field is undefined, it is extension field and would qualify for empty, continue checking rest of the ids.
                const field: Field = this._workItemFieldsCache[id];
                if (!field) {
                    continue;
                }

                // If field is history disabled, then it should not appear in history.
                if (field.fieldDefinition.isHistoryEnabled === false) {
                    continue;
                }

                // If field is not from excluded fields (fields to hide) and is not extension field, it is a non-empty field.
                if (!EditActionSet._excludedHash.hasOwnProperty(id) &&
                    !workItem.isExtensionField(field.fieldDefinition)) {
                    return false;
                }
            }
        }

        return true;
    }

    // Be careful with this method.  Despite the name, this method only gets the revision if you are working with
    // a list of actions known to be type===EditActionType.Revision (1).  The "index" on an action (used in this
    // method) is an index into an array.  For more details, see how index is initialized in _populateActions().
    public getRev(): number {
        if (this.actions.length > 0 && this.actions[0].type === EditActionType.Revision) {
            return this.actions[0].index;
        }

        return -1;
    }

    public getChangedDate(): Date {
        if (this.actions.length > 0) {
            return this.actions[0].changedDate;
        }

        return null;
    }

    public getChangedBy(): number {
        if (this.actions.length > 0) {
            return this.actions[0].changedBy;
        }

        return 0;
    }

    public messageAdded(): boolean {
        return this.message && this.message.length > 0;
    }

    public stateChanged(): boolean {
        return this.stateChanges && this.stateChanges.length === 2;
    }

    public projectChanged(): boolean {
        return this.projectChanges && this.projectChanges.length === 2;
    }

    public fieldsChanged(): boolean {
        return this.isChanged(EditActionFlags.FieldChanges);
    }

    public linksChanged(): boolean {
        return this.isChanged(EditActionFlags.ExternalLinkChanges
            | EditActionFlags.HyperLinkChanges
            | EditActionFlags.WorkItemLinkChanges);
    }

    public attachmentsChanged(): boolean {
        return this.isChanged(EditActionFlags.AttachmentChanges);
    }

    public isChanged(type: EditActionFlags): boolean {
        return (this.flags & type) > 0;
    }

    public getActions(typeComparer: (type: EditActionType) => boolean): IEditAction[] {
        const result: IEditAction[] = [];

        for (const action of this.actions) {
            if (typeComparer(action.type)) {
                result.push(action);
            }
        }

        return result;
    }

    public getFieldChanges(): IEditAction[] {
        return this.getActions(type => type === EditActionType.Revision);
    }

    public getLinkChanges(): IEditAction[] {
        return this.getActions(type => type > EditActionType.DelAttachment);
    }

    public getAttachmentChanges(): IEditAction[] {
        return this.getActions(type => type === EditActionType.AddAttachment || type === EditActionType.DelAttachment);
    }

    public attachmentAdded(): boolean {
        return this.getActions(type => type === EditActionType.AddAttachment).length > 0;
    }

    public attachmentDeleted(): boolean {
        return this.getActions(type => type === EditActionType.DelAttachment).length > 0;
    }

    public linkAdded(): boolean {
        return this.getActions(type => type === EditActionType.AddHyperLink || type === EditActionType.AddExternalLink || type === EditActionType.AddWorkItemLink).length > 0;
    }

    public linkDeleted(): boolean {
        return this.getActions(type => type === EditActionType.DelHyperLink || type === EditActionType.DelExternalLink || type === EditActionType.DelWorkItemLink).length > 0;
    }

    public getSafeHtmlMessage(): string {
        if (!this.htmlMessage) {
            if (this.message) {
                this.htmlMessage = RichTextPreRenderUtility.normalizeHtmlValue(this.message);
            } else {
                this.htmlMessage = "";
            }
        }
        return this.htmlMessage;
    }
    public getPlainTextMessage(): string {
        if (!this._plaintextMessage) {
            if (this.message) {
                this._plaintextMessage = Utils_Html.HtmlNormalizer.convertToPlainText(this.message);
            } else {
                this._plaintextMessage = "";
            }
        }

        return this._plaintextMessage;
    }
}
