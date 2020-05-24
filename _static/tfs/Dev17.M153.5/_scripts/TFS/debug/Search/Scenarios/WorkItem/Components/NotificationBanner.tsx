import * as React from "react";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as MessageBar from "OfficeFabric/MessageBar";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Link } from "OfficeFabric/Link";
import { OrgSearchUrlLoadState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { NotificationStoreState, IndexingBanner} from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

export const NotificationBannerContainer = Container.create(
    ["notificationStore", "organizationInfoStore"],
    ({ notificationStoreState, organizationInfoState }, props) => {
        const message = getMessage(notificationStoreState, organizationInfoState.orgSearchUrlLoadState);
        const isOrgSearchUrlLoadFailed: boolean = organizationInfoState.orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadFailed;
        const onDissmissCallBack = isOrgSearchUrlLoadFailed ? props.actionCreator.errorNotificationBannerDismissed : null;

        return message ? (
            <MessageBarWrapper
                messageBarType={isOrgSearchUrlLoadFailed
                                    ? MessageBar.MessageBarType.error
                                    : MessageBar.MessageBarType.warning}
                isMultiline={false}
                onDismiss={onDissmissCallBack}
                message={message}
                onDidMount={() => {
                    props.actionCreator.publishNotificationBanner(
                        isOrgSearchUrlLoadFailed
                            ? OrgSearchUrlLoadState[organizationInfoState.orgSearchUrlLoadState]
                            : IndexingBanner[notificationStoreState.indexingBannerState]);
                }}/>
        ) : null;
    });

function getMessage(notificationStoreState: NotificationStoreState, orgSearchUrlLoadState: OrgSearchUrlLoadState): JSX.Element | string {
    if (orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadFailed)
    {
        return getOrgSearchUrlFailedMessage();
    }
    else if (IndexingBanner.AccountIndexing === notificationStoreState.indexingBannerState) {
        return Resources.AccountIsGettingIndexedBannerMessage;
    }
    return "";
}

export interface MessageBarWrapperProps extends MessageBar.IMessageBarProps {
    onDidMount: () => void;

    message: JSX.Element | string;
}

export class MessageBarWrapper extends React.PureComponent<MessageBarWrapperProps, {}> {
    public render(): JSX.Element {
        return (
            <MessageBar.MessageBar
                messageBarType={this.props.messageBarType}
                isMultiline={this.props.isMultiline}
                onDismiss={this.props.onDismiss} >
                {this.props.message}
            </MessageBar.MessageBar>
        );
    }

    public componentDidMount(): void {
        this.props.onDidMount();
    }
}

function getOrgSearchUrlFailedMessage(): JSX.Element {
    return (
        <span>
            <FormatComponent format={Resources.FailedLoadingOrgURLMessage}>
                {
                    <Link className="error-banner-refresh-link" onClick={ () => window.location.reload(true)}>
                        {Resources.RefreshText}
                    </Link>
                }
            </FormatComponent>
        </span>);
}
