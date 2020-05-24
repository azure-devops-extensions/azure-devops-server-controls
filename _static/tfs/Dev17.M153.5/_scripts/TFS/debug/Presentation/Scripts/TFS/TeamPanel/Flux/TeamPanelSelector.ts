import { ITeamPanelState, TeamPanelView, ITeamPanelItemsByType, ITeamPanelFilter, IAsyncState, ITeamPanelItem, IItemGroup } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelContracts";
import { TeamMember } from "VSS/WebApi/Contracts";
import { equals, ignoreCaseComparer } from "VSS/Utils/String";

export interface ITeamPanelItemView {
    item: ITeamPanelItem;
    itemType: IItemGroup;
}

export interface ITeamPanelViewState {
    activeView: TeamPanelView;
    loading: boolean;

    teamImageUrl: string;
    items: ITeamPanelItemView[];
    itemGroups: IItemGroup[];
    itemGroupsWithItems: IItemGroup[];
    admins: TeamMember[];
    members: TeamMember[];
    membersCount?: number;
    filter: ITeamPanelFilter;
    errors?: string[];
}

export function getTeamPanelViewState(state: ITeamPanelState): ITeamPanelViewState {

    const {
        activeView,
        members,
        itemsMap,
        filter,
        loadingItems,
        favoriteErrors,
        teamImageUrl
    } = state;

    const result: ITeamPanelViewState = {
        activeView,
        loading: loadingItems,
        teamImageUrl: teamImageUrl,
        items: [],
        admins: [],
        members: [],
        filter,
        itemGroups: [],
        errors: [],
        membersCount: undefined,
        itemGroupsWithItems: []
    };

    // Set members
    if (members) {
        if (members.loading) {
            result.loading = true;
        } else if (members.error) {
            result.errors.push(members.error);
        } else if (members.data) {
            members.data.sort((t1, t2) => ignoreCaseComparer(t1.identity.displayName, t2.identity.displayName))
            result.admins = members.data.filter(m => m.isTeamAdmin);
            result.members = members.data.filter(m => !m.isTeamAdmin);
            result.membersCount = members.data.length;
        }
    }

    // Set and filter items
    if (itemsMap) {
        if (Object.keys(itemsMap).some(itemTypeName => itemsMap[itemTypeName].loading)) {
            result.loading = true;
        } else {
            const itemErrors = getItemErrors(itemsMap);
            result.errors.push(...itemErrors);
            const orderedItems = getOrderedItems(itemsMap);
            result.itemGroups = getItemGroups(itemsMap);
            result.itemGroupsWithItems = result.itemGroups.filter(ig => orderedItems.some(i => i.itemType.hub === ig.hub));
            if (filter) {
                result.items = orderedItems.filter(item => filterItem(filter, item));
            } else {
                result.items = orderedItems;
            }
        }
    }

    if (favoriteErrors) {
        result.errors.push(...favoriteErrors);
    }

    return result;
}

function getItemErrors(itemsMap: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>): string[] {
    const itemTypeNames = Object.keys(itemsMap);
    const errors: string[] =
        itemTypeNames
            .reduce((prev, itemTypeName) => {
                const itemByType = itemsMap[itemTypeName];
                if (itemByType && itemByType.error) {
                    prev.push(itemByType.error);
                }
                return prev;
            }, []);

    return errors;
}

function getOrderedItems(
    itemsMap: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>
): ITeamPanelItemView[] {

    const items: ITeamPanelItemView[] = getFlatListItems(itemsMap);

    // Sort the items
    items.sort((i1, i2) => {
        const diff = i1.itemType.order - i2.itemType.order;
        // First order by Item type
        if (diff !== 0) {
            return diff;
        }

        // Then order by title
        return ignoreCaseComparer(i1.item.name, i2.item.name);
    });

    return items;

}

function getItemGroups(itemsMap: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>): IItemGroup[] {
    const itemGroups: IItemGroup[] = [];
    for (const hubName in itemsMap) {
        itemGroups.push(itemsMap[hubName].data.itemGroup);
    }

    return itemGroups;
}

function getFlatListItems(
    itemsMap: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>
): ITeamPanelItemView[] {
    const itemTypeNames = Object.keys(itemsMap);
    const items: ITeamPanelItemView[] =
        itemTypeNames
            .reduce((prev, itemTypeName) => {
                const data = itemsMap[itemTypeName] && itemsMap[itemTypeName].data;
                if (data && data.items) {
                    prev.push(...data.items.map(item => {
                        return {
                            item,
                            itemType: data.itemGroup
                        };
                    }));
                }
                return prev;
            }, []);
    return items;
}


function filterItem(
    filter: ITeamPanelFilter, item: ITeamPanelItemView
): boolean {
    const {
        itemGroup
    } = filter;

    if (itemGroup) {
        const itemTypeName = itemGroup.hub;
        if (!equals(item.itemType.hub, itemTypeName, /* ignoreCase */ true)) {
            return false;
        }
    }

    return true;
}