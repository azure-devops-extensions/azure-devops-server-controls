import "VSS/LoaderPlugins/Css!TfsCommon/Mobile/FeedbackDialog";

import * as React from "react";

import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as Scroll from "TfsCommon/Scripts/Mobile/Scroll";

import { AnimatedEntry } from "TfsCommon/Scripts/Components/Animation/AnimatedEntry";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { css, autobind } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { IFeedbackDialogProps } from "TfsCommon/Scripts/Mobile/FeedbackDialog.props";

export enum FeedbackViewState {
    Input,
    Sending,
    Sent
}

export interface IFeedbackDialogState {
    viewState?: FeedbackViewState;
    sentiment?: string;
    comment?: string;
}

const DefaultMaxCommentLengthInCharacters = 5000;
const PositiveSentiment = "smile";
const NegativeSentiment = "frown";

/**
 * Mobile Feedback Dialog that allows user to input sentiment and some comments.
 * It does not process the input, instead it just passes the input back to the caller
 * via onFeedbackSend callback.
 */
export class FeedbackDialog extends React.Component<IFeedbackDialogProps, IFeedbackDialogState> {

    constructor(props: IFeedbackDialogProps) {
        super(props);
        this.state = this._getInitialState();
    }

    render() {
        let content: JSX.Element | JSX.Element[];

        switch (this.state.viewState) {
            case FeedbackViewState.Input:
                const { positivePromptLabel, negativePromptLabel } = this.props;
                const privacyLink = "https://go.microsoft.com/fwlink/?LinkId=264782";
                content = <div>
                    <div className="sentiment">
                        <ChoiceGroup onChange={this._onSentimentChange}
                            selectedKey={this.state.sentiment}
                            options={[
                                {
                                    key: PositiveSentiment,
                                    iconProps: { iconName: "Emoji2" },
                                    text: Resources.MobileFeedbackPositiveSentiment,
                                },
                                {
                                    key: NegativeSentiment,
                                    iconProps: { iconName: "Sad" },
                                    text: Resources.MobileFeedbackNegativeSentiment,
                                }
                            ]}
                        />
                    </div>
                    <Label>
                        {this.state.sentiment === NegativeSentiment
                            ? negativePromptLabel
                            : positivePromptLabel}
                    </Label>

                    <TextField
                        ariaLabel={Resources.MobileFeedbackCommentAriaLabel}
                        onChanged={this._onCommentChange}
                        multiline
                        resizable={false}
                        maxLength={this.props.maximumCommentLength || DefaultMaxCommentLengthInCharacters}
                    />

                    <div className="feedback-privacy-container bowtie">
                        <a className="feedback-privacy-link" target="_blank" rel="external" href={privacyLink}>{Resources.PrivacyStatement}</a>
                    </div>

                    <DialogFooter>
                        <PrimaryButton disabled={!this._isValid()} onClick={this._sendFeedback}>{this.props.sendButtonLabel}</PrimaryButton>
                        <DefaultButton onClick={this._onCloseDialog}>{this.props.cancelButtonLabel}</DefaultButton>
                    </DialogFooter>
                </div>;
                break;

            case FeedbackViewState.Sending:
                content = <div className="feedback-loading">
                    <Spinner className="feedback-loading-spinner" size={SpinnerSize.large} />
                    {Resources.MobileFeedbackSending}
                </div>;
                break;

            case FeedbackViewState.Sent:
                content = <div className="feedback-sent">
                    <div className="feedback-sent-icon">
                        <AnimatedEntry className="check" enterTimeout={400} enterClassName={"check-anim"}>
                            <span className="container selection">
                                <Icon iconName="CheckMark" />
                            </span>
                        </AnimatedEntry>
                    </div>
                    {Resources.MobileFeedbackSent}
                </div>;
                break;
        }

        return <Fabric className={css("feedback", this.props.className)}>
            <Dialog
                className="feedback-dialog"
                isOpen={this.props.isOpen}
                onLayerDidMount={this._onShowDialog}
                type={this._getDialogType()}
                isBlocking={this.state.viewState === FeedbackViewState.Sending}
                onDismiss={this._onCloseDialog}
                title={this.props.dialogTitle}
                closeButtonAriaLabel={this.props.cancelButtonLabel}>
                <div className="feedback-dialog-content">
                    {content}
                </div>
            </Dialog>
        </Fabric>;
    }

    private _getDialogType() {
        if (this.state.viewState === FeedbackViewState.Sending) {
            return DialogType.normal;
        }

        return DialogType.close;
    }

    private _isValid(): boolean {
        const { sentiment, comment } = this.state;

        const ratingEntered = sentiment !== null && comment.length > 0;
        return ratingEntered;
    }

    private _getSentiment(option?: IChoiceGroupOption): string {
        if (option) {
            return option.key;
        }
        return null;
    }

    @autobind
    private _onSentimentChange(event?: React.FormEvent<HTMLElement>, option?: IChoiceGroupOption) {
        const sentiment: string = this._getSentiment(option);
        this.setState({
            sentiment
        } as IFeedbackDialogState);
    };

    @autobind
    private _onCommentChange(comment: string) {
        this.setState({
            comment
        } as IFeedbackDialogState);
    };

    @autobind
    private _onShowDialog() {
        // reset dialog on open.
        this.setState(this._getInitialState());
        Scroll.disableBodyScroll();
    }

    @autobind
    private _onCloseDialog() {
        Scroll.enableBodyScroll();

        const { onDismiss } = this.props;
        if (onDismiss) {
            onDismiss();
        }
    }

    @autobind
    private _sendFeedback() {
        const { sentiment, comment } = this.state;

        this.setState({
            viewState: FeedbackViewState.Sending
        } as IFeedbackDialogState, () => {
            this.props.onFeedbackSend({
                sentiment,
                comment
            }, () => {
                this.setState({
                    viewState: FeedbackViewState.Sent
                });
            });
        });
    }

    private _getInitialState(): IFeedbackDialogState {
        return {
            viewState: FeedbackViewState.Input,
            sentiment: null,
            comment: ""
        };
    }
}
