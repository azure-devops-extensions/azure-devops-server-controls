import { IContextIdentity } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";

import Utils_String = require("VSS/Utils/String");

/**
* Compare a searchCriteria user string with IContextIdentity user.
* Currently ignoring the IContextIdentity.id and IContextIdentity.uniqueName since we donot support them.
* @param searchCriteriaUser
* @param tfsContextUser
*/
export function compareUser(searchCriteriaUser: string, tfsContextUser: IContextIdentity): boolean {
    if (searchCriteriaUser == null || tfsContextUser == null) {
        return false;
    }
    searchCriteriaUser = searchCriteriaUser.trim();
    if (searchCriteriaUser === Utils_String.empty) {
        return false;
    }

    const searchedIdentity = _parseIdentity(searchCriteriaUser);
    const searchedIdentityName = searchedIdentity.displayName;
    const searchedIdentityemail = searchedIdentity.alias;

    if (searchedIdentityemail !== Utils_String.empty && searchedIdentityName !== Utils_String.empty) {
        //Match both mail and name in full.
        return (Utils_String.localeIgnoreCaseComparer(searchedIdentityemail, tfsContextUser.email) === 0) &&
            (Utils_String.localeIgnoreCaseComparer(searchedIdentityName, tfsContextUser.displayName) === 0);
    }
    else if (searchedIdentityName !== Utils_String.empty) {
        //Match either my name or mail or alias(unique name without domain) fully.
        return (Utils_String.localeIgnoreCaseComparer(searchedIdentityName, tfsContextUser.displayName) === 0) ||
            (Utils_String.localeIgnoreCaseComparer(searchedIdentityName, tfsContextUser.email) === 0) ||
            (Utils_String.localeIgnoreCaseComparer(searchedIdentityName, tfsContextUser.email.substring(0, tfsContextUser.email.indexOf('@'))) === 0);
    }
    else if (searchedIdentityemail !== Utils_String.empty) {
        //Match my email fully.
        return (Utils_String.localeIgnoreCaseComparer(searchedIdentityName, tfsContextUser.email) === 0);
    }
    return false;
}

export interface TfsAuthorIdentity {
    displayName: string;
    alias: string;
}

export function getAuthorfromTFSIdentity(tfsAuthorIdentity: TfsAuthorIdentity): string {
    let authorString = (
        (tfsAuthorIdentity.displayName ? tfsAuthorIdentity.displayName : "") +
        (tfsAuthorIdentity.alias
            ? " " + IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START
                + tfsAuthorIdentity.alias + IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END
            : ""));
    authorString = authorString ? authorString : null;
    return authorString;
}

export function getTFSIdentityfromAuthor(author: string): TfsAuthorIdentity{
    const tfsAuthor: TfsAuthorIdentity = {
        displayName: null,
        alias: null,
    };
    if (!author) {
        return tfsAuthor;
    }
    author = author.trim();
    if (author === Utils_String.empty) {
        return tfsAuthor;
    }

    //Parse 
    const parsedAuthor = _parseIdentity(author);
    if (parsedAuthor.displayName !== Utils_String.empty) {
        tfsAuthor.displayName = parsedAuthor.displayName;
    }
    if (parsedAuthor.alias !== Utils_String.empty) {
        tfsAuthor.alias = parsedAuthor.alias;
    }
    return tfsAuthor;
}

function _parseIdentity(author: string): TfsAuthorIdentity {
    let emailStart = author.indexOf(IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START);
    emailStart = (emailStart === -1) ? author.length : emailStart;
    let emailEnd = author.lastIndexOf(IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
    emailEnd = (emailEnd === -1) ? author.length : emailEnd;

    const alias: string = author.substring(emailStart + 1, emailEnd).trim();
    const displayName: string = author.substring(0, emailStart).trim();
    return {
        displayName: displayName,
        alias: alias,
    }
}