import * as React from "react";
import { TextField } from "OfficeFabric/TextField";
import { Spinner } from "OfficeFabric/Spinner";
import { DefaultButton } from "OfficeFabric/Button";
import {
    Callout,
    ICalloutProps
} from "OfficeFabric/Callout";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { TextFieldWithCopyButton } from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/TextFieldWithCopyButton";
import "VSS/LoaderPlugins/Css!VersionControl/AlternateCredentialsComponent";
import "VSS/LoaderPlugins/Css!fabric";

export interface AlternateCredentialsComponentProps {
    primaryUsername: string;
    alias: string;
    password: string;
    confirmPassword: string;
    isSaveButtonDisabled: boolean;
    waitingOnServer: boolean;
    onAliasChanged(string): void;
    onPasswordChanged(string): void;
    onConfirmPasswordChanged(string): void;
    onSaveGitCredentialsClicked(): void;
    isAlternateCredentialsSavedSuccessfully: boolean;
    onAliasEditingFinished(): void;
    onPasswordEditingFinished(): void;
    onConfirmPasswordEditingFinished(): void;
    aliasErrorMessage: string;
    passwordErrorMessage: string;
    confirmPasswordErrorMessage: string;
    patTokensRootUrl: string;
    onPasswordEditingStarted(): void;
}

export class AlternateCredentialsComponent extends React.Component<AlternateCredentialsComponentProps, {}> {
    private _saveGitCredentialsButton: HTMLElement = null;
    private _aliasTextField: TextField = null;

    public componentDidMount(): void {
        if (this._aliasTextField) {
            this._aliasTextField.focus();
        }
    }

    public render(): JSX.Element {
        return (
            <span className="vc-inline-git-credentials-altcreds-section">
                <TextFieldWithCopyButton
                    className="vc-inline-git-credentials-primary-username-container"
                    label={VCResources.AccountServerResources_AlternateCredentialsUsernamePrimary}
                    value={this.props.primaryUsername}
                    tooltipBeforeCopied={VCResources.EmptyRepo_UsernameCopyButtonTooltipBeforeCopied}
                    tooltipAfterCopied={VCResources.EmptyRepo_UsernameCopyButtonTooltipAfterCopied} />
                <TextFieldWithCopyButton
                    className="vc-inline-git-credentials-secondary-username-container"
                    textFieldRef={(ref: TextField): void => { this._aliasTextField = ref }}
                    label={VCResources.AliasLabelText}
                    value={this.props.alias}
                    isEditable={true}
                    onChanged={this.props.onAliasChanged}
                    onBlur={this.props.onAliasEditingFinished}
                    errorMessage={this.props.aliasErrorMessage}
                    tooltipBeforeCopied={VCResources.EmptyRepo_AliasCopyButtonTooltipBeforeCopied}
                    tooltipAfterCopied={VCResources.EmptyRepo_AliasCopyButtonTooltipAfterCopied} />
                <TextField
                    className="vc-inline-git-credentials-password-container"
                    inputClassName="vc-inline-git-credentials-password-input"
                    required={true}
                    value={this.props.password}
                    label={VCResources.AccountServerResources_AlternateCredentialsPassword}
                    onChanged={this.props.onPasswordChanged}
                    onBlur={this.props.onPasswordEditingFinished}
                    onFocus={this.props.onPasswordEditingStarted}
                    errorMessage={this.props.passwordErrorMessage}
                    type="password" />
                <TextField
                    className="vc-inline-git-credentials-password-confirmation-container"
                    inputClassName="vc-inline-git-credentials-password-confirmation-input"
                    required={true}
                    value={this.props.confirmPassword}
                    label={VCResources.AccountServerResources_AlternateCredentialsConfirmPassword}
                    onChanged={this.props.onConfirmPasswordChanged}
                    onBlur={this.props.onConfirmPasswordEditingFinished}
                    onFocus={this.props.onPasswordEditingStarted}
                    errorMessage={this.props.confirmPasswordErrorMessage}
                    type="password" />
                <div
                    ref={(ref) => this._saveGitCredentialsButton = ref}
                    className="control-with-button vc-inline-git-credentials-button-pane">
                    <DefaultButton
                        disabled={this.props.isSaveButtonDisabled || this.props.waitingOnServer}
                        ariaLabel={VCResources.SaveGitCredentials}
                        onClick={this.props.onSaveGitCredentialsClicked}>
                        {VCResources.SaveGitCredentials}
                    </DefaultButton>
                    {
                        this.props.waitingOnServer && <Spinner className="save-git-credentials-wait-spinner" />
                    }
                    {this.props.isAlternateCredentialsSavedSuccessfully &&
                        <Callout
                            className="success-message-callout"
                            target={this._saveGitCredentialsButton}
                            directionalHint={DirectionalHint.bottomLeftEdge}
                            gapSpace={0}
                            beakWidth={6}
                            doNotLayer={true}>
                            <div className="callout-content">
                                <span
                                    className="text"
                                    aria-label={VCResources.SuccessfullyCreatedGitCredentials}>
                                    {VCResources.SuccessfullyCreatedGitCredentials}
                                </span>
                            </div>
                        </Callout>
                    }
                </div>
                <span className="vc-inline-git-credentials-links">
                    <TooltipHost
                        id="orCreatePatLinkToolTip"
                        content={VCResources.PersonalAccessTokenDescriptionText}
                        directionalHint={DirectionalHint.rightCenter}>
                        <a
                            className="vc-inline-git-credentials-altcreds-create-pat-link"
                            aria-describedby="orCreatePatLinkToolTip"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={this.props.patTokensRootUrl}>
                            {VCResources.CreatePersonalAccessTokenText}
                        </a>
                    </TooltipHost>
                    <a
                        className="vc-inline-git-credentials-altcreds-learn-more-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={VCResources.GitCredentialsLearnMoreLink}>
                        {VCResources.LearnMoreAboutAuthenticationOptions}
                    </a>
                </span>
            </span>
        );
    }
}