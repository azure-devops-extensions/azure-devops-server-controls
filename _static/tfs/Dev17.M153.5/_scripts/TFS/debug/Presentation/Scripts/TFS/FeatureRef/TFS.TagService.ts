/// <reference types="jquery" />

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Diag = require("VSS/Diag");

export class TagService extends TFS_Service.TfsService {
    public static CONTROLLER_NAME: string = "Tag";
    public static ACTION_QUERY_TAG_NAMES: string = "QueryTagNames";
    public static WORK_ITEM_ARTIFACT_KIND: string = "E7626DBD-6075-416C-A31E-DFD48FE3CFDE";

    private _tagNamesCache: IDictionaryStringTo<string[]>;

    constructor() {
        /**
         * Tag Service constructor
         */
        super();

        this._tagNamesCache = {};
    }

    /**
     * Queries the server for all the tag definitions for the set of artifact kinds.
     *
     * @param artifactApplicableKinds An array of applicable artifact kinds to restrict the tags returned from the server.
     * @param projectScope Project scope: project guid in registry format string.
     * @param callback Success callback to be invoked when the tags are retrieved from the server.
     * @param errorCallback Error callback
     */
    public beginQueryTagNames(artifactApplicableKinds: string[], projectScope: string, callback: IFunctionPR<string[], any>, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsFunction(callback, "callback");
        Diag.Debug.assertParamIsArray(artifactApplicableKinds, "artifactApplicableKinds");

        var artifactKey = projectScope.toLowerCase();

        if (this._tagNamesCache.hasOwnProperty(artifactKey)) {
            Diag.logTracePoint('TagService.queryTagNamesCached.start');
            var cachedTag = this._tagNamesCache[artifactKey];
            Diag.logTracePoint('TagService.queryTagNamesCached.completed');
            callback(cachedTag);
            return;
        }

        Diag.logTracePoint('TagService.queryTagNamesRoundtrip.start');
        Ajax.getMSJSON(
            this._getApiLocation(TagService.ACTION_QUERY_TAG_NAMES),
            {
                "artifactKinds": artifactApplicableKinds,
                "projectScope": projectScope,
            },
            (tagNamesData: string[]) => {
                this._tagNamesCache[artifactKey] = tagNamesData;
                Diag.logTracePoint('TagService.queryTagNamesRoundtrip.completed');
                callback(tagNamesData);
            },
            errorCallback,
            { cache: false }
        );
    }

    /**
     * Deletes the cache associated with the given group of artifact kinds, if it exists.
     *
     * @param projectScope The tag scope.
     */
    public invalidateCacheForArtifactKinds(artifactApplicableKinds: string[], tagScope: string) {
        var artifactKey = tagScope.toLowerCase();
        if (this._tagNamesCache.hasOwnProperty(artifactKey)) {
            delete this._tagNamesCache[artifactKey];
        }
    }

    /**
     * Add new tags to the cache associated with the given group of artifact kinds, if it exists.
     */
    public addTagsToCacheForArtifactKinds(tagNames: string[], artifactApplicableKinds: string[], tagScope: string) {
        const artifactKey = tagScope.toLowerCase();
        if (this._tagNamesCache.hasOwnProperty(artifactKey)) {
            const cache = this._tagNamesCache[artifactKey];
            for (const tagName of tagNames) {
                if (cache.indexOf(tagName) === -1) {
                    cache.push(tagName);
                }
            }
        }
    }

    /**
     * Generate applicable url
     *
     * @param action Server action
     * @return
     */
    private _getApiLocation(action: string): string {
        Diag.Debug.assertParamIsString(action, "action");

        return this.getTfsContext().getActionUrl(action, TagService.CONTROLLER_NAME, { area: "api" });
    }
}
