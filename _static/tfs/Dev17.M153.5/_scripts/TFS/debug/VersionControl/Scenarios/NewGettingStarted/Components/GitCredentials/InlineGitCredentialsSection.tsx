import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { DefaultButton } from "OfficeFabric/Button";
import { Spinner } from "OfficeFabric/Spinner";
import {
    MessageBar,
    MessageBarType
} from "OfficeFabric/MessageBar";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as AlternateCredentialsComponent_Async from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/AlternateCredentialsComponent";
import * as PatTokenComponent_Async from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/PatTokenComponent";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import "VSS/LoaderPlugins/Css!VersionControl/InlineGitCredentialsSection";

export interface InlineGitCredentialsProps {
    onGenerateGitCredentialsButtonClicked(): void;
    onDismissErrorMessage(): void;
    isGenerateGitCredentialsButtonClicked: boolean;
    isBasicAuthEnabled: boolean;
    alternateCredentialsComponentProps: AlternateCredentialsComponent_Async.AlternateCredentialsComponentProps;
    patTokenComponentProps: PatTokenComponent_Async.PatTokenComponentProps;
    errorMessage: string;
}

const delayAnnounceHelper = new DelayAnnounceHelper();

export const InlineGitCredentialsSection = (props: InlineGitCredentialsProps): JSX.Element => {
    return (
        props.isGenerateGitCredentialsButtonClicked
            ? <div className="git-getting-started-credentials-container">
                {props.errorMessage &&
                    <MessageBar
                        className="error-message-bar"
                        onDismiss={props.onDismissErrorMessage}
                        messageBarType={MessageBarType.error}>
                        {props.errorMessage}
                    </MessageBar>
                }
                <span className="vc-inline-git-credentials-control-body">
                    {props.isBasicAuthEnabled
                        ? <AsyncAlternateCredentialsComponent {...props.alternateCredentialsComponentProps} />
                        : <AsyncPatTokenComponent {...props.patTokenComponentProps} />
                    }
                </span>
            </div>
            : <DefaultButton
                id="vc-inline-git-credentials-create-credentials-button"
                ariaLabel={VCResources.CreatePatButtonText}
                onClick={props.onGenerateGitCredentialsButtonClicked}>
                {VCResources.CreatePatButtonText}
            </DefaultButton>
    );
}

const AsyncAlternateCredentialsComponent = getAsyncLoadedComponent<AlternateCredentialsComponent_Async.AlternateCredentialsComponentProps>(
    ["VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/AlternateCredentialsComponent"],
    (module: typeof AlternateCredentialsComponent_Async) => module.AlternateCredentialsComponent,
    () => { return <Spinner className="wait-spinner" /> },
    () => { delayAnnounceHelper.startAnnounce(VCResources.GitCredentials_StartedLoadingComponent) },
    () => { delayAnnounceHelper.stopAndCancelAnnounce(VCResources.GitCredentials_CompletedLoadingComponent) });

const AsyncPatTokenComponent = getAsyncLoadedComponent<PatTokenComponent_Async.PatTokenComponentProps>(
    ["VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/PatTokenComponent"],
    (module: typeof PatTokenComponent_Async) => module.PatTokenComponent,
    () => { return <Spinner className="wait-spinner" /> },
    () => { delayAnnounceHelper.startAnnounce(VCResources.GitCredentials_StartedLoadingComponent) },
    () => { delayAnnounceHelper.stopAndCancelAnnounce(VCResources.GitCredentials_CompletedLoadingComponent) });
