import * as VSSContext from "VSS/Context";
import { ignoreCaseComparer } from "VSS/Utils/String";
import {
    ICollectionItem,
    IOrganizationInfoAndCollectionsPickerSectionProps,
    IOrganizationInfo,
    IOrgCollectionsPickerProps
} from "MyExperiences/Scenarios/Shared/Models";
import { OrgInfoAndCollectionsPickerActionCreator } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionCreator";

import { OrganizationInfoStore } from "MyExperiences/Scenarios/Shared/Stores/OrganizationInfoStore";
import { UserAccessedCollectionsStore } from "MyExperiences/Scenarios/Shared/Stores/UserAccessedCollectionsStore";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { getUrlWithTrackingData } from "MyExperiences/Scripts/Telemetry";

export function getCurrentCollectionItem(): ICollectionItem {
    const collection = VSSContext.getDefaultWebContext().collection;

    return {
        name: collection.name,
        id: collection.id
    };
}

export function getOrganizationInfoAndCollectionPickerProps(
    orgInfoAndCollectionsPickerActionCreator: OrgInfoAndCollectionsPickerActionCreator,
    orgInfoStore: OrganizationInfoStore,
    userAccessedCollectionsStore: UserAccessedCollectionsStore
): IOrganizationInfoAndCollectionsPickerSectionProps | undefined {
    const organizationInfoProps = _getOrganizationInfoProps(orgInfoAndCollectionsPickerActionCreator, orgInfoStore);
    if (organizationInfoProps) {
        const orgCollectionsPickerProps = _getOrgCollectionsPickerProps(orgInfoAndCollectionsPickerActionCreator, userAccessedCollectionsStore);
        return {
            organizationInfoProps: organizationInfoProps,
            organizationCollectionsPickerProps: orgCollectionsPickerProps
        };
    }

    return undefined;
}

function _getOrganizationInfoProps(
    orgInfoAndCollectionsPickerActionCreator: OrgInfoAndCollectionsPickerActionCreator,
    orgInfoStore: OrganizationInfoStore): IOrganizationInfo | undefined {
    let organizationInfo: IOrganizationInfo = orgInfoStore && orgInfoStore.state.organizationInfo;
    if (organizationInfo &&
        organizationInfo.organizationName && 
        organizationInfo.organizationUrl) {
        const organizationUrl = getUrlWithTrackingData(organizationInfo.organizationUrl, {
            "Source": "AccountSwitcherOrgLink",
            "View": CustomerIntelligenceConstants.PROPERTIES.ACCOUNT_HOME_PAGE
        });

        organizationInfo = { ...organizationInfo, organizationUrl };

        return organizationInfo;
    }

    return undefined;
}

function _getOrgCollectionsPickerProps(
    orgInfoAndCollectionsPickerActionCreator: OrgInfoAndCollectionsPickerActionCreator,
    userAccessedCollectionsStore: UserAccessedCollectionsStore): IOrgCollectionsPickerProps | undefined {

    return {
        collections: userAccessedCollectionsStore.state.collections.sort((item1, item2) => ignoreCaseComparer(item1.name, item2.name)),
        selectedCollection: getCurrentCollectionItem(),
        onSearch: orgInfoAndCollectionsPickerActionCreator.onSearch,
        onSelectionChanged: (collectionItem: ICollectionItem) => orgInfoAndCollectionsPickerActionCreator.navigateToCollection(collectionItem.id),
        preventDismissOnScroll: false
    };
}
