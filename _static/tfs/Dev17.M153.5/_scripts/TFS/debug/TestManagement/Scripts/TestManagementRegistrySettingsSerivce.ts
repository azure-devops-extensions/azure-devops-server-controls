import { empty } from "VSS/Utils/String";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { VssService, getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";

export class TestManagementRegistrySettingsService extends VssService {
    private _dataService: WebPageDataService;
    public static readonly SETTINGS_PROVIDER_CONTRIBUTION_ID="ms.vss-test-web.testmanagement-settings-provider";
    constructor(dataService = getService(WebPageDataService)) {
        super();

        this._dataService = dataService;
    }

    public async getValue(key: string, defaultValue = empty): Promise<string> {
        await this._ensureDataProviderIsResolved();
        const pageData = await this._dataService.getPageData<IDictionaryStringTo<string>>(TestManagementRegistrySettingsService.SETTINGS_PROVIDER_CONTRIBUTION_ID);
        return pageData[key] || defaultValue;
    }

    private async _ensureDataProviderIsResolved(): Promise<void> {
        const contribution = <Contribution> {
            id: TestManagementRegistrySettingsService.SETTINGS_PROVIDER_CONTRIBUTION_ID,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS   
            }
        };
        return this._dataService.ensureDataProvidersResolved([contribution], true);
    }
}