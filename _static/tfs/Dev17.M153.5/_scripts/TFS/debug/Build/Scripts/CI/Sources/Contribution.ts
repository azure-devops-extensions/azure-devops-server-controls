
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { IPromise } from "q";
import * as BuildContracts from "TFS/Build/Contracts";
import { CIDataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";

export interface IConstributionSourceOptions {
    service?: WebPageDataService;
}

export class ContributionSource {
    private _service: WebPageDataService;

    constructor(options?: IConstributionSourceOptions) {
        this._service = (options && options.service) || getService(WebPageDataService);
    }

    public getPageData(contributionId: string, routes?: IDictionaryStringTo<String>, refresh: boolean = false): IPromise<IDictionaryStringTo<any>> {
        const contribution = {
            id: contributionId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;
        
        let TypeInfo = {
            WebPageData: {
                fields: {} as any
            }
        };

        TypeInfo.WebPageData.fields.definitions = {
            isArray: true,
            typeInfo: BuildContracts.TypeInfo.BuildDefinition
        };

        TypeInfo.WebPageData.fields.favorites = {
            isArray: true,
            typeInfo: BuildContracts.TypeInfo.BuildDefinition
        };

        return this._service.ensureDataProvidersResolved([contribution], refresh, routes).then(() => {
            return this._service.getPageData<IDictionaryStringTo<any>>(contributionId, TypeInfo.WebPageData);
        });
    }
}