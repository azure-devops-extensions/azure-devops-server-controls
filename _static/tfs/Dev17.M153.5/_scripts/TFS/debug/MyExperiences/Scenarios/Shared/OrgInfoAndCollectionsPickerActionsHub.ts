import { Action } from "VSS/Flux/Action";
import { ICollectionItem, IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";

export class OrgInfoAndCollectionsPickerActionsHub {
    public organizationInfoLoaded = new Action<IOrganizationInfo>();
    public organizationInfoLoadFailed = new Action<{}>();

    public userAccessedCollectionsLoaded = new Action<ICollectionItem[]>();
    public moreUserAccessedCollectionsLoaded = new Action<ICollectionItem[]>();
    public moreUserAccessedCollectionsLoadFailed = new Action<{}>();

    public collectionNavigationFailed = new Action<{}>();
}
