import * as Utils_String from "VSS/Utils/String";
import { WrappedException } from "VSS/WebApi/Contracts";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

export class WikiErrorNames {
    public static gitItemNotFoundException = "GitItemNotFoundException";
    public static wikiPageNotFoundException = "WikiPageNotFoundException";
    public static gitCommitDoesNotExistException = "GitCommitDoesNotExistException";
    public static wikiAncestorPageNotFoundException = "WikiAncestorPageNotFoundException";
    public static wikiPageHasConflictsException = "WikiPageHasConflictsException";
    public static wikiPageRenameSourceNotFoundException = "WikiPageRenameSourceNotFoundException";
    public static gitObjectRejectedException = "GitObjectRejectedException";
    public static wikiPageAlreadyExistsException = "WikiPageAlreadyExistsException";
    public static parentPageContentUnavailableException = "ParentPageContentUnavailableException";
    public static noValidPagesToLand = "NoValidPagesToLand";
    public static zeroPagesInWiki = "ZeroPagesInWiki";
}

export function getWikiCompareError(error: Error, pagePath: string, version: string): Error {
    const tfsError: TfsError = error;
    if (!tfsError || !tfsError.serverError) {
        return tfsError;
    }

    let errorMessage: string;
    const errorName: string = tfsError.serverError.typeKey;
    switch (tfsError.serverError.typeKey) {
        case WikiErrorNames.gitItemNotFoundException:
        case WikiErrorNames.wikiPageNotFoundException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageNotFound, pagePath);
            break;
        case WikiErrorNames.gitCommitDoesNotExistException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_VersionNotFound, version);
            break;
        default:
            break;
    }

    return errorMessage ? getError(errorName, errorMessage) : tfsError;
}

export function getWikiReadError(error: Error, pagePath: string): Error {
    const tfsError: TfsError = error;
    if (!tfsError || !tfsError.serverError) {
        return tfsError;
    }

    let errorMessage: string;
    const errorName: string = tfsError.serverError.typeKey;
    switch (tfsError.serverError.typeKey) {
        case WikiErrorNames.gitItemNotFoundException:
        case WikiErrorNames.wikiPageNotFoundException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageNotFound, pagePath);
            break;
        default:
            break;
    }

    return errorMessage ? getError(errorName, errorMessage) : tfsError;
}

export function getWikiUpdateError(error: Error, pagePath: string, originalPagePath: string = null): Error {
    const tfsError: TfsError = error;
    if (!tfsError || !tfsError.serverError) {
        return tfsError;
    }

    let errorMessage: string;
    const errorName = tfsError.serverError.typeKey;

    switch (errorName) {
        case WikiErrorNames.gitItemNotFoundException:
        case WikiErrorNames.wikiPageNotFoundException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageConflict_Deleted, pagePath);
            break;
        case WikiErrorNames.wikiAncestorPageNotFoundException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_AncestorConflicts, pagePath);
            break;
        case WikiErrorNames.wikiPageHasConflictsException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageConflict_Updated, pagePath);
            break;
        case WikiErrorNames.wikiPageRenameSourceNotFoundException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageConflict_Deleted, originalPagePath);
            break;
        case WikiErrorNames.gitObjectRejectedException:
            errorMessage = WikiResources.ErrorMessage_GitObjectRejected;
            break;
        case WikiErrorNames.wikiPageAlreadyExistsException:
            errorMessage = Utils_String.format(WikiResources.ErrorMessage_PageConflict_AlreadyAdded, pagePath);
            break;
        default:
            break;
    }

    return errorMessage ? getError(errorName, errorMessage) : tfsError;
}

function getError(errorName: string, errorMessage: string): Error {
    const newError: Error = new Error(errorMessage);
    newError.name = errorName;

    return newError;
}