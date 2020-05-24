import {BuildActions, DesignerActions, ExplorerActions, UserActions} from "Build.Common/Scripts/Linking";

export enum BuildViewType {
    Unknown,
    Explorer,
    Result,
    Designer
}

export interface DetailsViewNavigationState {
    tab?: string;
    action: string;
    buildId: number;
    timelineId?: string;
}

export class BuildNavigationStateProperties {
    public static templateId = "templateId";
    public static cloneId = "cloneId";
    public static repoId = "repoId";
    public static repoType = "repoType";
    public static branchName = "branchName";
    public static newBuildDefn = "newBuildDefn";
    public static enableCI = "enableCI";
    public static fromVC = "fromVC";
    public static addTask = "addTask";
    public static queueId = "queueId";
    public static isNew = "isNew";
    public static definitionId = "definitionId";
    public static favDefinitionId = "favDefinitionId";
    public static tab = "tab";
}

export class BuildActionIds {
    private static _actionMap: { [id: string]: BuildViewType };

    public static getViewType(actionId: string): BuildViewType {
        if (!this._actionMap) {
            this._actionMap = {};

            // Build list
            this._actionMap[ExplorerActions.CompletedBuilds.toLowerCase()] = BuildViewType.Explorer;
            this._actionMap[ExplorerActions.QueuedBuilds.toLowerCase()] = BuildViewType.Explorer;
            this._actionMap[UserActions.QueueNewBuild.toLowerCase()] = BuildViewType.Explorer;
            this._actionMap[UserActions.NewDefinition.toLowerCase()] = BuildViewType.Explorer;

            // Build result
            this._actionMap[BuildActions.Summary.toLowerCase()] = BuildViewType.Result;
            this._actionMap[BuildActions.Details.toLowerCase()] = BuildViewType.Result;

            // Build Definition editor
            this._actionMap[DesignerActions.General.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.SimpleProcess.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.Triggers.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.Repositories.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.Variables.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.Settings.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.History.toLowerCase()] = BuildViewType.Designer;
            this._actionMap[DesignerActions.Retention.toLowerCase()] = BuildViewType.Designer;
        }

        return this._actionMap[(actionId || "").toLowerCase()] || BuildViewType.Explorer;
    }

    public static getDefaultState(): any {
        return {
            buildId: null,
            definitionId: null,
            templateId: null,
            cloneId: null,
            tags: null
        };
    }
}

export class PerformanceEvents {
    public static RefreshDefinitionTree = "Build2.Performance.RefreshDefinitionTree";
    public static UpdateGrid = "Build2.Performance.UpdateGrid";
}