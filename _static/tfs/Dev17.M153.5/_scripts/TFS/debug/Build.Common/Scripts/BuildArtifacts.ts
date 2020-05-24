import {BuildArtifactTitle} from "Build.Common/Scripts/Resources/TFS.Resources.Build.Common";
import {Mvc} from "Build.Common/Scripts/Linking";

import {ArtifactTypeNames, ToolNames} from "VSS/Artifacts/Constants";
import {Artifact, ClientLinking} from "VSS/Artifacts/Services";
import {WebContext} from "VSS/Common/Contracts/Platform";
import {urlHelper} from "VSS/Locations";
import {format, ignoreCaseComparer} from "VSS/Utils/String";

export class BuildArtifact extends Artifact {
    constructor(data) {
        super(data);
    }

    public getUrl(webContext: WebContext): string {
        /// <returns type="string" />
        return urlHelper.getMvcUrl({
            webContext: webContext,
            action: Mvc.DetailAction,
            controller: Mvc.Controller,
            queryParams: {
                id: this.getId()
            }
        });
    }

    public getTitle(): string {
        /// <returns type="string" />

        // Build 76
        return format(BuildArtifactTitle, this.getId());
    }
}

export class BuildArtifactResolver {
    public static beginResolve(artifactIds: Object[], options?: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Resolves the artifacts by creating necessary artifact objects</summary>
        /// <param name="artifactIds" type="Object[]">A list of artifact ids</param>
        /// <param name="options" type="Object">Options object. TFS context to be used could be found here.</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever resolution completes</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever an error occurs</param>

        var i,
            len,
            artifactId,
            artifacts = [];

        for (i = 0, len = artifactIds.length; i < len; i += 1) {
            artifactId = artifactIds[i];
            if (ignoreCaseComparer(artifactId.type, ArtifactTypeNames.Build) === 0) {
                artifacts[artifacts.length] = new BuildArtifact(artifactId);
            }
            else {
                // Falling back to default artifact
                artifacts[artifacts.length] = new Artifact(artifactId);
            }
        }

        if ($.isFunction(callback)) {
            callback({ success: true, artifacts: artifacts });
        }
    }

    constructor() {
    }
}

ClientLinking.registerArtifactResolver(ToolNames.TeamBuild, function (artifactIds, options, callback, errorCallback) {
    BuildArtifactResolver.beginResolve(artifactIds, options, callback, errorCallback);
});
