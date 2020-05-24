import { Actions as ItemSelectorActions, ItemInformation } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Item } from "DistributedTaskControls/Common/Item";

import { Favorite } from "Favorites/Contracts";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { PipelineDefinition, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveDefinitionsActionsHub, IActiveDefinitionsSearchResultsPayload, IActiveDefinitionsPayload } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsActions";
import { IAddToDashboardState } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { FavoritesActionsHub, IDeleteFavoritePayload } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { FavoriteDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoriteDefinitionsStore";
import { ActiveReleasesActionsHub } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionsHub";
import { ActiveDefinitionsSectionItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsSectionItem";
import { ActiveDefinitionsPanelItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsPanelItem";
import { SelectDefinitionItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/SelectDefinitionItem";
import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IActiveDefinitionReference, ActiveDefinitionReferenceType } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";
import { ReleaseEnvironment, ReleaseEnvironmentShallowReference, ApprovalStatus, ApprovalType, DeploymentAttempt } from "ReleaseManagement/Core/Contracts";
import { ReleaseApproval, Deployment } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Model";

export interface IActiveDefinitionsStoreState {
    sections: ActiveDefinitionsSectionItem[];
    activeDefinitions: ActiveDefinitionsPanelItem[];
    searchResultsLoading: boolean;
    showSearchResults: boolean;
    searchResults: ActiveDefinitionsPanelItem[];
    isLoadingDefinitions: boolean;
    favoriteInProgressDefinitionId?: number;
    addToDashboardState?: IAddToDashboardState;
}

export class ActiveDefinitionsStore extends StoreBase {

    constructor() {
        super();
    }

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_ActiveDefinitionsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
        this._favoriteDefinitionsStore = StoreManager.GetStore<FavoriteDefinitionsStore>(FavoriteDefinitionsStore);
        this._favoritesActionsHub = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub);
        this._activeDefinitionsActionsHub = ActionsHubManager.GetActionsHub<ActiveDefinitionsActionsHub>(ActiveDefinitionsActionsHub);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
        this._activeReleasesActionsHub = ActionsHubManager.GetActionsHub<ActiveReleasesActionsHub>(ActiveReleasesActionsHub);

        this._favoritesActionsHub.addFavorite.addListener(this._addFavorite);
        this._favoritesActionsHub.removeFavorite.addListener(this._removeFavorite);
        this._favoritesActionsHub.completeFavoriteAddition.addListener(this._completeFavoriteAddition);
        this._activeDefinitionsActionsHub.setActiveDefinitions.addListener(this._setActiveDefinitionReferences);
        this._activeDefinitionsActionsHub.releaseEnvironmentUpdated.addListener(this._releaseEnvironmentUpdated);
        this._activeDefinitionsActionsHub.environmentLastDeploymentUpdated.addListener(this._environmentLastDeploymentUpdated);
        this._activeDefinitionsActionsHub.setSearchResults.addListener(this._setSearchResults);
        this._activeDefinitionsActionsHub.setInitialSelectedDefinition.addListener(this._setInitialSelectedPanelItemId);
        this._activeDefinitionsActionsHub.deleteDefinition.addListener(this._deleteDefinition);
        this._activeDefinitionsActionsHub.updateLoadingStatus.addListener(this._updateLoadingStatus);
        this._activeDefinitionsActionsHub.clearFavoriteInProgressId.addListener(this._clearFavoriteInProgress);
        this._activeDefinitionsActionsHub.setAddToDashboardMessageState.addListener(this._setAddToDashboardMessageState);
        this._itemSelectorActions.selectItem.addListener(this._handleSelectItem);
        this._activeReleasesActionsHub.setLastDeploymentForSearchedRd.addListener(this._setLastDeploymentForSearchedRd);
        this._activeReleasesActionsHub.setLastDeploymentForFavoritedRd.addListener(this._setLastDeploymentForFavoritedRd);

        this._state = {
            sections: [],
            activeDefinitions: [],
            searchResults: [],
            showSearchResults: false,
            searchResultsLoading: false,
            // On directly landing on Active page we show the Spinner loading component, 
            // for landing via tab change, the old data will still be available, so no need to show loading component
            isLoadingDefinitions: true,
            addToDashboardState: undefined
        };
    }

    public disposeInternal(): void {
        if (this._favoritesActionsHub) {
            this._favoritesActionsHub.addFavorite.removeListener(this._addFavorite);
            this._favoritesActionsHub.removeFavorite.removeListener(this._removeFavorite);
            this._favoritesActionsHub.completeFavoriteAddition.removeListener(this._completeFavoriteAddition);
        }

        if (this._activeDefinitionsActionsHub) {
            this._activeDefinitionsActionsHub.releaseEnvironmentUpdated.removeListener(this._releaseEnvironmentUpdated);
            this._activeDefinitionsActionsHub.environmentLastDeploymentUpdated.removeListener(this._environmentLastDeploymentUpdated);
            this._activeDefinitionsActionsHub.setActiveDefinitions.removeListener(this._setActiveDefinitionReferences);
            this._activeDefinitionsActionsHub.setSearchResults.removeListener(this._setSearchResults);
            this._activeDefinitionsActionsHub.deleteDefinition.removeListener(this._deleteDefinition);
            this._activeDefinitionsActionsHub.setInitialSelectedDefinition.removeListener(this._setInitialSelectedPanelItemId);
            this._activeDefinitionsActionsHub.updateLoadingStatus.removeListener(this._updateLoadingStatus);
            this._activeDefinitionsActionsHub.clearFavoriteInProgressId.removeListener(this._clearFavoriteInProgress);
            this._activeDefinitionsActionsHub.setAddToDashboardMessageState.removeListener(this._setAddToDashboardMessageState);
        }

        if (this._itemSelectorActions) {
            this._itemSelectorActions.selectItem.removeListener(this._handleSelectItem);
        }

        if (this._activeReleasesActionsHub) {
            this._activeReleasesActionsHub.setLastDeploymentForSearchedRd.removeListener(this._setLastDeploymentForSearchedRd);
            this._activeReleasesActionsHub.setLastDeploymentForFavoritedRd.removeListener(this._setLastDeploymentForFavoritedRd);
        }
    }

    public getState(): IActiveDefinitionsStoreState {
        this._setDisplayState();
        return this._state;
    }

    public getDefaultSelectedDefinitionReference(): IActiveDefinitionReference {
        let allItems: ActiveDefinitionsPanelItem[];
        if (this._state.activeDefinitions && this._state.activeDefinitions.length > 0) {
            allItems = [...this._state.activeDefinitions];
        }
        if (this._state.sections && this._state.sections.length > 0) {
            if (!allItems) {
                allItems = [];
            }

            this._state.sections.forEach((sectionItem) => { allItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });
        }
        if (allItems && allItems.length > 0) {
            if (this._selectedPanelItemId) {
                const def = Utils_Array.first(allItems, (def: ActiveDefinitionsPanelItem) => def.getDefinition().id === this._selectedPanelItemId);

                // If the item is not available, return the first item as default
                if (!def) {
                    return this._state.activeDefinitions[0].getDefinition();
                }

                return def.getDefinition();
            }
            else {
                if (this._state.activeDefinitions && this._state.activeDefinitions.length > 0) {
                    return this._state.activeDefinitions[0].getDefinition();
                }
                else if (this._state.sections && this._state.sections.length > 0) {
                    const firstSectionWithDefintion = Utils_Array.first(this._state.sections, (section) => (section.getChildItems() || []).length > 0);
                    return firstSectionWithDefintion && (firstSectionWithDefintion.getChildItems()[0] as ActiveDefinitionsPanelItem).getDefinition();
                }

                return null;
            }
        }
        else {
            return null;
        }
    }

    public getDefaultSelectedDefinitionPanelItem(): ActiveDefinitionsPanelItem {
        if (this._state) {
            if (this._state.activeDefinitions && this._state.activeDefinitions.length > 0) {
                return this._state.activeDefinitions[0];
            }
            else if (this._state.sections && this._state.sections.length > 0) {
                let allItems: ActiveDefinitionsPanelItem[] = [];
                this._state.sections.forEach((sectionItem) => { allItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });
                if (allItems.length > 0) {
                    return allItems[0];
                }
            }
        }

        return null;
    }

    public getItemToSelectAfterDeleteRD(deletedDefinitionId: number): ActiveDefinitionsPanelItem {
        // Creating a temporary array of the definitions that will remain after the current delete operation is complete
        let definitionsRemaining: ActiveDefinitionsPanelItem[] = [];
        if (this._state) {
            if (this._state.activeDefinitions && this._state.activeDefinitions.length > 0) {
                definitionsRemaining = this._state.activeDefinitions;
            }
            else if (this._state.sections && this._state.sections.length > 0) {
                let allItems: ActiveDefinitionsPanelItem[] = [];
                this._state.sections.forEach((sectionItem) => { allItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });
                if (allItems.length > 0) {
                    definitionsRemaining = allItems;
                }
            }
            if (definitionsRemaining.length > 0) {
                // Remove the RD that is going to get deleted
                Utils_Array.removeWhere(definitionsRemaining, (def: ActiveDefinitionsPanelItem) => { return def.getDefinition().id === deletedDefinitionId; });
                if (definitionsRemaining.length > 0) {
                    return definitionsRemaining[0];
                }
            }
        }

        return null;
    }

    public shouldShowSearchResults(): boolean {
        return this._state && this._state.showSearchResults;
    }

    // Use this function as a refactored element for the related functions above and below
    public getCurrentDefinitionPanelItem(): ActiveDefinitionsPanelItem {
        if (this._state && !this._state.showSearchResults) {
            const allItems: ActiveDefinitionsPanelItem[] = !this._state.activeDefinitions ? [] : [...this._state.activeDefinitions];
            this._state.sections.forEach((sectionItem) => { allItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });

            if (this._selectedPanelItemId && allItems.length > 0) {
                const def = Utils_Array.first(
                    allItems,
                    (def: ActiveDefinitionsPanelItem) => def.getDefinition().id === this._selectedPanelItemId);

                // If the item is not available, return the first item as default
                if (!def) {
                    return this.getDefaultSelectedDefinitionPanelItem();
                }

                return def;
            }
            else {
                return this.getDefaultSelectedDefinitionPanelItem();
            }
        }
        else {
            return null;
        }
    }

    public getMineSectionSelectedItemIndex(): number {
        let selectedItemIndex: number = -1;
        if (this._state && !this._state.showSearchResults && this._state.activeDefinitions) {
            selectedItemIndex = this._getSelectedItemIndex(this._state.activeDefinitions);
        }

        return selectedItemIndex;
    }

    public getRecentSectionSelectedItemIndex(): number {
        let selectedItemIndex: number = -1;
        if (this._state && !this._state.showSearchResults && this._state.sections) {
            let recentItems: ActiveDefinitionsPanelItem[] = [];
            this._state.sections.forEach((sectionItem) => { recentItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });

            selectedItemIndex = this._getSelectedItemIndex(recentItems);
        }

        return selectedItemIndex;
    }

    public getDefaultKey(): string {
        // This is a part of the overall selection hack. This should be fixed, when we fix the selection in a proper way
        // This suppresses the selection of an RD, and the consequent call to fetch the list of releases. 
        return this._state.sections[0].getKey();
    }

    public getItemById(id: number): ActiveDefinitionsPanelItem {
        const allItems: ActiveDefinitionsPanelItem[] = !this._state.activeDefinitions ? [] : [...this._state.activeDefinitions];
        this._state.sections.forEach((sectionItem) => { allItems.push(...(sectionItem.getChildItems() as ActiveDefinitionsPanelItem[])); });
        if (allItems.length > 0) {
            return Utils_Array.first(allItems, (def) => def.getDefinition().id === id);
        }
        else {
            return null;
        }
    }

    private _getSelectedItemIndex(panelItems: ActiveDefinitionsPanelItem[]): number {
        let selectedItemIndex: number = -1;
        if (panelItems && panelItems.length > 0 && this._selectedPanelItemId) {
            const def = Utils_Array.first(
                panelItems,
                (def: ActiveDefinitionsPanelItem) => def.getDefinition().id === this._selectedPanelItemId);
            if (def) {
                selectedItemIndex = panelItems.indexOf(def);
            }
        }

        return selectedItemIndex;
    }

    private _releaseEnvironmentUpdated = (payload: ReleaseEnvironment, isLastDeployed: boolean = false) => {
        let changed = this._updateDefinitionReference(this._activeDefinitionReferences, payload, isLastDeployed);
        if (!changed) {
            changed = this._updateDefinitionReference(this._recentDefinitionReferences, payload, isLastDeployed);
        }

        if (changed) {
            this.emitChanged();
        }
    }

    private _environmentLastDeploymentUpdated = (payload: ReleaseEnvironment) => {
        this._releaseEnvironmentUpdated(payload, true);
    }

    private _updateDefinitionReference(definitionReferences: IActiveDefinitionReference[], payload: ReleaseEnvironment, isLastDeployed: boolean): boolean {
        const index = Utils_Array.findIndex(definitionReferences, (definitionReference) => definitionReference.id === payload.releaseDefinition.id);
        if (index >= 0) {
            let getCurrentPendingApproval = () => definitionReferences[index].pendingApproval;
            let pendingApprovals = [];
            payload.preDeployApprovals.forEach((releaseApproval: ReleaseApproval) => {
                if (releaseApproval.status === ApprovalStatus.Pending) {
                    pendingApprovals.push(releaseApproval);
                }
            });
            payload.postDeployApprovals.forEach((releaseApproval: ReleaseApproval) => {
                if (releaseApproval.status === ApprovalStatus.Pending) {
                    pendingApprovals.push(releaseApproval);
                }
            });
            if (pendingApprovals.length > 0) {
                pendingApprovals.sort((a: ReleaseApproval, b: ReleaseApproval) => {
                    return Utils_Number.defaultComparer(a.id, b.id); // asc order
                });
                definitionReferences[index].pendingApproval = pendingApprovals[0];
                definitionReferences[index].lastDeployment = null;
            } else if (getCurrentPendingApproval()) {
                let approvals = [];
                if (getCurrentPendingApproval().approvalType === ApprovalType.PreDeploy) {
                    approvals = payload.preDeployApprovals;
                } else {
                    approvals = payload.postDeployApprovals;
                }
                let approvalIndex = Utils_Array.findIndex(approvals, (releaseApproval) => releaseApproval.id === getCurrentPendingApproval().id);
                if (approvalIndex >= 0) {
                    definitionReferences[index].pendingApproval = null;
                }
            }

            if (!getCurrentPendingApproval()) {
                let lastDeployment = definitionReferences[index].lastDeployment;
                let latestDeploymentAttempt = payload.deploySteps.reduce((prev: DeploymentAttempt, current: DeploymentAttempt) => {
                    return (prev.id > current.id) ? prev : current;
                });
                if (!lastDeployment || lastDeployment.id <= latestDeploymentAttempt.deploymentId) {
                    let releaseEnvironment = {
                        id: payload.id,
                        name: payload.name
                    } as ReleaseEnvironmentShallowReference;
                    let latestDeployment = {
                        id: latestDeploymentAttempt.deploymentId,
                        attempt: latestDeploymentAttempt.attempt,
                        deploymentStatus: latestDeploymentAttempt.status,
                        operationStatus: latestDeploymentAttempt.operationStatus,
                        lastModifiedBy: latestDeploymentAttempt.lastModifiedBy,
                        lastModifiedOn: latestDeploymentAttempt.lastModifiedOn,
                        releaseEnvironment: releaseEnvironment
                    } as Deployment;
                    definitionReferences[index].lastDeployment = latestDeployment;
                }
            }

            if (!!isLastDeployed) {
                definitionReferences[index].definitionEnvironmentCurrentReleaseMap[payload.definitionEnvironmentId] = payload.releaseId;
            }

            return true;
        }

        return false;
    }

    private _setActiveDefinitionReferences = (payload: IActiveDefinitionsPayload) => {
        if (payload.activeDefinitions) {
            this._activeDefinitionReferences = Utils_Array.clone(payload.activeDefinitions);
            this._recentDefinitionReferences = Utils_Array.clone(payload.recentDefinitions);
            [...this._activeDefinitionReferences, ...this._recentDefinitionReferences].forEach((def: IActiveDefinitionReference) => {
                //Get the updated Rd name from common definitions store
                let definition: PipelineDefinition = this._commonDefinitionsStore.getDefinitionById(def.id);
                def.name = definition ? definition.name : def.name;
            });

            this._sortActiveDefinitionsReferences();

            if (this._state.showSearchResults) {
                this._state.showSearchResults = false;
                this._state.searchResults = [];
            }

            this._initiallyExpandRecent =
                (!!this._recentDefinitionReferences
                    && Utils_Array.findIndex(this._recentDefinitionReferences, (defRef) => defRef.id === this._selectedPanelItemId) >= 0) // If the selected item (from the url) is in recent , expand recent
                || (!this._activeDefinitionReferences || this._activeDefinitionReferences.length < ActiveDefinitionsStore._activeCountForHidingRecent // If active has less than the specified number, expand recent
                    && !!this._recentDefinitionReferences && this._recentDefinitionReferences.length > 0); // Don't expand if recent is empty


            this.emitChanged();
        }
    }

    private _deleteDefinition = (deletedDefinitionId: number): void => {
        if (this._activeDefinitionReferences && this._activeDefinitionReferences.length > 0) {
            Utils_Array.removeWhere(this._activeDefinitionReferences, (def: IActiveDefinitionReference) => { return def.id === deletedDefinitionId; });
        }
        if (this._recentDefinitionReferences && this._recentDefinitionReferences.length > 0) {
            Utils_Array.removeWhere(this._recentDefinitionReferences, (def: IActiveDefinitionReference) => { return def.id === deletedDefinitionId; });
        }
        if (this._state.showSearchResults && this._searchResults && this._searchResults.length > 0) {
            Utils_Array.removeWhere(this._searchResults, (def: IActiveDefinitionReference) => { return def.id === deletedDefinitionId; });
        }

        this.emitChanged();
    }

    private _setSearchResults = (payload: IActiveDefinitionsSearchResultsPayload): void => {
        this._state.showSearchResults = payload.showSearchResults;
        this._state.searchResultsLoading = payload.isLoading;
        const favoritedDefinitionsMap = this._favoriteDefinitionsStore.getFavorites();
        this._searchResults = [];

        // Constructing ActiveDefintionReferences using definitionIds
        for (const definition of payload.releaseDefinitions) {
            const isFavorite: boolean = favoritedDefinitionsMap.hasOwnProperty(definition.id) ? true : false;
            const favoriteId: string = isFavorite ? favoritedDefinitionsMap[definition.id] : Utils_String.empty;

            let defEnvReleaseMap: IDictionaryNumberTo<number> = DefinitionsUtils.getDefinitionEnvironmentReleaseMap(definition);

            const activeDefinitionReference: IActiveDefinitionReference = {
                id: definition.id,
                name: definition.name,
                path: definition.path,
                favoriteId: favoriteId,
                definitionType: ActiveDefinitionReferenceType.SearchedResult,
                // For search results we are not showing the second line under RD name, so pending approval and last deployment are not required
                pendingApproval: null,
                lastDeployment: null,
                releasesList: null,
                releasesContinuationToken: 0,
                definitionEnvironmentCurrentReleaseMap: defEnvReleaseMap,
                environments: definition.environments.map((env) => {
                    return {
                        definitionEnvironmentId: env.id,
                        definitionEnvironmentName: env.name,
                        releaseDefinitionId: definition.id,
                        releaseDefinitionName: definition.name
                    };
                })
            };
            this._searchResults.push(activeDefinitionReference);
        }

        this._sortActiveDefinitionsReferences();

        // Announce the search results only once the loading is finished
        if (!payload.isLoading && payload.showSearchResults) {
            const announceMessage = Utils_String.localeFormat(Resources.FilteredDefinitionsAnnounceMessage, this._searchResults.length);
            announce(announceMessage);
        }

        this.emitChanged();
    }

    private _setDisplayState = () => {
        if (this._activeDefinitionReferences) {
            this._state.activeDefinitions = [];
            this._activeDefinitionReferences.forEach((def: IActiveDefinitionReference) => {
                this._state.activeDefinitions.push(this._getPanelItem(def, true));
            });
        }

        if (this._searchResults) {
            this._state.searchResults = [];
            this._searchResults.forEach((def: IActiveDefinitionReference) => {
                this._state.searchResults.push(this._getPanelItem(def, false));
            });
        }

        // Temporarily disabling sorting on favorite/unfavorite till we implement animation
        //this._sortActiveDefinitions();

        if (this._state.sections.length === 0) {
            this._state.sections.push(this._getRecentSectionItem());
        }

        if (this._searchedDefinitions && this._searchedDefinitions.length > 0) {
            if (this._recentDefinitionReferences && this._recentDefinitionReferences.length === 0) {
                this._recentDefinitionReferences.unshift(...this._searchedDefinitions);
            }
            else {
                this._searchedDefinitions.forEach((def: IActiveDefinitionReference) => {
                    const matchingRd = this._recentDefinitionReferences.find(recentDef => recentDef.id === def.id);
                    if (!matchingRd) {
                        this._recentDefinitionReferences.unshift(def);
                    }
                });
            }
        }

        if (!!this._recentItem) {
            this._recentItem.updateChildItems(
                this._recentDefinitionReferences.map((reference) => this._getPanelItem(reference, true, true)),
                this._initiallyExpandRecent);
        }
    }

    private _setInitialSelectedPanelItemId = (id: number): void => {
        // This action is called in order to set the default item only when id is specified in the url
        this._selectedPanelItemId = id;
    }

    private _addFavorite = (favorite: Favorite): void => {
        const favoriteDefinitionId = parseInt(favorite.artifactId);
        if (this._activeDefinitionReferences) {
            let definitionToBeUpdated: IActiveDefinitionReference = Utils_Array.first(this._activeDefinitionReferences, (def) => def.id === favoriteDefinitionId);
            const recentDefintionReference: IActiveDefinitionReference = Utils_Array.first(this._recentDefinitionReferences, (def) => def.id === favoriteDefinitionId);

            if (!definitionToBeUpdated) {
                if (!recentDefintionReference) {
                    const favoritedDefinition: PipelineDefinition = this._commonDefinitionsStore.getDefinitionById(favoriteDefinitionId);
                    const defEnvReleaseMap: IDictionaryNumberTo<number> = DefinitionsUtils.getDefinitionEnvironmentReleaseMap(favoritedDefinition);

                    const favoritedDefinitionReference: IActiveDefinitionReference = {
                        id: favoritedDefinition.id,
                        name: favoritedDefinition.name,
                        path: favoritedDefinition.path,
                        favoriteId: favorite.id,
                        definitionType: ActiveDefinitionReferenceType.Favorite,
                        pendingApproval: null,
                        lastDeployment: this._lastDeploymentForFavoritedRd,
                        releasesList: null,
                        releasesContinuationToken: 0,
                        definitionEnvironmentCurrentReleaseMap: defEnvReleaseMap,
                        environments: favoritedDefinition.environments.map((env) => {
                            return {
                                definitionEnvironmentId: env.id,
                                definitionEnvironmentName: env.name,
                                releaseDefinitionId: favoritedDefinition.id,
                                releaseDefinitionName: favoritedDefinition.name
                            };
                        })
                    };

                    this._activeDefinitionReferences.push(favoritedDefinitionReference);
                }
                else {
                    this._state.favoriteInProgressDefinitionId = favoriteDefinitionId;
                    recentDefintionReference.favoriteId = favorite.id;
                    recentDefintionReference.lastDeployment = this._lastDeploymentForFavoritedRd;
                    this._activeDefinitionReferences.push(recentDefintionReference);

                    if (this._state.showSearchResults) {
                        // No need for favorite animation in search view
                        this._state.favoriteInProgressDefinitionId = null;
                        Utils_Array.remove(this._recentDefinitionReferences, recentDefintionReference);
                    }
                }
            }
            else {
                const index = this._activeDefinitionReferences.indexOf(definitionToBeUpdated);
                this._activeDefinitionReferences[index].favoriteId = favorite.id;
            }
        }

        if (this._searchResults) {
            this._searchResults.forEach((def: IActiveDefinitionReference) => {
                if (def.id === parseInt(favorite.artifactId)) {
                    def.favoriteId = favorite.id;
                }

                // Any RD which was searched and clicked and was neither in Mine nor in Recent to begin with, will get added to this._searchedDefinitions
                // If it was favorited in search then it is already added to Active, so need to remove it from this._searchedDefinitions before updating Recent
                if (this._searchedDefinitions && this._searchedDefinitions.length > 0) {
                    Utils_Array.removeWhere(this._searchedDefinitions, (searchedDef: IActiveDefinitionReference) => { return def.id === searchedDef.id; });
                }
            });
        }

        this.emitChanged();
    }

    private _completeFavoriteAddition = (definitionId: number): void => {
        const recentDefintionReference: IActiveDefinitionReference = Utils_Array.first(this._recentDefinitionReferences, (def) => def.id === definitionId);
        if (recentDefintionReference) {
            Utils_Array.remove(this._recentDefinitionReferences, recentDefintionReference);
            this._state.favoriteInProgressDefinitionId = null;
            this.emitChanged();
        }
    }

    private _removeFavorite = (payload: IDeleteFavoritePayload): void => {
        if (this._activeDefinitionReferences) {
            this._activeDefinitionReferences.forEach((def: IActiveDefinitionReference) => {
                if (def.id === payload.definitionId) {
                    def.favoriteId = null;
                }
            });
        }

        if (this._searchResults) {
            this._searchResults.forEach((def: IActiveDefinitionReference) => {
                if (def.id === payload.definitionId) {
                    def.favoriteId = null;
                }
            });
        }

        this.emitChanged();
    }

    private _getPanelItemId(definitionId: number): string {
        return Utils_String.format("active-definition-{0}", definitionId);
    }

    private _getPanelItemIdForSearchResult(definitionId: number): string {
        return Utils_String.format("search-result-{0}", definitionId);
    }

    private _getRecentSectionItem(): ActiveDefinitionsSectionItem {
        if (!this._recentItem) {
            const recentItems = this._recentDefinitionReferences.map((reference) =>
                this._getPanelItem(reference, true, true));
            this._recentItem = new ActiveDefinitionsSectionItem(Resources.ActiveDefinitionsRecentSectionHeader, ActiveDefinitionsStore._recentSectionItemId, recentItems, this._initiallyExpandRecent);
        }

        return this._recentItem;
    }

    private _sortActiveDefinitionsReferences(): void {
        if (this._activeDefinitionReferences && this._activeDefinitionReferences.length > 0) {
            this._activeDefinitionReferences.sort((a: IActiveDefinitionReference, b: IActiveDefinitionReference) => {
                return this._activeDefinitionReferenceComparer(a, b);
            });
        }
        if (this._searchResults && this._searchResults.length > 0) {
            this._searchResults.sort((a: IActiveDefinitionReference, b: IActiveDefinitionReference) => {
                return this._activeDefinitionReferenceComparer(a, b);
            });
        }
    }

    private _activeDefinitionReferenceComparer(a: IActiveDefinitionReference, b: IActiveDefinitionReference): number {
        if (a.favoriteId && !b.favoriteId) {
            return -1;
        }
        else if (!a.favoriteId && b.favoriteId) {
            return 1;
        }
        else if ((a.favoriteId && b.favoriteId)) {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        }
        else if (a.pendingApproval && !b.pendingApproval) {
            return -1;
        }
        else if (!a.pendingApproval && b.pendingApproval) {
            return 1;
        }
        else {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        }
    }

    private _getPanelItem(activeDefinition: IActiveDefinitionReference, showSubtitle: boolean, isRecentSection?: boolean): ActiveDefinitionsPanelItem {
        const panelItemId: string = this._state.showSearchResults ? this._getPanelItemIdForSearchResult(activeDefinition.id) : this._getPanelItemId(activeDefinition.id);
        return new ActiveDefinitionsPanelItem(
            panelItemId,
            activeDefinition,
            showSubtitle,
            this._state.showSearchResults,
            this._state.favoriteInProgressDefinitionId,
            isRecentSection
        );
    }

    public getSelectDefinitionPanelItem(): SelectDefinitionItem {
        return new SelectDefinitionItem();
    }

    private _updateLoadingStatus = (isLoading: boolean): void => {
        if (this._state.isLoadingDefinitions !== isLoading) {
            this._state.isLoadingDefinitions = isLoading;
            this.emitChanged();
        }
    }

    private _handleSelectItem = (selectedItemInformation: ItemInformation): void => {
        if (selectedItemInformation && selectedItemInformation.data && selectedItemInformation.data instanceof ActiveDefinitionsPanelItem) {
            const selectedRd: IActiveDefinitionReference = selectedItemInformation.data.getDefinition();
            if (this._state.showSearchResults) {
                let matchingRd: IActiveDefinitionReference = this._activeDefinitionReferences && this._activeDefinitionReferences.length > 0 ? this._activeDefinitionReferences.find(def => def.id === selectedRd.id) : null;
                if (!matchingRd) {
                    matchingRd = this._recentDefinitionReferences && this._recentDefinitionReferences.length > 0 ? this._recentDefinitionReferences.find(def => def.id === selectedRd.id) : null;
                }
                // If the selected Rd is not present in either Mine or Recent, then add it to the searched list
                if (!matchingRd) {
                    this._searchedDefinitions.push(selectedRd);
                }
            }
        }
    }

    private _setLastDeploymentForSearchedRd = (deployment: ReleaseDeployment): void => {
        if (deployment && this._searchedDefinitions && this._searchedDefinitions.length > 0) {
            let definitionToUpdate = this._searchedDefinitions.find(def => def.id === deployment.releaseDefinition.id);
            if (definitionToUpdate) {
                Utils_Array.removeWhere(this._searchedDefinitions, (def: IActiveDefinitionReference) => { return def.id === definitionToUpdate.id; });
                definitionToUpdate.lastDeployment = deployment;
                this._searchedDefinitions.push(definitionToUpdate);
            }
        }
    }

    private _setLastDeploymentForFavoritedRd = (deployment: ReleaseDeployment): void => {
        this._lastDeploymentForFavoritedRd = deployment;
    }

    private _clearFavoriteInProgress = (): void => {
        this._state.favoriteInProgressDefinitionId = null;
        this.emitChanged();
    }

    private _setAddToDashboardMessageState = (args: PinArgs): void => {
        if (args) {
            this._state.addToDashboardState = {
                dashboardName: args.commandArgs.dashboardName,
                dashboardId: args.commandArgs.dashboardId,
                groupId: args.commandArgs.groupId,
                widgetName: args.commandArgs.widgetData.name,
                messageType: (args.response && args.response.outcome === 0) ? MessageBarType.success : MessageBarType.error
            };
        }
        else {
            this._state.addToDashboardState = undefined;
        }
        this.emitChanged();
    }

    private _favoriteDefinitionsStore: FavoriteDefinitionsStore;
    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _state: IActiveDefinitionsStoreState;
    private _activeDefinitionsActionsHub: ActiveDefinitionsActionsHub;
    private _favoritesActionsHub: FavoritesActionsHub;
    private _itemSelectorActions: ItemSelectorActions;
    private _activeReleasesActionsHub: ActiveReleasesActionsHub;
    private _favoriteDefinitionsIds: number[];
    private _activeDefinitionReferences: IActiveDefinitionReference[] = [];
    private _recentDefinitionReferences: IActiveDefinitionReference[] = [];
    private _searchResults: IActiveDefinitionReference[] = [];
    private _recentItem: ActiveDefinitionsSectionItem;
    private _selectedPanelItemId: number;
    private _initiallyExpandRecent: boolean = false;
    private _searchedDefinitions: IActiveDefinitionReference[] = [];
    private _lastDeploymentForFavoritedRd: ReleaseDeployment;

    private static readonly _recentSectionItemId = "recent-section";
    private static readonly _activeCountForHidingRecent = 5;
}