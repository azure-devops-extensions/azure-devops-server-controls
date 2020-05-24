import * as Q from "q";
import * as Service from "VSS/Service";

import {
    WikiCreateParametersV2,
    WikiType,
    WikiV2,
    WikiUpdateParameters,
} from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { GitRepository, GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { versionSpecToGitVersionDescriptor } from "Wiki/Scripts/Helpers";

export class PublishWikiSource {
    constructor(
        private _wikiHttpClient?: WikiHttpClient,
    ) {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }
    }

    public publishWiki(
        name: string,
        path: string,
        version: VersionSpec,
        repository: GitRepository,
    ): IPromise<WikiV2> {
       return this._wikiHttpClient.createWiki(
            {
                name: name,
                type: WikiType.CodeWiki,
                mappedPath: path,
                version: versionSpecToGitVersionDescriptor(version),
                projectId: repository.project.id,
                repositoryId: repository.id
            } as WikiCreateParametersV2);
    }

    public unpublishWiki(wikiId: string): IPromise<WikiV2> {
        return this._wikiHttpClient.deleteWiki(wikiId);
    }

    public publishWikiVersion(
        wikiIdentifier: string,
        project: string,
        version: VersionSpec,
    ): IPromise<WikiV2> {
        return this._updateWiki(
            wikiIdentifier,
            project,
            version,
        );
    }

    public unpublishWikiVersion(
        wikiIdentifier: string,
        project: string,
        version: VersionSpec,
    ): IPromise<WikiV2> {
        return this._updateWiki(
            wikiIdentifier,
            project,
            version,
            true,
        );
    }

    private _updateWiki(
        wikiIdentifier: string,
        project: string,
        version: VersionSpec,
        unpublishVersion?: boolean,
    ): IPromise<WikiV2> {
        const deferred = Q.defer<WikiV2>();

        this._wikiHttpClient.getWiki(
            wikiIdentifier,
            project,
        ).then(
            (wiki: WikiV2) => {
                let versions = wiki.versions;

                if (unpublishVersion) {
                    versions = versions.filter((versionDesc: GitVersionDescriptor) => {
                        return versionDesc.version !== version.toDisplayText();
                    });
                } else {
                    versions.push(versionSpecToGitVersionDescriptor(version));
                }

                // UpdateWiki is a PATCH operation. Hence whatever array of versions we send, it will update it in the Wiki resource.
                // There is no conflict resolution in this operation.
                this._wikiHttpClient.updateWiki(
                    {
                        versions: versions
                    } as WikiUpdateParameters,
                    wikiIdentifier,
                    project,
                ).then(
                    (wiki: WikiV2) => {
                        deferred.resolve(wiki);
                    },
                    (error: Error) => {
                        deferred.reject(error);
                    }
                    );
            },
            (error: Error) => {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }
}