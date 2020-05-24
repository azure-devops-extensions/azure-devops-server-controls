import * as TfsAdminSecurity_NOREQUIRE from "Admin/Scripts/TFS.Admin.Security";

import { getDefaultWebContext } from "VSS/Context";
import { using } from "VSS/VSS";

export interface IDefinitionRef {
    id: number;
    name: string;
    path: string;
}

export class SecurityUtils {
    private static _buildDefinitionPermissionSet =  "33344D9C-FC72-4d6f-ABA5-FA317101A7E9";
    private static _separator = "/";

    public static showBuildDefinitionSecurityDialog(definition: IDefinitionRef): void {
        using(["Admin/Scripts/TFS.Admin.Security"], (TfsAdminSecurity: typeof TfsAdminSecurity_NOREQUIRE) => {

            let projectGuid = getDefaultWebContext().project.id;
            let securityManager = TfsAdminSecurity.SecurityManager.create(this._buildDefinitionPermissionSet, {
                scope: projectGuid,
                separator: this._separator
            });

            let token = this._getSecurityToken(definition);

            securityManager.showPermissions(token, definition.name);
        });
    }

    protected static _getSecurityTokenPath(path: string): string {
        if (path) {
            path = path.replace(/\\/g, this._separator);
            if (path[0] === this._separator) {
                path = path.slice(1, path.length);
            }
        }

        return path;
    }

    protected static _getSecurityToken(definition: IDefinitionRef): string {
        if (!definition) {
            throw new Error("Definition reference should not be null or undefined");
        }

        if (!definition.id || definition.id < 0) {
            throw new Error("Definition id should be set and should be greater than zero");
        }
        let token = definition.id.toString();
        if (definition.path !== "\\") {
            token = this._getSecurityTokenPath(definition.path) + this._separator + token;
        }

        return token;
    }
}
