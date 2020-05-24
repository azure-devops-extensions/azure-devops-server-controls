import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

import * as VSS from "VSS/VSS";

import * as VSS_Controls from "VSS/Controls";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { ITabProps } from "../Types";

import "Admin/Scripts/TFS.Admin.Security";
import "Build/Scripts/AdminView"
import "Build/Scripts/Controls.Admin";
import "Build/Scripts/KnockoutExtensions";

import "VSS/LoaderPlugins/Css!Build/FilterPanel";
import "VSS/LoaderPlugins/Css!BuildStyles";
import "VSS/LoaderPlugins/Css!VSS.Controls";


export class AgentPoolsTab extends ComponentBase.Component<ITabProps, any> {

    constructor(props: ITabProps) {
        super(props);
    }

    private createAgentPoolDialogTemplate = `<div class="queue-build create-agent-pool">
    <table class="filter">
        <tr>
            <td colspan="2">
                <input type="radio" name="poolType" id="privateRadio" value="private" data-bind="checked: createMode"/>
                <label for="privateRadio" class="inline">Private</label>
            </td>
            <td colspan="2">
                <input type="radio" name="poolType" id="agentCloudRadio" value="agentcloud" data-bind="checked: createMode"/>
                <label for="agentCloudRadio" class="inline">Using Agent Cloud</label>
            </td>
        </tr>
        <tr data-bind="if: useAgentCloud">
            <td colspan="2" style="padding-top: 11px"> 
                <label for="pool">Select an AgentCloud</label>
                <select id="pool" data-bind="options: agentClouds, optionsText: 'name', enable: useAgentCloud, value: selectedAgentCloud"></select>
            </td>
        </tr>
        <tr>
            <td colspan="2" style="padding: 11px 0px">
                <label for="name">${BuildResources.NameLabel}</label>
                <input type="text" id="poolName" data-bind="value: $data.poolName, valueUpdate: 'afterkeydown'" />
            </td>
        </tr>
        <tr>
            <td colspan="2" class="boolean-option">
                <input type="checkbox" id="autoprovision" data-bind="checked: $data.autoProvision" />
                <label for="autoprovision">${BuildResources.AutoProvisionLabel}</label>
            </td>
        </tr>
    </table>
</div>`;

    private buildvnextAdminAgentsTabTemplate: string = `<div class="buildvnext-admin-hosts-view buildvnext-tab">
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
                    <!-- user capabilities -->
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
                            <!-- system capabilities -->
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

    private buildvnextAdminRolesTabTemplate : string = `<div class="buildvnext-admin-hosts-view buildvnext-tab">
    <div class="horizontal splitter" data-bind="tfsSplitter: $data">
        <div class="leftPane">
            <div class="agents-grid roles-grid" />
        </div>
        <div class="handleBar"></div>
        <div class="rightPane">
            <div class="buildvnext-admin-membership" />
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

    private buildvnextAdminPoolSettingsTabTemplate : string = `<div class="buildvnext-admin-hosts-view buildvnext-tab pool-maintenance-setting">
    <h3>${BuildResources.PoolMaintenanceSettingLabel}</h3>
    <table data-bind="with: maintenanceDefinitionViewModel">
        <tr>
            <td>
                <input id="maintenance-enable" type="checkbox" data-bind="checked: enable" />
                <label for="maintenance-enable">${BuildResources.PoolMaintenanceJobEnableLabel}</label>
            </td>
        </tr>
    </table>
    <table class="maintenance-setting" data-bind="with: maintenanceDefinitionViewModel, css: { 'disabled': !maintenanceDefinitionViewModel.enable() }">
        <tr>
            <td>
                <label for="maintenance-timeout">${BuildResources.PoolMaintenanceJobTimeoutLabel} </label>&nbsp;
                <input id="maintenance-timeout" type="text" data-bind="enable: enable, value: timeout, valueUpdate: 'afterkeydown', css: { 'invalid': timeoutInvalid() }" />&nbsp;
                <label>${BuildResources.MinutesText}</label>
            </td>
        </tr>
        <tr>
            <td>
                <label for="maintenance-maxConcurrent">${BuildResources.PoolMaintenanceJobMaxAgentsConcurrentPercentageLabel} </label>&nbsp;
                <input id="maintenance-maxConcurrent" type="text" data-bind="enable: enable, value: agentConcurrentPercentage, valueUpdate: 'afterkeydown', css: { 'invalid': agentConcurrentPercentageInvalid() }" />&nbsp;
                <label>${BuildResources.PercentText}</label>
            </td>
            <td class="helpMarkDown" data-bind="showTooltip: { text: concurrentPercentageHelpMarkDown, minWidth: 395, leftOffset: 47 }" />
        </tr>
        <tr>
            <td>
                <label for="maintenance-retention">${BuildResources.PoolMaintenanceJobRetentionSettingLabel} </label>&nbsp;
                <input id="maintenance-retention" type="text" data-bind="enable: enable, value: jobRecordsToKeep, valueUpdate: 'afterkeydown', css: { 'invalid': jobRecordsToKeepInvalid() }" />&nbsp;
            </td>
        </tr>
        <tr>
            <td>
                <input id="maintenance-input-checkbox" type="checkbox" data-bind="enable: enable, checked: deleteStaleDefaultWorkingDirectory" />
                <label for="maintenance-input-checkbox">${BuildResources.PoolMaintenanceJobDeleteStaleDefaultWorkingDirLabel}</label>&nbsp;
                <input type="text" data-bind="enable: enable() && deleteStaleDefaultWorkingDirectory(), value: staleDefaultWorkingDirectoryDays, valueUpdate: 'afterkeydown', css: { 'invalid': staleDefaultWorkingDirectoryDaysInvalid() }" />&nbsp;
                <label for="maintenance-input-checkbox" class="maintenance-label-days">${BuildResources.DaysText}</label>
            </td>
        </tr>
    </table>
    <table class="maintenance-schedule-setting" data-bind="with: maintenanceDefinitionViewModel, css: { 'disabled': !maintenanceDefinitionViewModel.enable() }">
        <tr>
            <td>
                <label>${BuildResources.MaintenanceScheduleSetting} </label>
            </td>
        </tr>
        <tr>
            <td class="maintenance-schedule-col">
                <label class="maintenance-schedule-time">${BuildResources.ScheduledTriggerTime}</label>
                <select class="maintenance-schedule-time" data-bind="enable: enable, options: hoursOptions, value: displayTimeHours" />
                <label class="maintenance-schedule-time">: </label>
                <select class="maintenance-schedule-time" data-bind="enable: enable, options: minutesOptions, value: displayTimeMinutes" />
                <select class="maintenance-schedule-time" data-bind="enable: enable, options: timeZones, optionsText: 'DisplayName', value: timeZoneId, optionsValue: 'Id'" />
            </td>
        </tr>
        <tr>
            <td class="maintenance-schedule-col">
                <div data-bind="with: days" class="maintenance-schedule-days">
                    <span class="checkbox-group">
                        <label for="sunday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleSundayLabel}</label>
                        <input id="sunday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: sunday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="monday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleMondayLabel}</label>
                        <input id="monday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: monday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="tuesday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleTuesdayLabel}</label>
                        <input id="tuesday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: tuesday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="wednesday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleWednesdayLabel}</label>
                        <input id="wednesday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: wednesday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="thursday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleThursdayLabel}</label>
                        <input id="thursday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: thursday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="friday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleFridayLabel}</label>
                        <input id="friday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: friday" />
                    </span>
                    <span class="checkbox-group">
                        <label for="saturday" class="maintenance-schedule-day-label">${BuildResources.MaintenanceScheduleSaturdayLabel}</label>
                        <input id="saturday" type="checkbox" class="buildvnext-schedule-day-checkbox" data-bind="enable: $parent.enable(), checked: saturday" />
                    </span>
                </div>
            </td>
        </tr>
    </table>
    <div class="permission-button">
        <button data-bind="enable: settingsDirty() && !isInvalid(), click: saveSettings" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
            <span class="ui-button-text">${BuildResources.AdminHostsSaveChanges}</span>
        </button>
        <button data-bind="enable: settingsDirty(), click: undoSettings" class="submit-button ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" type="button">
            <span class="ui-button-text">${BuildResources.AdminHostsUndoChanges}</span>
        </button>
    </div>
</div>`;

    private buildvnextAdminMaintenanceTabTemplate : string = `<div class="buildvnext-admin-hosts-view buildvnext-tab">
    <div class="maintenance-history-grid"> </div>
</div>`;

    private maintenancejobTargetAgentsDialogTemplate : string = `<div class="target-agents-table">
    <!-- target agents detail -->
    <table class="buildvnext-variables-grid-table">
        <tbody>
            <tr>
                <th>${BuildResources.TargetAgentDetailAgentName}</th>
                <th data-bind="visible: showStatus">${BuildResources.TargetAgentDetailJobStatus}</th>
            </tr>
        </tbody>
        <tbody data-bind="foreach: targetAgents">
            <tr>
                <td>
                    <span data-bind="text: agentName" />
                </td>
                <td data-bind="visible: showStatus">
                    <span data-bind="css: statusIconClass, attr: { 'aria-label': statusIconText }" />
                    <span data-bind="text: statusIconText" />
                </td>
                <td class="helpMarkDown" data-bind="visible: showHelpMarkdown, showTooltip: { text: queuedMaintenanceJobHelpMarkDown }" />
            </tr>
        </tbody>
    </table>
</div>`;

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#create_agent_pool_dialog").html(this.createAgentPoolDialogTemplate);
        $container.find("#buildvnext_admin_agents_tab").html(this.buildvnextAdminAgentsTabTemplate);
        $container.find("#buildvnext_admin_roles_tab").html(this.buildvnextAdminRolesTabTemplate);
        $container.find("#buildvnext_admin_pool_details_tab").html(this.buildvnextAdminPoolDetailsTabTemplate);
        $container.find("#buildvnext_admin_pool_settings_tab").html(this.buildvnextAdminPoolSettingsTabTemplate);
        $container.find("#buildvnext_admin_maintenance_tab").html(this.buildvnextAdminMaintenanceTabTemplate);        
        $container.find("#maintenancejob_target_agents_dialog").html(this.maintenancejobTargetAgentsDialogTemplate);
        $container.find(".valid-time-zones").html(this.props.timeZoneData);

        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className={"hub-view explorer agentpool-admin-view"} ref={this._ensureEnhancements}>           
                <div className="hub-content">        
                    <div className="splitter horizontal hub-splitter stateful toggle-button-enabled toggle-button-hotkey-enabled ">
                        <script className="options"  type="application/json"></script>
                        <div className="leftPane" role="navigation" >
                            <div className="left-hub-content">                                
                                <div className="buildvnext-admin-left-pane">
                                    <div className="buildvnext-admin-left-pane-toolbar toolbar">
                                        <script id="create_agent_pool_dialog" type="text/html">
                                        </script>
                                    </div>
                                    <div className="buildvnext-admin-left-pane-poolscoped tree-pane">
                                        <div className="buildvnext-admin-left-pane-agentpools"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="handleBar" ></div>
                        <div className="rightPane" role="main">
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
                                        <ul className="empty&#32;pivot-view&#32;enhance&#32;buildvnext-admin-tabs" role="tablist">
                                            <li className="selected" data-id="agents" role="presentation">
                                                <a aria-posinset={1} aria-setsize={5} href="#_a=agents" role="tab">{BuildResources.AgentsTitle}</a>
                                            </li>
                                            <li data-id="roles" role="presentation">
                                                <a aria-posinset={2} aria-setsize={5} href="#_a=roles" role="tab">{BuildResources.RolesTitle}</a>
                                            </li>
                                            <li data-id="details" role="presentation">
                                                <a aria-posinset={3} aria-setsize={5} href="#_a=details" role="tab">{BuildResources.PoolDetailsTitle}</a>
                                            </li>
                                            <li data-id="poolsettings" role="presentation">
                                                <a aria-posinset={4} aria-setsize={5} href="#_a=poolsettings" role="tab">{BuildResources.PoolSettingsTitle}</a>
                                            </li>
                                            <li data-id="maintenance" role="presentation">
                                                <a aria-posinset={5} aria-setsize={5} href="#_a=maintenance" role="tab">{BuildResources.PoolMaintenanceTitle}</a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="filters">
                                    </div>
                                </div>                
                                <div className="hub-pivot-content">                                
                                    <div className="buildvnext-admin-right-pane"></div>
                                    <script id="buildvnext_admin_agents_tab" type="text/html"></script>
                                    <script id="buildvnext_admin_roles_tab" type="text/html"></script>
                                    <script id="buildvnext_admin_pool_details_tab" type="text/html"></script>
                                    <script id="buildvnext_admin_pool_settings_tab" type="text/html"></script>
                                    <script id="buildvnext_admin_maintenance_tab" type="text/html"></script>
                                    <script id="maintenancejob_target_agents_dialog" type="text/html"></script>
                                    <script className="valid-time-zones" type="application/json"></script>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}