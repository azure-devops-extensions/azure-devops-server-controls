
import * as ActionBase from "VSS/Flux/Action";
import * as Context from "VSS/Context";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as FeatureManagement_RestClient from "VSS/FeatureManagement/RestClient";
import * as Service from "VSS/Service";

export interface IFeatureManagementScope {
    featureScope: FeatureManagement_Contracts.ContributedFeatureSettingScope;
    displayName: string;
    canManage: boolean;
    scopeWarningText?: string;
}

export interface IFeatureStateUpdate {
    feature: FeatureManagement_Contracts.ContributedFeature;
    scope: IFeatureManagementScope;
    scopeValue: string;
    newState: FeatureManagement_Contracts.ContributedFeatureEnabledValue;
    reason?: string;
    reasonCode?: string;
}

export interface IFeaturesLoadEvent {
    targetContributionId: string;
    features?: FeatureManagement_Contracts.ContributedFeature[];
    devModeFeatures?: FeatureManagement_Contracts.ContributedFeature[];
    allowedScopes?: IFeatureManagementScope[];
}

export interface IFeatureStatesLoadEvent {
    scope: IFeatureManagementScope;
    result?: IDictionaryStringTo<FeatureManagement_Contracts.ContributedFeatureState>;
}

export interface IFeatureStateUpdateEvent {
    update: IFeatureStateUpdate;
    result?: FeatureManagement_Contracts.ContributedFeatureState;
    error?: Error;
}

export var FeaturesLoading = new ActionBase.Action<IFeaturesLoadEvent>();
export var FeaturesLoaded = new ActionBase.Action<IFeaturesLoadEvent>();

export var FeatureStatesLoading = new ActionBase.Action<IFeatureStatesLoadEvent>();
export var FeatureStatesLoaded = new ActionBase.Action<IFeatureStatesLoadEvent>();

export var FeatureStateUpdating = new ActionBase.Action<IFeatureStateUpdateEvent>();
export var FeatureStateUpdated = new ActionBase.Action<IFeatureStateUpdateEvent>();
export var FeatureStateUpdateFailed = new ActionBase.Action<IFeatureStateUpdateEvent>();

export module FeatureManagementActionCreator {

    /**
     * Fetch the state for the given features at the specified scope
     *
     * @param features
     * @param scope
     */
    export function loadFeatureStates(
        features: FeatureManagement_Contracts.ContributedFeature[],
        scope: IFeatureManagementScope,
        scopeValues: IDictionaryStringTo<string>) {

        FeatureStatesLoading.invoke({
            scope: scope
        });

        let featureStates: IDictionaryStringTo<FeatureManagement_Contracts.ContributedFeatureState> = {};
        let featuresByService: IDictionaryStringTo<FeatureManagement_Contracts.ContributedFeature[]> = {};
        const hostServiceType = Context.getPageContext().serviceInstanceId;

        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            for (let feature of features) {
                let serviceInstanceType = feature.serviceInstanceType;
                if (!serviceInstanceType || feature.serviceInstanceType === hostServiceType) {
                    serviceInstanceType = "";
                }
                let featuresForService = featuresByService[serviceInstanceType];
                if (!featuresForService) {
                    featuresForService = [];
                    featuresByService[serviceInstanceType] = featuresForService;
                }
                featuresForService.push(feature);
            }
        }
        else {
            featuresByService[""] = features;
        }

        for (let serviceType in featuresByService) {

            let query = {
                featureIds: featuresByService[serviceType].map(f => f.id),
                scopeValues: scopeValues
            } as FeatureManagement_Contracts.ContributedFeatureStateQuery;

            const featureManagementClient = Service.getClient(FeatureManagement_RestClient.FeatureManagementHttpClient, null, serviceType || null);

            let getFeaturesPromise: IPromise<FeatureManagement_Contracts.ContributedFeatureStateQuery>;
            let userScope = scope.featureScope.userScoped ? "me" : "host";
            if (scope.featureScope.settingScope) {
                getFeaturesPromise = featureManagementClient.queryFeatureStatesForNamedScope(query, userScope, scope.featureScope.settingScope, scopeValues[scope.featureScope.settingScope]);
            }
            else {
                getFeaturesPromise = featureManagementClient.queryFeatureStatesForDefaultScope(query, userScope);
            }

            getFeaturesPromise.then((result) => {

                // Merge-in the results and invoke the feature-states-loaded action
                for (let featureId in result.featureStates) {
                    featureStates[featureId] = result.featureStates[featureId];
                }

                FeatureStatesLoaded.invoke({
                    scope: scope,
                    result: featureStates
                });
            });
        }
    }

    export function updateFeatureState(update: IFeatureStateUpdate) {

        FeatureStateUpdating.invoke({
            update: update
        });

        let stateToUpdate = <FeatureManagement_Contracts.ContributedFeatureState>{};
        stateToUpdate.state = update.newState;

        const featureManagementClient = Service.getClient(FeatureManagement_RestClient.FeatureManagementHttpClient, null, update.feature.serviceInstanceType);

        let setFeatureStatePromise: IPromise<FeatureManagement_Contracts.ContributedFeatureState>;
        let userScope = update.scope.featureScope.userScoped ? "me" : "host";
        if (update.scope.featureScope.settingScope) {
            setFeatureStatePromise = featureManagementClient.setFeatureStateForScope(stateToUpdate, update.feature.id, userScope, update.scope.featureScope.settingScope, update.scopeValue, update.reason, update.reasonCode);
        }
        else {
            setFeatureStatePromise = featureManagementClient.setFeatureState(stateToUpdate, update.feature.id, userScope, update.reason, update.reasonCode);
        }

        setFeatureStatePromise.then((result) => {
            FeatureStateUpdated.invoke({
                update: update,
                result: result
            });
        }, (error) => {
            FeatureStateUpdateFailed.invoke({
                update: update,
                error: error
            });
        });
    }
}