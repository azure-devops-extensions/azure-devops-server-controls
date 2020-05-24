import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Yaml/YamlEditorContainer";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DefaultBreadcrumbDisplayedItems } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";
import { FolderBreadcrumb } from "DistributedTaskControls/Components/FolderBreadcrumb";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import {
    ComboBoxInputComponent,
    ComboBoxType,
} from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import {
    FilePathInputComponent,
} from "DistributedTaskControls/SharedControls/InputControls/Components/FilePathInputComponent";
import { Title } from "DistributedTaskControls/SharedControls/TitleBar/TitleBar";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";
import { PrimaryButton } from "OfficeFabric/Button";
import { NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { AllDefinitionsContentKeys, DefinitionsHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import {
    PipelineDefinition,
    PipelineDefinitionDesignerActions,
    PipelineExtensionAreas,
} from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import {
    DefinitionActionsHub,
    IChangeDefinitionNamePayload,
} from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { YamlPipelineProcessActions } from "PipelineWorkflow/Scripts/Editor/Yaml/PipelineProcessStore";
import { YamlClient } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlClient";
import { YamlDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlDefinitionStore";
import { YamlEditorView } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlEditorView";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as React from "react";
import { ReleaseDefinition, YamlPipelineProcess, YamlSourceReference } from "ReleaseManagement/Core/Contracts";
import { TeamProjectReference } from "TFS/Core/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { Uri } from "VSS/Utils/Url";

export interface IYamlEditorContainerProps extends Base.IProps {
    action: string;
}

export interface IYamlEditorContainerState {
    projects: TeamProjectReference[];
    repos: GitRepository[];
}

export class YamlEditorContainer extends Base.Component<IYamlEditorContainerProps, IYamlEditorContainerState> {
    _yamlClient: YamlClient;

    public constructor(props){
        super(props);
        this._store = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this._store.addChangedListener(this._onStoreChange);
        this._yamlActionsHub = ActionsHubManager.GetActionsHub<YamlPipelineProcessActions>(YamlPipelineProcessActions);
        this._yamlClient = new YamlClient();
        this.state = {
            repos: [],
            projects: []
        };
    }

    public componentWillMount(){
        if (this.props.action === EditorActions.ACTION_CREATE_DEFINITION){
            ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub).changeDefinitionName.invoke({
                name: "New Yaml Pipeline"
            } as IChangeDefinitionNamePayload);
        }
    }

    public componentDidMount(){
        this._getProjectsAndSetState();
        
    }

    public render(): JSX.Element {
        
        let view: JSX.Element;
        switch (this.props.action) {
            case EditorActions.ACTION_CREATE_DEFINITION:
                view = this._getCreateView();
                break;
            case EditorActions.ACTION_EDIT_DEFINITION:
                view = this._getEditView();
                break;
            default:
                view = null;
                break;
        }
        
        return (
                <div className="yaml-editor"> 
                    <div className="head">
                        <FolderBreadcrumb
                            cssClass={"breadcrumb-fabric-style-overrides"}
                            containerClassName={"cd-title-bar-breadcrumb-container"}
                            folderPath={AllDefinitionsContentKeys.PathSeparator}
                            getBreadcrumbLink={this._getDefaultBreadcrumbUrlForFolder}
                            maxDisplayedItems={DefaultBreadcrumbDisplayedItems}
                            rootFolderName={Resources.AllDefinitionsText} />
                        <Title
                            store={StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore)}
                            editable={true}
                            ariaLabel={Resources.ReleaseDefinitionName}
                            iconName={"bowtie-deploy"}
                            onChanged={this._onReleaseDefinitionNameChanged}
                            nameInvalidMessage={this._getInvalidNameMessage}
                            displayBreadcrumb={false}
                            getBreadcrumbLink={this._getDefaultBreadcrumbUrlForFolder}
                            maxBreadcrumbDisplayedItems={DefaultBreadcrumbDisplayedItems}
                            rootFolderName={Resources.AllDefinitionsText}
                            breadCrumbOverrideClass={"breadcrumb-fabric-style-overrides"}
                        />
                    </div>
                    {view} 
                </div>
        );
    }

    private _getCreateView(): JSX.Element{
        let definition: PipelineDefinition = {} as PipelineDefinition;
        this._store.updateVisitor(definition);
        let yamlPipelineProcess = definition.pipelineProcess as YamlPipelineProcess;
        let project = yamlPipelineProcess.fileSource.sourceReference["ProjectId"];
        let repository = yamlPipelineProcess.fileSource.sourceReference["RepositoryId"];
        let branch = yamlPipelineProcess.fileSource.sourceReference["Branch"];
        let yamlPath = yamlPipelineProcess.filename;

        return this._getVstsGitInputs(project, repository, branch, yamlPath);
    }

    private _getEditView(): JSX.Element {
        return <YamlEditorView />;
    }

    private _onStoreChange = () => {
        this.setState(JQueryWrapper.extendDeep(this.getState(), {}));
    }

    private _getProjectsAndSetState = () => {
        this._yamlClient.getProjects().then((projects: TeamProjectReference[]) => {
            this.setState({projects: projects});
        });
    }

    private _getReposAndSetState = (projectId: string) => {
        this._yamlClient.getRepositories(projectId).then((repos: GitRepository[]) => {
            this.setState({repos: repos});
        });
    }

    private _getInvalidNameMessage = (name: string) => {
        if (!name) {
            return DtcResources.EditDefinitionNameInvalidTitle;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _onReleaseDefinitionNameChanged = (name: string) => {
        ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub).changeDefinitionName.invoke({
            name: name
        } as IChangeDefinitionNamePayload);
    }

    private _getDefaultBreadcrumbUrlForFolder(path: string) {
        // TODO: Handle it properly with Folder path once that feature is enabled
        // for now lets return all release definition path
        if (!FeatureFlagUtils.isNewReleasesHubEnabled()) {
            return DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer,
                PipelineDefinitionDesignerActions.viewReleasesAction
            );
        }
        else {
            return DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer2,
                null,
                { view: DefinitionsHubKeys.AllDefinitionsPivotItemKey },
                true
            );
        }
    }

    private _getVstsGitInputs(teamProject: YamlSourceReference, repository: YamlSourceReference, branch: YamlSourceReference, yamlPath: string): JSX.Element {
        if (!teamProject){
            teamProject = {id: "", name: ""};
        }

        return (
            <div className={"vsts-git-yaml-inputs"}>
                <ComboBoxInputComponent 
                    required={true}
                    label={"Team Project"} 
                    value={teamProject.name}
                    onValueChanged={this._onProjectChange}
                    comboBoxType={ComboBoxType.Searchable}
                    source={this._getProjects()}
                    />
                <ComboBoxInputComponent
                    required={true}
                    label={"Repository"}
                    value={repository.name}
                    onValueChanged={this._onRepoChange}
                    comboBoxType={ComboBoxType.Searchable}
                    source={this._getRepos()}
                />
                {this._getBranchFilterInputComponent(branch, repository)}
                <FilePathInputComponent
                    required={true}
                    isFileSystemBrowsable={() => true}
                    filePathProviderDelegate={null}
                    label={"Yaml file path"}
                    onValueChanged={this._onYamlFilePathChange}
                />
                <PrimaryButton
                    className="create-yaml-button"
                    disabled={!this._store.isValid()}
                    onClick={this._onCreateClick}>
                    Create
                </PrimaryButton>
            </div>
        );
    }

    private _getBranchFilterInputComponent(branch: YamlSourceReference, repository: YamlSourceReference): JSX.Element {
        return (<div>
                <label id="yaml-branch-filter-id"> Branch </label>
            <BranchFilterComponent
                ariaLabelledBy={"yaml-branch-filter-id"}
                branchFilter={branch.name}
                repositoryId={repository.id}
                allowUnmatchedSelection={false}
                onBranchFilterChange={this._onBranchFilterChange} />
            </div>);
    }

    private _onProjectChange = (projectName: string) => {
        let proj = Utils_Array.first(this.state.projects, (value) => value.name === projectName);
        this._getReposAndSetState(proj.id);
        this._yamlActionsHub.updateProject.invoke({id: proj.id, name: proj.name});
    }

    private _onRepoChange = (repoName: string) => {
        let repo = Utils_Array.first(this.state.repos, (value) => value.name === repoName);
        this._yamlActionsHub.updateRepo.invoke({ id: repo.id, name: repo.name });
    }

    private _onBranchFilterChange = (branch: string) => {
        this._yamlActionsHub.updateBranch.invoke({id: branch, name: branch});
    }

    private _onYamlFilePathChange = (path: string) => {
        this._yamlActionsHub.updateYamlFilePath.invoke(path);
    }

    private _onCreateClick = () => {
        let definition: PipelineDefinition = {} as PipelineDefinition;
        this._store.updateVisitor(definition);
        definition.environments = [];
        
        this._yamlClient.createYamlPipeline(definition).then((def: ReleaseDefinition) => {
            let definitionId: number = def.id;
            let url = YamlEditorContainer._getHubUrl(NavigationConstants.YamlHub);

            let urlCreator: Uri = new Uri(url);

            urlCreator.addQueryParam("definitionId", definitionId.toString());
            urlCreator.addQueryParam("_a", EditorActions.ACTION_EDIT_DEFINITION);

            window.location.href = urlCreator.absoluteUri;
        }, (reason) => {
            window.alert("Create Yaml Failed with error: " + reason.message);
        });
    }

    private static _getHubUrl(hubId: string): string {
        const hubsService: HubsService = new HubsService();
        const hub: Hub = hubsService.getHubById(hubId);
        const relativeUrl: string = hub ? hub.uri : Utils_String.empty;
        return relativeUrl;
    }

    private _getProjects(): string[] {
        return this.state.projects.map(e => e.name);
    }

    private _getRepos(): string[] {
        return this.state.repos.map(e => e.name);
    }

    private _store: YamlDefinitionStore;
    private _yamlActionsHub: YamlPipelineProcessActions;
}