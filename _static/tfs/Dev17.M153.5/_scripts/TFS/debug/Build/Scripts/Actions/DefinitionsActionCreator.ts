import { permissionsRetrieved } from "Build/Scripts/Actions/Actions";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";
import { getDefinitionSecurityToken, getDefinitionFolderSecurityToken } from "Build/Scripts/Security";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { IPermissionsStore, getPermissionsStore } from "Build/Scripts/Stores/Permissions";

import { GetDefinitionsResult, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildSecurity, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildDefinition } from "TFS/Build/Contracts";

import { PermissionEvaluationBatch, PermissionEvaluation } from "VSS/Security/Contracts";
import { getClient as getSecurityClient, SecurityHttpClient } from "VSS/Security/RestClient";

export function getDefinition(source: DefinitionSource, definitionId: number, ignore404?: boolean): IPromise<BuildDefinition> {
    return source.getDefinition(definitionId, ignore404).then((definition: BuildDefinition) => {
        const permissionsStore = getPermissionsStore();
        const token = getDefinitionSecurityToken(definition);
        if (!permissionsStore.hasToken(token)) {
            const permissionsBatch: PermissionEvaluationBatch = {
                alwaysAllowAdministrators: false,
                evaluations: []
            };
            addEvaluations(permissionsBatch.evaluations, token);

            getPermissions(permissionsBatch);
        }

        return definition;
    });
}

export function getDefinitions(source: DefinitionSource, filter?: GetDefinitionsOptions, behavior?: IDefinitionsBehavior): IPromise<GetDefinitionsResult> {
    return source.getDefinitions(filter, behavior).then((definitionsResult: GetDefinitionsResult) => {
        // get permissions if necessary
        const permissionsStore = getPermissionsStore();
        const permissionsBatch: PermissionEvaluationBatch = {
            alwaysAllowAdministrators: false,
            evaluations: []
        };

        definitionsResult.definitions.forEach((definition) => {
            let token = getDefinitionSecurityToken(definition);
            if (!permissionsStore.hasToken(token)) {
                addEvaluations(permissionsBatch.evaluations, token);
            }

            // include permissions for the definition's containing folder, too
            token = getDefinitionFolderSecurityToken(definition.path);
            if (!permissionsStore.hasToken(token)) {
                addEvaluations(permissionsBatch.evaluations, token);
            }
        });

        getPermissions(permissionsBatch);

        return definitionsResult;
    });
}

function getPermissions(permissionsBatch: PermissionEvaluationBatch): void {
    if (permissionsBatch.evaluations.length > 0) {
        const client: SecurityHttpClient = getSecurityClient();
        client.hasPermissionsBatch(permissionsBatch).then((evaluatedPermissions: PermissionEvaluationBatch) => {
            permissionsRetrieved.invoke(evaluatedPermissions.evaluations);
        });
    }
}

function addEvaluations(target: PermissionEvaluation[], token: string): void {
    // there is no QueryEffectivePermissions on the security API, so we need to explicitly request each bit
    PermissionBits.forEach((permission: number) => {
        target.push({
            securityNamespaceId: BuildSecurity.BuildNamespaceId,
            token: token,
            permissions: permission,
            value: false
        });
    });
}

// all of the permissions our UI might check
const PermissionBits: number[] = [
    BuildPermissions.ViewBuilds,
    BuildPermissions.RetainIndefinitely,
    BuildPermissions.DeleteBuilds,
    BuildPermissions.UpdateBuildInformation,
    BuildPermissions.QueueBuilds,
    BuildPermissions.ManageBuildQueue,
    BuildPermissions.StopBuilds,
    BuildPermissions.ViewBuildDefinition,
    BuildPermissions.EditBuildDefinition,
    BuildPermissions.DeleteBuildDefinition,
    BuildPermissions.AdministerBuildPermissions,
    BuildPermissions.EditBuildQuality
];
