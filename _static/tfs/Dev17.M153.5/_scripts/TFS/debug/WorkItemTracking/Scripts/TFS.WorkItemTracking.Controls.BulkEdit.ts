/// <reference types="jquery" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Service = require("VSS/Service");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import RichEditor = require("VSS/Controls/RichEditor");
import Dialogs = require("VSS/Controls/Dialogs");
import MultiField = require("WorkItemTracking/Scripts/Controls/Fields/MultiFieldEditControl");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Diag = require("VSS/Diag");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Controls = require("VSS/Controls");
import Q = require("q");
import { BulkOperation } from "WorkItemTracking/Scripts/Utils/BulkOperation";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { Exceptions, FieldUsages, FieldFlags, PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { isNewHtmlEditorEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { HtmlEditor, IHtmlEditorProps, ITelemetryContext } from "WorkItemTracking/Scripts/Components/HtmlEditor";

const handleError = VSS.handleError;
const TelemetryContext: ITelemetryContext = { controlName: "BulkEdit-HistoryEditor" };
const EditorHeightPx = 120;

/**
 * Makes the same set of field changes to a set of work items
 * @param tfsContext TFS context
 * @param workItemIds List of work item ids to make the changes to
 * @param changes The set of field changes to make to the work items
 * @param options OPTIONAL: additional options. options include:
 *                     "immediateSave" type="Boolean"      Indicates whether to immediately save the work items after making the client changes
 *                     "beforeSave"    type="function"     Handler invoked prior to saving the work items
 *                     "afterSave"     type="function"     Handler invoked after saving the work items
 * @param errorHandler OPTIONAL: Handler for errors
 */
export function bulkUpdateWorkItems(tfsContext: TFS_Host_TfsContext.TfsContext, workItemIds: number[], changes: any[], options?: any, errorHandler?: IErrorCallback) {
    Diag.Debug.assertParamIsObject(tfsContext, "tfsContext");
    Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
    Diag.Debug.assertParamIsArray(changes, "changes");

    let longRunningOperation: StatusIndicator.LongRunningOperation;

    function doUpdateWorkItems(cancelable) {
        const updateOptions = $.extend({ cancelable: cancelable, retryOnExceedingJsonLimit: true }, options);

        const bulkOperation = new BulkOperation();

        const completeCallback = () => {
            if (longRunningOperation) {
                longRunningOperation.endOperation();
            }
        }

        const errorCallback = (error) => {
            if (error && error.name === Exceptions.OperationCanceledException) {
                return;
            }

            if (longRunningOperation) {
                longRunningOperation.cancelOperation();
            }

            handleError(error, errorHandler, bulkOperation);
        }

        bulkOperation.beginUpdateWorkItems(tfsContext, workItemIds, changes, completeCallback, errorCallback, updateOptions);
    }

    if (options && options.container) {
        longRunningOperation = new StatusIndicator.LongRunningOperation(options.container, { cancellable: true });

        longRunningOperation.beginOperation(function (cancelable) {
            doUpdateWorkItems(cancelable);
        });
    }
    else {
        doUpdateWorkItems(null);
    }
}

/**
 * Retrieves work item tracking store object for a given collection.
 */
function getWitStore(tfsContext: TFS_Host_TfsContext.TfsContext): WITOM.WorkItemStore {
    Diag.Debug.assertParamIsObject(tfsContext, "tfsContext");
    return TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
}

export interface BulkEditWorkItemDialogOptions extends Dialogs.IModalDialogOptions {
    workItemIds?: number[];
    projectTypeMapping?: IDictionaryStringTo<string[]>;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export interface BulkEditResult {
    workItemIds: number[];
    changes: { fieldName: string, value: string }[];
}

export class BulkEditWorkItemDialog extends Dialogs.ModalDialogO<BulkEditWorkItemDialogOptions> {

    public static enhancementTypeName: string = "BulkEditWorkItemDialog";

    private _historyEditor: RichEditor.RichEditor;
    private _htmlComponent: HtmlEditor;
    protected _fieldControl: MultiField.MultiFieldEditControl;
    private _htmlComponentContainer: HTMLElement;
    private _windowResizeEventHandler: (ev: JQueryEventObject) => void;

    constructor(options?: BulkEditWorkItemDialogOptions) {
        super(options);
        Diag.Debug.assertIsArray(options.workItemIds, "Need a collection of work items to bulk edit", true);
        if (options.projectTypeMapping) {
            Diag.Debug.assertParamIsNotNull(options.projectTypeMapping, "projectTypeMapping");
        }
    }

    /**
     * Initialize options
     * @param options
     */
    public initializeOptions(options?: BulkEditWorkItemDialogOptions) {
        super.initializeOptions($.extend({
            cssClass: "bulkedit-dialog",
            title: Resources.BulkEditWorkItemsTitle
        }, options));
    }

    /**
     * Initializes the dialog.
     */
    public initialize(): void {
        super.initialize();
        this._decorate();
    }

    /**
     * Dispose the dialog.
     */
    public dispose() {
        if (this._htmlComponent) {
            ReactDOM.unmountComponentAtNode(this._htmlComponentContainer);
            this._htmlComponent = null;
        }
        this._windowResizeEventHandler && $(window).off("resize", this._windowResizeEventHandler);

        super.dispose();
    }

    /**
     * Gets the dialog results.
     */
    public getDialogResult(): BulkEditResult {
        let retVal: BulkEditResult;

        Diag.Debug.assertIsObject(this._fieldControl, "this.fieldControl");

        retVal = {
            workItemIds: this._options.workItemIds,
            changes: this._fieldControl.getResults()
        };

        let notesForHistory = null;

        // This method get called if either the fields panel or history panel is modified
        // Since some fo the history control initialization happen async, its possible for the fields panel 
        // to be fully initialized and trigger the fields changed event (when the model is set) 
        // before the historyPanel is ready. In this case it's safe to assume the history panel has no changes. 
        if (this._historyEditor && this._historyEditor.getWindow() && this._historyEditor.isReady()) {
            // This control only reads the contents of the history editor when it fires its CHANGE event.
            // The editor does not fire its CHANGE event synchronously after every user input though -
            //  there could be a small time window in which our model is out-of-sync with the editor.
            // Calling checkModified() forces the editor to immediately fire any pending CHANGE events.
            this._historyEditor.checkModified();
            notesForHistory = this._historyEditor.getValue();
        } else  if (this._htmlComponent) {
            this._htmlComponent.flushChanges();
            notesForHistory = this._htmlComponent.htmlContent;
        }

        if (notesForHistory) {
            const historyFieldDefinition = getWitStore(this._options.tfsContext).getFieldDefinition("System.History");
            Diag.Debug.assertIsObject(historyFieldDefinition, "historyFieldDefinition");
            retVal.changes.push({
                fieldName: historyFieldDefinition.name,
                value: notesForHistory
            });
        }

        return retVal;
    }

    /**
     * Initializes the dialog UI.
     */
    private _decorate() {
        const $layoutPanel = $("<div class='bulkedit-controls-container'>")
            .append(this._initializeFieldsPanel())
            .append(this._initializeHistoryPanel());

        this._element.append($layoutPanel);
    }

    /**
     * Initializes the history panel
     */
    private _initializeHistoryPanel(): JQuery {
        const $container = $("<div class='history-panel'>").attr({
            "role": "heading",
            "aria-label": Resources.BulkEditDialogHistoryRoleTitle
        });
        const historyEditorControlId = "history_editor";
        const $historyEditorElement = $("<div>");
        const historyEditorOptions = {
                pageHtml: WorkItemRichTextHelper.getPageHtml(),
                height: `${EditorHeightPx}px`,
                id: historyEditorControlId,
                change: this._validate,
                fireOnEveryChange: true,
                internal: true,
                ariaLabel: Resources.BulkEditWorkItemsNotesForHistoryLabel
            };

        if (!isNewHtmlEditorEnabled()) {
            this._historyEditor = <RichEditor.RichEditor>Controls.BaseControl.createIn(RichEditor.RichEditor, $historyEditorElement, historyEditorOptions);
            // note: we have placeholder text and aria label for the html editor, we don't need the redundant label here
            $("<label>")
                .attr("for", this._historyEditor.getTextAreaId())
                .append(Resources.BulkEditWorkItemsNotesForHistoryLabel)
                .appendTo($container);
        }

        $container.append($historyEditorElement);
        if (isNewHtmlEditorEnabled()) {
            this._createHtmlComponent($historyEditorElement[0]);

            this._windowResizeEventHandler = (ev: JQueryEventObject) => {
                // ignore window resize, only handle custom modal resize event
                if (!$.isWindow(ev.target) && this._htmlComponent) {
                    this._htmlComponent.refreshCommandBar();
                }
            };
            $(window).resize(this._windowResizeEventHandler);
        }

        return $container;
    }

    private _createHtmlComponent(container: HTMLElement): void {
        const ariaLabel = Resources.BulkEditWorkItemsNotesForHistoryLabel;
        const placeholder = ariaLabel ? Utils_String.format(Resources.HtmlFieldPlaceholder, ariaLabel) : "";
        this._htmlComponentContainer = container;
        ReactDOM.render(
            React.createElement(HtmlEditor, {
                htmlContent: "",
                ref: ref => (this._htmlComponent = ref),
                onChange: this._validate,
                helpText: placeholder,
                placeholder,
                telemetryContext: TelemetryContext,
                showChromeBorder: true,
                ariaLabel,
                height: EditorHeightPx
            } as IHtmlEditorProps),
            container
        );
    }

    /**
     * Initializes the fields panel
     * @return the panel container
     */
    private _initializeFieldsPanel(): JQuery {
        const options: MultiField.MultiFieldEditControlOptions = {
            dataProvider: this._createMultiFieldsDataProvider(),
            afterFieldsLoaded: (fields) => { this.setFormFocusDelayed($container.find("input:not([disabled])")); },
            onChange: this._validate,
            onError: (error: Error) => {
                VSS.errorHandler.show(error);
            }
        }

        const $container = $("<div class='fields-panel'>").attr({
            "role": "heading",
            "aria-label": Resources.BulkEditDialogFieldsRoleTitle
        });
        this._fieldControl = <MultiField.MultiFieldEditControl>Controls.BaseControl.createIn(MultiField.MultiFieldEditControl, $container, options);

        return $container;
    }

    /**
     * Override for testing
     * Creates and returns a dataprovider for the fields panel
     */
    protected _createMultiFieldsDataProvider(): MultiField.IMultFieldEditDataProvider {
        return new WorkItemStoreMultiEditDataProvider(this._options.tfsContext, this._options.projectTypeMapping);
    }

    /**
     * Validates and updates the dialog.
     */
    private _validate = (): void => {
        let areFieldsValid = false;
        if (this._fieldControl) {
            areFieldsValid = this._fieldControl.isValid(true);
        }
        this.updateOkButton(areFieldsValid && this.getDialogResult().changes.length > 0);
    };
}

VSS.initClassPrototype(BulkEditWorkItemDialog, {
    _historyEditor: null,
    _model: null
});



export class BulkEditDialogs {

    /** Bulk edits a collection of work items by selecting fields to edit and the new values.</summary>
     * @param workItemIds An array of work item ids
     * @param projectTypeMapping An dictionary of projects and work item types
     * @param optionsDialog options
     */
    public static bulkEditWorkItems(workItemIds: number[], projectTypeMapping: IDictionaryStringTo<string[]>, options?: any): BulkEditWorkItemDialog {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds", true);
        if (projectTypeMapping) {
            Diag.Debug.assertParamIsNotNull(projectTypeMapping, "projectTypeMapping");
        }

        options = $.extend({
            workItemIds: workItemIds,
            projectTypeMapping: projectTypeMapping || {},
            width: 600,
            minWidth: 450,
            height: 480,
            minHeight: 450, // Large enough to show 3 fields and history control withour a scrollbar  
            attachResize: true
        }, options);

        return Dialogs.show(BulkEditWorkItemDialog, options);
    }

    /**
     * Work item bulk-edit related dialogs
     */
    constructor() {
    }
}

export class WorkItemStoreMultiEditDataProvider implements MultiField.IMultFieldEditDataProvider {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _projectTypeMapping: IDictionaryStringTo<string[]>;
    private _projects: WITOM.Project[];
    private _projectForAllowedValues: WITOM.Project;
    private _store: WITOM.WorkItemStore;
    private _originalTagsFieldName: string;

    public _queryAdapter: QueryAdapter;

    /** The model of the bulk edit control.
     * @param tfsContext The TFS context
     * @param workItemTypes Distinct Work Item Types
     */
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, projectTypeMapping?: IDictionaryStringTo<string[]>) {

        Diag.Debug.assertParamIsObject(tfsContext, "tfsContext");
        if (projectTypeMapping) {
            Diag.Debug.assertParamIsNotNull(projectTypeMapping, "projectTypeMapping");
        }

        this._tfsContext = tfsContext;
        this._projectTypeMapping = projectTypeMapping;

        this._initialize();
    }

    /**
     * Asynchronously gets all the editable fields that are available for bulk edit.
     * @param successCallback Success callback when the fields are retrieved.
     * @param errorCallback (optional) The error callback.
     */
    public getAllFields(): IPromise<WITOM.FieldDefinition[]> {
        const deferred = Q.defer<WITOM.FieldDefinition[]>();

        // If field names have not been populated, go build them.
        // This is called many times, so it does not make sense to
        // rebuild the field names list every time it's called.
        this._projects = [];

        // check if only one project mapping exists in the model
        let isSingleProject = false;
        let projectName: string;
        for (const projectKey of Object.keys(this._projectTypeMapping)) {
            if (isSingleProject) {
                isSingleProject = false;
                projectName = null;
                break;
            }
            isSingleProject = true;
            projectName = projectKey;
        }

        const onProjectsLoad = (projects: WITOM.Project[]) => {
            const workItemTypePromises: IPromise<WITOM.WorkItemType[]>[] = [];
            projects.forEach((project: WITOM.Project) => {
                if ($.isArray(this._projectTypeMapping[project.name]) && this._projectTypeMapping[project.name].length > 0) {
                    // Caching projects for later use when getting allowed values.
                    this._projects.push(project);

                    // Uniquefying the type names since if I've selected 5 work items of the same
                    // type the grid will send me five duplicate type names.
                    this._projectTypeMapping[project.name] = Utils_Array.unique(this._projectTypeMapping[project.name], Utils_String.localeIgnoreCaseComparer);

                    workItemTypePromises.push(
                        project.getWorkItemTypes(
                            this._projectTypeMapping[project.name]));
                }
            });

            Q.all(workItemTypePromises).then((results) => {
                let fieldDefinitions: WITOM.FieldDefinition[] = [];
                results.forEach((workItemTypes: WITOM.WorkItemType[]) => {
                    workItemTypes.forEach((workItemType: WITOM.WorkItemType) => {
                        fieldDefinitions = fieldDefinitions.concat(workItemType.fields);
                    });
                });

                const multiFieldDefinitions = this.prepareBulkEditableFields(fieldDefinitions);
                deferred.resolve(Utils_Array.unique(multiFieldDefinitions, (fieldA, fieldB) => {
                    return Utils_String.localeIgnoreCaseComparer(fieldA.name, fieldB.name);
                }));
            }, (error) => deferred.reject(error));
        }

        //  if only one project mapping exists in the model, then load only that project, else load all the projects
        if (isSingleProject && projectName) {
            this._store.beginGetProject(projectName, (project: WITOM.Project) => {
                onProjectsLoad([project]);
            }, (error) => deferred.reject(error));
        }
        else {
            this._store.beginGetProjects((projects: WITOM.Project[]) => {
                onProjectsLoad(projects);
            }, (error) => deferred.reject(error));
        }

        return deferred.promise;
    }

    /**
     * Given a list of fields, collects the ones that are available for edit.
     * @param fieldDefinitions All available fields' definition.
     * @return The display names of the fields that can still be selected for bulk edit.
     *         Note that the fields are sorted alphabetically by display name.
     */
    public prepareBulkEditableFields(fieldDefinitions: WITOM.FieldDefinition[]): WITOM.FieldDefinition[] {
        let fieldDefinition: WITOM.FieldDefinition;
        const bulkEditableFields: WITOM.FieldDefinition[] = [];

        for (let i = 0, l = fieldDefinitions.length; i < l; i++) {
            fieldDefinition = fieldDefinitions[i];

            if (fieldDefinition.id === WITConstants.CoreField.Tags) {
                this._originalTagsFieldName = fieldDefinition.name;
                bulkEditableFields.push($.extend({}, fieldDefinition, {
                    name: TagUtils.getTagsAddPseudoFieldName(fieldDefinition.name),
                    referenceName: TagUtils.AddTagsPseudoRefName
                }));
                bulkEditableFields.push($.extend({}, fieldDefinition, {
                    name: TagUtils.getTagsRemovePseudoFieldName(fieldDefinition.name),
                    referenceName: TagUtils.RemoveTagsPseudoRefName
                }));
            }
            else if (fieldDefinition.id !== WITConstants.CoreField.History) {
                bulkEditableFields.push(fieldDefinition);
            }
        }
        // Sort by alphabetical name
        bulkEditableFields.sort((a, b) => { return Utils_String.localeIgnoreCaseComparer(a.name, b.name) });

        return bulkEditableFields;
    }

    /**
     * Asynchronously return allowed values for a given field
     * @param field
     */
    public getAllowedValues(field: WITOM.FieldDefinition): IPromise<any[]> {
        // Tags are treated as a special case in Bulk Edit and Capture / Edit Templates, they can be added or removed.
        // We use PseudoRefNames to track those fields. There is no field definition for those pseudo ref names in the store.
        // We detect such fields and delegate to QueryAdapter which already has the logic to retrieve allowed values.
        if (field.referenceName === TagUtils.AddTagsPseudoRefName || field.referenceName === TagUtils.RemoveTagsPseudoRefName) {
            const project = this._getProjectForAllowedValues();
            return Q.Promise((resolve, reject) => {
                this._queryAdapter.beginGetAvailableFieldValues(project, this._originalTagsFieldName, null, true, true,
                    (values: string[]) => {
                        resolve(values);
                    }, reject);
            });
        }

        const fieldDefinition: WITOM.FieldDefinition = this._store.fieldMap[field.name.toUpperCase()];

        // This code-path can be triggered when the field is changed as the user types using the keyboard, instead of using the drop down. 
        // In this case, the field name may be incomplete. If we cannot find a field, don't do anything.
        if (!fieldDefinition) {
            return Q.resolve([]);
        }

        // Get the actual values.
        // Tree fields' values (e.g. Area or Iteration) are not dependent on work item type.
        // The control only handles a single project so grab the first project.
        else if (fieldDefinition.type === WITConstants.FieldType.TreePath) {
            const project = this._getProjectForAllowedValues();
            return project.nodesCacheManager.beginGetNodes().then(() => {
                const result: INode[] = [];
                if (fieldDefinition.id === WITConstants.CoreField.AreaPath) {
                    result.push(project.nodesCacheManager.getAreaNode(true));
                }
                else {
                    result.push(project.nodesCacheManager.getIterationNode(true));
                }
                return result;
            });
        }
        else {
            const allowedValuesPromises: IPromise<string[]>[] = [];
            this._projects.forEach((project: WITOM.Project) => {
                this._projectTypeMapping[project.name].forEach((workItemTypeName: string) => {
                    const workItemType = project.getWorkItemType(workItemTypeName);
                    const workItemFieldDefinition = workItemType.getFieldDefinition(fieldDefinition.id);
                    if (fieldDefinition) {
                        allowedValuesPromises.push(
                            this._store.getAllowedValues(
                                fieldDefinition.id,
                                project.guid,
                                workItemType.name));
                    }
                });
            });

            return Q.all(allowedValuesPromises).then((results) => {
                let allowedValues = [];
                results.forEach((values) => {
                    allowedValues = allowedValues.concat(values);
                });

                return Utils_Array.uniqueSort(allowedValues, Utils_String.localeIgnoreCaseComparer);
            });
        }
    }

    /**
     * Determines if a field can be selected for bulk edit.
     * @param fieldDefinition The field definition.
     */
    public isEditable(fieldDefinition: WITOM.FieldDefinition) {
        return !WorkItemStoreMultiEditDataProvider.isExcludedFromBulkEdit(fieldDefinition) && fieldDefinition.id !== WITConstants.CoreField.History;
    }

    /**
     * Initializes the model.
     */
    private _initialize() {
        this._store = getWitStore(this._tfsContext);
        this._queryAdapter = (<Service.VssConnection>this._store.tfsConnection).getService<QueryAdapter>(QueryAdapter);
    }


    /**
     * Decide if the field need to be excluded from bulk edit
     * @param fieldDefinition
     */
    public static isExcludedFromBulkEdit(fieldDefinition: WITOM.FieldDefinition): boolean {
        const fieldId = fieldDefinition.id;
        const fieldReferenceName = fieldDefinition.referenceName;
        const fieldName = fieldDefinition.name;

        // jslint bitwise is suppressed here because fieldDefinitions.usages is a enum of WITOM.FieldUsages
        /*jslint bitwise: false */
        const workItemUsage = fieldDefinition.usages & FieldUsages.WorkItem;
        /*jslint bitwise: true */

        if (!fieldDefinition.isEditable() || !workItemUsage || fieldDefinition.checkFlag(FieldFlags.Ignored)) {
            return true;
        }

        switch (fieldId) {
            case WITConstants.CoreField.AreaId:
            case WITConstants.CoreField.AttachedFileCount:
            case WITConstants.CoreField.AuthorizedAs:
            case WITConstants.CoreField.AuthorizedDate:
            case WITConstants.CoreField.BoardColumn:
            case WITConstants.CoreField.BoardColumnDone:
            case WITConstants.CoreField.BoardLane:
            case WITConstants.CoreField.ChangedBy:
            case WITConstants.CoreField.CreatedBy:
            case WITConstants.CoreField.ChangedDate:
            case WITConstants.CoreField.CreatedDate:
            case WITConstants.CoreField.ExternalLinkCount:
            case WITConstants.CoreField.HyperLinkCount:
            case WITConstants.CoreField.Id:
            case WITConstants.CoreField.IterationId:
            case WITConstants.CoreField.LinkType:
            case WITConstants.CoreField.NodeName:
            case WITConstants.CoreField.RelatedLinkCount:
            case WITConstants.CoreField.Rev:
            case WITConstants.CoreField.RevisedDate:
            case WITConstants.CoreField.TeamProject:
            case WITConstants.CoreField.Watermark:
            case WITConstants.CoreField.IsDeleted:
                return true;
        }

        switch (fieldReferenceName.toLowerCase()) {
            case "Microsoft.VSTS.Common.BacklogPriority".toLowerCase():
            case "Microsoft.VSTS.Common.StackRank".toLowerCase():
            case "System.PersonId".toLowerCase():
            case "Microsoft.VSTS.Common.ActivatedBy".toLowerCase():
            case "Microsoft.VSTS.Common.ActivatedDate".toLowerCase():
            case "Microsoft.VSTS.Common.ClosedBy".toLowerCase():
            case "Microsoft.VSTS.Common.ClosedDate".toLowerCase():
            case "Microsoft.VSTS.Common.ResolvedBy".toLowerCase():
            case "Microsoft.VSTS.Common.ResolvedDate".toLowerCase():
            case "Microsoft.VSTS.Common.StateChangeDate".toLowerCase():
                return true;
        }

        switch (fieldName.toLocaleLowerCase()) {
            case "Microsoft.VSTS.TCM.Steps".toLowerCase():
            case "Microsoft.VSTS.TCM.LocalDataSource".toLowerCase():
            case "Microsoft.VSTS.TCM.Parameters".toLowerCase():
            case "Microsoft.VSTS.TCM.AutomatedTestId".toLowerCase():
                return true;

        }

        const excludedStartsWith = ["System.AreaLevel", "System.IterationLevel"];
        const excludedEndsWith = ["ExtensionMarker"];

        if (excludedStartsWith.some((prefix) => Utils_String.startsWith(fieldReferenceName, prefix, Utils_String.ignoreCaseComparer))) {
            return true;
        }

        if (excludedEndsWith.some((suffix) => Utils_String.endsWith(fieldReferenceName, suffix, Utils_String.ignoreCaseComparer))) {
            return true;
        }

        return false;
    }

    private _getProjectForAllowedValues() {
        if (!this._projectForAllowedValues) {
            const currentProjectId = this._tfsContext.navigation.projectId;
            $.each(this._projects, (index: number, project: WITOM.Project) => {
                if (Utils_String.ignoreCaseComparer(project.guid, currentProjectId) === 0) {
                    this._projectForAllowedValues = project;
                    return false;
                }
            });

            // If the current project doesn't match the name of any of the 
            // projects we're bulk editing work items in, just use
            // the first project.
            if (!this._projectForAllowedValues) {
                this._projectForAllowedValues = this._projects[0];
            }
        }

        return this._projectForAllowedValues;
    }
}

VSS.initClassPrototype(WorkItemStoreMultiEditDataProvider, {
    _tfsContext: null,
    _store: null,
    _project: null,
    _queryAdapter: null
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Controls.BulkEdit", exports);
