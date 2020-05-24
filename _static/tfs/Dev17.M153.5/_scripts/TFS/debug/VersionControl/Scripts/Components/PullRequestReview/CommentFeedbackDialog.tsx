import React = require("react");
import ReactDOM = require("react-dom");

import Dialogs = require("VSS/Controls/Dialogs");
import VCModalDialog = require("VersionControl/Scripts/Controls/VersionControlModalDialog");

import Telemetry = require("VSS/Telemetry/Services");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");

export interface ICommentFeedbackDialogOptions extends Dialogs.IModalDialogOptions {
    thread: DiscussionCommon.DiscussionThread;
}

export class CommentFeedbackDialog extends VCModalDialog.VersionControlModalDialog<ICommentFeedbackDialogOptions> {
    public initializeOptions(options?: ICommentFeedbackDialogOptions) {
        super.initializeOptions($.extend({
            title: DiscussionResources.CommentFeedbackDialog_Title,
            width: 560,
            resizable: false,
            draggable: true,

            buttons: {
                "ok": {
                    id: "ok",
                    text: DiscussionResources.CommentFeedbackDialog_OkText,
                    click: () => this.sendFeedback()
                },
                "cancel": {
                    id: "cancel",
                    text: "Cancel",
                    click: () => this.close()
                }
            },

            // Dialogs.ts is currently using the deprecated "bowtie-style" class; this messes up paragraph spacing. Use the newer "bowtie" class.
            useBowtieStyle: false,
            bowtieVersion: 0,
            dialogClass: "bowtie",
        }, options));
    }

    public initialize() {
        super.initialize();

        ReactDOM.render(
            <CommentFeedbackDialogBody
                thread={this._options.thread}
                />,
            this._element[0]
        );
    }

    public sendFeedback(): void {
        const commentFeedbackContent = $(this._element).find(".vc-dialog-comment-feedback-input").val();
        const wrongWordWasChecked = $(this._element).find(".vc-dialog-comment-feedback-wrong-word-checkbox").is(":checked");

        if (this._options.thread && this._options.thread.firstComparingIteration && this._options.thread.secondComparingIteration) {
            const commentFeedbackEvent = new Telemetry.TelemetryEventData("CommentTracking", "CommentFeedbackDialog", {
                "threadId": this._options.thread.id,
                "artifactUri": this._options.thread.artifactUri,
                "itemPath": this._options.thread.itemPath,
                "originalFirstIteration": this._options.thread.firstComparingIteration,
                "originalSecondIteration": this._options.thread.secondComparingIteration,
                "trackedFirstIteration": this._options.thread.trackingCriteria.firstComparingIteration,
                "trackedSecondIteration": this._options.thread.trackingCriteria.secondComparingIteration,
                "feedbackContent": commentFeedbackContent,
                "wrongWordBoxWasChecked": wrongWordWasChecked
            });
            Telemetry.publishEvent(commentFeedbackEvent);
        }

        this.close();
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }
}

export interface ICommentFeedbackDialogBodyProps extends React.Props<void> {
    thread: DiscussionCommon.DiscussionThread;
}

/**
 * A react class that represents our dialog body.
 */
class CommentFeedbackDialogBody extends React.Component<ICommentFeedbackDialogBodyProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="bowtie">
                <div className="form-section">
                    <label
                        htmlFor="feedbackInput">
                        {DiscussionResources.CommentFeedbackDialog_SecondaryText}
                    </label>
                    <textarea
                        className="vc-dialog-comment-feedback-input"
                        id="feedbackInput"
                        style={{ resize: "none", height: "100px" }}
                        maxLength={3500}>
                    </textarea>
                </div>
                <fieldset>
                    <input
                        className="checkbox-input vc-dialog-comment-feedback-wrong-word-checkbox"
                        type="checkbox"
                        id="wrongWordCheckbox"
                        title={DiscussionResources.CommentFeedbackDialog_WrongWordLabelText}/>
                    <label
                        htmlFor="wrongWordCheckbox">
                        {DiscussionResources.CommentFeedbackDialog_WrongWordLabelText}
                    </label>
                </fieldset>
            </div>
        );  
    }
}
