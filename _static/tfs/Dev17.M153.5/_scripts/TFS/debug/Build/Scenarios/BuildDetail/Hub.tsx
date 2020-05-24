import { BuildView3 } from "Build/Scenarios/BuildDetail/BuildView3";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { buildViewUtils } from "Build/Scripts/Views";
import { BuildViewType } from "Build/Scripts/Views.Common";
import { BuildDefinitionDetailsView } from "Build/Scripts/Views.Details";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");

import "VSS/LoaderPlugins/Css!BuildStyles";

class BuildDetailHub extends Controls.Control<any> {
    public initialize() {
        super.initialize();

        const content = `<div class="hub-view explorer buildvnext-view build-definition-details-view">
            <div class="hub-content">
                <div class="splitter horizontal hub-splitter stateful toggle-button-enabled toggle-button-hotkey-enabled">
                <script class="options" defer="defer" type="application/json">
                    {"settingPath":"Web/UIState/Build/LeftHubSplitter","initialSize":449}
                </script>
                <div class="leftPane hotkey-section hotkey-section-0" role="navigation">
                    <div class="left-hub-content">
                        <div class="buildvnext-view-left-pane-content definition-tree" data-bind="template: 'buildvnext_definition_explorer_tree', visible: visible"></div>
                        <div class="buildvnext-view-left-pane-content plan-tree" data-bind="template: 'buildvnext_plan_nodes_tab', visible: visible"></div>
                    </div>
                </div>
                <div class="handleBar" aria-label="Splitter" aria-orientation="vertical"></div>
                <div class="rightPane hotkey-section hotkey-section-0" role="main">
                    <div class="hub-title ko-target"></div>
                    <div class="hub-message"></div>
                    <div class="right-hub-content">
                    </div>
                </div>
            </div>
            </div>
        </div>`;
        this._element.append($(content));

        this._appendTemplates();

        Controls.Enhancement.enhance(BuildView3, this._element.find(".buildvnext-view"));
        buildViewUtils.registerBuildView(BuildViewType.Result, BuildDefinitionDetailsView);
    }

    private _appendTemplates(): void {
        const buildvnext_plan_nodes_tab = `<script id="buildvnext_plan_nodes_tab" type="text/html">
            <span class="status icon" data-bind="css: statusIconClass"></span>
            <!-- ko if: buildNumber -->
            <span class="tree-heading"><a tabIndex="0" role="button" data-bind="text: buildNumber, click: onBuildTitleClicked, triggerClickOnKeyUp: onBuildTitleClicked" aria-label="${BuildResources.JumpToRootBuild}"></a></span>
            <!-- /ko -->
        
            <!-- ko if: nodesTree -->
            <div data-bind="template: { name: 'buildvnext_plan_nodes_tree', data: nodesTree }"></div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_plan_nodes_tab));

        const buildvnext_view_result_rightpane = `<script type="text/html" id="buildvnext_view_result_rightpane">
            <!-- ko with: selectedView -->
            <!-- ko if: showErrorPanel() -->
            <div class="inline-error" data-bind="text: errorMessage"></div>
            <!-- /ko -->
            <!-- /ko -->
        
            <!-- ko ifnot: selectedView().showErrorPanel() -->
            <div data-bind="template: 'buildvnext_details_header'" class="buildvnext-details-header"></div>
            <!-- ko with: selectedView -->
            <div class="hub-pivot">
                <div class="views">
                    <div class="build-details-tabs tfs_knockout_hubpageexplorerpivot_holder"></div>
                </div>
                <!-- ko if: showCopyButton -->
                <div class="buildvnext-view-copy-button">
                    <button class="bowtie-tooltipped tooltip-align-top bowtie-tooltipped-sw multiple-toggle-copy-button" data-bind="click: _onCopyButtonClick, attr: { 'aria-label': _copyLabel}, event: { blur: _resetCopy }"><span class="bowtie-icon bowtie-edit-copy"></span></button>
                </div>
                <!-- /ko -->
            </div>
            <div class="buildvnext-view-right-pane-content">
                <div class="buildvnext-view-right-pane">
                    <!-- ko ifnot: showErrorPanel() -->
                    <!-- ko foreach: tabs -->
                    <div class="tab-content-container" data-bind="visible: isSelected">
                        <div data-bind="applyTemplate: { templateName: templateName, viewModel: $data, cssClass: 'tab-content-holder' }"></div>
                    </div>
                    <!-- /ko -->
                    <!-- /ko -->
                </div>
            </div>
            <!-- /ko -->
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_view_result_rightpane));

        const buildvnext_details_header = `<script type="text/html" id="buildvnext_details_header">
            <div id="build-detail-toolbar-container"></div>
            <div tabindex="0" class="buildvnext-build-details-status" data-bind="text: statusText, css: statusClass, attr: { 'aria-label': statusText }" aria-live="polite"></div>
            <div class="buildvnext-build-details-header">
                <div class="build-histogram definition-histogram"></div>
                <div class="summary">
                    <div class="reason">
                        <!-- ko if: currentTimelineRecordName -->
                        <span data-bind="text: currentTimelineRecordName"></span>
                        <!-- /ko -->
                        <!-- ko ifnot: currentTimelineRecordName -->
                        <span data-bind="text: buildNumber"></span>
                        <!-- /ko -->
                        <!-- ko if: buildReasonCss -->
                        <span data-bind="css: buildReasonCss, attr: { title: buildReasonDisplayText() }"></span>
                        <!-- /ko -->
                    </div>
                    <div class="duration" data-bind="text: durationText"></div>
                </div>
            </div>
            <!-- ko if: showRealtimeConnectionErrorMessage -->
            <div class="message-area-part message-area-control bowtie info-message">${BuildResources.RealtimeConnectionErrorMessage}</div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_header));

        const buildvnext_view_result_hubtitle = `<script type="text/html" id="buildvnext_view_result_hubtitle">
            <span class="build-summary-page-hub-title">
                <!-- ko if: definitionName -->
                <a data-bind="text: definitionName, click: onDefinitionNameClicked, attr: { href: definitionSummaryUrl }"></a>
                <!-- /ko -->
        
                <!-- ko if: currentTimelineRecordName -->
                <!-- ko if: definitionName -->
                <span>/ </span>
                <!-- /ko -->
                <a role="button" data-bind="text: buildNumber, click: onBuildTitleClicked, triggerClickOnKeyUp: onBuildTitleClicked" aria-label="${BuildResources.JumpToRootBuild}"></a>
                <!-- /ko -->
        
                <!-- ko ifnot: currentTimelineRecordName -->
                <!-- ko if: definitionName -->
                <span>/ </span>
                <!-- /ko -->
                <span role="heading" data-bind="text: buildNumber"></span>
                <!-- ko if: currentTimelineRecordResult -->
                <span>- </span><span data-bind="text: currentTimelineRecordResult"></span>
                <!-- /ko -->
                <!-- /ko -->
        
                <!-- ko if: parentTimelineRecordName -->
                <span>/ </span><a role="button" data-bind="text: parentTimelineRecordName, click: onParentTimelineRecordClicked, triggerClickOnKeyUp: onParentTimelineRecordClicked" aria-label="${BuildResources.JumpToParentTimeLineText}"></a>
                <!-- /ko -->
                <!-- ko if: currentTimelineRecordName -->
                <span>/ </span><span data-bind="text: currentTimelineRecordName"></span>
                <!-- /ko -->
            </span>
        </script>`
        this._element.append($(buildvnext_view_result_hubtitle));

        const buildvnext_details_console_tab2 = `<script type="text/html" id="buildvnext_details_console_tab2">
            <!-- ko with: $data.pipelineQueueViewModel-->
            <div class="buildvnext-licensing-queue" data-bind="visible: showPipelineQueue">
                <div class="buildvnext-licensing-queue__message" data-bind="html: licensingPipelineMessage"></div>
                <div class="buildvnext-licensing-queue__details">
                    <div class="buildvnext-licensing-queue__positionTitle">${BuildResources.LicensingPipelineHeader}</div>
                    <span class="buildvnext-licensing-queue__position" data-bind="text: queuePosition"></span>
                    <span class="buildvnext-licensing-queue__positionQualifier">${BuildResources.QueuePositionQualifierText}</span>
                    <div class='horizontal-title-separator'></div>
                    <a class="buildvnext-licensing-queue__buyMore" data-bind="attr: { href: buyMoreLink }" target="_blank">${BuildResources.BuyMorePipelines}</a>
                    <div>
                        <div class='horizontal-title-separator adjust-margin'></div>
                        <div class='pipeline-plan-groups-queue-dialog-placeholder'></div>
                        <div tabindex="0" data-bind="event: { keydown: onLinkKeyDown, click: showPlanGroupsQueueDialog }" class="buildvnext-licensing-queue__show-pipelines pipeline-plan-groups-queue-dialog-open-link as-link" role="button">${BuildResources.PipelinesPlanGroupsQueueLinkText}</div>
                    </div>
                </div>
            </div>
            <!-- /ko -->
            <!-- ko ifnot: $data.pipelineQueueViewModel.showPipelineQueue -->
                <!-- ko with: $data.selectedJob -->
                <div class="buildvnext-jobs-console" data-bind="visible: loaded() && !started()">
                    <!-- ko if: waitingForLicense -->
                        <!-- ko if: isHostedPool -->
                            <span class="buildvnext-jobs-console__title">${BuildResources.WaitingForAvailableAgentOnMicrosoftHostedConcurrentJobsPrefix}</span>
                        <!-- /ko -->
                        <!-- ko ifnot: isHostedPool -->
                            <span class="buildvnext-jobs-console__title">${BuildResources.WaitingForAvailableAgentOnSelfHostedConcurrentJobsPrefix}</span>
                        <!-- /ko -->
                        <span class="buildvnext-jobs-console__titlebold" data-bind="text: usedLicenseCount"></span>
                        <span class="buildvnext-jobs-console__titlebold">/</span>
                        <span class="buildvnext-jobs-console__titlebold" data-bind="text: totalLicenseCount"></span>
                        <span class="buildvnext-jobs-console__title">${BuildResources.WaitingForAvailableAgentWithConcurrentJobsSuffix}</span>
                        <a class="buildvnext-jobs-console__managelimits buildvnext-jobs-console__title" data-bind="attr: { href: manageLimitsLink }", target="_blank" rel="noopener noreferrer">${BuildResources.ManageLimitsText}</a>
                    <!-- /ko -->
                    <!-- ko ifnot: waitingForLicense -->
                        <span class="buildvnext-jobs-console__title" data-bind="text: title"></span>
                        <ul class="buildvnext-jobs-console__agents" data-bind="foreach: enabledAgents">
                            <li class="buildvnext-jobs-console__item" data-bind="css: itemCss">
                                <!-- ko if: manageLink -->
                                <a class="buildvnext-jobs-console__item__name" data-bind="attr: { href: manageLink }, text: name" target="_blank"></a>
                                <!-- /ko -->
                                <!-- ko ifnot: manageLink -->
                                <span class="buildvnext-jobs-console__item__name" data-bind="text: name"></span>
                                <!-- /ko -->
                                <span class="buildvnext-jobs-console__item__position" data-bind="text: position"></span>
                                <span class="buildvnext-jobs-console__item__positionQualifier" data-bind="visible: enabled">${BuildResources.QueuePositionQualifierText}</span>
                                <!-- ko if: !active() || !statusLink() -->
                                <span class="buildvnext-jobs-console__item__status" data-bind="text: statusText"></span>
                                <!-- /ko -->
                                <!-- ko if: active && statusLink -->
                                <a class="buildvnext-jobs-console__item__status buildvnext-jobs-console__item__status--running" data-bind="attr: { href: statusLink }, text: statusText" target="_blank"></a>
                                <div class="buildvnext-jobs-console__item__status__startTime">
                                    <span data-bind="text: startTime, title: startTimeRaw" />
                                </div>
                                <div class="buildvnext-jobs-console__item__status__eta">
                                    <span data-bind="text: eta, title: etaRaw" />
                                </div>
                                <!-- /ko -->
                            </li>
                        </ul>
                        <!-- ko if: enabledAgents().length > 0 && disabledAgents().length > 0 -->
                        <span class="buildvnext-jobs-console__title">${BuildResources.DisabledAgentsTitle}</span>
                        <!-- /ko -->
                        <ul class="buildvnext-jobs-console__agents" data-bind="foreach: disabledAgents">
                            <li class="buildvnext-jobs-console__item" data-bind="css: itemCss">
                                <!-- ko if: manageLink -->
                                <a class="buildvnext-jobs-console__item__name" data-bind="attr: { href: manageLink }, text: name" target="_blank"></a>
                                <!-- /ko -->
                                <!-- ko ifnot: manageLink -->
                                <span class="buildvnext-jobs-console__item__name" data-bind="text: name"></span>
                                <!-- /ko -->
                                <span class="buildvnext-jobs-console__item__position" data-bind="text: position"></span>
                                <span class="buildvnext-jobs-console__item__positionQualifier" data-bind="visible: enabled">${BuildResources.QueuePositionQualifierText}</span>
                                <!-- ko if: !active() || !statusLink() -->
                                <span class="buildvnext-jobs-console__item__status" data-bind="text: statusText"></span>
                                <!-- /ko -->
                                <!-- ko if: active && statusLink -->
                                <a class="buildvnext-jobs-console__item__status buildvnext-jobs-console__item__status--running" data-bind="attr: { href: statusLink }, text: statusText" target="_blank"></a>
                                <!-- /ko -->
                            </li>
                        </ul>
                    <!-- /ko -->
                </div>
                <!-- /ko -->
            <!-- /ko -->
        </script>`
        this._element.append($(buildvnext_details_console_tab2));

        const buildvnext_details_summary_tab = `<script type="text/html" id="buildvnext_details_summary_tab">
            <!-- ko if: $data -->
            <div class="buildvnext-build-summary build-details">
                <!-- ko with: summary -->
                <div data-bind="applyTemplate: { templateName: 'buildvnext_details_sections', viewModel: $data }"></div>
                <!-- /ko -->
            </div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_summary_tab));

        const buildvnext_details_summary_tab_builddetails = `<script type="text/html" id="buildvnext_details_summary_tab_builddetails">
            <div class="summary-section">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
        
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryDefinitionLabel}</label>
                    <a data-bind="text: definitionName, click: onDefinitionClick, attr: { href: definitionSummaryUrl }"></a>
                </div>
                <!-- ko if: canShowSourceBranch -->
                <div class="summary-item">
                    <label data-bind="text: sourceBranchLabel"></label>
                    <!-- ko if: canLinkSourceBranch -->
                    <a data-bind="text: sourceBranch, click: onBranchClick, attr: { href: sourceBranchUrl }"></a>
                    <!-- /ko -->
                    <!-- ko ifnot: canLinkSourceBranch -->
                    <span data-bind="text: sourceBranch"></span>
                    <!-- /ko -->
                </div>
                <!-- /ko -->
                <div class="summary-item">
                    <label>${BuildResources.BuildSummarySourceVersionLabel}</label>
                    <!-- ko if: linkSourceVersion -->
                    <a data-bind="text: sourceVersion, click: onSourceVersionClick, attr: { href: sourceVersionUrl }"></a>
                    <!-- /ko -->
                    <!-- ko ifnot: linkSourceVersion -->
                    <span data-bind="text: sourceVersion"></span>
                    <!-- /ko -->
                </div>
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryRequestedByLabel}</label>
                    <span data-bind="text: requestedBy"></span>
                </div>
                <!-- ko if: triggeredBy -->
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryTriggeredByLabel}</label>
                    <a data-bind="text: triggeredBy, attr: { href: triggeredByUri, 'aria-label': triggeredBy }"></a>
                </div>
                <!-- /ko -->
                <!-- ko if: queueName -->
                <div class="summary-item">
                    <label>${BuildResources.QueueNameText}</label>
                    <a data-bind="text: queueName, attr: { href: queueManageLink, 'aria-label': queueManageLabel }"></a>
                </div>
                <!-- /ko -->
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryQueueTimeLabel}</label>
                    <span data-bind="text: queueTime"></span>
                </div>
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryStartTimeLabel}</label>
                    <span data-bind="text: startTime"></span>
                </div>
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryFinishTimeLabel}</label>
                    <span data-bind="text: finishTime"></span>
                </div>
                <!-- ko if: deleted -->
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryDeletedTimeLabel}</label>
                    <span data-bind="text: dateDeleted"></span>
                </div>
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryDeletedByLabel}</label>
                    <span data-bind="text: deletedBy"></span>
                </div>
                <div class="summary-item">
                    <label>${BuildResources.BuildSummaryDeletedReasonLabel}</label>
                    <span data-bind="text: deletedReason"></span>
                </div>
                <!-- /ko -->
                <div class="summary-item">
                    <label>${BuildResources.RetainedStateText}</label>
                    <span data-bind="text: retainStateText"></span>
                </div>
            </div>
        </script>`;
        this._element.append($(buildvnext_details_summary_tab_builddetails));

        const buildvnext_plan_nodes_tree = `<script id="buildvnext_plan_nodes_tree" type="text/html">
            <div class="buildvnext-plan-nodes-tree" data-bind="renderTreeView: { treeNodes: nodes, onNodeClick: _onClick }"></div>
        </script>`
        this._element.append($(buildvnext_plan_nodes_tree));

        const buildvnext_details_sections = `<script type="text/html" id="buildvnext_details_sections">
            <div class="summary-section-holder-left" data-bind="foreach: sections">
                <!-- ko if: column() == 0 && isVisible -->
                <div data-bind="applyTemplate: { templateName: 'buildvnext_details_tab_section', viewModel: $data, parentIndex: '0', applyBindingsOnlyOnce: true, fadeIn: true }"></div>
                <!-- /ko -->
            </div>
            <div class="summary-section-holder-right" data-bind="foreach: sections">
                <!-- ko if: column() == 1 && isVisible -->
                <div data-bind="applyTemplate: { templateName: 'buildvnext_details_tab_section', viewModel: $data, parentIndex: '0', applyBindingsOnlyOnce: true, fadeIn: true }"></div>
                <!-- /ko -->
            </div>
        </script>`;
        this._element.append($(buildvnext_details_sections));

        const buildvnext_details_tab_section = `<script type="text/html" id="buildvnext_details_tab_section">
            <!-- ko if: contributions().length == 0 || contributingToExistingSection()-->
            <div class="custom-section">
                <div data-bind="applyTemplate: { templateName: template, viewModel: $vmparent, customData: { displayName: displayName }, fadeIn: true }"></div>
                <div class="content" data-bind="foreach: messages">
                    <div class="summary-item" data-bind="renderSummaryMarkdown: { 'markDown': $data }"></div>
                </div>
            </div>
            <!-- /ko -->
        
            <!-- ko if: contributions().length > 0 -->
            <div data-bind="foreach: contributions">
                <div class="custom-contributed-section">
                    <!-- ko ifnot: $parent.contributingToExistingSection() -->
                    <div data-bind="applyTemplate: { templateName: $parent.template, viewModel: $parent, customData: { displayName: $parent.displayName }, fadeIn: true }"></div>
                    <!-- /ko -->
                    <div data-bind="attr: { id: $data.id }, enhanceResultsViewContributions: { contribution: $data }" class="hub-external"></div>
                </div>
            </div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_tab_section));

        const buildvnext_details_summary_tab_issues = `<script type="text/html" id="buildvnext_details_summary_tab_issues">
            <div class="summary-section" data-bind="visible: canShowIssues">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
        
                <!-- ko if: hasValidationResults -->
                <div class="summary-item">
                    <!-- ko foreach: validationResults -->
                    <div class="build-issue">
                        <div class="icon build-issue-icon" data-bind="css: iconCssClass" />
                        <div class="build-issue-detail" data-bind="text: message"></div>
                    </div>
                    <!-- /ko -->
                </div>
                <!-- /ko -->

                <!-- ko foreach: jobs -->
                <!-- ko if: hasIssues -->
                <div class="summary-item">
                    <div class="summary-item-header">
                        <span data-bind="text: name" />
                    </div>
                    <!-- ko foreach: issues -->
                    <div class="build-issue" data-bind="template: { name: getTemplateName() }"></div>
                    <!-- /ko -->
                </div>
                <!-- /ko -->
                <!-- /ko -->

                <!-- ko if: (xamlBuildIssues().length > 0) -->
                <div class="summary-item-header">
                    <span>${BuildResources.BuildSequenceTitle}</span>
                </div>
                <div class="summary-item">
                    <!-- ko foreach: xamlBuildIssues -->
                    <div class="build-issue" data-bind="template: { name: getTemplateName() }"></div>
                    <!-- /ko -->
                    <!-- ko if: xamlBuildIssuesTruncated -->
                    <div class="build-issue">${BuildResources.IssuesTruncated}</div>
                    <!-- /ko -->
                </div>
                <!-- /ko -->
            </div>
        </script>`;
        this._element.append($(buildvnext_details_summary_tab_issues));

        const buildvnext_details_summary_tab_changes = `<script type="text/html" id="buildvnext_details_summary_tab_changes">
            <div class="summary-section">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>

                <!-- ko ifnot: changesLoaded -->
                <div class="status-indicator">
                    <div class="status">
                        <table>
                            <tr>
                                <td>
                                    <span class="icon big-status-progress"></span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <!-- /ko -->

                <!-- ko if: changesLoaded -->
        
                <!-- ko if: changesMessage -->
                <span data-bind="text: changesMessage"></span>
                <!-- /ko -->

                <!-- ko foreach: changes -->
                <div class="buildvnext-associated-change summary-item">
                    <a data-bind="text: changeText, click: openChange, attr: { href: changeUrl }"></a>
                    <span data-bind="text: authoredBy"></span>
                    <br />
                    <pre class="message" data-bind="text: message"></pre>
                    <span class="message-more-link" data-bind="visible: messageTruncated, click: showMore">${PresentationResources.Ellipsis}</span>
                </div>
                <!-- /ko -->

                <!-- /ko -->
            </div>
        </script>`
        this._element.append($(buildvnext_details_summary_tab_changes));

        const buildvnext_details_summary_tab_associatedWorkitems = `<script type="text/html" id="buildvnext_details_summary_tab_associatedWorkitems">
            <div class="summary-section">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
        
                <!-- ko ifnot: workItemsLoaded -->
                <div class="status-indicator">
                    <div class="status">
                        <table>
                            <tr>
                                <td>
                                    <span class="icon big-status-progress"></span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <!-- /ko -->
        
                <!-- ko if: workItemsLoaded -->
        
                <!-- ko if: workItemsMessage -->
                <span data-bind="text: workItemsMessage"></span>
                <!-- /ko -->
        
                <!-- ko foreach: workItems -->
                <div class="buildvnext-associated-workitem summary-item">
                    <a data-bind="text: id, attr: { href: url }" target="_blank" href="#"></a>
                    <span class="work-item-title" data-bind="text: title"></span>
                    <div class="work-item-summary" data-bind="text: fullStatus"></div>
                </div>
                <!-- /ko -->
        
                <!-- /ko -->
            </div>
        </script>`;
        this._element.append($(buildvnext_details_summary_tab_associatedWorkitems));

        const buildvnext_details_summary_tab_diagnosticlogs = `<script type="text/html" id="buildvnext_details_summary_tab_diagnosticlogs">
            <div class="summary-section" data-bind="visible: canShowDiagnosticLogs">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
                <table class="diagnostic-logs">
                    <thead>
                        <tr>
                            <th></th>
                            <th>${BuildResources.BuildDiagnosticLogsPhase}</th>
                            <th>${BuildResources.BuildDiagnosticLogsAgent}</th>
                        </tr>
                    </thead>
                    <tbody data-bind="foreach: diagnosticLogs">
                        <tr>
                            <!-- ko with: phaseLink -->
                            <td><span class="failed-phase" data-bind="if: phaseFailed()">${BuildResources.BuildDiagnosticLogsPhaseFailed}<span></td>
                            <td class="details"><a data-bind="text: name(), attr: { href: url() }" target="_blank" href="#"></a></td>
                            <!-- /ko -->
                            <td class="details"><a class="agent-name" data-bind="text: agentName, attr: { href: agentUrl }" target="_blank" href="#"></a></td>
                        </tr>
                        
                    </tbody>
                </table>
            </div>
        </script>`
        this._element.append($(buildvnext_details_summary_tab_diagnosticlogs));

        const buildvnext_issue = `<script type="text/html" id="buildvnext_issue">
            <div class="icon build-issue-icon" data-bind="attr: { 'aria-label': iconAriaLabel }, css: iconCssClass" />
        
            <!-- ko foreach: messageLines -->
            <div class="build-issue-detail" data-bind="text: $data"></div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_issue));

        const buildvnext_code_issue = `<script type="text/html" id="buildvnext_code_issue">
            <div class="icon build-issue-icon" data-bind="css: iconCssClass" />
            <div class="build-issue-detail">
                <!-- ko if: contentUrl -->
                <a data-bind="text: locationText, attr: { 'href': contentUrl }" target="_blank"></a>
                <!-- /ko -->
                <!-- ko ifnot: contentUrl -->
                <span data-bind="text: locationText" />
                <!-- /ko -->
            </div>
            
            <!-- ko foreach: messageLines -->
            <div class="build-issue-detail" data-bind="text: $data"></div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_code_issue));

        const bulidvnext_details_logs_tab = `<script type="text/html" id="buildvnext_details_logs_tab">
            <!-- ko if: $data -->
            <div class="buildvnext-node-log-container">
                <!-- ko if: isSelected -->
                <div data-bind="buildLogViewer: $data.logContent"></div>
                <!-- /ko -->
            </div>
            <!-- /ko -->
        </script>`;
        this._element.append($(bulidvnext_details_logs_tab));

        const buildvnext_details_summary_tab_tags = `<script type="text/html" id="buildvnext_details_summary_tab_tags">
            <div class="summary-section" data-bind="visible: canShowTags">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
        
                <div class="summary-item">
                    <span class="build-list-tags" data-bind="createEnhancement: { controlType: 'tags', viewModel: tagsViewModel, controlInitialized: tagControlInitialized, eventHandlers: [{ type: 'add', eventHandler: addTag }, { type: 'delete', eventHandler: deleteTag }] }"></span>
                </div>
            </div>
        </script>`;
        this._element.append($(buildvnext_details_summary_tab_tags));

        const buildvnext_details_section_header = `<script type="text/html" id="buildvnext_details_section_header">
            <div class="summary-section">
                <h2 class="summary-section-header" data-bind="text: $vmcustom.displayName"></h2>
            </div>
        </script>`;
        this._element.append($(buildvnext_details_section_header));

        const buildvnext_details_timeline_tab = `<script type="text/html" id="buildvnext_details_timeline_tab">
            <!-- ko if: $data -->
            <div class="timeline-grid"></div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_timeline_tab));

        const buildvnext_details_artifacts_tab = `<script type="text/html" id="buildvnext_details_artifacts_tab">
            <!-- ko if: $data -->
            <div class="artifacts-grid"></div>
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_artifacts_tab));

        const buildvnext_details_xaml_diagnostics_tab = `<script type="text/html" id="buildvnext_details_xaml_diagnostics_tab">
            <div class="xaml-build-detail-view">
                <div class="content">
                    <div class="logmenu" style="display: none"></div>
                    <div class="logcontent" style="display: none"></div>
                </div>
            </div>
        </script>`;
        this._element.append($(buildvnext_details_xaml_diagnostics_tab));

        // if there's no whitespace in the script tag, ko will break
        const buildvnext_details_xaml_log_tab = `<script type="text/html" id="buildvnext_details_xaml_log_tab">
        </script>`;
        this._element.append($(buildvnext_details_xaml_log_tab));

        const buildvnext_details_custom_tab = `<script type="text/html" id="buildvnext_details_custom_tab">
            <!-- ko if: $data -->
            <!-- ko with: $data.vm -->
            <div class="build-details build-custom-tab">
                <div data-bind="applyTemplate: { templateName: 'buildvnext_details_sections', viewModel: $data }"></div>
                <div data-bind="attr: { id: contribution.id }, enhanceResultsViewContributions: { contribution: contribution, selected: $parent.isSelected }" class="hub-external"></div>
            </div>
            <!-- /ko -->
            <!-- /ko -->
        </script>`;
        this._element.append($(buildvnext_details_custom_tab));

        const queue_definition_dialog = `<script id="queue_definition_dialog" type="text/html">
                <div class="queue-build">
                    <!-- ko if: warningMessage -->
                    <div class="queue-build-messagebar">
                        <span data-bind="text: warningMessage"></span>
                    </div>
                    <!-- /ko -->
                    <table class="filter">
                        <tr>
                            <td colspan="2">
                                <label for="queue">${BuildResources.QueueBuildQueueTitle}</label>
                                <select id="queue" class="queue" data-bind="options: queues, optionsText: 'name', optionsValue: 'id'"></select>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2">
                                <label for="branch">${BuildResources.QueueBuildBranchTitle}</label>
                                <input type="text" id="branch" data-bind="value: selectedBranch, valueUpdate: 'afterkeydown'" />
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2">
                                <label for="commit">${BuildResources.QueueDefinitionDialogSourceVersionTitle}</label>
                                <input type="text" id="commit" data-bind="value: sourceVersion" />
                            </td>
                        </tr>
                    </table>
                    <div class="queue-build-dialog-tabs tfs_knockout_hubpageexplorerpivot_holder"></div>
                    <!-- ko foreach: tabs -->
                    <div class="tab-content-container queue-dialog-tab" data-bind="visible: isSelected">
                        <div data-bind="applyTemplate: { templateName: templateName, viewModel: $data }"></div>
                    </div>
                    <!-- /ko -->
                </div>
            </script>`;

        this._element.append($(queue_definition_dialog));

        const tfgit_queue_definition_dialog = `<script id="tfgit_queue_definition_dialog" type="text/html">
            <div class="queue-build">
                <!-- ko if: warningMessage -->
                <div class="queue-build-messagebar">
                    <span data-bind="text: warningMessage"></span>
                </div>
                <!-- /ko -->
                <table class="filter">
                    <tr>
                        <td colspan="2">
                            <label for="queue">${BuildResources.QueueBuildQueueTitle}</label>
                            <select id="queue" class="queue" data-bind="options: queues, optionsText: 'name', optionsValue: 'id'"></select>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <label for="branch">${BuildResources.QueueBuildBranchTitle}</label>
                            <div data-bind="tfgitVersionSelectorControl: sourceOptions.repositoryContext, observable: selectedBranch, repoOptions: { disableTags: false, popupOptions: { elementAlign: 'left-top', baseAlign: 'left-bottom' } }"></div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <label for="commit">${BuildResources.QueueBuildCommitIdTitle}</label>
                            <input type="text" id="commit" data-bind="value: sourceVersion" />
                        </td>
                    </tr>
                </table>
                <div class="queue-build-dialog-tabs tfs_knockout_hubpageexplorerpivot_holder"></div>
                <!-- ko foreach: tabs -->
                <div class="tab-content-container queue-dialog-tab" data-bind="visible: isSelected">
                    <div data-bind="applyTemplate: { templateName: templateName, viewModel: $data }"></div>
                </div>
                <!-- /ko -->
            </div>
        </script>`;
        this._element.append($(tfgit_queue_definition_dialog));

        const tfvc_queue_definition_dialog = `<script id="tfvc_queue_definition_dialog" type="text/html">
            <div class="queue-build">
                <!-- ko if: warningMessage -->
                <div class="queue-build-messagebar">
                    <span data-bind="text: warningMessage"></span>
                </div>
                <!-- /ko -->
                <table class="filter">
                    <tr>
                        <td colspan="2">
                            <label for="queue">${BuildResources.QueueBuildQueueTitle}</label>
                            <select id="queue" class="queue" data-bind="options: queues, optionsText: 'name', optionsValue: 'id'"></select>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <label for="commit">${BuildResources.QueueDefinitionDialogSourceVersionTitle}</label>
                            <input type="text" id="commit" data-bind="value: sourceVersion" />
                        </td>
                        <td class="helpMarkDown queue-definition-dialog-helpmarkdown" data-bind="showTooltip: { text: sourceVersionHelpMarkDown }" />
                    </tr>
                    <tr>
                        <td colspan="2">
                            <label for="branch">${BuildResources.QueueBuildShelvesetTitle}</label>
                            <input type="text" id="branch" data-bind="value: sourceOptions.shelvesetName" />
                        </td>
                        <td class="browse-col">
                            <button data-bind="click: sourceOptions.onShelvePickerClick.bind($data)">...</button></td>
                    </tr>
                </table>
                <div class="queue-build-dialog-tabs tfs_knockout_hubpageexplorerpivot_holder"></div>
                <!-- ko foreach: tabs -->
                <div class="tab-content-container queue-dialog-tab" data-bind="visible: isSelected">
                    <div data-bind="applyTemplate: { templateName: templateName, viewModel: $data }"></div>
                </div>
                <!-- /ko -->
            </div>
        </script>`;
        this._element.append($(tfvc_queue_definition_dialog));

        const queue_definition_dialog_variables_content = `<script id="queue_definition_dialog_variables_content" type="text/html">
            <!-- ko with: queueTimeVariables -->
            <table class="filter">
                <tbody data-bind="foreach: variables">
                    <!-- ko ifnot: isImplicit -->
                    <!-- ko if: allowOverride -->
                    <tr>
                        <td>
                            <a href="#" data-bind="click: $parent.removeVariable, visible: canRemove">
                                <span class="icon icon-delete-grey-f1-background red-delete-icon-hover" aria-label="${BuildResources.GridRemoveVariableText}"></span>
                            </a>
                        </td>
                        <!-- ko if: canRemove -->
                        <td class="data-column">
                            <input type="text" data-bind="value: name, valueUpdate: 'afterkeydown', triggerFocus: true, attr: { 'aria-label': inputAriaLabel }, disable: isImplicit, css: { disabled: isImplicit, 'invalid': isNameInvalid() }" />
                        </td>
                        <!-- /ko -->
                        <!-- ko ifnot: canRemove -->
                        <td class="data-column">
                            <label data-bind="attr: { 'for': name }, text: name" />
                        </td>
                        <!-- /ko -->
                        <td>
                            <!-- ko ifnot: showSecretPlaceholder -->
                            <input class="queue-time-variable-input" data-bind="attr: { 'type': inputType, 'aria-label': inputValueAriaLabel }, value: value, valueUpdate: 'afterkeydown'" />
                            <!-- /ko -->
                            <!-- ko if: showSecretPlaceholder -->
                            <input class="queue-time-variable-input" data-bind="attr: { 'aria-label': inputValueAriaLabel }" type="password" value="********" disabled="disabled" />
                            <!-- /ko -->
                        </td>
                        <td class="queue-time-secret-td">
                            <!-- ko if: showSecretPlaceholder -->
                            <span class="icon icon-restricted-2" data-bind="css: { 'not-secret': !isSecret() }, click: onSecretClick" title="${BuildResources.GridSecretVariableText}"></span>
                            <!-- /ko -->
                        </td>
                    </tr>
                    <!-- /ko -->
                    <!-- /ko -->
                </tbody>
                <tbody>
                    <tr>
                        <td colspan="4">
                            <button data-bind="click: addVariable">
                                <span class="icon icon-add"></span>&nbsp;
                                ${BuildResources.GridAddVariableText}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <!-- /ko -->
        </script>`;
        this._element.append($(queue_definition_dialog_variables_content));

        const queue_definition_dialog_demands_content = `<script id="queue_definition_dialog_demands_content" type="text/html">
            <table class="buildvnext-definition-general-demands buildvnext-variables-grid-table">
                <thead>
                    <tr>
                        <th class="remove-icon"></th>
                        <th class="demand-name">${BuildResources.BuildDefinitionDemandNameHeader}</th>
                        <th class="demand-type">${BuildResources.BuildDefinitionDemandTypeHeader}</th>
                        <th class="demand-value">${BuildResources.BuildDefinitionDemandValueHeader}</th>
                    </tr>
                </thead>
                <tbody data-bind="foreach: demands">
                    <tr>
                        <td>
                            <a href="#" data-bind="click: $parent.removeDemand.bind($parent)">
                                <span class="icon icon-delete-grey-f1-background red-delete-icon-hover" aria-label="${BuildResources.BuildDefinitionRemoveDemandText}"></span>
                            </a>
                        </td>
                        <td>
                            <input type="text" data-bind="value: name, triggerFocus: true, attr: { 'aria-label': inputAriaLabel }, id: name, valueUpdate: 'afterkeydown'" /></td>
                        <td>
                            <select data-bind="value: type">
                                <option value="exists">${BuildResources.BuildDefinitionDemandExistsText}</option>
                                <option value="equals">${BuildResources.BuildDefinitionDemandEqualsText}</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" data-bind="visible: valueVisible, attr: { 'aria-label': inputValueAriaLabel }, value: value, valueUpdate: 'afterkeydown'" /></td>
                    </tr>
                </tbody>
                <tbody>
                    <tr>
                        <td colspan="4">
                            <button data-bind="click: addDemand">
                                <span class="icon icon-add"></span>&nbsp;
                                ${BuildResources.BuildDefinitionAddDemandText}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </script>`;
        this._element.append($(queue_definition_dialog_demands_content));

        const artifacts_explorer_dialog = `<script id="artifacts_explorer_dialog" type="text/html">
            <div data-bind="template: { name: 'artifacts_explorer_tree', data: fileTree }"></div>
        </script>`;
        this._element.append($(artifacts_explorer_dialog));

        const artifacts_explorer_tree = `<script id="artifacts_explorer_tree" type="text/html">
            <div data-bind="renderTreeView: { treeNodes: nodes, onNodeClick: _onClick, menuOptions: { getMenuOptions: getMenuOptions } }"></div>
        </script>`;
        this._element.append($(artifacts_explorer_tree));
    }
}

SDK_Shim.VSS.register("build.buildDetail", (context) => {
    return Controls.create(BuildDetailHub, context.$container, context.options);
});