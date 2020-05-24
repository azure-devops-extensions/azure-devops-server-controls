import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { MetadataActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/MetadataActions";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { MetadataSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/MetadataSource";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Performance from "VSS/Performance";

export class MetadataActionsCreator {
    constructor() {
        this._actions = MetadataActions.getInstance();
        this._metadataSource = MetadataSource.getInstance();
    }

    public static getInstance(): MetadataActionsCreator {
        return FluxFactory.instance().get(MetadataActionsCreator);
    }

    public static getKey(): string {
        return "MetadataActionsCreator";
    }

    public async getDefinitionSK(definitionId: number, contextType: TCMContracts.TestResultsContextType): Promise<number> {
        return await this._metadataSource.getDefinitionSK(definitionId, contextType);
    }

    public async updateReleaseDefinitionMetadata(releaseDefinitionId: number): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TestAX_FiltersMetaData_ReleaseDefinition, async () => {
            const releaseDefinition: RMContracts.ReleaseDefinition = await this._metadataSource.queryReleaseDefinition(releaseDefinitionId);
            this._actions.updateReleaseDefinitionsMetadataAction.invoke([releaseDefinition]);
        });
    }

    public async updateReleaseDefinitionMetadataFromBuildArtifact(buildDefinitionId: number): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TestAX_FiltersMetaData_ReleaseDefinitionFromBuildArtifact, async () => {
            const releaseDefinitions: RMContracts.ReleaseDefinition[] = await this._metadataSource.queryReleaseDefinitionsByBuildArtifact(buildDefinitionId);        
            this._actions.updateReleaseDefinitionsMetadataAction.invoke(releaseDefinitions);
        });
    }

    public updateWorkflowFilterValues(): void {
        const workflowOptions: IDictionaryNumberTo<string> = (new Definitions.WorkflowConfigurationProps()).options;
        const workflowFilterValues: TCMContracts.FieldDetailsForTestResults = {
            fieldName: CommonTypes.Filter.Workflow,
            groupsForField: Object.keys(workflowOptions).map(key => new FilterValueItem(key, workflowOptions[key]))
        };
        this._actions.updateFilterFieldValuesForTestResultsAction.invoke(workflowFilterValues);
    }

    public updateOutcomeFilterValues(): void {
        const outcomeOptions: IDictionaryNumberTo<string> = (new Definitions.OutcomeConfigurationProps()).options;
        const outcomeFiltervalues: TCMContracts.FieldDetailsForTestResults = {
            fieldName: CommonTypes.Filter.Outcome,
            groupsForField: Object.keys(outcomeOptions).map(key => new FilterValueItem(key, outcomeOptions[key]))
        };
        this._actions.updateFilterFieldValuesForTestResultsAction.invoke(outcomeFiltervalues);
    }

    public async updateContainerFilterValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TextAX_FiltersMetaData_Container, async () => {
            const fieldDetails = await this._metadataSource.queryFilterFieldValues(testResultContext, confValues, CommonTypes.Filter.Container);
            this._actions.updateFilterFieldValuesForTestResultsAction.invoke(fieldDetails);
        });
    }

    public async updateOwnerFilterValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TextAX_FiltersMetaData_Owner, async () => {
            const fieldDetails = await this._metadataSource.queryFilterFieldValues(testResultContext, confValues, CommonTypes.Filter.Owner);
            this._actions.updateFilterFieldValuesForTestResultsAction.invoke(fieldDetails);
        });
    }

    public async updateTestRunFilterValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TextAX_FiltersMetaData_TestRun, async () => {
            const fieldDetails = await this._metadataSource.queryFilterFieldValues(testResultContext, confValues, CommonTypes.Filter.TestRun);
            this._actions.updateFilterFieldValuesForTestResultsAction.invoke(fieldDetails);
        });
    }

    public async updateBranchFilterValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TextAX_FiltersMetaData_Branch, async () => {
            const fieldDetails = await this._metadataSource.queryFilterFieldValues(testResultContext, confValues, CommonTypes.Filter.Branch);
            this._actions.updateFilterFieldValuesForTestResultsAction.invoke(fieldDetails);
        });
    }

    public async updateEnvironmentFilterValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): Promise<void> {
        await this._measurePerf(TcmPerfScenarios.TextAX_FiltersMetaData_Environment, async () => {
            const fieldDetails = await this._metadataSource.queryFilterFieldValues(testResultContext, confValues, CommonTypes.Filter.Environment);
            this._actions.updateFilterFieldValuesForTestResultsAction.invoke(fieldDetails);
        });
    }

    /*
    * Used by tests.
    */
    public getMetadataSource(): MetadataSource {
        return this._metadataSource;
    }

    public dispose(): void {
    }

    private async _measurePerf(scenarioName: string, action: () => void){
        const scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, scenarioName);
        try {
            await action();
            scenario.end();
        } catch (error) {
            scenario.abort();
            throw error;
        }
    }
        
    private _actions: MetadataActions;
    private _metadataSource: MetadataSource;
}