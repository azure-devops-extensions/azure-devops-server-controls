import Q = require("q");

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import VSS = require("VSS/VSS");
import Ajax = require("VSS/Ajax");
import Combos = require("VSS/Controls/Combos");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");
import Performance = require("VSS/Performance");

import HostZIndexModifier = require("Widgets/Scripts/Shared/WidgetHostZIndexModifier");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import WidgetTelemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import TFS_WorkItemTracking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { setClassificationNodesUsingMRU } from "WorkItemTracking/Scripts/Utils/WorkItemClassificationUtils";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

var delegate = Utils_Core.delegate;

export class NewWorkItemWidget
    extends VSS_Control_BaseWidget.BaseWidgetControl<INewWorkItemWidgetOptions>
    implements Dashboards_WidgetContracts.IWidget {
    private static titleField = "SYSTEM.TITLE";
    private static witCategories: string[] = ["Microsoft.RequirementCategory", "Microsoft.TaskCategory", "Microsoft.BugCategory"];

    private static Telemetry_CreateLink = "CreateWorkItem";
    private static Telemetry_RecentlyCreatedWorkItemEditLink = "WorkItemEditLink";

    private editWorkItemDialog: IEditWorkItemDialog;
    private projectWrapper: IProjectWrapper;
    private view: INewWorkItemWidgetView;

    public workItemTypes: string[];
    public recentWorkItemIds: number[] = [];
    public _defaultWorkItemType: string;

    // This promise is settled when the widget is no longer handling the creation of a work item.
    // Used to prevent the user from creating multiple work items using the widget simultaneously.
    public _creatingWorkItemPromise: Q.IPromise<any>;

    // Because this widget uses a drop down (for work item type) that is visible outside the widget, 
    // there is an issue where the drop down is overlapped by other widgets. To address this issue
    // we use the WidgetHostZIndexModifier which bumps the widget host's z-index up / down when the
    // drop down is opened / closed so that the drop down won't be obscured by other widgets.
    //
    // WidgetHostZIndexModifier is single-use only so we have a method to create it 
    // (createWidgetHostZIndexModifier) when the drop down menu is opened and then that instance is 
    // stored (in widgetHostZIndexModifier) to be called when the menu is closed.
    private createWidgetHostZIndexModifier: () => HostZIndexModifier.IWidgetHostZIndexModifier;
    public widgetHostZIndexModifier: HostZIndexModifier.IWidgetHostZIndexModifier;

    /**
     * Constructor
     * @param options Used for dependency injection in unit tests
     */
    constructor(options = <INewWorkItemWidgetOptions>{}) {
        super(options);

        this.editWorkItemDialog = options.editWorkItemDialog || new EditWorkItemDialog();
        this.projectWrapper = options.projectWrapper || new ProjectWrapper();
        this.view = options.view || new NewWorkItemWidgetView();
        this.createWidgetHostZIndexModifier = options.createWidgetHostZIndexModifier || (() => HostZIndexModifier.WidgetHostZIndexModifier.create(this));
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "new-work-item"
        }, options));
    }

    public static parseWorkItemTypeFromSettings(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): string {
        var settings: INewWorkItemConfiguration = null;
        var workItemType: string = null;

        try {
            settings = JSON.parse(widgetSettings.customSettings.data);
        }
        catch (e) {
            // suppressing exception as we handle null configuration within load and Render. 
        }

        if (settings && settings.defaultWorkItemType) {
            workItemType = settings.defaultWorkItemType;
        }

        return workItemType;
    }


    public preload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this.view.initialize(this.getElement(), {
            onChange: delegate(this, this.onWorkItemTypeChange),
            onDropShow: delegate(this, this.onWorkItemTypeDropShow),
            onDropHide: delegate(this, this.onWorkItemTypeDropHide),
        });

        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement().addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);

        this.getElement().keypress(delegate(this, this.onKeyPress));

        // We want to validate whenever the work item title changes. The keyup
        // event causes validation while the user is typing, where as the change
        // event is triggered whenever the user changes the value without typing
        this.view.$workItemTitle
            .keyup(() => { this.validate() })
            .change(() => { this.validate() });

        this.view.$createWorkItem.click(delegate(this, this.onCreateButtonClick));
        this._defaultWorkItemType = NewWorkItemWidget.parseWorkItemTypeFromSettings(settings);
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return NewWorkItemWidget.getWorktItemTypeNames(this.projectWrapper, this.webContext.project.id)
            .then((list) => {
                this.workItemTypes = list;
                this.view.workItemTypeCombo.setSource(this.workItemTypes);
                NewWorkItemWidget.setDefaultWorkItemType(this._defaultWorkItemType, this.workItemTypes, this.view.workItemTypeCombo);
                this.publishLoadedEvent({});
                return WidgetHelpers.WidgetStatusHelper.Success();
            }
                ,
                ((e) => {
                    return WidgetHelpers.WidgetStatusHelper.Failure(e);
                })
            );
    }

    public onDashboardLoaded(): void {
        Service.getService(Contribution_Services.ExtensionService).getContributions(
            ["ms.vss-work-web.work-item-layout-user-settings-data-provider"],
            true,
            false,
            false);

        VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]);
    }

    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this._defaultWorkItemType = NewWorkItemWidget.parseWorkItemTypeFromSettings(settings);
        NewWorkItemWidget.setDefaultWorkItemType(this._defaultWorkItemType, this.workItemTypes, this.view.workItemTypeCombo);
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Fired when the user clicks the link in the widget (whether by mouse or keyboard) for a newly created work item
     */
    public _onRecentWorkItemLinkClick(workItem: WITOM.WorkItem) {
        this.editWorkItem(workItem);
        WidgetTelemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), NewWorkItemWidget.Telemetry_RecentlyCreatedWorkItemEditLink);
    }

    /**
     * Fired when the user presses a key anywhere within the widget
     */
    public onKeyPress(event: JQueryEventObject): void {
        if (event.which === Utils_UI.KeyCode.ENTER && this.validate()) {
            this.createWorkItem();
        }
    }

    /**
     * Fired when the user changes the work item type
     */
    public onWorkItemTypeChange(): void {
        this.validate();
    }

    /**
     * Fired when the work item type dropdown is opened
     */
    public onWorkItemTypeDropShow() {
        this.widgetHostZIndexModifier = this.createWidgetHostZIndexModifier();
        this.widgetHostZIndexModifier.bump();
    }

    /**
     * Fired when the work item type dropdown is closed
     */
    public onWorkItemTypeDropHide() {
        if (this.widgetHostZIndexModifier != null) {
            this.widgetHostZIndexModifier.reset();
            this.widgetHostZIndexModifier = null;
        }
    }

    public onCreateButtonClick(): void {
        if (!this.validate()) {
            return;
        }

        this.createWorkItem();
    }

    /**
     * Validate user inputs and give feedback to the user
     * @returns true if the form is valid and the user can create a work item, false otherwise
     */
    public validate(): boolean {
        var workItemTitle = this.view.$workItemTitle.val();
        var workItemType = this.view.workItemTypeCombo.getText();

        // We accept any non-empty string as the work item title
        var workItemTitleValid = !!workItemTitle;

        // We only accept a work item type that is in the list of valid types
        var workItemTypeValid = this.workItemTypes.indexOf(workItemType) >= 0;

        // Indicate to the user the validity of the dropdown
        this.view.workItemTypeCombo.setInvalid(!workItemTypeValid);

        // Work item title needs to be non-null and work item type needs to match 
        // one of the valid types in the list.
        var isValid = workItemTitleValid && workItemTypeValid;

        // Only allow the user to click the "Create" button if the form is valid
        this._disableCreateButton(!isValid);

        return isValid;
    }

    /**
     * Disable the create button. This one will be enabled during validation
     */
    public _disableCreateButton(isDisabled: boolean): void {
        let $button = this.view.$createWorkItem;
        $button.prop("disabled", isDisabled);

        let attrName = "aria-disabled";
        if (isDisabled) {
            $button.attr(attrName, "true");
        } else {
            $button.removeAttr(attrName);
        }
    }

    public static getWorktItemTypeNames(projectWrapper: IProjectWrapper, projectId): IPromise<string[]> {
        var defer = Q.defer<string[]>();
        projectWrapper.getWorkItemTypeNames(projectId)
            .then((workItemTypes: string[]) => {
                if (workItemTypes.length == 0) {
                    // No Workitem Types have been configured for this project
                    defer.reject(VSS_Resources_Common.FeatureEnablementSettings_Error_Missing);
                }
                else {
                    defer.resolve(workItemTypes);
                }
            }, (e) => {
                var error: string = TFS_Widget_Utilities.ErrorParser.stringifyError(e);
                defer.reject(error);
            });
        return defer.promise;
    }


    /**
    * Set the default work item type
    * @workItemType : the string of the work item type
    */
    public static setDefaultWorkItemType(workItemType: string, workItemTypeList: string[], comboBox: Combos.Combo): void {
        if (workItemTypeList && comboBox) {
            var index = workItemTypeList.indexOf(workItemType);
            if (index > -1) {
                comboBox.setSelectedIndex(index, false);
            } else {
                comboBox.setSelectedIndex(0, false);
            }
        }
    }

    /**
     * Create the work item so that it can be edited / saved
     */
    public createWorkItem(): void {
        // The button should not be clickable if the form isn't valid, but we 
        // check again just in case.
        if (!this.validate()) {
            return;
        }

        // Don't create a new work item if we're already in the process of making one
        if (this._creatingWorkItemPromise == null || !Q.isPending(this._creatingWorkItemPromise)) {
            var title = this.view.$workItemTitle.val();
            var typeName = this.view.workItemTypeCombo.getText();

            this._creatingWorkItemPromise = this.projectWrapper.createWorkItem(this.webContext.project.id, this.teamContext.id, typeName)
                .then(workItem => {
                    var properties: IDictionaryStringTo<any> = {
                        "WorkItemTypeName": workItem.workItemType.name
                    };

                    WidgetTelemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), NewWorkItemWidget.Telemetry_CreateLink, properties);
                    return this.handleCreatedWorkItem(workItem, title);
                })
                .then(null, error => { // Catch pattern
                    this.view.addRecentWorkItemErrorElement(error);
                });
        }
    }

    /**
     * Once the work item has been created, we can decide whether 
     * we can just save it or if we need the user to edit it first.
     * @param workItem The newly created work item
     * @param title The title the user entered before creation
     * @returns A promise that resolves when the work item has finished being handled
     */
    public handleCreatedWorkItem(workItem: WITOM.WorkItem, title: string): Q.Promise<{}> {
        workItem.setFieldValue(NewWorkItemWidget.titleField, title);
        return this.editWorkItem(workItem);
    }

    /**
     * Popup a dialog so the user can make necessary changes before saving / 
     * discarding the work item.
     * @param workItem The newly created work item
     * @returns A promise that resolves when the edit work item dialog is closed
     */
    public editWorkItem(workItem: WITOM.WorkItem): Q.Promise<{}> {
        var deferred = Q.defer();

        this.editWorkItemDialog.show(workItem, {
            save: () => { // User clicked the "Save" or the "Save and close" button in the dialog
                this.onWorkItemSaved(workItem);
            },
            close: () => { // User clicked the "Save and close" or the "Cancel" button in the dialog
                // Focus on the work item title so that the user can edit the
                // title (if they clicked "Cancel" without saving) or create a 
                // new work item (if they clicked "Save and close").
                this.view.$workItemTitle.focus();
                deferred.resolve({});
            },
        });

        return deferred.promise;
    }

    /**
     * Once a work item has been saved, clear the title, keep the combo to the same item type and disable the button.
     * Also, add the recently added item in the widget to let the user knows that this one got really added.
     */
    public onWorkItemSaved(workItem: WITOM.WorkItem): void {
        this.addRecentWorkItem(workItem);
        this.view.$workItemTitle.val("");
        this._disableCreateButton(true);
    }

    /**
     * Adds a link to the work item to a list within the widget that allows the
     * user to see / navigate to the work items they just created.
     */
    public addRecentWorkItem(workItem: WITOM.WorkItem): void {
        // Sometimes the save event fires multiple times so we keep track of 
        // items added so we don't add them more than once.
        if (this.recentWorkItemIds.indexOf(workItem.id) >= 0) {
            return;
        }

        this.recentWorkItemIds.push(workItem.id);
        let recentWorkItem = this.view.addRecentWorkItemElement(workItem, () => this._onRecentWorkItemLinkClick(workItem));
        recentWorkItem.setWorkItemTypeBarColor(workItem.project.name, workItem.workItemType.name);
    }
}

/**
 * Options passed to NewWorkItemWidget constructor (used for dependency injection)
 */
export interface INewWorkItemWidgetOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    editWorkItemDialog: IEditWorkItemDialog;
    projectWrapper: IProjectWrapper;
    view: INewWorkItemWidgetView;
    tfsContext: Contracts_Platform.WebContext;
    createWidgetHostZIndexModifier: () => HostZIndexModifier.IWidgetHostZIndexModifier;
}

/**
 * These are event handlers that need to be passed to the view since the Combo control needs them at creation time
 */
export interface INewWorkItemWidgetViewComboEventHandlers {
    onChange: () => void;
    onDropShow: () => void;
    onDropHide: () => void;
}

/**
 * The view handles layout of the DOM elements for this widget
 */
export interface INewWorkItemWidgetView {
    $wigetTitle: JQuery;
    $workItemTitle: JQuery;
    workItemTypeCombo: Combos.Combo;
    $createWorkItem: JQuery;
    $recentlyCreatedWorkItems: JQuery;

    initialize(containerElement: JQuery, comboEventHandlers: INewWorkItemWidgetViewComboEventHandlers);
    addRecentWorkItemElement(workItem: WITOM.WorkItem, onClickHandler: () => void): RecentlyCreatedWorkItemControl;
    addRecentWorkItemErrorElement(message: string);
}

/**
 * Options for a RecentlyCreatedWorkItem
 */
export interface RecentlyCreatedWorkItemControlOptions {
    workItemId: number;
    workItemTypeName: string;
    onClick: () => void;
}

/**
* Setting for the New Work Item widget
*/
export interface INewWorkItemConfiguration {
    defaultWorkItemType: string;
}

/**
 * Represents a newly created work item with a clickable link
 */
export class RecentlyCreatedWorkItemControl extends Controls.Control<RecentlyCreatedWorkItemControlOptions> {
    private static DomClass_ColorBar = "work-item-color";
    private static DomClass_EditLink = "recently-created-work-item-link";

    private _$colorBar: JQuery;
    private _$editLink: JQuery;

    public initialize() {
        this._$colorBar = $("<div>").addClass(RecentlyCreatedWorkItemControl.DomClass_ColorBar);

        var linkText = Utils_String.format("{0} {1}", this._options.workItemTypeName, this._options.workItemId);
        this._$editLink = $("<a>")
            .addClass(RecentlyCreatedWorkItemControl.DomClass_EditLink)
            .attr("role", "button")
            .attr("tabindex", 0)
            .text(linkText)
            .on("click", this._options.onClick)
            .on("keypress", (e) => this.onKeyPressHandler(e));

        RichContentTooltip.addIfOverflow(linkText, this._$editLink);

        this.getElement()
            .append(this._$colorBar)
            .append(this._$editLink);
    }

    public initializeOptions(options: RecentlyCreatedWorkItemControlOptions) {
        if (!options.workItemId || !options.workItemTypeName) {
            throw Error("Work item ID and type name are required to create this control");
        }

        super.initializeOptions($.extend({
            coreCssClass: "recently-created-work-item"
        }, options));
    }

    public setWorkItemTypeBarColor(projectName: string, workitemTypeName: string) {
        WorkItemTypeIconControl.renderWorkItemTypeIcon(this._$colorBar[0], workitemTypeName, projectName);
    }

    private onKeyPressHandler(e: JQueryEventObject): void {
        if (e.which === Utils_UI.KeyCode.SPACE || e.which === Utils_UI.KeyCode.ENTER) {
            this._options.onClick();
        }
    }
}

export class NewWorkItemWidgetView implements INewWorkItemWidgetView {
    private static maxRecentlyCreatedWorkItemCount = 1;
    private static fadeInTimeMilliseconds = 300;
    private static delayFadeOutTimeMilliseconds = 20000; // 20 seconds as per spec
    private static fadeOutTimeMilliseconds = 600;
    private static maxAllowedCharactersInTitle = 255; // Work Item form complains about titles longer than this

    public $wigetTitle: JQuery;
    public $workItemTitle: JQuery;
    public workItemTypeCombo: Combos.Combo;
    public $createWorkItem: JQuery;
    public $recentlyCreatedWorkItems: JQuery;

    /**
     * Add DOM elements to the parent container and position them etc.
     */
    public initialize(containerElement: JQuery, comboEventHandlers: INewWorkItemWidgetViewComboEventHandlers) {
        this.$wigetTitle = $("<h2>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .text(Resources.NewWorkItem_WidgetTitle)
            .appendTo(containerElement);

        this.$workItemTitle = $("<input>")
            .attr("type", "text")
            .attr("maxlength", NewWorkItemWidgetView.maxAllowedCharactersInTitle)
            .addClass("new-work-item-title")
            .attr("placeholder", Resources.NewWorkItem_EnterTitle)
            .attr("aria-label", Resources.NewWorkItem_Title_AriaLabel)
            .appendTo(containerElement);

        this.$createWorkItem = $("<button>")
            .addClass("cta new-work-item-create-button")
            .attr("disabled", "")
            .attr("aria-disabled", "true")
            .text(Resources.NewWorkItem_CreateButtonText);

        this.workItemTypeCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, containerElement,
            <Combos.IComboOptions>{
                cssClass: "new-work-item-type",
                inputCss: "new-work-item-type-input",

                // Ideally these event handlers should be added in the widget handler
                // itself but that does not seem possible with ControlsCommon.Combo
                change: comboEventHandlers.onChange,
                dropShow: () => {
                    comboEventHandlers.onDropShow();
                    return true;
                },
                dropHide: () => {
                    comboEventHandlers.onDropHide();
                    return true;
                },
                allowEdit: false,
                label: Resources.NewWorkItem_Type_AriaLabel,
                id: "work-item-type-dropdown"
            });

        this.$recentlyCreatedWorkItems = $("<div>")
            .addClass("recently-created-work-items")
            .appendTo(containerElement);

        this.$createWorkItem
            .appendTo($("<div>").addClass("bowtie")
                .addClass("add-new-work-item-container")
                .appendTo((containerElement)));
    }

    /**
     * Build a link to the work item that was just created and prepend it to the list of recently created work items
     * @param {WITOM.WorkItem} workItem - The newly created work item
     * @param {string} onClickHandler - The action to take when the link is clicked
     * @returns The element created for the new work item
     */
    public addRecentWorkItemElement(workItem: WITOM.WorkItem, onClickHandler: () => void): RecentlyCreatedWorkItemControl {
        var recentlyCreatedWorkItem = <RecentlyCreatedWorkItemControl>Controls.BaseControl.createIn(
            RecentlyCreatedWorkItemControl,
            null, // Don't want to append to anything but rather prepend later so limitNumberOfRecentItems() works properly
            <RecentlyCreatedWorkItemControlOptions>{
                workItemId: workItem.id,
                workItemTypeName: workItem.workItemType.name,
                onClick: onClickHandler
            });

        recentlyCreatedWorkItem.hideElement();
        this.$recentlyCreatedWorkItems.prepend(recentlyCreatedWorkItem.getElement());
        recentlyCreatedWorkItem.getElement()
            .fadeIn(NewWorkItemWidgetView.fadeInTimeMilliseconds)
            .delay(NewWorkItemWidgetView.delayFadeOutTimeMilliseconds)
            .fadeOut(NewWorkItemWidgetView.fadeOutTimeMilliseconds);

        this.limitNumberOfRecentItems();

        return recentlyCreatedWorkItem;
    }

    /**
     * There was an unexpected error when creating the work item so display a
     * message in its place.
     */
    public addRecentWorkItemErrorElement(message: string) {
        var $error = $("<div>")
            .addClass("recently-created-work-item-error")
            .text(message)
            .attr("title", message)
            .prependTo(this.$recentlyCreatedWorkItems);

        this.limitNumberOfRecentItems();
    }

    /**
     * We want to limit the number of recently created work items shown at any
     * one time as there is limited space on the widget so we show only the
     * n-latest work items.
     */
    private limitNumberOfRecentItems() {
        this.$recentlyCreatedWorkItems.children().slice(NewWorkItemWidgetView.maxRecentlyCreatedWorkItemCount).remove();
    }
}

/**
 * Options for IEditWorkItemDialog.show()
 */
export interface IEditWorkItemDialogShowOptions {
    save: () => void;
    close: () => void;
}

/**
 * Handles editing of work items in a dialog
 */
export interface IEditWorkItemDialog {
    show(workItem: WITOM.WorkItem, options: IEditWorkItemDialogShowOptions);
}

/**
 * Wrapper for WITControls.WorkItemForm.show()
 */
export class EditWorkItemDialog implements IEditWorkItemDialog {
    public show(workItem: WITOM.WorkItem, options: IEditWorkItemDialogShowOptions) {
        WITDialogShim.showWorkItem(workItem, options);
    }
}

/**
 * Options passed to ProjectWrapper constructor (used for dependency injection)
 */
export interface IProjectWrapperOptions {
    store: WITOM.WorkItemStore;
}

/**
 * Wraps work item management at project level
 */
export interface IProjectWrapper {
    createWorkItem(projectId: string, teamId: string, workItemTypeName: string): Q.IPromise<WITOM.WorkItem>;
    getWorkItemTypeNames(projectId: string): Q.IPromise<string[]>;
}

export class ProjectWrapper implements IProjectWrapper {
    private store: WITOM.WorkItemStore;
    private witManager: WorkItemManager;

    /**
     * Constructor
     * @param options Used for dependency injection in unit tests
     */
    constructor(options = <IProjectWrapperOptions>{}) {
        this.store = options.store || TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        this.witManager = WorkItemManager.get(this.store);
    }

    /**
     * Create a work item based on the type name
     * @param projectId The project id (a guid)
     * @param teamId The team id (a guid)
     * @param workItemTypeName The name of the work item type as returned by getWorkItemTypeNames
     */
    public createWorkItem(projectId: string, teamId: string, workItemTypeName: string): Q.IPromise<WITOM.WorkItem> {
        var deferred = Q.defer<WITOM.WorkItem>();

        this.store.beginGetProject(projectId, (project: WITOM.Project) => {
            project.beginGetWorkItemType(workItemTypeName, (workItemType: WITOM.WorkItemType) => {
                const workItem = WorkItemManager.get(this.store).createWorkItem(workItemType);
                setClassificationNodesUsingMRU(workItem, projectId).then(
                    () => {
                        workItem.resetManualFieldChanges();
                        deferred.resolve(workItem);
                    },
                    (error) => {
                        deferred.reject(error);
                    }
                );
            }, (error) => {
                deferred.reject(error);
            });
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /**
     * Gets a list of type names for work items that the user is able to create
     * @param projectId The project id (a guid)
     */
    public getWorkItemTypeNames(projectId: string): Q.IPromise<string[]> {
        var deferred = Q.defer<string[]>();

        this.store.beginGetProject(projectId, (project: WITOM.Project) => {
            project.beginGetVisibleWorkItemTypeNames((workItemTypes: string[]) => {
                deferred.resolve(workItemTypes);
            }, (error) => {
                deferred.reject(error);
            });
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }
}

SDK.VSS.register("dashboards.newWorkItem", () => NewWorkItemWidget);
SDK.registerContent("dashboards.newWorkItem-init", (context) => {
    return Controls.create(NewWorkItemWidget, context.$container, context.options);
});
