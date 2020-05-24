import * as Q from "q";
import { ExtensionService } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getService } from "VSS/Service";
import { using } from "VSS/VSS";
import * as _EngagementCore from "Engagement/Core";
import * as _EngagementDispatcher from "Engagement/Dispatcher";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as _EngagementRegistrations from "Presentation/Scripts/TFS/TFS.Engagement.Registrations";
import * as _CodeSearchFeature from "Presentation/Scripts/TFS/TFS.QuickStart.CodeSearchFeature";
import * as _CodeSearchPromotion from "Presentation/Scripts/TFS/TFS.QuickStart.CodeSearchPromotion";

/**
 * Conditionally registers the two engagements related with Code Search:
 * - CodeSearchPromotion: Shows the code search extension availability to those accounts which doesn’t have it installed.
 * - CodeSearchFeature: Shows the code search feature discoverability pop-up only if the extension is installed.
 */
export function startCodeSearchEngagements(pageId: string, isHosted: boolean): void {
    if (!isHosted) {
        // Search can be enabled during on-premise installation, so no need to promotion.
        return;
    }

    using(
        ["Engagement/Dispatcher", "Engagement/Core", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"],
        (EngagementDispatcher: typeof _EngagementDispatcher, EngagementCore: typeof _EngagementCore, EngagementRegistrations: typeof _EngagementRegistrations) => {
            checkCodeSearchEnabled().then(isCodeSearchEnabled =>
                !isCodeSearchEnabled && registerCodeSearchPromotion(EngagementDispatcher, EngagementCore));

            EngagementRegistrations.registerNewFeature();
            EngagementDispatcher.Dispatcher.getInstance().start(pageId);
        });
}

function registerCodeSearchPromotion(EngagementDispatcher: typeof _EngagementDispatcher, EngagementCore: typeof _EngagementCore): void {
    EngagementDispatcher.Dispatcher.getInstance().register({
        id: "CodeSearchPromotion",
        type: EngagementCore.EngagementType.QuickStart,
        model: EngagementDispatcher.lazyLoadModel(
            ["Presentation/Scripts/TFS/TFS.QuickStart.CodeSearchPromotion"],
            (CodeSearchPromotion: typeof _CodeSearchPromotion) =>
                new CodeSearchPromotion.CodeSearchPromotionQuickStartModel(
                    new CodeSearchPromotion.CodeSearchPromotionQuickStartPageContext())),
    });
}

function registerCodeSearchFeature(EngagementDispatcher: typeof _EngagementDispatcher, EngagementCore: typeof _EngagementCore): void {
    EngagementDispatcher.Dispatcher.getInstance().register({
        id: "CodeSearchFeature",
        type: EngagementCore.EngagementType.QuickStart,
        model: EngagementDispatcher.lazyLoadModel(
            ["Presentation/Scripts/TFS/TFS.QuickStart.CodeSearchFeature"],
            (CodeSearchFeature: typeof _CodeSearchFeature) =>
                new CodeSearchFeature.CodeSearchFeatureQuickStartModel(
                    new CodeSearchFeature.CodeSearchFeatureQuickStartPageContext())),
    });
}

function checkCodeSearchEnabled(): IPromise<boolean> {
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessSearchShell)) {
        return Q(true);
    } else {
        return checkExtensionInstalled("ms.vss-code-search.code-entity-type");
    }
}

function checkExtensionInstalled(extensionId: string): IPromise<boolean> {
    return getService(ExtensionService)
        .getContributions([extensionId], true, false)
        .then(contributions => contributions.length > 0);
}
