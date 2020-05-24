import * as Utils_String from "VSS/Utils/String";
import * as NavigationService from "VSS/Navigation/Services";

export class NavigationStateUtils {

    public static geSourceId(): number {
        return this._getIntValueFromState(this.c_sourceIdKey);
    }

    public static getDefinitionId(): number {
        return this._getIntValueFromState(this.c_definitionIdKey);
    }

    public static getPath(): string {
        return this._getStringValueFromState(this.c_pathKey);
    }

    public static getEnvironmentId(): number {
        return this._getIntValueFromState(this.c_environmentIdKey);
    }

    public static getExtensionId(): string {
        return this._getStringValueFromState(this.c_extensionIdKey);
    }

    public static getBuildDefinitionId(): number {
        return this._getIntValueFromState(this.c_buildDefinitionIdKey);
    }

    public static getDeploymentGroupPhaseId(): number {
        return this._getIntValueFromState(this.c_deploymentGroupPhaseIdKey);
    }

    public static getBuildDefinitionName(): string {
        return this._getStringValueFromState(this.c_buildDefinitionNameKey);
    }

    public static getProjectId(): string {
        return this._getStringValueFromState(this.c_projectIdKey);
    }

    public static getProjectName(): string {
        return this._getStringValueFromState(this.c_projectNameKey);
    }

    public static getReleaseId(): number {
        return this._getIntValueFromState(this.c_releaseId);
    }

    public static getTemplateId(): string {
        return this._getStringValueFromState(this.c_templateIdKey);
    }

    public static canCustomizeCanvas(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_customizeCanvas), "True", true);
    }

    public static splitGraph(): boolean {
        return !Utils_String.equals(this._getStringValueFromState(this.c_splitGraph), "False", true);
    }

    public static canZoomCanvas(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_zoomCanvas), "True", true);
    }

    public static showEnvironmentRank(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_showEnvironmentRank), "True", true);
    }

    public static getRequestSource(): string {
        return this._getStringValueFromState(this.c_source);
    }

    public static getAgentName(): string {
        return this._getStringValueFromState(this.c_agentName);
    }

    public static getJobStates(): string {
        return this._getStringValueFromState(this.c_jobStates);
    }

    public static getGateSampleRank(): number {
        return this._getIntValueFromState(this.c_gateSampleRank);
    }

    public static getGateName(): string {
        return this._getStringValueFromState(this.c_gateName);
    }

    public static selectGatesItemInLogsView(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_selectGatesItemInLogsView), "True", true);
    }

    public static isPreDeploymentGatesSelected(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_isPreDeploymentGatesSelected), "True", true);
    }

    public static getJobTimelineRecordIdToSelect(): string {
        return this._getStringValueFromState(this.c_jobTimelineRecordIdToSelect);
    }

    public static getAction(): string {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        if (state && state.action) {
            return state.action;
        }
        else {
            return Utils_String.empty;
        }
    }

    public static selectFirstErrorFromAllPhases(): boolean {
        return Utils_String.equals(this._getStringValueFromState(this.c_selectFirstErrorFromAllPhases), "True", true);
    }

    private static _getIntValueFromState(key: string): number {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        let value: number = 0;
        if (state && state[key]) {
            value = parseInt(state[key], 10);
        }

        return value;
    }

    private static _getStringValueFromState(key: string): string {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        return state[key];
    }

    public static getTaskIndexToSelect(): number {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        let value: number;
        if (state && state[this.c_taskIndexToSelect]) {
            value = parseInt(state[this.c_taskIndexToSelect], 10);
        }

        return value;
    }

    private static readonly c_projectIdKey = "projectId";
    private static readonly c_buildDefinitionIdKey = "buildDefinitionId";
    private static readonly c_deploymentGroupPhaseIdKey = "deploymentGroupPhaseId";
    private static readonly c_buildDefinitionNameKey = "buildDefinitionName";
    private static readonly c_projectNameKey = "projectName";
    private static readonly c_definitionIdKey = "definitionId";
    private static readonly c_pathKey = "path";
    private static readonly c_sourceIdKey = "sourceId";
    private static readonly c_environmentIdKey = "environmentId";
    private static readonly c_extensionIdKey = "extensionId";
    private static readonly c_templateIdKey = "templateId";
    private static readonly c_customizeCanvas = "customizeCanvas";
    private static readonly c_splitGraph = "splitGraph";
    private static readonly c_zoomCanvas = "zoomCanvas";
    private static readonly c_showEnvironmentRank = "showEnvironmentRank";
    private static readonly c_releaseId = "releaseId";
    private static readonly c_source = "source";
    private static readonly c_mergeUpdatedRelease = "mergeRelease";
    private static readonly c_selectFirstErrorFromAllPhases = "selectFirstError";
    private static readonly c_agentName = "agentName";
    private static readonly c_taskIndexToSelect = "selectTaskWithIndex";
    private static readonly c_jobStates = "jobStates";
    private static readonly c_gateSampleRank = "gateSampleRank";
    private static readonly c_gateName = "gateName";
    private static readonly c_selectGatesItemInLogsView = "selectGatesItemInLogsView";
    private static readonly c_isPreDeploymentGatesSelected = "isPreDeploymentGatesSelected";
    private static readonly c_jobTimelineRecordIdToSelect = "jobTimelineRecordIdToSelect";
}