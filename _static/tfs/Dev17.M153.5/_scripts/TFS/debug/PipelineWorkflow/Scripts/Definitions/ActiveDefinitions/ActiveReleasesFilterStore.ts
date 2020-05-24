import { autobind } from "OfficeFabric/Utilities";
import { IComboBoxOption } from "OfficeFabric/ComboBox";

import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ReleaseStatus } from "ReleaseManagement/Core/Contracts";
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

import { FlightNames } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleasesHubServiceDataHelper } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { DefinitionsStoreKeys, ActiveDefinitionsUrlParameterKeys, } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ActiveReleasesActionsHub, IDefinitionIdPayload } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionsHub";
import { ShowAllReleasesSetting } from "PipelineWorkflow/Scripts/Definitions/Utils/ShowAllReleasesSetting";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { getHistoryService } from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

import { IPickListGroup } from "VSSUI/PickList";

export enum ReleaseFilterPickListItemsStatus {
    Undefined = 0,
    Active = 2,
    Draft = 1,
    Abandoned = 4,
    Deleted = 8
}

export interface IActiveReleasesFilterState extends IState {
    searchText: string;
    currentlyDeployed: boolean;
    status: ReleaseStatus;
    branch: string;
    tags: string;
    isDeleted: boolean;
    createdBy: string;
    groups?: IPickListGroup[];
}

export class ActiveReleasesFilterStore extends StoreBase {

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_ActiveReleasesFilterStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._actionsHub = ActionsHubManager.GetActionsHub<ActiveReleasesActionsHub>(ActiveReleasesActionsHub);
        this._actionsHub.filterUpdated.addListener(this._setFilter);
        this._actionsHub.setCurrentlyDeployedState.addListener(this._setCurrentlyDeployedState);
        this._actionsHub.resetFilterState.addListener(this._resetFilterState);
        this._actionsHub.artifactSourceBranchesUpdated.addListener(this._setArtifactSourceBranches);
        this._actionsHub.setAllTags.addListener(this._setTagsPickListItems);
        this._actionsHub.updateDefinitionId.addListener(this._onDefinitionIdChanged);

        this._initializeState();
    }

    public getState(): IActiveReleasesFilterState {
        return this._state;
    }

    public getGroupKey(status: ReleaseFilterPickListItemsStatus): string {
        switch (status) {
            case ReleaseFilterPickListItemsStatus.Deleted:
                return ActiveReleasesFilterStore.DeletedFilterGroupKey;

            default:
                return ActiveReleasesFilterStore.StatusFilterGroupKey;
        }
    }

    public getBranches(): IComboBoxOption[] {
        return this._branchOptions;
    }

    public getDefaultStatus(): ReleaseFilterPickListItemsStatus {
        return ReleaseFilterPickListItemsStatus.Undefined;
    }

    public isFilterInAllState(): boolean {
        const defaultState = this._defaultState;

        return (
            this._state.branch === defaultState.branch
            && this._state.searchText.trim() === defaultState.searchText
            && this._state.currentlyDeployed === false
            && (this._state.status === defaultState.status || this._state.status === this._releaseStatusAll)
            && this._state.isDeleted === defaultState.isDeleted
            && this._state.tags === defaultState.tags
            && this._state.createdBy === defaultState.createdBy);
    }

    public isAnyFilterApplied(): boolean {
        return !(
            (!this._state.branch || this._state.branch === ActiveReleasesFilterStore.AnyBranchOptionKey)
            && this._state.searchText.trim() === Utils_String.empty
            && this._state.currentlyDeployed === false
            && this._state.status === ReleaseStatus.Undefined
            && this._state.isDeleted === false
            && this._state.tags === Utils_String.empty
            && this._state.createdBy === Utils_String.empty);
    }

    public getTagsPickListItems(): string[] {
        return this._allTags;
    }

    public isFlightSettingForCurrentlyDeployedFilterActive(): boolean {
        return this._flightSettingForCurrentlyDeployedFilterActive;
    }

    public isCurrentlyDeployedFilterOn(selectedDefinitionId: number): boolean {
        let isCurrentlyDeployedOn: boolean = true;
        // Use user preference to decide what to show
        this._flightSettingForCurrentlyDeployedFilterActive = false;

        if (selectedDefinitionId > 0) {
            let userOptedShowAllSetting: boolean = ShowAllReleasesSetting.getValue(selectedDefinitionId);
            isCurrentlyDeployedOn = !userOptedShowAllSetting;

            if (userOptedShowAllSetting === null || userOptedShowAllSetting === undefined) {
                // Use flight assignment value to decide what to show
                this._flightSettingForCurrentlyDeployedFilterActive = true;

                let isTreatmentFlightAssigned: boolean = ReleasesHubServiceDataHelper.isFlightAssigned(FlightNames.ShowAllReleasesTreatmentFlight);
                isCurrentlyDeployedOn = FeatureFlagUtils.isFlightAssignmentsFetchingEnabled() ? !isTreatmentFlightAssigned : false;
            }
        }

        return isCurrentlyDeployedOn;
    }

    private _initializeState(): void {
        this._state = this._defaultState;
        this._branchOptions = [this._defaultBranchOption];
    }

    private get _defaultState(): IActiveReleasesFilterState {
        // Right now, we won't reset currently deployed. The user will manually change the toggle, and we'll use the same for all Rds
        let currentlyDeployed = true; // The case if this is the first initialization
        if (!!this._state) {
            currentlyDeployed = this._state.currentlyDeployed; // Remember the selection
        }

        return {
            groups: this._getAllGroups(),
            disabledGroupKeys: [ActiveReleasesFilterStore.DeletedFilterGroupKey],
            searchText: Utils_String.empty,
            currentlyDeployed: currentlyDeployed,
            status: ReleaseStatus.Undefined,
            branch: Utils_String.empty,
            tags: Utils_String.empty,
            isDeleted: false,
            createdBy: Utils_String.empty
        };
    }

    @autobind
    private _setFilter(payload: IActiveReleasesFilterState): void {
        this._state = { ...this._state, ...payload };
        const currentUrlState = getHistoryService().getCurrentState();

        if (payload.branch !== ActiveReleasesFilterStore.AnyBranchOptionKey) {
            currentUrlState[ActiveDefinitionsUrlParameterKeys.Branch] = payload.branch;
        }

        if (payload.status !== (ReleaseStatus.Abandoned | ReleaseStatus.Active | ReleaseStatus.Draft) && payload.status !== ReleaseStatus.Undefined) {
            currentUrlState[ActiveDefinitionsUrlParameterKeys.State] = payload.status;
        }

        getHistoryService().replaceHistoryPoint(currentUrlState.action, currentUrlState, null, true);

        this.emit(ActiveReleasesFilterStore.FilterUpdatedEvent, this);
    }

    @autobind
    private _setCurrentlyDeployedState(showCurrentlyDeployed: boolean): void {
        this._state.currentlyDeployed = showCurrentlyDeployed;
        this.emit(ActiveReleasesFilterStore.FilterUpdatedEvent, this);
    }

    @autobind
    private _setArtifactSourceBranches(payload: string[]): void {
        let branchOptions: IComboBoxOption[] = [];
        branchOptions.push(this._defaultBranchOption);

        let payloadBranchOptions: IComboBoxOption[] = payload.map(branch => {
            return {
                key: branch,
                text: RMUtils.BranchHelper.toDisplayValue(branch),
            } as IComboBoxOption;
        });

        branchOptions.push(...payloadBranchOptions);
        this._branchOptions = branchOptions;

        this.emit(ActiveReleasesFilterStore.BranchesUpdatedEvent, this);
    }

    @autobind
    private _setTagsPickListItems(tags: string[]): void {
        this._allTags = tags;
    }

    private _resetFilterState = () => {
        // On change in item selection in left panel or change in tab from 'All' to 'Active', the filter is set to default state, accordingly we should reset the filter icon state
        this._initializeState();
        this.emit(ActiveReleasesFilterStore.FilterResetEvent, this);
    }

    private _onDefinitionIdChanged = (payload: IDefinitionIdPayload) => {
        this._state.currentlyDeployed = this.isCurrentlyDeployedFilterOn(payload.definitionId);
    }

    private get _defaultBranchOption(): IComboBoxOption {
        return {
            key: ActiveReleasesFilterStore.AnyBranchOptionKey,
            text: ActiveReleasesFilterStore.AnyBranchOptionText
        } as IComboBoxOption;
    }

    protected disposeInternal(): void {
        this._actionsHub.filterUpdated.removeListener(this._setFilter);
        this._actionsHub.setCurrentlyDeployedState.removeListener(this._setCurrentlyDeployedState);
        this._actionsHub.artifactSourceBranchesUpdated.removeListener(this._setArtifactSourceBranches);
        this._actionsHub.resetFilterState.removeListener(this._resetFilterState);
        this._actionsHub.setAllTags.removeListener(this._setTagsPickListItems);
        this._actionsHub.updateDefinitionId.removeListener(this._onDefinitionIdChanged);
    }

    private _getAllGroups(): IPickListGroup[] {
        return [
            { key: ActiveReleasesFilterStore.StatusFilterGroupKey },
            { key: ActiveReleasesFilterStore.DeletedFilterGroupKey }
        ];
    }

    private _actionsHub: ActiveReleasesActionsHub;
    private _state: IActiveReleasesFilterState;
    private _branchOptions: IComboBoxOption[];
    private _releaseStatusAll: ReleaseStatus = ReleaseStatus.Active | ReleaseStatus.Draft | ReleaseStatus.Abandoned;
    private _allTags: string[] = [];

    // Tells if we are using flight assignment value to decide whether to show 'All releases' or 'Currently deployed' by default
    private _flightSettingForCurrentlyDeployedFilterActive: boolean = false;

    public static readonly StatusFilterGroupKey = "active_releases_status_filter_group";
    public static readonly DeletedFilterGroupKey = "active_releases_deleted_filter_group";

    public static FilterUpdatedEvent: string = "FILTER_UPDATED_EVENT";
    public static BranchesUpdatedEvent: string = "BRANCHES_UPDATED_EVENT";
    public static FilterResetEvent: string = "FILTER_RESET_EVENT";

    public static AnyBranchOptionKey: string = "anyBranchKey";
    public static AnyBranchOptionText: string = Resources.BranchFilterAnyBranchText;
}