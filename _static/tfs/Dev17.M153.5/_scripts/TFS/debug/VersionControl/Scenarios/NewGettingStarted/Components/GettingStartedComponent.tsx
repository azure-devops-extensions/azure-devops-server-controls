import * as React from "react";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getScenarioManager } from "VSS/Performance";
import { IPivotedTextBoxPair } from "VSSPreview/Flux/Components/PivotedTextBoxWithCopy";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Accordion } from "VersionControl/Scenarios/NewGettingStarted/Components/Accordion";
import { StoresHub, AggregatedState } from "VersionControl/Scenarios/NewGettingStarted/Stores/StoresHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ActionsCreatorHub } from "VersionControl/Scenarios/NewGettingStarted/ActionsCreatorHub";
import { ClonePopupTitle } from "VersionControl/Scenarios/NewGettingStarted/Components/ClonePopupTitle";
import { GettingStartedTitle } from "VersionControl/Scenarios/NewGettingStarted/Components/GettingStartedTitle";
import { CloneToComputerSection } from "VersionControl/Scenarios/NewGettingStarted/Components/CloneToComputerSection";
import { PushFromCommandLineSection } from "VersionControl/Scenarios/NewGettingStarted/Components/PushFromCommandLineSection";
import { ImportRepositorySection } from "VersionControl/Scenarios/NewGettingStarted/Components/ImportRepositorySection";
import { InitializeRepository } from "VersionControl/Scenarios/NewGettingStarted/Components/InitializeRepository";
import { BuildSection } from "VersionControl/Scenarios/NewGettingStarted/Components/BuildSection";
import { AlternateCredentialsComponentProps } from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/AlternateCredentialsComponent";
import { PatTokenComponentProps } from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/PatTokenComponent";
import { InlineGitCredentialsProps } from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/InlineGitCredentialsSection";
import "VSS/LoaderPlugins/Css!VersionControl/GettingStartedComponent";

export interface GettingStartedProps {
    tfsContext: TfsContext;
    storesHub: StoresHub;
    actionsCreatorHub: ActionsCreatorHub;
    isCloneExperience?: boolean;
    showOnlyCommandLine?: boolean;
    isEmptyProject?: boolean;
    heading?: string;
    headingLevel: number;
    onEscape?(): void;
    hasBuildPermission?: boolean;
    buildUrl?: string;
    recordPageLoadScenario?: boolean;
}

/**
* A control that displays in the main code hub when a user lands on an empty Git repo or empty project.
* in the context of a Git repo.
*/
export class GettingStartedComponent extends React.Component<GettingStartedProps, AggregatedState> {

    constructor(props: GettingStartedProps, context?: any) {
        super(props, context);
        this.state = this.props.storesHub.getAggregatedState();
    }

    public render(): JSX.Element {
        const showOnlyCommandLine = this.props.showOnlyCommandLine
            || this.state.gitCredentialsState.isUserAnonymous
            || this.state.gitCredentialsState.isUserPublic;

        if (this.props.isCloneExperience) {
            return this._renderClonePopupExperience(showOnlyCommandLine);
        } else {
            return this._renderEmptyRepoExperience(showOnlyCommandLine);
        }
    }

    public componentDidMount(): void {
        const EmptyRepoPageLoad = "EmptyRepoPage.Load";
        if (this.props.recordPageLoadScenario) {
            getScenarioManager().recordPageLoadScenario("VersionControl", EmptyRepoPageLoad);
        } else {
            getScenarioManager().split(EmptyRepoPageLoad);
        }

        this.props.storesHub.mainStore.addChangedListener(this._onStoreChanged);
        this.props.storesHub.gitCredentialsStore.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.mainStore.removeChangedListener(this._onStoreChanged);
        this.props.storesHub.gitCredentialsStore.removeChangedListener(this._onStoreChanged);
    }

    private _handleEscapeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.ESCAPE && this.props.onEscape) {
            this.props.onEscape();
        }
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.storesHub.getAggregatedState());
    }

    private _renderClonePopupExperience = (showOnlyCommandLine: boolean): JSX.Element => {
        return (
            <div
                onKeyDown={this._handleEscapeKeyDown}
                id="getting-started-clone-popup">
                <div className="title-text">
                    <ClonePopupTitle
                        title={this.props.heading}
                        showOnlyCommandLine={showOnlyCommandLine}
                        headingLevel={this.props.headingLevel} />
                </div>
                {this._renderCloneToComputerSection(true, showOnlyCommandLine)}
            </div>
        );
    }

    private _renderEmptyRepoExperience = (showOnlyCommandLine: boolean): JSX.Element => {
        const hasGitContributePermission = this.state.mainState.hasGitContributePermission;
        const showBuildAccordion = this.props.isEmptyProject
            && this.props.hasBuildPermission
            && !!this.props.buildUrl;

        return (
            <div
                role="region"
                aria-label={VCResources.GettingStartedRegion_Label}>
                <GettingStartedTitle
                    title={this.props.heading}
                    headingLevel={this.props.headingLevel} />
                <dl>
                    <Accordion
                        initiallyExpanded={true}
                        headingLevel={this.props.headingLevel + 1}
                        label={VCResources.GettingStarted_CloneToComputerText}>
                        {this._renderCloneToComputerSection(false, showOnlyCommandLine)}
                    </Accordion>
                    {
                        hasGitContributePermission &&
                        <div>
                            <Accordion
                                initiallyExpanded={!this.props.isEmptyProject}
                                headingLevel={this.props.headingLevel + 1}
                                label={VCResources.GettingStarted_PushFromCommandLine}>
                                <PushFromCommandLineSection
                                    pushCommandPairs={this.state.mainState.pushCommandPairs}
                                    toggleButtonSelectedKey={this.state.mainState.toggleButtonSelectedKey}
                                    onToggleButtonClicked={this.props.actionsCreatorHub.toggleButtonClicked}
                                />
                            </Accordion>
                            <Accordion
                                initiallyExpanded={!this.props.isEmptyProject}
                                headingLevel={this.props.headingLevel + 1}
                                label={VCResources.GettingStarted_ImportRepository}>
                                <ImportRepositorySection
                                    onImportRepositoryClick={this.props.actionsCreatorHub.openImportRepositoryDialog} />
                            </Accordion>
                            <Accordion
                                initiallyExpanded={!this.props.isEmptyProject}
                                headingLevel={this.props.headingLevel + 1}
                                noSeparator={!this.props.isEmptyProject}
                                label={VCResources.GettingStarted_QuickInitialize}>
                                <InitializeRepository
                                    isCreatingFile={this.state.mainState.isCreatingFile}
                                    lastErrorMessage={this.state.mainState.lastErrorMessage}
                                    onInitializeClicked={this.props.actionsCreatorHub.initializeRepository}
                                    projectName={this.props.tfsContext.navigation.project} />
                            </Accordion>
                        </div>
                    }
                    {
                        showBuildAccordion &&
                        <Accordion
                            initiallyExpanded={false}
                            headingLevel={this.props.headingLevel + 1}
                            label={VCResources.GettingStarted_BuildCode}
                            noSeparator={true}>
                            <BuildSection buildUrl={this.props.buildUrl} />
                        </Accordion>
                    }
                </dl>
            </div>
        );
    }

    private _renderCloneToComputerSection = (inClonePopup: boolean, showOnlyCommandLine: boolean): JSX.Element => {
        const alternateCredentialsComponentProps: AlternateCredentialsComponentProps = {
            primaryUsername: this.state.gitCredentialsState.primaryUsername,
            alias: this.state.gitCredentialsState.alias,
            password: this.state.gitCredentialsState.password,
            confirmPassword: this.state.gitCredentialsState.confirmPassword,
            isSaveButtonDisabled: this.state.gitCredentialsState.isSaveButtonDisabled,
            waitingOnServer: this.state.gitCredentialsState.waitingOnServer,
            onAliasChanged: this.props.actionsCreatorHub.gitCredentialsActionsCreator.updateAlias,
            onPasswordChanged: this.props.actionsCreatorHub.gitCredentialsActionsCreator.updatePassword,
            onConfirmPasswordChanged: this.props.actionsCreatorHub.gitCredentialsActionsCreator.updateConfirmPassword,
            onSaveGitCredentialsClicked: this.props.actionsCreatorHub.gitCredentialsActionsCreator.saveAlternateCredentialsData,
            isAlternateCredentialsSavedSuccessfully: this.state.gitCredentialsState.isAlternateCredentialsSavedSuccessfully,
            onAliasEditingFinished: this.props.actionsCreatorHub.gitCredentialsActionsCreator.aliasEditingFinished,
            onPasswordEditingFinished: this.props.actionsCreatorHub.gitCredentialsActionsCreator.passwordEditingFinished,
            onConfirmPasswordEditingFinished: this.props.actionsCreatorHub.gitCredentialsActionsCreator.confirmPasswordEditingFinished,
            aliasErrorMessage: this.state.gitCredentialsState.aliasErrorMessage,
            passwordErrorMessage: this.state.gitCredentialsState.passwordErrorMessage,
            confirmPasswordErrorMessage: this.state.gitCredentialsState.confirmPasswordErrorMessage,
            patTokensRootUrl: this.state.gitCredentialsState.patTokensRootUrl,
            onPasswordEditingStarted: this.props.actionsCreatorHub.gitCredentialsActionsCreator.passwordEditingStarted,
        };

        const patTokenComponentProps: PatTokenComponentProps = {
            patUsername: this.state.gitCredentialsState.patUsername,
            patPassword: this.state.gitCredentialsState.patPassword,
            patTokensRootUrl: this.state.gitCredentialsState.patTokensRootUrl,
        };

        const inlineGitCredentialsProps: InlineGitCredentialsProps = {
            onGenerateGitCredentialsButtonClicked:
            this.props.actionsCreatorHub.gitCredentialsActionsCreator.generateGitCredentialsButtonClicked,
            onDismissErrorMessage: this.props.actionsCreatorHub.gitCredentialsActionsCreator.removeGenerateGitCredentialsError,
            isGenerateGitCredentialsButtonClicked: this.state.gitCredentialsState.isGenerateGitCredentialsButtonClicked,
            isBasicAuthEnabled: this.state.gitCredentialsState.isBasicAuthEnabled,
            alternateCredentialsComponentProps: alternateCredentialsComponentProps,
            patTokenComponentProps: patTokenComponentProps,
            errorMessage: this.state.gitCredentialsState.errorMessage,
        };

        return (
            <CloneToComputerSection
                inClonePopup={inClonePopup}
                showOnlyCommandLine={showOnlyCommandLine}
                cloneUrlPairs={this.state.mainState.cloneUrlPairs}
                selectedIde={this.state.mainState.selectedIde}
                supportedIdes={this.state.mainState.supportedIdes}
                onDownloadGitForWindowsClick={() => this.props.actionsCreatorHub.downloadGitForWindows()}
                onOpenInIdeClick={ide => this.props.actionsCreatorHub.openInIde(ide)}
                isWindowsPlatform={this.state.mainState.isWindowsPlatform}
                tfsContext={this.props.tfsContext}
                isHosted={this.state.mainState.isHosted}
                isUserAnonymous={this.state.gitCredentialsState.isUserAnonymous}
                isUserPublic={this.state.gitCredentialsState.isUserPublic}
                isSshSelected={this.state.mainState.isSshSelected}
                toggleButtonSelectedKey={this.state.mainState.toggleButtonSelectedKey}
                onToggleButtonClicked={this.props.actionsCreatorHub.toggleButtonClicked}
                onShowSshKeyManagementClick={() => this.props.actionsCreatorHub.showSshKeyManagement()}
                inlineGitCredentialsProps={inlineGitCredentialsProps}
            />);
    }
}