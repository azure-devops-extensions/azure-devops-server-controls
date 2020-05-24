import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Action, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import {
    PipelineProcessTypes,
    YamlFileSourceTypes,
    YamlPipelineProcess,
    YamlPipelineProcessResources,
    YamlSourceReference,
} from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class YamlPipelineProcessActions extends ActionsHubBase {
    public static getKey(): string {
        return "YamlPipelineProcessActions";
    }

    public initialize(): void {
        this._updateProject = new Action<YamlSourceReference>();
        this._create = new Action<YamlPipelineProcess>();
        this._updateRepo = new Action<YamlSourceReference>();
        this._updateBranch = new Action<YamlSourceReference>();
        this._updateYamlFilePath = new Action<string>();
    }

    public get create(): Action<YamlPipelineProcess> {
        return this._create;
    }

    public get updateProject(): Action<YamlSourceReference>{
        return this._updateProject;
    }

    public get updateRepo(): Action<YamlSourceReference>{
        return this._updateRepo;
    }

    public get updateBranch(): Action<YamlSourceReference> {
        return this._updateBranch;
    }

    public get updateYamlFilePath(): Action<string> {
        return this._updateYamlFilePath;
    }

    private _updateProject: Action<YamlSourceReference>;
    private _create: Action<YamlPipelineProcess>;
    private _updateRepo: Action<YamlSourceReference>;
    private _updateBranch: Action<YamlSourceReference>;
    private _updateYamlFilePath: Action<string>;
}

export class YamlPipelineProcessStore extends DataStoreBase {
    
    public static getKey(): string {
        return "YamlPipelineProcessStore";
    }

    public initialize(){
        super.initialize();
        this._actionsHub = ActionsHubManager.GetActionsHub<YamlPipelineProcessActions>(YamlPipelineProcessActions);

        this._actionsHub.create.addListener(this._create);
        this._actionsHub.updateProject.addListener(this._updateProject);
        this._actionsHub.updateRepo.addListener(this._updateRepo);
        this._actionsHub.updateBranch.addListener(this._updateBranch);
        this._actionsHub.updateYamlFilePath.addListener(this._updateYamlFilePath);

        this._originalState = {
            type: PipelineProcessTypes.Yaml,
            filename: "",
            fileSource: {
                type: YamlFileSourceTypes.TFSGit,
                sourceReference: {
                    "RepositoryId" : {
                        id: "", 
                        name: ""
                    },
                    "Branch" : {
                        id: "",
                        name: ""
                    },
                    "ProjectId": {
                        id: "", 
                        name: ""
                    }
                }
            },
            errors: [],
            resources: {

            } as YamlPipelineProcessResources
        };

        this._currentState = JQueryWrapper.extendDeep(this._originalState, {});
    }

    public updateVisitor(definition: PipelineDefinition) {
        definition.pipelineProcess = JQueryWrapper.extendDeep(this._currentState, {});
    }    

    public isDirty(): boolean {
        let curSourceRef = this._currentState.fileSource.sourceReference;
        let origSourceRef = this._originalState.fileSource.sourceReference;
        return Utils_String.localeIgnoreCaseComparer(this._originalState.filename, this._currentState.filename) !== 0
            && Utils_String.localeIgnoreCaseComparer(origSourceRef["ProjectId"].id, curSourceRef["ProjectId"].id) !== 0
            && Utils_String.localeIgnoreCaseComparer(origSourceRef["RepositoryId"].id, curSourceRef["RepositoryId"].id) !== 0
            && Utils_String.localeIgnoreCaseComparer(origSourceRef["Branch"].id, curSourceRef["Branch"].id) !== 0;
    }

    public isValid(): boolean {
        let curSourceRef = this._currentState.fileSource.sourceReference;
        let fileName = this._currentState.filename;
        let RepoId = curSourceRef["RepositoryId"].id;
        let Branch = curSourceRef["Branch"].id;
        let ProjectId = curSourceRef["ProjectId"].id;
        return Utils_String.localeIgnoreCaseComparer(fileName, Utils_String.empty) !== 0
            && Utils_String.localeIgnoreCaseComparer(RepoId, Utils_String.empty) !== 0
            && Utils_String.localeIgnoreCaseComparer(Branch, Utils_String.empty) !== 0
            && Utils_String.localeIgnoreCaseComparer(ProjectId, Utils_String.empty) !== 0;
    }

    protected disposeInternal(): void {
        this._actionsHub.create.removeListener(this._create);
        this._actionsHub.updateProject.removeListener(this._updateProject);
    }

    private _create = (arg: YamlPipelineProcess) => {
        this._originalState = JQueryWrapper.extendDeep(arg, {});
        this._currentState = JQueryWrapper.extendDeep(this._originalState, {});
    }

    private _updateProject = (arg: YamlSourceReference) => {
        this._currentState.fileSource.sourceReference["ProjectId"] = JQueryWrapper.extendDeep(arg, {});
        this.emitChanged();
    }

    private _updateYamlFilePath = (path: string): void => {
        this._currentState.filename = path;
        this.emitChanged();
    }

    private _updateBranch = (arg: YamlSourceReference): void => {
        this._currentState.fileSource.sourceReference["Branch"] = JQueryWrapper.extendDeep(arg, {});
        this.emitChanged();
    }

    private _updateRepo = (arg: YamlSourceReference): void => {
        this._currentState.fileSource.sourceReference["RepositoryId"] = JQueryWrapper.extendDeep(arg, {});
        this.emitChanged();
    }

    private _actionsHub: YamlPipelineProcessActions;
    private _currentState: YamlPipelineProcess;
    private _originalState: YamlPipelineProcess;
}