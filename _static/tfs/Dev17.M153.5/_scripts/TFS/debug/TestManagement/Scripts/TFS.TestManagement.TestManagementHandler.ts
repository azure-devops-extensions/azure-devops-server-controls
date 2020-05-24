import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Events_Action = require("VSS/Events/Action");
import Locations = require("VSS/Locations");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");

export class TestManagementArtifactHandler {

    public static beginResolve(artifactIds, options?, callback?, errorCallback?) {
        let i,
            l,
            tfsContext = (options && options.tfsContext) || TFS_Host_TfsContext.TfsContext.getDefault(),
            artifactId,
            artifacts = [],
            apiLocation,
            serverArtifacts = [],
            serverArtifactMap = {},
            mode = options && options.mode;

        function finalize() {
            callback({
                success: true,
                artifacts: artifacts
            });
        }

        for (i = 0, l = artifactIds.length; i < l; i++) {
            artifactId = artifactIds[i];

            if (mode === Artifacts_Services.ClientLinking.MODE_TRANSLATEURL && Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.TcmResultAttachment) === 0) {
                artifacts.push(new TestResultArtifact(artifactId));
            } else {
                serverArtifactMap[artifactId.uri] = artifactId;
                serverArtifacts.push(artifactId.uri);
            }
        }

        if (serverArtifacts.length) {
            apiLocation = tfsContext.getActionUrl("resolveArtifacts", "testManagement", { area: "api" });
            Ajax.postMSJSON(apiLocation, { uris: serverArtifacts },
                function (items) {
                    for (i = 0, l = items.length; i < l; i++) {
                        artifactId = serverArtifactMap[items[i].uri];
                        artifacts.push(new TestResultArtifact(artifactId, items[i].title));
                    }

                    finalize();
                }, errorCallback);
        }
        else {
            finalize();
        }
    }

    constructor() {
    }
}

export class TestResultArtifact extends Artifacts_Services.Artifact {

    public title: any;

    constructor(data, title?: string) {
        /// <param name="title" type="string" optional="true" />

        super(data);
        this.title = title;
    }

    public getTitle(): string {
        /// <returns type="string" />

        return this.title || super.getTitle();
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {

        if (Utils_String.ignoreCaseComparer(this.getType(), Artifacts_Constants.ArtifactTypeNames.TcmResultAttachment) === 0) {
            return Locations.urlHelper.getMvcUrl({
                webContext: webContext,
                action: "downloadTcmAttachment",
                controller: "testManagement",
                area: "api",
                queryParams: {
                    testResultAttachmentUri: this.getUri()
                }
            });
        }

        return super.getUrl(webContext);
    }

    public execute(tfsContext) {
        if (Utils_String.ignoreCaseComparer(this.getType(), Artifacts_Constants.ArtifactTypeNames.TcmResult) === 0) {
            let ids = this._data.id.split("."),
                testResultId: number,
                testRunId: number,
                sessionId: number,
                isAutomatedRun: boolean = false;

            if (ids.length === 2) {
                testRunId = ids[0] ? parseInt(ids[0]) : 0;
                testResultId = ids[1] ? parseInt(ids[1]) : 0;
                if (!testRunId || !testResultId) {
                    return;
                }

                let that = this;

                let runManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestRunManager>(TestsOM.TestRunManager);

                if (runManager) {
                    runManager.getTestRun(testRunId, null, (testRunAndResults) => {
                        if (testRunAndResults.testRun && testRunAndResults.testRun.isAutomated) {
                            isAutomatedRun = testRunAndResults.testRun.isAutomated;
                        }

                        that._openResultUrl(testRunId, testResultId, isAutomatedRun);
                    }, (error) => { that._openResultUrl(testRunId, testResultId, isAutomatedRun); });    //not handling error since  link will show it is deleted and also when we re-direct then error is thrown there.
                }
                else {
                    //fallback to default opening in MTM
                    that._openResultUrl(testRunId, testResultId, isAutomatedRun);
                }

            }
            else if (ids.length === 1) {
                sessionId = ids[0] ? parseInt(ids[0]) : 0;
                if (!sessionId) {
                    return;
                }

                this._openSessionUrl(sessionId);
            }
        }
        else {
            super.execute(tfsContext);
        }
    }

    private _openSessionUrl(sessionId: number) {
        let url = TestsOM.UriHelper.getTestResultUri(0, 0, sessionId, false);
        if (Utils_Url.isSafeProtocol(url)) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: url,
                target: "_self"
            });
        }
    }

    private _openResultUrl(testRunId: number, testResultId: number, isAutomated: boolean) {
        let url = TestsOM.UriHelper.getTestResultUri(testRunId, testResultId, 0, isAutomated);
        if (Utils_Url.isSafeProtocol(url)) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: url,
                target: "_blank"
            });
        }
    }
}

VSS.initClassPrototype(TestResultArtifact, {
    title: null
});