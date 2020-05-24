// This store should contain all the metadata information.
// Metadata should get loaded while the app loads and shouldn't change after that.
// Other stores can call the specific metadata apis exposed by this store.
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { MetadataActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/MetadataActions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Store } from "VSS/Flux/Store";

export class MetadataStore extends Store {
    constructor() {
        super();
        this._initialize();
    }

    public static getInstance(): MetadataStore {
        return FluxFactory.instance().get(MetadataStore);
    }

    public static getKey(): string {
        return "MetadataStore";
	}

    public getReleaseEnvironmentDefinitionIdToNameMap(): IDictionaryStringTo<string> {
        return this._releaseEnvironmentDefinitionIdToNameMap;
    }

    public getFiltersFieldDetailsForTestResults = (fieldName: string): TCMContracts.FieldDetailsForTestResults => {
        // If selected filter in Environment, then map the Environment Def Id with Environment Def Name.
        if (this._filtersFieldNameToFieldDetailsMap[fieldName] && fieldName === CommonTypes.Filter.Environment) {
            // If this map is null or undefined, that means metadata hasn't loaded yet.
            if (!this._releaseEnvironmentDefinitionIdToNameMap) {
                return;
            }

            const environmentFieldDetails = this._filtersFieldNameToFieldDetailsMap[fieldName].groupsForField as FilterValueItem[];

            return {
                fieldName: fieldName,
                groupsForField: environmentFieldDetails.map(envDetail => {
                    // Replace Environment Id with Environment Name. Value will be ReleaseStageSK and DisplayValue received will be ReleaseStageId.
                    if (envDetail && envDetail.value && envDetail.displayValue) {
                        const environmentId = envDetail.displayValue.toString();
                        const environmentName = this._releaseEnvironmentDefinitionIdToNameMap[environmentId];
                        return new FilterValueItem(envDetail.value, environmentName || Utility.getDeletedEnvironmentDefIdDisplayString(environmentId));
                    }
                })
            } as TCMContracts.FieldDetailsForTestResults;
        }

        return this._filtersFieldNameToFieldDetailsMap[fieldName] as TCMContracts.FieldDetailsForTestResults;
    }

    public dispose(): void {
        this._actions.updateReleaseDefinitionsMetadataAction.removeListener(this._onUpdateReleaseDefinitions);
        this._actions.updateFilterFieldValuesForTestResultsAction.removeListener(this._onUpdateFilterFieldDetailsForTestResults);
    }

    private _initialize(): void {
        this._filtersFieldNameToFieldDetailsMap = {};
        this._actions = MetadataActions.getInstance();

        this._actions.updateReleaseDefinitionsMetadataAction.addListener(this._onUpdateReleaseDefinitions);
        this._actions.updateFilterFieldValuesForTestResultsAction.addListener(this._onUpdateFilterFieldDetailsForTestResults);
    }

    private _onUpdateReleaseDefinitions = (releaseDefinitions: RMContracts.ReleaseDefinition[]) => {
        this._releaseEnvironmentDefinitionIdToNameMap = {};

        if (releaseDefinitions && releaseDefinitions.length > 0) {
            releaseDefinitions.forEach(releaseDefinition => {
                if (releaseDefinition.environments && releaseDefinition.environments.length > 0) {
                    releaseDefinition.environments.forEach(environmentDefinition => {
                        this._releaseEnvironmentDefinitionIdToNameMap[environmentDefinition.id.toString()] = environmentDefinition.name;
                    });
                }
            });
        }
    }

    private _onUpdateFilterFieldDetailsForTestResults = (fieldDetailsForTestResults: TCMContracts.FieldDetailsForTestResults) => {        
        this._filtersFieldNameToFieldDetailsMap[fieldDetailsForTestResults.fieldName] = fieldDetailsForTestResults;        
    }

    private _actions: MetadataActions;
    private _releaseEnvironmentDefinitionIdToNameMap : IDictionaryStringTo<string>;
    private _filtersFieldNameToFieldDetailsMap: IDictionaryStringTo<TCMContracts.FieldDetailsForTestResults>;
}