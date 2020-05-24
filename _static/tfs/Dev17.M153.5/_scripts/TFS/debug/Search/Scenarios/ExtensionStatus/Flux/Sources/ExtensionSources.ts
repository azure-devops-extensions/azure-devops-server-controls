import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as ExtensionManagement_Util from "Search/Scenarios/ExtensionStatus/Util";
import * as Service from "VSS/Service";
import * as Contracts from "Search/Scenarios/ExtensionStatus/Contracts";
import * as Locations from "VSS/Locations";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";

export class ExtensionSource {
    public beginGetExtensionStatus(): IPromise<Contracts.ExtensionManagementDefaultServiceData> {
        const contributionId = ExtensionManagement_Util.DefaultServiceDataKey;
        const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
        const pageData = pageDataService.getPageData<Contracts.ExtensionManagementDefaultServiceData>(
            contributionId,
            Contracts.TypeInfo.ExtensionManagementDefaultServiceData);

        if (pageData && pageData.marketplaceUrl)  {
            return Promise.resolve(pageData);
        }
        else {
            const dataProviderResolvedPromise = this.ensureDataProvidersResolved(pageDataService);
            const galleryLocationPromise = this.beginGetGalleryLocation();

            return Promise.all([dataProviderResolvedPromise, galleryLocationPromise]).then((responses) => {
                const pageData = pageDataService.getPageData<Contracts.ExtensionManagementDefaultServiceData>(
                    contributionId,
                    Contracts.TypeInfo.ExtensionManagementDefaultServiceData);
                pageData.marketplaceUrl = responses[1];
                return pageData;
            },
            (error: Error) => {
                return Promise.reject(error);
            });
        }
    }

    private ensureDataProvidersResolved(pageDataService: Contribution_Services.WebPageDataService): IPromise<Contributions_Contracts.Contribution[]> {
        // Construct contribution object
        const contribution = <Contributions_Contracts.Contribution>{
            id: ExtensionManagement_Util.DefaultServiceDataKey,
            properties: {
                serviceInstanceType: ExtensionManagement_Util.emsServiceInstanceId
            }
        };

        // Fetch pageData asynchronously
        return pageDataService.ensureDataProvidersResolved([contribution], /* refreshIfExpired */ true);
    }

    private beginGetGalleryLocation(): IPromise<string> {
        return Locations.beginGetServiceLocation(ExtensionManagement_Util.galleryServiceInstanceId, Contracts_Platform.ContextHostType.Deployment);
    }
}