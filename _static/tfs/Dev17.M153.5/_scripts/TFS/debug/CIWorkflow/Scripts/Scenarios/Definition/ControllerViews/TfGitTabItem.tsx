/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { GitCommonSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GitCommonSettings";
import { Component as VCAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/Components/VersionControlAdvancedSettings";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { DefaultRepositorySource, ProjectInfo } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { VersionControlProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { ITfGitState, TfGitStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfGitStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository } from "TFS/Build/Contracts";
import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";
import { TeamProjectCollectionReference, ProjectVisibility } from "TFS/Core/Contracts";

import { GitRepositorySelectorMenu, GitRepositorySelectorMenuOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorMenu";
import { GitVersionSelectorMenu, GitVersionSelectorMenuOptions } from "VersionControl/Scripts/Controls/GitVersionSelectorMenu";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ProjectSelectorMenu, ProjectSelectorMenuOptions } from "VersionControl/Scripts/Controls/ProjectSelectorMenu";

import { BaseControl } from "VSS/Controls";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!PivotView";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TfSourcesTabItem";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

export interface ITfSourcesState extends Base.IState {
    isTfvcRepositorySelected: boolean;
    gitRepository: GitRepository;
}

export interface ICustomGitState extends ITfGitState {
    sourcesState: ITfSourcesState;
}

export class Component extends Base.Component<ISourceTabItemProps, ICustomGitState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _actionCreator: BuildDefinitionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _gitRepositoryMenu: GitRepositorySelectorMenu;
    private _projectSelectorMenu: ProjectSelectorMenu | undefined ;
    private _gitVersionMenu: GitVersionSelectorMenu;
    private _tfGitStore: TfGitStore;
    private _sourceSelectionStore: SourcesSelectionStore;

    constructor(props: ISourceTabItemProps) {
        super(props);
        this._tfGitStore = StoreManager.GetStore<TfGitStore>(TfGitStore);
        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);

        // in typescript we cannot use getInitialiState
        // so setting the default source options in the constructor directly
        this.state = this._getState();
    }

    public render(): JSX.Element {
        const showTeamProjectSelector = this.state.projectVisibility !== ProjectVisibility.Public;
        const projectInfo: VersionControlProjectInfo = this._sourceSelectionStore.getProjectInfo();

        return (
            <div className="ci-tf-sources-tab-item">
                {
                    this.state.errorMessage &&
                    <MessageBar
                        messageBarType={MessageBarType.error} className="sources-tab-error-message">
                        {this.state.errorMessage}
                    </MessageBar>
                }
                { showTeamProjectSelector &&
                    <div className="project-selector-section">
                        <Label className="project-label">{Resources.TeamProject}</Label>
                        { !this.props.isReadOnly
                            ? <div className="tf-sources-project-selector bowtie"></div>
                            : <StringInputComponent
                                value={ projectInfo ? projectInfo.project.name : "" }
                                disabled={true} />
                        }
                    </div>
                }

                <div className="repo-selector-section">
                    <Label className="repo-label">{Resources.Repository}</Label>
                    { !this.props.isReadOnly
                        ? <div className="tf-sources-repo-selector bowtie"></div>
                        : <StringInputComponent
                            value={ this.state.sourcesState.gitRepository.name }
                            disabled={true} />
                    }
                </div>
                <div className="ci-tfgit-tab-item">
                    <div className="branch-selector-section">
                        <Label className="tfgit-branch-label">{Resources.DefaultBranchLabelForDefinitions}</Label>
                        { !this.props.isReadOnly
                            ? <div className="tfgit-branch-selector bowtie"></div>
                            : <StringInputComponent
                                value={ this.state.version.toDisplayText() }
                                disabled={true} />
                        }
                    </div>

                    <VCAdvancedSettings
                        repoType={RepositoryTypes.TfsGit}
                        showAdvancedSettings={this.props.showAdvancedSettings}
                        sourceLabel={this.state.sourceLabel}
                        cleanRepository={this.state.cleanRepository}
                        isCleanRepositoryEnabled={this.state.isCleanRepositoryEnabled}
                        reportBuildStatus={this.state.reportBuildStatus}
                        cleanOptions={this.state.cleanOptions}
                        showLabelSourcesOption={true}
                        showReportStatusOption={true}
                        sourceLabelOptions={this._tfGitStore.getSourceLabelOptions()}
                        onSelectedSourceLabelOptionChanged={this._onSelectedSourceLabelOptionChanged}
                        onSelectedSourceLabelFormatChanged={this._onSelectedSourceLabelFormatChanged}
                        validateLabelSourcesFormat={this._tfGitStore.validateLabelSourcesFormat.bind(this._tfGitStore)}
                        onReportBuildStatusOptionChanged={this._onReportBuildStatusOptionChanged}
                        onCleanRepositoryOptionChanged={this._onCleanRepositoryOptionChanged}
                        onCleanOptionChanged={this._handleCleanOptionsChange}
                        isReadOnly={!!this.props.isReadOnly}>
                        <GitCommonSettings
                            checkoutSubmodules={this.state.checkoutSubmodules}
                            checkoutNestedSubmodules={this.state.checkoutNestedSubmodules}
                            gitLfsSupportStatus={this.state.gitLfsSupportStatus}
                            skipSyncSourcesStatus={this.state.skipSyncSourcesStatus}
                            shallowFetch={this.state.shallowFetchStatus}
                            shallowFetchDepth={this.state.depth }
                            onCheckoutSubmodulesOptionChanged={this._onCheckoutSubmodulesOptionChanged}
                            onSubmoduleCheckoutRecursiveLevelChanged={this._onSubmoduleCheckoutRecursiveLevelChanged}
                            onGitLfsSupportOptionChanged={this._onGitLfsSupportOptionChanged }
                            onSkipSyncSourcesOptionChanged={this._onSkipSyncSourcesOptionChanged }
                            onShallowFetchOptionChanged={this._onShallowFetchOptionChanged }
                            onShallowFetchDepthChanged={this._onShallowFetchDepthChanged}
                            getErrorMessage={this._getErrorMessage}
                            onNotifyValidation={this._onNotifyValidation}
                            isReadOnly={!!this.props.isReadOnly}>
                        </GitCommonSettings>
                    </VCAdvancedSettings>
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        // Hide team project selector for public projects
        if (this.state.projectVisibility !== ProjectVisibility.Public)
        {
            this._createTeamProjectMenu();
        }

        this._createGitRepositoryMenu();
        // When we switch tabs, the component is mounted again. In that case,
        // we should be using the state saved in the store. Otherwise, we
        // should just let the UI initialize based on the current project.
        let state: ITfGitState = this._tfGitStore.getState();
        if (state.repository.id) {
            this.setState(state);
        }

        this._createGitVersionMenu();
        this._tfGitStore.addChangedListener(this._onChange);
        this._sourceSelectionStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._tfGitStore.removeChangedListener(this._onChange);
        this._sourceSelectionStore.removeChangedListener(this._onChange);
        if (this._gitVersionMenu) {
            this._gitVersionMenu.dispose();
        }
    }

    public componentDidUpdate(): void {
        this._updateVersionSelector();

        if (this._gitRepositoryMenu) {
            const tfsContext: TfsContext = TfsContext.getDefault();
            const projectInfo: VersionControlProjectInfo = this._sourceSelectionStore.getProjectInfo();

            if (projectInfo) {
                this._gitRepositoryMenu.setProject(projectInfo, null);
            }

            this._gitRepositoryMenu.setSelectedRepository(this.state.sourcesState.gitRepository);
        }
        else {
                // Hide team project selector for public projects
                if (this.state.projectVisibility !== ProjectVisibility.Public)
                {
                    this._createTeamProjectMenu();
                }
                this._createGitRepositoryMenu();
        }
    }

    private _createTeamProjectMenu(): void {
        const projects: ProjectInfo[] = DefaultRepositorySource.instance().getProjectInfos();
        const projectsInfo = projects
            .filter(proj => proj.supportsGit)
            .map(proj => proj.project)
            .sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));

        const projectInfo: VersionControlProjectInfo = this._sourceSelectionStore.getProjectInfo();
        if (projectInfo)
        {
            this._projectSelectorMenu = BaseControl.enhance(
                ProjectSelectorMenu,
                $(".tf-sources-project-selector"),
                {
                    projectId: projectInfo.project.id,
                    projectInfo: projectInfo,
                    showRepositoryActions: false,
                    showItemIcons: true,
                    tfvcRepository: null,
                    initialSelectedItem: projectInfo.project,
                    onItemChanged: this._onSelectedProjectChanged,
                    initialProjects: projectsInfo,
                    initialRepositories: []
                } as ProjectSelectorMenuOptions) as ProjectSelectorMenu;
            // in case the build definition project is different from the current project then set the selected project
            if (projectInfo.project.id !== TfsContext.getDefault().contextData.project.id)
            {
                this._projectSelectorMenu.setSelectedProject(projectInfo.project);
            }
        }
        else {
            Diag.logInfo("Project info not present while creating team project menu");
        }
    }

    private _createGitRepositoryMenu(): void {
        const tfsContext: TfsContext = TfsContext.getDefault();
        const projectInfo: VersionControlProjectInfo = this._sourceSelectionStore.getProjectInfo();
        if (projectInfo) {
            this._gitRepositoryMenu = BaseControl.createIn<GitRepositorySelectorMenuOptions>(
                GitRepositorySelectorMenu,
                $(".tf-sources-repo-selector"),
                {
                    tfsContext: tfsContext,
                    projectId: projectInfo.project.id,
                    projectInfo: projectInfo,
                    projectName: projectInfo.project.name,
                    tfvcRepository: null,
                    showRepositoryActions: false,
                    onItemChanged: this._onSelectedRepositoryChanged,
                    onDefaultRepositorySelected: this._onSelectedRepositoryChanged,
                    popupOptions: {
                        leftOffsetPixels: -1 // The popup is positioned relative to the menu area above it excluding the border. We need to move left 1px to align
                    },
                    chevronClass: "bowtie-chevron-down-light"
                } as GitRepositorySelectorMenuOptions) as GitRepositorySelectorMenu;

            if (this.state.sourcesState.gitRepository.id) {
                this._gitRepositoryMenu.setSelectedRepository(this.state.sourcesState.gitRepository);
            }
        }
        else {
            Diag.logInfo("Project info not present while creating git repo menu");
        }
    }

    private _getSourcesState(): ITfSourcesState {
        let repository: BuildRepository = this._sourceSelectionStore.getBuildRepository();
        if (repository) {
            let gitRepository = ScmUtils.getGitRepository(repository);
            return {
                isTfvcRepositorySelected: false,
                gitRepository: gitRepository
            } as ITfSourcesState;
        }

        return null;
    }

    private _onSelectedProjectChanged = (project: TeamProjectCollectionReference): void => {
        const projectInfo = this._sourceSelectionStore.getProjectInfo();
        if (!projectInfo || projectInfo.project.id !== project.id)
        {
            this._sourcesActionCreator.changeTfProject(project.id, false);
        }
    }

    private _onSelectedRepositoryChanged = (repository: GitRepository): void => {
        let repoId = null;
        if (Utils_String.startsWith(repository.name, TfvcConstants.DefaultTfvcPrefix, Utils_String.defaultComparer)) {
            this._sourcesActionCreator.changeTfvcSource({
                name: repository.name
            });

            this._sourcesActionCreator.changeTfRepositoryType(RepositoryTypes.TfsVersionControl);
            repoId = repository.name;
        }
        else {
            this._sourcesActionCreator.changeTfGitSource({
                repository: repository
            });

            this._sourcesActionCreator.changeTfRepositoryType(RepositoryTypes.TfsGit);
            repoId = repository.id;
        }

        this._sourcesActionCreator.sourceSelectionChanged();
        // Update the selected repository from the text that the user entered
        this._versionControlActionsCreator.updateSelectedRepositoryFromName(repoId, true);
    }

    private _createGitVersionMenu(): void {
        this._gitVersionMenu = BaseControl.createIn<GitVersionSelectorMenuOptions>(
            GitVersionSelectorMenu, $(".tfgit-branch-selector"), {
                onItemChanged: this._onSelectedBranchChanged,
                waitOnFetchedItems: true,
                showVersionActions: false,
                disableTags: true
            } as GitVersionSelectorMenuOptions) as GitVersionSelectorMenu;

        if (this.state.version) {
            this._gitVersionMenu.setSelectedVersion(this.state.version);
        }
    }

    private _updateVersionSelector(): void {
        let tfsContext = TfsContext.getDefault();
        let repositoryContext = new GitRepositoryContext(tfsContext, this.state.repository);
        this._gitVersionMenu.setRepository(repositoryContext);

        if (this.state.version) {
            this._gitVersionMenu.setSelectedVersion(this.state.version);
        }
        else {
            this._gitVersionMenu.setSelectedVersion(null);
        }
    }

    private _onNotifyValidation = (value: string) => {
        this._sourcesActionCreator.changeTfGitSource({
            fetchDepth: value
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.fetchDepth, value);
    }

    private _onSelectedBranchChanged = (selectedVersion: VersionSpecs.VersionSpec): void => {
        this._sourcesActionCreator.changeTfGitSource({
            version: selectedVersion
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        //TODO Why isn't this branch name?
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.version, selectedVersion.toVersionString());
    }

    private _onSelectedSourceLabelOptionChanged = (selectedSourceOption?: IChoiceGroupOption, ): void => {
        this._sourcesActionCreator.changeTfGitSource({
            sourceLabelOption: (selectedSourceOption.key as string)
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelOption, (selectedSourceOption.key as string));
    }

    private _onSelectedSourceLabelFormatChanged = (selectedSourceLabelFormat: string): void => {
        this._sourcesActionCreator.changeTfGitSource({
            sourceLabelFormat: selectedSourceLabelFormat
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.sourceLabelFormat, selectedSourceLabelFormat);
    }

    private _onReportBuildStatusOptionChanged = (isChecked?: boolean): void => {
        this._sourcesActionCreator.changeTfGitSource({
            reportBuildStatus: !!isChecked
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.reportBuildStatus, Boolean.toString(!!isChecked));
    }

    private _onGitLfsSupportOptionChanged = (isChecked?: boolean): void => {
        this._sourcesActionCreator.changeTfGitSource({
            gitLfsSupport: !!isChecked
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.largeFileSupport, Boolean.toString(!!isChecked));
    }

    private _onSkipSyncSourcesOptionChanged = (isChecked?: boolean): void => {
        this._sourcesActionCreator.changeTfGitSource({
            skipSyncSources: !!isChecked
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.skipSyncSources, Boolean.toString(!!isChecked));
    }

    private _onShallowFetchOptionChanged = (isChecked?: boolean): void => {
        this._sourcesActionCreator.changeTfGitSource({
            shallowFetchStatus: !!isChecked
        });
        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.shallowFetchStatus, Boolean.toString(!!isChecked));
    }

    private _onCheckoutSubmodulesOptionChanged = (isChecked?: boolean): void => {
        this._sourcesActionCreator.changeTfGitSource({
            checkoutSubmodules: !!isChecked
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.checkoutSubmodules, Boolean.toString(!!isChecked));
    }

    private _onSubmoduleCheckoutRecursiveLevelChanged = (options: IDropdownOption, index: number): void => {

        this._sourcesActionCreator.changeTfGitSource({
            checkoutNestedSubmodules: Boolean.fromString(options.key as string)
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.checkoutNestedSubmodules, options.key as string);
    }

    private _onCleanRepositoryOptionChanged = (newValue: string): void => {
        this._sourcesActionCreator.changeTfGitSource({
            cleanRepository: newValue
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanRepository, newValue);
    }

    private _handleCleanOptionsChange = (options: IDropdownOption, index: number): void => {
        let selectedCleanOption: number = parseInt(options.key.toString()) - 1;

        this._sourcesActionCreator.changeTfGitSource({
            cleanOption: selectedCleanOption.toString()
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.cleanOption, selectedCleanOption.toString());
    }

    private _onShallowFetchDepthChanged = (newValue: string) => {
        this._sourcesActionCreator.changeTfGitSource({
            fetchDepth: newValue
        });

        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.fetchDepth, newValue);
    }

    private _onChange = (): void => {
        this.setState(this._getState());

        const projectInfo = this._sourceSelectionStore.getProjectInfo();
        if (this._projectSelectorMenu && this._projectSelectorMenu.getSelectedProject() !== projectInfo.project)
        {
            this._projectSelectorMenu.setSelectedProject(projectInfo.project);
        }
    }

    private _getState = (): ICustomGitState => {
        const state = this._tfGitStore.getState() as ICustomGitState;
        state.sourcesState = this._getSourcesState();
        return state;
    }

    private _getErrorMessage = (value: string): string => {
        let errorMessage: string = Utils_String.empty;
        if (!this._tfGitStore.isFetchDepthValid(value)) {
            errorMessage = Resources.PositiveNumberTextFieldValidationErrorMessage;
        }
        return errorMessage;
    }
}
