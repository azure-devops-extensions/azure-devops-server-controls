import { WorkItem, Field, WorkItemLink } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { FieldStatusFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import * as Mention_WorkItems_Async from "Mention/Scripts/TFS.Mention.WorkItems";
import { IWorkItemMention } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import * as Utils_String from "VSS/Utils/String";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as CIConstants from "WorkItemTracking/Scripts/CustomerIntelligence";
import * as Diag from "VSS/Diag";
import * as Url from "VSS/Utils/Url";
import * as VSS from "VSS/VSS";

import Q = require("q");

const RelatedLinkTypeEndName: string = "Related";

export function hasCommentChanged(workItem: WorkItem): boolean {
    Diag.Debug.assertParamIsNotNull(workItem, "workItem");

    const value = <string>workItem.getFieldValue(CoreField.History);
    return value !== null && value !== "";
}

function fieldNeedsToBeExplicitlySet(field: Field): boolean {
    return field.fieldDefinition.id === CoreField.AreaPath ||
        field.fieldDefinition.id === CoreField.IterationPath;
}

/**
 * Extracts the changed fields from the work item and saves only changes to the 'comments' field (history),
 * then restores the other changed fields.
 * @param workItem WorkItem to save.
 */
export function saveComments(workItem: WorkItem): IPromise<void> {

    if (workItem === null || !hasCommentChanged(workItem) || workItem.isNew()) {
        return Q.reject<void>(new Error("Incorrect state for saving comments"));
    }

    // Tell the work item that it's saving.  This causes any pending changes
    // in the controls to be saved, and makes the form disable itself.
    workItem.fireWorkItemPreSave();
    workItem.fireWorkItemSaving();

    // Copy any changes made to the work item, we will restore them later.
    const dirtyFields = workItem.getDirtyFields();
    const linkUpdates = workItem.getLinkUpdates();

    const userUpdatedFields: IDictionaryNumberTo<{}> = {};
    const ruleUpdatedFields: IDictionaryNumberTo<{}> = {};
    const classificationPathFields: IDictionaryNumberTo<{}> = {};
    const manuallySetStatusFields = {};

    for (const field of dirtyFields) {
        const fieldId = field.fieldDefinition.id;
        // this category of fields need to be explicitly set after the rules run
        if (fieldNeedsToBeExplicitlySet(field)) {
            classificationPathFields[field.fieldDefinition.id] = field.getValue();
        }

        if (field.isUserChange()) {
            userUpdatedFields[field.fieldDefinition.id] = field.getValue();
        } else {
            ruleUpdatedFields[field.fieldDefinition.id] = field.getValue();
        }

        if (field.fieldDefinition.isIdentity) {
            manuallySetStatusFields[fieldId] = field.status;
        }
    }

    // Get the current value for the history field.
    const historyValue = workItem.getFieldValue(CoreField.History);

    // Undo any changes to the work item, without firing events.
    workItem.resetChanges(true);

    // Add the value of the history field back to make the work item dirty again.
    workItem.setFieldValue(CoreField.History, historyValue);

    const defer = Q.defer<void>();

    // This function restores the work item after the save occurs.
    const restoreChanges = (restoreHistory: boolean) => {
        // Repopulating all fields that were set by rules
        for (const fieldId in ruleUpdatedFields) {
            const field = workItem.getField(fieldId);
            if (restoreHistory || field.fieldDefinition.id !== CoreField.History) {
                workItem.setFieldValue(field.fieldDefinition.id, ruleUpdatedFields[fieldId], true);
            }
        }

        // Repopulating all fields that were not set by rules
        for (const fieldId in userUpdatedFields) {
            const field = workItem.getField(fieldId);
            if (restoreHistory || field.fieldDefinition.id !== CoreField.History) {
                workItem.setFieldValue(field.fieldDefinition.id, userUpdatedFields[fieldId]);
            }
        }

        if (linkUpdates !== null) {
            workItem._restoreLinkUpdates(linkUpdates);
        }

        // Re-run the rules with the field updates so we get the correct field status
        workItem.evaluate();

        // Area/iteration paths need to be manually set since running the rules sets their value from the field id.
        for (const fieldId in classificationPathFields) {
            const field = workItem.getField(fieldId);
            workItem.setFieldValue(field.fieldDefinition.id, classificationPathFields[fieldId]);
        }

        // Identity fields which have been changed need to have status reset or they will become 'valid' even
        // if they are not.  This is much faster than calling field.validateIdentityFieldValue since
        // it will not make a rest api call.
        for (const key in manuallySetStatusFields) {
            const field: Field = workItem.getField(key);
            const status: FieldStatusFlags = manuallySetStatusFields[key];

            field.status = status;
            workItem.fireFieldChange([key]);
        }
    };
    VSS.using(["Mention/Scripts/TFS.Mention.WorkItems"], (MentionWorkItems: typeof Mention_WorkItems_Async) => {
        parseMentionsFromHistory(workItem, MentionWorkItems);
        workItem.beginSilentSave().then(
            () => {
                // Remove history field from updated values, it has been persisted
                restoreChanges(false);

                workItem.fireWorkItemSaved();
                workItem.fireWorkItemSaveComplete();

                defer.resolve(null);
            },
            (error) => {
                restoreChanges(true);

                workItem.setError(error);
                workItem.fireWorkItemSaveComplete();

                defer.reject(error);
            });
    });

    return defer.promise;
}

/**
 * Goes through pending history changes for workItem and adds a workItemLink per corresponding #mention.
 * @param workItem WorkItem to process.
 */
export function parseMentionsFromHistory(workItem: WorkItem, mentionsWorkItems: typeof Mention_WorkItems_Async) {
    try {
        if (workItem.store.linkTypes && workItem.store.linkTypes.length > 0) {
            const scenario = PerfScenarioManager.startScenario(
                CIConstants.WITPerformanceScenario.WORKITEM_DISCUSSION_LINKING,
                false
            );

            const historyFieldUpdate = workItem.getFieldValue(CoreField.History);
            if (historyFieldUpdate) {
                const $html = $("<p>" + historyFieldUpdate + "</p>");
                if (mentionsWorkItems) {
                    mentionsWorkItems.WorkItemsMentionParser
                        .getDefault()
                        .parseFromHtml($html, ($a, mention) => {
                            _processMention(workItem, mention);
                        });
                }
                scenario.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMDISCUSSION_LINKING_COMPLETE);
                PerfScenarioManager.endScenario(
                    CIConstants.WITPerformanceScenario.WORKITEM_DISCUSSION_LINKING);
            }
        }
    } catch (ex) {
        Diag.logError(ex);
    }
}

function _processMention(workItem: WorkItem, mention: IWorkItemMention) {
    if (!mention) {
        return;
    }

    if (workItem.id === mention.workItemId) {
        return;
    }

    const existingLinks = workItem.getLinks();
    if (!existingLinks) {
        return;
    }

    const sameLinkExists = existingLinks.some((link, index, array) => {

        if (!(link instanceof WorkItemLink)) {
            return false;
        }

        const workItemLink = <WorkItemLink>link;
        const linkTypeEnd = workItemLink.getLinkTypeEnd();
        if (!linkTypeEnd) {
            return false;
        }

        const match = (linkTypeEnd.name.toLowerCase() === RelatedLinkTypeEndName.toLowerCase() &&
            workItemLink.getTargetId() === mention.workItemId);
        return match;
    });

    if (sameLinkExists) {
        return;
    }

    const changedBy = TfsContext.getDefault().currentIdentity.displayName;
    const comment = Utils_String.format(WorkItemTrackingResources.WorkItemDiscussionMentionLinkComment,
        changedBy,
        mention.workItemId,
        workItem.id);

    const workItemLink = WorkItemLink.create(workItem, RelatedLinkTypeEndName, mention.workItemId, comment);
    workItem.addLink(workItemLink);
}

/**
 * Goes through provided $html and makes sure that all external
 * links have target="_blank" and rel="noopener".
 * @param html Html to sanitize.
 */
export function sanitizeExternalLinks($html: JQuery) {
    $html.find("a").each((i, elem) => {
        const $link = $(elem);
        if (Url.isExternalUrl($link.attr("href"))) {
            $link.attr({
                target: "_blank",
                rel: "noopener noreferrer"
            });
        }
    });
}
