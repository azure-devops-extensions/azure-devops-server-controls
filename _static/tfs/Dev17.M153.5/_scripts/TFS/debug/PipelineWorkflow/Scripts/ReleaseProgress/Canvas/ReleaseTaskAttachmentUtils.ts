import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";

import * as Marked from "DistributedTaskControls/Common/3rdParty/marked";
import { SelfClosingHTMLTagRegEx } from "DistributedTaskControls/Common/RegexConstants";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IMarkdownMetadata } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import { WebPlatformFeatureFlags } from "VSS/Common/Constants/Platform";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { mergeSorted } from "VSS/Utils/Array";
import { defaultComparer } from "VSS/Utils/Date";
import { HtmlNormalizer } from "VSS/Utils/Html";
import { format, empty } from "VSS/Utils/String";

export class ReleaseTaskAttachmentUtils {

    public static constructHtmlForRender(html: string) {
        let convertedHtml = html.replace(/\\r\\n/g, "<br>");
        convertedHtml = convertedHtml.replace(/\\r\\n/g, "<br>");
    
        if (!FeatureFlagUtils.isDonotSanitizeInputForMDFileEnabled()) {
            convertedHtml = HtmlNormalizer.normalizeStripAttributes(convertedHtml, [], ["aria-label", "role"]);
        }

        convertedHtml = `<p style="margin:0px;">${ReleaseTaskAttachmentUtils._resolveMarkdown(convertedHtml)}</p>`;
        convertedHtml = convertedHtml.replace(/<br\/>/ig, "<BR>");        
        return {
            __html: ReleaseTaskAttachmentUtils.convertSelfClosingTagsToExplicitTags(convertedHtml)
        };
    }

    public static getMarkdownHeader(fileName: string): string {
        let displayName: string = "Markdown Section";
        
        if (fileName) {
            let name = fileName.replace(".md", "");
            name = name.replace(new RegExp("[_-]*", "g"), "");
            name = name.charAt(0).toUpperCase() + name.slice(1);
            if (name) {
                displayName = name;
            }
        }

        return displayName;
    }

    public static getAttachmentContentCacheKeyId(runPlanId: string, timelineId: string, recordId: string): string {
        return format("{0}::{1}::{2}", runPlanId, timelineId, recordId);
    }

    public static showTaskAttachments(environmentStatus: EnvironmentStatus): boolean {
        switch (environmentStatus) {
            case EnvironmentStatus.InProgress:
            case EnvironmentStatus.PartiallySucceeded:
            case EnvironmentStatus.Rejected:
            case EnvironmentStatus.Succeeded:
            case EnvironmentStatus.Canceled:
                return true;
        }

        return false;
    }

    public static insertAttachmentAndSort(attachmentContents: IMarkdownMetadata[], newAttachmentContent: IMarkdownMetadata): IMarkdownMetadata[] {
        return mergeSorted<IMarkdownMetadata>(attachmentContents, [newAttachmentContent], ReleaseTaskAttachmentUtils._attachmentSortComparer);
    }

    private static _attachmentSortComparer(attachmentContent1: IMarkdownMetadata, attachmentContent2: IMarkdownMetadata): number {
        return defaultComparer(attachmentContent1.fileInfo.createdOn, attachmentContent2.fileInfo.createdOn);
    }

    private static _resolveMarkdown(markdownText: string): string {
        let resolvedMarkdown: string = empty;

        if (FeatureAvailabilityService.isFeatureEnabled(WebPlatformFeatureFlags.MarkdownRendering)) {
            const rendererOptions: MarkdownRendererOptions = {
                html: true
            };

            let renderer = new MarkdownRenderer(rendererOptions);
            resolvedMarkdown = renderer.renderHtml(markdownText);
        }
        else {
            resolvedMarkdown = Marked(markdownText);
        }

        return resolvedMarkdown;
    }

    /**
     * Converts a string having self closing tags to explicit closing tags
     * 
     * @param html HTML string containing self closing tags
     * @returns HTML string with all explicit closing tags
     */
    public static convertSelfClosingTagsToExplicitTags(html: string): string {
        const replacementRegEx = "<$1$2></$1>";
        return html.replace(SelfClosingHTMLTagRegEx, replacementRegEx);
    }
}