import React = require("react");
import ReactDOM = require("react-dom");

import { IOpenDropDownOnFocusComboOptions, OpenDropDownOnFocusCombo } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import { IContributedArtifactLinkProvider } from "TFS/WorkItemTracking/ExtensionContracts";
import "VSS/LoaderPlugins/Css!WorkItemArea";
import * as Telemetry from "VSS/Telemetry/Services";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { ContributedLinkForm } from "WorkItemTracking/Scripts/ContributedLinkForm";
import { LinkDirection, TopologyOptions, TopologyType } from "WorkItemTracking/Scripts/Controls/LinksVisualization/Interfaces";
import { ILinksTopologyVisualizationControlProps, LinksTopologyVisualizationControl } from "WorkItemTracking/Scripts/Controls/LinksVisualization/LinksTopologyVisualizationControl";
import { WITCustomerIntelligenceArea } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { LinkedWorkItemDataProviderConstants } from "WorkItemTracking/Scripts/DataProviders/LinkedWorkItemDataProvider";
import { beginGetLinkForm, LinkForm } from "WorkItemTracking/Scripts/LinkForm";
import { IRegisteredLinkType, IWorkItemLinkType, IWorkItemLinkTypeEnd } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { LinkFilterHelper, StyleConstants } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking";
import { LinkTypeComboBox } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Dialogs.LinkComboBox";
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Events_Actions = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Service = require("VSS/Service");
import Settings_RestClient = require("VSS/Settings/RestClient");
import VSSError = require("VSS/Error");
import LinksSrcWorkItemVisualization = require("WorkItemTracking/Scripts/Controls/LinksVisualization/LinksSourceWorkItemsVisualizationControl");
import Contributions_Controls = require("VSS/Contributions/Controls");

const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const delegate = Utils_Core.delegate;
const eventSvc = Events_Services.getService();

namespace PreferenceConstants {
    export const PREFERENCE_NAME = "Microsoft.TeamFoundation.WorkItemTracking.Linking";
    export const LAST_SELECTED_WORK_ITEM_TYPE = "LastSelectedWorkItemType";
    export const LAST_SELECTED_LINK_TYPE_EXISTING = "LastSelectedLinkType.Existing";
    export const LAST_SELECTED_LINK_TYPE_NEW = "LastSelectedLinkType.New";
}

export interface LinkDialogOptions extends Dialogs.IModalDialogOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export abstract class LinkDialog extends Dialogs.ModalDialogO<LinkDialogOptions> {

    public static LINKDIALOG_OK_VALIDATION = "linkdialog-ok-button-state-change";
    public _preferences: any;
    public _workItem: any;
    public _workItemIds: string[];

    public _multipleTarget: any;
    private $linkTypeContainer: JQuery;
    public $formContainer: any;

    public _currentForm: any;
    public _validLinkTypes: any;
    public _validToolTypeToLinkTypesMap: {
        [toolType: string]: string[]
    };
    protected _selectedLinkType: string;
    private _linkTypeNameToToolTypeNameMap: { [linkTypeName: string]: string };
    private _linkTypeValid: boolean;
    private _linkFormValid: boolean;
    private _lastLinkType: string = null;
    private _okValidationHandler: IEventHandler;
    private _openWorkItemActionWorker: Events_Actions.IActionWorker =
        function (actionArgs, next) {
            return LinkedWorkItemDataProviderConstants.WorkItemOpenNotHandled;
        };

    constructor(options?) {
        super($.extend(options, {
            useBowtieStyle: false,
            bowtieVersion: 0
        }));

        Diag.Debug.assert(options.workItem instanceof WITOM.WorkItem, "options.workItem should be of type VSS.WIT.OM.WorkItem");
        this._workItem = options.workItem;
        this._workItemIds = options.workItemIds;
        this._multipleTarget = options.multipleTarget === true;

        //  Add an open work item handler to the top of the workers list which forces default open artifact behavior.
        Events_Actions.getService().registerActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._openWorkItemActionWorker,
            0);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend(options, {
            resizable: true,
            width: 600,
            cssClass: "link-dialog"
        }));
    }

    public abstract getLastSelectedLinkTypeSettingsKey(): string;

    public abstract getLastSelectedLinkType(): string;

    public setLastSelectedLinkType() {
        const settingsToUpdate: any = {};
        settingsToUpdate[`${PreferenceConstants.PREFERENCE_NAME}/${this.getLastSelectedLinkTypeSettingsKey()}`] = this._selectedLinkType;
        return Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me").then(null, (error) => {
            const details: TfsError = {
                name: "LinkDialogPromiseError",
                message: "setEntries() failed in setLastSelectedLinkType: " + JSON.stringify(error)
            };
            VSSError.publishErrorToTelemetry(details);
        });
    }

    public getInitialFocusElement() {
        // Default behavior is to set focus to first element
        const firstEnabled = $("input:not([disabled])", this._element);
        Diag.Debug.assertIsObject(firstEnabled, "no enabled inputs found on the page.");
        return firstEnabled;
    }

    public initialize() {
        let focusElement;

        super.initialize();

        const initialize = (preferences) => {
            this._preferences = preferences;
            this._decorate();

            this._populateLinkTypesAndToolTypes();

            focusElement = this.getInitialFocusElement();
            this.setFormFocusDelayed(focusElement);
        };

        this._okValidationHandler = (sender: any, status: any) => {
            if (status) {
                // Store respective valiation status
                if (status.linkForm !== undefined && status.linkForm !== null) {
                    this._linkFormValid = status.linkForm;
                }

                if (status.linkType !== undefined && status.linkType !== null) {
                    this._linkTypeValid = status.linkType;
                }
            }

            this._renderLinkComboBox();

            // Update OK button status
            const isValid = this._linkFormValid !== false && // Link form validity
                this._linkTypeValid !== false; // Link type validity

            this.updateOkButton(isValid);
        };

        eventSvc.attachEvent(LinkForm.LINKFORM_VALIDATED, this._okValidationHandler);

        Service.getClient(Settings_RestClient.SettingsHttpClient).getEntries("me", PreferenceConstants.PREFERENCE_NAME).then((entries: any) => {
            initialize(entries.value);
        }, (error) => {
            const details: TfsError = {
                name: "LinkDialogPromiseError",
                message: "getEntries() failed in LinkDialog.initialize: " + JSON.stringify(error)
            };
            VSSError.publishErrorToTelemetry(details);

            initialize({});
        });
    }

    public _loadForm(linkType, callback?: () => void) {
        /// <summary>This method is implemented by derived dialogs</summary>
        if ($.isFunction(callback)) {
            callback.call(this);
        }
    }

    public _unloadForm() {
        if (this._currentForm) {
            this._currentForm.unload();
            this._currentForm = null;
        }

        if (this.$formContainer) {
            this.$formContainer.empty();
        }
    }

    public _unloadLinkDialog() {
        this._unloadForm();
        this._workItem = null;
        this._validLinkTypes = null;
        this._workItemIds = null;

        //  Remove our open work item handler.
        Events_Actions.getService().unregisterActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._openWorkItemActionWorker);
    }

    public getTitle(): string {
        /// <returns type="string" />
        return Resources.LinksControlAddLinkDisplayText;
    }

    /**
     * Load link form with the type (assume link type is validated already) , if not exist then unload form
     * @param linkType
     */
    private _loadFormWithLinkType(linkType: string) {
        if (linkType) {
            this._loadForm(linkType, () => {
                this._fireLinkTypeChanged(linkType);
            });
        } else {
            this._unloadForm();
        }
    }

    private _fireLinkTypeValidationEvent(isValid: boolean) {
        eventSvc.fire(LinkForm.LINKFORM_VALIDATED, this, { linkType: isValid });
    }

    private _logLinkTypeSelected(linkType: string) {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                "LinkDialog.LinkTypeSelected",
                { previous: this._lastLinkType, current: linkType }
            )
        );
        this._lastLinkType = linkType;
    }

    private _onComboLinkTypeChanged = (value?: string): void => {
        if (value && this._validLinkTypes.indexOf(value) >= 0) {
            if (this._selectedLinkType !== value) {
                this._selectedLinkType = value;
                this._logLinkTypeSelected(value);
                this._loadFormWithLinkType(value);
            }

            this._fireLinkTypeValidationEvent(true);
        } else {
            this._fireLinkTypeValidationEvent(false);
        }
    }

    public onLinkTypeSelected(index: number) {
        let linkType: string;
        if (index >= 0) {
            linkType = this._validLinkTypes[index];
            this._logLinkTypeSelected(linkType);
            this._fireLinkTypeValidationEvent(true);
        }
        this._loadFormWithLinkType(linkType);
    }

    public onClose(e?) {
        this._unloadLinkDialog();
        eventSvc.detachEvent(LinkForm.LINKFORM_VALIDATED, this._okValidationHandler);
        super.onClose(e);
    }

    private _decorate() {

        const element = this._element;

        // Adding the description
        element.append(
            $("<div/>")
                .addClass("bowtie-style")
                .append(
                    $("<p/>")
                        .addClass("link-dialog-description")
                        .text(Resources.LinkDialogDescription)
                )
        );

        // Adding the "From" links section.
        this._addFromLinksSection(element);

        // Creating container for the link type combo
        this.$linkTypeContainer = $("<div/>")
            .appendTo(element);

        // Creating container for link type forms which vary according to the link type selected
        // Link dialog is currently using the deprecated "bowtie-style" class; this messes up paragraph spacing. Using the newer "bowtie" class.
        this.$formContainer = $("<div />").addClass("link-dialog-form-container bowtie").appendTo(element);
    }

    private _renderLinkComboBox = () => {
        ReactDOM.render(
            React.createElement(
                LinkTypeComboBox,
                {
                    toolTypeToLinkTypeMap: this._validToolTypeToLinkTypesMap,
                    selected: this._selectedLinkType,
                    onChanged: this._onComboLinkTypeChanged,
                    error: this._linkTypeValid === false
                }
            ), this.$linkTypeContainer[0]
        );
    }

    public _getRegisteredLinkTypes(regLinkTypes: string[]): string[] {
        /// <summary>This method is implemented by derived dialogs</summary>
        return [];
    }

    public _getWorkItemLinkTypes(witLinkTypes) {
        /// <summary>This method is implemented by derived dialogs</summary>
        return [];
    }

    public _getContributedLinkTypes() {
        /// <summary>This method is implemented by derived dialogs</summary>
        return [];
    }

    private _populateLinkTypesAndToolTypes() {
        const workItem: WITOM.WorkItem = this._workItem;

        workItem.store.beginGetContributedLinkTypes().then(() => {
            workItem.store.beginGetLinkTypes((witLinkTypes: IWorkItemLinkType[], regLinkTypes: IRegisteredLinkType[]) => {
                this._linkTypeNameToToolTypeNameMap = {};
                for (const regLinkType of regLinkTypes) {
                    const linkName: string = LinkingUtils.getRegisteredLinkName(regLinkType.name, workItem.store);
                    const toolName: string = LinkingUtils.getFriendlyToolName(regLinkType.toolId);
                    this._linkTypeNameToToolTypeNameMap[linkName] = toolName;
                };

                const workItemLinkTypes: string[] = this._getWorkItemLinkTypes(witLinkTypes);
                const workItemLinkTypesMap: IDictionaryStringTo<IWorkItemLinkType> = workItem.store.getLinkTypesMap();
                for (const workItemLinkTypeName of workItemLinkTypes) {
                    const linkType = workItemLinkTypesMap[workItemLinkTypeName];
                    if (linkType.isRemote) {
                        this._linkTypeNameToToolTypeNameMap[workItemLinkTypeName] = Resources.LinkToolTypeRemoteWork;
                    } else {
                        this._linkTypeNameToToolTypeNameMap[workItemLinkTypeName] = Resources.LinkToolTypeWork;
                    }
                };

                this._validLinkTypes = [].concat(
                    this._getRegisteredLinkTypes(regLinkTypes.map(rlt => rlt.name)),
                    workItemLinkTypes,
                    this._getContributedLinkTypes()
                );

                this._validToolTypeToLinkTypesMap = {};
                this._validLinkTypes.sort(Utils_String.localeIgnoreCaseComparer);
                this._validLinkTypes.forEach(lt => {
                    const toolName: string = this._linkTypeNameToToolTypeNameMap[lt];
                    if (!this._validToolTypeToLinkTypesMap[toolName]) {
                        this._validToolTypeToLinkTypesMap[toolName] = [];
                    }
                    this._validToolTypeToLinkTypesMap[toolName].push(lt);
                });

                if (this._validLinkTypes.length) {
                    const lastSelected = this.getLastSelectedLinkType();
                    let selected;
                    if (lastSelected && $.inArray(lastSelected, this._validLinkTypes) >= 0) {
                        selected = lastSelected;
                    } else {
                        selected = this._validLinkTypes[0];
                    }

                    this._selectedLinkType = selected;

                    this._loadForm(selected, () => {
                        this._fireLinkTypeChanged(selected);
                    });
                }

                this._renderLinkComboBox();

                Diag.logTracePoint("LinkDialog._populateLinkTypes.complete");
            });
        }, (err) => {
            const msg = "Failed to load Contributed LinkTypes: " + JSON.stringify(err);
            const details: TfsError = {
                name: "LinkDialogPromiseError",
                message: msg
            };
            VSSError.publishErrorToTelemetry(details);
            Diag.Debug.fail(msg);
        });
    }

    private _fireLinkTypeChanged(linkType) {
        // Notifying link form about the link type change
        if (this._currentForm && $.isFunction(this._currentForm.linkTypeChanged)) {
            this._currentForm.linkTypeChanged(linkType);
        }
    }

    private _addFromLinksSection(container: JQuery): void {
        const workItemIdsList: number[] = this._workItemIds.map(Number);
        const $childContainer = $("<div/>").appendTo(container);
        ReactDOM.render(
            React.createElement(
                LinksSrcWorkItemVisualization.LinksSourceWorkItemsVisualizationControl,
                <LinksSrcWorkItemVisualization.ILinksSourceWorkItemsVisualizationControlProps>{
                    workItem: this._workItem,
                    tfsContext: tfsContext,
                    workItemIds: workItemIdsList
                }),
            $childContainer[0]);
    }
}

VSS.initClassPrototype(LinkDialog, {
    _preferences: null,
    _workItem: null,
    _multipleTarget: null,
    $formContainer: null,
    _currentForm: null,
    _validLinkTypes: null
});

export class LinkToExistingDialog extends LinkDialog {

    public static enhancementTypeName: string = "LinkToExistingDialog";

    private _linkFormNames: any;
    private _linkTypeNames: any;
    private _nextFormName: string;
    private _currentFormName: any;
    private _rawOptions: any;

    constructor(options?) {
        super(options);

        this._rawOptions = options;
    }

    public getLastSelectedLinkTypeSettingsKey(): string {
        return PreferenceConstants.LAST_SELECTED_LINK_TYPE_EXISTING;
    }

    public getLastSelectedLinkType(): string {
        return this._preferences[PreferenceConstants.LAST_SELECTED_LINK_TYPE_EXISTING];
    }

    public getDialogResult() {
        if (this._currentForm) {
            this.setLastSelectedLinkType();
            return this._currentForm.getLinkResult();
        }
    }

    public _unloadForm() {
        super._unloadForm();
        this._currentFormName = null;
    }

    public _unloadLinkDialog() {
        super._unloadLinkDialog();
        this._linkFormNames = null;
        this._linkTypeNames = null;
    }

    private _ensureFormHash() {
        if (!this._linkFormNames) {
            this._linkFormNames = {};
        }
        if (!this._linkTypeNames) {
            this._linkTypeNames = {};
        }
    }

    public _getRegisteredLinkTypes(regLinkTypes: string[]): string[] {
        const linkTypes: string[] = [];
        const workItem = this._workItem;
        const filterHelper = new LinkFilterHelper(this._options);

        this._ensureFormHash();

        // Populating registered link types first by applying the filters
        regLinkTypes.forEach((linkType: string) => {
            const name = LinkingUtils.getRegisteredLinkName(linkType, workItem.store);
            if (linkType !== RegisteredLinkTypeNames.Related && !filterHelper.isLinkTypeFilteredOut(linkType, false, workItem.store)) {
                linkTypes.push(name);
                this._linkFormNames[name] = linkType;
                this._linkTypeNames[name] = linkType;
            }
        });

        return linkTypes;
    }

    public _getWorkItemLinkTypes(witLinkTypes: IWorkItemLinkType[]): string[] {
        const self = this;
        const linkTypes: string[] = [];
        let validTypes;
        const workItem = this._workItem;
        const filterHelper = new LinkFilterHelper(this._options);

        // Getting valid work item link types according to the filters
        validTypes = filterHelper.getValidLinkTypesForWorkItem(workItem);
        this._ensureFormHash();

        // Populating work item link types
        $.each(validTypes, function (ind, linkType) {

            const lte: IWorkItemLinkTypeEnd = workItem.store.findLinkTypeEnd(linkType);

            linkTypes.push(lte.name);
            self._linkFormNames[lte.name] = lte.linkType && lte.linkType.isRemote ? RegisteredLinkTypeNames.RemoteWorkItemLink : RegisteredLinkTypeNames.WorkItemLink;
            self._linkTypeNames[lte.name] = lte.immutableName;
        });
        return linkTypes;
    }

    public _getContributedLinkTypes() {
        const self = this;
        const linkTypes = [];
        const workItem = this._workItem;
        const filterHelper = new LinkFilterHelper(this._options);
        let contributedLinkTypes: WITOM.IContributedLinkTypes;

        this._ensureFormHash();

        // Populate contributed link types by applying the filters
        contributedLinkTypes = workItem.store.getContributedLinkTypes();
        for (const linkType in contributedLinkTypes) {
            if (linkType !== RegisteredLinkTypeNames.Related && !filterHelper.isLinkTypeFilteredOut(linkType, false, workItem.store)) {
                const linkTypeData: WITOM.IContributedLinkTypeData = contributedLinkTypes[linkType];
                linkTypes.push(linkTypeData.linkTypeName);
                self._linkFormNames[linkTypeData.linkTypeName] = linkType;
                self._linkTypeNames[linkTypeData.linkTypeName] = linkType;
            }
        }

        return linkTypes;
    }

    public _loadForm(linkType, callback?: () => void) {
        const linkFormName = this._linkFormNames[linkType];

        this._nextFormName = linkFormName;

        function unload(self) {
            // Unloading existing form
            self._unloadForm();

            // Disabling OK button
            self.updateOkButton(false);
        }

        function invokeCallback() {
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        }

        if (linkFormName !== this._currentFormName) {
            // Accessible loading experience
            const formLoadingAnnouncer = new ProgressAnnouncer({
                announceStartMessage: Resources.LinkingDialog_LoadingStart,
                announceEndMessage: Resources.LinkingDialog_LoadingEnd
            });

            beginGetLinkForm(linkFormName, (linkFormType: any) => {
                // Bail if the link type name has changed before the request has returned
                if (linkFormName !== this._nextFormName) {
                    return;
                }

                let formOptions: any;

                unload(this);

                const saveState = (createdForm: LinkForm | Controls.Control<any>) => {
                    this._currentForm = createdForm;
                    this._currentFormName = linkFormName;
                };

                formOptions = $.extend({ workItem: this._workItem, preferences: this._preferences, linkType: linkType }, $.extend(this._rawOptions, { width: "100%" }));
                if (linkFormType) {
                    // Loading new form
                    saveState(Controls.BaseControl.createIn(linkFormType, this.$formContainer, formOptions));

                } else {
                    // Get the link data from linkType.
                    const linkTypes = this._workItem.store.getContributedLinkTypes();
                    const linkTypeData: WITOM.IContributedLinkTypeData = linkTypes[linkFormName];
                    // A native link form was not found. Check if we can find a form contributed by an extension.
                    this._getContributedArtifactLinkProvider(linkTypeData.contributionId, formOptions).then((contributedLinkProvider: IContributedArtifactLinkProvider) => {
                        // Render the LinkForm using the Link Provider returned by the extension.
                        let contributedArtifactLinkForm = new ContributedLinkForm(contributedLinkProvider, linkTypeData, formOptions);
                        contributedArtifactLinkForm.createIn(this.$formContainer);
                        saveState(contributedArtifactLinkForm);
                    }, (err: any) => {
                        this.$formContainer.append($("<p/>").text(Utils_String.format(Resources.LinkToExistingDialogFormNotFound, linkType)));
                    });
                }

                invokeCallback();
                formLoadingAnnouncer.announceCompleted();
            });
        } else {
            invokeCallback();
        }
    }

    private _getContributedArtifactLinkProvider(contrib: string, formOptions: any): IPromise<IContributedArtifactLinkProvider> {

        return Contributions_Controls.getBackgroundHost(contrib).then((contributionHost) => {
            return contributionHost.getLoadPromise().then(() => {
                return contributionHost.getRegisteredInstance<any>("ArtifactLinkProvider").then((instance: any) => {
                    return instance;
                });
            }, (err) => {
                const msg = "failed to load contribution. " + JSON.stringify(err);
                const details: TfsError = {
                    name: "LinkDialogPromiseError",
                    message: msg
                };
                VSSError.publishErrorToTelemetry(details);
                Diag.Debug.fail(msg);
            });
        });
    }
}

VSS.initClassPrototype(LinkToExistingDialog, {
    _linkFormNames: null,
    _linkTypeNames: null,
    _currentFormName: null
});

class NewWorkItemForm extends Controls.BaseControl {

    private _workItem: any;
    private _currentLinkType: any;
    private _currentLinkTypeInfo: any;
    private _workItemTypes: string[];
    private _workItemTypeErrorContainer: JQuery;
    private $container: JQuery;

    public workItemTypesCombo: OpenDropDownOnFocusCombo;
    public $description: any;

    constructor(options?) {

        super(options);

        Diag.Debug.assert(options.workItem instanceof WITOM.WorkItem, "options.workItem should be of type VSS.WIT.OM.WorkItem");
        this._workItem = options.workItem;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "link-dialog-form"
        }, options));
    }

    public getLastSelectedWorkItemType(): string {
        return this._options.preferences[PreferenceConstants.LAST_SELECTED_WORK_ITEM_TYPE];
    }

    public setLastSelectedWorkItemType() {
        const settingsToUpdate: any = {};
        settingsToUpdate[PreferenceConstants.PREFERENCE_NAME + "/" + PreferenceConstants.LAST_SELECTED_WORK_ITEM_TYPE] = $.trim(this.workItemTypesCombo.getText());
        return Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me").then(null, (error) => {
            const details: TfsError = {
                name: "LinkDialogPromiseError",
                message: "setEntries() failed in NewWorkItemForm.setLastSelectedWorkItemType: " + JSON.stringify(error)
            };
            VSSError.publishErrorToTelemetry(details);
        });
    }

    public initialize() {
        super.initialize();

        // Adding work item type field
        const workItemTypesID = "work-item-types";
        this._workItemTypeErrorContainer = $("<div/>").addClass("work-item-type-error-message");
        this._element.append(
            LinkForm.createTitleElementWithIconClass(
                Resources.NewLinkedWorkItemTypeTitle,
                workItemTypesID,
                StyleConstants.CSS_CLASS_TARGET_ICON,
                "inline-label",
                this._workItemTypeErrorContainer));

        this.workItemTypesCombo = <OpenDropDownOnFocusCombo>Controls.BaseControl.createIn<IOpenDropDownOnFocusComboOptions>(OpenDropDownOnFocusCombo, this._element, {
            id: workItemTypesID,
            cssClass: "link-dialog-title-combobox",
            allowEdit: true,
            autoComplete: true,
            setTitleOnlyOnOverflow: true,
            change: Utils_Core.throttledDelegate(this, 150, this._onWorkItemTypeComboChange) // Throttle change event prevent interim flickering error message
        });

        const workItemTitleID = "dialog-label";
        this._element.append(
            LinkForm.createTitleElement(
                Resources.NewLinkedWorkItemTitle,
                workItemTitleID));

        this._element
            .append($("<input />")
                .addClass("link-dialog-width-100 initial-focus")
                .attr("type", "text")
                .attr("id", workItemTitleID)
                .bind("change", delegate(this, this._onTitleChange)));

        // Adding description field for information messages
        this.$description = $("<div />").attr("id", "description").addClass("message");
        this._element.append(this.$description);

        // Adding link visualization
        this.$container = $("<div/>").appendTo(this._element);
        this.renderLinkTopologyVisualization();

        // Adding comment field
        this._createComment();

        this._populateWits();
    }

    public renderLinkTopologyVisualization(partialProps: Partial<ILinksTopologyVisualizationControlProps> = {}) {
        if (this.isDisposed()) {
            return;
        }

        let topologyOptions: TopologyOptions;
        if (this._currentLinkTypeInfo) {
            const topologyType: TopologyType = LinkingUtils.getTopology(this._currentLinkTypeInfo.topology);
            const linkDirection: LinkDirection = LinkingUtils.getLinkDirection(this._currentLinkTypeInfo.isForward, topologyType);
            topologyOptions = {
                topology: topologyType,
                linkDirection
            };
        } else {
            topologyOptions = LinkingUtils.DefaultTopologyOptions;
        }

        const defaultProps = {
            topologyOptions,
            tfsContext,
            workItemIds: [],
            workItem: this._workItem,
            isVisible: true,
            showLinks: false,
            showLinkImage: true
        };

        ReactDOM.render(
            React.createElement(
                LinksTopologyVisualizationControl,
                { ...defaultProps, ...partialProps }),
            this.$container[0]);
    }

    private unmountLinkTopologyVisualization() {
        ReactDOM.unmountComponentAtNode(this.$container[0]);
    }

    public linkTypeChanged(linkType) {
        if (linkType !== this._currentLinkType) {
            this._currentLinkType = linkType;
            this._currentLinkTypeInfo = this._getLinkTypeInfo(linkType);
            this._updateLinkVisualization();
        }
    }

    public getWorkItemResult() {
        return {
            linkTypeEnd: this._currentLinkType,
            workItemType: this.workItemTypesCombo.getText(),
            title: $.trim(this._element.find("#dialog-label").val()),
            comment: $.trim(this._element.find("#comment").val())
        };
    }

    public _createComment() {
        /// <summary>Creates comment elements for the form</summary>
        const commentID = "comment";
        this._element.append(LinkForm.createTitleElement(Resources.LinkDialogCommentTitle, commentID));
        this._element
            .append($("<input>")
                .attr("type", "text")
                .attr("id", commentID)
                // 255-character limit is enforced on the backend
                .attr("maxlength", "255")
                .addClass("link-dialog-width-100"));
    }

    public unload() {
        this.workItemTypesCombo.dispose();
        this.workItemTypesCombo = null;
        this.$description.remove();
        this.$description = null;

        this._workItem = null;
        this.unmountLinkTopologyVisualization();
        this._currentLinkType = null;

        this.dispose();
    }

    private _onTitleChange(e?) {
        this._updateLinkVisualization();
    }

    private _getLinkTypeInfo(linkType: string): any {
        /// <summary>Gets the link type details such as topology and isForwardLink of specified
        /// work item link type</summary>
        /// <param name="linkType" type="String">Link type end name</param>
        /// <returns type="Object">topology(String) and isForward(Boolean)</returns>

        const workItem = this._workItem;
        const linkTypeEnd = workItem.store.findLinkTypeEnd(linkType);

        return {
            topology: linkTypeEnd.linkType.topology,
            isForward: linkTypeEnd.isForwardLink
        };
    }

    private _updateLinkVisualization() {
        this.renderLinkTopologyVisualization({
            showLinks: true
        });
    }

    private _populateWits() {
        let selected;
        let lastSelected;
        const filterHelper = new LinkFilterHelper(this._options);

        filterHelper.getValidWitsForProject(this._workItem.project, (validWits) => {

            if (validWits.length) {
                this._workItemTypes = validWits;

                // Setting source
                this.workItemTypesCombo.setSource(validWits);

                // Trying to set last selected work item type
                lastSelected = this.getLastSelectedWorkItemType();
                if (lastSelected && $.inArray(lastSelected, validWits) >= 0) {
                    selected = lastSelected;
                } else {
                    selected = validWits[0];
                }

                this.workItemTypesCombo.setText(selected);

                // Enable OK button
                eventSvc.fire(LinkForm.LINKFORM_VALIDATED, this, { linkForm: true });
            } else {
                this.$description.text(Resources.LinkDialogErrorWorkItemTypesToAdd);
            }
        });
    }

    private _onWorkItemTypeComboChange() {
        const isWorkItemTypeValid = this._workItemTypes &&
            this._workItemTypes.indexOf(this.workItemTypesCombo.getValue<string>()) >= 0; // Does not require case insensitive compare since we have auto complete

        if (!isWorkItemTypeValid) {
            if (this._workItemTypeErrorContainer.children().length === 0) {
                this._workItemTypeErrorContainer
                    .append($("<span/>").addClass("bowtie-icon bowtie-status-error"))
                    .append($("<div/>").addClass("error-text").text(Resources.LinkWorkItemTypeNotValid));
            }
        } else {
            this._workItemTypeErrorContainer.empty();
        }

        // Notify link dialog for OK button status update
        eventSvc.fire(LinkForm.LINKFORM_VALIDATED, this, { linkForm: isWorkItemTypeValid });
    }
}

VSS.initClassPrototype(NewWorkItemForm, {
    _workItem: null,
    $workItemTypes: null,
    $description: null,
    _currentLinkType: null,
    _currentlinkTypeInfo: null
});

export class NewLinkedWorkItemDialog extends LinkDialog {

    public static enhancementTypeName: string = "NewLinkedWorkItemDialog";

    constructor(options?) {
        super(options);
    }

    public getLastSelectedLinkTypeSettingsKey(): string {
        return PreferenceConstants.LAST_SELECTED_LINK_TYPE_NEW;
    }

    public getLastSelectedLinkType(): string {
        return this._preferences[PreferenceConstants.LAST_SELECTED_LINK_TYPE_NEW];
    }

    public getInitialFocusElement() {
        // Set initial focus on this form based on "initial-focus" class.
        const focusElement = $("input.initial-focus:not([disabled])", this._element);
        Diag.Debug.assertIsObject(focusElement, "no enabled inputs marked for initial-focus found on the page.");
        return focusElement;
    }

    public getDialogResult() {
        this.setLastSelectedLinkType();
        this._currentForm.setLastSelectedWorkItemType();
        return this._currentForm.getWorkItemResult();
    }

    public _getWorkItemLinkTypes(witLinkTypes) {
        const linkTypes = [];
        let validTypes;
        const filterHelper = new LinkFilterHelper(this._options);
        const workItem = this._workItem;
        const multiple = this._multipleTarget;

        // Getting valid work item link types according to the filters
        validTypes = filterHelper.getValidLinkTypesForWorkItem(workItem);

        // Populating work item link types
        for (const lt of validTypes) {
            const linkTypeEnd: IWorkItemLinkTypeEnd = workItem.store.findLinkTypeEnd(lt);
            // Block remote link for new link addition
            if ((!multiple || linkTypeEnd.linkType.topology !== "Tree" || !linkTypeEnd.isForwardLink) && !linkTypeEnd.linkType.isRemote) {
                linkTypes.push(linkTypeEnd.name);
            }
        }
        return linkTypes;
    }

    public _loadForm(linkType, callback?: () => void) {
        let formOptions;

        if (!this._currentForm) {
            formOptions = $.extend($.extend({ workItem: this._workItem, preferences: this._preferences }, this._options), { width: "100%" });
            this._currentForm = <NewWorkItemForm>Controls.BaseControl.createIn(NewWorkItemForm, this.$formContainer, formOptions);
        }

        if ($.isFunction(callback)) {
            callback.call(this);
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Linking.Dialogs", exports);