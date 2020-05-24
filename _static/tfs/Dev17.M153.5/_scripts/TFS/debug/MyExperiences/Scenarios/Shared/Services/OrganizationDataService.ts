import * as Service from "VSS/Service";

import { ICollectionItem, IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";
import { OrgCollectionsDataProviderSource } from "MyExperiences/Scenarios/Shared/Sources/OrgCollectionsDataProviderSource";
import { OrgInfoDataProviderSource } from "MyExperiences/Scenarios/Shared/Sources/OrgInfoDataProviderSource";

export class OrganizationDataService extends Service.VssService {
    private _orgCollectionsDataProviderSource: OrgCollectionsDataProviderSource;
    private _orgInfoDataProviderSource: OrgInfoDataProviderSource;

    private _getOrganizationCollectionsPromise: IPromise<ICollectionItem[]>;
    private _getOrganizationInfoPromise: IPromise<IOrganizationInfo>;

    // For Unit Testing only
    public _initializeOrganizationDataService(
        orgCollectionsDataProviderSource: OrgCollectionsDataProviderSource,
        orgInfoDataProviderSource: OrgInfoDataProviderSource): void {
        this._orgCollectionsDataProviderSource = orgCollectionsDataProviderSource;
        this._orgInfoDataProviderSource = orgInfoDataProviderSource;
        this._getOrganizationCollectionsPromise = null;
    }

    public getOrganizationCollections(): IPromise<ICollectionItem[]> {
        if (!this._getOrganizationCollectionsPromise) {
            this._getOrganizationCollectionsPromise = this.organizationCollectionsDataProviderSource.getCollectionsData();
        }

        return this._getOrganizationCollectionsPromise;
    }

    public getOrganizationInfo(): IPromise<IOrganizationInfo> {
        if (!this._getOrganizationInfoPromise) {
            this._getOrganizationInfoPromise = this.organizationInfoDataProviderSource.getOrganizationInfo();
        }

        return this._getOrganizationInfoPromise;
    }

    private get organizationCollectionsDataProviderSource(): OrgCollectionsDataProviderSource {
        if (!this._orgCollectionsDataProviderSource) {
            this._orgCollectionsDataProviderSource = new OrgCollectionsDataProviderSource();
        }

        return this._orgCollectionsDataProviderSource;
    }

    private get organizationInfoDataProviderSource(): OrgInfoDataProviderSource {
        if (!this._orgInfoDataProviderSource) {
            this._orgInfoDataProviderSource = new OrgInfoDataProviderSource();
        }

        return this._orgInfoDataProviderSource;
    }
}
