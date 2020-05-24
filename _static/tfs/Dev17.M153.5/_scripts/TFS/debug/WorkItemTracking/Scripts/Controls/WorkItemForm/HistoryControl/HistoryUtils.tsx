import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Culture = require("VSS/Utils/Culture");
import Diag = require("VSS/Diag");
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import RichTextPreRenderUtility = require("WorkItemTracking/Scripts/Utils/RichTextPreRenderUtility");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import {
    LinkChange, LinkChangeType, LinkCategory, IResolvedLink, ILinkChanges, HistoryGroupId,
    IFieldChange, IFieldChanges, IHistoryItemSummary, IAttachmentChanges
} from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HostArtifactAdditionalData, IHostArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { EditActionSet, EditActionType, IEditAction } from "WorkItemTracking/Scripts/OM/History/EditActionSet";

export class KeyCodes {
    public static TAB = 9;
    public static ENTER = 13;
    public static LEFT = 37;
    public static UP = 38;
    public static RIGHT = 39;
    public static DOWN = 40;
    public static END = 35;
    public static HOME = 36;
    public static PAGE_DOWN = 34;
    public static PAGE_UP = 33;
}


export interface IFieldValueChange {
    isChanged: boolean,
    oldValue: any,
    newValue: any
}

export interface ITagsDiff {
    common: string[],
    added: string[],
    removed: string[]
}

export interface IChangedByDetails {
    changedByDisplayName: string;
    authorizedAsDisplayName?: string;
    fullChangedByDisplayName: string;
    hasValidImpersonation: boolean;
}

export class HistoryUtils {
    private static _dateStringMap: IDictionaryNumberTo<string>;
    private static _dateFormatMap: IDictionaryNumberTo<string>;
    public static relationlink: string = "relationlink";
    public static resourcelink: string = "resourcelink";

    private static TAGS_DELIMITER: string = "; ";

    private static _linkMap: IDictionaryStringTo<string> = {
        "HyperLink": WorkItemTrackingResources.HyperLinkText,
        "WorkItemLink": WorkItemTrackingResources.WorkItemLinkText,
        "ExternalLink": WorkItemTrackingResources.ExternalLinkText
    };

    private static _suppressedFieldsForFirstRevision: string[] = [
        WITConstants.CoreFieldRefNames.BoardColumn,
        WITConstants.CoreFieldRefNames.BoardColumnDone,
        WITConstants.CoreFieldRefNames.CreatedBy,
        WITConstants.OobFieldRefNames.ActivatedBy
    ];

    public static getFriendlyLinkType(baseLinkType: string): string {
        return baseLinkType in HistoryUtils._linkMap ? HistoryUtils._linkMap[baseLinkType] : WorkItemTrackingResources.LinkText;
    }

    public static getHistoryGroupId(revisionDate: Date, from: Date): HistoryGroupId {
        let revisionDay = new Date(revisionDate.getTime());
        revisionDay.setHours(0, 0, 0, 0);

        let sameDay = new Date(from.getTime());
        sameDay.setHours(0, 0, 0, 0);

        if (revisionDay.getTime() >= sameDay.getTime()) {
            return HistoryGroupId.Today;
        }

        let yesterday = Utils_Date.addDays(sameDay, -1, true);

        if (revisionDay >= yesterday) {
            return HistoryGroupId.Yesterday;
        }

        let sevenDaysAgo = Utils_Date.addDays(sameDay, -7, true);

        if (revisionDay >= sevenDaysAgo) {
            return HistoryGroupId.LastSevenDays;
        }

        let thirtyDaysAgo = Utils_Date.addDays(sameDay, -30, true);

        if (revisionDay >= thirtyDaysAgo) {
            return HistoryGroupId.LastThirtyDays;
        }

        return HistoryGroupId.Older;
    }

    public static getTagsDiff(oldTags: string, newTags: string): ITagsDiff {
        let newTagsList: string[] = newTags ? newTags.split(HistoryUtils.TAGS_DELIMITER) : [];
        let oldTagsList: string[] = oldTags ? oldTags.split(HistoryUtils.TAGS_DELIMITER) : [];

        let commonTags = Utils_Array.intersect(newTagsList, oldTagsList);
        let addedTags = Utils_Array.subtract(newTagsList, commonTags);
        let removedTags = Utils_Array.subtract(oldTagsList, commonTags);
        return { common: commonTags, added: addedTags, removed: removedTags };
    }

    public static getFieldChange(revision: number, fieldId: number, workItem: WITOM.WorkItem): IFieldValueChange {
        let changed = false;
        let newVal = undefined;
        let oldVal = undefined;

        let fieldDef = workItem.fieldMapById[fieldId];
        if (fieldDef && fieldDef.isChangedInRevision(revision)) {
            changed = true;
            newVal = workItem.getFieldValueByRevision(fieldId, revision);
        }

        if (fieldDef && revision > 0 && fieldDef.isChangedInRevision(revision - 1)) {
            oldVal = workItem.getFieldValueByRevision(fieldId, revision - 1);
        }

        return { isChanged: changed, newValue: newVal, oldValue: oldVal };
    }

    public static getHistoryGroupText(dateBucket: HistoryGroupId): string {
        HistoryUtils._initDateStringMap();

        Diag.Debug.assert(!!HistoryUtils._dateStringMap[dateBucket], "unexpected date bucket");
        return HistoryUtils._dateStringMap[dateBucket];
    }

    public static getHistoryGroupDateString(revisionDate: Date, dateBucket: HistoryGroupId): string {
        HistoryUtils._initDateFormatMap();

        Diag.Debug.assert(!!HistoryUtils._dateFormatMap[dateBucket], "unexpected date bucket");
        let dateFormat = HistoryUtils._dateFormatMap[dateBucket];

        return Utils_Date.localeFormat(revisionDate, dateFormat);
    }

    public static getRevisionSummary(workItem: WITOM.WorkItem, action: EditActionSet, removeFormatting?: boolean): IHistoryItemSummary {
        let changes = [],
            displayedChanges = [],
            isRestore: boolean,
            isDelete: boolean;

        let fieldMessage = "";
        let result: IHistoryItemSummary = {
            changedByIdentity: null,
            changes: [],
            changedBy: null,
            changedDate: null,
            comment: null,
            userSubjectLine: null
        }

        if (action.fieldsChanged()) {
            if (action.getRev() === 0) {
                // Work Item created
                // Ensure to pick the workitem type from the right revision, as the type might have got changed later
                let workItemTypeName = workItem.getFieldValueByRevision(WITConstants.CoreField.WorkItemType, 0) || workItem.workItemType.name;
                changes.push({ order: 10, message: Utils_String.format(WorkItemTrackingResources.WorkItemLogControlCreatedWorkItem, workItemTypeName) });
            }
            else {
                // Work item fields changed
                fieldMessage = this._getFieldsChangeMessage(workItem, action);

                if (action.projectChanges) {
                    // Team project changed
                    changes.push({ order: 20, highlight: true, message: Utils_String.format(WorkItemTrackingResources.WorkItemLogControlProjectChange, action.projectChanges[0], action.projectChanges[1]) });
                }
                else if (action.witChanges) {
                    // Workitem type changed
                    changes.push({ order: 20, highlight: true, message: Utils_String.format(WorkItemTrackingResources.WorkItemLogControlWorkItemTypeChange, action.witChanges[0], action.witChanges[1]) });
                }
                else if (action.stateChanges) {
                    let itemText;
                    let formattedText;

                    // State changed specifically
                    itemText = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlStateChange, action.stateChanges[0], action.stateChanges[1]);

                    let newState = action.stateChanges[1];
                    let newStateCircle = WITHelpers.WITStateCircleColors.getSpanForState(newState, workItem.workItemType) + newState;

                    let oldState = action.stateChanges[0];
                    let oldStateCircle = WITHelpers.WITStateCircleColors.getSpanForState(oldState, workItem.workItemType) + oldState;

                    formattedText = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlStateChange, oldStateCircle, newStateCircle);
                    changes.push({ order: 20, highlight: true, message: itemText, formattedMessage: formattedText });
                }
                else {
                    // Check for IsDeleted field changed
                    let revision = action.getRev();
                    let isDeletedFieldDef = workItem.fieldMapById[WITConstants.CoreField.IsDeleted];
                    let changedInRev = isDeletedFieldDef && isDeletedFieldDef.isChangedInRevision(revision);
                    if (changedInRev) {
                        // IsDeleted field is changed.
                        fieldMessage = "";
                        let value = workItem.getFieldValueByRevision(WITConstants.CoreField.IsDeleted, revision);
                        if (value) {
                            // Work item deleted
                            changes.push({ order: 10, message: WorkItemTrackingResources.WorkItemLogControlDeletedWorkItem });
                            isDelete = true;
                        }
                        else {
                            // Work item restored
                            isRestore = true;
                            changes.push({ order: 10, message: WorkItemTrackingResources.WorkItemLogControlRestoredWorkItem });
                        }
                    }
                }
            }
        }

        if (action.attachmentAdded()) {
            changes.push({ order: 50, message: WorkItemTrackingResources.WorkItemLogControlAttachmentAdded });
        }
        if (action.attachmentDeleted()) {
            changes.push({ order: 60, message: WorkItemTrackingResources.WorkItemLogControlAttachmentDeleted });
        }

        if (action.linkAdded() || action.linkDeleted()) {
            if (isRestore) {
                changes.push({
                    order: 70,
                    message: WorkItemTrackingResources.WorkItemLogControlLinkRestored
                });
            }
            else if (isDelete) {
                changes.push({
                    order: 70,
                    message: Utils_String.format(WorkItemTrackingResources.WorkItemLogControlLinkDeleted, "")
                });
            }
            else {
                let linkChanges = action.getLinkChanges();

                linkChanges.forEach((change) => {
                    let isAdd;
                    let isWorkItemLink;
                    switch (change.type) {
                        case EditActionType.AddHyperLink:
                        case EditActionType.AddExternalLink: isAdd = true; break;
                        case EditActionType.AddWorkItemLink: isAdd = true; isWorkItemLink = true; break;
                        case EditActionType.DelHyperLink:
                        case EditActionType.DelExternalLink: break;
                        case EditActionType.DelWorkItemLink: isWorkItemLink = true; break;
                        default: Diag.Debug.fail("Invalid link change type: " + change.type);
                    }

                    // Workitem Add = 65, Other Add = 70, WorkItem Delete=75, Other Delete=80
                    let orderValue = isAdd ? 70 : 80;
                    orderValue = isWorkItemLink ? orderValue - 5 : orderValue;

                    let messagePattern = isAdd ? WorkItemTrackingResources.WorkItemLogControlLinkAdded : WorkItemTrackingResources.WorkItemLogControlLinkDeleted;
                    let messageValue = isWorkItemLink ? Utils_String.format(messagePattern, HistoryUtils._getWorkItemLinkType(workItem, change) + " ") : Utils_String.format(messagePattern, "");

                    changes.push({
                        order: orderValue,
                        message: messageValue
                    });
                });
            }
        }

        if (action.message) {
            changes.push({ order: 30, message: WorkItemTrackingResources.WorkItemLogControlAddedComment });
        }

        changes.sort(function (c1, c2) {
            return c1.order - c2.order;
        });

        // Remove duplicate changes (same type of link change)
        changes = changes.filter((change, index) => { return index === 0 || (change.order !== changes[index - 1].order || change.message !== changes[index - 1].message); });

        // If there's work item link change and other link change, change 'added link' => 'added other link'
        for (let i = 1; i < changes.length; i++) {
            if (changes[i].order === 70 && changes[i - 1].order === 65) {
                changes[i].message = WorkItemTrackingResources.WorkItemLogControlOtherLinkAdded;
            }
            else if (changes[i].order === 80 && changes[i - 1].order === 75) {
                changes[i].message = WorkItemTrackingResources.WorkItemLogControlOtherLinkDeleted;
            }
        }

        let maxChangesToShow = 3;
        displayedChanges = changes.slice(0, maxChangesToShow);

        // If there is more than max-to-display actions, displaying "made other changes"
        if (changes.length > maxChangesToShow) {
            displayedChanges.push({ message: WorkItemTrackingResources.WorkItemLogControlMadeOtherChanges });
        }
        else if (fieldMessage !== "") {
            if (displayedChanges.length !== 0 && fieldMessage === WorkItemTrackingResources.WorkItemLogControlMadeChanges) {
                displayedChanges.push({ message: WorkItemTrackingResources.WorkItemLogControlMadeOtherChanges });
            }
            else {
                displayedChanges.push({ message: fieldMessage });
            }
        }
        result.changedByIdentity = action.changedByIdentity.identityRef;
        result.changedBy = action.changedByIdentity.distinctDisplayName;
        result.changes = displayedChanges;
        result.changedDate = action.getChangedDate();

        if (action.message && removeFormatting) {
            result.comment = action.getPlainTextMessage();
        }
        else {
            result.comment = action.getSafeHtmlMessage();
        }

        result.userSubjectLine = HistoryUtils.getUserSubject(action, removeFormatting);

        return result;
    }

    public static _getWorkItemLinkType(workItem: WITOM.WorkItem, action: IEditAction) {
        let typeString = "";
        let linkInfo = workItem.allLinks[action.index];
        if (linkInfo) {
            if (action.type === EditActionType.AddWorkItemLink || action.type == EditActionType.DelWorkItemLink) {
                let linkTypeEnd = workItem.store.findLinkTypeEnd(linkInfo.linkData.LinkType);
                if (linkTypeEnd) {
                    typeString = linkTypeEnd.name;
                }
            }
        }

        return typeString;
    }

    public static processImages($container: JQuery) {
        let $images: JQuery = $container.find("img");
        if ($images.length > 0) {
            $images.each(function () {
                let $this = $(this);
                $this.addClass("work-item-history-image-scale");
                let src = $this.attr("src");
                let a = $("<a/>").attr("href", src).attr("target", "_blank");
                $this.wrap(a);
            });
        }
    }

    public static renderMessageContent(content: string, $container: JQuery, enableContactCard: boolean = true) {
        RichTextPreRenderUtility.richTextFilterContent(content).then((filteredContent) => {
            $container.html(filteredContent);
            HistoryUtils.processImages($container);
            RichTextPreRenderUtility.richTextPreRenderProcessor($container, enableContactCard);
        });
    }

    public static getUserSubject(actionSet: EditActionSet, hideFormatting?: boolean): string {
        const changedByDetails = HistoryUtils.getChangedByDetails(actionSet);
        const styleFormat = "<b>{0}</b>";

        let changedBy = changedByDetails.changedByDisplayName;
        let authorizedAs = changedByDetails.authorizedAsDisplayName;
        if (!hideFormatting) {
            changedBy = Utils_String.format(styleFormat, changedBy);
            authorizedAs = Utils_String.format(styleFormat, authorizedAs);
        }

        if (changedByDetails.hasValidImpersonation) {
            return Utils_String.format(WorkItemTrackingResources.WorkItemLogControlUserViaUser, changedBy, authorizedAs);
        }

        return changedBy;
    }

    public static getChangedByDetails(actionSet: EditActionSet): IChangedByDetails {
        const changedByDisplayName = actionSet.changedByIdentity.identityRef.displayName;
        const authorizedAsDisplayName = actionSet.authorizedAsIdentity.identityRef.displayName;

        if (Utils_String.ignoreCaseComparer(actionSet.changedByIdentity.distinctDisplayName, actionSet.authorizedAsIdentity.distinctDisplayName) === 0) {
            return {
                hasValidImpersonation: false,
                changedByDisplayName: changedByDisplayName,
                authorizedAsDisplayName: changedByDisplayName, // use the resolved display name (authorized as and changed by are the same)
                fullChangedByDisplayName: changedByDisplayName
            };
        }

        const hasValidImpersonation = authorizedAsDisplayName != null && authorizedAsDisplayName.length > 0;
        return {
            hasValidImpersonation: hasValidImpersonation,
            changedByDisplayName: changedByDisplayName,
            authorizedAsDisplayName: authorizedAsDisplayName,
            fullChangedByDisplayName: hasValidImpersonation ?
                Utils_String.format(WorkItemTrackingResources.WorkItemLogControlUserViaUser, changedByDisplayName, authorizedAsDisplayName) :
                changedByDisplayName
        };
    }

    public static getHostArtifact(workItem: WITOM.WorkItem): IHostArtifact {
        if (workItem.isNew() || workItem.isDeleted()) {
            return null;
        }

        return {
            id: workItem.id.toString(),
            tool: Artifacts_Constants.ToolNames.WorkItemTracking,
            type: Artifacts_Constants.ArtifactTypeNames.WorkItem,
            additionalData: {
                [HostArtifactAdditionalData.ProjectName]: workItem.project.name,
                [HostArtifactAdditionalData.ProjectId]: workItem.project.id
            }
        };
    }

    public static getLinkChanges(workItem: WITOM.WorkItem, resolvedLinks: IResolvedLink[]): ILinkChanges {
        if (!resolvedLinks) {
            return null;
        }

        let linkChanges: ILinkChanges = {
            resourceLinkAdds: [],
            resourceLinkDeletes: [],
            relationLinkAdds: [],
            relationLinkDeletes: []
        };

        for (let resolvedLink of resolvedLinks) {
            let linkInfo = resolvedLink.link;

            let link: LinkChange = {
                resolvedLink: resolvedLink,
                linkTypeName: LinkingUtils.getLinkTypeName(linkInfo),
                changeType: LinkChangeType.Unknown,
                category: LinkCategory.Unknown
            };

            switch (resolvedLink.editAction.type) {
                case EditActionType.DelHyperLink:
                case EditActionType.DelExternalLink:
                case EditActionType.DelWorkItemLink:
                    link.changeType = LinkChangeType.Delete;
                    break;

                case EditActionType.AddHyperLink:
                case EditActionType.AddExternalLink:
                case EditActionType.AddWorkItemLink:
                    link.changeType = LinkChangeType.Create;
                    break;

                default:
                    Diag.Debug.fail("Invalid change type for link " + resolvedLink.editAction.type);
            }

            switch (resolvedLink.editAction.type) {
                case EditActionType.AddHyperLink:
                case EditActionType.DelHyperLink:
                case EditActionType.AddExternalLink:
                case EditActionType.DelExternalLink:
                    link.category = LinkCategory.Resource;
                    break;
                case EditActionType.AddWorkItemLink:
                case EditActionType.DelWorkItemLink:
                    link.category = LinkCategory.Relation;
                    break;
                default:
                    Diag.Debug.fail("Invalid change type for link/attachments: " + resolvedLink.editAction.type);
            }

            if (link.changeType === LinkChangeType.Delete
                && link.category === LinkCategory.Resource)
                linkChanges.resourceLinkDeletes.push(link);

            else if (link.changeType === LinkChangeType.Delete
                && link.category === LinkCategory.Relation)
                linkChanges.relationLinkDeletes.push(link);

            else if (link.category === LinkCategory.Resource)
                linkChanges.resourceLinkAdds.push(link);

            else if (link.category === LinkCategory.Relation)
                linkChanges.relationLinkAdds.push(link);
        }

        function linkComparator(c1: LinkChange, c2: LinkChange): number {
            return c1.linkTypeName > c2.linkTypeName ? 1 : (c1.linkTypeName < c2.linkTypeName ? -1 : 0);
        }

        linkChanges.relationLinkAdds.sort(linkComparator);
        linkChanges.relationLinkDeletes.sort(linkComparator);
        linkChanges.resourceLinkAdds.sort(linkComparator);
        linkChanges.relationLinkDeletes.sort(linkComparator);
        return linkChanges;
    }

    public static getAttachmentChanges(workItem: WITOM.WorkItem, actionSet: EditActionSet): IAttachmentChanges {
        if (workItem && actionSet) {
            let i,
                len,
                change,
                attachmentInfo: WITOM.Attachment;

            let attachmentChanges: IAttachmentChanges = {
                attachmentAdds: [],
                attachmentDeletes: []
            };
            let workItemAttachmentChanges = actionSet.getAttachmentChanges();
            if (workItemAttachmentChanges) {
                for (i = 0, len = workItemAttachmentChanges.length; i < len; i++) {
                    change = workItemAttachmentChanges[i];
                    attachmentInfo = workItem.allLinks[change.index] as WITOM.Attachment;
                    if (change.type === EditActionType.DelAttachment)
                        attachmentChanges.attachmentDeletes.push(attachmentInfo);
                    else
                        attachmentChanges.attachmentAdds.push(attachmentInfo);
                }
            }
            return attachmentChanges;
        }
    }

    public static getFieldChanges(workItem: WITOM.WorkItem, actionSet: EditActionSet): IFieldChanges {

        let fieldChanges: IFieldChanges = {
            coreAndCustomFieldChanges: [],
            htmlFieldChanges: [],
            plainTextFieldChanges: []
        };

        if (actionSet && actionSet.fieldAction) {
            let field: WITOM.Field;
            let i, changedInRev, value, originalValue;
            let revision = actionSet.fieldAction.index;

            let isDeletedFieldDef = workItem.fieldMapById[WITConstants.CoreField.IsDeleted];
            let isDeleteOrRestore = isDeletedFieldDef && isDeletedFieldDef.isChangedInRevision(revision);

            for (i = 0, length = workItem.fields.length; i < length; i++) {
                field = workItem.fields[i];

                if (HistoryUtils.isHistoryField(field, revision, isDeleteOrRestore)
                    && (field.fieldDefinition.isQueryable() || field.fieldDefinition.id === WITConstants.CoreField.IsDeleted)
                    && !(revision == 0 && HistoryUtils._suppressedFieldsForFirstRevision.indexOf(field.fieldDefinition.referenceName) > -1)) {

                    changedInRev = field.isChangedInRevision(revision);
                    if (!changedInRev && typeof (changedInRev) !== "boolean") {
                        value = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision);
                        originalValue = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision - 1);
                        changedInRev = value !== originalValue;
                    }

                    if (changedInRev) {

                        if (WITOM.Field.isLongTextField(field.fieldDefinition.type) && field.fieldDefinition.referenceName !== WITConstants.CoreFieldRefNames.Tags) {

                            if (field.fieldDefinition.type === WITConstants.FieldType.Html) {
                                addChangeToList(fieldChanges.htmlFieldChanges, field, revision);
                            }

                            else {
                                Diag.Debug.assert(field.fieldDefinition.type === WITConstants.FieldType.PlainText);

                                addChangeToList(fieldChanges.plainTextFieldChanges, field, revision);
                            }

                        } else {
                            if (field.fieldDefinition.referenceName !== WITConstants.CoreFieldRefNames.Rev) {

                                addChangeToList(fieldChanges.coreAndCustomFieldChanges, field, revision);

                            }
                        }
                    }
                }
            }



            fieldChanges.coreAndCustomFieldChanges.sort(fieldNameComparator);
            fieldChanges.htmlFieldChanges.sort(fieldNameComparator);
            fieldChanges.plainTextFieldChanges.sort(fieldNameComparator);
        }

        function getOrder(field: WITOM.Field): number {
            switch (field.fieldDefinition.referenceName) {
                case WITConstants.CoreFieldRefNames.Title: return 10;
                case WITConstants.CoreFieldRefNames.AssignedTo: return 20;
                case WITConstants.CoreFieldRefNames.State: return 30;
                case WITConstants.CoreFieldRefNames.Reason: return 40;
                case WITConstants.CoreFieldRefNames.BoardColumn: return 50;
                case WITConstants.CoreFieldRefNames.BoardColumnDone: return 60;
                case WITConstants.CoreFieldRefNames.BoardLane: return 70;
                case WITConstants.CoreFieldRefNames.AreaPath: return 80;
                case WITConstants.CoreFieldRefNames.IterationPath: return 90;
                case WITConstants.CoreFieldRefNames.TeamProject: return 100;
                case WITConstants.CoreFieldRefNames.WorkItemType: return 110;
                case WITConstants.CoreFieldRefNames.Tags: return 120;
                case WITConstants.CoreFieldRefNames.IsDeleted: return 130;
                default: return -1;
            }
        }

        function fieldNameComparator(c1: IFieldChange, c2: IFieldChange): number {
            return c1.name > c2.name ? 1 : (c1.name < c2.name ? -1 : 0);
        }

        function addChangeToList(changeList: IFieldChange[], field: WITOM.Field, revision: number) {
            const rawOldValue = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision - 1);
            const rawNewValue = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision);

            let change: IFieldChange = {
                referenceName: field.fieldDefinition.referenceName,
                name: field.fieldDefinition.name,
                order: getOrder(field),
                oldValue: HistoryUtils.formatFieldValueText(field, rawOldValue, true),
                newValue: HistoryUtils.formatFieldValueText(field, rawNewValue, true),
                rawOldValue: rawOldValue,
                rawNewValue: rawNewValue
            };

            changeList.push(change);
        }

        return fieldChanges;
    }

    public static getFieldValueText(field, rev, formatIdentityValue: boolean = true) {
        let result = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, rev);

        HistoryUtils.formatFieldValueText(field, result, formatIdentityValue);
    }

    public static formatFieldValueText(field, result, formatIdentityValue: boolean = true) {
        let fieldType = field.fieldDefinition.type;

        if (WITOM.Field.isEmpty(result)) {
            result = "";
        }
        else {
            if (fieldType === WITConstants.FieldType.DateTime) {
                result = Utils_Date.localeFormat(result, "F");
            }
            else if (formatIdentityValue && field.fieldDefinition.isIdentity && result) {
                result = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(result).displayName;
            }
            else if (fieldType === WITConstants.FieldType.Boolean) {
                // use !! to handle 1/0 case
                result = Utils_Core.convertValueToDisplayString(!!result);
            }
            else if (fieldType === WITConstants.FieldType.Html) {
                result = RichTextPreRenderUtility.normalizeHtmlValue(result);
            }
            else {
                result = "" + result;
            }
        }

        return result;
    }

    public static isHistoryField(field: WITOM.Field, revision: number, isDeleteOrRestoreAction: boolean) {
        let val;

        if (!field.fieldDefinition) {
            return false;
        }

        if (isDeleteOrRestoreAction) {
            // for delete or restore history, hides all field except for rev and IsDeleted
            return field.fieldDefinition.id === WITConstants.CoreField.Rev || field.fieldDefinition.id === WITConstants.CoreField.IsDeleted
        }

        switch (field.fieldDefinition.id) {
            case WITConstants.CoreField.Id:
            case WITConstants.CoreField.IsDeleted:
            case WITConstants.CoreField.History:
            case WITConstants.CoreField.ChangedDate:
            case WITConstants.CoreField.CreatedDate:
            case WITConstants.CoreField.RevisedDate:
            case WITConstants.CoreField.ChangedBy:
            case WITConstants.CoreField.AuthorizedAs:
            case WITConstants.CoreField.AuthorizedDate:
            case WITConstants.CoreField.Watermark:
            case WITConstants.DalFields.PersonID:
            // disable all counts
            case WITConstants.CoreField.RelatedLinkCount:
            case WITConstants.CoreField.HyperLinkCount:
            case WITConstants.CoreField.ExternalLinkCount:
            case WITConstants.CoreField.AttachedFileCount:
            case WITConstants.CoreField.CommentCount:
            case WITConstants.CoreField.AreaId:
            case WITConstants.CoreField.IterationId:
            case WITConstants.CoreField.NodeName:
                return false;
        }

        if ((field.fieldDefinition.isCoreField() || field.fieldDefinition.isoobfield())
            && field.fieldDefinition.type === WITConstants.FieldType.DateTime) {

            // For our date fields we only want to show field in history if they are NOT the same as the current revision's authorized date.
            // This is because there are several fields (like changed date, state changed date, created date, activated date, resolved date, etc)
            // which are pointless to show because they are set by a rule and are always the same as the authorized date.
            const newValue = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision) as Date;
            const authorizedDate = field.workItem.getFieldValueByRevision(WITConstants.CoreField.AuthorizedDate, revision) as Date;

            Diag.Debug.assert(authorizedDate instanceof Date, "authorized date should always be a date");

            if (newValue instanceof Date && newValue.getTime() === authorizedDate.getTime()) {
                return false;
            }
        }

        if (field.workItem.isExtensionField(field.fieldDefinition)) {
            return false;
        }

        if (field.fieldDefinition.isHistoryEnabled === false) {
            return false;
        }

        if (revision === 0) {
            val = field.workItem.getFieldValueByRevision(field.fieldDefinition.id, revision);
            if (WITOM.Field.isEmpty(val)) {
                return false;
            }
        }

        return true;
    }

    private static _initDateStringMap() {
        if (!HistoryUtils._dateStringMap) {
            let dateMap: IDictionaryNumberTo<string> = {};

            dateMap[HistoryGroupId.Today] = WorkItemTrackingResources.HistoryControlAgoToday;
            dateMap[HistoryGroupId.Yesterday] = WorkItemTrackingResources.HistoryControlAgoYesterday;
            dateMap[HistoryGroupId.LastSevenDays] = WorkItemTrackingResources.HistoryControlAgoLastSevenDays;
            dateMap[HistoryGroupId.LastThirtyDays] = WorkItemTrackingResources.HistoryControlAgoLastThirtyDays;
            dateMap[HistoryGroupId.Older] = WorkItemTrackingResources.HistoryControlAgoOlder;

            HistoryUtils._dateStringMap = dateMap;
        }
    }

    private static _initDateFormatMap() {
        if (!HistoryUtils._dateFormatMap) {
            let culture = Culture.getCurrentCulture();
            let dtf = culture.dateTimeFormat;

            let dateMap: IDictionaryNumberTo<string> = {};

            dateMap[HistoryGroupId.Today] = "t";
            dateMap[HistoryGroupId.Yesterday] = "ddd " + dtf.ShortTimePattern;
            
            // For US just show the month/day 
            // But if the user has en-us culture and has chosen a datetime format starting with d or dd
            // fallback to using their selected preference so that the dates are consistently shown with day first.
            if (culture.name === "en-US" && !Utils_String.startsWith(dtf.ShortDatePattern, "d", Utils_String.ignoreCaseComparer)) {
                dateMap[HistoryGroupId.LastSevenDays] = "ddd M/d";
            }
            else {
                dateMap[HistoryGroupId.LastSevenDays] = "ddd " + dtf.ShortDatePattern;
            }

            dateMap[HistoryGroupId.LastThirtyDays] = "d";
            dateMap[HistoryGroupId.Older] = "d";

            HistoryUtils._dateFormatMap = dateMap;
        }
    }

    private static _getFieldsChangeMessage(workItem: WITOM.WorkItem, action: EditActionSet) {
        let fieldChanges = HistoryUtils.getFieldChanges(workItem, action);
        let numberOfFieldsChanged = fieldChanges.coreAndCustomFieldChanges.length +
            fieldChanges.htmlFieldChanges.length +
            fieldChanges.plainTextFieldChanges.length;

        let summaryMessage = "";
        if (numberOfFieldsChanged === 1) {
            if (fieldChanges.coreAndCustomFieldChanges.length === 1) {
                let field = fieldChanges.coreAndCustomFieldChanges[0];
                if (field.referenceName === WITConstants.CoreFieldRefNames.AssignedTo) {
                    summaryMessage = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlMadeChangeWithValue,
                        WorkItemTrackingResources.HistoryControlSummaryAssigned, field.newValue !== "" ? field.newValue : WorkItemTrackingResources.AssignedToEmptyText);
                }
                else if (field.referenceName === WITConstants.CoreFieldRefNames.Tags || field.newValue === "") {
                    summaryMessage = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlMadeChange, field.name);
                }
                else {
                    summaryMessage = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlMadeChangeWithValue, field.name, field.newValue);
                }
            }
            else {
                let field = fieldChanges.htmlFieldChanges.length === 1 ? fieldChanges.htmlFieldChanges[0] : fieldChanges.plainTextFieldChanges[0];
                summaryMessage = Utils_String.format(WorkItemTrackingResources.WorkItemLogControlMadeChange, field.name);
            }
        }
        else if (numberOfFieldsChanged > 1) {
            summaryMessage = WorkItemTrackingResources.WorkItemLogControlMadeChanges;
        }
        return Utils_String.htmlEncode(summaryMessage);
    }
}
