/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\securityroles\client\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

/**
 * Access definition for a RoleAssignment.
 */
export enum RoleAccess {
    /**
     * Access has been explicitly set.
     */
    Assigned = 1,
    /**
     * Access has been inherited from a higher scope.
     */
    Inherited = 2
}

export interface RoleAssignment {
    /**
     * Designates the role as explicitly assigned or inherited.
     */
    access: RoleAccess;
    /**
     * User friendly description of access assignment.
     */
    accessDisplayName: string;
    /**
     * The user to whom the role is assigned.
     */
    identity: VSS_Common_Contracts.IdentityRef;
    /**
     * The role assigned to the user.
     */
    role: SecurityRole;
}

export interface SecurityRole {
    /**
     * Permissions the role is allowed.
     */
    allowPermissions: number;
    /**
     * Permissions the role is denied.
     */
    denyPermissions: number;
    /**
     * Description of user access defined by the role
     */
    description: string;
    /**
     * User friendly name of the role.
     */
    displayName: string;
    /**
     * Globally unique identifier for the role.
     */
    identifier: string;
    /**
     * Unique name of the role in the scope.
     */
    name: string;
    /**
     * Returns the id of the ParentScope.
     */
    scope: string;
}

export interface UserRoleAssignmentRef {
    /**
     * The name of the role assigned.
     */
    roleName: string;
    /**
     * Identifier of the user given the role assignment.
     */
    uniqueName: string;
    /**
     * Unique id of the user given the role assignment.
     */
    userId: string;
}

export var TypeInfo = {
    RoleAccess: {
        enumValues: {
            "assigned": 1,
            "inherited": 2
        }
    },
    RoleAssignment: <any>{
    },
};

TypeInfo.RoleAssignment.fields = {
    access: {
        enumType: TypeInfo.RoleAccess
    }
};
