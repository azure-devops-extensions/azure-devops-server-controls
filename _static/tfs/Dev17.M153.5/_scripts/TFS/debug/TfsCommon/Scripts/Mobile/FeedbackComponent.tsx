import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Q from "q";
import * as VSS_Context from "VSS/Context";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as TelemetryServices from "VSS/Telemetry/Services";

import { IFeedback } from "TfsCommon/Scripts/Mobile/FeedbackDialog.props";
import { FeedbackDialog } from "TfsCommon/Scripts/Mobile/FeedbackDialog";
import { autobind } from "OfficeFabric/Utilities";

export interface IFeedbackComponentProps {
    showDialog: boolean;
    onDismiss?: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Orchestrates the {@link FeedbackDialog}.
 */
export class FeedbackComponent extends React.Component<IFeedbackComponentProps, {}> {

    public render() {
        const { showDialog } = this.props;

        return <FeedbackDialog isOpen={showDialog}
            className="mobile-feedback"
            dialogTitle={Resources.MobileFeedbackDialogTitle}
            sendButtonLabel={Resources.MobileFeedbackSendButtonLabel}
            cancelButtonLabel={Resources.MobileFeedbackCancelButtonLabel}
            positivePromptLabel={Resources.MobileFeedbackPositivePrompt}
            negativePromptLabel={Resources.MobileFeedbackNegativePrompt}
            onFeedbackSend={this._onFeedbackSend}
            onDismiss={this._onFeedbackDismiss} />;
    }

    @autobind
    private _onFeedbackSend(feedback: IFeedback, done: () => void) {
        const { hubsContext, webContext } = VSS_Context.getPageContext();
        const { selectedHubId, selectedHubGroupId } = hubsContext;
        TelemetryServices.publishEvent(new TelemetryServices.TelemetryEventData(
            "Survey",
            "MobileUserFeedback",
            {
                feedback,
                // GDPR: strip out everything except user id for user prop of webContext.
                webContext: { ...webContext, user: { id: webContext.user && webContext.user.id } },
                selectedHubId,
                selectedHubGroupId
            }));

        // Ensure CI item is sent to server + 1 sec delay for better UX;
        Q(TelemetryServices.flush()).delay(1000).then(done, done);
    }

    @autobind
    private _onFeedbackDismiss(ev?: React.MouseEvent<HTMLButtonElement>) {
        const { onDismiss } = this.props;
        if (onDismiss) {
            onDismiss(ev);
        }
    }
}

const dialogRootId = "mobile-feedback-form";

export function showFeedbackDialog() {
    let dialogRoot = document.getElementById(dialogRootId);
    if (!dialogRoot) {
        dialogRoot = document.createElement("div");
        dialogRoot.setAttribute("id", dialogRootId);
        document.body.appendChild(dialogRoot);
    }

    ReactDOM.render(<FeedbackComponent onDismiss={_onFeedbackDismiss} showDialog={true} />, dialogRoot);
}

function _onFeedbackDismiss() {
    const dialogRoot = document.getElementById(dialogRootId);
    if (dialogRoot) {
        ReactDOM.unmountComponentAtNode(dialogRoot);
        dialogRoot.parentNode.removeChild(dialogRoot);
    }
}
