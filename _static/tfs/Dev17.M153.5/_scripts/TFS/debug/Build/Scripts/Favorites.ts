import Q = require("q");

import {getDefinitionUri} from "Build.Common/Scripts/DefinitionReference";

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildContracts = require("TFS/Build/Contracts");

import Utils_Array = require("VSS/Utils/Array");

import { IdentityRef } from "VSS/WebApi/Contracts";

export interface FavoriteOwnerMapping {
    key: BuildContracts.BuildDefinitionReference;
    value: string[];
}

export interface FavoriteTeamInfo {
    name: string;
    identity: IdentityRef;
}

export interface FavoriteDefinitionInfo {
    userId: string;
    userTeams: IdentityRef[];
    favoriteOwnerIds: string[];
}

export function getFavoriteItemFromStore(definitionUri: string, favoriteStore: TFS_OM_Common.FavoriteStore): TFS_OM_Common.FavoriteItem {
    var itemFound: TFS_OM_Common.FavoriteItem = null;
    if (favoriteStore) {
        itemFound = Utils_Array.first(favoriteStore.children, (item: TFS_OM_Common.FavoriteItem) => {
            return item.data === definitionUri;
        });
    }
    return itemFound;
}

export function addFavoriteItemToStore(definition: BuildContracts.DefinitionReference, favoriteStore: TFS_OM_Common.FavoriteStore): IPromise<void> {
    var deferred = Q.defer<void>();
    var itemType = TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_BUILD_DEFINITION;
    var data: string = getDefinitionUri(definition);
    favoriteStore.beginCreateNewItem(definition.name, itemType, data,
        (item) => {
            deferred.resolve(null);
        },
        (error) => {
            deferred.reject(error);
        });

    return deferred.promise;
}

export function addDefinitionToFavoriteStore(definition: BuildContracts.DefinitionReference, favoriteStore: TFS_OM_Common.FavoriteStore): IPromise<void> {
    var deferred = Q.defer<void>();
    var itemType = TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_BUILD_DEFINITION;
    var data: string = getDefinitionUri(definition);

    favoriteStore.beginCreateNewItem(definition.name, itemType, data,
        (item) => {
            deferred.resolve(null);
        },
        (error) => {
            deferred.reject(error);
        });

    return deferred.promise;
}

export function removeFavoriteItemFromStore(favItem: TFS_OM_Common.FavoriteItem): IPromise<void> {
    var deferred = Q.defer<void>();
    favItem.beginDelete(
        (item) => {
            deferred.resolve(null);
        },
        (error) => {
            deferred.reject(error);
        });

    return deferred.promise;
}
