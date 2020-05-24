import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { IDirectoryData, IMyDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

export interface IDirectoryDataProvider {
    /** Get the data for the all directory pivot */
    getAllDirectoryData(): Promise<IDirectoryData>;
    /** Get the data for the my directory pivot */
    getMyDirectoryData(): Promise<IMyDirectoryData>;
    /** Refresh the data for the all directory pivot */
    reloadAllDirectoryData(): Promise<IDirectoryData>;
    /** Refresh the data for the my directory pivot */
    reloadMyDirectoryData(): Promise<IMyDirectoryData>;
}

export class DirectoryDataProvider implements IDirectoryDataProvider {
    private _allDataProviderId: string;
    private _myDataProviderId: string;

    constructor(allDataProviderId: string, myDataProviderId: string) {
        this._allDataProviderId = allDataProviderId;
        this._myDataProviderId = myDataProviderId;
    }

    public getAllDirectoryData(): Promise<IDirectoryData> {
        const pageDataService = getService(WebPageDataService);
        let pageData = pageDataService.getPageData<IDirectoryData>(this._allDataProviderId);
        if (pageData != null) {
            return Promise.resolve(pageData);
        } else {
            return this.reloadAllDirectoryData();
        }
    }

    public getMyDirectoryData(): Promise<IMyDirectoryData> {
        const pageDataService = getService(WebPageDataService);
        let pageData = pageDataService.getPageData<IMyDirectoryData>(this._myDataProviderId);
        if (pageData != null) {
            return Promise.resolve(pageData);
        } else {
            return this.reloadMyDirectoryData();
        }
    }

    public reloadAllDirectoryData(): Promise<IDirectoryData> {
        const pageDataService = getService(WebPageDataService);
        return this._ensureDataProviderIsResolved(this._allDataProviderId).then(() => {
            return pageDataService.getPageData<IDirectoryData>(this._allDataProviderId);
        });
    }

    public reloadMyDirectoryData(): Promise<IMyDirectoryData> {
        const pageDataService = getService(WebPageDataService);
        return this._ensureDataProviderIsResolved(this._myDataProviderId).then(() => {
            return pageDataService.getPageData<IMyDirectoryData>(this._myDataProviderId);
        });
    }

    private _ensureDataProviderIsResolved(dataProviderId: string): Promise<void> {
        const contribution: Contribution = {
            id: dataProviderId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        const pageDataService = getService(WebPageDataService);
        return toNativePromise(pageDataService.ensureDataProvidersResolved([contribution], true /*refresh*/));
    }
}