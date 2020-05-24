import * as Q from "q";
import { Favorite, FavoriteProvider, ArtifactScope}  from "Favorites/Contracts";
import { FavoritesDataService } from "Favorites/Controls/FavoritesDataService";
import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { FavoritesHubState} from "MyExperiences/Scenarios/Favorites/FavoritesHubStore";
import {FavoriteHubItemData} from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import * as Contributions from "VSS/Contributions/Controls";
import {HubItemGroup, IHubItem} from "MyExperiences/Scenarios/Shared/Models";
import {FavoriteHubItem, FavoriteItemHelper} from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {FavoriteAlerts} from "MyExperiences/Scenarios/Favorites/Alerts";
import {FavoritesZeroData} from "MyExperiences/Scenarios/Favorites/FavoritesZeroData";
import {FavoritesHubActionsCreator} from "MyExperiences/Scenarios/Favorites/FavoritesHubActionsCreator";
import {BaseFavoriteHubItemContribution} from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { FavoritesSettingsService } from "MyExperiences/Scenarios/Favorites/FavoritesSettingsService";
import { FavoritesContributionLoader } from "MyExperiences/Scenarios/Favorites/FavoritesContributionLoader";
import { FavoritesState } from "Favorites/Controls/FavoritesModels";
import { DefaultHubItemContributionRenderer } from "MyExperiences/Scenarios/Favorites/DefaultHubItemContributionRenderer";

export class FavoritesHubDataProvider extends FavoritesDataProvider {
    private contributionLoader: FavoritesContributionLoader;

    constructor(loader?: FavoritesContributionLoader) {
        super();
        this.contributionLoader = loader ? loader : new FavoritesContributionLoader();
    }

    /**
     * Load favorites data
     * @param state current state of favorites
     * @param mode rendering mode
     * @param actionsCreator actions creator to call toggleFavorite on
     */
    public loadFavoritesData(state: FavoritesHubState, actionsCreator: FavoritesHubActionsCreator, artifactTypes?: string[], scope?: ArtifactScope): IPromise<FavoritesHubState> {
        state.isLoading = true;
        // Load data using base
        return super.loadFavoritesData(state, actionsCreator).then((state: FavoritesHubState) => {
            if (state.isLoaded) {
                // If successfully loaded, add contributions on top
                return this.loadContributions(state, actionsCreator).then((state) => {
                    // Once contributions are loaded, the data is in presentable state
                    state.isLoading = false;
                    return state;
                });
            }
            else {
                state.isLoading = false;
                // Instead of throwing exception, hub framework asks hub state to set the alert message directly
                state.alert = FavoriteAlerts.loadFailed;
                return state;
            }
        });
    }

    private loadContributions(state: FavoritesHubState, actionsCreator: FavoritesHubActionsCreator): IPromise<FavoritesHubState> {
        return this.contributionLoader.getContributions().then((contributions) => {
            state.renderers = [];
            // Note that in case of a duplicate implementation, last one wins
            contributions.forEach((contribution) => {
            let target = <string>contribution.properties["artifactType"];
            state.renderers[target] = contribution;
            });

            // Set up existing data with contributions
            state.favoriteItems.forEach((v) => {
                v.contribution = state.renderers[v.favorite.artifactType];
            });

            // Filter the hub data with any contribution that had been removed, probably is due to feature flag
            state.favoriteItems = state.favoriteItems.filter(v => {
                return v.contribution != null;
            });

            return this.startContributions(state, actionsCreator);
        });
    }

    /**
     * Loads rendering contributions for each favorite type
     */
    private startContributions(state: FavoritesHubState, actionsCreator: FavoritesHubActionsCreator): IPromise<FavoritesHubState> {

        var defer = Q.defer<FavoritesHubState>();
        var promises: IPromise<void>[] = [];
        state.contributionsByType = {};

        state.favoriteItems.forEach((data) => {
            if (data.contribution) {
                if (!state.contributionsByType[data.contribution.id]) {
                    promises.push(Contributions.createContributedControl<BaseFavoriteHubItemContribution<FavoriteHubItem>>(
                        null,
                        data.contribution.id,
                        null, // All data is passed to contribution via control creation calls, i.e. contribution is stateless
                        null,
                        null,
                        {
                            showLoadingIndicator: false,
                            showErrorIndicator: false,
                            slowWarningDurationMs: 0
                        }

                    ).then((c) => {
                        state.contributionsByType[data.contribution.id] = c;
                        data.contributionInstance = c;
                    }));
                }
                else {
                    data.contributionInstance = state.contributionsByType[data.contribution.id];
                }
            }
        });

        Q.all(promises)
            .then(
            () => {
                this.createGroups(state, actionsCreator).then((newState) => {
                    defer.resolve(newState);
                })
            })
            .then(null,
            () => {
                state.alert = FavoriteAlerts.loadFailed;
                defer.resolve(state)
            });

        return defer.promise;
    }

    /**
     * Group data by favorite type ID
     */
    private createGroups(state: FavoritesHubState, actionsCreator: FavoritesHubActionsCreator): IPromise<FavoritesHubState> {

        var groups: HubItemGroup<IHubItem>[] = [];

        // Lookup list of groups by user facing name for that type
        // Distinct types can be presented under a unified group (e.g. TFVC & GIT Repo's)
        // CAVEAT: All items in that group must conform to a consistent columnar presentation.
        var groupsByName: IDictionaryStringTo<HubItemGroup<IHubItem>> = {};

        // Array of groups to be sorted by numeric order of the group
        var groupsByOrder: { id: string, order: number, group: HubItemGroup<IHubItem> }[] = [];

        if (state.favoriteItems) {
            state.zeroData = (state.favoriteItems.length === 0) ? FavoritesZeroData : null;
            // Construct group dictionary with items by group name (localized typename)
            state.favoriteItems.forEach((favorite) => {
                if (favorite.contribution) {
                    let groupName = favorite.contribution.properties.pluralName;

                    if (!state.contributionsByType[favorite.contribution.id]) {
                        state.contributionsByType[favorite.contribution.id] = new DefaultHubItemContributionRenderer();
                    }

                    let renderer = state.contributionsByType[favorite.contribution.id];

                    if (!groupsByName[groupName]) {

                        // If group is not set up yet, create it and add to lookup list
                        groupsByName[groupName] = new HubItemGroup<FavoriteHubItem>(
                            favorite.favorite.artifactType,
                            groupName,
                            [],
                            FavoriteItemHelper.makeColumns(renderer, actionsCreator, this, actionsCreator.getStore()) // Only doing this call once per favorite type, as they all should have columns
                        );

                        let groupOrder: number = favorite.contribution.properties.order; // Pull desired order out of contribution

                        // Add same group to the array that will be sorted 
                        groupsByOrder.push({
                            id: favorite.contribution.id,
                            group: groupsByName[groupName],
                            order: groupOrder,
                        });
                    }
                    // Push favorite into appropriate group. Apply hub enhancements that normalize the different renderers when in the list view. 
                    let favoriteHubItem = new FavoriteHubItem(favorite);
                    favoriteHubItem.iconClass = renderer.getIconClass(favorite);
                    favoriteHubItem.iconName = renderer.getIconName(favorite);
                    favoriteHubItem.displayName = renderer.getDisplayName(favorite);
                    favoriteHubItem.deletedArtifactMessage = renderer.getArtifactDeletedMessage(favorite);
                    favoriteHubItem.artifactMetaDataElement = renderer.getArtifactMetadata(favorite);
                    favoriteHubItem.iconColor = renderer.getIconColor(favorite);

                    groupsByName[groupName].items.push(favoriteHubItem);
                }
            });


            // Sort array by order that group needs
            groupsByOrder.sort((a, b) => { return a.order - b.order; });

            // Construct simple group array for return
            groups = groupsByOrder.map(favGroup => {
                // We will sort the data within the group
                var group = favGroup.group;
                var compFunc = state.contributionsByType[favGroup.id].compareItems;
                group.items.sort((a, b) => {
                    var f1 = a as FavoriteHubItem;
                    var f2 = b as FavoriteHubItem;
                    return compFunc(f1.data.favorite, f2.data.favorite);

                });
                return group;
            });
        }

        /** Set the parent data, as parent needs it for rendering */
        state.groups = groups;
        state.unfilteredGroups = groups;

        /** Retrieving group order from page data */
        let dataService = Service.getService(FavoritesSettingsService);
        let hubGroupOrderFromSettingService: IDictionaryStringTo<string> = dataService.getHubOrder(); // order (string) => id (string)
        if (hubGroupOrderFromSettingService) {
            return Q.resolve(this.reorderGroups(state, hubGroupOrderFromSettingService));
        }
    }

    /**
     * If a modified version of the hub group ordering exist, use this order instead. 
     * If the data does not exist or client has not reorderd the groups yet, the default state.groups will be returned.
     * @param state which contains the hub groups in their current ordering  
     * @param hubGroupIds dictionary of Order (string) to HubId (string)
     */
    private reorderGroups(state: FavoritesHubState, hubGroupIds: IDictionaryStringTo<string>): FavoritesHubState {
        var groupsReordered: HubItemGroup<IHubItem>[] = [];

        for (var i = 0; i < Object.keys(hubGroupIds).length; i++) {
            for (var j = 0; j < state.groups.length; j++) {
                if (hubGroupIds[i] === state.groups[j].id) {
                    groupsReordered.push(state.groups[j])
                }
            }
        }

        if (groupsReordered.length > 0) {
            /** When a new group type is favorited, it is pushed to the end of all groups */
            if (state.groups.length > groupsReordered.length) {
                state.groups.forEach((group: HubItemGroup<IHubItem>) => {
                    if (groupsReordered.indexOf(group) < 0) {
                        groupsReordered.push(group);
                    }
                })
            }

            state.groups = groupsReordered;
        }

        return state;
    }

    /**
     * Load extended data about the favorites from the server
     * @param state current state of data
     */
    public extendFavoritesData(state: FavoritesHubState, actionsCreator: FavoritesHubActionsCreator): IPromise<FavoritesHubState> {
        let favoriteDataService = Service.getService(FavoritesDataService);
        return favoriteDataService.getFavorites(null, null, null, true).then((data: Favorite[]) => {

            // Build dictionary of favorites by ID
            var ids = {};
            data.forEach((favorite) => {
                ids[favorite.id] = favorite;
            });

            for (var key in state.itemsByFavoriteId) {
                // If favorite is still present in extended data, update the control that draws it with extended data
                if (ids[key]) {
                    state.itemsByFavoriteId[key].favorite = ids[key];
                }
                // If favorite is not in extended payload, then remove the favorite item
                else {
                    state.itemsByFavoriteId[key].favorite.artifactIsDeleted = true;
                }
            }

            return this.createGroups(state, actionsCreator);
        });
    }

    /**
     * Apply filter to favorites
     * @param filter text string to filter on
     * @param state current state
     */
    public filterData(filter: string, state: FavoritesHubState): IPromise<FavoritesHubState> {
        state.isFilterInUse = filter !== "";
        state.groups = state.unfilteredGroups
            .map(group => group.filter(filter))
            .filter(group => group.items.length > 0);
        return Q.resolve<FavoritesHubState>(state);
    }



    /**
     * Override for remove favorite item from the state, which takes care of favorite groups
     * @param favoriteItemData favorite data
     * @param state current state
     */

    protected removeItem(favoriteItemData: FavoriteHubItemData, state: FavoritesHubState): FavoritesHubState {
        // Reusing base removal, which uses base state class
        state = <FavoritesHubState>super.removeItem(favoriteItemData, state);

        // Find item group (in filtered and unfiltered list) and remove it from that group
        this.removeFavoriteFromGroups(favoriteItemData, state.groups);
        this.removeFavoriteFromGroups(favoriteItemData, state.unfilteredGroups);

        return state;
    }

    /**
     * Remove a favorite item from array of item groups (removes the group if that was the last item)
     * @param favoriteItemData
     * @param groups
     */
    private removeFavoriteFromGroups(favoriteItemData: FavoriteHubItemData, groups: HubItemGroup<IHubItem>[]) {
        if (!groups) return;

        for (var groupId = 0; groupId < groups.length; groupId++) {
            if (this.removeItemFromGroup(favoriteItemData, groups[groupId])) {
                if (groups[groupId].items.length == 0) {
                    groups.splice(groupId, 1);
                }
                break; // Same favorite can only be in one group, so breaking if we already found it
            }
        }
    }

    /**
     * Remove favorite item (looked up by favorite ID) from a given group
     * @param favoriteItemData favorite data
     * @param group group of favorites
     * @returns true if item was found and deleted, false otherwise
     */
    private removeItemFromGroup(favoriteItemData: FavoriteHubItemData, group: HubItemGroup<IHubItem>): boolean {
        for (var itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
            if ((<FavoriteHubItem>group.items[itemIndex]).data.favorite.id === favoriteItemData.favorite.id) {
                group.items.splice(itemIndex, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Save a favorite to the server
     * @param favorite
     */
    public saveFavorite(favoriteItemData: FavoriteHubItemData, state: FavoritesHubState, serviceInstanceId?: string): IPromise<{ state: FavoritesState, saveFailed: boolean, exception?: any }> {
        return super.saveFavorite(favoriteItemData, state, serviceInstanceId).then((saveResult) => {
            let resultState = saveResult.state, saveFailed = saveResult.saveFailed, e = saveResult.exception;
            // saveFavorite never fails with rejection, returning saveFailed instead - so checking that and setting UI appropriately
            if (saveFailed) {
                if (e && e.indexOf("403271") > 0) {
                    state.alert = FavoriteAlerts.writeBlocked;
                } else {
                    if (favoriteItemData.favorited) {
                        state.alert = FavoriteAlerts.unfavoriteFailed;
                    }
                    else {
                        state.alert = FavoriteAlerts.favoriteFailed;
                    }
                }
            }
            return saveResult;
        });
    }

}
