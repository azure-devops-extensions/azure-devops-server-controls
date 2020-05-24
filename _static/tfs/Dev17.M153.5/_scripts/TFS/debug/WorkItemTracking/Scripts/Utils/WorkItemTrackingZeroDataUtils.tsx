import * as React from "react";
import * as WitZeroDataResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.ZeroData";
import { ZeroData, Props, ILink } from "Presentation/Scripts/TFS/Components/ZeroData";
import { WorkIllustrationUrlUtils, WorkZeroDataIllustrationPaths, GeneralZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";

/**
 * Creates Zero Day component instance for "Assigned to me" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForAssignedToMe(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_AssignedToMe_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_AssignedToMe_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink :
            {
                href: WitZeroDataResources.ZeroData_AssignedToMe_SecondaryMessageLinkUrl,
                linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
            },
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.YourWorkInOnePlace),
        imageAltText: WitZeroDataResources.Illustrations_YourWorkInOnePlaceAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for Following page.
 * @param alternativeInfoLink alternative info link
 */
export function createForFollowing(alternativeInfoLink: ILink = null): JSX.Element {
    const secondaryMessageParts: string[] = WitZeroDataResources.ZeroData_Following_SecondaryMessageFormat.split("{0}");
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Following_PrimaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_Following_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_Following_SecondaryMessageLinkText
        } as ILink,
        secondaryTextElement: (
            <span>
                {secondaryMessageParts[0]}
                <span className="bowtie-icon bowtie-watch-eye"></span>
                {secondaryMessageParts[1]}
            </span>
        ),
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.KeepAnEyeOnImportantWork),
        imageAltText: WitZeroDataResources.Illustrations_KeepAnEyeOnImportantWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for Following page when follows is not configured.
 * @param alternativeInfoLink alternative info link
 */
export function createForFollowingNotconfigured(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Following_NotConfigured_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_Following_NotConfigured_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_Following_NotConfigured_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_Following_NotConfigured_SecondaryMessageLinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.KeepAnEyeOnImportantWork),
        imageAltText: WitZeroDataResources.Illustrations_KeepAnEyeOnImportantWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for "My activity" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForMyActivity(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_MyActivity_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_MyActivity_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_MyActivity_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.GetBackToRecentWork),
        imageAltText: WitZeroDataResources.Illustrations_GetBackToRecentWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for Mentioned page.
 * @param alternativeInfoLink alternative info link
 */
export function createForMentioned(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Mentioned_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_Mentioned_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_Mentioned_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_Mentioned_SecondaryMessageLinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.MentionSomeone),
        imageAltText: WitZeroDataResources.Illustrations_MentionSomeoneAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for "Recently created" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForRecentlyCreated(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_RecentlyCreated_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_RecentlyCreated_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_RecentlyCreated_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.GetBackToRecentWork),
        imageAltText: WitZeroDataResources.Illustrations_GetBackToRecentWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for "Recently completed" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForRecentlyCompleted(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_RecentlyCompleted_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_RecentlyCompleted_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_RecentlyCompleted_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.GetBackToRecentWork),
        imageAltText: WitZeroDataResources.Illustrations_GetBackToRecentWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for "Recently updated" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForRecentlyUpdated(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_RecentlyUpdated_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_RecentlyUpdated_SecondaryMessage,
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_RecentlyUpdated_SecondaryMessageLinkUrl,
            linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.GetBackToRecentWork),
        imageAltText: WitZeroDataResources.Illustrations_GetBackToRecentWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for "my teams" page.
 * @param alternativeInfoLink alternative info link
 */
export function createForMyTeams(alternativeInfoLink: ILink = null): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_MyTeams_PrimaryMessage, 
        secondaryText: WitZeroDataResources.ZeroData_MyTeams_SecondaryMessage, 
        infoLink: alternativeInfoLink ? alternativeInfoLink : {
            href: WitZeroDataResources.ZeroData_MyTeams_SecondaryMessageLinkUrl, 
            linkText: WitZeroDataResources.ZeroData_WorkItems_LinkText
        } as ILink,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.GetBackToRecentWork),
        imageAltText: WitZeroDataResources.Illustrations_GetBackToRecentWorkAltText 
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates Zero Day component instance for my teams page when user is not a member of any team
 */
export function createForMyTeamsNotconfigured(): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_MyTeams_NotConfigured_PrimaryMessage,
        secondaryText: WitZeroDataResources.ZeroData_MyTeams_NotConfigured_SecondaryMessage,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.KeepAnEyeOnImportantWork),
        imageAltText: WitZeroDataResources.Illustrations_KeepAnEyeOnImportantWorkAltText
    };
    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates ZeroData component instance for general server error.
 * @param message server error message
 */
export function createForServerError(errorMessage: string): JSX.Element {
    return <ZeroData
        primaryText={WitZeroDataResources.ZeroData_ServerError_PrimaryText}
        secondaryText={errorMessage}
        imageUrl={WorkIllustrationUrlUtils.getIllustrationImageUrl(GeneralZeroDataIllustrationPaths.SomethingWrongOnServer)}
        imageAltText={WitZeroDataResources.Illustrations_SomethingWrongOnServerAltText} />;
}
