/// <reference types="jquery" />

import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as MentionsWorkItems from "Mention/Scripts/TFS.Mention.WorkItems";
import { getWorkItemMentionText } from "Mention/Scripts/WorkItem/WorkItemMentionUtilities";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemStore, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import * as CommentUtils from "WorkItemTracking/Scripts/Utils/CommentUtils";

/**
 * Subscribes to the work item pre-save events and removes work item type and title from history field updates.
 * In order to avoid pulling in the VC and mentions dependencies, this should be lazily loaded by the consumers.
 */
export class WorkItemMentionPreSaveProcessor {
    private _workItemManager: WorkItemManager;

    constructor() {
        const store = ProjectCollection.getDefaultConnection().getService<WorkItemStore>(WorkItemStore);
        this._workItemManager = WorkItemManager.get(store);
    }
    /**
     * Replaces the work item type and title in work item mentions with #id, to avoid saving those in the DB
     * Public for unit testing.
     * @param value work item history field value.
     */
    public removeTypeAndTitleFromWorkItemMentions(value: string): string {
        const $html = $("<span>" + value + "</span>");
        MentionsWorkItems.WorkItemsMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            const mentionText = getWorkItemMentionText(mention.workItemId);
            if ($a.text() !== mentionText) {
                $a.text(mentionText);
            }
        });
        return $html.html();
    }

    public attachWorkItemChanged(): void {
            this._workItemManager.attachWorkItemChanged(this._onWorkItemChanged);
    }

    public detachWorkItemChanged(): void {
            this._workItemManager.detachWorkItemChanged(this._onWorkItemChanged);
    }

    private _shouldHideTypeAndTitleInWorkItemMentions(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.HideTypeAndTitleInWorkItemMentions, false);
    }

    private _onWorkItemChanged = (workitem: WorkItem, eventData: IWorkItemChangedArgs): void => {
        if (!eventData) {
            return;
        }

        if (eventData.change === WorkItemChangeType.PreSave) {
            const workItem = eventData.workItem;
            const historyText = workItem.getFieldValue(WITConstants.CoreField.History);
            if (historyText) {
                // In case of history field, we want to strip out the type and title from work item mentions just before saving,
                // so that they can see the type and title in the rich text box, but those don't get persisted.
                if (this._shouldHideTypeAndTitleInWorkItemMentions()) {
                    const sanitizedHistoryText = this.removeTypeAndTitleFromWorkItemMentions(historyText);
                    if (historyText !== sanitizedHistoryText) {
                        const historyField = workItem.getField(WITConstants.CoreField.History);
                        historyField.setValue(sanitizedHistoryText, true);
                    }
                }
                CommentUtils.parseMentionsFromHistory(workItem, MentionsWorkItems);
            }
        }
    };
}
