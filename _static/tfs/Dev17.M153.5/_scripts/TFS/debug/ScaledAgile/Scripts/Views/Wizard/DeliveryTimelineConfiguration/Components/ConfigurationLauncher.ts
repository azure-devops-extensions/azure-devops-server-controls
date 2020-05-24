
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/PlanConfiguration";
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/NewPlanPage";

import * as Q from "q";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Configurations from "Presentation/Scripts/TFS/TFS.Configurations";
import * as ConfigurationsConstants from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import * as Events from "VSS/Events/Services";

import { PlanUserPermissions } from "TFS/Work/Contracts";
import { DeliveryTimelinePermissionUtil } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelinePermissionUtil";
import { DeliveryTimelineConfigurationActionsCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineConfigurationActionsCreator";
import { DeliveryTimelineConfigurationActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineConfigurationActions";
import { DeliveryTimelineConfigurationStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Stores/DeliveryTimelineConfigurationStore";
import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { OverviewTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/OverviewTabContent";
import { TeamSettingsTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/TeamSettingsTabContent";
import { CriteriaTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/CriteriaTabContent";
import { MarkerTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/MarkersTabContent";
import { CardFieldSettingsTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/CardFieldSettingsTabContent";
import { IDeliveryTimelineConfigurationOptions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { ViewsDataProvider } from "ScaledAgile/Scripts/Main/DataProviders/ViewsDataProvider";
import { ViewsMapper } from "ScaledAgile/Scripts/Main/Models/ViewsMapper";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";

export namespace ConfigurationIds {
    export const GROUP_GENERAL_ID = "84b41e2e-7a2c-4644-81c6-c9b541e06fe7";
    export const GROUP_CARDS_ID = "A9A6D1B1-C5CC-45D6-B90C-768EBFEBEF77";

    export const TAB_NAME_ID = "84b41e2e-7a2c-4644-81c6-c9b541e06fe7";
    export const TAB_TEAMS_ID = "a2616036-165b-43e1-9088-ae4a481471c4";
    export const TAB_CRITERIA_ID = "23866008-016d-4f08-876b-5dc441910af0";
    export const TAB_FIELDS_ID = "D8AFFB88-D393-4628-9DC8-5D3B6788415F";
    export const TAB_MARKERS_ID = "3901e91b-4c00-48f8-acc1-9e3a59e321ce";
}

function register(options: IDeliveryTimelineConfigurationOptions) {
    Configurations.TabControlsRegistration.registerTabGroup({
        tabControlId: ConfigurationsConstants.RegistrationIds.COMMON_CONFIG_SETTING_INSTANCE_ID,
        id: ConfigurationIds.GROUP_GENERAL_ID,
        title: ScaledAgileResources.ConfigurationGeneralGroupTitle,
        order: 10
    });

    Configurations.TabControlsRegistration.registerTab({
        groupId: ConfigurationIds.GROUP_GENERAL_ID,
        id: ConfigurationIds.TAB_NAME_ID,
        title: ScaledAgileResources.ConfigurationOverviewTabTitle,
        tabContent: OverviewTabContent,
        tabContentOptions: options,
        order: 10
    });

    Configurations.TabControlsRegistration.registerTab({
        groupId: ConfigurationIds.GROUP_GENERAL_ID,
        id: ConfigurationIds.TAB_TEAMS_ID,
        title: ScaledAgileResources.ConfigurationTeamsTabTitle,
        tabContent: TeamSettingsTabContent,
        tabContentOptions: options,
        tabContentClass: "scrollable-tab",
        order: 20
    });

    Configurations.TabControlsRegistration.registerTab({
        groupId: ConfigurationIds.GROUP_GENERAL_ID,
        id: ConfigurationIds.TAB_CRITERIA_ID,
        title: ScaledAgileResources.ConfigurationCriteriaTabTitle,
        tabContent: CriteriaTabContent,
        tabContentOptions: options,
        tabContentClass: "scrollable-tab",
        order: 30
    });

    Configurations.TabControlsRegistration.registerTab({
        groupId: ConfigurationIds.GROUP_GENERAL_ID,
        id: ConfigurationIds.TAB_MARKERS_ID,
        title: ScaledAgileResources.ConfigurationMarkersTabTitle,
        tabContent: MarkerTabContent,
        tabContentOptions: options,
        tabContentClass: "scrollable-tab",
        order: 40
    });

    Configurations.TabControlsRegistration.registerTabGroup({
        tabControlId: ConfigurationsConstants.RegistrationIds.COMMON_CONFIG_SETTING_INSTANCE_ID,
        id: ConfigurationIds.GROUP_CARDS_ID,
        title: ScaledAgileResources.ConfigurationCardsGroupTitle,
        order: 20
    });

    Configurations.TabControlsRegistration.registerTab({
        groupId: ConfigurationIds.GROUP_CARDS_ID,
        id: ConfigurationIds.TAB_FIELDS_ID,
        title: ScaledAgileResources.ConfigurationFieldsTabTitle,
        tabContent: CardFieldSettingsTabContent,
        tabContentOptions: options,
        tabContentClass: "scrollable-tab",
        order: 10
    });
}

export function open(storeData: IDeliveryTimeLineStoreData, initialTabId?: string) {

    const actions = new DeliveryTimelineConfigurationActions();
    const store = new DeliveryTimelineConfigurationStore(actions);
    const actionsCreator = new DeliveryTimelineConfigurationActionsCreator(actions, store, new ViewsDataProvider(new ViewsMapper()));

    register({
        actionsCreator: actionsCreator,
        configurationStore: store,
        dataFromPlan: storeData
    } as IDeliveryTimelineConfigurationOptions);

    actionsCreator.initializeStore(storeData);

    let saveDeferred: Q.Deferred<Configurations.ITabControlSavingResult>;
    const endSaveHandler = (sender: any, modelWithValidation: IModelWithValidation) => {
        if (modelWithValidation.validationState === ValidationState.Success) {
            const promiseReturnValues = {
                refreshPage: false,
                status: Configurations.TabSavingStatus.SUCCEEDED,
                tab: null // Not needed
            } as Configurations.ITabControlSavingResult;

            saveDeferred.resolve(promiseReturnValues);

            Events.getService().fire("refresh-planpage");
        }
        else {
            // Warning or error
            saveDeferred.reject(modelWithValidation.message);
        }
    };

    const isEditAllowed = DeliveryTimelinePermissionUtil.hasPermission(storeData.userPermissions, PlanUserPermissions.Edit);
    const options: Configurations.ConfigurationSettingsDialogOptions = {
        defaultTabId: initialTabId || ConfigurationIds.TAB_NAME_ID,
        savingMode: Configurations.TabControlSavingMode.SAVE_ON_DIALOG,
        onSave: (): IPromise<Configurations.ITabControlSavingResult> => {
            saveDeferred = Q.defer<Configurations.ITabControlSavingResult>();
            actionsCreator.save();
            return saveDeferred.promise;
        },
        close: () => {
            store.removeEndSaveListener(endSaveHandler);
            Configurations.TabControlsRegistration.clearRegistrations(ConfigurationsConstants.RegistrationIds.COMMON_CONFIG_SETTING_INSTANCE_ID);
        },
        warningMessage: !isEditAllowed ? ScaledAgileResources.NoEditPermissionsWarningMessage : undefined
    };

    store.addEndSaveListener(endSaveHandler);

    Configurations.ConfigurationSettingsDialog.show(options);
}

