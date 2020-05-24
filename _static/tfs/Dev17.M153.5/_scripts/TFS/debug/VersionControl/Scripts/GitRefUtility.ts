import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { GitConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import VCContracts = require("TFS/VersionControl/Contracts");
import Utils_String = require("VSS/Utils/String");

export function getRefFriendlyName(refName: string) {
    if (refName) {
        if (refName && refName.indexOf("refs/heads/") === 0) {
            return refName.substring("refs/heads/".length);
        }
        else if (refName && refName.indexOf("refs/tags/") === 0) {
            return refName.substring("refs/tags/".length);
        }
    }
    return refName;
}

export function getFullRefNameFromBranch(branchName: string): string {
    return "refs/heads/" + branchName;
}

export function getFullRefNameFromTagName(tagName: string): string {
    return "refs/tags/" + tagName;
}

export function isRefTag(refName: string): boolean {
    return (Utils_String.startsWith(refName, GitConstants.RefsTagsPrefix));
}

export function getPRIdFromSourceBranch(sourceBranchName: string): string {
    if (sourceBranchName) {
        if (sourceBranchName.indexOf("refs/pull/") === 0) {
            let PRsourceBranch = sourceBranchName.substring("refs/pull/".length);
            let MERGE: string = "merge";
            let URISEPARATOR: string = "/";

            let PRtokens = PRsourceBranch.trim();
            let tokens: string[] = PRtokens.split(URISEPARATOR, 2);
            if (tokens.length !== 2) {
                return;
            }
            let mergeString: string = tokens[1].trim();
            if (mergeString.toUpperCase() !== MERGE.toUpperCase()) {
                return;
            }
            return tokens[0].trim();
        }
    }
    return;
}

export function versionStringToRefName(versionString: string): string {
    return specToRefName(VCSpecs.VersionSpec.parse(versionString));
}

export function specToRefName(versionSpec: VCSpecs.VersionSpec): string {
    if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
        return "refs/heads/" + (<VCSpecs.GitBranchVersionSpec>versionSpec).branchName;
    }
    else if (versionSpec instanceof VCSpecs.GitTagVersionSpec) {
        return "refs/tags/" + (<VCSpecs.GitTagVersionSpec>versionSpec).tagName;
    }
    else {
        return "";
    }
}

export function refNameToVersionSpec(refName: string): VCSpecs.IGitRefVersionSpec {
    if (refName) {
        if (refName.indexOf("refs/heads/") === 0) {
            return new VCSpecs.GitBranchVersionSpec(refName.substring("refs/heads/".length));
        }
        else if (refName.indexOf("refs/tags/") === 0) {
            return new VCSpecs.GitTagVersionSpec(refName.substring("refs/tags/".length));
        }
    }
    return null;
}

export function refNameToVersionString(refName: string): string {
    let spec = refNameToVersionSpec(refName);
    return spec ? spec.toVersionString() : "";
}

export function refNameToParts(refName: string): string[] {
    return getRefFriendlyName(refName).split('/');
}

export function compareRefs(a: VCContracts.GitRef, b: VCContracts.GitRef) {
    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
}

export function refUpdateToRef(refUpdate: VCContracts.GitRefUpdate): VCContracts.GitRef {
    return <VCContracts.GitRef>{
        name: refUpdate.name,
        objectId: refUpdate.newObjectId
    };
}

export function annotatedTagToRef(annotatedTag: VCContracts.GitAnnotatedTag): VCContracts.GitRef {
    return <VCContracts.GitRef>{
        name: annotatedTag.name,
        objectId: annotatedTag.objectId
    };
}