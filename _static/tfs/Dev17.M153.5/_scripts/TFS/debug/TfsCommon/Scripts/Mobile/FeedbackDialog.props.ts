import "VSS/LoaderPlugins/Css!TfsCommon/Mobile/FeedbackDialog";

import * as React from "react";

export interface IFeedback {
    sentiment: string;
    comment: string;
}

export interface IFeedbackDialogProps {
    /** Indicates if dialog is open */
    isOpen: boolean;

    /** Classname to add to root element */
    className?: string;

    /** Title for feedback dialog */
    dialogTitle: string;

    /** Label prompting for positive user input */
    positivePromptLabel: string;

    /** Label prompting for negative user input */
    negativePromptLabel: string;

    /** Label for send button */
    sendButtonLabel: string;

    /** Label for canceling input */
    cancelButtonLabel: string;

    /** Maximum number of characters for comment input, defaults to 8192 */
    maximumCommentLength?: number;

    /**
     * Callback to send feedback
     * @param feedback Feedback entered by user
     * @param done Callback once feedback is sent, spinner is shown while sending
     */
    onFeedbackSend: (feedback: IFeedback, done: () => void) => void;

    /**
     * Callback to send feedback for when the Dialog is dismissed.
     */
    onDismiss?: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
}
