import * as Q from "q";
import * as Service from "VSS/Service";
import { ICollectionItem } from "MyExperiences/Scenarios/Shared/Models";
import { OrganizationDataService } from "MyExperiences/Scenarios/Shared/Services/OrganizationDataService";
import { OrgCollectionsDataProviderSource } from "MyExperiences/Scenarios/Shared/Sources/OrgCollectionsDataProviderSource";
import { UserCollectionsDataProviderSource } from "MyExperiences/Scenarios/Shared/Sources/UserCollectionsDataProviderSource";

export class UserCollectionsMappingService extends Service.VssService {
    private _userCollectionsDataProviderSource: UserCollectionsDataProviderSource;
    private _loadUserAccessedCollectionsPromise: IPromise<ICollectionItem[]>;

    // For Unit Testing only
    public _initializeUserCollectionsMappingService(
        userCollectionsDataProviderSource: UserCollectionsDataProviderSource,
        orgCollectionsDataProviderSource: OrgCollectionsDataProviderSource): void {
        this._userCollectionsDataProviderSource = userCollectionsDataProviderSource;

        Service.getLocalService(OrganizationDataService)._initializeOrganizationDataService(orgCollectionsDataProviderSource, null);
        this._loadUserAccessedCollectionsPromise = null;
    }

    public getUserAccessedCollections(): IPromise<ICollectionItem[]> {
        if (!this._loadUserAccessedCollectionsPromise) {
            this._loadUserAccessedCollectionsPromise = this._loadUserAccessedCollections();
        }

        return this._loadUserAccessedCollectionsPromise;
    }

    private _loadUserAccessedCollections(): IPromise<ICollectionItem[]> {
        const currentUserCollectionIdsPromise = this.userCollectionsDataProviderSource.getCurrentUserCollectionIds();
        const organizationCollectionsDataPromise = Service.getLocalService(OrganizationDataService).getOrganizationCollections();

        return Q.all([currentUserCollectionIdsPromise, organizationCollectionsDataPromise]).spread(
            (userCollectionIds: string[], organizationCollections: ICollectionItem[]) => {
                const orgCollectionsToCollectionIdsMap = _getCollectionIdOrgCollectionMap(organizationCollections);

                let currentUserCollectionDataForOrg: ICollectionItem[] = [];
                for (let userCollectionId of userCollectionIds) {
                    if (orgCollectionsToCollectionIdsMap[userCollectionId]) {
                        currentUserCollectionDataForOrg.push(orgCollectionsToCollectionIdsMap[userCollectionId]);
                    }
                }

                return currentUserCollectionDataForOrg;
            });
    }

    private get userCollectionsDataProviderSource(): UserCollectionsDataProviderSource {
        if (!this._userCollectionsDataProviderSource) {
            this._userCollectionsDataProviderSource = new UserCollectionsDataProviderSource();
        }

        return this._userCollectionsDataProviderSource;
    }
}

function _getCollectionIdOrgCollectionMap(organizationCollections: ICollectionItem[]): { [key: string]: ICollectionItem } {
    let orgCollectionsToCollectionIdsMap: { [key: string]: ICollectionItem } = {};

    for (let collection of organizationCollections) {
        orgCollectionsToCollectionIdsMap[collection.id] = collection
    }

    return orgCollectionsToCollectionIdsMap;
}
