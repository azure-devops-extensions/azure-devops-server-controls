

import ko = require("knockout");

import DefinitionManager = require("Build/Scripts/DefinitionManager");

import BuildCommon = require("TFS/Build/Contracts");

export class DefinitionRevisionDiffModel {
    public definitionId: number;
    private _definitionManager: DefinitionManager.BuildDefinitionManager;

    /*
     * The left (older) revision
     */
    public leftRevision: KnockoutObservable<number> = ko.observable(null);

    /*
     * The right (newer) revision
     */
    public rightRevision: KnockoutObservable<number> = ko.observable(null);

    constructor(definitionManager: DefinitionManager.BuildDefinitionManager, definitionId: number, revision1: number, revision2: number) {
        this._definitionManager = definitionManager;
        this.definitionId = definitionId;

        if (revision1 && revision2) {
            if (revision1 < revision2) {
                this.leftRevision(revision1);
                this.rightRevision(revision2);
            }
            else {
                this.leftRevision(revision2);
                this.rightRevision(revision1);
            }
        }
    }

    private _beginGetDocument(revision: number): IPromise<string> {
        return this._definitionManager.getDefinition(this.definitionId, revision)
            .then((definition: BuildCommon.BuildDefinition) => {
                return JSON.stringify(definition, null, 2);
            });
    }

    /*
     * Loads the document for the left (older) revision
     */
    public beginGetLeftDocument(): IPromise<string> {
        return this._beginGetDocument(this.leftRevision());
    }

    /*
     * Loads the document for the right (newer) revision
     */
    public beginGetRightDocument(): IPromise<string> {
        return this._beginGetDocument(this.rightRevision());
    }
}
