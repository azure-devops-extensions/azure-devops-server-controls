import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IFieldIdValue } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import TagConstants = require("WorkItemTracking/Scripts/TFS.UI.Tags.Constants");

export module TagUtils {

    /**
     * Will see if the change is a tag add/remove change. If so, will edit tags accordingly
     *
     * @return Positive integer equal to attempted tags to add, negative integer equal to attempted tags to remove, or 0 for no change
     */
    export function tryProcessTagsChanges(workItem: WITOM.WorkItem, change: IFieldIdValue): number {
        var tagField = workItem.getField(WITConstants.CoreField.Tags);
        if (tagField && !tagField.isReadOnly() && tagField.isEditable()) {
            if (Utils_String.equals(change.fieldName + '', TagUtils.getTagsAddPseudoFieldName(tagField.fieldDefinition.name), true) ||
                Utils_String.equals(change.fieldName + '', TagUtils.AddTagsPseudoRefName, true)) {
                var existingTags: string[] = TagUtils.splitAndTrimTags(tagField.getValue());
                var tagsToAdd: string[] = TagUtils.splitAndTrimTags(change.value);

                var tags = Utils_Array.union(existingTags, tagsToAdd, Utils_String.localeIgnoreCaseComparer);
                tagField.setValue(TagUtils.formatTags(tags));

                return tagsToAdd.length;
            }
            else if (Utils_String.equals(change.fieldName + '', TagUtils.getTagsRemovePseudoFieldName(tagField.fieldDefinition.name), true) ||
                Utils_String.equals(change.fieldName + '', TagUtils.RemoveTagsPseudoRefName, true)) {
                var existingTags: string[] = TagUtils.splitAndTrimTags(tagField.getValue());
                var tagsToRemove: string[] = TagUtils.splitAndTrimTags(change.value);

                var tags = Utils_Array.subtract(existingTags, tagsToRemove, Utils_String.localeIgnoreCaseComparer);
                tagField.setValue(TagUtils.formatTags(tags));

                return -tagsToRemove.length;
            }
        }

        return 0;
    }
    export const AddTagsPseudoRefName = "System.Tags-Add";
    export const RemoveTagsPseudoRefName = "System.Tags-Remove";

    /**
     * Processes tags in fieldData and fieldUpdates and returns a map of Add/Remove pseudo fields with corresponding tag values
     * @param workItem
     */
    export function getTagPseudoFieldValues(workItem: WITOM.WorkItem): IDictionaryStringTo<string> {
        const retVal: IDictionaryStringTo<string> = {};

        let existingTags = [];
        const fieldTags = workItem.getFieldValue(WITConstants.CoreField.Tags, true);
        if (fieldTags) {
            existingTags = TagUtils.splitAndTrimTags(fieldTags).sort(Utils_String.localeIgnoreCaseComparer);
        }

        let updatedTags = existingTags;
        if (workItem.isFieldDirty(WITConstants.CoreField.Tags)) {
            updatedTags = TagUtils.splitAndTrimTags(workItem.getFieldValue(WITConstants.CoreField.Tags)).sort(Utils_String.localeIgnoreCaseComparer);
        }

        const removeTags = [];
        for (const tag of existingTags) {
            const index = updatedTags.indexOf(tag);
            // Tag is removed
            if (index === -1) {
                removeTags.push(tag);
            }
        }

        if (removeTags.length > 0) {
            retVal[RemoveTagsPseudoRefName] = formatTags(removeTags);
        }

        // The remaining tags in updatedTags need to be added
        if (updatedTags.length > 0) {
            retVal[AddTagsPseudoRefName] = formatTags(updatedTags);
        }
        return retVal;
    }

    /**
     * Checks if any tags were added or removed
     * @param workItem
     */
    export function areTagsAddedRemoved(workItem: WITOM.WorkItem): { added: boolean, removed: boolean } {
        const addedRemoved = {
            added: false,
            removed: false
        };

        let existingTags = [];
        const existingFieldTags = workItem.getFieldValue(WITConstants.CoreField.Tags, true);
        if (existingFieldTags) {
            existingTags = TagUtils.splitAndTrimTags(existingFieldTags).sort(Utils_String.localeIgnoreCaseComparer);
        }
        let updatedTags = existingTags;
        if (workItem.isFieldDirty(WITConstants.CoreField.Tags)) {
            updatedTags = TagUtils.splitAndTrimTags(workItem.getFieldValue(WITConstants.CoreField.Tags)).sort(Utils_String.localeIgnoreCaseComparer);
        }

        const addedTag = Utils_Array.first(updatedTags, (t) => !Utils_Array.contains(existingTags, t));
        const removedTag = Utils_Array.first(existingTags, (t) => !Utils_Array.contains(updatedTags, t));

        addedRemoved.added = !!addedTag;
        addedRemoved.removed = !!removedTag;

        return addedRemoved;
    }

    export function getTagsAddPseudoFieldName(tagFieldName: string) {
        return `${tagFieldName} (${Resources.BulkEditTagsAdd})`;
    }

    export function getTagsRemovePseudoFieldName(tagFieldName: string) {
        return `${tagFieldName} (${Resources.BulkEditTagsRemove})`;
    }

    export function splitAndTrimTags(tagsText: string): string[] {
        if (!tagsText) {
            return [];
        }
        var tags: string[] = tagsText.split(TagConstants.TAG_SPLITTING_SEPARATOR);
        var trimmedTags: string[] = [];

        for (var tag of tags) {
            var trimmedTag = tag.trim();
            if (trimmedTag) {
                trimmedTags.push(trimmedTag);
            }
        }

        return trimmedTags;
    }

    export function formatTags(tags: string[]): string {
        return tags.join("; ");
    }
}
