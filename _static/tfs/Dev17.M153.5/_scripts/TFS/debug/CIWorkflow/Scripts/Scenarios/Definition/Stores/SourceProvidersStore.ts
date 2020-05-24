import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { WebPageDataHelper } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class SourceProvidersStore extends Store {
    private _providers: SourceProvider[];

    constructor() {
        super();
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_SourceProvidersStore;
    }

    public initialize(): void {
        WebPageDataHelper.initialize();
        const attributes = WebPageDataHelper.getSourceProviderAttributes();
        if (attributes) {
            this._providers = attributes.map(a => new SourceProvider(a)).sort((a, b) => a.getTabOrder() - b.getTabOrder());
        }
    }

    protected disposeInternal(): void {
        // no-op
    }

    public isDirty(): boolean {
        return false;
    }

    public isValid(): boolean {
        return true;
    }

    public updateVisitor(buildDefinition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition {
        return buildDefinition;
    }

    public getProviders(): SourceProvider[] {
        return this._providers || [];
    }

    public getProvider(repositoryType: string): SourceProvider {
        if (this._providers) {
            return Utils_Array.first(this._providers, provider => Utils_String.equals(provider.getRepositoryType(), repositoryType, true));
        }
        return null;
    }

    public getSelectedRepositoryTypeFromUrl(): string {
        let repositoryType = NavigationUtils.getRepositoryTypeFromUrl();
        if (repositoryType) {
            // Make sure the repo type exists and is visible
            const sourceProvider = this.getProvider(repositoryType);
            if (sourceProvider && sourceProvider.getTabOrder() >= 0) {
                // Default the selected tab item to the repo type
                repositoryType = sourceProvider.getRepositoryType();
                return repositoryType;
            }
        }

        return null;
    }
}
