import Q = require("q");

import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import { IHostArtifact, IInternalLinkedArtifactDisplayData , IColumn, ILinkedArtifactSubtypeFilterConfiguration }
from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ILinkedArtifact} from "TFS/WorkItemTracking/ExtensionContracts";
/** Plugin to handle retrieving data */
export interface ILinkedArtifactsDataProvider {
    /** Tool the plugin supports e.g. git, build, workitemtracking */
    supportedTool: string;

    /** Optional: Limit the number of artifacts this data provider can return. If there are more artifacts than this limit, a warning will be shown */
    artifactLimit?: number;

    /** Required features for showing Call to Actions e.g. ["2FF0A29B-5679-44f6-8FAD-F5968AE3E32E"] */
    requiredFeaturesForActions?: string[];

    /** Called for retrieving artifact data
     * @param artifacts Raw artifacts
     * @param columns Set of columns to return data for
     * @param tfsContext The current tfs context (this can be used to generate correct href etc with the current team)
     * @param hostArtifact Optional host artifact
     * @returns Display data needed for rendering etc.
    */
    beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: IHostArtifact): IPromise<IInternalLinkedArtifactDisplayData []>;

    /** Optional method to filter artifacts, given a filter configuration */
    filter?(artifact: IInternalLinkedArtifactDisplayData , filterConfiguration: ILinkedArtifactSubtypeFilterConfiguration, hostArtifact?: IHostArtifact): boolean;
}

/**
 * Base class for data providers which utilizes the request cache
 */
export abstract class BaseDataProvider<TKey extends (number | string), TValue> implements ILinkedArtifactsDataProvider {
    protected static getErrorDisplayData(linkedArtifact: ILinkedArtifact, err: Error): IInternalLinkedArtifactDisplayData  {
        return {
            id: linkedArtifact.id,
            tool: linkedArtifact.tool,
            type: linkedArtifact.type,
            linkType: linkedArtifact.linkType,
            linkTypeDisplayName: linkedArtifact.linkTypeDisplayName,
            error: err
        };
    }

    constructor(public supportedTool: string) {
    }

    public beginGetDisplayData(
        linkedArtifacts: ILinkedArtifact[],
        columns: IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: IHostArtifact) {

        // Build dictionary of artifact id to artifact for easier lookup
        let ids: TKey[] = [];
        let idToArtifactMap: { [id: string]: ILinkedArtifact } = {};
        for (let linkedArtifact of linkedArtifacts) {
            let id = this._getArtifactId(linkedArtifact);

            // Dedupe and add
            if (!idToArtifactMap[id]) {
                idToArtifactMap[id] = linkedArtifact;
                ids.push(this._convertKey(id));
            }
        }

        return this._getData(ids, columns, tfsContext, hostArtifact, linkedArtifacts).then(resolvedArtifacts => {
            // Build lookup map for resolved artifacts
            let resolvedArtifactsMap: IDictionaryStringTo<TValue> = Utils_Array.toDictionary<TValue, TValue>(resolvedArtifacts, ra => this._getResolvedArtifactId(ra));;

            // For each of the original linked artifacts, map using the resolved artifact
            return linkedArtifacts.map(linkedArtifact => {
                let resolvedArtifact = resolvedArtifactsMap[this._getArtifactId(linkedArtifact)];
                return this._valueToDisplayData(linkedArtifact, resolvedArtifact, columns, tfsContext);
            }).filter(x => !!x);
        });
    }

    public filter(artifact: IInternalLinkedArtifactDisplayData , filterConfiguration: ILinkedArtifactSubtypeFilterConfiguration, hostArtifact?: IHostArtifact): boolean {
        return this._filter(artifact, filterConfiguration, hostArtifact);
    }

    protected abstract _convertKey(key: string): TKey;

    /**
     * Returns a promise which resolves to artifacts resolved from API
     * @param ids Ids of artifacts to resolve
     * @param columns Columns to retrieve data for
     * @param filter Optional filter configuration
     * @param tfsContext Current tfs context
     * @param hostArtifact Optional host artifact
     * @param linkedArtifacts Optional array of linked artifacts
     */
    protected abstract _getData(
        ids: TKey[], columns: IColumn[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: IHostArtifact, linkedArtifacts?: ILinkedArtifact[]): IPromise<TValue[]>;

    /**
     * Get identifier from a linked artifact
     * @param linkedArtifact Linked artifact to get id fo
     * @returns Linked artifact id
     */
    protected _getArtifactId(linkedArtifact: ILinkedArtifact): string {
        return linkedArtifact.id;
    }

    /**
     * Get identifier from resolved artifact
     * @param resolvedArtifact Resolved artifact
     * @returns Id of resolved artifact to match request and result
     */
    protected abstract _getResolvedArtifactId(resolvedArtifact: TValue): string;

    /**
     * Converts a linked artifact and a corresponding resolved artifacts to display data
     * @param linkedArtifact Linked artifact to convert 
     * @param val Resolved artifact
     * @param columns Columns requested for display data
     * @param tfsContext Tfs context of control consumer
     */
    protected abstract _valueToDisplayData(linkedArtifact: ILinkedArtifact, val: TValue, columns: IColumn[], tfsContext: TFS_Host_TfsContext.TfsContext): IInternalLinkedArtifactDisplayData ;

    /**
     * Filter the given artifacts 
     * @param resolvedArtifacts Artifacts to filter
     * @param filter Filter configuration to apply
     * @param hostArtifact Host artifact, if given
     */
    protected _filter(resolvedArtifact: IInternalLinkedArtifactDisplayData , filter: ILinkedArtifactSubtypeFilterConfiguration, hostArtifact?: IHostArtifact): boolean {
        // By default, do not filter
        return true;
    }
}