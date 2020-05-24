/// <reference types="jquery" />

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export function identityImageElement(tfsContext, identityId: string, urlParams?: any, size?: string, title?: string, alt?: string) {
    /// <param name="urlParams" type="object" optional="true" />

    if (!tfsContext) {
        tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    }

    var $img = createIdentityImageElement(size, title, alt);

    $img.attr("src", tfsContext.getIdentityImageUrl(identityId, urlParams));

    if (identityId) {
        $img.addClass("identity-" + identityId);
    }

    return $img;
}

export function identityImageElementByIdentifier(identity: TFS_OM_Identities.IIdentityReference, size?: string, title?: string, alt?: string, showGenericImage?: boolean) {
    /// <param name="urlParams" type="object" optional="true" />
    var $img = createIdentityImageElement(size, title, alt);
    //If the the user is not assigned identity or just a constant string, generic image is shown
    var imageMode = showGenericImage ? TFS_OM_Identities.IdentityImageMode.ShowGenericImage : TFS_OM_Identities.IdentityImageMode.None;

    $img.attr("src", TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(identity, imageMode));
    return $img;
}

/**
 * Helper to generate the identity image element using the specified avatar url.
 */
export function identityImageElementFromAvatarUrl(avatarUrl: string, size?: string, title?: string, alt?: string) {
    const $img = createIdentityImageElement(size, title, alt);
    $img.attr("src", avatarUrl);
    return $img;
}

function createIdentityImageElement(size?: string, title?: string, alt?: string): JQuery {
    var $img;

    $img = $(domElem("img", "identity-picture"));

    if (title) {
        $img.attr('title', title);
    }

    if (size) {
        $img.addClass(size);
    }

    if (alt) {
        $img.attr('alt', alt);
    }
    else {
        $img.attr('alt', "");
    }

    return $img;
}
