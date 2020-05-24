import Telemetry = require("VSS/Telemetry/Services");
import { WorkItem, Attachment, WorkItemLink, Hyperlink, ExternalLink } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export module TelemetryUtils {
    /** Write board field usage data to CI if the board field has been used.
     *  @param {string} area     telemetry area.
     *  @param {string} feature       telemetry feature.
     *  @param {number} boardUsage  board field usage data*/
    export function recordBoardFieldsUsageChange(area: string, feature: string, boardUsage: BoardFieldUsageData) {
        if (boardUsage.column || boardUsage.lane || boardUsage.done) {
            var ciData: IDictionaryStringTo<any> = {};
            if (boardUsage.column) {
                $.extend(ciData, { "column": boardUsage.column });
            }
            if (boardUsage.lane) {
                $.extend(ciData, { "lane": boardUsage.lane });
            }
            if (boardUsage.done) {
                $.extend(ciData, { "done": boardUsage.done });
            }
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                area,
                feature,
                ciData));
        }
    }

    export class BoardFieldUsageData {
        public column: boolean = false;
        public lane: boolean = false;
        public done: boolean = false;
    }

    export function getWorkItemLinkTelemetryDetails(workItem: WorkItem) {
        if (workItem && workItem.allLinks) {
            const allLinks = workItem.allLinks;
            const linkDetails = {
                workItemLinkCount: 0,
                attachmentCount: 0,
                hyperLinkCount: 0,
                externalLinkCount: 0,
                externalLinkDetails: {}
            };
            for (const link of allLinks) {
                if (link instanceof Attachment) {
                    linkDetails.attachmentCount++;
                } else if (link instanceof ExternalLink) {
                    if (link.linkData && link.linkData.OriginalName) {
                        const externalLinkTypeCount = linkDetails.externalLinkDetails[link.linkData.OriginalName];
                        linkDetails.externalLinkDetails[link.linkData.OriginalName] = externalLinkTypeCount ? externalLinkTypeCount + 1 : 1;
                    }
                    linkDetails.externalLinkCount++;
                } else if (link instanceof WorkItemLink) {
                    linkDetails.workItemLinkCount++;
                } else if (link instanceof Hyperlink) {
                    linkDetails.hyperLinkCount++;
                }
            }
            return linkDetails;
        }
        return null;
    }
}

