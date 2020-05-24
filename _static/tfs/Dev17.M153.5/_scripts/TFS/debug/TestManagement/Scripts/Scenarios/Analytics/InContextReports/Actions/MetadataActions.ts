import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";

export class MetadataActions {
    constructor() {
        this._updateReleaseDefinitionsMetadataAction = new Action<RMContracts.ReleaseDefinition[]>();
        this._updateFilterFieldValuesForTestResultsAction = new Action<TCMContracts.FieldDetailsForTestResults>();
    }

    public static getInstance(): MetadataActions {
        return FluxFactory.instance().get(MetadataActions);
    }

    public static getKey(): string {
        return "MetadataActions";
	}

    public get updateReleaseDefinitionsMetadataAction(): Action<RMContracts.ReleaseDefinition[]> {
        return this._updateReleaseDefinitionsMetadataAction;
    }

    public get updateFilterFieldValuesForTestResultsAction(): Action<TCMContracts.FieldDetailsForTestResults> {
        return this._updateFilterFieldValuesForTestResultsAction;
    }

    public dispose(): void {
    }
    
    private _updateReleaseDefinitionsMetadataAction: Action<RMContracts.ReleaseDefinition[]>;
    private _updateFilterFieldValuesForTestResultsAction: Action<TCMContracts.FieldDetailsForTestResults>;
}