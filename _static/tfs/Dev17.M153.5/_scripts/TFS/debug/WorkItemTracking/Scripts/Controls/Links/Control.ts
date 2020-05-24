/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Controls/Links/LinksControl";

import Q = require("q");

import VSS = require("VSS/VSS");

import React = require("react");
import ReactDOM = require("react-dom");

import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Contributions_Services = require("VSS/Contributions/Services");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import VSSError = require("VSS/Error");
import Menus = require("VSS/Controls/Menus");

import Events_Services = require("VSS/Events/Services");
import Events_Handlers = require("VSS/Events/Handlers");

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IWorkItemLinkType } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { LinkedArtifactsControl, ILinkedArtifactControlOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";
import {
    ViewMode, IZeroDataOptions, IZeroDataAction, ZeroDataExperienceViewMode, IHostArtifact, IInternalLinkedArtifactDisplayData, IColumn,
    InternalKnownColumns, ILinkedArtifactSubtypeFilterConfiguration, FetchingLinks, LinkColumnType, SortDirection, DefaultGridHeight, HostArtifactAdditionalData,
    Events
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

import FormTabs = require("WorkItemTracking/Scripts/Form/Tabs");
import { IInPlaceMaximizableControl } from "WorkItemTracking/Scripts/Form/FormGroup";
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";

import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { SimpleWorkItemArtifactCache } from "WorkItemTracking/Scripts/Controls/Links/ArtifactCache";
import { LinkMapper, IMappedLink } from "WorkItemTracking/Scripts/Controls/Links/LinkMapper";
import {
    WebLayoutLinksControlViewMode, WebLayoutLinksControlZeroDataExperience, WebLayoutLinksControlColumnTruncation,
    IWebLayoutLinksControlOptions, WebLayoutLinksControlLinkFilterKind, IWebLayoutLinksControlLinkFilter,
    WebLayoutLinksControlXmlValues
} from "WorkItemTracking/Scripts/Controls/Links/Interfaces";

import { WebLayoutLinksControlOptionsReader } from "WorkItemTracking/Scripts/Controls/Links/WebLayoutLinksControlOptionsReader";
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";

import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";

import VC_Services = require("TFS/VersionControl/Services");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");

import { AddNewItemComponent, IAddNewItemProps } from "Presentation/Scripts/TFS/Components/AddNewItem";
import { ZeroDataComponent, IZeroDataProps } from "WorkItemTracking/Scripts/Form/React/Components/ZeroDataComponent";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";

export class LinksControl extends WorkItemControl implements IInPlaceMaximizableControl {
    private static MIN_COLUMNS_IN_GRID_VIEW_MODE: number = 5;
    private static GRID_THRESHOLD: number = 460;

    private static LINK_ATTRIBUTE_COLUMNS: IDictionaryStringTo<IColumn> = {
        [InternalKnownColumns.Comment.refName]: InternalKnownColumns.Comment
    };

    private static CSS_ADD_NEW_LINK_CONTAINER = "add-links-container";
    private static CSS_LINKS_CONTROL_CONTAINER = "links-control-container";

    // Redeclare options here for typing
    public _options: IWebLayoutLinksControlOptions;

    /** Cache instance to cache resolved artifacts */
    private _artifactCache = new SimpleWorkItemArtifactCache();

    /** LinkedArtifacts control instance */
    private _linkedArtifactsControl: LinkedArtifactsControl;

    /** AddNewItem component instance */
    private _addNewItemComponent: AddNewItemComponent;

    private _onWorkItemChangedDelegate: JQueryEventHandler;
    private _onTabSelectedDelegate: JQueryEventHandler;

    private _$linkedArtifactsControlContainer: JQuery;
    private _$addLinkContainer: JQuery;

    /** Initially linkTypes might not be available from work item store, this promise will resolve when they are */
    private _linkTypesPromise: IPromise<void>;

    private _isFullScreen: boolean;

    private static WitFieldTypeToLinksColumnTypeMap: IDictionaryNumberTo<LinkColumnType> = {
        [WITConstants.FieldType.Boolean.valueOf()]: LinkColumnType.Boolean,
        [WITConstants.FieldType.DateTime.valueOf()]: LinkColumnType.DateTime,
        [WITConstants.FieldType.Double.valueOf()]: LinkColumnType.Double,
        [WITConstants.FieldType.Guid.valueOf()]: LinkColumnType.Guid,
        [WITConstants.FieldType.History.valueOf()]: LinkColumnType.Html,
        [WITConstants.FieldType.Html.valueOf()]: LinkColumnType.Html,
        [WITConstants.FieldType.Integer.valueOf()]: LinkColumnType.Integer,
        [WITConstants.FieldType.PicklistInteger.valueOf()]: LinkColumnType.Integer,
        [WITConstants.FieldType.PicklistString.valueOf()]: LinkColumnType.String,
        [WITConstants.FieldType.PlainText.valueOf()]: LinkColumnType.PlainText,
        [WITConstants.FieldType.String.valueOf()]: LinkColumnType.String,
        [WITConstants.FieldType.TreePath.valueOf()]: LinkColumnType.TreePath
    };

    constructor($container: JQuery, options?: IWebLayoutLinksControlOptions, workItemType?: WITOM.WorkItemType) {
        super($container, options, workItemType);

        const defaultOptions = WebLayoutLinksControlOptionsReader.getDefaultLinksControlOptions();
        this._options = { ...defaultOptions, ...this._options };

        this._container.addClass("links-control");
        this._container.attr("tabindex", -1);

        // This enables links control to attach link change events. Whenever a change
        // occurs in the links of bound work item, links are invalidated.
        this._fieldEvents = [WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.BISURI, WITConstants.DalFields.LinkedFiles];

        let availableDrawSpace = this.getAvailableSpaceImmediate();
        const init = () => {
            let linkedArtifactControlOptions = this._getArtifactControlOptions(availableDrawSpace, this._options);

            // Create container linkscontrol and store a reference to it
            this._$linkedArtifactsControlContainer = $("<div/>").addClass(LinksControl.CSS_LINKS_CONTROL_CONTAINER).appendTo(this._container);

            // Let React create the control and store a reference to it
            ReactDOM.render(
                React.createElement<ILinkedArtifactControlOptions>(
                    LinkedArtifactsControl,
                    $.extend({}, linkedArtifactControlOptions, { ref: ctrl => this._linkedArtifactsControl = ctrl })),
                this._$linkedArtifactsControlContainer[0]);

            this._attachEvents();

            // Schedule onResize handler for next tick to determine correct view mode
            this._onResize();

            if (this._workItem) {
                this.invalidate(false);
            }
        };

        // If link types have already been retrieved, initialize the control immediately, ensure that link types exist otherwise
        if (this._workItemType.store.registeredLinkTypes != null &&
            !$.isFunction(this._workItemType.store.registeredLinkTypes) &&
            this._workItemType.store.contributedLinkTypes != null) {
            init();
        } else {
            this._ensureLinkTypes().then(() => init(), (error) => {
                throw new Error(error);
            });
        }
    }

    /** @override */
    public dispose() {
        this._detachEvents();

        // Ensure memory held by React is freed
        if (this._$addLinkContainer) {
            ReactDOM.unmountComponentAtNode(this._$addLinkContainer[0]);
        }

        if (this._$linkedArtifactsControlContainer) {
            ReactDOM.unmountComponentAtNode(this._$linkedArtifactsControlContainer[0]);
        }
    }

    /** @override */
    public getAvailableSpace(): IPromise<FormModels.IAvailableDrawSpace> {
        return super.getAvailableSpace().then(space => {
            if (this._$addLinkContainer) {
                // Adjust for add item control
                space.height -= this._$addLinkContainer.outerHeight(true);
            }

            return space;
        });
    }

    /** Ensure the add link control reflects the current state of the control */
    private _updateNewItemControl() {
        // link types may still be a promise that is resolving. We need it to be resolved before creating this control
        if (this._$addLinkContainer && this._$addLinkContainer.length > 0) {

            this._ensureLinkTypes().then(() => {
                const addNewItemProps: IAddNewItemProps & React.Props<AddNewItemComponent> = {
                    items: this._getWorkItemTypeMenuItemsForCurrentControl(),
                    displayText: WorkItemTrackingResources.LinksControlAddLinkDisplayText,
                    disabledTooltip: WorkItemTrackingResources.LinksControlAddLinkDisabledTooltip,
                    ref: ctrl => this._addNewItemComponent = ctrl
                };

                // Create 'Add new item' control
                ReactDOM.render(
                    React.createElement<IAddNewItemProps>(
                        AddNewItemComponent,
                        addNewItemProps),
                    this._$addLinkContainer[0]);
            });
        }
    }

    private _getWorkItemTypeMenuItemsForCurrentControl() {
        return this._getWorkItemTypeMenuItems(this._options.linkFilters, this._options.workItemTypeFilters, this._options.scopeWorkItemTypesToProject, this._workItemType);
    }

    private _getArtifactControlOptions(availableSpace: FormModels.IAvailableDrawSpace, options: IWebLayoutLinksControlOptions): ILinkedArtifactControlOptions {
        if (!this._workItemType.store || !this._workItemType.store.linkTypes || !this._workItemType.store.registeredLinkTypes) {
            VSSError.publishErrorToTelemetry({
                name: "CouldNotGetLinkTypes",
                message: "Could not get linktypes or registered link types."
            });

            return null;
        }

        let controlOptions: ILinkedArtifactControlOptions = {
            artifactPageSize: options.listViewOptions.pageSize,
            viewOptions: {
                viewMode: this._getDesiredViewMode(options, 0),
                availableSpace: availableSpace,
                showGroupHeaders: this._options.listViewOptions.groupLinks
            },
            zeroDataOptions: {
                zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Hidden
            },
            cache: this._artifactCache,
            onRemoveLinkedArtifact: this._onRemoveLink.bind(this),
            onChangeLinkedArtifactComment: this._onChangeLinkComment.bind(this),
            artifactSubTypeFilters: LinksControl._getLinkedArtifactSubtypeFilterConfiguration(options),
            gridViewOptions: {
                minColumnsInGridView: LinksControl.MIN_COLUMNS_IN_GRID_VIEW_MODE,
                autoSizeGrid: !options.autoFitFormHeight, // if autoFitFormHeight is true, the control should fill the available space, and not grow/shrink to fit content
                maxGridHeight: options.autoFitFormHeight ? availableSpace.height : (options.height || DefaultGridHeight)
            },
            columns: options.columns ? this._mapColumns(options.columns.columnNames) : null,
            tfsContext: this.getTfsContext(),
            sortColumns: null,
            linkTypeRefNames: LinksControl._getLinkTypeNames(
                options.linkFilters,
                LinksControl._getWorkItemLinkTypeMap(this._workItemType.store.linkTypes),
                this._workItemType.store.registeredLinkTypes.map(rlt => rlt.name)),
            onRender: () => {
                this._onRenderCompleted();
            }
        };

        if (options.zeroDataExperience === WebLayoutLinksControlZeroDataExperience.Development) {
            // If this control is a development control, we need to modify the default sort order to be freshness
            controlOptions.sortColumns = [
                {
                    column: InternalKnownColumns.LastUpdate,
                    direction: SortDirection.Descending
                },
                {
                    column: InternalKnownColumns.Link,
                    direction: SortDirection.Ascending
                }];
        }

        return controlOptions;
    }

    private _getWorkItemTypeMenuItems(
        linkFilters: IWebLayoutLinksControlLinkFilter[],
        typeFilters: string[],
        scopeWorkItemTypesToProject: boolean,
        workItemType: WITOM.WorkItemType): IContextualMenuItem[] {
        let externalLinkFilters = null;
        let workItemLinkFilters = null;
        let workItemTypeFilters = null;

        // Create workitem and external link filters
        if (linkFilters) {
            const external = linkFilters.filter(value => value.linkFilterKind === WebLayoutLinksControlLinkFilterKind.External);
            const wit = linkFilters.filter(value => value.linkFilterKind === WebLayoutLinksControlLinkFilterKind.WorkItem);
            const workItemLinkTypeMap = LinksControl._getWorkItemLinkTypeMap(workItemType.store.linkTypes);
            const registeredLinkTypeNames = workItemType.store.registeredLinkTypes.map(rlt => rlt.name);
            externalLinkFilters = LinksControl._getLinkTypeNames(external, workItemLinkTypeMap, registeredLinkTypeNames);
            workItemLinkFilters = LinksControl._getLinkTypeNames(wit, workItemLinkTypeMap, registeredLinkTypeNames);
        }

        if (typeFilters) {
            workItemTypeFilters = {
                filterType: "include",
                scope: scopeWorkItemTypesToProject ? "project" : null,
                filters: typeFilters.map((typeName) => {
                    return { workItemType: typeName };
                })
            };
        }

        const getOptions = () => {
            return {
                baseId: this._workItem,
                selectedIds: [this._workItem.id],
                options: {
                    workItemLinkFilters: workItemLinkFilters,
                    externalLinkFilters: externalLinkFilters,
                    workItemTypeFilters: workItemTypeFilters,
                    isNewLinksControl: true,
                    close: () => {
                        if (this._addNewItemComponent) {
                            this._addNewItemComponent.focus();
                        } else {
                            this._container.focus();
                        }
                    },
                    noFocusOnClose: true /* Don't set the focus to the next open dialog on close (we will set it to a specific component) */
                },
                afterSave: () => $("button.add-new-item-component, .work-item-zero-cta button", this._container).first().focus()
            };
        };

        // Ensure workItemTracking.Controls are loaded and then execute command
        const executeAddLinkCommand = (command: string) => {
            VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]).then(
                () => {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs(command, getOptions(), null));
                },
                (error: Error) => {
                    VSSError.publishErrorToTelemetry({
                        name: `CouldNotExecute${command}Command`,
                        message: VSS.getErrorMessage(error)
                    });
                }
            );
        };

        // Create menuitem for popup menu
        let menuItems: IContextualMenuItem[] = [{
            key: LinkingUtils.ACTIONS_LINK_TO_EXISTING,
            name: WorkItemTrackingResources.LinksControlAddLinkToExistingItem,
            iconProps: contextualMenuIcon("bowtie-link"),
            onClick: () => executeAddLinkCommand(LinkingUtils.ACTIONS_LINK_TO_EXISTING),
            disabled: this.isReadOnly()
        }];

        if (!workItemLinkFilters || workItemLinkFilters.length > 0) {
            var isdisabled = !this._workItem || this._workItem.isNew() || this.isReadOnly();
            menuItems.push({
                key: LinkingUtils.ACTIONS_LINK_TO_NEW,
                name: WorkItemTrackingResources.LinksControlCreateNewLink,
                iconProps: contextualMenuIcon("bowtie-work-item"),
                onClick: () => executeAddLinkCommand(LinkingUtils.ACTIONS_LINK_TO_NEW),
                disabled: isdisabled,
                title: this._workItem && this._workItem.isNew() ? WorkItemTrackingResources.LinksControlAddNewItemDisabledTooltip : null
            });
        }

        return menuItems;
    }

    /** To be called when the control is rendered */
    private _onRenderCompleted() {
        Events_Services.getService().fire(FormEvents.ControlResizedEvent(), this);
    }

    //Public for unit testing only
    public static _getLinkedArtifactSubtypeFilterConfiguration(options: IWebLayoutLinksControlOptions): IDictionaryStringTo<ILinkedArtifactSubtypeFilterConfiguration> {
        if (options && (typeof options.scopeWorkItemTypesToProject !== "undefined" || typeof options.workItemTypeFilters !== "undefined")) {
            return {
                [Artifacts_Constants.ToolNames.WorkItemTracking]: {
                    artifactSubtypes: options.workItemTypeFilters || null,
                    inCurrentProject: options.scopeWorkItemTypesToProject || false
                }
            };
        }
        return null;
    }

    //Public for unit testing only
    public static _getLinkTypeNames(linkFilters: IWebLayoutLinksControlLinkFilter[], workItemLinkTypes: IDictionaryStringTo<string[]>, externalLinkTypes: string[]): string[] {
        if (!linkFilters) {
            return null;
        }

        let linkTypeNames: string[] = [];

        for (var linkFilter of linkFilters) {
            if (linkFilter.linkFilterKind === WebLayoutLinksControlLinkFilterKind.External) {
                if (linkFilter.linkFilterType === WebLayoutLinksControlXmlValues.IncludeAllLinks) {
                    linkTypeNames.push(...externalLinkTypes);
                }
                else {
                    linkTypeNames.push(linkFilter.linkFilterType);
                }
            } else {
                // Work item link
                if (linkFilter.linkFilterType === WebLayoutLinksControlXmlValues.IncludeAllLinks) {
                    linkTypeNames.push(...Object.keys(workItemLinkTypes));
                } else if (workItemLinkTypes[linkFilter.linkFilterType]) {
                    linkTypeNames.push(...workItemLinkTypes[linkFilter.linkFilterType]);
                } else  if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.EnableHydroProcess)) {
                    // link type is not supported in 'Hydro' process 
                    return;
                }
                else {
                    Diag.Debug.fail("Unrecognized link filter." + linkFilter.linkFilterType);
                }
            }
        }

        // Remove duplicates if any
        linkTypeNames = linkTypeNames.filter((item, pos) => linkTypeNames.indexOf(item) === pos);
        return linkTypeNames;
    }

    /**
     * Gets work item link types, incase of non-directional link types the value of dictionary contains the same value as key,
       incase of directional link types, the value is the key+both the directional links. e.g.
       {
           'directional-link':['directional-link', 'directional-link-forward', 'directional-link-reverse'],
           'directional-link-forward': ['directional-link-forward'],
           'directional-link-reverse': ['directional-link-reverse'],
           'non-directional-link': ['non-directional-link']
       }
     * @param workItemLinkTypes
     */
    private static _getWorkItemLinkTypeMap(workItemLinkTypes: IWorkItemLinkType[]): IDictionaryStringTo<string[]> {
        let retValue: IDictionaryStringTo<string[]> = {};

        for (let workItemLinkType of workItemLinkTypes) {
            retValue[workItemLinkType.referenceName] = [workItemLinkType.referenceName];

            // Always add the forward-end, even for non-directional links
            let forwardEnd = workItemLinkType.forwardEnd.immutableName;
            retValue[forwardEnd] = [forwardEnd];
            retValue[workItemLinkType.referenceName].push(forwardEnd);

            if (workItemLinkType.isDirectional) {
                // Add reverse link for non-directional links
                let reverseEnd = workItemLinkType.reverseEnd.immutableName;
                retValue[reverseEnd] = [reverseEnd];

                retValue[workItemLinkType.referenceName].push(reverseEnd);
            }
        }


        return retValue;
    }

    protected onControlResized() {
        this._onResize();
    }

    private _attachEvents() {
        if (!this._onTabSelectedDelegate) {
            this._onTabSelectedDelegate = this._onTabSelected.bind(this);

            // Control might be on a tab, so if it becomes visible, layout should be triggered to fix any layout issues.
            this._container.on(FormTabs.WorkItemFormTabEvents.WorkItemFormTabSelected, this._onTabSelectedDelegate);
        }
    }

    private _detachEvents() {
        if (this._onTabSelectedDelegate) {
            this._container.off(FormTabs.WorkItemFormTabEvents.WorkItemFormTabSelected, this._onTabSelectedDelegate);

            this._onTabSelectedDelegate = null;
        }
    }

    private _onTabSelected() {
        this._onResize();

        if (this._linkedArtifactsControl) {
            // Ensure that the control in grid mode re-renders
            this._container.find(".la-grid").triggerHandler(Events.ForceRerender);
        }
    }

    private _onResize() {
        this.getAvailableSpace().then(availableSpace => this._updateViewOptions(availableSpace));
    }

    private _updateViewOptions(availableSpace: FormModels.IAvailableDrawSpace) {
        if (this._linkedArtifactsControl) {
            let desiredViewMode = this._getDesiredViewMode(this._options, availableSpace.width);

            this._linkedArtifactsControl.setViewOptions({
                viewMode: desiredViewMode,
                availableSpace: {
                    width: availableSpace.width,
                    // Subtract 2 to account for the 1px transparent borders for high contrast mode
                    height: availableSpace.height - 2
                }
            });
        }
    }

    private _getDesiredViewMode(options: IWebLayoutLinksControlOptions, availableWidth: number): ViewMode {
        if (this._isFullScreen) {
            return ViewMode.FullGrid;
        }

        if (options.viewMode === WebLayoutLinksControlViewMode.Grid
            || ((!options.viewMode || (options.viewMode as WebLayoutLinksControlViewMode) === WebLayoutLinksControlViewMode.Dynamic) && availableWidth > LinksControl.GRID_THRESHOLD)) {
            // Show grid mode
            if (options.columns && options.columns.truncation === WebLayoutLinksControlColumnTruncation.Off) {
                return ViewMode.FullGrid;
            } else {
                return ViewMode.Grid;
            }
        }

        // Show list mode
        return ViewMode.List;
    }

    private _onWorkItemChangedHandler(sender, args) {
        // Check for change event to be refresh, reset, or field change
        // If Field change, check to see if a link field was changed
        if (args.change === WorkItemChangeType.Refresh
            || args.change === WorkItemChangeType.Reset) {
            this._artifactCache.clear();
        }

        if (args.change === WorkItemChangeType.SaveCompleted) {
            this._updateNewItemControl();
            this._setZeroDataState();
        }
    };

    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        super.bind(workItem);

        this._updateAddLinksContainer();
        if (!this._onWorkItemChangedDelegate) {
            this._onWorkItemChangedDelegate = this._onWorkItemChangedHandler.bind(this);

            workItem.attachWorkItemChanged(this._onWorkItemChangedDelegate);
        }
        this._artifactCache.setWorkItem(workItem);

        // We might have switched here from a different work item type (can happen in Triage view, for example), so we need
        // to ensure that we get updated measurements.
        // Scenario: Query Result
        //   1 Task
        //   2 Bug
        // 1. Switch to Bug, switch to All Links
        // 2. Switch to Task
        // 3. Switch back to Bug
        // All Links will be visible, but since it wasn't in the DOM for step 2 measurements are off. 
        this._onResize();
    }

    public unbind() {
        if (this._onWorkItemChangedDelegate) {
            this._workItem.detachWorkItemChanged(this._onWorkItemChangedDelegate);
            delete this._onWorkItemChangedDelegate;
            this._onWorkItemChangedDelegate = null;
        }

        super.unbind();
    }

    public maximizeInPlace(top: number) {
        this._isFullScreen = true;

        this._container.css("top", top);
        this._unFocusRestoreButton();

        this._linkedArtifactsControl.setViewOptions({
            viewMode: ViewMode.FullGrid,
            availableSpace: this.getAvailableSpaceImmediate()
        });
    }

    public restoreInPlace() {
        // Switch back to previous view mode
        this._isFullScreen = false;

        this._unFocusMaximizeButton();

        let availableSpace = this.getAvailableSpaceImmediate();
        this._updateViewOptions(availableSpace);
    }

    private _unFocusMaximizeButton() {
        this._container.parents(".grid-group-container").find(".workitem-group-maximize").blur();
    }

    private _unFocusRestoreButton() {
        this._container.parents(".grid-group-container").find(".workitem-group-restore").blur();
    }

    public invalidate(flushing: boolean) {
        super.invalidate(flushing);

        if (this._linkedArtifactsControl) {
            this._linkedArtifactsControl.setReadOnly(this.isReadOnly());

            if (this._workItem) {
                this._linkedArtifactsControl.setFetchingLinks({
                    fetchingLinks: FetchingLinks.InProgress
                });

                this._updateLinks();
                this._setZeroDataState();

                this._linkedArtifactsControl.setFetchingLinks({
                    fetchingLinks: FetchingLinks.Done
                });
            }
        }
    }

    private _createAddLinksContainer() {
        if (!this._$addLinkContainer) {
            this._$addLinkContainer = $("<div/>").addClass(LinksControl.CSS_ADD_NEW_LINK_CONTAINER).prependTo(this._container);
        }
    }

    private _removeAddLinksContainer() {
        if (this._$addLinkContainer) {
            if (this._$addLinkContainer[0]) {
                ReactDOM.unmountComponentAtNode(this._$addLinkContainer[0]);
            }
            this._$addLinkContainer.remove();
            this._$addLinkContainer = null;
        }
    }

    private _setZeroDataState(): void {
        let zeroDataOptions: IZeroDataOptions = {
            zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Default
        };

        switch (this._options.zeroDataExperience) {
            case WebLayoutLinksControlZeroDataExperience.Development: {
                zeroDataOptions.message = WorkItemTrackingResources.DevelopmentControlWorkHasntStartedMessage;
                if (!this._workItem.isNew() && !this._workItem.isDeleted() && !this._workItem.isReadOnly()) {
                    let pageDataService = Service.getService(Contributions_Services.WebPageDataService);
                    let contribution = pageDataService.getPageData("ms.vss-code-web.supports-git-data-provider");
                    let isGitSupported = contribution && contribution['isSupported'];
                    if (isGitSupported) {
                        zeroDataOptions.action = <IZeroDataAction>{
                            actionMessage: WorkItemTrackingResources.DevelopmentControlCreateBranchTitle,
                            actionCallback: (): boolean => {
                                this._launchCreateBranchDialog();
                                return false;
                            }
                        }
                    }
                }

                break;
            }

            case WebLayoutLinksControlZeroDataExperience.CallToAction: {
                zeroDataOptions.onRenderZeroData = (message, action) => {
                    const menuItems = this._getWorkItemTypeMenuItemsForCurrentControl();

                    return React.createElement(ZeroDataComponent, {
                        label: WorkItemTrackingResources.LinksControlZeroData,
                        iconClassName: "bowtie-link",
                        cta: (!this._options.hideActions && !this.isReadOnly()) ? {
                            label: WorkItemTrackingResources.LinksControlAddLinkDisplayText,
                            menuItems: menuItems
                        } : null
                    } as IZeroDataProps);
                };

                break;
            }
        }

        Diag.Debug.assert(!!this._linkedArtifactsControl, "LinkedArtifactsControl should not be null.");

        if (this._linkedArtifactsControl) {
            this._linkedArtifactsControl.setZeroDataOptions(zeroDataOptions);
        }
    }

    private _ensureLinkTypes(): IPromise<void> {
        Diag.Debug.assert(!!this._workItemType, "Expected work item type to be set before calling ensureLinkTypes");

        if (this._linkTypesPromise) {
            return this._linkTypesPromise;
        }

        let deferred = Q.defer<void>();

        let contributedLinksPromise = this._workItemType.store.beginGetContributedLinkTypes();
        this._workItemType.store.beginGetLinkTypes(() => {
            contributedLinksPromise.then(() => {
                deferred.resolve(null);
            }, (error) => {
                deferred.reject(error);
            });
        }, (error) => {
            deferred.reject(error);
        });

        this._linkTypesPromise = deferred.promise;

        return this._linkTypesPromise;
    }

    private _updateLinks() {
        const mappedLinks = this._mapLinks();
        const artifactLinks = mappedLinks.map(mL => mL.mappedLink);

        const hostArtifact = <IHostArtifact>{
            id: this._workItem.id.toString(),
            tool: Artifacts_Constants.ToolNames.WorkItemTracking,
            type: Artifacts_Constants.ArtifactTypeNames.WorkItem,
            additionalData: {
                [HostArtifactAdditionalData.ProjectName]: this._workItem.project.name,
                [HostArtifactAdditionalData.ProjectId]: this._workItem.project.id
            }
        };

        this._updateAddLinksContainer();
        this._linkedArtifactsControl.setLinkedArtifacts(artifactLinks, hostArtifact);
    }

    private _updateAddLinksContainer() {
        if (this._options.hideActions || this._workItem.isReadOnly()) {
            this._removeAddLinksContainer();
        }
        else {
            const links = this._workItem.getLinks();
            const noLinks: boolean = (links === null) || links.length === 0;
            if ((this._options.zeroDataExperience === WebLayoutLinksControlZeroDataExperience.CallToAction) && noLinks) {
                this._removeAddLinksContainer();
            }
            else {
                this._createAddLinksContainer();
                this._updateNewItemControl();
            }
        }
    }

    private _mapLinks(): IMappedLink[] {
        let linkMapper = new LinkMapper(this._workItem.store);

        let links = this._workItem.getLinks();
        return linkMapper.mapLinks(links);
    }

    private _mapWitFieldDefToLinkColumnType(fieldDefinition: WITOM.FieldDefinition): LinkColumnType {
        if (fieldDefinition.isIdentity) {
            return LinkColumnType.Identity;
        }

        return LinksControl.WitFieldTypeToLinksColumnTypeMap[fieldDefinition.type.valueOf()];
    }

    /**
     * Map columns identified by their reference names to the column model for the linked artifacts control
     * @param columns Columns identified by reference name
     * @return Mapped columns
     */
    protected _mapColumns(columns: string[]): IColumn[] {
        if (!columns) {
            return null;
        }

        // Build map of known columns for easy lookup
        let knownColumnsByRefName: IDictionaryStringTo<IColumn> = {};
        Object.keys(InternalKnownColumns)
            .map(knownColumnKey => InternalKnownColumns[knownColumnKey])
            .forEach((knownColumn: IColumn) => knownColumnsByRefName[knownColumn.refName.toLowerCase()] = knownColumn);

        return columns.map(column => {
            // If it's a known column, return that instance
            if (knownColumnsByRefName[column.toLowerCase()]) {
                return knownColumnsByRefName[column.toLowerCase()];
            }

            // We want to access the work item store to look up field definitions as the columns for this link may not exist on this work item
            let fieldDefinition: WITOM.FieldDefinition;
            if (this._workItemType && this._workItemType.store) {
                fieldDefinition = this._workItemType.store.getFieldDefinition(column);
            }

            if (!fieldDefinition) {
                fieldDefinition = this.getExtensionField(column);
            }

            if (fieldDefinition) {
                return <IColumn>{
                    name: fieldDefinition.name,
                    refName: fieldDefinition.referenceName,
                    type: this._mapWitFieldDefToLinkColumnType(fieldDefinition)
                };
            }

            return LinksControl.LINK_ATTRIBUTE_COLUMNS[column] || null;
        }).filter(c => !!c);
    }

    private _getMappedLink(linkDisplayData: IInternalLinkedArtifactDisplayData): IMappedLink {
        const mappedLinks = this._mapLinks();

        return Utils_Array.first(mappedLinks, ml =>
            ml.mappedLink.linkType === linkDisplayData.linkType
            && ml.mappedLink.id === linkDisplayData.id
            && ml.mappedLink.tool === linkDisplayData.tool
            && ml.mappedLink.type === linkDisplayData.type);
    }

    protected _onRemoveLink(linkedArtifact: IInternalLinkedArtifactDisplayData) {
        const mappedLink = this._getMappedLink(linkedArtifact);

        if (mappedLink) {
            this._workItem.removeLinks([mappedLink.link]);
        }

        if (this._addNewItemComponent && this._workItem.getLinks().length === 0) {
            // The grid is empty, focus on the add new item button
            this._addNewItemComponent.focus();
        }
    }

    protected _onChangeLinkComment(linkedArtifact: IInternalLinkedArtifactDisplayData, newComment: string) {
        const mappedLink = this._getMappedLink(linkedArtifact);

        if (mappedLink) {
            this._workItem.findLink(mappedLink.link).setComment(newComment);
        }
    }

    private _vcServicePromise: IPromise<VC_Services.IVersionControlActionService>;
    private _launchCreateBranchDialog() {
        this._beginGetVcService().then((vcService: VC_Services.IVersionControlActionService) => {
            if (vcService && this._areAllFeaturesActive(vcService.requiredFeaturesForActions)) {
                let projectName: string;
                let projectid: string;
                if (this._workItem) {
                    projectName = this._workItem.project.name;
                    projectid = this._workItem.project.guid;
                }
                vcService.beginLaunchCreateBranchDialog([this._workItem.id], projectName, projectid).then(() => { }, (reason) => { this._handleError(reason); });
            }
        });
    }

    /** Checks if all the features asked for are active.
    * @param features An array of features to check
    * @returns True when all features are active, false otherwise
    */
    private _areAllFeaturesActive(features: string[]): boolean {
        if (!features || features.length === 0) {
            return true;
        }

        return features.every((feature) => {
            return this._isFeatureActive(feature);
        });
    }

    private _isFeatureActive(featureName: string): boolean {
        return TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(featureName);
    }

    private _beginGetVcService(): IPromise<VC_Services.IVersionControlActionService> {
        if (!this._vcServicePromise) {
            this._vcServicePromise = VC_Services.VersionControlActionService.getService();
        }

        return this._vcServicePromise;
    }

    protected _handleError(error: string) {
        VSSError.publishErrorToTelemetry({
            name: "CouldNotLaunchCreateBranchDialog",
            message: error
        });
    }
}
