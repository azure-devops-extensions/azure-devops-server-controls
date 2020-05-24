/// <reference types="jquery" />

import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VSS = require("VSS/VSS");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
let latestVersion: LatestVersionSpec;

export interface IVersionSpec {
    formatPath(path: string): string;
    toDisplayText(): string;
    toVersionString(): string;
}

export class VersionSpec implements IVersionSpec {

    public static parse(version: string) {
        let parts,
            dateVal,
            text,
            baseVersion,
            firstChar,
            secondChar,
            useRenameSource = false;

        // Ensure version is a string since a Changeset can be "C12345" or "12345", and "12345" might come in as a number 12345 instead.
        version = String(version || "");

        if (!version || version.toUpperCase() === "T") {
            return latestVersion;
        }
        else {
            firstChar = version.substring(0, 1).toUpperCase();
            text = version.substring(1);

            if (firstChar === "G" && text.length > 0) {
                secondChar = text.substring(0, 1).toUpperCase();
                text = text.substring(1);

                if (secondChar === "B") {
                    return new GitBranchVersionSpec(text);
                }
                else if (secondChar === "C") {
                    return new GitCommitVersionSpec(text);
                }
                else if (secondChar === "T") {
                    return new GitTagVersionSpec(text);
                }
            }
            else if (firstChar === "T") {
                baseVersion = VersionSpec.parse(text);
                if (baseVersion === latestVersion) {
                    return latestVersion;
                }
                else {
                    return new TipVersionSpec(baseVersion);
                }
            }
            else if (firstChar === "P") {
                baseVersion = VersionSpec.parse(text);
                return new PreviousVersionSpec(baseVersion);
            }
            else if (firstChar === "C") {
                return new ChangesetVersionSpec(parseInt(text, 10));
            }
            else if (firstChar === "B" && /^(\d+)$/.test(text)) {
                return new ChangeVersionSpec(parseInt(text, 10));
            }
            else if (firstChar === "M") {
                secondChar = text.substring(0, 1).toUpperCase();
                if (secondChar === "R") {
                    useRenameSource = true;
                    text = text.substring(1);
                }
                return new MergeSourceVersionSpec(parseInt(text, 10), useRenameSource);
            }
            else if (/^(\d+)$/.test(version)) {
                return new ChangesetVersionSpec(parseInt(version, 10));
            }
            else if (firstChar === "S") {
                parts = text.split(";");
                return new ShelvesetVersionSpec(parts[0], parts[1]);
            }
            else if (firstChar === "L") {
                return new LabelVersionSpec(text);
            }
            else if (firstChar === "D") {
                dateVal = Utils_Date.parseDateString(text);
                return new DateVersionSpec(dateVal);
            }

            throw new Error("Unrecognized VersionSpec format.");
        }
    }

    public static tfvcFromUri(uri: string): VersionSpec {
        let queryString = uri.split('?')[1];
        let versionType: string = null;
        let version: string = null;

        if (queryString) {
            let queryParams = queryString.split('&');
            for (let i = 0; i < queryParams.length; ++i) {
                let item = queryParams[i].split('=');
                let key = item[0];
                let value = decodeURIComponent(item[1]);
                if (key === "versionType") {
                    versionType = value;
                }
                else if (key === "version") {
                    version = value;
                }
            }
        }

        if (Utils_String.ignoreCaseComparer("shelveset", versionType) === 0) {
            return new ShelvesetVersionSpec(version);
        }
        else if (Utils_String.ignoreCaseComparer("changeset", versionType) === 0) {
            return new ChangesetVersionSpec(version);
        }

        throw new Error("No recognized VersionSpec in uri.");
    }

    public static isGitItem(itemVersion: string): boolean {
        return itemVersion && itemVersion.length > 2 && itemVersion.charAt(0) === "G" && "BCT".indexOf(itemVersion.charAt(1)) !== -1;
    }

    constructor () {
    }

    public formatPath(path: string): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.VersionSpecPathFormat, path, this.toDisplayText());
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return "VersionSpec";
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "";
    }
}

export class LatestVersionSpec extends VersionSpec {

    constructor () {
        super();
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "T";
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return VCResources.LatestVersionDisplayText;
    }
}

latestVersion = new LatestVersionSpec();

export class ChangesetVersionSpec extends VersionSpec {

    public changeset: any;

    constructor (changeset) {
        super();
        this.changeset = changeset;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "" + this.changeset;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.ChangesetVersionDisplayText, this.changeset);
    }
}

export class ChangeVersionSpec extends VersionSpec {

    public changeset: any;

    constructor (changeset) {
        super();
        this.changeset = changeset;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "B" + this.changeset;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.ChangeVersionDisplayText, this.changeset);
    }
}

export class DateVersionSpec extends VersionSpec {

    public date: any;

    constructor (date) {
        super();
        this.date = date;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "D" + this.date;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.DateVersionDisplayText, this.date);
    }
}

export class LabelVersionSpec extends VersionSpec {

    public label: any;

    constructor (label) {
        super();
        this.label = label;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "L" + this.label;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.LabelVersionDisplayText, this.label);
    }
}

export class MergeSourceVersionSpec extends VersionSpec {

    public changeset: number;
    public useRenameSource: boolean;

    constructor (changeset, useRenameSource: boolean) {
        super();
        this.changeset = changeset;
        this.useRenameSource = useRenameSource;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "M" + (this.useRenameSource ? "R" : "") + this.changeset;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.MergeSourceVersionDisplayText, this.changeset);
    }
}

export class TipVersionSpec extends VersionSpec {

    public version: any;

    constructor (versionSpec) {
        super();
        this.version = versionSpec;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "T" + this.version.toVersionString();
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.TipVersionDisplayText, this.version.toDisplayText());
    }
}

export class PreviousVersionSpec extends VersionSpec {

    public version: any;

    constructor (versionSpec) {
        super();
        this.version = versionSpec;
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "P" + this.version.toVersionString();
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.PreviousVersionDisplayText, this.version.toDisplayText());
    }
}

export class ShelvesetVersionSpec extends VersionSpec {

    public name: any;
    public owner: any;

    constructor (name: string, owner?: string) {
        super();
        /// <param name="name" type="String">shelveset name or id (name;owner)</param>
        /// <param name="owner" type="String" optional="true">owner name</param>

        let parts;

        if (owner) {
            this.name = name;
            this.owner = owner;
        }
        else {
            parts = ("" + name).split(";");
            this.name = parts[0];
            this.owner = parts[1];
        }

        if (!this.owner) {
            this.owner = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.uniqueName;
        }
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "S" + this.name + ";" + this.owner;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.ShelvesetVersionDisplayText, this.name, this.owner);
    }
}

export interface IGitRefVersionSpec extends IVersionSpec {
    toFullName(): string;
    toFriendlyName(): string;
}

export class GitBranchVersionSpec extends VersionSpec implements IGitRefVersionSpec {

    public branchName: any;

    constructor (branchName) {
        super();
        this.branchName = branchName || "";
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "GB" + this.branchName;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return this.branchName;
    }

    public toFullName(): string {
        return "refs/heads/" + this.branchName;
    }

    public toFriendlyName(): string {
        return this.branchName;
    }
}

export class GitTagVersionSpec extends VersionSpec implements IGitRefVersionSpec {

    public tagName: any;

    constructor(tagName) {
        super();
        this.tagName = tagName || "";
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "GT" + this.tagName;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.TagVersionDisplayText, this.tagName);
    }

    public toFullName(): string {
        return "refs/tags/" + this.tagName;
    }

    public toFriendlyName(): string {
        return this.tagName;
    }
}

export class GitCommitVersionSpec extends VersionSpec implements IGitRefVersionSpec {

    public commitId: any;

    constructor (commitId) {
        super();
        this.commitId = commitId || "";
    }

    public toVersionString(): string {
        /// <returns type="string" />
        return "GC" + this.commitId;
    }

    public toDisplayText(): string {
        /// <returns type="string" />
        return Utils_String.format(VCResources.CommitVersionDisplayText, this.getShortCommitId());
    }

    public toFullName(): string {
        return this.commitId;
    }

    public toFriendlyName(): string {
        return this.getShortCommitId();
    }

    public toLongDisplayText(): string {
        return Utils_String.format(VCResources.CommitVersionDisplayText, this.commitId);
    }

    public getShortCommitId(): string {
        //Should use getShortCommitId from TFS.VersionControl but would create a circular dependency, will reworked with dependency refactoring
        return this.commitId.substr(0, 8);
    }
}

export function isSameVersion(versionA: VersionSpec | string, versionB: VersionSpec | string): boolean {
    return getVersionString(versionA) === getVersionString(versionB);
}

export function getVersionString(version: VersionSpec | string): string {
    return version instanceof VersionSpec
        ? version.toVersionString()
        : version;
}

VSS.tfsModuleLoaded("TFS.VersionControl.VersionSpecs", exports);
