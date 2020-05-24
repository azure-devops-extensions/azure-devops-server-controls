import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { PerfScenarios, CommonConstants } from "CIWorkflow/Scripts/Common/Constants";
import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { ISubversionMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";
import { ITfvcMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";

import { IActionPayload, ActionCreatorBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { PerfUtils } from "DistributedTaskControls/Common/PerfUtils";

import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { Action } from "VSS/Flux/Action";

export interface ISourceControlPayload extends IActionPayload {
    cleanRepository?: string;
}

export interface ITfSouceControlPayload extends ISourceControlPayload {
    sourceLabelOption?: string;
    sourceLabelFormat?: string;
}

export interface ITfvcPayload extends ITfSouceControlPayload {
    cleanOption?: string;
    mapping?: ITfvcMappingItem;
    name?: string;
}

export interface IGitPayload extends ISourceControlPayload {
    checkoutSubmodules?: boolean;
    checkoutNestedSubmodules?: boolean;
    cleanOption?: string;
    fetchDepth?: string;
    gitLfsSupport?: boolean;
    reportBuildStatus?: boolean;
    skipSyncSources?: boolean;
    shallowFetchStatus?: boolean;
}

export interface ITfGitPayload extends IGitPayload, ITfSouceControlPayload {
    repository?: GitRepository;
    version?: VersionSpec;
}

export interface IExternalSourceControlPayload extends ISourceControlPayload {
    branchName?: string;
    connectionId?: string;
    showAddConnection?: boolean;
    type: string;
}

export interface IExternalGitPayload extends IExternalSourceControlPayload, IGitPayload {
    repositoryName?: string;

    // This property is only used for GitHub and not for Remote GIT
    // pradeepn: TODO: Refactor this into a separate interface
    repositoryUrl?: string; 
}

export interface ISvnPayload extends IExternalSourceControlPayload {
    cleanOption?: string;
    mapping?: ISubversionMappingItem;
}

export interface IChangeSourcesSelectionPayload {
    selectedTabItemKey: string;
    selectedStoreKey: string;
}

export class SourcesSelectionActionsCreator extends ActionCreatorBase {
    public SelectSourceTab = new Action<IChangeSourcesSelectionPayload>();
    public TfSourceProjectChanged = new Action<IProjectUpdate>();
    public TfSourceRepositoryChanged = new Action<string>();
    public SourceSelectionChanged = new Action<IEmptyActionPayload>();
    public ChangeTfGitSource = new Action<ITfGitPayload>();
    public ChangeTfvcSource = new Action<ITfvcPayload>();
    public RefreshProjectInfo = new Action<VersionControlProjectInfo>();
    public ChangeSvnSource = new Action<ISvnPayload>();
    public AddNewTfvcMapping = new Action<IEmptyActionPayload>();
    public AddNewSubversionMapping = new Action<IEmptyActionPayload>();

    public initialize() {
        return;
    }

    public static getKey(): string {
        return "CI.GetSources";
    }

    public selectSourceTab(payload: IChangeSourcesSelectionPayload) {
        let scenario = ScmUtils.getPerfScenarioName(payload.selectedStoreKey, PerfScenarios.RepositorySelected);

        let scenarioDescriptor = PerfUtils.instance().startNewScenario(CommonConstants.FeatureArea, scenario);

        this.SelectSourceTab.invoke(payload);

        scenarioDescriptor.end();
    }

    public sourceSelectionChanged() {
        this.SourceSelectionChanged.invoke({});
    }

    public changeTfProject(projectId: string, visibilityConflict: boolean) {
        DefaultRepositorySource.instance().getProjectInfoById(projectId).then((projectInfo: VersionControlProjectInfo) => {
            this.TfSourceProjectChanged.invoke({projectInfo: projectInfo, visibilityConflict: visibilityConflict} as IProjectUpdate);
        });
    }

    public changeTfGitSource(source: ITfGitPayload): void {
        this.ChangeTfGitSource.invoke(source);
    }

    public changeTfvcSource(source: ITfvcPayload): void {
        this.ChangeTfvcSource.invoke(source);
    }

    public changeSvnSource(source: ISvnPayload): void {
        this.ChangeSvnSource.invoke(source);
    }

    public refreshProjectInfo(projectId: string): void {
        DefaultRepositorySource.instance().getProjectInfoById(projectId).then((projectInfo: VersionControlProjectInfo) => {
            this.RefreshProjectInfo.invoke(projectInfo);
        });
    }

    public addNewTfvcMapping(): void {
        this.AddNewTfvcMapping.invoke({});
    }

    public addNewSubversionMapping(): void {
        this.AddNewSubversionMapping.invoke({});
    }

    public changeTfRepositoryType(selectedRepositoryType: string): void {
        this.TfSourceRepositoryChanged.invoke(selectedRepositoryType);
    }
}

export interface IProjectUpdate {
    projectInfo: VersionControlProjectInfo;
    visibilityConflict: boolean;
}
