import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import "Admin/Scripts/TFS.Admin.Security";
import "Build/Scripts/Controls.Admin";
import "Build/Scripts/AdminView"
import "Build/Scripts/KnockoutExtensions";

import "VSS/LoaderPlugins/Css!Build/FilterPanel";
import "VSS/LoaderPlugins/Css!BuildStyles";
import "VSS/LoaderPlugins/Css!VSS.Controls";

SDK_Shim.registerContent("buildagentQueueView.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {

    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<AdminAgentQueueComponentProps>("ms.vss-build-web.agent-queue-hub-data-provider");

    let loadScript = function(contributionId: string, url:string) : Promise<void> {
        return  new Promise<void>((resolve, reject) => {
            let contentElement: HTMLElement = document.createElement("script");
            (contentElement as HTMLScriptElement).async = false;
            (contentElement as HTMLScriptElement).src = url;

            contentElement.setAttribute("data-contentlength", "0");
            contentElement.setAttribute("data-sourcecontribution", contributionId);

            contentElement.addEventListener("load", (event: Event) => {
                resolve();
            });
            contentElement.addEventListener("error", (event: Event) => {
                reject();
            });

            document.head.appendChild(contentElement);
        });
    };

    // Load the signalr scripts
    let loadPromises : Promise<void>[] = [];
    loadPromises.push(loadScript( "signalR", pageData.jQuerySignalrUrl));
    loadPromises.push(loadScript( "signalRHub", pageData.signalrHubUrl));

    Promise.all(loadPromises).then(() => {
        ReactDOM.render(
            <AdminAgentQueueComponent {...pageData} />,
            context.container);
    });

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});

interface AdminAgentQueueComponentProps {
    jQuerySignalrUrl: string;
    signalrHubUrl: string;
}

class AdminAgentQueueComponent extends React.Component<AdminAgentQueueComponentProps, {}> {

    private adminDialogTemplate = `<div class="queue-build">
        <table class="filter">
            <tr>
                <td colspan="2">
                    <input type="radio" name="poolType" id="existingRadio" value="existing" data-bind="checked: createMode, enable: hasUnassignedPools"/>
                    <label for="existingRadio" class="inline">${BuildResources.ExistingPoolLabel}</label>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <input type="radio" name="poolType" id="newRadio" value="new" data-bind="checked: createMode"/>
                    <label for="newRadio" class="inline">${BuildResources.NewPoolLabel}</label>
                </td>
            </tr>
            <tr data-bind="if: useExistingPool">
                <td colspan="2">
                    <label for="pool">${BuildResources.SelectPoolLabel}</label>
                    <select id="pool" data-bind="options: pools, optionsText: 'displayName', enable: useExistingPool, value: selectedPool"></select>
                </td>
            </tr>
            <tr data-bind="if: !useExistingPool()">
                <td colspan="2">
                    <label for="queueName">${BuildResources.PoolNameLabel}</label>
                    <input type="text" id="queueName" data-bind="value: $data.queueName, disable: useExistingPool, valueUpdate: 'afterkeydown'" />
                </td>
            </tr>
            <tr data-bind="if: resourceAuthorizationFeatureEnabled">
                <td colspan="2">
                    <input id="allow-pipeline-access" type="checkbox" data-bind="checked: authorizeAllPipelines" />
                    <label for="allow-pipeline-access" class="inline">${BuildResources.AllowPipelineAccess}</label>
                </td>
            </tr>
        </table>
    </div>`;

    private agentTemplate: string = `<div class="buildvnext-admin-hosts-view buildvnext-tab">
    <div class="horizontal splitter" data-bind="tfsSplitter: { 'options': { fixedSide: 'left', minWidth: 570 } }">
        <div class="leftPane">
            <!-- agents grid -->
            <div class="agents-grid" data-bind="visible: agents().length > 0"></div>
            <div class="agents-empty" data-bind="visible: agents().length == 0">${BuildResources.AdminViewNoAgents}</div>
        </div>
        <div class="handleBar"></div>
        <div class="rightPane" data-bind="visible: selectedAgent">
            <div class="hub-pivot">
                <div class="views admin-agents-pivot-holder"></div>
            </div>
            <div class="hub-pivot-content">
                <div class="history" data-bind="visible: requestsSelected() && requestsLoaded()">
                    <div data-bind="visible: completedRequests().length > 0" class="agent-requests-grid"></div>
                    <div class="agents-empty" data-bind="visible: completedRequests().length == 0">${BuildResources.AdminViewNoRequests}</div>
                </div>
                <div class="capabilities" tabindex="-1" data-bind="visible: capabilitiesSelected() && capabilitiesLoaded()">
                    <div>
                        <div class="capabilities-group">
                            <div class="permission-header">
                                <h2 class="header">${BuildResources.UserCapabilities}</h2>
                                <div class="secondary-guidance">${BuildResources.UserCapabilitiesGuidance}</div>
                            </div>
                            <div class="capabilities-grid">
                                <!-- ko with: selectedAgent -->
                                <table class="buildvnext-variables-grid buildvnext-variables-grid-table">
                                    <tbody data-bind="foreach: userCapabilities">
                                        <tr>
                                            <td class="icon-row">
                                                <button data-bind="click: $parent.removeUserCapability, triggerClickOnKeyUp: $parent.removeUserCapability" aria-label="${BuildResources.GridRemoveVariableText}">
                                                    <span class="icon icon-delete-grey-f1-background red-delete-icon-hover" title="${BuildResources.GridRemoveVariableText}"></span>
                                                </button>
                                            </td>
                                            <td>
                                                <input type="text" aria-label="${BuildResources.UserCapabilityKeyLabel}" aria-required="true" required data-bind="triggerFocus: triggerFocus, css: { 'invalid': isKeyInvalid() }, value: key, valueUpdate: 'afterkeydown', attr: { 'aria-invalid': isKeyInvalid() }" />
                                            </td>
                                            <td>
                                                <input type="text" aria-label="${BuildResources.UserCapabilityValueLabel}" aria-required="true" required data-bind="css: { 'invalid': isValueInvalid() }, value: value, valueUpdate: 'afterkeydown', attr: { 'aria-invalid': isValueInvalid() }" />
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tbody>
                                        <tr>
                                            <td colspan="4">
                                                <button data-bind="click: addUserCapability, triggerClickOnKeyUp: addUserCapability">
                                                    <span class="icon icon-add"></span>&nbsp;
                                                    ${BuildResources.GridAddCapabilityText}
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <!-- /ko -->
                            </div>
                            <div>
                                <div class="permission-button">
                                    <button data-bind="enable: saveButtonEnabled(), click: saveUserCapabilities" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
                                        <span class="ui-button-text">${BuildResources.AdminHostsSaveChanges}</span>
                                    </button>
                                </div>
                                <div class="permission-button">
                                    <button data-bind="enable: userCapabilitiesDirty, click: undoUserCapabilities" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
                                        <span class="ui-button-text">${BuildResources.AdminHostsUndoChanges}</span></button>
                                </div>
                            </div>
                        </div>
                        <div class="capabilities-group" data-bind="visible: systemCapabilitiesVisible()">                                                            
                            <div class="permission-header">
                                <h2 class="header">${BuildResources.SystemCapabilities}</h2>
                                <div class="secondary-guidance">${BuildResources.SystemCapabilitiesGuidance}</div>
                            </div>
                            <div class="capabilities-grid">
                                <!-- ko with: selectedAgent -->
                                <table class="buildvnext-variables-grid buildvnext-variables-grid-table system-capabilities-table">
                                    <tbody>
                                        <tr>
                                            <th>${BuildResources.CapabilityNameText}</th>
                                            <th>${BuildResources.UserCapabilityValueLabel}</th>
                                        </tr>
                                    </tbody>
                                    <tbody data-bind="foreach: systemCapabilities">
                                        <tr>
                                            <td>
                                                <span data-bind="text: key" />
                                            </td>
                                            <td>
                                                <span class="system-cap-value" data-bind="text: value" />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <!-- /ko -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

    private buildvnextAdminPoolDetailsTabTemplate : string = `<div class="buildvnext-admin-hosts-view buildvnext-tab pool-details">
        <div data-bind="visible: ownerVisible" class="owner-identity-container">
            <label class="pool-owner-label">${BuildResources.PoolOwnerLabel}</label>
            <div class="pool-identity-control">
                <div data-bind="visible: hasPoolManagePermission" class="identity-picker"></div>
                <div data-bind="visible: !hasPoolManagePermission" class="identity-display"></div>
            </div>
        </div>
        <div class="pool-metadata-container">
            <label class="pool-metadata-label">${BuildResources.PoolMetadataLabel}</label>
            <div data-bind="html: poolMetadata" class="pool-metadata-markdown"></div>
        </div>
    </div>`;

    private buildvnextAdminPoolPoliciesTabTemplate : string = `<div class="buildvnext-admin-hosts-view buildvnext-tab pool-policies">
        <h3 class="pipeline-policies-label">${BuildResources.PipelinePoliciesHeader}</h3>
        <div>
            <input id="allow-pipeline-access" type="checkbox" data-bind="enable: hasQueueManagePermission, checked: currentAllowPipelineAccess" />
            <label for="allow-pipeline-access">${BuildResources.AllowPipelineAccess}</label>
        </div>
        <div class="permission-button bowtie">
            <button data-bind="enable: settingsDirty, click: saveSettings" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
                <span class="ui-button-text">${BuildResources.AdminHostsSaveChanges}</span>
            </button>
            <button data-bind="enable: settingsDirty, click: undoSettings" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
                <span class="ui-button-text">${BuildResources.AdminHostsUndoChanges}</span>
            </button>
        </div>
    </div>`;

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#buildvnext_admin_agents_tab").html(this.agentTemplate);
        $container.find("#buildvnext_admin_pool_details_tab").html(this.buildvnextAdminPoolDetailsTabTemplate);
        $container.find("#buildvnext_admin_pool_policies_tab").html(this.buildvnextAdminPoolPoliciesTabTemplate);
        $container.find("#create_agent_pool_queue_dialog").html(this.adminDialogTemplate);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        const showPoliciesTab: boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.ResourceAuthorizationExperience, false);

        return (
            <div className={"hub-view explorer agentqueue-admin-view"} ref={this._ensureEnhancements}>
                <script className="options"  type="application/json"></script>
                <div className="hub-content">
                    <div className="splitter horizontal hub-splitter stateful toggle-button-enabled toggle-button-hotkey-enabled ">
                        <script className="options"  type="application/json"></script>
                        <div className="leftPane" role="navigation" >
                            <div className="left-hub-content">
                                <div className="buildvnext-admin-left-pane">
                                    <div className="buildvnext-admin-left-pane-toolbar toolbar">
                                        <script id="create_agent_pool_queue_dialog" type="text/html">
                                        </script>
                                    </div>
                                    <div className="buildvnext-admin-left-pane-links">
                                        <div className="links">
                                            <a className="manage-pool-link" href="#" target="_blank" title={BuildResources.ManageResourceTitle}>{BuildResources.ManagePoolText}</a>
                                        </div>
                                    </div>
                                    <div className="buildvnext-admin-left-pane-agentqueues"></div>
                                </div>
                            </div>
                        </div>
                        <div className="handleBar" ></div>
                        <div className="rightPane" role="main" >
                            <div className="hub-title">
                                <span className="label"></span>
                                <div className="title-buttons-area bowtie">
                                    <button className="agent-download-button cta">
                                        <span className="bowtie-icon bowtie-transfer-download"></span>
                                        <span className="text">{BuildResources.GetAgentText}</span>
                                    </button>
                                </div>
                                <div className="build-platform-message-handlers-section build-admin-agent-page"></div>
                            </div>
                            <div className="hub-progress pageProgressIndicator"></div>
                            <div className="right-hub-content">
                                <div className="hub-pivot">
                                    <div className="views">
                                        <ul className="empty pivot-view enhance buildvnext-admin-tabs" role="tablist">
                                            <li className="selected" data-id="agents" role="presentation"><a aria-posinset={1} aria-setsize={3} href="#_a=agents" role="tab">{BuildResources.AgentsTitle}</a></li>
                                            <li data-id="roles" role="presentation"><a aria-posinset={2} aria-setsize={3} href="#_a=roles" role="tab">{BuildResources.RolesTitle}</a></li>
                                            <li data-id="details" role="presentation"><a aria-posinset={3} aria-setsize={3} href="#_a=details" role="tab">{BuildResources.PoolDetailsTitle}</a></li>
                                            { showPoliciesTab && <li data-id="policies" role="presentation"><a aria-posinset={4} aria-setsize={4} href="#_a=policies" role="tab">{BuildResources.PoolPoliciesTitle}</a></li> }
                                        </ul>
                                    </div>
                                    <div className="filters">
                                    </div>
                                </div>
                                <div className="hub-pivot-content">
                                    <div className="buildvnext-admin-right-pane"></div>
                                    <script id="buildvnext_admin_agents_tab" type="text/html">
                                    </script>
                                    <script id="buildvnext_admin_roles_tab" type="text/html">
                                        <div className="buildvnext-admin-hosts-view buildvnext-tab">
                                            <div className="horizontal splitter" data-bind="tfsSplitter: $data">
                                                <div className="leftPane">
                                                    <div className="agents-grid roles-grid" />
                                                </div>
                                                <div className="handleBar"></div>
                                                <div className="rightPane">
                                                    <div className="buildvnext-admin-membership" />
                                                </div>
                                            </div>
                                        </div>
                                    </script>
                                    <script id="buildvnext_admin_pool_details_tab" type="text/html">
                                    </script>
                                    <script id="buildvnext_admin_pool_policies_tab" type="text/html">
                                    </script>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}