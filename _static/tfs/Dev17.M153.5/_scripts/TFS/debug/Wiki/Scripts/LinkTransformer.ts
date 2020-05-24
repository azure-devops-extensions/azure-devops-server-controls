import * as React from "react";

import { UserContentAnchorHelper } from "ContentRendering/Markdown";
import { LazyHeadersPlugin, AnchoredHeadersPlugin } from "ContentRendering/MarkdownItPlugins";
import * as Utils_String from "VSS/Utils/String";
import { isAbsoluteUrl } from "VSS/Utils/Url";
import { format } from "VSS/Utils/String";

import { ILinkTransformer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
// tslint:disable-next-line:no-require-imports
import URI = require("Presentation/Scripts/URI");
import * as SharedSearchConstants from "SearchUI/Constants";
import { removeExtensionfromPagePath, UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";
import { WikiPage } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { combinePaths, getFileExtension } from "VersionControl/Scripts/VersionControlPath";
import { getFileContentUrl } from "VersionControl/Scripts/VersionControlUrls";
import { RepoConstants, TemplateConstants, WikiMarkdownConstants } from "Wiki/Scripts/CommonConstants";
import {
    getEscapedInternalWikiLink,
    getGitItemPathForPage,
    isDeepAnchorLink,
    isInternalAnchorLink,
    isPathInGivenFolder,
    isUrlExternalToWiki,
    isValidExternalProtocolLink,
    isWikiAttachment,
    translateToAbsolutePath,
    isBrokenLink,
} from "Wiki/Scripts/Helpers";
import {
    getExternalWikiHubPageViewUrl,
    getWikiPageViewUrl,
    linkOnClickEventHelper,
    redirectToUrl,
} from "Wiki/Scripts/WikiUrls";

import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { SpecialChars } from "Wiki/Scripts/Generated/Constants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

export class LinkTransformer implements ILinkTransformer {
    constructor(
        private _repositoryContext: GitRepositoryContext,
        private _wikiRootPath: string,
        private _isHostedOutsideWikiHub?: boolean,
    ) { }

    /**
     * Function to scroll to internal sections in a wiki page
     * @param anchor - section name where we want to scroll to
     * @returns true for unhandled anchors to allow default handler; false for anchor scroll handled here to stop default handler
     */
    public static scrollToAnchor(anchor: string): boolean {
        if (anchor) {
            // '+' in anchor name gets replaced with space while generating URL. Replacing space with '+' so that it gets encoded correctly.
            anchor = anchor.replace(' ', '+');
            // Find element on page with the adjusted ID or given ID
            const encodedAnchor: string = encodeURIComponent(anchor);
            const elementId: string = UserContentAnchorHelper.convertAnchorName(encodedAnchor);
            const element: HTMLElement = document.getElementById(elementId) || document.getElementById(encodedAnchor);
            if (element) {
                // scrollIntoView is supported by all supported browsers
                element.scrollIntoView();
                return false;
            }
        }

        return true;
    }

    /**
     * Function to enable XHR navigation for wiki page link click
     * @param event - event object
     * @returns true for external links to navigate by default; false for wiki page links to stop default navigation
     */
    public handleWikiLinkClick(event: React.MouseEvent<HTMLAnchorElement>): boolean {
        if (!event) {
            return true;
        }

        let href = event.currentTarget.href;
        if (isUrlExternalToWiki(href)) {
            return true;
        }

        return linkOnClickEventHelper(event, () => redirectToUrl(href));
    }

    /**
     * Function to transform links in Markdown page renderer
     * @param {string} href - link to be transformed
     * @returns transformed link
     */
    public transformLink(href: string, wikiIdentifier?: string, currentPagePath: string = "", currentWikiPagesMap?: IDictionaryStringTo<WikiPage>): string {
        if (isAbsoluteUrl(href) || isValidExternalProtocolLink(href) || isInternalAnchorLink(href)) {
            return href;
        }

        const linkParts: string[] = href.split("#");
        let pathInLink: string = linkParts[0];
        const anchorInLink: string = linkParts[1];

        const absoluteCurrentPagePath = removeExtensionfromPagePath(getGitItemPathForPage(currentPagePath, this._wikiRootPath));
        const wikiRootDirectory = this._wikiRootPath === RepoConstants.RootPath ? this._wikiRootPath : this._wikiRootPath + RepoConstants.RootPath;
        // We consider paths starting with "/" and ".attachments" both as absolute paths, else relative
        const linkBasePath = Utils_String.startsWith(pathInLink, RepoConstants.RootPath) || Utils_String.startsWith(pathInLink, RepoConstants.AttachmentsFolder.substr(1))
            ? wikiRootDirectory
            : absoluteCurrentPagePath;

        /*
         * 1. Here we handle links which are downloaded
         * Eg.
         * - /WikiMappedPath/.attachments/image.docx
         * - /WikiMappedPath/.attachments/README.md
         * - /SomePathOutsideWiki/README.md
         * - /SomePathOutsideWiki/README
         */
        let attachmentRelativePath = pathInLink && pathInLink.charAt(0) === RepoConstants.RootPath ? pathInLink.substr(1) : pathInLink;
        let attachmentAbsolutePath = translateToAbsolutePath(linkBasePath, attachmentRelativePath);
        let fileExtension = getFileExtension(attachmentAbsolutePath);
        let formattedFileType = Utils_String.format(".{0}", fileExtension);
        let isMDFileAttachment = formattedFileType && formattedFileType.toLowerCase() === SharedSearchConstants.FormatConstants.MDFormat;
        let isLinkOutsideWiki = !Utils_String.startsWith(attachmentAbsolutePath, wikiRootDirectory);

        if (isMDFileAttachment) {
            /* 
             * MD file links are treated specially.
             * 1. MD link for a page in the attachments folder or templates folder should be downloaded
             * 2. MD link for a page outside the Wiki should be downloaded
             * 3. MD link for a page inside the Wiki should be navigated to
             */

            const isMDFileInsideReservedFolders = isPathInGivenFolder(attachmentAbsolutePath, combinePaths(this._wikiRootPath, RepoConstants.AttachmentsFolder))
                || isPathInGivenFolder(attachmentAbsolutePath, combinePaths(this._wikiRootPath, TemplateConstants.TemplateDirectory));
            const isMDFileOutsideWiki = isLinkOutsideWiki;

            if (isMDFileInsideReservedFolders || isMDFileOutsideWiki) {
                return this._getAttachmentFileContentUrl(attachmentAbsolutePath);
            }

        } else if (isWikiAttachment(attachmentAbsolutePath, this._wikiRootPath, true)) {
            // We handle other attachments here
            return this._getAttachmentFileContentUrl(attachmentAbsolutePath);
        } else if (!fileExtension && isLinkOutsideWiki) {
            // We assume links without extensions to point to MD pages only. Eg /parentPage/ChildPage
            // So, if we have such a link pointing to outside wiki, we try to download it
            return this._getAttachmentFileContentUrl(attachmentAbsolutePath + SharedSearchConstants.FormatConstants.MDFormat);
        }

        /*
         * 2. Here we handle links pointing to pages inside the wiki, to which we can navigate
         * Eg.
         * - /ParentPage/ChildPage
         * - /ParentPage/ChildPage.md
         */

        // Make links case insensitive, if there is a page with same name, but different case, link should point to that page
        pathInLink = currentWikiPagesMap && currentWikiPagesMap[pathInLink.toLocaleLowerCase()]
            ? currentWikiPagesMap[pathInLink.toLocaleLowerCase()].path
            : pathInLink;

        // Update URL parameters 'pagePath' and 'anchor'
        const urlParams: UrlParameters = {};
        let relativePagePath = pathInLink && pathInLink.charAt(0) === RepoConstants.RootPath ? pathInLink.substr(1) : pathInLink;
        let absolutePagePath = translateToAbsolutePath(linkBasePath, relativePagePath);

        // Getting absolute path of the page inside the Wiki
        absolutePagePath = this._wikiRootPath !== RepoConstants.RootPath ? absolutePagePath.substr(this._wikiRootPath.length) : absolutePagePath;

        // Removing extension
        absolutePagePath = removeExtensionfromPagePath(absolutePagePath);

        // Decode page path from the link since we encode certain characters for supporting those in page names
        let decodedPagepath: string;
        const escapedWikiLink = getEscapedInternalWikiLink(absolutePagePath);
        try {
            decodedPagepath = URI.decode(escapedWikiLink);
        } catch (e) {
            decodedPagepath = escapedWikiLink;
        }

        urlParams.pagePath = decodedPagepath;

        if (anchorInLink && isDeepAnchorLink(href)) {
            try {
                urlParams.anchor = URI.decode(anchorInLink.toLowerCase());
            } catch (e) {
                urlParams.anchor = anchorInLink.toLowerCase();
            }
        }

        // If link transformer is used for render outside wiki hub, use external facing URL
        if (this._isHostedOutsideWikiHub) {
            return getExternalWikiHubPageViewUrl(wikiIdentifier, urlParams);
        }

        return getWikiPageViewUrl(urlParams);
    }

    /**
     * Transforms style on links for broken-links.
     * @param href 
     * @param wikiPageMap 
     * @param className 
     */
    public transformLinkStyle(href: string, wikiPageMap: IDictionaryStringTo<WikiPage>, className?: string): string[] {
        // Ignore shareHeaderAnchor links
        if (className && className.split(" ").indexOf(AnchoredHeadersPlugin.shareHeaderAnchorClassName) >= 0) {
            return [];
        }

        if(isBrokenLink(href, wikiPageMap)) {
            return [ WikiMarkdownConstants.WikiBrokenLinkClass ];
        }

        return [];
    }

    /**
     * Provides custom title for a href token.
     * @param token 
     */
    public linkCustomTitleProvider(token: any): string {
        const style: string = token.attrGet("class");
        if (!style) {
            return "";
        }

        const classes = style.split(SpecialChars.Space);
        if (classes.indexOf(WikiMarkdownConstants.WikiBrokenLinkClass) != -1) {
            return format(WikiResources.Error_PageNotFound, "");
        }

        return "";
    }

    private _getAttachmentFileContentUrl(attachmentAbsolutePath: string): string {
        try {
            attachmentAbsolutePath = URI.decode(attachmentAbsolutePath);
        } catch (e) {
            // attachmentAbsolutePath malformed, do not decode
        }

        // Generate file content link for the attachment file
        if (this._repositoryContext) {
            return getFileContentUrl(this._repositoryContext, attachmentAbsolutePath, null, true);
        }

        return null;
    }
}
