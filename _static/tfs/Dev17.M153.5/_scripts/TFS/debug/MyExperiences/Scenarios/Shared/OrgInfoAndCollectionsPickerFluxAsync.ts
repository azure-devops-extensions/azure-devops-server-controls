import { autobind } from "OfficeFabric/Utilities";

import * as VSS from "VSS/VSS";
import { IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";

import * as OrgInfoAndCollectionsPickerActionCreator_Async from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionCreator";
import * as OrgInfoAndCollectionsPickerActionsHub_Async from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionsHub";
import * as OrgInfoAndCollectionsPickerStoresHub_Async from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerStoresHub";
import * as OrganizationInfoStore_Async from "MyExperiences/Scenarios/Shared/Stores/OrganizationInfoStore";
import * as UserAccessedCollectionsStore_Aysnc from "MyExperiences/Scenarios/Shared/Stores/UserAccessedCollectionsStore";
import * as OrganizationCollectionHelper_Async from "MyExperiences/Scenarios/Shared/OrganizationCollectionHelper";

export interface OrgInfoAndCollectionsPickerFluxAsyncProps {
    onHeaderOrganizationInfoAndCollectionPickerPropsUpdate?: (props: IOrganizationInfoAndCollectionsPickerSectionProps) => void;
    onCollectionNavigationFailed?: () => void;
}

export class OrgInfoAndCollectionsPickerFluxAsync {
    private orgCollectionsPickerActionsHub: OrgInfoAndCollectionsPickerActionsHub_Async.OrgInfoAndCollectionsPickerActionsHub;
    private orgCollectionsPickerActionCreator: OrgInfoAndCollectionsPickerActionCreator_Async.OrgInfoAndCollectionsPickerActionCreator;
    private orgInfoAndCollectionsPickerStoresHub: OrgInfoAndCollectionsPickerStoresHub_Async.OrgInfoAndCollectionsPickerStoresHub;
    private initializeOrgInfoAndCollectionsPickerFluxPromise: IPromise<void>;
    private onHeaderOrganizationInfoAndCollectionPickerPropsUpdate?: (props: IOrganizationInfoAndCollectionsPickerSectionProps) => void;
    private onCollectionNavigationFailed?: () => void;

    constructor(props: OrgInfoAndCollectionsPickerFluxAsyncProps) {
        this.onHeaderOrganizationInfoAndCollectionPickerPropsUpdate = props.onHeaderOrganizationInfoAndCollectionPickerPropsUpdate;
        this.onCollectionNavigationFailed = props.onCollectionNavigationFailed;
    }

    public initializeOrgInfoAndCollectionsPickerFlux(): void {
        if (!this.initializeOrgInfoAndCollectionsPickerFluxPromise) {
            this.initializeOrgInfoAndCollectionsPickerFluxPromise = VSS.requireModules([
                "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionCreator",
                "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionsHub",
                "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerStoresHub",
                "MyExperiences/Scenarios/Shared/OrganizationCollectionHelper"]).spread(
                (
                    ActionCreator: typeof OrgInfoAndCollectionsPickerActionCreator_Async,
                    ActionsHub: typeof OrgInfoAndCollectionsPickerActionsHub_Async,
                    StoresHub: typeof OrgInfoAndCollectionsPickerStoresHub_Async,
                    OrganizationCollectionHelper: typeof OrganizationCollectionHelper_Async) => {

                    this.orgCollectionsPickerActionsHub = new ActionsHub.OrgInfoAndCollectionsPickerActionsHub();
                    if (this.onCollectionNavigationFailed) {
                        this.orgCollectionsPickerActionsHub.collectionNavigationFailed.addListener(this.onCollectionNavigationFailed);
                    }

                    this.orgInfoAndCollectionsPickerStoresHub = new StoresHub.OrgInfoAndCollectionsPickerStoresHub(this.orgCollectionsPickerActionsHub);
                    this.orgCollectionsPickerActionCreator = new ActionCreator.OrgInfoAndCollectionsPickerActionCreator(this.orgCollectionsPickerActionsHub);

                    this.orgCollectionsPickerActionCreator.loadCurrentCollectionData(OrganizationCollectionHelper.getCurrentCollectionItem());
                    this.orgCollectionsPickerActionCreator.loadMoreUserCollections();
                    this.orgCollectionsPickerActionCreator.loadOrganizationInfo();

                    return;
                });
        }
    }

    public registerStoresChangedListeners(): void {
        if (this.initializeOrgInfoAndCollectionsPickerFluxPromise) {
            this.initializeOrgInfoAndCollectionsPickerFluxPromise.then(() => {
                const { organizationInfoStore, userAccessedCollectionsStore } = this.orgInfoAndCollectionsPickerStoresHub.stores;
                organizationInfoStore.addChangedListener(this.onOrgInfoAndCollectionsPickerStoresChange);
                userAccessedCollectionsStore.addChangedListener(this.onOrgInfoAndCollectionsPickerStoresChange);
            });
        }
    }

    public unregisterStoresChangedListeners(): void {
        if (this.initializeOrgInfoAndCollectionsPickerFluxPromise) {
            this.initializeOrgInfoAndCollectionsPickerFluxPromise.then(() => {
                const { organizationInfoStore, userAccessedCollectionsStore } = this.orgInfoAndCollectionsPickerStoresHub.stores;
                organizationInfoStore.removeChangedListener(this.onOrgInfoAndCollectionsPickerStoresChange);
                userAccessedCollectionsStore.removeChangedListener(this.onOrgInfoAndCollectionsPickerStoresChange);
                if (this.onCollectionNavigationFailed) {
                    this.orgCollectionsPickerActionsHub.collectionNavigationFailed.removeListener(this.onCollectionNavigationFailed);
                }
                this.orgInfoAndCollectionsPickerStoresHub.dispose();
            });
        }
    }

    @autobind
    private onOrgInfoAndCollectionsPickerStoresChange(): void {
        this.initializeOrgInfoAndCollectionsPickerFluxPromise.then(() => {
            const { organizationInfoStore, userAccessedCollectionsStore } = this.orgInfoAndCollectionsPickerStoresHub.stores;

            const organizationInfoAndCollectionPickerProps = OrganizationCollectionHelper_Async.getOrganizationInfoAndCollectionPickerProps(
                this.orgCollectionsPickerActionCreator,
                organizationInfoStore,
                userAccessedCollectionsStore);
            if (this.onHeaderOrganizationInfoAndCollectionPickerPropsUpdate) {
                this.onHeaderOrganizationInfoAndCollectionPickerPropsUpdate(organizationInfoAndCollectionPickerProps);
            }
        });
    }
}
