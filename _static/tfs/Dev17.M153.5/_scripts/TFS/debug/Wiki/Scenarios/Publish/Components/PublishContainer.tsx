import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";

import { GitRepository } from "TFS/VersionControl/Contracts";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitVersionSelector } from "VersionControl/Scenarios/Shared/GitVersionSelector";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { PublishActionCreator } from "Wiki/Scenarios/Publish/PublishActionCreator";
import { PublishFields } from "Wiki/Scenarios/Publish/PublishActionsHub";
import { PublishDataStore, PublishData } from "Wiki/Scenarios/Publish/PublishDataStore";
import { FilePicker } from "Wiki/Scenarios/Integration/FilePicker/FilePicker";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { RepositoryPicker } from "Wiki/Scenarios/Integration/RepositoryPicker/RepositoryPicker";
import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { getWikiPageUrl, getWikiUrl, redirectToUrl } from "Wiki/Scripts/WikiUrls";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Publish/Components/PublishContainer";

export enum PublishMode {
    new,
    update
}

export interface PublishInputData {
    projectId: string;
    mode: PublishMode;
    wiki?: WikiV2;
}

export interface PublishContainerProps {
    inputData: PublishInputData;
    actionCreator: PublishActionCreator;
    store: PublishDataStore;
    onScenarioComplete?: (scenario?: string) => void;
}

export interface PublishContainerState {
    showFilePicker: boolean;
    publishData: PublishData;
}

export class PublishContainer extends React.Component<PublishContainerProps, PublishContainerState> {
    constructor(props: PublishContainerProps) {
        super(props);

        this.state = {
            showFilePicker: false,
            publishData: props.store.state,
        };

        if (this.props.inputData.wiki) {
            // We only have the repositoryId in wiki, get the GitRepository object for the same.
            const wikiRepositoryId = this.props.inputData.wiki.repositoryId;

            this.props.actionCreator.loadInitialRepository(wikiRepositoryId);
        }
    }

    public componentWillMount(): void {
        this.props.store.addChangedListener(this._onPublishDataStoreChanged);
    }

    public componentDidMount(): void {
        if (this.props.onScenarioComplete) {
            this.props.onScenarioComplete();
        }
    }

    public componentDidUpdate(): void {
        const publishedWiki = this.state.publishData.publishedWiki;
        const publishOperationState = this.state.publishData.publishOperation;

        if (publishOperationState.isComplete === true
            && publishOperationState.error === null
            && publishedWiki != null) {

            const url = getWikiUrl(
                WikiActionIds.View,
                {
                    wikiIdentifier: this.state.publishData.name.value,
                    wikiVersion: this.state.publishData.version.value.toVersionString(),
                },
                StateMergeOptions.routeValues);

            redirectToUrl(url);
        }
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onPublishDataStoreChanged);
    }

    public render(): JSX.Element {
        if (this.state.publishData.isDataLoading) {
            return <Spinner
                label={WikiResources.WikiFormDataLoadingSpinnerText}
                key={"Spinner"}
                className={"wiki-spinner"} />
        }

        const path = this.state.publishData.path && this.state.publishData.path.value ? this.state.publishData.path.value : "";
        const name = this.state.publishData.name ? this.state.publishData.name.value : "";
        const version = this.state.publishData.version ? this.state.publishData.version.value : null;
        const repository = this.state.publishData.repository ? this.state.publishData.repository.value : null;
        const publishOperationError = this.state.publishData.publishOperation.error ? this.state.publishData.publishOperation.error.message : null;
        const dataLoadError = this.state.publishData.dataLoadError ? this.state.publishData.dataLoadError : null;

        // Controls whether the fields in the form are editable. 
        // Version selector is editable in both mode, hence not controlled by this flag.
        const isFormEditable = this.props.inputData.mode !== PublishMode.update;

        // Text variables
        let title, subTitle, ctaText, loadingText;

        if (this.props.inputData.mode === PublishMode.update) {
            // Text messages for the update mode
            title = WikiResources.WikiFormUpdateOperationTitle;
            subTitle = WikiResources.WikiFormUpdateOperationMessage;
            ctaText = WikiResources.WikiFormUpdateCTALabel;
            loadingText = WikiResources.WikiFormUpdateSpinnerLabel;
        } else {
            // Text messages for the publish mode
            title = WikiResources.WikiFormPublishOperationTitle;
            subTitle = WikiResources.WikiFormPublishOperationMessage;
            ctaText = WikiResources.WikiFormPublishCTALabel;
            loadingText = WikiResources.WikiFormPublishSpinnerLabel;
        }

        return (
            <div className={"wiki-publish-container"}>
                {dataLoadError && <MessageBar
                    className={"publish-error"}
                    messageBarType={MessageBarType.error}>
                    {dataLoadError}
                </MessageBar>}
                <Label className={"publish-title"}>{title}</Label>
                <Label className={"publish-message"}>{subTitle}</Label>
                {publishOperationError
                    && <MessageBar
                        className={"publish-error"}
                        messageBarType={MessageBarType.error}>
                        {publishOperationError}
                    </MessageBar>
                }
                <div className={"repository-picker-container"}>
                    <Label required={isFormEditable}>{WikiResources.WikiFormRepositoryFieldLabel}</Label>
                    <RepositoryPicker
                        projectId={this.props.inputData.projectId}
                        onRepositoryChanged={this.props.actionCreator.onRepositoryChange}
                        defaultRepository={repository}
                        disabled={!isFormEditable}
                        fullPopupWidth={true}
                    />
                </div>
                <div className={"version-picker-container"}>
                    <Label required={true}>{WikiResources.WikiFormVersionFieldLabel}</Label>
                    <GitVersionSelector
                        fullPopupWidth={true}
                        className={"version-picker"}
                        disableTags={true}
                        repositoryContext={GitRepositoryContext.create(repository)}
                        versionSpec={version}
                        allowEditing={false}
                        onBranchChanged={this.props.actionCreator.onVersionChange}
                        placeholder={WikiResources.WikiFormVersionFieldPlaceHolder} />
                </div>
                <div className={"folder-picker-container"}>
                    <TextField
                        className={"folder-textfield"}
                        disabled={!isFormEditable}
                        label={WikiResources.WikiFormFolderFieldLabel}
                        placeholder={WikiResources.WikiFormFolderFieldPlaceHolder}
                        required={isFormEditable}
                        value={path}
                        onChanged={this.props.actionCreator.onPathChange}
                        errorMessage={this.state.publishData.path.error
                            ? this.state.publishData.path.error.message
                            : null} />
                    <DefaultButton
                        className={"folder-picker-button"}
                        disabled={!isFormEditable}
                        text={"..."}
                        onClick={this._onFilePickerClick}
                        ariaLabel={WikiResources.WikiFormFolderFieldPlaceHolder} />
                    {this.state.showFilePicker
                        && isFormEditable
                        && <FilePicker
                            title={WikiResources.WikiFormFolderFieldPlaceHolder}
                            isOpen={true}
                            ctaText={WikiResources.OkText}
                            repositoryContext={GitRepositoryContext.create(this.state.publishData.repository.value)}
                            selectedPath={path}
                            versionSpec={version}
                            onCTA={this.props.actionCreator.onPathChange}
                            onDismiss={this._onFilePickerDismiss} />}
                </div>
                <div className={"name-container"}>
                    <TextField
                        className={"name-textfield"}
                        disabled={!isFormEditable}
                        label={WikiResources.WikiFormWikiNameFieldLabel}
                        placeholder={WikiResources.WikiFormWikiNameFieldPlaceHolder}
                        required={isFormEditable}
                        onChanged={this.props.actionCreator.onNameChange}
                        value={name}
                        errorMessage={this.state.publishData.name.error
                            ? this.state.publishData.name.error.message
                            : null} />
                </div>
                <div className={"divider"} />
                <div className={"publish-actions"}>
                    <PrimaryButton
                        className={"publish-button"}
                        text={ctaText}
                        disabled={!this.state.publishData.isDataComplete
                            || this.state.publishData.publishOperation.isInProgress
                            || (this.state.publishData.publishOperation.error != null
                                && !this._hasFormUpdated())}
                        onClick={this._onCTA} />
                    <DefaultButton
                        className={"publish-cancel-button"}
                        disabled={this.state.publishData.publishOperation.isInProgress}
                        text={WikiResources.CancelButtonText}
                        onClick={this._onCancel} />

                </div>
                {this.state.publishData.publishOperation.isInProgress
                    && <div className={"publish-spinner"}>
                        <Spinner
                            label={loadingText}
                            key={"Spinner"}
                            className={"wiki-spinner"} />
                    </div>
                }
            </div>
        );
    }

    @autobind
    private _onPublishDataStoreChanged(): void {
        this.setState({ publishData: this.props.store.state });
    }

    @autobind
    private _onFilePickerClick(): void {
        this.setState({ showFilePicker: true });
    }

    @autobind
    private _onFilePickerDismiss(): void {
        this.setState({ showFilePicker: false });
    }

    @autobind
    private _onCTA(): void {
        if (this.props.inputData.mode === PublishMode.new) {
            this.props.actionCreator.publishWiki(
                this.state.publishData.name.value,
                this.state.publishData.path.value,
                this.state.publishData.version.value,
                this.state.publishData.repository.value,
            );
        } else {
            this.props.actionCreator.addVersionToWiki(
                this.props.inputData.wiki.id,
                this.props.inputData.projectId,
                this.state.publishData.version.value,
            );
        }
    }

    @autobind
    private _onCancel(): void {
        if (window.history.length === 1) {
            // Find the wiki home page URL and navigate to that. Task 1137264: Linking the publish view with right APIs and completing the full flow
            window.location.href = getWikiPageUrl({} as UrlParameters);
        } else {
            window.history.back();
        }
    }

    @autobind
    private _hasFormUpdated(): boolean {
        const publishData: PublishData = this.state.publishData;
        const lastPublishedFields: PublishFields = publishData.lastPublishedFields;
        const isFormEditable = this.props.inputData.mode !== PublishMode.update;

        return (
            (isFormEditable
                && (publishData.name.value !== lastPublishedFields.name
                    || publishData.path.value !== lastPublishedFields.path
                    || (publishData.repository.value
                        && publishData.repository.value.id !== lastPublishedFields.repositoryId)))
            || (publishData.version.value
                && publishData.version.value.toVersionString() !== lastPublishedFields.versionString)
        );
    }
}