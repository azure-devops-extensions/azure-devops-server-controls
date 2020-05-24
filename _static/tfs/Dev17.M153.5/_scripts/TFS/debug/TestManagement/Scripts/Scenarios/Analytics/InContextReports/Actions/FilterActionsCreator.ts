import { MetadataActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/MetadataActionsCreator";
import { ReportConfigurationDefinition } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { MetadataStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/MetadataStore";
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import { FilterActionsCreatorBase } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionsCreatorBase";
import * as TCMContracts from "TFS/TestManagement/Contracts";

export interface IFilterActionsCreatorInfo {
    testResultContext: TCMContracts.TestResultsContext;
    actionsHub?: FilterActionHub;
}

export class FilterActionsCreator implements FilterActionsCreatorBase {

    constructor(instanceId?: string, info?: IFilterActionsCreatorInfo) {
        this._testResultContext = info.testResultContext;
        this._actionsHub = info.actionsHub;

        this._metadataActionCreator = MetadataActionsCreator.getInstance();
        this._metadataStore = MetadataStore.getInstance();
    }
    
    public static getInstance(instanceId?: string, info?: IFilterActionsCreatorInfo): FilterActionsCreator {
        return FluxFactory.instance().get(FilterActionsCreator, instanceId, info);
    }

    public static getKey(): string {
        return "FilterActionsCreator";
    }

    public dispose(): void {
    }

    /**
     * FilterAC/Store is coupled with TestResultFilter component. Dependency on MetadatAC/Store is taken as it is common place for fetching/storing data for filters and some resolution (Environment Id->Name map).
     */
    public async fetchFilterValues(fieldName: string): Promise<void> {
        //First look up in metadata store to see if data exists.
        let fieldValues: TCMContracts.FieldDetailsForTestResults = this._metadataStore.getFiltersFieldDetailsForTestResults(fieldName);
        if (fieldValues !== undefined) {
            this._actionsHub.initializeFilterValues.invoke([fieldValues]);
            return;
        }

        //Invoke APIs to fetch data.
        await this._updateFilterValues(fieldName);

        //Fetch from store.
        fieldValues = this._metadataStore.getFiltersFieldDetailsForTestResults(fieldName);
        if (fieldValues !== undefined) {
            this._actionsHub.initializeFilterValues.invoke([fieldValues]);
            return;
        }
    }    

    private async _updateFilterValues(fieldName: string): Promise<void> {
        // Fetching metadata information for last 30 days as current this is maximum we can show reports.
        let confValues = (new ReportConfigurationDefinition()).getDefaultConfigurationValues(this._testResultContext.contextType);
        confValues.period = CommonTypes.Period.Days_30;

        switch (fieldName) {
            case CommonTypes.Filter.Workflow:
                return await this._metadataActionCreator.updateWorkflowFilterValues();                
            case CommonTypes.Filter.Branch:
                return await this._metadataActionCreator.updateBranchFilterValues(this._testResultContext, confValues); 
            case CommonTypes.Filter.TestRun:
                return await this._metadataActionCreator.updateTestRunFilterValues(this._testResultContext, confValues); 
            case CommonTypes.Filter.Environment:
                const envDataFromAXPromise = this._metadataActionCreator.updateEnvironmentFilterValues(this._testResultContext, confValues);

                //When build page then fetch release defns linked to build defns. For release page we already fetch when page loads.
                if (this._testResultContext.contextType === TCMContracts.TestResultsContextType.Build) {
                    await this._metadataActionCreator.updateReleaseDefinitionMetadataFromBuildArtifact(this._testResultContext.build.definitionId);
                }
                return await envDataFromAXPromise;
            case CommonTypes.Filter.Container:
                return await this._metadataActionCreator.updateContainerFilterValues(this._testResultContext, confValues); 
            case CommonTypes.Filter.Owner:
                return await this._metadataActionCreator.updateOwnerFilterValues(this._testResultContext, confValues); 
            case CommonTypes.Filter.Outcome:
                return await this._metadataActionCreator.updateOutcomeFilterValues(); 
        }
    }

    private _testResultContext: TCMContracts.TestResultsContext;
    private _actionsHub: FilterActionHub;
    private _metadataActionCreator: MetadataActionsCreator;
    private _metadataStore: MetadataStore;
}