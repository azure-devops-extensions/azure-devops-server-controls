import * as VSSContext from "VSS/Context";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import * as VSSService from "VSS/Service";
import { subtract } from "VSS/Utils/Array";
import { empty, endsWith, ignoreCaseComparer, startsWith } from "VSS/Utils/String";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { ICollectionItem, IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";
import { CollectionUrlDataProviderSource } from "MyExperiences/Scenarios/Shared/Sources/CollectionUrlDataProviderSource";
import { OrganizationDataService } from "MyExperiences/Scenarios/Shared/Services/OrganizationDataService";
import { UserCollectionsMappingService } from "MyExperiences/Scenarios/Shared/Services/UserCollectionsMappingService";
import { OrgInfoAndCollectionsPickerActionsHub } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionsHub";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { getUrlWithTrackingData } from "MyExperiences/Scripts/Telemetry";

const PathSeparator = "/";

export class OrgInfoAndCollectionsPickerActionCreator {
    constructor(
        private _actionsHub: OrgInfoAndCollectionsPickerActionsHub,
        private _collectionUrlDataProviderSource?: CollectionUrlDataProviderSource
    ) {
    }

    public loadCurrentCollectionData(collectionItem: ICollectionItem): void {
        this._actionsHub.userAccessedCollectionsLoaded.invoke([collectionItem]);
    }

    public loadOrganizationInfo(): IPromise<void> {
        return VSSService.getLocalService(OrganizationDataService).getOrganizationInfo().then(
            (organizationInfo: IOrganizationInfo) => {
                this._actionsHub.organizationInfoLoaded.invoke(organizationInfo);
            },
            (error: Error) => {
                this._actionsHub.organizationInfoLoadFailed.invoke({});
            }
        );
    }

    public loadMoreUserCollections(): IPromise<void> {
        return VSSService.getLocalService(UserCollectionsMappingService).getUserAccessedCollections().then(
            (collections: ICollectionItem[]) => {
                this._actionsHub.moreUserAccessedCollectionsLoaded.invoke(collections || []);
            },
            (error: Error) => {
                this._actionsHub.moreUserAccessedCollectionsLoadFailed.invoke({});
            }
        );
    }

    public navigateToCollection(collectionHostId: string): IPromise<void> {
        return this._getTfsCollectionUrl(collectionHostId).then(
            (collectionUrl: string | undefined) => {
                if (collectionUrl) {
                    const collectionUrlForCurrentSelectedHub = this._getCollectionUrlForCurrentSelectedHub(collectionUrl);

                    const urlToNavigate = getUrlWithTrackingData(collectionUrlForCurrentSelectedHub, {
                        "Source": "AccountSwitcher",
                        "View": CustomerIntelligenceConstants.PROPERTIES.ACCOUNT_HOME_PAGE
                    });
                    this._navigateToUrl(urlToNavigate);
                } else {
                    this._invokeCollectionNavigationFailed();
                }

                return;
            },
            (error: Error) => {
                this._invokeCollectionNavigationFailed();
            }
        );
    }

    public onSearch(searchText: string, items: ICollectionItem[]): ICollectionItem[] | Promise<ICollectionItem[]> {
        const lowerCaseSearchText = searchText && searchText.toLowerCase();

        return new Promise<ICollectionItem[]>((resolve) => {
            VSSService.getLocalService(OrganizationDataService).getOrganizationCollections().then((collections: ICollectionItem[]) => {
                const searchResults = subtract<ICollectionItem>(collections, items, (item1, item2) => ignoreCaseComparer(item1.id, item2.id));
                resolve(_lowerCaseSearch(lowerCaseSearchText, searchResults));
            });
        });
    }

    private get collectionUrlDataProviderSource(): CollectionUrlDataProviderSource {
        if (!this._collectionUrlDataProviderSource) {
            this._collectionUrlDataProviderSource = new CollectionUrlDataProviderSource();
        }

        return this._collectionUrlDataProviderSource;
    }

    private _getTfsCollectionUrl(collectionHostId: string): IPromise<string | undefined> {
        return this.collectionUrlDataProviderSource.getCollectionUrl(collectionHostId);
    }

    // public for UT
    public _invokeCollectionNavigationFailed(): void {
        setTimeout(() => this._actionsHub.collectionNavigationFailed.invoke({}), 0);
    }

    // Public for UT
    public _navigateToUrl(urltoNavigate: string): void {
        window.location.href = urltoNavigate;
    }

    private _getCollectionUrlForCurrentSelectedHub(collectionUrl: string): string {
        let urltoNavigate: string;

        const relativeUriForSelectedHub = _getRelativeUriForCurrentSelectedHub();
        if (relativeUriForSelectedHub) {
            if (endsWith(collectionUrl, PathSeparator)) {
                urltoNavigate = collectionUrl + relativeUriForSelectedHub;
            } else {
                urltoNavigate = collectionUrl + PathSeparator + relativeUriForSelectedHub;
            }
        } else {
            urltoNavigate = collectionUrl;
        }

        return urltoNavigate;
    }
}

// public for UT
export function _getRelativeUriForCurrentSelectedHub(): string {
    const hubsService = VSSService.getLocalService(HubsService);
    const selectedHubId = hubsService.getSelectedHubId();
    const selectedHub = hubsService.getHubById(selectedHubId);

    if (selectedHub) {
        const hubUri = selectedHub.uri;
        if (hubUri) {
            const pathSeparatorLastIndex = hubUri.lastIndexOf(PathSeparator);
            return pathSeparatorLastIndex >= 0 ? hubUri.slice(pathSeparatorLastIndex + 1) : hubUri;
        }
    }

    return empty;
}

function _lowerCaseSearch(searchText: string, searchResults: ICollectionItem[]): ICollectionItem[] {
    return searchText ? searchResults.filter(item => item.name.toLowerCase().indexOf(searchText) !== -1) : []
}

function _clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
