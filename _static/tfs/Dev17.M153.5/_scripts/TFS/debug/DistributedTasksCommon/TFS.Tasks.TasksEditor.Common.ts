///<amd-dependency path="jQueryUI/sortable"/>
import ko = require("knockout");
import Q = require("q");

import VSS = require("VSS/VSS");
import Utils_Array = require("VSS/Utils/Array");

import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");

import Types = require("DistributedTasksCommon/TFS.Tasks.Types");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");

export class TaskEditorCommonViewModel extends KnockoutPivot.TabContentViewModel {

    private _variableProvider: Types.IVariableProvider;

    protected _metaTaskManager: Types.IMetaTaskManager;

    private _taskEditorOptions: Types.ITasksEditorOptions;

    private _defaultTaskCategoryName: string;
    private _taskDelegates: Types.ITaskDelegates;

    constructor(options: Types.ITasksEditorOptions) {
        super();

        this._taskEditorOptions = options;

        if (options) {
            if (options.variableProvider) {
                this._variableProvider = options.variableProvider;
            }

            if (options.defaultTaskCategoryName) {
                this._defaultTaskCategoryName = options.defaultTaskCategoryName;
            }
        }

        if (options && options.metaTaskManager) {
            this._metaTaskManager = options.metaTaskManager;
        }
        else if (DistributedTaskModels.TaskDefinitionCache.metaTaskManager) {
            this._metaTaskManager = DistributedTaskModels.TaskDefinitionCache.metaTaskManager;
        }
    }

    public getVariableDefaultValue(variable: string): string {
        return TaskEditorCommonViewModel.getVariableDefaultValue(variable, this._variableProvider);
    }

    public getVariableProvider(): Types.IVariableProvider {
        return this._variableProvider;
    }

    public isSystemVariable(variable: string): boolean {

        //Build doesn't expose variables via interfaces so use hardcoded values. RM expose them so get it via variable provider
        if (Utils_Array.contains(TaskEditorCommonViewModel._systemVariable, variable.toLowerCase())) {
            return true;
        }

        if (this._variableProvider) {
            return this._variableProvider.isSystemVariable(variable);
        }

        return false;
    }

    public static getVariableDefaultValue(variable: string, variableProvider: Types.IVariableProvider): string {
        var value: string = null;
        if (variableProvider) {
            value = variableProvider.getVariableValue(variable);
        }

        return value || "";
    }

    public createMetaTask(metaTaskDefinition: DistributedTaskContracts.TaskGroup): IPromise<DistributedTaskContracts.TaskGroup> {
        return this._metaTaskManager.saveDefinition(metaTaskDefinition);
    }

    public isMetaTaskSupported(): boolean {
        return !!this._metaTaskManager;
    }

    public getTaskEditorOptions(): Types.ITasksEditorOptions {
        return this._taskEditorOptions;
    }

    public getDefaultTaskCategoryName(): string {
        return this._defaultTaskCategoryName;
    }

    protected static renderTaskInputTemplate() {
        TaskUtils.HtmlHelper.renderTemplateIfNeeded("taskeditor_input", TaskEditorCommonViewModel._taskEditorInputHtmlTemplate);
    }

    private static _systemVariable: string[] = [
        "agent.builddirectory",
        "agent.homedirectory",
        "agent.id",
        "agent.name",
        "agent.workfolder",
        "build.artifactstagingdirectory",
        "build.binariesdirectory",
        "build.buildid",
        "build.buildnumber",
        "build.builduri",
        "build.clean",
        "build.definitionname",
        "build.definitionversion",
        "build.fetchtags",
        "build.queuedby",
        "build.queuedbyid",
        "build.reason",
        "build.repository.clean",
        "build.repository.git.submodulecheckout",
        "build.repository.localpath",
        "build.repository.name",
        "build.repository.provider",
        "build.repository.tfvc.shelveset",
        "build.repository.tfvc.workspace",
        "build.repository.uri",
        "build.requestedfor",
        "build.requestedForEmail",
        "build.requestedforid",
        "build.sourcebranch",
        "build.sourcebranchname",
        "build.sourcesdirectory",
        "build.sourcetfvcShelveset",
        "build.sourceversion",
        "build.stagingdirectory",
        "build.syncSources",
        "common.testresultsdirectory",
        "system.accesstoken",
        "system.collectionid",
        "system.defaultworkingdirectory",
        "system.definitionid",
        "system.teamfoundationcollectionuri",
        "system.teamproject",
        "system.teamprojectid"
    ];

    private static _taskEditorInputHtmlTemplate = `
    <tr data-bind=\"visible: isVisible\">
        <td class='option-label'>
            <label data-bind=\"text: label, attr: { for: name, id: labelId }, css: { 'bold-text': isInvalid() }\"></label>
        </td>
        <td class='option-value bowtie'>
            <!-- ko if:  type === 'identities' -->
            <div class='identity-picker' data-bind=\"createTaskInputControls: { viewModel: $data }, attr: { id: name }\"></div>
            <!-- /ko -->
            <!-- ko if:  type === 'azureConnection' || type.indexOf('connectedService:') === 0 -->
            <div class='connected-service' data-bind=\"createTaskInputControls: { viewModel: $data }, attr: { id: name }, css: { 'invalid': isInvalid() }\"></div>
            <!-- /ko -->
            <!-- ko if: type === 'boolean' -->
            <input type='checkbox' data-bind=\"attr: { id: name }, checked: value, css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
            <!-- ko if: (type === 'string' && !hasDisplayFormat()) || type === 'stringList' -->
            <input type='text' data-bind=\"attr: { id: name, title: value }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
            <!-- ko if: type === 'filePath' -->
            <input type='text' data-bind=\"attr: { id: name, title: value }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
            <!-- ko if: type === 'artifactPath' -->
            <input type='text' data-bind=\"attr: { id: name, title: value }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
            <!-- ko if: type === 'radio' -->
            <fieldset class="side-by-side">
                <!-- ko foreach: options -->
                <div class="form-col">
                    <input type='radio' data-bind=\"attr: { name: $parent.name, id: key }, value: key, checked: $parent.value, css: { 'invalid': $parent.isInvalid() }, enable: $parent.editable\" />
                    <label data-bind=\"text: value, attr: { for: key }\"></label>
                </div>
                <!-- /ko -->
            </fieldset>
            <!-- /ko -->
            <!-- ko if: type === 'pickList' -->
            <div class='pick-list' data-bind=\"createTaskInputControls: { viewModel: $data }, attr: { id: name }, css: { 'invalid': isInvalid() }\"></div>
            <!-- /ko -->
            <!-- ko if: type === 'multiLine' && !hasDisplayFormat()-->
            <textarea class='taskeditor-textarea textbox' data-bind=\"attr: { id: name, rows: rows, maxLength: maxLength }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, style: { 'resize': resizable }, enable: editable\"></textarea>
            <!-- /ko -->
            <!-- ko if: (type === 'multiLine' || type === 'string') && hasDisplayFormat() -->
            <textarea class='taskeditor-textarea textbox' data-bind=\"attr: { id: name, title: value }, value: displayString, css: { 'invalid': isInvalid() }, enable: false\"></textarea>
            <!-- /ko -->
            <!-- ko if: (type === 'querycontrol')-->
            <input type='text' data-bind=\"attr: { id: name, title: value }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
            <!-- ko if: type === 'secureFile' -->
            <input type='text' data-bind=\"attr: { id: name, title: value }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, enable: editable\" />
            <!-- /ko -->
        </td>
        <!-- ko if: $data.supportsFilePathPicker && $data.supportsFilePathPicker() -->
        <td class='align-middle'>
            <button class='file-path' data-bind=\"click: onSourcePickerClick, enable: editable\">...</button>
        </td>
        <!-- /ko -->
        <!-- ko if: $data.supportsArtifactPathPicker && $data.supportsArtifactPathPicker() -->
        <td class='align-middle'>
            <button class='file-path' data-bind=\"click: onArtifactPickerClick, enable: editable\">...</button>
        </td>
        <!-- /ko -->
        <!-- ko if: $data.hasEditorExtension -->
        <td class='align-top' data-bind=\"click: onEditorExtensionClick, enable: editable\">
            <button  class='editor-extension'>...</button>
        </td>
        <!-- /ko -->
        <!-- ko if: $data.isAuthorizeVisible  && $data.isAuthorizeVisible() -->
        <td class='align-middle'>
            <button class='taskeditor-azurerm-authorize-button' data-bind=\"click: onAuthorizeClick, enable: isAuthorizeEnabled \">Authorize</button>
        </td>
        <!-- /ko -->
        <!-- ko if: $data.enableRefresh -->
        <td class='option-link'>
            <a href='#' class='icon icon-refresh buildvnext-hovered' data-bind='title: RefreshText' data-bind='click: refresh' />
        </td>
        <!-- /ko -->
        <!-- ko if: showAddServiceEndpointLink() -->
        <td class='option-link'>
            <a href="#" data-bind=\"click: addServiceEndpoint\" class='add-service-endpoint-link'>${TaskResources.Task_AddServiceEndpointTitle}</a>
        </td>
        <td class='option-link'>|</td>
        <!-- /ko -->
        <!-- ko ifnot: $data.isAuthorizeVisible  && $data.isAuthorizeVisible() -->
        <!-- ko if: manageLink -->
        <td class='option-link'>
            <a data-bind=\"attr: { href: manageLink, target: '_blank' }\" class='azure-manage-link'>${TaskResources.Task_AzureConnectionManageTitle}</a>
        </td>
        <!-- /ko -->
        <!-- /ko -->
        <!-- ko if: helpMarkDown -->
        <td class='helpMarkDown' data-bind=\"showTooltip: { text: helpMarkDown, pivotSiblingCssClass: 'option-value' }\" />
        <!-- /ko -->
    </tr>
    <!-- ko if: $data.isAuthorizeVisible  && $data.isAuthorizeVisible() -->
    <tr>
        <td></td>
        <td class='option-label'>
            <label class='azurerm-control-helptext'>${TaskResources.ClickAuthorizeHelpText}</label>
        </td>
    </tr>
    <!-- /ko -->`;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.TasksEditor.Common", exports);
