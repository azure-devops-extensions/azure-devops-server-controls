import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import * as Utils_String from "VSS/Utils/String";

// {projectId}/{wikiId}/{wikiPagePath}
export const ToolSpecificRefIdFormat: string = "{0}/{1}/{2}";
export const Tool: string = Artifacts_Constants.ToolNames.Wiki;
export const Type: string = Artifacts_Constants.ArtifactTypeNames.WikiPage;

export function getWikiPageArtifactId(projectGuid: string, wikiId: string, wikiPagePath: string): string {
    if (projectGuid && wikiId && wikiPagePath) {
        wikiPagePath = wikiPagePath.charAt(0) === '/' ? wikiPagePath.substring(1) : wikiPagePath;
        return Utils_String.format(ToolSpecificRefIdFormat, projectGuid, wikiId, wikiPagePath);
    }

    return "";
}

export function getProjectIdFromArtifactId(id: string): string {
    let projectGuid = "";
    if (id) {
        const parts = id.split('/');
        if (parts.length >= 3) {
            projectGuid = parts[0];
        }
    }
     
    return projectGuid;
}

export function getWikiIdFromArtifactId(id: string): string {
    let wikiId = "";
    if (id) {
        const parts = id.split('/');
        if (parts.length >= 3) {
            wikiId = parts[1];
        }
    }

    return wikiId;
}

export function getWikiPagePathFromArtifactId(id: string): string {
    let pagePath = "";
    if (id) {
        const pagePathStartIndex: number = id.split('/', 2).join('/').length;
        pagePath = id.substring(pagePathStartIndex);
    }

    return pagePath;
}

export function getWikiPageArtifactUri(id: string): string {
    if (id) {
        return LinkingUtilities.encodeUri({
            id: id,
            tool: Tool,
            type: Type,
        });
    }

    return "";
}
