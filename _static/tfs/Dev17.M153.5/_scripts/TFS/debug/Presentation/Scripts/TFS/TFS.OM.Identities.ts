import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Locations = require("VSS/Locations");

export interface IIdentityReference {
    id: string;
    displayName: string;
    uniqueName: string;
    isContainer?: boolean;
    isTfsGroup?: boolean;
    // whether or not to show generic image in identity controls if its an unresolved identity
    showGenericImage?: boolean;
    // whether or not the identity is an AAD backed identity or not
    isAadIdentity?: boolean;
}

/** Wire format for representing a TeamFoundationIdentity.
 *  Keep in sync with: /Tfs/Service/WebAccess/Server/Serializers/JsonExtensions.cs -> ToJson(TeamFoundationIdentity)  */
export interface ITeamFoundationIdentityData {
    /** GUID assigned within TFS - unique within a host.*/
    id: string;

    /** Can this identity contain identities (i.e., is it a group)?*/
    isContainer: boolean;

    /** Is this identity "current" with the provider (i.e. either read from source or being synced)?
     *  This does not mean that it is a member of TFS Valid Users group - the "IsMember" query should be used to answer that. */
    isActive: boolean

    /** Full name of the identity for display purposes.
     *  Can come from the identity provider, or may have been set as a custom display name within TFS. */
    displayName: string;

    customDisplayName: string;
    providerDisplayName: string;
    uniqueName: string;
    email: string;
}

export enum IdentityFilter {
    All = 0,
    Users = 1,
    Groups = 2
}

export enum IdentityImageMode {
    None = 0,
    ShowGenericImage = 1
}

export enum IdentitySearchFactor {
    AccountName = 0,
    DisplayName = 1,
    AdministratorsGroup = 2,
    Identifier = 3,
    MailAddress = 4,
    General = 5,
    Alias = 6
}

export enum IdentityImageSize {
    Small = 0,
    Medium = 1,
    Large = 2
}

export class IdentityHelper {
    public static IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START = "<";
    public static IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END = ">";
    public static AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START = "<<";
    public static AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END = ">>";
    public static TFS_GROUP_PREFIX = "id:";
    public static AAD_IDENTITY_USER_PREFIX = "user:";
    public static AAD_IDENTITY_GROUP_PREFIX = "group:";
    public static IDENTITY_UNIQUENAME_SEPARATOR = "\\";
    public static DESCRIPTOR_PREFIX = "desc:";

    public static preProcessIdentities(identities: IIdentityReference[], isMruItem: boolean = false) {
        $.each(identities, (i, identity) => {
            identity.isTfsGroup = IdentityHelper.isTfsGroup(identity);
        });
    }

    public static getIdentityImageUrl(item: IIdentityReference, imageMode: IdentityImageMode = IdentityImageMode.None, size?: IdentityImageSize): string {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        if (item.isAadIdentity) {
            return tfsContext.getActionUrl("GetAadUserThumbnail", "identity", { project: "", team: "", area: "api", userObjectId: item.id } as TFS_Host_TfsContext.IRouteData);
        }
        else {
            if (size === undefined || size === null) {
                size = IdentityImageSize.Medium;
            }
            if (item.id) {
                return tfsContext.getIdentityImageUrl(item.id, {size: size});
            }
            else if (item.uniqueName) {
                return tfsContext.getIdentityImageUrl("", { identifier: item.uniqueName, resolveAmbiguous: false, identifierType: IdentitySearchFactor.AccountName, size: size});
            }
            else if (item.isContainer) {
                return tfsContext.getIdentityImageUrl("", { identifier: item.displayName, resolveAmbiguous: false, identifierType: IdentitySearchFactor.General, size: size });
            }
            else if (imageMode === IdentityImageMode.ShowGenericImage) {
                return tfsContext.configuration.getResourcesFile('notassigned-user.svg');
            }
        }

        return "";
    }

    /**
     * Gets the URL to for the Identity Image
     * @param identity Identity
     */
    public static getIdentityImageUrlByIdentity(identity: IIdentityReference): string {
        if (identity) {
            return IdentityHelper.getIdentityImageUrl(
                identity, IdentityImageMode.ShowGenericImage, IdentityImageSize.Small);
        }

        return Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg");
    }

    /**
     * Parse a distinct display name string into an identity reference object
     * 
     * @param name A distinct display name for an identity
     */
    public static parseUniquefiedIdentityName(origName: string): IIdentityReference {
        if (!origName) { return null; }

        var i = origName.lastIndexOf(IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START);
        var j = origName.lastIndexOf(IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        var isContainer: boolean = false;
        var isTfsGroup: boolean = false;
        var isAad: boolean = false;
        var name = origName;
        if (i >= 0 && j > i) {
            isAad = true;
            // replace "<<" with "<" and ">>" with ">" in case of an AAD identity string representation to make further processing easier
            name = name.replace(IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START)
                .replace(IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END, IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        }

        i = name.lastIndexOf(IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START);
        j = name.lastIndexOf(IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        var displayName = name;
        var alias = "";
        var rightPart = "";
        let descriptor = "";
        var id = "";
        if (i >= 0 && j > i) {
            displayName = $.trim(name.substr(0, i));
            if (isAad) {
                // if its an AAD identity, the string would be in format - name <<object id>>
                id = $.trim(name.substr(i + 1, j - i - 1));  // this would be in format objectid\email

                if (id.indexOf(IdentityHelper.AAD_IDENTITY_USER_PREFIX) === 0) {
                    id = id.substr(IdentityHelper.AAD_IDENTITY_USER_PREFIX.length);
                }
                else if (id.indexOf(IdentityHelper.AAD_IDENTITY_GROUP_PREFIX) === 0) {
                    isContainer = true;
                    id = id.substr(IdentityHelper.AAD_IDENTITY_GROUP_PREFIX.length);
                }

                var ii = id.lastIndexOf("\\");
                if (ii > 0) {
                    rightPart = $.trim(id.substr(ii + 1));
                    if (rightPart.indexOf("@") !== -1) {
                        // if its a valid alias
                        alias = rightPart;
                        id = $.trim(id.substr(0, ii));
                    }
                    else {
                        // if its not a valid alias, treat it as a non-identity string
                        displayName = origName;
                        id = "";
                        isAad = false;
                        isContainer = false;
                    }
                }
            }
            else {
                rightPart = $.trim(name.substr(i + 1, j - i - 1)); //gets string in the <>
                var vsIdFromAlias: string = IdentityHelper.getVsIdFromGroupUniqueName(rightPart); // if it has vsid in unique name (for TFS groups)
                descriptor = IdentityHelper.getDescriptorFromUniqueName(rightPart);
                if (rightPart.indexOf("@") !== -1 || rightPart.indexOf("\\") !== -1 || rightPart.indexOf(IdentityHelper.DESCRIPTOR_PREFIX) !== -1 || vsIdFromAlias || Utils_String.isGuid(rightPart)) {
                    // if its a valid alias
                    alias = rightPart;

                    // If the alias component is just a guid then this is not a uniqueName but
                    // vsId which is used only for TFS groups
                    if (vsIdFromAlias != "") {
                        id = vsIdFromAlias;
                        isContainer = true;
                        isTfsGroup = true;
                        alias = "";
                    }
                }
                else {
                    // if its not a valid alias, treat it as a non-identity string
                    displayName = origName;
                }
            }
        }
        return {
            id: id,
            displayName: displayName,
            uniqueName: descriptor || alias,
            isAadIdentity: isAad,
            isContainer: isContainer,
            isTfsGroup: isTfsGroup,
        };
    }

    /**
     * Returns a distinct display name string representation for an identity reference object recognizable by IMS and WIT
     * The AAD identity string representation we use for the control is -  name <<objectId\email>>
     * 
     * @param identity An identity
     */
    public static getUniquefiedIdentityName(identity: IIdentityReference): string {
        if (identity.isAadIdentity && identity.displayName && identity.id) {
            var prefix = identity.isContainer ? IdentityHelper.AAD_IDENTITY_GROUP_PREFIX : IdentityHelper.AAD_IDENTITY_USER_PREFIX;
            if (identity.uniqueName && !identity.isContainer) {
                return Utils_String.format("{0} {1}{2}{3}\\{4}{5}", identity.displayName,
                    IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, prefix, identity.id, identity.uniqueName, IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
            else {
                return Utils_String.format("{0} {1}{2}{3}{4}", identity.displayName,
                    IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, prefix, identity.id, IdentityHelper.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
        }
        else if (!identity.isAadIdentity && identity.displayName && identity.isContainer && identity.isTfsGroup) {
            if (identity.id) {
                return Utils_String.format("{0} {1}{2}{3}{4}", identity.displayName,
                    IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, IdentityHelper.TFS_GROUP_PREFIX, identity.id.toUpperCase(), IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
            else {
                return identity.displayName;
            }
        }
        else if (!identity.isAadIdentity && identity.displayName && identity.uniqueName) {
            return Utils_String.format("{0} {1}{2}{3}", identity.displayName,
                IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, identity.uniqueName, IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        }
        else {
            return identity.displayName || "";
        }
    }

    /**
     * Returns a user friendly distinct display name string for an identity reference object
     * 
     * @param identity An identity
     */
    public static getFriendlyDistinctDisplayName(identity: IIdentityReference): string {
        if (identity.displayName && identity.uniqueName && !identity.isTfsGroup) {
            return IdentityHelper.getDistinctDisplayName(identity.displayName, identity.uniqueName);
        }
        else {
            return identity.displayName || "";
        }
    }

    /**
     * Returns a user  distinct display name string for an passed displayname and unique name
     * 
     * @param displayName an user's displayname
     * @param uniqueName user's alias or domain\\alias
     */
    public static getDistinctDisplayName(displayName: string, uniqueName: string): string {
        if (displayName && uniqueName) {
            return Utils_String.format("{0} {1}{2}{3}", displayName,
                IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, uniqueName, IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        }
        
        return "";
    }

    public static getFriendlyUniqueName(identity: IIdentityReference): string {
        if (identity.isContainer && identity.isTfsGroup && identity.displayName) {
            var i = identity.displayName.lastIndexOf(IdentityHelper.IDENTITY_UNIQUENAME_SEPARATOR);
            if (i !== -1) {
                return identity.displayName.substr(i + 1);
            }
        }
        return identity.uniqueName;
    }

    // Given a group uniquename that looks like id:2465ce16-6260-47a2-bdff-5fe4bc912c04\Build Administrators or id:2465ce16-6260-47a2-bdff-5fe4bc912c04, it will get the tfid from unique name
    public static getVsIdFromGroupUniqueName(str: string): string {
        var leftPart: string;
        if (!str) { return ""; }

        var vsid = "";
        var i = str.lastIndexOf(IdentityHelper.IDENTITY_UNIQUENAME_SEPARATOR);
        if (i === -1) {
            leftPart = str;
        }
        else {
            leftPart = str.substr(0, i);
        }

        if (Utils_String.startsWith(leftPart, IdentityHelper.TFS_GROUP_PREFIX)) {
            var rightPart = $.trim(leftPart.substr(3));
            vsid = Utils_String.isGuid(rightPart) ? rightPart : "";
        }

        return vsid;
    }
      
    public static isTfsGroup(identity: IIdentityReference): boolean {
        if (identity.isContainer && identity.uniqueName) {
            return IdentityHelper.getVsIdFromGroupUniqueName(identity.uniqueName) !== Utils_String.empty ||
                Utils_String.startsWith(identity.uniqueName, Artifacts_Services.LinkingUtilities.VSTFS, Utils_String.localeIgnoreCaseComparer);
        }
    }

    public static union(list: IIdentityReference[], addList: IIdentityReference[], sort: boolean = true): IIdentityReference[] {
        var result: IIdentityReference[] = list.slice(0);
        var listMapByDisplayName: { [displayName: string]: IIdentityReference } = {};
        var listMapById: { [id: string]: IIdentityReference } = {};
        var listMapByAlias: { [alias: string]: IIdentityReference } = {};

        $.each(result, (i, item: IIdentityReference) => {
            if (item.id) {
                listMapById[item.id.toLowerCase()] = item;
            }

            if (item.uniqueName) {
                listMapByAlias[item.uniqueName.toLowerCase()] = item;
            }

            if (!item.id && !item.uniqueName && item.displayName) {
                listMapByDisplayName[item.displayName.toLowerCase()] = item;
            }
        });

        $.each(addList, (i, addItem: IIdentityReference) => {
            if (!addItem.id && !addItem.uniqueName) {
                if (!listMapByDisplayName[addItem.displayName.toLowerCase()]) {
                    result.push(addItem);
                }
            }
            else if (!(listMapById[(addItem.id || "").toLowerCase()] || listMapByAlias[(addItem.uniqueName || "").toLowerCase()] )) {
                result.push(addItem);
            }
        });

        if (sort) {
            IdentityHelper._sortListByName(result);
        }

        return result;
    }

    public static subtract(list: IIdentityReference[], removeList: IIdentityReference[], sort: boolean = true): IIdentityReference[] {
        var result: IIdentityReference[] = list.slice(0);

        $.each(removeList, (i, removeItem: IIdentityReference) => {
            var length = result.length;

            for (var index = 0; index < length; index++) {
                if (IdentityHelper.areItemsEqual(removeItem, result[index])) {
                    result.splice(index, 1);
                    length--;
                }
            }
        });

        if (sort) {
            IdentityHelper._sortListByName(result);
        }

        return result;
    }

    private static _sortListByName(list: IIdentityReference[]) {
        list.sort((a: IIdentityReference, b: IIdentityReference) => {
            if (a.isTfsGroup && !b.isTfsGroup) {
                return 1;
            }
            else if (!a.isTfsGroup && b.isTfsGroup) {
                return -1;
            }
            else {
                var aName = $.trim(a.displayName.toLowerCase());
                var bName = $.trim(b.displayName.toLowerCase());

                return Utils_String.localeIgnoreCaseComparer(aName, bName);
            }
        });
    }

    public static areItemsEqual(item1: IIdentityReference, item2: IIdentityReference): boolean {
        var aName: string, bName: string;
        if (item1.id && item2.id) {
            aName = $.trim(item1.id.toLowerCase());
            bName = $.trim(item2.id.toLowerCase());
        }
        else if (item1.uniqueName && item2.uniqueName) {
            aName = $.trim(item1.uniqueName.toLowerCase());
            bName = $.trim(item2.uniqueName.toLowerCase());
        }
        else {
            aName = $.trim(item1.displayName.toLowerCase());
            bName = $.trim(item2.displayName.toLowerCase());
        }
        return Utils_String.localeIgnoreCaseComparer(aName, bName) === 0;
    }

    private static getDescriptorFromUniqueName(uniqueName: string): string {
        if (!uniqueName) {
            return "";
        }

        if (uniqueName.indexOf(IdentityHelper.DESCRIPTOR_PREFIX) != 0) {
            return "";
        }

        return uniqueName.replace(/desc:/i, "");
    }
}
