import * as Q from "q";
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import StoryboardUtils = require("Requirements/Scripts/TFS.Requirements.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");

import * as DataProvider from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ILinkedArtifact, ArtifactIconType} from "TFS/WorkItemTracking/ExtensionContracts";

export default class ExternalLinkDataProvider implements DataProvider.ILinkedArtifactsDataProvider {
    /** Tool the plugin supports e.g. git, build, workitemtracking */
    public supportedTool: string;

    /** Optional: Limit the number of artifacts this data provider can return. If there are more artifacts than this limit, a warning will be shown */
    public artifactLimit: number;

    /** Required features for showing Call to Actions e.g. ["2FF0A29B-5679-44f6-8FAD-F5968AE3E32E"] */
    public requiredFeaturesForActions: string[];

    /** Called for retrieving artifact data
     * @param artifacts Raw artifacts
     * @param tfsContext The current tfs context (this can be used to generate correct href etc with the current team)
     * @param hostArtifact The host artifact, it will be falsy when the host artifact is new (e.g. New Work Item)
     * @returns Display data needed for rendering etc.
    */
    public beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: LinkedArtifacts.IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData []> {

        var data: LinkedArtifacts.IInternalLinkedArtifactDisplayData [] = [];
        var artifactData: LinkedArtifacts.IInternalLinkedArtifactDisplayData ;
        for (var artifact of artifacts) {
            artifactData = $.extend({}, artifact);
            artifactData.primaryData = this._getPrimaryData(artifact, tfsContext);
            data.push(artifactData);
        }

        return Q(data);
    }

    private _getPrimaryData(artifact: ILinkedArtifact, tfsContext: TFS_Host_TfsContext.TfsContext): LinkedArtifacts.IInternalLinkedArtifactPrimaryData {
        var data: LinkedArtifacts.IInternalLinkedArtifactPrimaryData = {
            typeIcon: { type: ArtifactIconType.icon, title: artifact.linkTypeDisplayName, descriptor: "bowtie-link" },
            href: artifact.uri,
            title: artifact.uri
        };

        if (Utils_String.ignoreCaseComparer(artifact.tool, Artifacts_Constants.ToolNames.Hyperlink) === 0) {
            data.typeIcon.descriptor = "bowtie-link";
        }
        else if (Utils_String.ignoreCaseComparer(artifact.tool, Artifacts_Constants.ToolNames.Requirements) === 0) {
            data.typeIcon.descriptor = "bowtie-storyboard";
            data.href = artifact.id;
            data.title = artifact.id;
            
            data.callback = () => {
                var storyboardArtifact: StoryboardUtils.StoryboardArtifact = new StoryboardUtils.StoryboardArtifact(artifact);
                storyboardArtifact.execute(tfsContext.contextData);

                // Prevent Default Action on clicking the Anchor Tag in the Links Control
                return true;
            };
        }

        return data;
    }
}