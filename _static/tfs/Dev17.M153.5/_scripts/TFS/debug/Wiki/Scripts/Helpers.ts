import { IIconProps } from "OfficeFabric/Icon";
import * as Context from "VSS/Context";
import { isPositiveNumber } from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { isAbsoluteUrl, isExternalUrl, isSafeProtocol, Uri } from "VSS/Utils/Url";
import * as VSS from "VSS/VSS";

import * as TFS_Admin_Security_NO_REQUIRE from "Admin/Scripts/TFS.Admin.Security";
import URI = require("Presentation/Scripts/URI");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SharedSearchConstants from "SearchUI/Constants";
import {
    getWikiPagePathFromGitPath,
    removeExtensionfromPagePath,
    UrlEscapeConstants,
} from "SearchUI/Helpers/WikiHelper";
import {
    GitVersionDescriptor,
    GitVersionOptions,
    GitVersionType
} from "TFS/VersionControl/Contracts";
import { WikiPage } from "TFS/Wiki/Contracts";
import { GitConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { GitVersionControlPathUtility } from "VersionControl/Scripts/GitVersionControlPathUtility";
import {
    GitBranchVersionSpec,
    GitTagVersionSpec,
    VersionSpec,
} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { calculateGitSecuredToken } from "VersionControl/Scripts/Utils/GitSecuredUtils";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import { getBranchItemVersion, getTagItemVersion } from "VersionControl/Scripts/VersionControlUrls";
import {
    ContributionKeys,
    RepoConstants,
    WikiActionIds,
    WikiUrlParameters,
} from "Wiki/Scripts/CommonConstants";
import { PathConstants as GeneratedPathConstants, SpecialCharEncodings, SpecialChars, UrlConstants } from "Wiki/Scripts/Generated/Constants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { isImmersiveWikiEnabled } from "Wiki/Scripts/WikiFeatures";

import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

export function bowtieIcon(iconName: string): IIconProps {
    return { className: `bowtie-icon ${iconName}` };
}

export function convertToLevelOnePagePath(pagePath: string): string {
    return RepoConstants.RootPath + VersionControlPath.getFileName(pagePath);
}

export function getCurrentHub(): string {
    return isImmersiveWikiEnabled() ? ContributionKeys.ImmersiveWikiHub : ContributionKeys.WikiHub;
}

export function getPageNameFromPath(path: string): string {
    return VersionControlPath.getFileName(path);
}

export function getParentPagePath(path: string): string {
    return VersionControlPath.getContainingFolder(path, RepoConstants.RootPath);
}

export function getNewPageParentPath(path: string): string {
    if (path) {
        if (path === RepoConstants.RootPath) {
            return path;
        } else if (path[path.length - 1] === SharedSearchConstants.RepoConstants.PathSeparator) {
            return path.substr(0, path.length - 1);
        }
    }

    return getParentPagePath(path);
}

export function getNewPagePathOnMove(toPath: string = RepoConstants.RootPath, fromPath: string): string {
    if (!fromPath) {
        return null;
    }

    return VersionControlPath.combinePaths(toPath, getPageNameFromPath(fromPath));
}

/**
 * Returns true if given URLs belong to same wiki
 * Expects two URLs of same host
 * @param url1
 * @param url2
 */
export function isSameWikiOfHost(url1: string, url2: string): boolean {
    const uri1 = new URI(url1);
    const uri2 = new URI(url2);

    return Utils_String.equals(uri1.path(), uri2.path(), true);
}

/**
 * Returns the host name for current context
 * For hosted env, it will return org name, otherwise it will return collection name
 */
export function getHostName(): string {
    return Context.getPageContext().webContext.host.name;
}

/**
 * Returns the project name for current context
 */
export function getProjectName(): string {
    return Context.getPageContext().webContext.project.name;
}

/**
 * Returns true if given URL is external to wiki
 * @param url
 */
export function isUrlExternalToWiki(url: string): boolean {
    if (isExternalUrl(url)) {
        return true;
    }

    return !isSameWikiOfHost(url, window.location.href);
}

export function normalizeWikiPagePath(path: string, defaultPath?: string): string {
    if (!path) {
        return defaultPath || RepoConstants.RootPath;
    }

    path = path.replace(/[\/\\]+/g, SharedSearchConstants.RepoConstants.PathSeparator);

    path = Utils_String.startsWith(path, RepoConstants.RootPath)
        ? path
        : RepoConstants.RootPath + path;

    return path;
}

export function getGitFriendlyWikiPath(pagePath: string): string {
    for (let i = 0; i < GeneratedPathConstants.GitIllegalSpecialCharEcapes.length; i++) {
        pagePath = pagePath.replace(GeneratedPathConstants.GitIllegalSpecialChars[i],
            GeneratedPathConstants.GitIllegalSpecialCharEcapes[i]);
    }
    return pagePath.replace(UrlEscapeConstants.SpaceRegExp, SharedSearchConstants.PathConstants.Hyphen);
}

export function getPagePathForUrlCreation(pagePath: string): string {
    // As Hyphen was used for space in URL we encode '-' to '%2D'
    return pagePath.replace(UrlEscapeConstants.HyphenRegExp, UrlEscapeConstants.HyphenEncoding);
}

/**
 * Constructs and returns the server side git item path for the given page path.
 * @param pagePath - Page path
 * @param wikiRootPath - Wiki root path which is the mapped path of the wiki.
 */
export function getGitItemPathForPage(pagePath: string, wikiRootPath?: string): string {
    if (!wikiRootPath) {
        wikiRootPath = RepoConstants.RootPath;
    }

    if (!pagePath || pagePath == RepoConstants.RootPath) {
        return wikiRootPath;
    }

    pagePath = getGitFriendlyWikiPath(pagePath);

    const gitItemPath = VersionControlPath.combinePaths(wikiRootPath, pagePath);

    return gitItemPath + SharedSearchConstants.FormatConstants.MDFormat;
}

/**
 * Constructs and returns the page path for the server side git item path.
 * @param gitItemPath - Server side git item path corresponding to the page.
 * @param wikiRootPath - Wiki root path which is the mapped path of the wiki.
 */
export function getPagePathForGitItemPath(gitItemPath: string, wikiRootPath?: string): string {
    gitItemPath = removeExtensionfromPagePath(gitItemPath);

    if (!wikiRootPath) {
        return normalizeWikiPagePath(gitItemPath);
    }

    return normalizeWikiPagePath(getWikiPagePathFromGitPath(gitItemPath.substring(wikiRootPath.length)));
}

export function getDepthOfPage(pagePath: string): number {
    if (pagePath === RepoConstants.RootPath) {
        return 0;
    }

    return pagePath
        ? pagePath.split(RepoConstants.RootPath).length - 1
        : 0;
}

export function getWikiTemplatePath(templateName: string): string {
    return VersionControlPath.combinePaths(RepoConstants.TemplatesFolder, templateName);
}

export function isTopLevelPage(pagePath: string): boolean {
    return pagePath.lastIndexOf(SharedSearchConstants.RepoConstants.PathSeparator) === 0;
}

export function isPathInGivenFolder(absolutePath: string, folderPath: string): boolean {
    return (absolutePath.substr(0, folderPath.length) === folderPath);
}

export function isWikiAttachment(absolutePath: string, wikiRootPath: string, isLink: boolean = false): boolean {

    if (isPathInGivenFolder(absolutePath, VersionControlPath.combinePaths(wikiRootPath, RepoConstants.AttachmentsFolder))) {
        // If path is in attachments folder, return true.
        return true;
    } else if (isLink) {
        const fileType = Utils_String.format(".{0}", VersionControlPath.getFileExtension(absolutePath));
        return !(GeneratedPathConstants.AllowedAttachmentFileTypes.indexOf(fileType.toUpperCase()) === -1);
    }

    return false;
}

export function translateToAbsolutePath(gitItemPathOfPage: string, relativePath: string): string {
    return GitVersionControlPathUtility.combine(gitItemPathOfPage, relativePath)
}

export function validatePagePathAndTitle(parentPath: string, pageTitle: string): string {

    if (!pageTitle || !pageTitle.trim()) {
        return WikiResources.PageTitleEmpty;
    }

    pageTitle = pageTitle.trim();
    const firstChar: string = pageTitle[0];
    const lastChar: string = pageTitle[pageTitle.length - 1];
    if (firstChar === "." || lastChar === ".") {
        return WikiResources.PageTitleInvalid;
    }

    if (!GeneratedPathConstants.ResourceNameInvalidCharacters.every(character => pageTitle.indexOf(character) == -1)
        || !GeneratedPathConstants.PageNameReservedCharacters.every(character => pageTitle.indexOf(character) == -1)) {
        return WikiResources.PageTitleInvalidCharacter;
    }

    const fullPagePath: string = VersionControlPath.combinePaths(parentPath, pageTitle);
    if (fullPagePath && fullPagePath.length > GeneratedPathConstants.MaximumPagePathLength) {
        return Utils_String.format(WikiResources.PagePathTooLong, GeneratedPathConstants.MaximumPagePathLength);
    }

    return "";
}

/**
 * Since we allow special chars in the wiki page title following changes have been made
 * Past:
 * We stored " " as "-" in the git server,
 * We replaced " " as "-" while creating the links
 * Thus there were two types of page paths serverFriendly("-" instead of " ") and clientFriendly(as seen by user, " " is " ")
 * The links in wiki markdown were created by replacing " " to "-"
 * For attachments path we converted " " to "-" before storing in the server
 *
 * Present:
 * We convert :, ?, *, <, >, -, |, " chars to their html encoding before storing the server
 * Links will continue to have "-" instead of "space" to maintain backward compatibility
 * Since "-" is also allowed in page title now, while creating link, it is replaced by %2D (its html encoding)
 * Once the link is clicked we convert the path back before sending request
 * Attachment names will have %20 instead of space, and in server stored without converting space to "-"
 */


/**
 * Returns page link
 * Example: input: "abc def-efg" output: "abc-def%2Defg"
 * Example: input: "abc(defgh)(" output: "abc\(def\)\("
 * @param path - PagePath
 */
export function getLinkFromPath(path: string): string {
    // Escape spaces and hyphen in page name
    path = path.replace(UrlEscapeConstants.HyphenRegExp, SpecialCharEncodings.Hyphen)
        .replace(UrlEscapeConstants.SpaceRegExp, SpecialChars.Hyphen);
    // Escape opening and closing braces in page name
    path = path.replace(UrlEscapeConstants.OpeningBracesRegExp, UrlEscapeConstants.OpeningBracesEncoding)
        .replace(UrlEscapeConstants.ClosingBracesRegExp, UrlEscapeConstants.ClosingBracesEncoding);

    return path;
}

/**
 * Returns wiki page path that would show in url after encoding
 * Example: input: "abc def-efg" output: "abc%20def%252Defg"
 * @param path - PagePath
 */
export function getWikiPageUrlPath(path: string): string {
    path = path.replace(UrlEscapeConstants.HyphenRegExp, SpecialCharEncodings.Hyphen);
    return encodeURIComponent(path);
}

/**
 * Returns escaped string for attachment name
 * Attachment name should be escaped for markdown to show them as link
 * @param path - name of the file
 * Example: input: some file.png output: some%20file.png
 */
export function getEncodedAttachmentName(path: string): string {
    return path.replace(UrlEscapeConstants.SpaceRegExp, SpecialCharEncodings.Space);
}

export function isValidExternalProtocolLink(path: string): boolean {
    return path ? isSafeProtocol(path) : false;
}

export function getEscapedInternalWikiLink(href: string): string {
    if (isAbsoluteUrl(href) && isUrlExternalToWiki(href)) {
        return href;
    }

    // We do this to support links which still have "-" for space instead of "%20"
    return href
        .replace(UrlEscapeConstants.HyphenRegExp, UrlEscapeConstants.SpaceEncoding);
}


export function isInternalAnchorLink(href: string, currentPagePath?: string): boolean {
    if (!href) {
        return false;
    }

    const url = href.substring(1);
    const indexOfHash = href.indexOf("#");
    // It is internal anchor link (i.e., #section) if path starts with '#'
    let isInternalAnchorLink = indexOfHash === 0;

    // If href is absolute URL, and currentPagePath is provided then we look at URL to confirm whether it is internal anchor link
    if (!isInternalAnchorLink && currentPagePath) {
        try {
            const uri: Uri = Uri.parse(href);
            const isCurrentPage = uri.getQueryParam(SharedSearchConstants.WikiUrlParameters.PagePath) === currentPagePath;
            const anchor = uri.getQueryParam(WikiUrlParameters.Anchor);
            isInternalAnchorLink = isCurrentPage && !!anchor;
        } catch (e) {
            return false;
        }
    }

    return isInternalAnchorLink;
}

export function isDeepAnchorLink(path: string): boolean {
    if (!path) {
        return false;
    }

    const hashIndex = path.indexOf("#");
    const params = path.split("#");

    // It is deep anchor link (i.e., /PageName#section) if path contains '#'
    return hashIndex > 0 && !!params[0] && !!params[1];
}

export function isDragDataTypeFile(dataTransfer: DataTransfer): boolean {
    if ((dataTransfer.items && dataTransfer.items[0] && dataTransfer.items[0].kind === "file") ||
        /* IE browser dependent check */
        (dataTransfer.types[0] === "Files") ||
        /* Safari browser dependent check */
        (dataTransfer.types[0] === "public.file-url")) {
        return true;
    } else {
        return false;
    }
}

export function isDragDataTypeString(dataTransfer: DataTransfer): boolean {
    if ((dataTransfer.items && dataTransfer.items[0] && dataTransfer.items[0].kind === "string") ||
        /* IE browser dependent check */
        (dataTransfer.types[0] === "Text") ||
        /* Safari browser dependent check */
        (dataTransfer.types[0] === "public.utf8-plain-text")) {
        return true;
    } else {
        return false;
    }
}

export function localeCaseInsensitiveContains(str: string, subStr: string): boolean {
    return Boolean(str && subStr && str.toLocaleLowerCase().indexOf(subStr.toLocaleLowerCase()) >= 0);
}

export function getValueFromETag(eTag: string): string {
    // eTags are quoted. So, to get the value, we will have to remove starting and ending quotes
    return eTag.substr(1, eTag.length - 2);
}

export function getRandomId(): string {
    return Math.round(Math.random() * 100000).toString();
}

export function getDefaultUrlParameters(): UrlParameters {
    return {
        ...getDefaultQueryParameters(),
        wikiIdentifier: null,
    };
}

export function getDefaultQueryParameters(): UrlParameters {
    return {
        action: WikiActionIds.View,
        pagePath: RepoConstants.RootPath,
        anchor: null,
        latestPagePath: null,
        isPrint: false,
        isSubPage: false,
        version: null,
        view: null,
        wikiVersion: null,
        template: null,
    } as UrlParameters;
}

export function versionSpecToGitVersionDescriptor(versionSpec: VersionSpec): GitVersionDescriptor {
    if (!versionSpec) {
        return null;
    }

    const versionDescriptor: GitVersionDescriptor = {
        versionOptions: GitVersionOptions.None,
    } as GitVersionDescriptor;

    if (versionSpec instanceof GitBranchVersionSpec) {
        versionDescriptor.versionType = GitVersionType.Branch;
        versionDescriptor.version = (<GitBranchVersionSpec>versionSpec).branchName;
    } else if (versionSpec instanceof GitTagVersionSpec) {
        versionDescriptor.versionType = GitVersionType.Tag;
        versionDescriptor.version = (<GitTagVersionSpec>versionSpec).tagName;
    } else {
        return null;
    }

    return versionDescriptor;
}

export function gitVersionDescriptorToVersionSpec(versionDescriptor: GitVersionDescriptor): VersionSpec {
    if (!versionDescriptor) {
        return null;
    }

    if (versionDescriptor.versionType === GitVersionType.Branch || versionDescriptor.versionType == undefined) {
        return new GitBranchVersionSpec(versionDescriptor.version);
    } else if (versionDescriptor.versionType === GitVersionType.Tag) {
        return new GitTagVersionSpec(versionDescriptor.version);
    } else {
        // Currently we don't support 'commit' version type
        return null;
    }
}

export function versionDescriptorToString(versionDescriptor: GitVersionDescriptor): string {
    if (!versionDescriptor) {
        return null;
    }

    if (versionDescriptor.versionType === GitVersionType.Branch || versionDescriptor.versionType == undefined) {
        return getBranchItemVersion(versionDescriptor.version);
    } else if (versionDescriptor.versionType === GitVersionType.Tag) {
        return getTagItemVersion(versionDescriptor.version);
    } else {
        // Currently we don't support 'commit' version type
        return null;
    }
}

export function stringToVersionDescriptor(versionString: string): GitVersionDescriptor {
    if (!versionString) {
        return null;
    }

    const versionDescriptor: GitVersionDescriptor = {
        versionOptions: GitVersionOptions.None,
    } as GitVersionDescriptor;

    if (Utils_String.startsWith(versionString, "GB")) {
        versionDescriptor.versionType = GitVersionType.Branch;
        versionDescriptor.version = versionString.substring(2);
    } else if (Utils_String.startsWith(versionString, "GT")) {
        versionDescriptor.versionType = GitVersionType.Tag;
        versionDescriptor.version = versionString.substring(2);
    } else {
        // Currently we don't support 'commit' version type
        return null;
    }

    return versionDescriptor;
}

export function showBranchSecurityPermissions(
    tfsContext: TfsContext,
    repoId: string,
): void {

    VSS.using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: typeof TFS_Admin_Security_NO_REQUIRE) => {
        const projectGuid = tfsContext.contextData.project.id;
        const branchesSecurityManager = _TFS_Admin_Security.SecurityManager.create(GitConstants.GitSecurityNamespaceId, {
            projectGuid: projectGuid
        });
        const branchName = "";
        const branchSecurityToken = calculateGitSecuredToken(projectGuid, repoId, branchName);

        branchesSecurityManager.showPermissions(
            branchSecurityToken,
            WikiResources.WikiSecurityTitle,
            WikiResources.WikiSecurityTitle,
            tfsContext,
            "900"
        );
    });
}

export function escapeRegExp(str: string): string {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function replaceForwardSlashesToBackSlashes(str: string): string {
    return str.replace(/\//g, "\\");
}

export function isBrokenLink(href: string, wikiPageMap: IDictionaryStringTo<WikiPage>): boolean {
    if(!href || !wikiPageMap){
        return false;
    }
    
    try {
        if (this.isUrlExternalToWiki(href)) {
            // To avoid checking cross project links.
            return false;
        }
        
        const uri = URI.parse(href);
        const queryParams = URI.parseQuery(uri.query);
        const pagePath = queryParams && queryParams[UrlConstants.PagePathParam];
        const decodedPagePath = pagePath && getReadablePathFromUrlPagePath(pagePath);
        if (decodedPagePath) {
            return !wikiPageMap[decodedPagePath.toLocaleLowerCase()];
        }
    } catch (e) {
        return false;
    }
    
    return false;
}

export function getReadablePathFromUrlPagePath(path: string): string {
    return path && path.replace(UrlEscapeConstants.HyphenRegExp, SpecialChars.Space).
                    replace(UrlEscapeConstants.HyphenEncodingRegExp, SpecialChars.Hyphen);
}