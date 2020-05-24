import { Action } from "VSS/Flux/Action";
import { BuildSource } from "Build/Scripts/CI/Sources/Builds";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { handleError } from "VSS/VSS";
import { GetBuildsResult, GetDefinitionsResult, IBuildFilter, IBuildFilterBase, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { Build, BuildDefinition } from "TFS/Build/Contracts";
import * as LegacyBuildActions from "Build/Scripts/Actions/Definitions";

export interface IBuildsActionCreatorProps {
    actionHub: BuildsActionHub;
    service?: BuildClientService;
}

export interface IBuildData {
    definitionId: number;
    builds: Build[];
    continuationToken?: string;
}

export interface IDefinitionFavoritePair {
    storeName: string;
    definition: BuildDefinition;
}

export class BuildsActionCreator {
    private _actionHub: BuildsActionHub;
    private _source: BuildSource;

    constructor(options: IBuildsActionCreatorProps) {
        this._actionHub = options.actionHub || new BuildsActionHub();
        this._source = new BuildSource({
            service: options.service
        });
    }

    public fetchBuilds(definitionId: number): void {
        this._source.getTopBuildsforDefinition(definitionId).then((data: GetBuildsResult) => {
            if (!!data) {
                this._actionHub.buildsAvailable.invoke({definitionId: definitionId, builds: data.builds, continuationToken: data.continuationToken});
            }
        }, handleError);
    }

    public deleteBuild(build: Build): void {
        this._source.deleteBuild(build.id).then(() => {
            this._actionHub.buildDeleted.invoke(build);
        }, handleError);
    }

    public deleteDefinition(definition: BuildDefinition, postActionCallback?: () => any): void {
        this._source.deleteDefinition(definition.id).then(() => {
            this._actionHub.definitionDeleted.invoke(definition);
            if (!!postActionCallback) {
                postActionCallback();
            }
        }, handleError);
    }

    public retainBuild(build: Build, retainState: boolean): void {
        this._source.retainBuild(build.id, retainState).then((updatedBuild: Build) => {
            this._actionHub.buildUpdated.invoke(build);
        }, handleError);
    }

    public selectDefinition(definition: BuildDefinition): void {
        this._actionHub.definitionSelected.invoke(definition);
    }

    public addDefinitionToFavorites(storeName: string, definition: BuildDefinition): void {
        this._actionHub.definitionAddedToFavorites.invoke({storeName: storeName, definition: definition});
    }

    public removeDefinitionFromFavorites(storeName: string, definition: BuildDefinition): void {
        this._actionHub.definitionRemovedFromFavorites.invoke({storeName: storeName, definition: definition});
    }
}

export class BuildsActionHub {
    private _buildsAvailable: Action<IBuildData>;
    private _buildDeleted: Action<Build>;
    private _buildUpdated: Action<Build>;
    private _definitionDeleted: Action<BuildDefinition>;
    private _definitionSelected: Action<BuildDefinition>;
    private _definitionAddedToFavorites: Action<IDefinitionFavoritePair>;
    private _definitionRemovedFromFavorites: Action<IDefinitionFavoritePair>;

    constructor() {
        this._buildsAvailable = new Action<IBuildData>();
        this._buildDeleted = new Action<Build>();
        this._buildUpdated = new Action<Build>();
        this._definitionDeleted = new Action<BuildDefinition>();
        this._definitionSelected = new Action<BuildDefinition>();
        this._definitionAddedToFavorites = new Action<IDefinitionFavoritePair>();
        this._definitionRemovedFromFavorites = new Action<IDefinitionFavoritePair>();
    }

    public get buildsAvailable(): Action<IBuildData> {
        return this._buildsAvailable;
    }

    public get buildDeleted(): Action<Build> {
        return this._buildDeleted;
    }

    public get buildUpdated(): Action<Build> {
        return this._buildUpdated;
    }

    public get definitionDeleted(): Action<BuildDefinition> {
        return this._definitionDeleted;
    }

    public get definitionSelected(): Action<BuildDefinition> {
        return this._definitionSelected;
    }

    public get definitionUpdated(): Action<LegacyBuildActions.DefinitionUpdatedPayload> {
        return LegacyBuildActions.definitionUpdated;
    }

    public get definitionAddedToFavorites(): Action<IDefinitionFavoritePair> {
        return this._definitionAddedToFavorites;
    }

    public get definitionRemovedFromFavorites(): Action<IDefinitionFavoritePair> {
        return this._definitionRemovedFromFavorites;
    }
}
