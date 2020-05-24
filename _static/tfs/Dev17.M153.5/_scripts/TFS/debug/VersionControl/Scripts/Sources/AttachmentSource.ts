import Q = require("q");

import Git_Client = require("TFS/VersionControl/GitRestClient");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { Attachment } from "TFS/VersionControl/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import ReactSource = require("VersionControl/Scripts/Sources/Source");
import {DiscussionAttachment} from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Performance = require("VSS/Performance");
import { IAttachmentSource } from "VersionControl/Scripts/Sources/IAttachmentSource";

export class AttachmentSource extends ReactSource.CachedSource implements IAttachmentSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _gitRestClient: Git_Client.GitHttpClient;
    private _repositoryId: string;
    private _projectId: string;
    private _tfsContext: TfsContext;
    private _pullRequestId: number;

    // we could put these in the constructor, or provide them as arguments to our methods
    // depending on whether they are static or not
    constructor(projectId: string, repositoryId: string, tfsContext: TfsContext, pullRequestId: number) {
        super(AttachmentSource.DATA_ISLAND_PROVIDER_ID, AttachmentSource.DATA_ISLAND_CACHE_PREFIX);
        this._repositoryId = repositoryId;
        this._projectId = projectId;
        this._tfsContext = tfsContext;
        this._pullRequestId = pullRequestId;

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
    }

    public queryAttachmentsAsync(): IPromise<IDictionaryStringTo<DiscussionAttachment>> {
        const scenario = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_VIEW_LOAD_ATTACHMENTS_FEATURE);

        scenario.addData({
            pullRequestId: this._pullRequestId
        });

        // check for cached value before going to REST
        const cached = this.fromCache<Attachment[]>("DiscussionAttachments." + this._pullRequestId);

        if (cached) {
            scenario.addData({ cached: true });
            scenario.end();
            return Q<IDictionaryStringTo<DiscussionAttachment>>(this._convertAttachments(cached));
        }

        const this_ = this;

        const deferred = Q.defer<IDictionaryStringTo<DiscussionAttachment>>();

        this._gitRestClient.getAttachments(this._repositoryId, this._pullRequestId, this._projectId)
            .then(attachments => {
                deferred.resolve(this._convertAttachments(attachments));
            });

        return deferred.promise;
    }

    public createAttachment(content: File, fileName: string): IPromise<Attachment> {
        return this._gitRestClient.createAttachment(content, fileName, this._repositoryId, this._pullRequestId, this._projectId);
    }

    private _convertAttachments(serverAttachments: Attachment[]) {
        const attachmentMap: IDictionaryStringTo<DiscussionAttachment> = {};
        for (const serverAttachment of serverAttachments) {
            const convertedAttachment = this._convertAttachment(serverAttachment);
            attachmentMap[serverAttachment.displayName] = convertedAttachment;
        }
        return attachmentMap;
    }

    private _convertAttachment(serverAttachment: Attachment): DiscussionAttachment {
        return {
            fileName: serverAttachment.displayName,
            url: serverAttachment.url,
            uploadFinished: true
        }
    }
}