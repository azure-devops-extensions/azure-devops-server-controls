import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WebPageDataService } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";
import { WikiMetadata } from "Wiki/Scenarios/Shared/Sources/WikiRepoSource";
import { ContributionKeys } from "Wiki/Scripts/CommonConstants";

export function isProductDocumentationEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiProductDocumentation, false);
}

export function isImmersiveWikiEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiImmersive, false);
}

export function isWikiPageViewStatsEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiPageViewStats, false);
}

export function isUnpublishWikiEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiUnpublishCodeWiki, false);
}

export function isHandleBrokenLinksEnabled(): boolean {
    const data = getService(WebPageDataService)
                    .getPageData<WikiMetadata>(ContributionKeys.WikiTreeDataProvider);
    return data && data.isBrokenLinksHandlingEnabled;
}

export function isTemplateSupportEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiTemplateSupport, false);
}

export function isRichCodeWikiEditingEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiRichCodeWikiEditing, false);
}

export function isYamlSupportEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessMarkdownYamlSupport, false);
}

export function isTrustedExtensionEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessMarkdownTrustedExtensionSupport, false);
}

export function isCodeHubEnabled(): boolean {
    /* We are hardcoding string value here as values are not exported from /Tfs/Web/extensions/tfs/vss-admin-web/views/ServicePicker/ServicePicker.tsx
     * As per ServicePicker.tsx, this will change in future, We will have to update this value as it changes
     */
    return new FeatureManagementService().isFeatureEnabled("ms.vss-code.version-control");
}

export function isRenameWikiFeatureEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiRenameWiki, false);
}

export function isPeopleMentionFeatureEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiPeopleMention, false);
}

export function isGetWikiPageIdFeatureEnabled(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiGetPageIds, false);
}