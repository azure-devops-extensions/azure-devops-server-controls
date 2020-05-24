// libs
import { Store } from "VSS/Flux/Store";
import { autobind } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
// contracts
import { Build } from "Policy/Scripts/PolicyTypes";
// scenario
import { Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";

export type IBuildDefinitionMap = {
    [id: number]: Build.IBuildDefinitionSummary
};

export class BuildDefinitionStore extends Store {

    public readonly buildDefinitionsById: IBuildDefinitionMap;

    public readonly buildDefinitionsSorted: Build.IBuildDefinitionSummary[];

    public readonly noDefinitionsExist: boolean;

    public get allDefinitionsLoaded(): boolean { return this._allDefinitionsLoaded; }
    private _allDefinitionsLoaded = false;

    constructor(pageData: any) {
        super();

        this.buildDefinitionsById = {};
        this.buildDefinitionsSorted = [];

        // Build definitions for already-configured policies are included on page data island
        let initialBuildDefinitions = pageData.buildDefinitions as Build.IBuildDefinitionSummary[];

        if (initialBuildDefinitions != null) {
            // This happens when the page has no scope or repository set; the result will be a "go to branches page" view
            this.gotBuildDefinitions({ definitions: initialBuildDefinitions, setAllDefinitionsLoaded: false, });
        }

        this.noDefinitionsExist = pageData.noDefinitionsExist;

        if (this.noDefinitionsExist) {
            this._allDefinitionsLoaded = true;
        }
    }

    @autobind
    public gotBuildDefinitions(payload: Actions.GotBuildDefinitionsPayload): void {
        let shouldEmit = false;

        // Find definitions we don't already have
        let newDefinitions = payload.definitions.filter(buildDef => this.buildDefinitionsById[buildDef.id] === undefined);

        if (newDefinitions.length > 0) {
            shouldEmit = true;

            newDefinitions.forEach(buildDef => {
                this.buildDefinitionsById[buildDef.id] = buildDef;
            });

            this.buildDefinitionsSorted.push(...newDefinitions);
            this.buildDefinitionsSorted.sort(BuildDefinitionStore.compareBuildDefinitions);
        }

        if (payload.setAllDefinitionsLoaded && !this._allDefinitionsLoaded) {
            shouldEmit = true;

            this._allDefinitionsLoaded = true;
        }

        if (shouldEmit) {
            this.emitChanged();
        }
    }

    private static compareBuildDefinitions(a: Build.IBuildDefinitionSummary, b: Build.IBuildDefinitionSummary): number {
        return Utils_String.ignoreCaseComparer(a.name, b.name)
            || Utils_String.ignoreCaseComparer(a.path, b.path)
            || (a.id - b.id);
    }
}
