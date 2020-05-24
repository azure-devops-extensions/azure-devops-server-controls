import * as React from "react";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind, css } from "OfficeFabric/Utilities";

import { ConfirmationDialog } from "Presentation/Scripts/TFS/Components/ConfirmationDialog";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import * as RepositorySelector from "ProjectOverview/Scripts/Components/ReadmeSection/RepositorySelector";
import { WikiPageNotFoundError } from "ProjectOverview/Scripts/Components/ReadmeSection/WikiPageNotFoundError";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ReadmeSection/ChangeDisplayFileDialog";

export interface ChangeDisplayFileDialogProps {
    isOpen: boolean;
    errorMessage: string;
    isDefaultSetToWikiHomePage: boolean;
    isRepositoryChangeInProgress: boolean;
    showWikiPageNotFoundError: boolean;
    currentRepositoryContext: RepositoryContext;
    defaultRepositoryContext: RepositoryContext;
    supportsTfvc: boolean;
    onDismiss(): void;
    onSaveRepositoryChangesClicked(): void;
    onLocalRepositoryChange(repositoryContext: RepositoryContext): void;
    onReadmeFileSeleted(repositoryContext: RepositoryContext): void;
    onWikiHomePageSelected(): void;
}

export interface ChangeDisplayFileDialogState {
    isWikiHomePageSelected: boolean;
    currentRepoInSelector?: RepositoryContext; // even if current selected repo is wiki, this will contain repo sleected in the reposelector
}

export class ChangeDisplayFileDialog extends React.Component<ChangeDisplayFileDialogProps, ChangeDisplayFileDialogState> {
   
    constructor(props: ChangeDisplayFileDialogProps) {
        super(props);
        this.state = {
            isWikiHomePageSelected: this.props.isDefaultSetToWikiHomePage,
            currentRepoInSelector: this.props.isDefaultSetToWikiHomePage ? null : this.props.currentRepositoryContext, // initalize to null will be reset to most recently used repo
        };
    }

    public componentWillReceiveProps(nextProps: ChangeDisplayFileDialogProps, nextState: ChangeDisplayFileDialogState): void {
        if (nextProps.isOpen !== this.props.isOpen) {
            // Reset currently selected option if dialog opened again.
            this.setState({
                isWikiHomePageSelected: this.props.isDefaultSetToWikiHomePage,
                currentRepoInSelector: this.props.isDefaultSetToWikiHomePage ? null : this.props.currentRepositoryContext,
            });
        }
    }

    public render(): JSX.Element {
        const isReadmeRepoNotFoundError = this.props.errorMessage === ProjectOverviewResources.Readme_ReadmeRepoNotFound;
        const isErrorPresent = (!!this.props.errorMessage && !isReadmeRepoNotFoundError) || this.props.showWikiPageNotFoundError;
        const disableChangeButton = !this.props.isRepositoryChangeInProgress || isErrorPresent;
        const showErrorMessage = Boolean(this.props.errorMessage || (this.props.showWikiPageNotFoundError && this.state.isWikiHomePageSelected));

        return (
            <Dialog
                hidden={!this.props.isOpen}
                onDismiss={this._onDiscardRepositoryChangesClick}
                modalProps={{
                    containerClassName: "change-readme dialog",
                    isBlocking: true,
                }}
                dialogContentProps={{
                    type: DialogType.close,
                    showCloseButton: true,
                    closeButtonAriaLabel: ProjectOverviewResources.CloseButtonAriaLabel,
                }}
                title={ProjectOverviewResources.ChangeReadmeDialog_Title}
                >
                {
                    <MessageBar
                        className={"readme-change message-bar"}
                        messageBarType={MessageBarType.info}>
                        {ProjectOverviewResources.ChangeReadmeDialog_ConfirmationMessage}
                    </MessageBar>
                }
                <ChoiceGroup
                    className={"display-content choice-group"}
                    onChange={this._onChange}
                    options={this._getChangeReadmeOptions() }
                    />
                {
                    showErrorMessage &&
                    <MessageBar
                        className={"readme-change message-bar"}
                        messageBarType={MessageBarType.error}>
                        {this.props.errorMessage}
                        {this.props.showWikiPageNotFoundError && <WikiPageNotFoundError />}
                    </MessageBar>
                }
                <DialogFooter>
                    <PrimaryButton
                        ariaLabel={this._getChangeButtonAriaLabel() }
                        disabled={disableChangeButton}
                        onClick={this._onChangeRepositoryClick}>
                        {ProjectOverviewResources.ChangeReadmeDialog_ChangeButtonText}
                    </PrimaryButton>
                    <DefaultButton
                        ariaLabel={ProjectOverviewResources.RepositorySelector_Discard}
                        onClick={this._onDiscardRepositoryChangesClick}>
                        {ProjectOverviewResources.ChangeReadmeDialog_CancelButtonText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _getChangeButtonAriaLabel(): string {
        return this.state.isWikiHomePageSelected
            ? ProjectOverviewResources.RepositorySelector_ChangeToReadme
            : ProjectOverviewResources.RepositorySelector_ChangeToWikiHomePage;
    }

    @autobind
    private _onChange(event: React.FormEvent<HTMLElement | HTMLInputElement>, selectedOption?: IChoiceGroupOption): void {
        const currentOption = this.state.isWikiHomePageSelected
            ? ProjectOverviewConstants.WikiHomePage
            : ProjectOverviewConstants.ReadmeFileName;
        let currentReadmeRepoContext = null;
        let currentWikiRepoContext = null;
        if (selectedOption.key !== currentOption) {
            switch (selectedOption.key) {
                case ProjectOverviewConstants.WikiHomePage:
                    // Verify that wiki repository with home page exists. If not, show error message.
                    this.props.onWikiHomePageSelected();
                    break;
                case ProjectOverviewConstants.ReadmeFileName:
                    // Look for repository other than wiki and try loading readme from that.
                    this.props.onReadmeFileSeleted(this.state.currentRepoInSelector);
                    break;
            }

            this.setState((prevState: ChangeDisplayFileDialogState) => {
                const isReadmeSelected = !prevState.isWikiHomePageSelected
                return {
                    isWikiHomePageSelected: !prevState.isWikiHomePageSelected
                }
            });
        }
    }

    private _getChangeReadmeOptions(): IChoiceGroupOption[] {
        const className = css("source-repositories-container", this.state.isWikiHomePageSelected ? "disabled-repo-selector" : "");

        const repositorySelectorProps: RepositorySelector.RepositorySelectorProps = {
            className: "repository-selector",
            initialRepositoryContext: this.state.currentRepoInSelector,
            supportsTfvc: this.props.supportsTfvc,
            onRepositoryChange: this._onRepoLocallyChanged,
            tfsContext: this.props.currentRepositoryContext.getTfsContext(),
            onDefaultRepositorySelected: this._onDefaultRepositorySelected,
        };

        return [
            {
                key: ProjectOverviewConstants.ReadmeFileName,
                text: ProjectOverviewConstants.ReadmeFileName,
                checked: !this.state.isWikiHomePageSelected,
                onRenderField: (props: IChoiceGroupOption, render: (props: IChoiceGroupOption) => JSX.Element): JSX.Element => {
                    return (
                        <div className={"radio-button-container"}>
                            {render(props) }
                            {
                                <div className={className} >
                                    <RepositorySelector.RepositorySelector {...repositorySelectorProps} />
                                </div>
                            }
                        </div>
                    );
                },
            },
            {
                key: ProjectOverviewConstants.WikiHomePage,
                text: ProjectOverviewResources.ChangeReadmeDialog_WikiHomePageText,
                checked: this.state.isWikiHomePageSelected,
            },
        ];
    }

    @autobind
    private _onChangeRepositoryClick(): void {
        this.props.onSaveRepositoryChangesClicked();
        this.props.onDismiss();
    }

    @autobind
    private _onDiscardRepositoryChangesClick(): void {
        if (this.props.isRepositoryChangeInProgress) {
            const projectId = this.props.defaultRepositoryContext.getTfsContext().contextData.project.id;
            const collectionId = this.props.defaultRepositoryContext.getTfsContext().contextData.collection.id;
            TelemetryClient.publishReadmeRepositoryChangeDiscarded({ ProjectId: projectId, CollectionId: collectionId });
            this.props.onLocalRepositoryChange(this.props.defaultRepositoryContext);
        }
        this.props.onDismiss();
    }

    @autobind
    private _onRepoLocallyChanged(repo: RepositoryContext): void {
        this.setState({ currentRepoInSelector: repo });
        this.props.onLocalRepositoryChange(repo);
    }

    @autobind
    private _onDefaultRepositorySelected(repo: RepositoryContext): void {
        this.setState({ currentRepoInSelector: repo });
    }
}
