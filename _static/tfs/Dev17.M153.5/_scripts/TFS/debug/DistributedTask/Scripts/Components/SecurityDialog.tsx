import React = require("react");
import ReactDOM = require("react-dom");

import Q = require("q");

import { RoleAssignmentControl, IRoleAssignmentProps } from "VSSPreview/Flux/Components/RoleAssignmentControl";
import Utils_String = require("VSS/Utils/String");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");
import VssContext = require("VSS/Context");
import { ModalDialogO, IModalDialogOptions } from "VSS/Controls/Dialogs";
import Service = require("VSS/Service");
import Security_Client = require("VSS/Security/RestClient");

import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import TFS_Host_TfsContext = require("DistributedTask/Scripts/DT.Host.TfsContext");
import Types = require("DistributedTask/Scripts/DT.Types");

export interface ISecurityDialogOptions extends IModalDialogOptions {
    type: Types.LibraryItemType,
    id: string
    name?: string
}

export interface ISecurityDialogState {
}

export class SecurityDialog extends ModalDialogO<ISecurityDialogOptions> {
    public initializeOptions(options?: ISecurityDialogOptions) {
        this._type = options.type;
        this._itemId = options.id;
        this._name = options.name;

        super.initializeOptions($.extend({
            width: 800,
            height: 450,
            title: this._getTitle(),
            buttons: null
        }, options));
    }

    public initialize() {
        super.initialize();
        var component = ReactDOM.render(<SecurityRolesControl type={this._type} id={this._itemId} />, this._element[0]) as SecurityRolesControl;
        this.updateOkButton(true);
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }

    private _getTitle(): string {
        var fullItemName: string = "";
        if (this._type === Types.LibraryItemType.VariableGroup ||
            this._type === Types.LibraryItemType.SecureFile) {
            fullItemName = Utils_String.localeFormat("{0} / {1}", Resources.LibraryHubTitle, this._name);
        }
        else if (this._type === Types.LibraryItemType.OAuthConfiguration) {
            if (!Utils_String.equals(this._name, Utils_String.empty, true)) {
                fullItemName = Utils_String.localeFormat("{0} / {1}", Resources.OAuthConfigurationTitle, this._name);
            }
            else {
                fullItemName = Resources.OAuthConfigurationTitle;
            }
        }
        else {
            fullItemName = Resources.LibraryHubTitle;
        }

        return Utils_String.format(Resources.SecurityDialogTitle, fullItemName);
    }

    private _name: string;
    private _type: Types.LibraryItemType;
    private _itemId: string;
}

class SecurityRolesControl extends React.Component<ISecurityDialogOptions, ISecurityDialogState> {
    public render(): JSX.Element {
        return (
            <div className="security-roles" ref={(d) => this._containerElement = d} />
        );
    }

    public componentDidMount(): void {
        this._createRoleAssignmentControl();
    }

    public componentWillUnmount(): void {
        ReactDOM.unmountComponentAtNode(this._containerElement);
    }

    private _createRoleAssignmentControl() {
        let $element = $(this._containerElement);

        var gridWidth = $element.innerWidth() - 50;
        var gridSizeSetting = {
            userCellWidth: .5 * gridWidth,
            roleCellWidth: .2 * gridWidth,
            accessCellWidth: .2 * gridWidth,
            removeCellWidth: .08 * gridWidth
        };
        var vssContext = VssContext.getDefaultWebContext()
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        // We are using "$" instead of "_" because "_" is a valid character in folder path name.
        // Service is using "$" as delimiter so using same delimiter here.
        var resourceId = Utils_String.empty;
        var scopeId = SecurityRolesControl._LibraryRoleScopeId;
        var hasPermissionPromise: IPromise<boolean> = null;
        if (this.props.type === Types.LibraryItemType.VariableGroup) {
            resourceId = Utils_String.format("{0}${1}", vssContext.project.id, this.props.id);
            scopeId = SecurityRolesControl._VariableGroupRoleScopeId;
            hasPermissionPromise = SecurityHelper.hasVariableGroupPermission(vssContext.project.id, Number(this.props.id), SecurityRolesControl._manageRolesPermission);
        } 
        else if (this.props.type === Types.LibraryItemType.SecureFile) {
            resourceId = Utils_String.format("{0}${1}", vssContext.project.id, this.props.id);
            scopeId = SecurityRolesControl._SecureFileRoleScopeId;
            hasPermissionPromise = SecurityHelper.hasSecureFilePermission(vssContext.project.id, this.props.id, SecurityRolesControl._manageRolesPermission);
        }
        else if (this.props.type === Types.LibraryItemType.OAuthConfiguration) {
            resourceId = this.props.id;
            scopeId = parseInt(this.props.id) != 0 ? SecurityRolesControl._OAuthConfigurationRoleScopeId : SecurityRolesControl._GlobalOAuthConfigurationRoleScopeId ;
            hasPermissionPromise = SecurityHelper.hasOAuthConfigurationPermission(this.props.id, SecurityRolesControl._manageRolesPermission);
        }
        else {
            resourceId = Utils_String.format("{0}${1}", vssContext.project.id, this.props.id);
            hasPermissionPromise = SecurityHelper.hasLibraryPermission(vssContext.project.id, SecurityRolesControl._manageRolesPermission);
        }

        hasPermissionPromise.then((hasPermission: boolean) => {
            ReactDOM.render(
                <RoleAssignmentControl
                    serviceInstanceId={VSS_WebApi_Constants.ServiceInstanceTypes.TFS}
                    userId={vssContext.user.id}
                    resourceId={resourceId}
                    scopeId={scopeId}
                    manageRolesPermission={SecurityRolesControl._manageRolesPermission}
                    noPermissionMessage={Resources.PermissionDeniedMessage}
                    canEdit={hasPermission}
                    canInherit={Utils_String.equals(this.props.id, "0", true) ? false : true}
                    gridSizeSetting={gridSizeSetting}
                    showAvatars={true}
                    formAvatarUrl={(id: string) => {
                        return tfsContext.getActionUrl("GetDdsAvatar", "common", {
                            id: id,
                            area: "api",
                        });
                    }}
                />,
                this._containerElement);
        });
    }

    private _containerElement: HTMLElement;

    private static _manageRolesPermission = 2;
    private static _LibraryRoleScopeId = "distributedtask.library";
    private static _VariableGroupRoleScopeId = "distributedtask.variablegroup";
    private static _SecureFileRoleScopeId = "distributedtask.securefile";
    private static _OAuthConfigurationRoleScopeId = "distributedtask.oauthconfiguration";
    private static _GlobalOAuthConfigurationRoleScopeId = "distributedtask.globaloauthconfiguration";
}

class SecurityHelper {
    private static _securityClient: Security_Client.SecurityHttpClient;
    private static _serviceInstanceId: string = VSS_WebApi_Constants.ServiceInstanceTypes.TFS;
    private static _librarySecurityNamespaceId: string = "B7E84409-6553-448A-BBB2-AF228E07CBEB";
    private static _libraryToken = "Library";
    private static _collectionToken = "Collection";
    private static _variableGroupToken = "VariableGroup";
    public static _secureFileToken = "SecureFile";
    public static _oAuthConfigurationToken = "OAuthConfiguration";
    private static _namespaceSeparator: string = "/";

    public static hasLibraryPermission(projectId: string, permission: number): IPromise<boolean> {
        var token = SecurityHelper._getSecurityToken(projectId, Utils_String.empty, Utils_String.empty);

        return SecurityHelper._hasPermission(SecurityHelper._librarySecurityNamespaceId, permission, token);
    }

    public static hasVariableGroupPermission(projectId: string, vgId: number, permission: number): IPromise<boolean> {
        var token = SecurityHelper._getSecurityToken(projectId, SecurityHelper._variableGroupToken, vgId ? vgId.toString() : Utils_String.empty);

        return SecurityHelper._hasPermission(SecurityHelper._librarySecurityNamespaceId, permission, token);
    }

    public static hasSecureFilePermission(projectId: string, sfId: string, permission: number): IPromise<boolean> {
        var token = SecurityHelper._getSecurityToken(projectId, SecurityHelper._secureFileToken, sfId? sfId : Utils_String.empty);

        return SecurityHelper._hasPermission(SecurityHelper._librarySecurityNamespaceId, permission, token);
    }

    public static hasOAuthConfigurationPermission(ocId: string, permission: number): IPromise<boolean> {
        var token = SecurityHelper._getSecurityToken(SecurityHelper._collectionToken, SecurityHelper._oAuthConfigurationToken, ocId? ocId : Utils_String.empty);

        return SecurityHelper._hasPermission(SecurityHelper._librarySecurityNamespaceId, permission, token);
    }

    private static _hasPermission(securityNamespaceId: string, permission: number, token: string): IPromise<boolean> {
        var defer = Q.defer<boolean>();

        SecurityHelper._initialize();
        SecurityHelper._securityClient.hasPermissions(securityNamespaceId, permission, token).then((hasPermissions: boolean[]) => {
            defer.resolve(hasPermissions[0]);
        },
            (error: any) => {
                // Permission couldn't be determined, fallback to default true to avoid any blocking of UI.
                defer.resolve(true);
            });

        return defer.promise;
    }

    private static _getSecurityToken(projectId: string, suffix: string, resourceId: string): string {
        var token = SecurityHelper._libraryToken.concat(SecurityHelper._namespaceSeparator, projectId);

        if (suffix && !Utils_String.equals(suffix, Utils_String.empty)) {
            token = token.concat(SecurityHelper._namespaceSeparator, suffix);
        }

        if (resourceId && !Utils_String.equals(resourceId, Utils_String.empty)) {
            token = token.concat(SecurityHelper._namespaceSeparator, resourceId);
        }

        return token;
    }

    private static _initialize(): void {
        if (!SecurityHelper._securityClient) {
            SecurityHelper._securityClient = Service.VssConnection.getConnection().getHttpClient(Security_Client.SecurityHttpClient, SecurityHelper._serviceInstanceId);
        }
    }
}