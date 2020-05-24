import { autobind } from "OfficeFabric/Utilities";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActiveReleasesActionsHub, IActiveReleasesPayload, IUpdateReleasePayload, IRemoveReleasePayload, IActiveReleasesColumnPayload } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionsHub";
import { ActiveReleasesFilterStore, IActiveReleasesFilterState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { PipelineRelease, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { IState } from "DistributedTaskControls/Common/Components/Base";

import { findIndex, removeWhere as removeFromArrayWhere } from "VSS/Utils/Array";
import { format } from "VSS/Utils/String";
import * as VssContext from "VSS/Context";
import { ReleaseEnvironmentStatusUpdatedEvent } from "ReleaseManagement/Core/Contracts";
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

export interface IActiveReleasesState extends IState {
    definitionId: number;
    folderPath: string;
    releases: PipelineRelease[];
    continuationToken: number;
    isLoading: boolean;
    clearReleases: boolean;
    newlyCreatedReleaseId?: number;
}

export class ActiveReleasesStore extends StoreBase {

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_ActiveReleasesStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._actionsHub = ActionsHubManager.GetActionsHub<ActiveReleasesActionsHub>(ActiveReleasesActionsHub);
        this._actionsHub.releasesUpdated.addListener(this._setReleases);
        this._actionsHub.releasesUpdatedWithMore.addListener(this._appendReleases);
        this._actionsHub.updateRelease.addListener(this._updateRelease);
        this._actionsHub.releaseEnvironmentUpdated.addListener(this._updateReleaseEnvironment);
        this._actionsHub.releaseCreated.addListener(this._releaseCreated);
        this._actionsHub.removeRelease.addListener(this._removeRelease);
        this._actionsHub.releaseEnvironmentStatusUpdated.addListener(this._updateReleaseEnvironmentStatus);
        this._actionsHub.completeReleaseAddition.addListener(this._handelCompleteReleaseAddition);
        this._actionsHub.clearReleases.addListener(this._clearReleases);
        this._actionsHub.onEnvironmentColumnResize.addListener(this._onEnvironmentColumnResize);
        this._actionsHub.onReleaseColumnResize.addListener(this._onReleaseColumnResize);
        this._actionsHub.onReleaseExpand.addListener(this._onReleaseExpand);

        this._activeReleasesFilterStore = StoreManager.GetStore<ActiveReleasesFilterStore>(ActiveReleasesFilterStore, instanceId);

        this._initializeState();
    }

    public getState(): IActiveReleasesState {
        return this._state;
    }

    public isReleaseAdditionInProgress(releaseId: number): boolean {
        return (this._state.newlyCreatedReleaseId === releaseId);
    }

    public getAdditionInProgressReleaseId(): number {
        return this._state.newlyCreatedReleaseId;
    }

    public getEnvColumnWidth(definitionId: number): number {
        const storageKey: string = this._getColumnWidthMapKey(definitionId);
        const columnWidthMapString = DefinitionsUtils.getContentFromLocalStorage(storageKey);
        if (columnWidthMapString) {
            const columnWidthMap = JSON.parse(columnWidthMapString);
            if (columnWidthMap && columnWidthMap.hasOwnProperty("active-release-environment-column")) {
                return columnWidthMap["active-release-environment-column"];
            }
            else {
                return -1;
            }
        }
        else {
            return -1;
        }
    }

    public getEnvCanvasWidth(definitionId: number): number {
        if (this._definitionIdEnvironmentCanvasWidthMap.hasOwnProperty(definitionId)) {
            return this._definitionIdEnvironmentCanvasWidthMap[definitionId];
        }
        else {
            return -1;
        }
    }

    public getReleaseColumnWidth(definitionId: number): number {
        const storageKey: string = this._getColumnWidthMapKey(definitionId);
        const columnWidthMapString = DefinitionsUtils.getContentFromLocalStorage(storageKey);

        if (columnWidthMapString) {
            const columnWidthMap = JSON.parse(columnWidthMapString);
            if (columnWidthMap && columnWidthMap.hasOwnProperty("active-release-name-column")) {
                return columnWidthMap["active-release-name-column"];
            }
            else {
                return -1;
            }
        }
        else {
            return -1;
        }
    }

    private _initializeState(): void {
        this._state = {
            definitionId: 0,
            folderPath: "\\",
            releases: [],
            continuationToken: 0,
            isLoading: true,
            clearReleases: false
        };
    }

    @autobind
    private _setReleases(payload: IActiveReleasesPayload): void {
        this._state = { ...payload, ...{ isLoading: false, clearReleases: false } };
        this.emitChanged();
    }

    @autobind
    private _appendReleases(payload: IActiveReleasesPayload): void {

        this._state.releases.push(...(payload.releases || []));
        this._state.continuationToken = payload.continuationToken;
        this._state.isLoading = false;
        this.emitChanged();
    }

    @autobind
    private _updateRelease(payload: IUpdateReleasePayload): void {
        const index = findIndex(this._state.releases, (release) => release.id === payload.release.id);
        if (index >= 0) {
            let release = this._applyFilters(payload.release);
            if (!!release) {
                this._state.releases[index] = release;
                this.emitChanged();
            }
        }
        else {
            let releasesFilterState = this._activeReleasesFilterStore.getState();
            if (this._anyReleaseFilterSelected(releasesFilterState)) {
                let release = this._applyFilters(payload.release);
                if (!!release) {
                    this._state.releases.unshift(payload.release);
                    this.emitChanged();
                }
            }
        }
    }

    @autobind
    private _releaseCreated(payload: IUpdateReleasePayload): void {
        let release = this._applyFilters(payload.release);
        if (!!release) {
            this._state.releases.unshift(payload.release);
            this._state.newlyCreatedReleaseId = payload.release.id;
            this.emitChanged();
        }
    }

    private _anyReleaseFilterSelected(releasesFilterState: IActiveReleasesFilterState) {
        return !!releasesFilterState ||
            !!releasesFilterState.searchText ||
            !!releasesFilterState.status ||
            !!releasesFilterState.branch ||
            !!releasesFilterState.tags ||
            !!releasesFilterState.createdBy;
    }

    @autobind
    private _applyFilters(release: PipelineRelease): PipelineRelease {
        let releasesFilterState = this._activeReleasesFilterStore.getState();
        let { searchText, status, branch, tags, createdBy } = releasesFilterState;
        if ((!branch || branch === RMUtils.ArtifactsHelper.getPrimaryArtifactBranchName(release.artifacts)) &&
            (!searchText || release.name.toLocaleLowerCase().indexOf(searchText.toLocaleLowerCase()) > -1) &&
            (!status || status === release.status) &&
            (!tags || (!!release.tags && release.tags.some((tag) => tags.toLocaleLowerCase().indexOf(tag.toLocaleLowerCase()) > -1))) &&
            (!createdBy || createdBy === release.createdBy.id)) {
            return release;
        }

        return null;
    }

    @autobind
    private _updateReleaseEnvironment(payload: PipelineEnvironment): void {
        const releaseIndex = findIndex(this._state.releases, (release) => release.id === payload.release.id);
        if (releaseIndex >= 0) {
            let environmentIndex = findIndex(this._state.releases[releaseIndex].environments, (releaseEnvironment) => releaseEnvironment.id === payload.id);
            if (environmentIndex >= 0) {
                this._state.releases[releaseIndex].environments[environmentIndex] = payload;
                this.emitChanged();
            }
        }
    }

    @autobind
    private _updateReleaseEnvironmentStatus(payload: ReleaseEnvironmentStatusUpdatedEvent): void {
        const releaseIndex = findIndex(this._state.releases, (release) => release.id === payload.releaseId);
        if (releaseIndex >= 0) {
            let environmentIndex = findIndex(this._state.releases[releaseIndex].environments, (releaseEnvironment) => releaseEnvironment.id === payload.environmentId);
            if (environmentIndex >= 0) {
                this._state.releases[releaseIndex].environments[environmentIndex].status = payload.environmentStatus;
                this.emitChanged();
            }
        }
    }

    @autobind
    private _removeRelease(payload: IRemoveReleasePayload): void {
        removeFromArrayWhere(this._state.releases, (release) => release.id === payload.releaseId);
        this.emitChanged();
    }

    @autobind
    private _handelCompleteReleaseAddition(emptyPayload: IEmptyActionPayload): void {
        this._state.newlyCreatedReleaseId = null;
        this.emitChanged();
    }

    @autobind
    private _clearReleases(): void {
        // Zero Releases view is different from the empty right panel which we want to show on clear releases trigger, 
        // hence using clearReleases in state instead of relying on releases length
        this._state.releases = [];
        this._state.clearReleases = true;
        this.emitChanged();
    }

    private _onEnvironmentColumnResize = (payload: IActiveReleasesColumnPayload): void => {
        const storageKey: string = this._getColumnWidthMapKey(payload.definitionId);
        this._columnWidthMapForActiveReleasesView["active-release-environment-column"] = payload.newWidth;
        DefinitionsUtils.saveContentToLocalStorage(storageKey, JSON.stringify(this._columnWidthMapForActiveReleasesView));
        this.emit(ActiveReleasesStore.ActiveReleaseColumnResizeEvent, this);
    }

    private _onReleaseColumnResize = (payload: IActiveReleasesColumnPayload): void => {
        const storageKey: string = this._getColumnWidthMapKey(payload.definitionId);
        this._columnWidthMapForActiveReleasesView["active-release-name-column"] = payload.newWidth;
        DefinitionsUtils.saveContentToLocalStorage(storageKey, JSON.stringify(this._columnWidthMapForActiveReleasesView));
        this.emit(ActiveReleasesStore.ActiveReleaseColumnResizeEvent, this);
    }

    private _onReleaseExpand = (payload: IActiveReleasesColumnPayload): void => {
        // On release expand set maximum possible canvas width out of all releases for this definition
        if (!this._definitionIdEnvironmentCanvasWidthMap.hasOwnProperty(payload.definitionId)
            || this._definitionIdEnvironmentCanvasWidthMap[payload.definitionId] < payload.newWidth) {
            this._definitionIdEnvironmentCanvasWidthMap[payload.definitionId] = payload.newWidth;
        }

        this.emit(ActiveReleasesStore.ActiveReleaseColumnResizeEvent, this);
    }

    private _getColumnWidthMapKey(definitionId: number): string {
        return (format("ActiveReleasesColumnWidthMapKeyForProjectId-{0}-AndRDId-{1}", VssContext.getDefaultWebContext().project.id, definitionId.toString()));
    }

    protected disposeInternal(): void {
        this._actionsHub.releasesUpdated.removeListener(this._setReleases);
        this._actionsHub.releasesUpdatedWithMore.removeListener(this._appendReleases);
        this._actionsHub.updateRelease.removeListener(this._updateRelease);
        this._actionsHub.releaseCreated.removeListener(this._releaseCreated);
        this._actionsHub.removeRelease.removeListener(this._removeRelease);
        this._actionsHub.releaseEnvironmentStatusUpdated.removeListener(this._updateReleaseEnvironmentStatus);
        this._actionsHub.completeReleaseAddition.removeListener(this._handelCompleteReleaseAddition);
        this._actionsHub.clearReleases.removeListener(this._clearReleases);
        this._actionsHub.onEnvironmentColumnResize.removeListener(this._onEnvironmentColumnResize);
        this._actionsHub.onReleaseColumnResize.removeListener(this._onReleaseColumnResize);
        this._actionsHub.onReleaseExpand.removeListener(this._onReleaseExpand);
    }

    private _actionsHub: ActiveReleasesActionsHub;
    private _state: IActiveReleasesState;
    private _definitionIdEnvironmentCanvasWidthMap: IDictionaryNumberTo<number> = {};
    private _columnWidthMapForActiveReleasesView: IDictionaryStringTo<number> = {}; // Map to store the width corresponding to release/env column using separate custom strings as the key

    public static ActiveReleaseColumnResizeEvent: string = "COLUMN_RESIZE_EVENT";
    private _activeReleasesFilterStore: ActiveReleasesFilterStore;
}