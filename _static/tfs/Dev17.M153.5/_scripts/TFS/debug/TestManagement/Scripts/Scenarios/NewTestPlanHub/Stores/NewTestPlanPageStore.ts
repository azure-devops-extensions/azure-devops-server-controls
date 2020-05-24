import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import { Store as VSSStore } from "VSS/Flux/Store";
import { NewTestPlanPageActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsHub";
import {
    INewTestPlanFields,
    INewTestPlanPageState
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

export class NewTestPlanPageStore extends VSSStore {
    public static getInstance() {
        if (!NewTestPlanPageStore._instance) {
            NewTestPlanPageStore._instance = new NewTestPlanPageStore(NewTestPlanPageActionsHub.getInstance());
        }
        return NewTestPlanPageStore._instance;
    }

    private static _instance: NewTestPlanPageStore;
    private _actionsHub: NewTestPlanPageActionsHub;
    
    private _isPivotLoading: boolean;
    private _areaPathNode: INode;
    private _iterationNode: INode;
    private _projectId: string;
    private _isCreatingTestPlan: boolean;
    private _errorMessage: string;

    constructor(actionsHub: NewTestPlanPageActionsHub) {
        super();

        this._isPivotLoading = true;
        this._isCreatingTestPlan = false;
        this._errorMessage = Utils_String.empty;
        this._actionsHub = actionsHub;
        this._addListeners();
    }

    public getNewPlanState(): INewTestPlanPageState {
        if (this._isPivotLoading) {
            return {
                isLoading: true,
                nameField: undefined,
                rootAreaPath: undefined,
                selectedAreaPathField: undefined,
                rootIteration: undefined,
                selectedIterationField: undefined,
                projectId: undefined,
                isCreatingTestPlan: false,
                errorMessage: undefined
            };
        }

        return {
            isLoading: false,
            nameField: {
                value: "",
                validationResult: {isValid: false}
            },
            rootAreaPath: {
                path: this._areaPathNode.name,
                node: this._areaPathNode
            },
            selectedAreaPathField: {
                value: {
                    path: this._areaPathNode.name,
                    node: this._areaPathNode
                },
                validationResult: { isValid: true }
            },
            rootIteration: {
                path: this._iterationNode.name,
                node: this._iterationNode
            },
            selectedIterationField: {
                value: {
                    path: this._iterationNode.name,
                    node: this._iterationNode
                },
                validationResult: { isValid: true }
            },
            projectId: this._projectId,
            isCreatingTestPlan: this._isCreatingTestPlan,
            errorMessage: this._errorMessage
        };

    }

    public get isCreatingTestPlan(): boolean {
        return this._isCreatingTestPlan;
    }

    private _addListeners(): void {
        this._actionsHub.InitializeTestPlanFields.addListener(this._handleInitializeFields);
        this._actionsHub.beginCreateTestPlan.addListener(this._handleBeginCreateTestPlan);
        this._actionsHub.createTestPlanFailed.addListener(this._handleCreateTestPlanFailed);
        this._actionsHub.createTestPlanSucceeded.addListener(this._handleCreateTestPlanSucceeded);
    }

    @autobind
    private _handleInitializeFields(fields: INewTestPlanFields): void {
        this._areaPathNode = fields.areaPath;
        this._iterationNode = fields.iteration;
        this._isPivotLoading = false;
        this._projectId = fields.projectId;

        this.emitChanged();
    }

    @autobind
    private _handleBeginCreateTestPlan(): void {
        this._isCreatingTestPlan = true;
        this.emitChanged();
    }

    @autobind
    private _handleCreateTestPlanFailed(error: Error): void {
        this._isCreatingTestPlan = false;
        this._errorMessage = error.message;

        this.emitChanged();
    }

    @autobind
    private _handleCreateTestPlanSucceeded(): void {
        this._isCreatingTestPlan = false;
        this.emitChanged();
    }
}
