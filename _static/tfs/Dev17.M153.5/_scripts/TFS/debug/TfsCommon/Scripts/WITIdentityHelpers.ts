import * as Locations from "VSS/Locations";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as Identities_RestClient from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";
import { GraphSubject, GraphGroup, GraphUser } from "VSS/Graph/Contracts";
import { SubjectKind } from "VSS/WebApi/Constants";

/**
 * WIT Identity helpers
 */
export class WITIdentityHelpers {
    public static IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START = "<";
    public static IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END = ">";
    public static AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START = "<<";
    public static AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END = ">>";
    public static TFS_GROUP_PREFIX = "id:";
    public static AAD_IDENTITY_USER_PREFIX = "user:";
    public static AAD_IDENTITY_GROUP_PREFIX = "group:";
    public static IDENTITY_UNIQUENAME_SEPARATOR = "\\";
    public static DESCRIPTOR_PREFIX = "desc:";

    private static isAADIdentity(entity: Identities_RestClient.IEntity): boolean {
        return Utils_String.equals(entity.originDirectory, "aad", true) && entity.originId && !entity.localId;
    }

    private static isTfsGroup(entity: Identities_RestClient.IEntity): boolean {
        const indexOfGroupSeperator = entity.displayName.indexOf("\\");
        return Utils_String.equals(entity.entityType, "Group", true) &&
            Utils_String.startsWith(entity.displayName, "[") &&
            indexOfGroupSeperator !== -1 &&
            Utils_String.endsWith(entity.displayName.substring(0, indexOfGroupSeperator), "]");
    }

    private static getVsIdFromGroupUniqueName(str: string): string {
        let leftPart: string;
        if (!str) { return ""; }

        let vsid = "";
        const i = str.lastIndexOf(WITIdentityHelpers.IDENTITY_UNIQUENAME_SEPARATOR);
        if (i === -1) {
            leftPart = str;
        }
        else {
            leftPart = str.substr(0, i);
        }

        if (Utils_String.startsWith(leftPart, WITIdentityHelpers.TFS_GROUP_PREFIX)) {
            const rightPart = $.trim(leftPart.substr(3));
            vsid = Utils_String.isGuid(rightPart) ? rightPart : "";
        }

        return vsid;
    }

    /**
     * Returns the subjectDescriptor from the unique name portion of a combo string
     * Will parse desc:abcde => abcde
     */
    private static getDescriptorFromUniqueName(uniqueName: string): string {
        if (!uniqueName) {
            return "";
        }

        if (uniqueName.indexOf(WITIdentityHelpers.DESCRIPTOR_PREFIX) !== 0) {
            return "";
        }

        return uniqueName.replace(/desc:/i, "");
    }

    /**
     * Returns a distinct display name string representation for an identity reference object recognizable by WIT
     * The AAD identity string representation we use for the control is -  name <<objectId\email>>
     *
     * @param entity An entity
     */
    public static getUniquefiedIdentityName(entity: Identities_RestClient.IEntity): string {
        if (!entity) {
            return "";
        }

        const uniqueName = entity.signInAddress || entity.mail || entity.samAccountName;

        if (WITIdentityHelpers.isAADIdentity(entity)) {
            const isAadGroup = Utils_String.equals(entity.entityType, "Group", true);
            const prefix = isAadGroup ? WITIdentityHelpers.AAD_IDENTITY_GROUP_PREFIX : WITIdentityHelpers.AAD_IDENTITY_USER_PREFIX;
            if ((entity.signInAddress || entity.mail) && !isAadGroup) {
                return Utils_String.format(
                    "{0} {1}{2}{3}\\{4}{5}",
                    entity.displayName,
                    WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                    prefix,
                    entity.originId,
                    entity.signInAddress || entity.mail,
                    WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
            else {
                return Utils_String.format(
                    "{0} {1}{2}{3}{4}",
                    entity.displayName,
                    WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                    prefix,
                    entity.originId,
                    WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
        }
        else if (WITIdentityHelpers.isTfsGroup(entity)) {
            if (entity.localId) {
                return Utils_String.format(
                    "{0} {1}{2}{3}{4}",
                    entity.displayName,
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                    WITIdentityHelpers.TFS_GROUP_PREFIX,
                    entity.localId.toUpperCase(),
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
            else {
                return entity.displayName;
            }
        }
        else if (uniqueName) {
            if (uniqueName.indexOf("@") === -1 && entity.scopeName) {
                // if uniqueName is not an email, use both domain and alias
                return Utils_String.format(
                    "{0} {1}{2}\\{3}{4}",
                    entity.displayName,
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                    entity.scopeName,
                    uniqueName,
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
            else {
                // if uniqueName is an email, only use email
                return Utils_String.format(
                    "{0} {1}{2}{3}",
                    entity.displayName,
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                    uniqueName,
                    WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
            }
        }
        else if (entity.subjectDescriptor) {
            return Utils_String.format(
                "{0} {1}{2}{3}{4}",
                entity.displayName,
                WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                WITIdentityHelpers.DESCRIPTOR_PREFIX,
                entity.subjectDescriptor,
                WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        }
        else {
            return entity.displayName || "";
        }
    }

    public static getUniqueIdentityNameForContextIdentity(uniqueName: string, displayName: string): string {
        if (uniqueName) {
            return Utils_String.format("{0} {1}{2}{3}", displayName,
                WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, uniqueName, WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);

        }
        else {
            return displayName || "";
        }
    }

    /**
     * Groups have a guid encoded in their distinct display name, and for display purposes
     * we want it removed.
     *
     * @param distinctDisplayName A distinct display name
     * @param entity An entity
     *
     * @returns user friendly distinct display name string for an identity reference object
     */
    public static getFriendlyDistinctDisplayName(distinctDisplayName: string, entity: Identities_RestClient.IEntity): string {
        if (entity.displayName && entity.entityId && !WITIdentityHelpers.isTfsGroup(entity)) {
            return distinctDisplayName;
        }
        else {
            return entity.displayName || "";
        }
    }

    /**
     * Parse a distinct display name string into an entity reference object
     *
     * @param name A distinct display name for an identity
     */
    public static parseUniquefiedIdentityName(origName: string): Identities_RestClient.IEntity {
        if (!origName) { return null; }

        let i = origName.lastIndexOf(WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START);
        let j = origName.lastIndexOf(WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        let isContainer: boolean = false;
        let isAad: boolean = false;
        let name = origName;
        if (i >= 0 && j > i) {
            isAad = true;
            // replace "<<" with "<" and ">>" with ">" in case of an AAD identity string representation to make further processing easier
            name = name.replace(WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START)
                .replace(WITIdentityHelpers.AAD_IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END, WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        }

        i = name.lastIndexOf(WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START);
        j = name.lastIndexOf(WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        let displayName = name;
        let alias = "";
        let rightPart = "";
        let descriptor = "";
        let id = "";
        if (i >= 0 && j > i && j === name.length - 1) {
            displayName = $.trim(name.substr(0, i));
            if (isAad) {
                // if its an AAD identity, the string would be in format - name <<object id>>
                id = $.trim(name.substr(i + 1, j - i - 1));  // this would be in format objectid\email

                if (id.indexOf(WITIdentityHelpers.AAD_IDENTITY_USER_PREFIX) === 0) {
                    id = id.substr(WITIdentityHelpers.AAD_IDENTITY_USER_PREFIX.length);
                }
                else if (id.indexOf(WITIdentityHelpers.AAD_IDENTITY_GROUP_PREFIX) === 0) {
                    isContainer = true;
                    id = id.substr(WITIdentityHelpers.AAD_IDENTITY_GROUP_PREFIX.length);
                }

                const ii = id.lastIndexOf("\\");
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
                        isContainer = false;
                    }
                }
            }
            else {
                rightPart = $.trim(name.substr(i + 1, j - i - 1)); // gets string in the <>
                const vsIdFromAlias: string = WITIdentityHelpers.getVsIdFromGroupUniqueName(rightPart); // if it has vsid in unique name (for TFS groups)
                descriptor = WITIdentityHelpers.getDescriptorFromUniqueName(rightPart);

                if (rightPart.indexOf("@") !== -1
                    || rightPart.indexOf("\\") !== -1
                    || rightPart.indexOf(WITIdentityHelpers.DESCRIPTOR_PREFIX) !== -1
                    || vsIdFromAlias
                    || Utils_String.isGuid(rightPart)) {
                    // if its a valid alias
                    alias = rightPart;

                    // If the alias component is just a guid then this is not a uniqueName but
                    // vsId which is used only for TFS groups
                    if (vsIdFromAlias !== "") {
                        id = vsIdFromAlias;
                        isContainer = true;
                        alias = "";
                    }
                }
                else {
                    // if its not a valid alias, treat it as a non-identity string
                    displayName = origName;
                }
            }
        }

        let entity: Identities_RestClient.IEntity;
        if (id || alias || descriptor) {
            entity = {
                localId: isAad ? undefined : id,
                displayName: displayName,
                signInAddress: alias,
                originDirectory: isAad ? "aad" : "vsd",
                entityId: descriptor || id || alias,
                entityType: isContainer ? "Group" : "User",
                originId: isAad ? id : undefined,
                subjectDescriptor: descriptor,
            };
        }
        else {
            entity = IdentityPicker.EntityFactory.createStringEntity(displayName, Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg"));
        }

        return entity;
    }

    public static getEntityIdentifier(entity: Identities_RestClient.IEntity, uniqueDescriptorOnly?: boolean, requireDescriptor?: boolean): string {
        const isStringEntity = Utils_String.equals(entity.entityType || "", IdentityPicker.EntityFactory.STRING_ENTITY_TYPE, true);

        if (isStringEntity) {
            return "";
        }

        const descriptor = entity.subjectDescriptor || entity.localId || entity.signInAddress || entity.mail;
        if (uniqueDescriptorOnly) {
            return descriptor;
        }

        // if we don't have a descriptor, there really isn't a way to get an IEntity
        // from this value so bail out if consumer expects to be able to create an
        // IEntity.
        if (requireDescriptor && !descriptor) {
            return "";
        }

        if (descriptor) {
            // Display name here is used for backup in case the descriptor cannot be resolved
            return `${entity.displayName} <${descriptor}>`;
        } else {
            return entity.displayName;
        }
    }

    public static getDistinctDisplayNameFromGraphSubject(subject: GraphSubject, localId?: string): string {
        if (!subject) {
            return undefined;
        } else if (this.isGraphGroup(subject) && (localId || subject.originId) && subject.principalName) {
            return Utils_String.format(
                "{0} {1}{2}{3}{4}",
                subject.principalName,
                WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START,
                WITIdentityHelpers.TFS_GROUP_PREFIX,
                (localId || subject.originId).toUpperCase(),
                WITIdentityHelpers.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
        } else if (this.isGraphUser(subject) && subject.mailAddress) {
            return `${subject.displayName} <${subject.mailAddress}>`;
        } else {
            return subject.displayName;
        }
    }

    private static isGraphGroup(subject: GraphSubject): subject is GraphGroup {
        return Utils_String.equals(subject.subjectKind, SubjectKind.Group, true);
    }

    private static isGraphUser(subject: GraphSubject): subject is GraphUser {
        return Utils_String.equals(subject.subjectKind, SubjectKind.User, true);
    }
}
