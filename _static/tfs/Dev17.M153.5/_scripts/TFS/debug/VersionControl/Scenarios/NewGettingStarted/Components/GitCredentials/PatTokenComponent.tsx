import * as React from "react";
import {
    MessageBar,
    MessageBarType
} from "OfficeFabric/MessageBar";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { TextFieldWithCopyButton } from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/TextFieldWithCopyButton";
import "VSS/LoaderPlugins/Css!VersionControl/PatTokenComponent";

export interface PatTokenComponentProps {
    patUsername: string;
    patPassword: string;
    patTokensRootUrl: string;
}

export const PatTokenComponent = (props: PatTokenComponentProps): JSX.Element => {
    return (
        <span className="vc-inline-git-credentials-pat-section">
            <TextFieldWithCopyButton
                className="vc-inline-git-credentials-pat-username-container"
                label={VCResources.UserNameText}
                value={props.patUsername}
                autoFocusCopyButton={true}
                tooltipBeforeCopied={VCResources.EmptyRepo_PatUsernameCopyButtonTooltipBeforeCopied}
                tooltipAfterCopied={VCResources.EmptyRepo_PatUsernameCopyButtonTooltipAfterCopied} />
            <TextFieldWithCopyButton
                className="vc-inline-git-credentials-pat-token-container"
                label={VCResources.UserPasswordText}
                value={props.patPassword}
                tooltipBeforeCopied={VCResources.EmptyRepo_PatPasswordCopyButtonTooltipBeforeCopied}
                tooltipAfterCopied={VCResources.EmptyRepo_PatPasswordCopyButtonTooltipAfterCopied} />
            <MessageBar
                className="pat-warning-message"
                messageBarType={MessageBarType.severeWarning}>
                {VCResources.CreatePersonalAccessTokenOneTimeWarning}
                <a
                    href={props.patTokensRootUrl}
                    target="_blank"
                    rel="noopener noreferrer">
                    {VCResources.LearnMore}
                </a>
            </MessageBar>
        </span>
    );
}