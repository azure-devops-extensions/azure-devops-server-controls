import * as React from "react";
import * as MessageBar from "OfficeFabric/MessageBar";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Link } from "OfficeFabric/Link";
import { OrgSearchUrlLoadState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

export const NotificationBannerContainer = Container.create(
    ["organizationInfoStore"],
    ({ organizationInfoState }, props) => {
        const isOrgSearchUrlLoadFailed = organizationInfoState.orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadFailed;
        const message =  isOrgSearchUrlLoadFailed ? getOrgSearchUrlFailedMessage() : "";
        const onDissmissCallBack = isOrgSearchUrlLoadFailed ? props.actionCreator.errorNotificationBannerDismissed : null;

        return message ? (
            <MessageBarWrapper
                messageBarType={MessageBar.MessageBarType.error}
                isMultiline={false}
                onDismiss={onDissmissCallBack}
                message={message}
                onDidMount={() => {
                    props.actionCreator.publishNotificationBanner(OrgSearchUrlLoadState[organizationInfoState.orgSearchUrlLoadState])
                }}/>
        ) : null;
    });

export interface MessageBarWrapperProps extends MessageBar.IMessageBarProps {
    onDidMount(): void;

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