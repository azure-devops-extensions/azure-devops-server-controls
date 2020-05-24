import Diag = require("VSS/Diag");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import VSS = require("VSS/VSS");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { Uri } from "VSS/Utils/Url";
import { equals } from "VSS/Utils/String";
import { IWorkItemLinkTypeEnd } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export class LinkValidator {

    protected _duplicateCache: any;

    public _workItem: any;

    constructor(options?) {
        Diag.Debug.assert(options.workItem instanceof WITOM.WorkItem, "options.workItem should be of type VSS.WIT.OM.WorkItem");

        this._workItem = options.workItem;
    }

    public isMyLinkType(link) {
        return false;
    }

    public getCacheKey(link) {
        return null;
    }

    public resetDuplicateCache() {
        this._duplicateCache = null;
    }

    public isDuplicate(key): boolean {
        /// <summary>Checks whether the link specified by the id already exists</summary>
        /// <param name="id" type="String">Id of the link to check</param>
        /// <returns type="Boolean" />
        this._ensureDuplicateCache();
        return (("" + key).toLocaleUpperCase() in this._duplicateCache);
    }

    protected _ensureDuplicateCache() {
        /// <summary>Ensures duplicate cache is populated</summary>
        if (!this._duplicateCache) {
            this._duplicateCache = this._createDuplicateCache();
        }
    }

    private _createDuplicateCache() {
        /// <summary>This method is implemented by derived objects</summary>
        let cache = {},
            i, len,
            link, key,
            links = this._workItem.getLinks();

        for (i = 0, len = links.length; i < len; i++) {
            link = links[i];
            if (this.isMyLinkType(link)) {
                key = this.getCacheKey(link);
                if (key) {
                    cache[("" + key).toLocaleUpperCase()] = true;
                }
            }
        }
        return cache;
    }
}

VSS.initClassPrototype(LinkValidator, {
    _workItem: null,
    _duplicateCache: null
});

export class HyperlinkValidator extends LinkValidator {

    constructor(options?) {
        super(options);
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.Hyperlink;
    }

    public getCacheKey(link) {
        return link.getLocation();
    }
}
export class StoryboardLinkValidator extends LinkValidator {

    private static _uncPathRegex: any = /^(\\{2})([^<>:"\/\\|?*]+)(\\)([^<>:"\/\\|?*]+[$$]?(\\)?)/i;
    private static _httpUrlRegex: any = /^((http|https):\/\/)([^<>:"\/\\|?*]+)(:(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}))?[\/\\]([^<>"\/\\|?*]+)/i;
    private static _fileUrlRegex: any = /^file:(.+)/i;

    public static SAFE_FILE_SCHEME: string = "file://///";
    public static SAFE_FILE_SCHEME_SHORT: string = "file://";

    public static isValidUncPath(path) {
        /// <summary>Regex validation to check if the provided
        /// storyboard link is a valid UNC path</summary>
        /// <param name="path">path to validate</param>
        Diag.Debug.assertIsNotNull(path, "UNC path is null");
        return this._uncPathRegex.test(path);
    }

    public static isValidHttpUrl(url) {
        /// <summary>Regex validation to check if the provided
        /// storyboard link is a valid http/https URL.</summary>
        /// <param name="url">URL address to validate</param>
        Diag.Debug.assertIsNotNull(url, "URL is null");
        return this._httpUrlRegex.test(url);
    }

    public static isValidFileUrl(url) {
        /// <summary>Regex validation to check if the provided storyboard link is a valid file: URL
        /// <param name="url">URL address to validate</param>
        Diag.Debug.assertIsNotNull(url, "URL is null");
        return this._fileUrlRegex.test(url);
    }

    public static isValidStoryboardPath(address) {
        /// <summary>Regex validation to check if the provided
        /// storyboard link is a valid UNC/ http storyboard path</summary>
        /// <param name="address">address of the storyboard</param>
        Diag.Debug.assertIsNotNull(address, "Storyboard link is null");

        return (this.isValidUncPath(address) ||
            this.isValidFileUrl(address) ||
            this.isValidHttpUrl(address));
    }

    /**
     * Normalizes a network file path (e.g. UNC or file://) to have a scheme representation
     * that plays well across multiple browsers, if useTwoSlashes is not set result will
     * start explicitly with file:///// (5 slashes).
     * @param path - Input path (could be a URL or UNC path)
     * @param useTwoSlashes - Weather or not to force two slashes in the file:// prefix.
     */
    public static normalizeNetworkFilePathToFileUrl(path: string, useTwoSlashes: boolean): string {
        Diag.Debug.assertIsNotNull(path, "path is null");

        const schemaToUse = useTwoSlashes ? this.SAFE_FILE_SCHEME_SHORT : this.SAFE_FILE_SCHEME;

        if (this.isValidUncPath(path)) {
            // Prefix with scheme and invert slashes
            path = path.replace(/^\\\\/, schemaToUse).replace(/\\/g, "/");
        } else if (this.isValidFileUrl(path)) {
            // Normalize scheme slashes. Also handle the case where users had file://{UNC path with inverted slashes)
            path = path.replace(/^file:(\/|\\)+/i, schemaToUse).replace(/\\/g, "/");
        }

        return path;
    }

    constructor(options?: any) {
        /// <summary>Storyboard link validation
        /// - currently for duplicate links</summary>
        /// <param name="options" type="object">contains the work item required to link storyboard</param>
        super(options);
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.ExternalLink;
    }

    public getCacheKey(link) {
        const artifactId = LinkingUtilities.decodeUri(link.getLinkedArtifactUri());
        if (artifactId && artifactId.type === Artifacts_Constants.ArtifactTypeNames.Storyboard &&
            artifactId.tool === Artifacts_Constants.ToolNames.Requirements) {
            return artifactId.id;
        }
        return null;
    }
}

export class ExternalLinkValidator extends LinkValidator {

    constructor(options?) {
        super(options);
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.ExternalLink;
    }

    public getCacheKey(link) {
        return link.getLinkedArtifactUri();
    }
}

export class ExternalConnectionLinkValidator extends LinkValidator {
    private readonly _pullRequestRouteKey = "pull";
    private readonly _commitRouteKey = "commit";
    private _linkTypeName: string;

    constructor(options?) {
        super(options);

        this._linkTypeName = options!.linkTypeName;
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.ExternalLink;
    }

    public getCacheKey(link) {
        return link.getLinkedArtifactUri();
    }

    public isValidPullRequestUrl(url: string): boolean {
        try {
            const uri = Uri.parse(url);

            if (uri && this._isSupportedUrlScheme(uri) && uri.path) {
                const segments = uri.path.split("/");
                if (segments.length > 3) {
                    const pullRequestKeyIndex = segments.indexOf(this._pullRequestRouteKey, 0);
                    // Check if the next index to pullrequest route key is a valid number
                    if (pullRequestKeyIndex !== -1 && segments[pullRequestKeyIndex + 1] && !isNaN(+segments[pullRequestKeyIndex + 1])) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    public isValidCommitUrl(url: string): boolean {
        try {
            const uri = Uri.parse(url);

            if (uri && this._isSupportedUrlScheme(uri) && uri.path) {
                const segments = uri.path.split("/");
                if (segments.length > 3) {
                    const routeKeyIndex = segments.indexOf(this._commitRouteKey, 0);
                    // Check if the next index to commit route key is not null
                    if (routeKeyIndex !== -1 && segments[routeKeyIndex + 1]) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    public isDuplicate(artifactUrl: string): boolean {
        if (this._workItem && this._workItem instanceof WorkItem) {
            const activeLinks = this._workItem.getLinks();
            return activeLinks && activeLinks.some(link => {
                return link.getArtifactLinkType() === this._linkTypeName &&
                    link.linkData && equals(link.linkData.FilePath, artifactUrl, true);
            });
        }

        return false;
    }

    private _isSupportedUrlScheme(uri: Uri): boolean {
        return equals(uri.scheme, "https", true) || equals(uri.scheme, "http", true);
    }
}

export class WorkItemLinkValidator extends LinkValidator {

    private _linkTypeEnd: any;
    private _parentCount: any;

    constructor(options?) {
        super(options);

        this._linkTypeEnd = options.linkTypeEnd;
        this._parentCount = 0;
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.WorkItemLink && link.getLinkTypeEnd().immutableName === this._linkTypeEnd.immutableName;
    }

    public getCacheKey(link) {
        return link.getTargetId();
    }

    public beginParentCount() {
        this._parentCount = 0;
    }

    public getParentCount() {
        return this._parentCount;
    }

    public setLinkTypeEnd(linkTypeEnd) {
        if (this._linkTypeEnd !== linkTypeEnd) {
            this._linkTypeEnd = linkTypeEnd;
            this.resetDuplicateCache();
            this.beginParentCount();
        }
    }

    public isSelf(id) {
        return this._workItem.id === id;
    }

    public isMultipleParent() {
        if (this._linkTypeEnd !== null &&
            this._linkTypeEnd.topology === "Tree" &&
            !this._linkTypeEnd.isForward) {
            this._parentCount += 1;
        }
        return this._parentCount > 1;
    }
}

export class RemoteWorkItemLinkValidator extends LinkValidator {
    private _linkTypeEnd: IWorkItemLinkTypeEnd;
    constructor(options?) {
        super(options);

        this._linkTypeEnd = options.linkTypeEnd;
    }

    public isMyLinkType(link) {
        return link instanceof WITOM.WorkItemLink && !!link.remoteHostId;
    }

    public getCacheKey(link: WITOM.WorkItemLink) {
        return `${link.remoteHostId}-${link.getTargetId()}-${link.getLinkTypeEnd().immutableName}`;
    }

    public setLinkTypeEnd(linkTypeEnd) {
        if (this._linkTypeEnd !== linkTypeEnd) {
            this._linkTypeEnd = linkTypeEnd;
            this.resetDuplicateCache();
        }
    }

    public isValidWorkItemUrl(url: string): boolean {
        try {
            const uri = Uri.parse(url);
            if (!equals(uri.scheme, "https", true)) {
                return false;
            }

            const paths = uri.path.split("/");
            if (uri.host && paths && paths.length > 0) {
                // parseInt and Number.parseInt will conver "1Foo" as 1. So we add a + to the string to check for Nan
                // Number.parseInt is not supported in IE
                if (isNaN(+paths[paths.length - 1])) {
                    return false;
                }
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    public isWorkItemFromSameHost(url: string, currentHostUrl: string): boolean {
        return url.indexOf(currentHostUrl) !== -1;
    }

    public isLinkCircular(linkTypeEnd: IWorkItemLinkTypeEnd, key: string) {
        if (linkTypeEnd.linkType.isDirectional) {
            this._ensureDuplicateCache();
            return (key.toLocaleUpperCase() in this._duplicateCache);
        }
        return false;
    }
}
