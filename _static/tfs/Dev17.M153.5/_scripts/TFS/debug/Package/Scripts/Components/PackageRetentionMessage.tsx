import * as React from "react";

import { Link } from "OfficeFabric/Link";
import { IMessageBarProps, MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";

import { Component, State } from "VSS/Flux/Component";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import * as Actions from "Package/Scripts/Actions/Actions";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as PackageResources from "Feed/Common/Resources";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

/**
 * Props for PackageRetentionMessage
 */
export interface IPackageRetentionMessageProps extends IMessageBarProps {
    feed: Feed;
    /**
     * Package Id (Guid)
     */
    packageId: string;
    /**
     * The number (count) of versions in the package
     */
    versionCount: number;
}

export interface IPackageRetentionState extends State {
    hide: boolean;
}

/**
 * Displays a message if the number of versions for the specified package is
 * approaching the retention limit
 */
export class PackageRetentionMessage extends Component<IPackageRetentionMessageProps, IPackageRetentionState> {
    // Explicitly hard-coding for now. If we ever change the limit on the backend (or customer for accounts)
    // then we should plumb it through to the UI
    public readonly VERSION_LIMIT = 5000;

    /** Has the control been shown to the user? */
    private shown = false;

    constructor(props?: IPackageRetentionMessageProps, context?: any) {
        super(props, context);
        this.state = { hide: false };
    }

    get showMessage(): boolean {
        const retentionPolicy = this.props.feed.retentionPolicy;
        const retentionPolicyRetrieved = retentionPolicy !== void 0;

        const showMessage =
            !this.state.hide &&
            this.isApproachingLimit() &&
            retentionPolicyRetrieved &&
            (retentionPolicy === null || !retentionPolicy.countLimit);

        return showMessage;
    }

    get messageBarType(): MessageBarType {
        return this.isVeryCloseToLimit() ? MessageBarType.severeWarning : MessageBarType.warning;
    }

    get messageBarTextTemplate() {
        return this.isVeryCloseToLimit()
            ? PackageResources.PackageRetention_CloseToLimitStrongWarning
            : PackageResources.PackageRetention_CloseToLimitWarning;
    }

    public render(): JSX.Element {
        return (
            this.showMessage &&
            this.publishControlShownCI() && (
                <MessageBar {...this.props} messageBarType={this.messageBarType} onDismiss={this.onDismissMessage}>
                    <FormatComponent format={this.messageBarTextTemplate}>
                        {this.VERSION_LIMIT}
                        <Link href="#" onClick={this.onClick}>
                            {PackageResources.PackageRetention_ConfigureRetentionPolicies}
                        </Link>
                    </FormatComponent>
                </MessageBar>
            )
        );
    }

    private publishControlShownCI(): boolean {
        // We only want to publish the CI event once (when the control is first shown)
        if (!this.shown) {
            this.shown = true;
            this.publishCIMessage("Showed");
        }

        return true;
    }

    @autobind
    private onClick(event) {
        // Note: we're choosing to not handle Ctrl/Meta click here - insufficient value for a seldom shown control
        event.preventDefault();
        this.navigateToFeedSettings();
    }

    @autobind
    private onDismissMessage() {
        this.setState({ hide: true }, () => {
            this.publishCIMessage("Closed");
            Actions.DismissPackageRetentionMessage.invoke(this.props.packageId);
        });
    }

    private navigateToFeedSettings() {
        SettingsActions.FeedSettingsNavigateClicked.invoke({});
    }

    private publishCIMessage(action: string): boolean {
        CustomerIntelligenceHelper.publishEvent(CiConstants.VersionLimitBanner, {
            Action: action,
            Severity: this.messageBarType === MessageBarType.warning ? "Info" : "Warning"
        });

        return true;
    }

    private isApproachingLimit() {
        return this.props.versionCount >= this.VERSION_LIMIT * 0.8;
    }

    private isVeryCloseToLimit() {
        return this.props.versionCount >= this.VERSION_LIMIT * 0.95;
    }
}
