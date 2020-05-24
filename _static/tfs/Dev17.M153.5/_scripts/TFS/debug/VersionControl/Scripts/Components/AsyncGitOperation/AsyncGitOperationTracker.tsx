import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { DefaultButton, PrimaryButton, IButton } from "OfficeFabric/Button";
import { DialogFooter } from "OfficeFabric/Dialog";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { ProgressIndicator } from "OfficeFabric/ProgressIndicator";

import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import "VSS/LoaderPlugins/Css!VersionControl/AsyncGitOperationTracker";

export interface OperationCompletedProps {
    message?: string;
    primaryButtonText?: string;
    defaultButtonText?: string;
    primaryButtonUrl?: string;
}

/**
 * Properties for tracking an async ref operation
 */
export interface AsyncGitOperationTrackerProps {
    // A callback for when the dialog is closed.
    onClose(): void;
    // A callback for when the user chooses to create a pull request after the operation.
    onCreatePullRequest(): void;
    // Current percentage complete
    progressPercent: number;
    // Current progress message
    message: string;
    // Did the operation encounter an error?
    isError: boolean;
    // Did the operation complete successfully?
    isComplete: boolean;
    // New Ref URL and name if operation completes successfully
    newRefUrl?: string;
    newRefName?: string;
    operationCompletedProps: OperationCompletedProps;
}

/**
 * A visual tracker with a progress bar and a message for async ref operations.
 */
export class AsyncGitOperationTracker extends React.Component<AsyncGitOperationTrackerProps, {}> {

    private _defaultButton: IButton;

    public render(): JSX.Element {
        const operationCompletedProps = this.props.operationCompletedProps;
        return (
            <div>
                {!this.props.isComplete && !this.props.isError &&
                    <ProgressIndicator
                        percentComplete={this.props.progressPercent}
                        description={this.props.message} />
                }

                {this.props.isComplete &&
                    <MessageBar
                        messageBarType={MessageBarType.success}>
                        <FormattedComponent
                            format={operationCompletedProps.message ? operationCompletedProps.message : this.props.message}
                            elementType="div">
                            {this.props.newRefName && this.props.newRefUrl &&
                                <Link
                                    href={this.props.newRefUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={this.props.newRefName}>
                                    {this.props.newRefName}
                                </Link>
                            }
                        </FormattedComponent>
                    </MessageBar>
                }
                {this.props.isError &&
                    <MessageBar messageBarType={MessageBarType.error}>
                        {this.props.message}
                    </MessageBar>
                }
                {this._getDialogFooter()}
            </div>
        );
    }

    private _getDialogFooter(): JSX.Element {
        const operationCompletedProps = this.props.operationCompletedProps;
        const onPrimaryButtonClicked = !operationCompletedProps.primaryButtonUrl ? this.props.onCreatePullRequest : null;

        return (
            <DialogFooter>
                <PrimaryButton
                    onClick={this.props.isComplete ? onPrimaryButtonClicked : null}
                    disabled={!this.props.isComplete}
                    href={operationCompletedProps.primaryButtonUrl}>
                    {operationCompletedProps.primaryButtonText}
                </PrimaryButton>
                <DefaultButton
                    onClick={this.props.onClose}
                    componentRef={el => this._defaultButton = el}>
                    {operationCompletedProps.defaultButtonText}
                </DefaultButton>
            </DialogFooter>
        );
    }

    public componentDidMount() {
        // When a user chooses to start an async operation (e.g Revert) the Action button disappears
        // For accessibility reasons we force focus to the "Close" button when the async operation
        // starts
        this._defaultButton.focus();
    }
}
