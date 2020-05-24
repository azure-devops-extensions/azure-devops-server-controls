import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { SharePullRequestDialog } from "VersionControl/Scripts/Components/PullRequestReview/SharePullRequestDialog";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";

export interface IShareDialogContainerState {
    isLoading: boolean;
    isVisible: boolean;
    isSending: boolean;
    isMailEnabled: boolean;
    includeGroups: boolean;
    defaultRecipients: string[];
    errorMessage: string;
}

export class SharePullRequestContainer extends React.Component<React.Props<void>, IShareDialogContainerState> {

    constructor(props: React.Props<void>) {
        super(props);

        this.state = this._getState();
    }

    public render(): JSX.Element {

        return (
            <div>
                {!this.state.isLoading &&
                    this.state.isVisible &&
                    <SharePullRequestDialog
                        defaultRecipients={this.state.defaultRecipients}
                        isOpen={this.state.isVisible}
                        includeGroups={this.state.includeGroups}
                        onCancel={this._onCancel}
                        onSend={this._onSend}
                        errorMessage={this.state.errorMessage}
                        onDismissErrorMessage={this._onDismissErrorMessage}
                        isSending={this.state.isSending}
                        isMailEnabled={this.state.isMailEnabled} />
                }
            </div>
        );
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.sharePullRequestStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        Flux.instance().storesHub.sharePullRequestStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange() {
        this.setState(this._getState());
    }

    @autobind
    private _onCancel() {
        this._clearErrorMessage();
        this._setIsSending(false);
        Flux.instance().actionCreator.sharePullRequestActionCreator.hideShareDialog();
    }

    @autobind
    private _onDismissErrorMessage() {
        this._clearErrorMessage();
    }

    @autobind
    private _onSend(message: string, recipients: string[]) {
        const pullRequest = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();
        this._setIsSending(true);
        Flux.instance().actionCreator.pullRequestActionCreator.sharePullRequest(
            pullRequest.pullRequestId,
            message,
            recipients,
            (result) => {
                this._clearErrorMessage();
                this._setIsSending(false);
                Flux.instance().actionCreator.sharePullRequestActionCreator.hideShareDialog();
            },
            (error) => {
                const errorMessage = (error && error.message && error.message.length > 0) ? error.message : VSS_Resources_Common.ErrorSendEmail;
                this.setState({
                    errorMessage,
                    isSending: false
                } as IShareDialogContainerState);
            });
    }

    private _getState(): IShareDialogContainerState {
        const  mailSettings = Flux.instance().storesHub.contextStore.getTfsContext().configuration.getMailSettings();

        return {
            isVisible: Flux.instance().storesHub.sharePullRequestStore.isVisible,
            isLoading: Flux.instance().storesHub.pullRequestDetailStore.isLoading(),
            includeGroups: Flux.instance().storesHub.sharePullRequestStore.isTeamExpansionEnabled,
            defaultRecipients: Flux.instance().storesHub.sharePullRequestStore.defaultRecipients,
            isMailEnabled: mailSettings && mailSettings.enabled,
        } as IShareDialogContainerState;
    }

    @autobind
    private _clearErrorMessage() {
        this.setState({ errorMessage: "" } as IShareDialogContainerState);
    }

    @autobind
    private _setIsSending(isSending: boolean) {
        this.setState({ isSending } as IShareDialogContainerState);
    }

}
