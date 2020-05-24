import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import {
    ILinkedArtifactSubtypeFilterConfiguration } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

export class ArtifactFilterHelper {
    private _linkTypeRefNames: string[];
    private _filterConfiguration: IDictionaryStringTo<ILinkedArtifactSubtypeFilterConfiguration>;

    constructor(linkTypeRefNames: string[], filterConfiguration: IDictionaryStringTo<ILinkedArtifactSubtypeFilterConfiguration>) {
        this._linkTypeRefNames = linkTypeRefNames;

        if (filterConfiguration) {
            this._filterConfiguration = {};

            //
            //  Store values in the private dictionary using lower-case keys
            //  to enable case-insensitive lookups.
            //
            for (var key of Object.keys(filterConfiguration)) {
                var value = filterConfiguration[key];
                this._filterConfiguration[key.toLowerCase()] = value;
            }
        }
    }

    /**
     * Filter given artifacts with the given filter configuration
     * @param linkedArtifacts Linked artifacts to filter
     * @returns Filtered linked artifacts
     */
    public filter(linkedArtifacts: ILinkedArtifact[]): ILinkedArtifact[] {
        if (!this._linkTypeRefNames || this._linkTypeRefNames.length === 0) {
            // No filter configured, do nothing
            return linkedArtifacts;
        }

        return linkedArtifacts.filter(
            artifact => Utils_Array.contains(
                this._linkTypeRefNames,
                artifact.linkType,
                Utils_String.ignoreCaseComparer));
    }

    /**
     * Get filters which include any typename 
     * @param tool Tool to get filters for
     * @returns Configured filters for given tool
     */
    public getSubtypeFilterForDataProvider(tool: string): ILinkedArtifactSubtypeFilterConfiguration {
        var result = null;

        if (tool &&
            this._filterConfiguration) {

            //
            //  Perform key lookup using case-insensitive comparison.
            //
            tool = tool.toLowerCase();
            result = this._filterConfiguration[tool] || null;
        }

        return result;
    }
}