import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

import "Admin/Scripts/TFS.Admin.Controls";
import "Admin/Scripts/TFS.Admin.ServiceEndpoints.Controls";
import "Admin/Scripts/TFS.Admin.ServiceEndpoints";

SDK_Shim.registerContent("adminServices.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {

    ReactDOM.render(
        <AdminServicesViewComponent />,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});



class AdminServicesViewComponent extends React.Component<{}, {}> {    

    private serviceEndpointAdminTabTemplate: string = `<div class="service-endpoint-admin-hosts-view">
    <div class="hub-pivot">
        <div class="views">
            <ul class="empty pivot-view" role="tablist">
                <li role="tab" data-bind="css: { selected: showDetails() }, attr: { 'aria-selected': showDetails(), 'tabindex': ((showDetails() == true) ? '0' : '-1') }, event: { keydown: onMenuKeyDown }, click: onShowDetails">
                    <a role="button" tabindex="-1">${AdminResources.ServiceEndPointDetailsTab}</a>
                </li>
                <li role="tab" data-bind="css: { selected: showRoles() }, attr: { 'aria-selected': showDetails(), 'tabindex': ((showRoles() == true) ? '0' : '-1') }, event: { keydown: onMenuKeyDown }, click: onShowRoles">
                    <a role="button" tabindex="-1">${AdminResources.ServiceEndPointRolesTab}</a>
                </li>
                <li role="tab" data-bind="css: { selected: showExecutionHistory() }, attr: { 'aria-selected': showDetails(), 'tabindex': ((showExecutionHistory() == true) ? '0' : '-1') }, event: { keydown: onMenuKeyDown }, click: onShowExecutionHistory">
                    <a role="button" tabindex="-1">${AdminResources.ServiceEndPointExecutionHistoryTab}</a>
                </li>
                <li role="tab" data-bind="visible: showPolicyTab, css: { selected: showPolicy() }, attr: { 'aria-selected': showDetails(), 'tabindex': ((showPolicy() == true) ? '0' : '-1') }, event: { keydown: onMenuKeyDown }, click: onShowPolicy">
                    <a role="button" tabindex="-1">${AdminResources.ServiceEndPointPolicyTab}</a>
                </li>
            </ul>
        </div>
    </div>
    <div class="hub-pivot-content">
        <div class="details" role="region" aria-label="endpoint-details" data-bind="visible: showDetails()">
        </div>
        <div class="roles" role="region" aria-label="endpoint-roles" data-bind="visible: showRoles()">
        </div>
        <div class="execution-history" role="region" aria-label="endpoint-execution-history" data-bind="visible: showExecutionHistory()">
        </div>
        <div class="policy" role="region" aria-label="endpoint-policy" data-bind="visible: showPolicy()">
        </div>
    </div>
</div>`;

    private addGitConnectionsDialogTemplate: string = `<div class="add_git_connections_dialog services_dialog">
<div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
<table>
    <tr>
        <td>
            <label for="connectionName">${AdminResources.ConnectionName}</label></td>
        <td>
            <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
    </tr>
    <tr>
        <td>
            <label for="serverUrl">${AdminResources.GitRepositoryUrl}</label></td>
        <td>
            <input class="textbox" data-bind="value: serverUrl" required id="serverUrl" type="text" /></td>
    </tr>
    <tr>
        <td>
            <label for="username">${AdminResources.UserName}</label></td>
        <td>
            <input class="textbox" data-bind="value: userName" required id="username" type="text" /></td>
    </tr>
    <tr>
        <td>
            <label for="pwd" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }">${AdminResources.Password}</label></td>
        <td>
            <input class="textbox" required id="pwd" type="password" /></td>
    </tr>
</table>
<div class="error-messages-div">
    <div data-bind="foreach: errors">
        <span data-bind="text: $data"></span>
        <br />
    </div>
</div>
</div>
`;

    private gitConnectedServiceDetailsTemplate: string = `<div class="git-connected-service-details">
<!-- ko if: name() -->
<div class="group">
    <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
    <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
    <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
    <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
</div>
<div class="group">
    <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
    <div class="content">
        <p>${AdminResources.AvailableActionsOnConnection}</p>
        <ul>
            <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
            <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
            <!-- ko if: shareAcrossProjectsEnabled() -->
            <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
            <!-- /ko -->
        </ul>
    </div>
</div>
<!-- /ko -->
</div>
`;

    private addDeploymentEnvironmentsDialogTemplate: string = `<div class="add_deployment_environments_dialog services_dialog">
<div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="subscription-id">${AdminResources.AzureSubscriptionIdText}</label></td>
            <td>
                <input class="textbox" data-bind="value: subscriptionid, disable: isUpdate()" required id="subscription-id" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="subscription-name">${AdminResources.AzureSubscriptionNameText}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="subscription-name" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="auth-kind">${AdminResources.AzureSubscriptionAuthText}</label></td>
            <td>
                <span>
                    <input class="auth-kind" required type="radio" name="cert" value="0" data-bind="checked: authChoice" />
                    ${AdminResources.AzureSubscriptionCertificateText}</span>
                <span>
                    <input class="auth-kind" required type="radio" name="cert" value="1" data-bind="checked: authChoice" />
                    ${AdminResources.AzureSubscriptionCredentialsText}</span>
                <!-- ko if: isServicePrincipalEnabled() -->
                <span>
                    <input class="auth-kind" required type="radio" name="cert" value="2" data-bind="checked: authChoice" />
                    ${AdminResources.AzureSubscriptionPrincipalText}</span>
                <!-- /ko -->
            </td>
        </tr>
    </table>
    <div data-bind="template: { name: authTemplate() }" />
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>
`;

    private certificateTemplate: string = `<table>
<tr>
    <td>
        <label for="subscription-cert">${AdminResources.AzureSubscriptionSubscriptionCertificateText}</label></td>
    <td>
        <textarea class="textbox" required id="subscription-cert" rows="6" cols="30"></textarea>
        <span data-bind="html: '${AdminResources.AzureSubscriptionSubscriptionCertificateText}'" class="getting-started-lighttext getting-started-vertical-small"></span>
    </td>
</tr>
</table>`;

    private credentialTemplate: string = `<table>
    <tr>
        <td>
            <label for="username">${AdminResources.AzureSubscriptionUsernameText}</label></td>
        <td>
            <input class="textbox" required id="username" type="text" /></td>
    </tr>
    <tr>
        <td>
            <label for="pwd">${AdminResources.AzureSubscriptionPasswordText}</label></td>
        <td>
            <input class="textbox" required id="pwd" type="password" /></td>
    </tr>
    <tr>
        <td>
            <label for="pwd-check">${AdminResources.AzureSubscriptionReenterPasswordText}</label></td>
        <td>
            <input class="textbox" required id="pwd-check" type="password" /></td>
    </tr>
    <tr>
        <td>&nbsp;</td>
        <td>
            <span data-bind="html: '${AdminResources.AzureCredentialsNoteHtml}'"></span>
        </td>
    </tr>
</table>`;

    private servicePrincipalTemplate: string = `<table>
    <tr>
        <td>
            <label for="ServicePrincipalId">${AdminResources.AzureServicePrincipalIdText}</label></td>
        <td>
            <input class="textbox" required id="ServicePrincipalId" type="text" /></td>
    </tr>
    <tr>
        <td>
            <label for="ServicePrincipalKey">${AdminResources.AzureServicePrincipalKeyText}</label></td>
        <td>
            <input class="textbox" required id="ServicePrincipalKey" type="password" /></td>
    </tr>
    <tr>
        <td>
            <label for="TenantId">${AdminResources.AzureTenantId}</label></td>
        <td>
            <input class="textbox" required id="TenantId" type="text" /></td>
    </tr>
     <tr>
        <td>&nbsp;</td>
        <td>
            <span data-bind="html: '${AdminResources.ServicePrincipalTip}'" class="getting-started-lighttext getting-started-vertical-small"></span>
        </td>
    </tr>
</table>`;

    private connectedServiceDetailsTemplate: string = `<div class="connected-service-details">
<!-- ko if: name() -->
<div class="group">
    <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
    <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <div class="content">
        <p data-bind="visible: deploymentEnvironments().length == 0 && showDeploymentEnvironment()"><i>${AdminResources.AzureSubscriptionNoDeploymentEnvironmentsText}</i></p>
        <div data-bind="visible: deploymentEnvironments().length > 0">
            <p >${AdminResources.AzureSubscriptionListOfDeploymentEnvironmentsText}</p>
            <ul data-bind="foreach: deploymentEnvironments">
                <li>
                    <span data-bind="text: $data"></span>
                </li>
            </ul>
        </div>
    </div>
    <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
    <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
</div>
<div class="group">
    <div class="header" role="heading" aria-level={2}>${AdminResources.AzureSubscriptionActionsText}</div>
    <div class="content">
        <p>${AdminResources.AzureSubscriptionListOfActionsText}</p>
        <ul>
            <li data-bind="click: updateAuthentication, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateServiceConfiguration}</a></li>
            <li data-bind="visible: serviceUri()"><a target="_blank" href="#" data-bind="attr: { href: serviceUri }">${AdminResources.AzureSubscriptionManageText}</a></li>
            <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.AzureSubscriptionDisconnectText}</a></li>
            <!-- ko if: shareAcrossProjectsEnabled() -->
            <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
            <!-- /ko -->
        </ul>
    </div>
</div>
<!-- /ko -->
<!-- ko if: !name() -->
<p>${AdminResources.ConnectedServiceWelcome}</p>
<!-- /ko -->
</div>
`;

    private addChefConnectionsDialogTemplate: string = `<div class="add_chef_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="connectionName">${AdminResources.ConnectionName}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="serverUrl">${AdminResources.ServerUrlChef}</label></td>
            <td>
                <input class="textbox" data-bind="value: serverUrl" required id="serverUrl" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="username">${AdminResources.NodeUserName}</label></td>
            <td>
                <input class="textbox" required id="username" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="clientKey">${AdminResources.ClientKey}</label></td>
            <td>
                <textarea class="textbox" required id="clientKey" rows="6" cols="30"></textarea>
                <span class="getting-started-lighttext getting-started-vertical-small">${AdminResources.CopyChefClientKey}</span>
            </td>
        </tr>
    </table>
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>`;

    private chefConnectedServiceDetailsTemplate: string = `<div class="chef-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.ConnectingUsing}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private addGenericConnectionsDialogTemplate: string = `<div class="add_generic_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="connectionName">${AdminResources.ConnectionName}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="serverUrl">${AdminResources.ServerUrl}</label></td>
            <td>
                <input class="textbox" data-bind="value: serverUrl" required id="serverUrl" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="username">${AdminResources.UserName}</label></td>
            <td>
                <input class="textbox" required id="username" type="text" data-bind="value: userName" /></td>
        </tr>
        <tr>
            <td>
                <label for="pwd">${AdminResources.Password}</label></td>
            <td>
                <input class="textbox" required id="pwd" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }" /></td>
        </tr>
    </table>
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>`;

    private genericConnectedServiceDetailsTemplate: string = `<div class="generic-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private addGithubConnectionsDialogTemplate: string = `    <div class="add_github_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id"></div>
    <table>
        <tr data-bind="visible: isHosted() && marketAppFeatureEnabled">
            <td>${AdminResources.GitHubAuthenticateAsLabel}</td>
            <td>
                <span>
                    <input class="auth-kind" required type="radio" id="authenticateUser" style="margin-left: 1px" name="auth-as" value="1" data-bind="checked: authAsChoice, disable: disableUpdateTokenBasedEndpoint()" />
                    <label for="authenticateUser" style="display: inline">${AdminResources.GitHubAuthenticateAsUser}</label>
                </span>
                <span>
                    <input class="auth-kind" required type="radio" id="authenticateApp" name="auth-as" value="0" data-bind="checked: authAsChoice, disable: disableUpdateTokenBasedEndpoint()" />
                    <label for="authenticateApp" style="display: inline">${AdminResources.GitHubAuthenticateAsMarketplaceApp}</label>
                </span>
            </td
        </tr>
        <tr data-bind="visible: isHosted() && authAsChoice() == 0 && marketAppFeatureEnabled && !disableUpdateTokenBasedEndpoint()">
            <td>${AdminResources.GitHubOrganizationLabel}</td>
            <td>
                <div">
                    <div class="select-org-dropdown select-dropdown">
                </div>
                <div data-bind="visible: appInstallationsLoaded()" style="margin-top: 2px">
                    <span id="install-app-help-text">
                </div>
            </td>
        </tr>
        <tr data-bind="visible: isHosted() && authAsChoice() == 1">
            <td>${AdminResources.GitHubChooseAuthorizationLabel}</td>
            <td>
                <div">
                    <div class="select-auth-choice-dropdown select-dropdown">
                </div>
            </td>
        </tr>
        <tr data-bind="visible: tokenChoice() != 2">
            <td>
                <div><label for="connectionName">${AdminResources.ConnectionName}</label></div>
            </td>
            <td>
                <div><input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></div>
            </td>
        </tr>

        <tr data-bind="visible: isHosted() && authAsChoice() == 0 && marketAppFeatureEnabled && !disableUpdateTokenBasedEndpoint()">
            <td></td>
            <td>
                <div style="height: 40px;">
                    <div style="height: 100%">
                        <div data-bind="visible: !isAuthorizing() && !appInstallationsLoaded()">
                            <button id="github-load-installation-button">${AdminResources.AuthorizeButtonText}</button>
                        </div>
                        <div data-bind="visible: isAuthorizing()">
                            <img style="vertical-align: top; margin-right: 2px;" src="/_static/tfs/current/_content/spinner.gif" />
                            <span>${AdminResources.AuthorizingInProgressText}</span>
                        </div>
                        <div class="github-oauth-success" data-bind="visible: authorizationSucceeded() && appInstallationsLoaded()">
                            <span class="icon icon-tfs-build-status-succeeded" style="vertical-align: top" />
                            <span data-bind="text: authorizationCompletedText" />
                        </div>
                        <div class="github-oauth-error" data-bind="visible: authorizationCompleted() && !authorizationSucceeded() && appInstallationsLoaded()">
                            <span class="icon icon-tfs-build-status-failed" style="vertical-align: top" />
                            <span data-bind="text: authorizationCompletedText" />
                        </div>
                    </div>
                </div>
            </td>
        </tr>

        <tr data-bind="visible: tokenChoice() != 2 && authAsChoice() == 1">
            <td>
                <div data-bind="visible: tokenChoice() == 1">
                    <div data-bind="visible: isHosted()">
                        <span id="github-token-label">${AdminResources.GitHubTokenLabel}</span>
                    </div>
                    <div data-bind="visible: !isHosted()">
                        <span id="github-pat-label">${AdminResources.GitHubPersonalAccessTokenLabel}</span>
                    </div>
                </div>
            </td>
            <td>
                <div style="height: 40px;">
                    <div data-bind="visible: tokenChoice() == 0" style="height: 100%">
                        <div data-bind="visible: !isAuthorizing() && !authorizationCompleted()">
                            <button id="github-authorize-button">${AdminResources.AuthorizeButtonText}</button>
                        </div>
                        <div data-bind="visible: isAuthorizing()">
                            <img style="vertical-align: top; margin-right: 2px;" src="/_static/tfs/current/_content/spinner.gif" />
                            <span>${AdminResources.AuthorizingInProgressText}</span>
                        </div>
                        <div class="github-oauth-success" data-bind="visible: authorizationSucceeded()">
                            <span class="icon icon-tfs-build-status-succeeded" style="vertical-align: top" />
                            <span data-bind="text: authorizationCompletedText" />
                        </div>
                        <div class="github-oauth-error" data-bind="visible: authorizationCompleted() && !authorizationSucceeded()">
                            <span class="icon icon-tfs-build-status-failed" style="vertical-align: top" />
                            <span data-bind="text: authorizationCompletedText" />
                        </div>
                    </div>
                    <div data-bind="visible: tokenChoice() == 1" style="height: 100%">
                        <div>
                            <input class="textbox" required id="accessToken" type="text" data-bind="attr: { 'aria-labelledby': isHosted() ? 'github-token-label' : 'github-pat-label' }" /></div>
                        <div style="margin-top: 2px"><span><b>${AdminResources.GitHubRecommendedScopes}</b></span></div>
                    </div>
                </div>
            </td>
        </tr>
        <tr data-bind="visible: tokenChoice() != 2">
            <td></td>
            <td>
                <div style="margin-bottom: 10px"><a href="${AdminResources.GitHubLearnMoreLink}" target="_blank">${AdminResources.GitHubLearnMoreLinkText}</a></div>
            </td>
        </tr>
        <tr data-bind="visible: disableUpdateTokenBasedEndpoint()">
            <td></td>
            <td>
                <div style="height: 40px">
                    <span class="icon icon-tfs-build-status-failed" style="vertical-align: top" />
                    <span>${AdminResources.GitHubLaunchServiceEndpointWarning}</span>
                </div>
            </td>
        </tr>
        <tr data-bind="visible: tokenChoice() == 2">
            <td></td>
            <td>
                <div style="margin-bottom: 10px"><a href="${AdminResources.GitHubManageAppLink}" target="_blank">${AdminResources.GitHubManageAppLinkText}</a></div>
            </td>
        </tr>
    </table>

    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>
`;

    private githubConnectedServiceDetailsTemplate: string = `<div class="github-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>Information</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <!-- ko if: (authorizationScheme == "PersonalAccessToken" || authorizationScheme == "OAuth") -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private addBitbucketConnectionsDialogTemplate: string = `<div class="add_bitbucket_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr data-bind="visible: isHosted()">
            <td>${AdminResources.BitbucketChooseAuthorizationLabel}</td>
            <td>
                <span>
                    <input class="auth-kind" required type="radio" id="ChoiceOAUTH" style="margin-left: 1px" name="cert" value="0" data-bind="checked: tokenChoice, disable: isUpdate() || isAuthorizing()" />
                    <label for="ChoiceOAUTH" style="display: inline">${AdminResources.BitbucketGrantAuthorizationLabel}</label>
                </span>
                <span>
                    <input class="auth-kind" required type="radio" id="ChoiceBasic" name="cert" value="1" data-bind="checked: tokenChoice, disable: isUpdate() || isAuthorizing()" />
                    <label for="ChoiceBasic" style="display: inline">${AdminResources.BitbucketBasicAuthorizationLabel}</label>
                </span>
            </td>
        </tr>
        <tr>
            <td><div><label for="connectionName">${AdminResources.ConnectionName}</label></div></td>
            <td><div><input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></div></td>
        </tr>
        <tr data-bind="visible: isHosted() && tokenChoice() == 0">
            <td />
            <td>
                <div style="height: 40px;">
                    <div data-bind="visible: tokenChoice() == 0" style="height: 100%">
                        <div data-bind="visible: !isAuthorizing() && !authorizationCompleted() && !isUpdate()">
                            <button id="bitbucket-authorize-button">${AdminResources.AuthorizeButtonText}</button>
                        </div>
                        <div data-bind="visible: isAuthorizing()">
                            <img style="vertical-align: top; margin-right: 2px;" src="/_static/tfs/current/_content/spinner.gif"/>
                            <span>${AdminResources.AuthorizingInProgressText}</span>
                        </div>
                        <div class="bitbucket-oauth-success" data-bind="visible: authorizationSucceeded() || isUpdate()">
                            <span class="icon icon-tfs-build-status-succeeded" style="vertical-align: top"/>
                            <span data-bind="text: authorizationCompletedText"/>
                        </div>
                        <div class="bitbucket-oauth-error" data-bind="visible: authorizationCompleted() && !authorizationSucceeded()">
                            <span class="icon icon-tfs-build-status-failed" style="vertical-align: top"/>
                            <span data-bind="text: authorizationCompletedText"/>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        <tr data-bind="visible: !isHosted() || tokenChoice() == 1">
            <td>
                <label for="username">${AdminResources.UserName}</label>
            </td>
            <td>
                <input class="textbox" id="username" type="text" data-bind="value: userName" />
            </td>
        </tr>
        <tr data-bind="visible: !isHosted() || tokenChoice() == 1">
            <td>
                <label for="pwd">${AdminResources.Password}</label>
            </td>
            <td>
                <input class="textbox" id="pwd" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }" />
            </td>
        </tr>
        <tr>
            <td></td>
            <td><div style="margin-bottom: 10px"><a href="${AdminResources.BitbucketLearnMoreLink}" target="_blank">${AdminResources.BitbucketLearnMoreLinkText}</a></div></td>
        </tr>
    </table>


    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>
`;

    private bitbucketConnectedServiceDetailsTemplate: string = `<div class="bitbucket-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li tabindex="0" data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a role="button">${AdminResources.UpdateConnection}</a></li>
                <li tabindex="0" data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private addSshConnectionsDialogTemplate: string = `<div class="add_ssh_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="connectionName">${AdminResources.ConnectionName}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="host">${AdminResources.SshHost}</label></td>
            <td class='value-field'>
                <input class="textbox" data-bind="value: host" required id="host" type="text" /></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: sshHostHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
        <tr>
            <td>
                <label for="port">${AdminResources.SshPort}</label></td>
            <td class='value-field'>
                <input class="textbox" data-bind="value: port" id="port" type="text" /></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: sshPortHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
        <tr>
            <td>
                <label for="username">${AdminResources.UserName}</label></td>
            <td>
                <input class="textbox" required id="username" type="text" data-bind="value: userName" /></td>
        </tr>
        <tr>
            <td>
                <label for="pwd">${AdminResources.SshPassword}</label></td>
            <td class='value-field'>
                <input class="textbox" required id="pwd" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }" /></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: sshPasswordHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
         <tr>
            <td>
                <label for="key">${AdminResources.SshKey}</label></td>
            <td class='value-field'>
                <textarea class="textbox" id="key" rows="6" cols="30" data-bind="value: privateKey"></textarea>
                <p>
                    <a class="file-input-container" href="#" data-bind="click: loadTextFileContent, triggerClickOnKeyUp: loadTextFileContent">${AdminResources.LoadKeyFile}</a>
                </p>
            </td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: sshKeyHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
    </table>
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>`;

    private sshConnectedServiceDetailsTemplate: string = `<div class="svn-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
    <!-- ko if: !name() -->
    <p>${AdminResources.ConnectedServiceWelcome}</p>
    <!-- /ko -->
</div>`;

    private addSvnConnectionsDialogTemplate: string = `<div class="add_svn_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="connectionName">${AdminResources.ConnectionName}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
        </tr>
        <tr>
            <td>
                <label for="serverUrl">${AdminResources.SvnRepositoryUrl}</label></td>
            <td class='value-field'>
                <input class="textbox" data-bind="value: serverUrl" required id="serverUrl" type="text" /></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: svnServerUrlHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
        <tr>
            <td/>
            <td class='value-field'>
                <span>
                    <input class="checkbox" data-bind="checked: acceptUntrustedCerts" id="acceptUntrustedCerts" type="checkbox" />
                    <label for="acceptUntrustedCerts">${AdminResources.AcceptUntrustedCerts}</label>
                </span></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: svnAcceptUntrustedCertsHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
        <tr>
            <td>
                <label for="realmName">${AdminResources.RealmName}</label></td>
            <td class='value-field'>
                <input class="textbox" data-bind="value: realmName" id="realmName" type="text" /></td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: svnRealmNameHelpMarkdown, minWidth: 400, pivotSiblingCssClass: 'value-field' }"></td>
        </tr>
        <tr>
            <td>
                <label for="username">${AdminResources.UserName}</label></td>
            <td>
                <input class="textbox" id="username" type="text" data-bind="value: userName" /></td>
        </tr>
        <tr>
            <td>
                <label for="pwd">${AdminResources.SubversionPassword}</label></td>
            <td>
                <input class="textbox" id="pwd" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }" /></td>
        </tr>
    </table>
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>`;

    private svnConnectedServiceDetailsTemplate: string = `<div class="svn-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private customConnectedServicDetailsTemplate: string = `<div class="custom-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p>${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span>
            <!-- ko if: connectionType() == "Jenkins" -->
            <span class="help icon icon-info-white" title="&#8220;Jenkins&#8221; is a registered trademark of Software in the Public Interest Inc&#13;&#10;The Jenkins logo is licensed under the Creative Commons Attribution-ShareAlike Unported License by the Jenkins project (https://jenkins-ci.org/)" />
            <!-- /ko -->
        </p>

        <p>${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p>${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <!-- ko if: !isExtensionDisabled() -->
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <!-- /ko -->
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private azurermConnectedServiceDetailsTemplate: string = `<div class="connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p>${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p>${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p>${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.AzureSubscriptionActionsText}</div>
        <div class="content">
            <p>${AdminResources.AzureSubscriptionListOfActionsText}</p>
            <ul>
                <li data-bind="click: updateAuthentication, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateServiceConfiguration}</a></li>
                <li data-bind="visible: shouldEnableManageEndpointRoles, click: manageEndpointRoles, event: { keydown: onKeyDown }"><a href="#">${AdminResources.ManageEndpointRoles} </a></li>
                <li data-bind="visible: shouldEnableManageServicePrincipal, click: manageServicePrincipal, event: { keydown: onKeyDown }"><a href="#">${AdminResources.ManageServicePrincipal} </a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private addGcpConnectionsDialogTemplate: string = `<div class="add_gcp_connections_dialog services_dialog">
    <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
    <table>
        <tr>
            <td>
                <label for="connectionName">${AdminResources.ConnectionName}</label></td>
            <td>
                <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
        </tr>
        <!-- ko if: isUpdate() -->
        <tr>
            <td>
                <label for="audience">${AdminResources.Audience}</label></td>
            <td>
                <input class="textbox" type="text" readonly="readonly" id="audience" data-bind="value: audience"/>
        </tr>
        <tr>
            <td>
                <label>${AdminResources.Issuer}</label></td>
            <td>
                <input class="textbox" type="text" readonly="readonly"  data-bind="value: issuer"/>
        </tr>
         <tr>
            <td>
                <label for="projectid">${AdminResources.projectid}</label></td>
            <td>
                <input class="textbox" type="text" readonly="readonly" id="projectid" data-bind="value: projectid"/>
        </tr>
        <tr>
            <td>
                <label for="privatekey">${AdminResources.privatekey}</label></td>
            <td>
                <input class="textbox"  placeholder="*****" required id="privatekey" type="text" /></td>
        </tr>
        <!-- /ko -->
        <tr>
            <td>
                <label for="scope">${AdminResources.GcpScope}</label></td>
            <td>
                <input class="textbox"  id="scope" type="text" data-bind="value: scope"/></td>
        </tr>
        <tr>
            <td>
                <label for="certificate">${AdminResources.GcpCertificate} </label></td>
            <td>
                <textarea class="textbox"   required id="certificate" rows="5" cols="10" data-bind="attr: { placeholder: isUpdate() ? '*****' : '' }"></textarea>
            </td>
        </tr>
        <tr>
                <td><a href="https://console.cloud.google.com/iam-admin/serviceaccounts">Get JSON File</a></td>
        </tr>
    </table>
    <div class="error-messages-div">
        <div data-bind="foreach: errors">
            <span data-bind="text: $data"></span>
            <br />
        </div>
    </div>
</div>`;

    private gcpConnectedServiceDetailsTemplate: string = `<div class="gcp-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private dockerConnectedServiceDetailsTemplate: string = `<div class="docker-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private kubernetesConnectedServiceDetailsTemplate: string = `<div class="kubernetes-connected-service-details">
    <!-- ko if: name() -->
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.InformationHeader}</div>
        <p> ${AdminResources.ConnectionType} <span data-bind="text: connectionType"></span></p>
        <p> ${AdminResources.CreatedBy} <span data-bind="text: createdBy"></span></p>
        <p> ${AdminResources.ConnectingUsing}  <span data-bind="text: connectedUsing"></span></p>
    </div>
    <div class="group">
        <div class="header" role="heading" aria-level={2}>${AdminResources.Actions}</div>
        <div class="content">
            <p>${AdminResources.AvailableActionsOnConnection}</p>
            <ul>
                <!-- ko if: !isExtensionDisabled() -->
                <li data-bind="click: updateConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="update-service-action">${AdminResources.UpdateConnection}</a></li>
                <!-- /ko -->
                <li data-bind="click: disconnectService, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="disconnect-action">${AdminResources.Disconnect}</a></li>
                <!-- ko if: shareAcrossProjectsEnabled() -->
                <li data-bind="click: shareAcrossProjects, event: { keydown: onKeyDown }"><a tabindex="0" role="button" class="share-action">${AdminResources.ShareAcrossProjects}</a></li>
                <!-- /ko -->
            </ul>
        </div>
    </div>
    <!-- /ko -->
</div>`;

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#service_endpoint_admin_tab").html(this.serviceEndpointAdminTabTemplate);
        $container.find("#add_git_connections_dialog").html(this.addGitConnectionsDialogTemplate);
        $container.find("#git-connected-service-details").html(this.gitConnectedServiceDetailsTemplate);
        $container.find("#add_deployment_environments_dialog").html(this.addDeploymentEnvironmentsDialogTemplate);
        $container.find("#CertificateTemplate").html(this.certificateTemplate);
        $container.find("#CredentialTemplate").html(this.credentialTemplate);
        $container.find("#ServicePrincipalTemplate").html(this.servicePrincipalTemplate);
        $container.find("#connected-service-details").html(this.connectedServiceDetailsTemplate);
        $container.find("#add_chef_connections_dialog").html(this.addChefConnectionsDialogTemplate);
        $container.find("#chef-connected-service-details").html(this.chefConnectedServiceDetailsTemplate);
        $container.find("#add_generic_connections_dialog").html(this.addGenericConnectionsDialogTemplate);
        $container.find("#generic-connected-service-details").html(this.genericConnectedServiceDetailsTemplate);
        $container.find("#add_github_connections_dialog").html(this.addGithubConnectionsDialogTemplate);
        $container.find("#github-connected-service-details").html(this.githubConnectedServiceDetailsTemplate);
        $container.find("#add_bitbucket_connections_dialog").html(this.addBitbucketConnectionsDialogTemplate);
        $container.find("#bitbucket-connected-service-details").html(this.bitbucketConnectedServiceDetailsTemplate);
        $container.find("#add_ssh_connections_dialog").html(this.addSshConnectionsDialogTemplate);
        $container.find("#ssh-connected-service-details").html(this.sshConnectedServiceDetailsTemplate);
        $container.find("#add_svn_connections_dialog").html(this.addSvnConnectionsDialogTemplate);
        $container.find("#svn-connected-service-details").html(this.svnConnectedServiceDetailsTemplate);
        $container.find("#custom-connected-service-details").html(this.customConnectedServicDetailsTemplate);
        $container.find("#azurerm-connected-service-details").html(this.azurermConnectedServiceDetailsTemplate);
        $container.find("#add_gcp_connections_dialog").html(this.addGcpConnectionsDialogTemplate);
        $container.find("#gcp-connected-service-details").html(this.gcpConnectedServiceDetailsTemplate);
        $container.find("#docker-connected-service-details").html(this.dockerConnectedServiceDetailsTemplate);
        $container.find("#kubernetes-connected-service-details").html(this.kubernetesConnectedServiceDetailsTemplate);

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className={"hub-view services-view"} ref={this._ensureEnhancements}>
                <div className="hub-content">
                    <div className="hub-pivot" role="navigation">
                        <div className="views">
                            <ul className="empty pivot-view enhance endpoints-tab" role="tablist">
                                <li className="selected" data-id="resources" role="presentation">
                                    <a aria-posinset={1} aria-setsize={2} href="#_a=resources" role="tab">{AdminResources.EndpointTabTitle}</a>
                                </li>
                                <li data-id="connectedservices" role="presentation">
                                    <a aria-posinset={2} aria-setsize={2} href="#_a=connectedservices" role="tab">{AdminResources.AzureXamlBuildServicesTabTitle}</a>
                                </li>
                            </ul>

                        </div>
                        <div className="filters">

                        </div>
                    </div>
                    <div className="hub-pivot-content" role="main">
                        <div className="resources-content">
                            <div className="splitter horizontal hub-splitter">
                                <div className="leftPane" role="complementary">
                                    <div className="resources-left-pane">
                                        <div className="resources-left-pane-toolbar toolbar"></div>
                                        <div className="search-input-wrapper"></div>
                                        <div className="resources-view tree-pane">
                                            <div className="resources tree">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="handleBar"></div>
                                <div className="rightPane" role="region" aria-label="endpoint-page">
                                    <div className="hub-title header" role="heading" aria-level={1}>
                                    </div>
                                    <div className="resources-right-pane"></div>
                                </div>
                            </div>
                        </div>
                        <script id="service_endpoint_admin_tab" type="text/html"></script>
                        <script id="add_git_connections_dialog" type="text/html"></script>
                        <script id="git-connected-service-details" type="text/html"></script>
                        <script id="add_deployment_environments_dialog" type="text/html"></script>
                        <script type="text/html" id="CertificateTemplate"></script>
                        <script type="text/html" id="CredentialTemplate"></script>
                        <script type="text/html" id="ServicePrincipalTemplate"></script>
                        <script id="connected-service-details" type="text/html"></script>
                        <script id="add_chef_connections_dialog" type="text/html"></script>
                        <script id="chef-connected-service-details" type="text/html"></script>
                        <script id="add_generic_connections_dialog" type="text/html"></script>
                        <script id="generic-connected-service-details" type="text/html"></script>
                        <script id="add_github_connections_dialog" type="text/html"></script>
                        <script id="github-connected-service-details" type="text/html"></script>
                        <script id="add_bitbucket_connections_dialog" type="text/html"></script>
                        <script id="bitbucket-connected-service-details" type="text/html"></script>
                        <script id="add_ssh_connections_dialog" type="text/html"></script>
                        <script id="ssh-connected-service-details" type="text/html"></script>
                        <script id="add_svn_connections_dialog" type="text/html"></script>
                        <script id="svn-connected-service-details" type="text/html"></script>
                        <script id="custom-connected-service-details" type="text/html"></script>
                        <script id="azurerm-connected-service-details" type="text/html"></script>
                        <script id="add_gcp_connections_dialog" type="text/html"></script>
                        <script id="gcp-connected-service-details" type="text/html"></script>
                        <script id="docker-connected-service-details" type="text/html"></script>
                        <script id="kubernetes-connected-service-details" type="text/html"></script>
                    </div>
                </div>
            </div>
        );
    }
}
