
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { Properties } from "DistributedTaskControls/Common/Telemetry";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { GeneralOptionsActionsHub } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsActions";
import { EnvironmentCheckListStore, IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import { AutoLinkWorkItemsEnvironmentCheckListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/AutoLinkWorkItemsEnvironmentCheckListStore";
import { DataStoreInstanceIds } from "PipelineWorkflow/Scripts/Editor/Constants";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface IGeneralOptionsState {
    description: string;
    releaseNameFormat: string;
}

export class GeneralOptionsStore extends AggregatorDataStoreBase {

    constructor() {
        super();
        this._publishDeployStatusStore = StoreManager.GetStore<EnvironmentCheckListStore>(EnvironmentCheckListStore, DataStoreInstanceIds.PublishDeployStatus);
        this._badgeStatusStore = StoreManager.GetStore<EnvironmentCheckListStore>(EnvironmentCheckListStore, DataStoreInstanceIds.BadgeStatus);
        this._autoLinkWorkItemsStore = StoreManager.GetStore<AutoLinkWorkItemsEnvironmentCheckListStore>(AutoLinkWorkItemsEnvironmentCheckListStore, DataStoreInstanceIds.AutoLinkWorkItems);
        this._currentState = {} as IGeneralOptionsState;
        this._originalState = {} as IGeneralOptionsState;
    }

    public initialize(): void {
        super.initialize();
        this._generalOptionsActionsHub = ActionsHubManager.GetActionsHub<GeneralOptionsActionsHub>(GeneralOptionsActionsHub);

        this.addToStoreList(this._publishDeployStatusStore);
        this.addToStoreList(this._badgeStatusStore);
        this.addToStoreList(this._autoLinkWorkItemsStore);

        this._generalOptionsActionsHub.updateReleaseDefinitionDescription.addListener(this._handleUpdateDescription);
        this._generalOptionsActionsHub.updateReleaseNameFormat.addListener(this._handleUpdateReleaseNameFormat);
        this._generalOptionsActionsHub.updateGeneralOptions.addListener(this._handleUpdateGeneralOptions);
        this._generalOptionsActionsHub.refreshOptionsTab.addListener(this._handleRefreshOptionsTab);
    }

    protected disposeInternal(): void {
        this._generalOptionsActionsHub.updateReleaseDefinitionDescription.removeListener(this._handleUpdateDescription);
        this._generalOptionsActionsHub.updateReleaseNameFormat.removeListener(this._handleUpdateReleaseNameFormat);
        this._generalOptionsActionsHub.updateGeneralOptions.removeListener(this._handleUpdateGeneralOptions);
        this._generalOptionsActionsHub.refreshOptionsTab.removeListener(this._handleRefreshOptionsTab);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineGeneralOptionsStoreKey;
    }

    public getState(): IGeneralOptionsState {
        return this._currentState;
    }

    public isDirty(): boolean {
        return (!(
            this._currentState.description === this._originalState.description
            && this._currentState.releaseNameFormat === this._originalState.releaseNameFormat
            && !super.isDirty()
        ));
    }

    public isValid(): boolean {
        return this.isReleaseNameFormatValid(this._currentState.releaseNameFormat)
            && super.isValid();
    }

    public getChangeTelemetryData(changes: IDictionaryStringTo<any>) {
        if (this._currentState.description !== this._originalState.description) {
            changes[Properties.DefinitionDescriptionSet] = this._currentState.description ? true : false;
        }
        if (this._publishDeployStatusStore.isDirty()) {
            let envs = this._publishDeployStatusStore.getSelectedEnvironments();
            changes[Properties.ReportStatusEnabled] = (envs && envs.length > 0) ? true : false;
        }
        if (this._badgeStatusStore.isDirty()) {
            let envs = this._badgeStatusStore.getSelectedEnvironments();
            changes[Properties.ReportStatusEnabled] = (envs && envs.length > 0) ? true : false;
        }
        if (this._autoLinkWorkItemsStore.isDirty()) {
            let envs = this._autoLinkWorkItemsStore.getSelectedEnvironments();
            changes[Properties.AutoLinkWorkItemsEnabled] = (envs && envs.length > 0) ? true : false;
        }
    }

    public updateVisitor(visitor: CommonTypes.PipelineDefinition): void {
        if (visitor) {
            visitor.description = this._currentState.description;
            visitor.releaseNameFormat = this._currentState.releaseNameFormat;
            if (visitor.environments) {
                let selectedEnvironmentsForPublishDeployStatus: IEnvironmentReference[] = this._publishDeployStatusStore.getSelectedEnvironments();
                let selectedEnvironmentsForBadgeStatus: IEnvironmentReference[] = this._badgeStatusStore.getSelectedEnvironments();
                let selectedEnvironmentsForAutoLinking: IEnvironmentReference[] = this._autoLinkWorkItemsStore.getSelectedEnvironments();
                visitor.environments.forEach((environment: CommonTypes.PipelineDefinitionEnvironment) => {
                    if (!!environment.environmentOptions) {

                        environment.environmentOptions.publishDeploymentStatus =
                            Utils_Array.arrayContains<number, IEnvironmentReference>(
                                environment.id,
                                selectedEnvironmentsForPublishDeployStatus,
                                (id: number, elem: IEnvironmentReference) => { return elem.environmentId === id; });

                        environment.environmentOptions.badgeEnabled =
                            Utils_Array.arrayContains<number, IEnvironmentReference>(
                                environment.id,
                                selectedEnvironmentsForBadgeStatus,
                                (id: number, elem: IEnvironmentReference) => { return elem.environmentId === id; });

                        environment.environmentOptions.autoLinkWorkItems =
                            Utils_Array.arrayContains<number, IEnvironmentReference>(
                                environment.id,
                                selectedEnvironmentsForAutoLinking,
                                (id: number, elem: IEnvironmentReference) => { return elem.environmentId === id; });
                    }
                });
            }
        }
    }

    public isReleaseNameFormatValid(formatValue: string): boolean {
        return !formatValue
            || Utils_String.caseInsensitiveContains(formatValue, "$(rev:")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Date:")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Release.ReleaseId)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Build.BuildNumber)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Build.SourceBranch)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(DayOfMonth)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(DayOfYear)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Month)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Year:yy)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Year:yyyy)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Hours)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Minutes)")
            || Utils_String.caseInsensitiveContains(formatValue, "$(Seconds)");
    }

    private _handleUpdateGeneralOptions = (definition: CommonTypes.PipelineDefinition): void => {
        this._currentState = this._getStateFromDefinition(definition);
        this._originalState = this._getStateFromDefinition(definition);
    }

    private _handleRefreshOptionsTab = (): void => {
       //This is to ensure that for entire options tab we just call emitChanged once after save/
        this.emitChanged();
    }

    private _getStateFromDefinition = (definition: CommonTypes.PipelineDefinition): IGeneralOptionsState => {
        let description = Utils_String.empty;
        let releaseNameFormat = GeneralOptionsStore.DEFAULT_RELEASE_NAME_FORMAT;

        if (definition) {
            description = definition.description ? definition.description : Utils_String.empty;

            releaseNameFormat = definition.releaseNameFormat;
            if (releaseNameFormat === null || releaseNameFormat === undefined) {
                releaseNameFormat = GeneralOptionsStore.DEFAULT_RELEASE_NAME_FORMAT;
            }
        }

        return ({
            description: description,
            releaseNameFormat: releaseNameFormat,
        } as IGeneralOptionsState);
    }

    private _removeDeletedEnvironmentsFromList = (listOfEnvironmentStatuses: IEnvironmentReference[], deployStores: DeployEnvironmentStore[]) => {
        let deletedEnvironments: IEnvironmentReference[] = [];
        listOfEnvironmentStatuses.forEach(status => {
            if (!deployStores.some(depStore => depStore.getEnvironmentId() === status.environmentId)) {
                deletedEnvironments.push(status);
            }
        });

        if (deletedEnvironments.length > 0) {
            deletedEnvironments.forEach(deletedEnvironment =>
                Utils_Array.remove(listOfEnvironmentStatuses, deletedEnvironment));
        }
    }

    private _handleUpdateDescription = (newValue: string) => {
        if (newValue && newValue.length > GeneralOptionsStore.MAX_INPUT_LENGTH) {
            newValue = newValue.slice(0, GeneralOptionsStore.MAX_INPUT_LENGTH);
        }

        this._currentState.description = newValue;
        this.emitChanged();
    }

    private _handleUpdateReleaseNameFormat = (newValue: string) => {
        if (newValue && newValue.length > GeneralOptionsStore.MAX_INPUT_LENGTH) {
            newValue = newValue.slice(0, GeneralOptionsStore.MAX_INPUT_LENGTH);
        }

        this._currentState.releaseNameFormat = newValue;
        this.emitChanged();
    }

    static readonly DEFAULT_RELEASE_NAME_FORMAT: string = "Release-$(rev:r)";
    static readonly MAX_INPUT_LENGTH: number = 256;

    private _currentState: IGeneralOptionsState;
    private _originalState: IGeneralOptionsState;
    private _generalOptionsActionsHub: GeneralOptionsActionsHub;
    private _publishDeployStatusStore: EnvironmentCheckListStore;
    private _badgeStatusStore: EnvironmentCheckListStore;
    private _autoLinkWorkItemsStore: EnvironmentCheckListStore;
}
