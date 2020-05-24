
import * as Actions from "TfsCommon/Scripts/FeatureManagement/FeatureManagementActions";
import * as Context from "VSS/Context";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as StoreBase from "VSS/Flux/Store";
import * as StringUtils from "VSS/Utils/String";

export interface FeaturesStoreState {
    features?: FeatureManagement_Contracts.ContributedFeature[];
    devModeFeatures?: FeatureManagement_Contracts.ContributedFeature[];
    scopes?: Actions.IFeatureManagementScope[];
    scopeValues: IDictionaryStringTo<string>;
}

export interface IFeatureStatesUpdatedEvent {
    featureId?: string;
    scope?: Actions.IFeatureManagementScope;
    state?: FeatureManagement_Contracts.ContributedFeatureState;
}

export class FeaturesStore extends StoreBase.Store {

    public static FeatureStatesUpdatedEvent = "feature-states-updated";

    public state = {} as FeaturesStoreState;

    private statesByScope: IDictionaryStringTo<IDictionaryStringTo<FeatureManagement_Contracts.ContributedFeatureState>> = {};
    private stateErrorsByScope: IDictionaryStringTo<IDictionaryStringTo<Error>> = {};

    constructor(
        private targetContributionId: string,
        scopeValues: IDictionaryStringTo<string>) {

        super();

        this.state.scopeValues = scopeValues || {};

        Actions.FeaturesLoading.addListener(this._featuresLoading);
        Actions.FeaturesLoaded.addListener(this._featuresLoaded);
        Actions.FeatureStatesLoading.addListener(this._featureStatesLoading);
        Actions.FeatureStatesLoaded.addListener(this._featureStatesLoaded);
        Actions.FeatureStateUpdating.addListener(this._featureStateUpdating);
        Actions.FeatureStateUpdated.addListener(this._featureStateUpdated);
        Actions.FeatureStateUpdateFailed.addListener(this._featureStateUpdateFailed);
    }

    public dispose() {
        Actions.FeaturesLoading.removeListener(this._featuresLoading);
        Actions.FeaturesLoaded.removeListener(this._featuresLoaded);
        Actions.FeatureStatesLoading.removeListener(this._featureStatesLoading);
        Actions.FeatureStatesLoaded.removeListener(this._featureStatesLoaded);
        Actions.FeatureStateUpdating.removeListener(this._featureStateUpdating);
        Actions.FeatureStateUpdated.removeListener(this._featureStateUpdated);
        Actions.FeatureStateUpdateFailed.addListener(this._featureStateUpdateFailed);
    }

    private _featuresLoading = (loadEvent: Actions.IFeaturesLoadEvent): void => {
        if (loadEvent.targetContributionId === this.targetContributionId) {
            this.state.features = null;
            this.state.devModeFeatures = null;
            this.state.scopes = null;
            this.emitChanged();
        }
    };

    private _featuresLoaded = (loadEvent: Actions.IFeaturesLoadEvent): void => {
        if (loadEvent.targetContributionId === this.targetContributionId) {

            let featureScopeHashes: IDictionaryStringTo<boolean> = {};

            this.state.features = [];
            if (loadEvent.features && loadEvent.features.length) {
                Array.prototype.push.apply(this.state.features, loadEvent.features);
                this.state.features.sort((a, b) => StringUtils.localeIgnoreCaseComparer(a.name, b.name));

                // Go through all scopes and create a hash of their ids
                for (let feature of loadEvent.features) {
                    for (let scope of feature.scopes) {
                        featureScopeHashes[this._getScopeId(scope)] = true;
                    }
                }
            }

            this.state.devModeFeatures = [];
            if (loadEvent.devModeFeatures) {
                Array.prototype.push.apply(this.state.devModeFeatures, loadEvent.devModeFeatures);
                this.state.devModeFeatures.sort((a, b) => StringUtils.localeIgnoreCaseComparer(a.name, b.name));

                // Go through all scopes and create a hash of their ids
                for (let feature of loadEvent.devModeFeatures) {
                    for (let scope of feature.scopes) {
                        featureScopeHashes[this._getScopeId(scope)] = true;
                    }
                }
            }

            // Add scopes if they are allowed and if there is at least one feature defined in that scope
            this.state.scopes = [];
            for (let scope of loadEvent.allowedScopes) {
                if (featureScopeHashes[this._getScopeId(scope.featureScope)]) {
                    this.state.scopes.push(scope);
                }
            }

            this.emitChanged();
        }
    };

    private _featureStatesLoading = (loadEvent: Actions.IFeatureStatesLoadEvent): void => {
        delete this.statesByScope[this._getScopeId(loadEvent.scope.featureScope)];
        this._emitStatesUpdatedEvent({});
    };

    private _featureStatesLoaded = (loadEvent: Actions.IFeatureStatesLoadEvent): void => {
        let scopeId = this._getScopeId(loadEvent.scope.featureScope);

        let states = this.statesByScope[scopeId];
        if (!states) {
            this.statesByScope[scopeId] = loadEvent.result;
        }
        else {
            for (let featureId in loadEvent.result) {
                states[featureId] = loadEvent.result[featureId];
            }
        }

        this._emitStatesUpdatedEvent({});
    };

    private _featureStateUpdating = (updateEvent: Actions.IFeatureStateUpdateEvent): void => {
        let scopeId = this._getScopeId(updateEvent.update.scope.featureScope);

        let states = this.statesByScope[scopeId];
        if (states) {
            delete states[updateEvent.update.feature.id];
        }

        let errors = this.stateErrorsByScope[scopeId];
        if (errors) {
            delete errors[updateEvent.update.feature.id];
        }

        this._emitStatesUpdatedEvent({
            featureId: updateEvent.update.feature.id,
            scope: updateEvent.update.scope
        });
    };

    private _featureStateUpdated = (updateEvent: Actions.IFeatureStateUpdateEvent): void => {
        let scopeId = this._getScopeId(updateEvent.update.scope.featureScope);

        let states = this.statesByScope[scopeId];
        if (states) {
            states[updateEvent.update.feature.id] = updateEvent.result;
        }

        let errors = this.stateErrorsByScope[scopeId];
        if (errors) {
            delete errors[updateEvent.update.feature.id];
        }

        this._emitStatesUpdatedEvent({
            featureId: updateEvent.update.feature.id,
            scope: updateEvent.update.scope,
            state: updateEvent.result
        });
    };

    private _featureStateUpdateFailed = (updateEvent: Actions.IFeatureStateUpdateEvent): void => {
        let scopeId = this._getScopeId(updateEvent.update.scope.featureScope);

        let states = this.statesByScope[scopeId];
        if (states) {
            delete states[updateEvent.update.feature.id];
        }

        let errors = this.stateErrorsByScope[scopeId];
        if (errors) {
            errors[updateEvent.update.feature.id] = updateEvent.error;
        }

        this._emitStatesUpdatedEvent({
            featureId: updateEvent.update.feature.id,
            scope: updateEvent.update.scope
        });
    };

    private _emitStatesUpdatedEvent(updateEvent: IFeatureStatesUpdatedEvent) {
        this.emit(FeaturesStore.FeatureStatesUpdatedEvent, this, updateEvent);
    }

    private _getScopeId(scope: FeatureManagement_Contracts.ContributedFeatureSettingScope): string {
        return scope.userScoped + ";" + (scope.settingScope || "").toLowerCase();
    }

    public getFeaturesForScope(scope: Actions.IFeatureManagementScope): FeatureManagement_Contracts.ContributedFeature[] {
        if (scope && this.state.features) {
            return this.state.features.filter(f => f.scopes && f.scopes.some(s => s.userScoped === scope.featureScope.userScoped && s.settingScope === scope.featureScope.settingScope));
        }
        else {
            return [];
        }
    }

    public getDevModeFeaturesForScope(scope: Actions.IFeatureManagementScope): FeatureManagement_Contracts.ContributedFeature[] {
        if (scope && this.state.devModeFeatures) {
            return this.state.devModeFeatures.filter(f => f.scopes && f.scopes.some(s => s.userScoped === scope.featureScope.userScoped && s.settingScope === scope.featureScope.settingScope));
        }
        else {
            return [];
        }
    }

    public getFeatureState(featureId: string, scope: Actions.IFeatureManagementScope): FeatureManagement_Contracts.ContributedFeatureState {
        let state: FeatureManagement_Contracts.ContributedFeatureState;
        let states = this.statesByScope[this._getScopeId(scope.featureScope)];
        if (states) {
            state = states[featureId];
        }
        return state;
    }

    public getFeatureById(featureId: string): FeatureManagement_Contracts.ContributedFeature {
        let feature: FeatureManagement_Contracts.ContributedFeature;
        if (this.state.features) {
            feature = this.state.features.filter(f => f.id == featureId)[0];
        }
        if (!feature && this.state.devModeFeatures) {
            feature = this.state.devModeFeatures.filter(f => f.id == featureId)[0];
        }
        return feature;
    }

    public getFeatureStateUpdateError(featureId: string, scope: Actions.IFeatureManagementScope): Error {
        let error: Error;
        let errors = this.stateErrorsByScope[this._getScopeId(scope.featureScope)];
        if (errors) {
            error = errors[featureId];
        }
        return error;
    }
}