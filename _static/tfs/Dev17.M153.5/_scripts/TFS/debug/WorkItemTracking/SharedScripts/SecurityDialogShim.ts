import * as React from "react";
import * as TFS_Admin_Security_NOREQUIRE from "Admin/Scripts/TFS.Admin.Security";
import { registerLWPComponent } from "VSS/LWP";
import { using } from "VSS/VSS";

interface ISecurityDialogComponentProps {
    queryItemId: string;
    queryItemPath: string;
    queryItemPermissionSet: string;
}

class SecurityDialogComponent extends React.Component<ISecurityDialogComponentProps, {}> {
    public static readonly componentType = "SecurityDialog";

    public render(): null {
        const { queryItemId, queryItemPath, queryItemPermissionSet } = this.props;
        showSecurityDialog(queryItemId, queryItemPath, queryItemPermissionSet);
        return null;
    }
}

function showSecurityDialog(queryItemId: string, queryItemPath: string, queryItemPermissionSet: string) {
    // tslint:disable-next-line:variable-name
    using(["Admin/Scripts/TFS.Admin.Security"], (TFS_Admin_Security: typeof TFS_Admin_Security_NOREQUIRE) => {
        const queryItemSecurityManager = TFS_Admin_Security.SecurityManager.create(queryItemPermissionSet);
        queryItemSecurityManager.showPermissions(queryItemId, queryItemPath);
    });
}

registerLWPComponent(SecurityDialogComponent.componentType, SecurityDialogComponent);
