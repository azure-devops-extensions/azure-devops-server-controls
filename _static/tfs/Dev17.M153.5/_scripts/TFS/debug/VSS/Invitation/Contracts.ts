/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\invitation.genclient.json
 */

"use strict";

/**
 * Invitation Data
 */
export interface InvitationData {
    /**
     * Invitation Attributes
     */
    attributes: { [key: string] : string; };
    /**
     * Type of Invitation
     */
    invitationType: InvitationType;
    /**
     * Id of the Sender
     */
    senderId: string;
}

/**
 * Enum value indicating type of invitation
 */
export enum InvitationType {
    AccountInvite = 1
}

export var TypeInfo = {
    InvitationData: <any>{
    },
    InvitationType: {
        enumValues: {
            "accountInvite": 1
        }
    },
};

TypeInfo.InvitationData.fields = {
    invitationType: {
        enumType: TypeInfo.InvitationType
    }
};
