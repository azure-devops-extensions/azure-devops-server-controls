import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as MessageBar from "OfficeFabric/MessageBar";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as Constants from "Search/Scenarios/Code/Constants";
import { Link } from "OfficeFabric/Link";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { MessageBarWrapper } from "Search/Scenarios/Code/Components/MessageBar";
import { IndexingBanner, QueryState } from "Search/Scenarios/Code/Flux/Stores/NotificationStore";
import { OrgSearchUrlLoadState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";

export const NotificationBannerContainer = Container.create(
    ["notificationStore", "organizationInfoStore"],
    ({ notificationStoreState, organizationInfoState }, props) => {

        const { indexingBannerState, searchQueryState } = notificationStoreState;
        const { clickLearnMoreLinkForPartialResults } = props.actionCreator;
        const isOrgSearchUrlLoadFailed = organizationInfoState.orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadFailed;
        const message = isOrgSearchUrlLoadFailed
                    ? getOrgSearchUrlFailedMessage()
                    : indexingBannerState === IndexingBanner.AccountIndexing
                        ? Resources.AccountIsGettingIndexedBannerMessage
                        : indexingBannerState === IndexingBanner.BranchIndexing
                            ? Resources.BranchesAreBeingIndexed : "";
        const infoMessage: JSX.Element =
                searchQueryState === QueryState.TimedOut
                    ? <span>
                        {Resources.ShowingPartialCodeResults}
                        <Link href={Constants.PartialResultsForCodeBlogLink}
                            onClick={clickLearnMoreLinkForPartialResults} target="_blank">
                            {Resources.LearnMoreLabelForPartialResults}
                        </Link>
                    </span> : null;
        const bannerScenarioType: string = isOrgSearchUrlLoadFailed
                            ? OrgSearchUrlLoadState[organizationInfoState.orgSearchUrlLoadState]
                            : IndexingBanner[notificationStoreState.indexingBannerState];
        const messageBarType: MessageBar.MessageBarType = isOrgSearchUrlLoadFailed
                                    ? MessageBar.MessageBarType.error
                                    : MessageBar.MessageBarType.warning;
        const onDissmissCallBack = isOrgSearchUrlLoadFailed ? props.actionCreator.errorNotificationBannerDismissed : null;
        return message ? (
            <MessageBarWrapper
                messageBarType={messageBarType}
                isMultiline={false}
                onDismiss={onDissmissCallBack}
                message={message}
                onDidMount={() => {
                    props.actionCreator.publishNotificationBanner(bannerScenarioType)
                }}>
            </MessageBarWrapper >
        ) : infoMessage ? (
            <MessageBarWrapper
                messageBarType={MessageBar.MessageBarType.info}
                isMultiline={false}
                message={infoMessage}
                onDidMount={() => {
                    props.actionCreator.publishNotificationBanner(QueryState[notificationStoreState.searchQueryState])
                }}>
            </MessageBarWrapper >
        ) : null;
    });

function getOrgSearchUrlFailedMessage(): JSX.Element {
    return (
        <span>
            <FormatComponent format={Resources.FailedLoadingOrgURLMessage}>
                <Link className="error-banner-refresh-link" onClick={ () => window.location.reload(true)}>
                    {Resources.RefreshText}
                </Link>
            </FormatComponent>
        </span>);
}