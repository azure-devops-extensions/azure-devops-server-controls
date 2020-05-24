import * as Utils_String from "VSS/Utils/String";
import { isAbsoluteUrl, Uri } from "VSS/Utils/Url";

import { IImageTransformer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
// tslint:disable-next-line:no-require-imports
import URI = require("Presentation/Scripts/URI");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { getFileContentUrl } from "VersionControl/Scripts/VersionControlUrls";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import {
    getGitItemPathForPage,
    getPageNameFromPath,
    isWikiAttachment,
    translateToAbsolutePath,
} from "Wiki/Scripts/Helpers";

import { Attachment } from "Wiki/Scenarios/Shared/SharedActionsHub";

export class ImageTransformer implements IImageTransformer {
    constructor(
        private _repositoryContext: GitRepositoryContext,
        private _wikiRootPath: string,
    ) { }

    public transformImage(
        src: string,
        version: string = null,
        attachmentsMap?: IDictionaryStringTo<Attachment>,
        currentPagePath: string = "",
    ): string {
        if (!src || isAbsoluteUrl(src)) {
            // Even for absolute URL, we need unescaped URL, as before making request URL will be escaped again
            try {
                src = URI.decode(src);
            } catch (e) {
                // URI is malformed, do not decode
            }

            return src;
        }

        // Decoding absoluteUri to support file names having any unicode characters
        const imagePath = URI.decode(new Uri(src).absoluteUri);
        const imageFileName = getPageNameFromPath(imagePath);

        if (attachmentsMap) {
            const attachment = attachmentsMap[imageFileName];
            if (attachment) {
                return attachment.objectUrl;
            }
        }

        const gitItemPathOfPage = getGitItemPathForPage(currentPagePath, this._wikiRootPath);
        const wikiRootDirectory = this._wikiRootPath === RepoConstants.RootPath ? this._wikiRootPath : this._wikiRootPath + RepoConstants.RootPath;
        // We consider paths starting with "/" and ".attachments" both as absolute paths, else relative
        const imageBasePath = Utils_String.startsWith(imagePath, RepoConstants.RootPath) || Utils_String.startsWith(imagePath, RepoConstants.AttachmentsFolder.substr(1))
            ? wikiRootDirectory
            : gitItemPathOfPage;
        const imageRelativePath = Utils_String.startsWith(imagePath, RepoConstants.RootPath)
            ? imagePath.substr(1)
            : imagePath;
        const absoluteImagePath: string = translateToAbsolutePath(imageBasePath, imageRelativePath);

        return getFileContentUrl(this._repositoryContext, absoluteImagePath, version, true);
    }
}
