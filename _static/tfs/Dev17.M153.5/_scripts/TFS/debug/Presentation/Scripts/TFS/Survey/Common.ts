/**
 * Module defining constants common to survey classes
 */
export module Constants {
    export const DialogClassName = "survey-dialog-verticals";
    export const ContainerClassName = "survey-feedback-submit-container";
    export const PageId = "Survey";
    export const EngagementId = "NetPromoterSurvey";
    export const Privacy: string = 'https://go.microsoft.com/fwlink/?LinkId=264782';
}

/**
 * Module defining data keys used in the Interaction and telemetry events
 */
export module DataKeys {
    export const AnonymousAccess: string = "AnonymousAccess";
    export const ContactMe: string = "OkToContactMe";
    export const DeferredTimes: string = "DeferredTimes";
    export const ExitMethod: string = "ExitMethod";
    export const Interaction: string = "Interaction";
    export const InteractionType: string = "InteractionType";
    export const MaxAllowableDeferTimes: string = "MaxAllowableDeferTimes";
    export const Navigation: string = "Navigation";
    export const OperationDate: string = "OperationDate";
    export const PromptId: string = "PromptId";
    export const Reason: string = "Reason";
    export const Response: string = "Response";
    export const Score: string = "Score";
    export const SurveyId: string = "SurveyId";
    export const UserRole: string = "UserRole";
    export const UseNewBranding: string = "UseNewBranding";
    export const VerticalNavigationEnabled: string = "VerticalNavigationEnabled";
}

/**
 * Module defining interaction types
 */
export module InteractionType {
    export const Postpone: string = "Postpone";
    export const Submit: string = "Submit";
}

/**
 * Information about the product
 */
export module ProductConstants {
    export const LegacyProductName = "Azure DevOps Services";
    export const BrandName = "Azure";
    export const ProductName = "DevOps";

    // Mapping from hub group ID to vertical name
    export const HubGroupToProductName = {
        "ms.vss-work-web.work-hub-group": "Boards",
        "ms.vss-code-web.code-hub-group": "Repos",
        "ms.vss-build-web.build-release-hub-group": "Pipelines",
        "ms.feed.package-hub-group": "Artifacts",
        "ms.vss-test-web.test-hub-group": "Test Plans",
    }
}