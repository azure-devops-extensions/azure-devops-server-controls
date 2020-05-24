import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Context from "VSS/Context";
import * as ContributionServices from "VSS/Contributions/Services";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as Service from "VSS/Service";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import * as Actions from "TfsCommon/Scripts/FeatureManagement/FeatureManagementActions";
import { FeaturesStore, IFeatureStatesUpdatedEvent } from "TfsCommon/Scripts/FeatureManagement/FeatureManagementStore";
import { FeatureManagementPanelComponent } from "TfsCommon/Scripts/FeatureManagement/FeatureManagementComponent";

const featuresToManageContributionIdHosted = "ms.vss-web.managed-features";
const featuresToManageContributionIdOnPrem = "ms.vss-web.managed-features-onprem";
const manageFeaturesDataProviderId = "ms.vss-tfs-web.manage-features-data-provider";

let featureManagementUIShowing = false;

interface IManageFeaturesData {
    features: FeatureManagement_Contracts.ContributedFeature[];
    devModeFeatures: FeatureManagement_Contracts.ContributedFeature[];
    managementScopes: IDictionaryStringTo<boolean>;
}

export interface IFeatureManagementPanelOptions {
    selectedFeatureId?: string;
    processChanges?: (featureUpdates: FeatureManagement_Contracts.ContributedFeatureState[]) => IPromise<any>;
}

function getFeaturesToManageContributionId() {
    return Context.getPageContext().webAccessConfiguration.isHosted ? featuresToManageContributionIdHosted : featuresToManageContributionIdOnPrem;
}

export function showFeatureManagementUI(options?: IFeatureManagementPanelOptions) {

    if (featureManagementUIShowing) {
        // Management panel is already shown;
        return;
    }

    let container = document.createElement("div");
    document.body.appendChild(container);

    let scopeValues: IDictionaryStringTo<string> = {};

    let context = Context.getDefaultWebContext();
    if (context.team) {
        scopeValues["team"] = context.team.id;
    }
    if (context.project) {
        scopeValues["project"] = context.project.id;
    }

    let featuresToManageContributionId = getFeaturesToManageContributionId();
    let featuresStore = new FeaturesStore(featuresToManageContributionId, scopeValues);

    let featureUpdates: FeatureManagement_Contracts.ContributedFeatureState[] = [];
    let onUpdate = (payload: Actions.IFeatureStateUpdateEvent) => {
        if (payload.result) {
            featureUpdates.push(payload.result);
        }
    };

    Actions.FeatureStateUpdated.addListener(onUpdate);

    let onClose = () => {
        featureManagementUIShowing = false;
        ReactDOM.unmountComponentAtNode(container);
        container.parentElement.removeChild(container);
        featuresStore.dispose();
        Actions.FeatureStateUpdated.removeListener(onUpdate);

        let processChanges: IPromise<any>;
        if (options && options.processChanges) {
            processChanges = options.processChanges(featureUpdates);
        }

        if (featureUpdates.length) {
            // Refresh the page if any features were toggled.
            if (processChanges) {
                processChanges.then(() => {
                    window.location.reload();
                });
            }
            else {
                window.location.reload();
            }
        }
    };

    ReactDOM.render(
        <FeatureManagementPanelComponent
            onClose={onClose}
            featuresStore={featuresStore}
            initialSelectedFeatureId={options ? options.selectedFeatureId : null}
            />,
        container);

    featureManagementUIShowing = true;

    Actions.FeaturesLoading.invoke({
        targetContributionId: featuresToManageContributionId
    });

    const extensionsService = Service.getService(ContributionServices.ExtensionService);
    const dataService = Service.getService(ContributionServices.WebPageDataService);

    extensionsService.getContribution(manageFeaturesDataProviderId).then(() => {
        let manageFeaturesData = dataService.getPageData<IManageFeaturesData>(manageFeaturesDataProviderId);
        let webContext = Context.getDefaultWebContext();

        let scopes: Actions.IFeatureManagementScope[] = [];

        // "My" features
        scopes.push({ 
            featureScope: {
                userScoped: true,
                settingScope: null
            },
            displayName: StringUtils.format(Resources.ManageFeaturesScopeMe, webContext.user.name),
            canManage: true
        });

        // "Team" features
        if (typeof manageFeaturesData.managementScopes["team"] !== "undefined" && webContext.team) {
            scopes.push({ 
                featureScope: {
                    userScoped: false,
                    settingScope: "team"
                },
                displayName: StringUtils.format(Resources.ManageFeaturesScopeTeam, webContext.team.name),
                canManage: manageFeaturesData.managementScopes["team"],
                scopeWarningText: Resources.ToggleFeatureForTeamWarning
            });
        }

        // "Project" features
        if (typeof manageFeaturesData.managementScopes["project"] !== "undefined" && webContext.project) {
            scopes.push({ 
                featureScope: {
                    userScoped: false,
                    settingScope: "project"
                },
                displayName: StringUtils.format(Resources.ManageFeaturesScopeProject, webContext.project.name),
                canManage: manageFeaturesData.managementScopes["project"],
                scopeWarningText: Resources.ToggleFeatureForProjectWarning
            });
        }

        // "Account" features
        if (typeof manageFeaturesData.managementScopes[""] !== "undefined") {
            scopes.push({ 
                featureScope: {
                    userScoped: false,
                    settingScope: null
                },
                displayName: Context.getPageContext().webAccessConfiguration.isHosted ? 
                    StringUtils.format(Resources.ManageFeaturesScopeAccount, webContext.collection.name) :
                    StringUtils.format(Resources.ManageFeaturesScopeCollection, webContext.collection.name),
                canManage: manageFeaturesData.managementScopes[""],
                scopeWarningText: Context.getPageContext().webAccessConfiguration.isHosted ? 
                    Resources.ToggleFeatureForAccountWarning :
                    Resources.ToggleFeatureForCollectionWarning
            });
        }

        Actions.FeaturesLoaded.invoke({
            targetContributionId: featuresToManageContributionId,
            features: manageFeaturesData.features,
            devModeFeatures: manageFeaturesData.devModeFeatures,
            allowedScopes: scopes
        });
    });
}