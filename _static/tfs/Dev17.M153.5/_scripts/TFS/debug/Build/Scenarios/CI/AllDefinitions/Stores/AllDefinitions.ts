import { Store } from "VSS/Flux/Store";

import { ContributionKeys } from "Build/Scenarios/CI/Constants";
import {
    ContributionActionCreator,
    ContributionActionHub,
    DataParser
} from "Build/Scripts/CI/Actions/Contribution";
import { CIDataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";

import { BuildDefinition } from "TFS/Build/Contracts";

import {
    IAllDefinitionsStoreOptions,
    IAllDefinitionsProviderData
} from "./AllDefinitions.types";

export class AllDefinitionsStore extends Store {
    private _contributionActionCreator: ContributionActionCreator<IAllDefinitionsProviderData>;
    private _contributionActionHub: ContributionActionHub<IAllDefinitionsProviderData>;
    private _definitions: BuildDefinition[] = [];

    constructor(options: IAllDefinitionsStoreOptions) {
        super();
        this._contributionActionHub = options.contributionHub || new ContributionActionHub();
        this._contributionActionCreator = new ContributionActionCreator({
            actionHub: this._contributionActionHub,
            dataParser: this._dataParser
        });
        this._contributionActionHub.contributionDataAvailable.addListener(this._contributionDataAvailable);
    }

    public fetchData(refresh?: boolean) {
        this._contributionActionCreator.fetchContributionData(ContributionKeys.CIHubDataProviderId, undefined, refresh);
    }

    public dispose() {
        this._contributionActionHub.contributionDataAvailable.removeListener(this._contributionDataAvailable);
    }

    public getDefinitions() {
        return this._definitions;
    }

    private _dataParser: DataParser<IAllDefinitionsProviderData> = (data) => {
        let providerData: IAllDefinitionsProviderData = {
            definitions: []
        };

        if (data) {
            providerData.definitions = (data.definitions || []) as BuildDefinition[];
        }

        return providerData;
    }

    private _contributionDataAvailable = (data: IAllDefinitionsProviderData) => {
        if (data) {
            this._definitions = data.definitions || [];
        }

        this.emitChanged();
    }
}