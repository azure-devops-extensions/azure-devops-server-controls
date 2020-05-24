import { ODataQueryOptions } from "Analytics/Scripts/OData";
import * as RMConstants from "ReleaseManagement/Core/Constants";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";


export class MetadataSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_Metadata");
    }

    public static getInstance(): MetadataSource {
        return FluxFactory.instance().get(MetadataSource);
    }

    public static getKey(): string {
        return "MetadataSource";
	}

    public dispose(): void {
    }

    public async getDefinitionSK(definitionId: number, contextType: TCMContracts.TestResultsContextType): Promise<number> {
        if (!this._isAnalyticsSwitchToTestSKContextFilterEnabled()) {
            return null;
        }

        let entityType: string;
        let pipelineFilterField: string;
        let selectPipelineSKField: string;

        switch (contextType) {
            case TCMContracts.TestResultsContextType.Build:
                entityType = this._buildPipelineEntityName;
                pipelineFilterField = "BuildPipelineId";
                selectPipelineSKField = "BuildPipelineSK";
                break;
            case TCMContracts.TestResultsContextType.Release:
                entityType = this._releasePipelineEntityName;
                pipelineFilterField = "ReleasePipelineId";
                selectPipelineSKField = "ReleasePipelineSK";
                break;
        }

        const queryOptions = {
            entityType: entityType,
            project: VssContext.getDefaultWebContext().project.id,
            $filter: `${pipelineFilterField} eq ${definitionId}`,
            $select: selectPipelineSKField
        } as ODataQueryOptions;

        const reponseData: CommonTypes.IODataQueryResponse = await this.queryOData(queryOptions);

        if (!reponseData || !reponseData.value || (reponseData.value as any[]).length === 0) {
            return null;
        }

        return (reponseData.value as any[])[0][selectPipelineSKField] as number;
    }

    public queryReleaseDefinition(releaseDefinitionId: number): IPromise<RMContracts.ReleaseDefinition> {
        let projectName: string = VssContext.getDefaultWebContext().project.name;

        return VSS.requireModules(["ReleaseManagement/Core/RestClient" ]).then((restClients) => {
            let releaseClient = restClients[0].getClient();
            return releaseClient.getReleaseDefinition(projectName, releaseDefinitionId);
        });
    }

    public queryReleaseDefinitionsByBuildArtifact(buildDefinitionId: number): IPromise<RMContracts.ReleaseDefinition[]> {
        let projectName: string = VssContext.getDefaultWebContext().project.name;

        return VSS.requireModules(["ReleaseManagement/Core/RestClient", "ReleaseManagement/Core/Constants", "ReleaseManagement/Core/Contracts"]).then(([restClient, RMConstants1, RMContracts1]) => {
            const releaseClient = restClient.getClient();
            const artifactSourceId = `${VssContext.getDefaultWebContext().project.id}:${buildDefinitionId}`;
            return releaseClient.getReleaseDefinitions(projectName, null, RMContracts1.ReleaseDefinitionExpands.Environments,
                RMConstants1.ArtifactTypes.BuildArtifactType, artifactSourceId);
        });
    }

    public queryFilterFieldValues(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        filterBy: CommonTypes.Filter): IPromise<TCMContracts.FieldDetailsForTestResults> {
        let entityType: string;
        let groupByStr: string;
        let filterStr: string;

        switch (filterBy) {
            case CommonTypes.Filter.Container:                
            case CommonTypes.Filter.Owner:
                groupByStr = this._getGroupByStr(filterBy);

                if (this._isAnalyticsRouteAPIsToTestResultDailyEnabled()) {
                    entityType = this._testResultDailyEntityName;
                    filterStr = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)})`;
                }
                else {
                    entityType = this._testResultEntityName;
                }
                break;
            case CommonTypes.Filter.TestRun:
            case CommonTypes.Filter.Branch:
            case CommonTypes.Filter.Environment:
                entityType = this._testRunEntityName;
                groupByStr = this._getGroupByStr(filterBy);
                break;
        }

        let queryOptions = {
            entityType: entityType,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        if (!filterStr) {
            filterStr = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)})`;
        }

        queryOptions.$apply = `${filterStr}/groupby((${groupByStr}))`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            return this._getFilterFieldValuesFromRawData(filterBy, data);
        });
    }

    private _getFilterFieldValuesFromRawData(filterBy: CommonTypes.Filter, data: CommonTypes.IODataQueryResponse): TCMContracts.FieldDetailsForTestResults {
        let filterName: string;
        let groupsForField: FilterValueItem[] = [];

        (data.value as any[]).forEach(d => {
            let itemKey = null, itemValue = null;

            switch (filterBy) {
                case CommonTypes.Filter.TestRun:
                    filterName = CommonTypes.Filter.TestRun;
                    itemKey = itemValue = d.Title;
                    break;
                case CommonTypes.Filter.Container:
                    filterName = CommonTypes.Filter.Container;
                    itemKey = itemValue = d.Test.ContainerName;
                    break;
                case CommonTypes.Filter.Owner:
                    filterName = CommonTypes.Filter.Owner;
                    itemKey = itemValue = d.Test.TestOwner;
                    break;
                case CommonTypes.Filter.Branch:
                    filterName = CommonTypes.Filter.Branch;
                    itemKey = d.BranchSK;
                    itemValue = d.Branch.BranchName;
                    break;
                case CommonTypes.Filter.Environment:
                    filterName = CommonTypes.Filter.Environment;   
                    itemKey = d.ReleaseStageSK;
                    itemValue = d.ReleaseStage.ReleaseStageId;
                    break;
            }

            if (itemValue || itemValue === Utils_String.empty) {
                groupsForField.push(new FilterValueItem(itemKey as string, itemValue as string));
            }
        });        

        return { fieldName: filterName, groupsForField: groupsForField } as TCMContracts.FieldDetailsForTestResults;
    }

    private _getGroupByStr(filter: CommonTypes.Filter): string {
        switch (filter) {
            case CommonTypes.Filter.Container:
                return this._getGroupByTestPropertiesString(CommonTypes.GroupBy.Container);
            case CommonTypes.Filter.Owner:
                return this._getGroupByTestPropertiesString(CommonTypes.GroupBy.Owner);
            case CommonTypes.Filter.Branch:
                return "BranchSK, Branch/BranchName";
            case CommonTypes.Filter.Environment:
                return "ReleaseStageSK, ReleaseStage/ReleaseStageId";
            case CommonTypes.Filter.TestRun:
                return this._getGroupByTestRunPropertiesString(CommonTypes.GroupBy.TestRun);
        }
    }
}
