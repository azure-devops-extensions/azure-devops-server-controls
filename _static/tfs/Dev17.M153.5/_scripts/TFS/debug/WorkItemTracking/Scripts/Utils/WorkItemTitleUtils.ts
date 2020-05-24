import Utils_String = require("VSS/Utils/String");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import Navigation = require("VSS/Controls/Navigation");
import Utils_Clipboard = require("VSS/Utils/Clipboard");

export const DefaultTrimmedWorkItemEditorLength = 128;
export const DefaultUpdateDelayEventName = "updateWitDocumentTitle";
export const DefaultUpdateDelayMs = 300;

/**
 * Get the title for window/dialog for a given work item. 
 * @param workItem Work item to retrieve the title for 
 * @param trimLength Optional char length to trim the title
 */
export function getWorkItemEditorTitle(workItem: WITOM.WorkItem, trimLength?: number): string {
    var caption, title;

    if (workItem) {
        caption = workItem.getCaption(true);
        title = workItem.getTitle();

        if (trimLength > 0 && title && title.length > trimLength) {
            title = title.substr(0, trimLength) + "...";
        }

        return Utils_String.format(WorkItemTrackingResources.WorkItemEditorWindowTitle, caption, title);
    }

    return "";
}

/**
 * Copy WorkItem title to clipboard
 * @param workItem Work item to copy the title for 
 */
export function copyWorkItemTitleToClipboard(workItem: WITOM.WorkItem) {
    if(workItem && !workItem.isNew()){
        const id = workItem.getFieldValue(WITConstants.CoreFieldRefNames.Id);
        const title = Utils_String.htmlEncode(workItem.getFieldValue(WITConstants.CoreFieldRefNames.Title));
        const html = "<span style='font-size:11pt;'><a href='{0}' target='_blank' rel='noopener noreferrer'>{1} {2}</a>" + ": {3}</span>";
        const url = workItem.store.getTfsContext().getActionUrl("edit", "workitems",
                    $.extend(
                    {
                        project: workItem.project.name,
                        team: null,
                        area: "",
                        parameters: [workItem.id]
                    },
                    Navigation.FullScreenHelper.getUrlData()));
        const data = Utils_String.format(html, url, workItem.workItemType.name, id, title);

        Utils_Clipboard.copyToClipboard(data, {
            copyAsHtml: true,
            copyDialogOptions: {
                pageHtml: WorkItemRichTextHelper.getPageHtml()
            }
        });
    }
}
