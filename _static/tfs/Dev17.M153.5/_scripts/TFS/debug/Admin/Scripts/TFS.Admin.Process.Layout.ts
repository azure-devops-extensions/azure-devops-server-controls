/// <amd-dependency path="jQueryUI/sortable"/>
/// <amd-dependency path="jQueryUI/core"/>
/// <reference types="knockout" />

import { CustomerIntelligenceConstants } from "Admin/Scripts/TFS.Admin";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as AdminProcessContracts from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";
import DeleteProcessLayoutNodeConfirmationDialog = require("Admin/Scripts/DeleteProcessLayoutNodeConfirmationDialog");
import { ProcessLayoutOM } from "Admin/Scripts/LayoutOM/ProcessLayoutOM";
import { ProcessLayoutFormRenderer } from "Admin/Scripts/TFS.Admin.Process.Layout.FormRenderer";
import { EditFieldDialogHelper } from "Admin/Scripts/Dialogs/EditFieldDialog";

import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as TFS_TabStrip_Control from "Presentation/Scripts/TFS/TFS.UI.TabStripControl";
import * as TFS_TabStrip_ViewModels from "Presentation/Scripts/TFS/TFS.ViewModels.TabStripControl";

import { Page, Group, Section, Control, PageType, WitContribution, ProcessWorkItemType } from "TFS/WorkItemTracking/ProcessContracts";

import { Contribution } from "VSS/Contributions/Contracts";
import * as FormInput_Contracts from "VSS/Common/Contracts/FormInput";
import * as Controls from "VSS/Controls";
import * as ControlsDialogs from "VSS/Controls/Dialogs";
import * as EventsServices from "VSS/Events/Services";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as Menus from "VSS/Controls/Menus";
import * as Notifications from "VSS/Controls/Notifications";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import * as Gallery_RestClient_NOREQUIRE from "VSS/Gallery/RestClient";
import * as Q from "q";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import * as Context from "VSS/Context";
import * as Admin from "Admin/Scripts/TFS.Admin";

import delegate = Utils_Core.delegate;

const findExtensionUrlHosted = "https://go.microsoft.com/fwlink/?linkid=859073";

function getServerKey(): IPromise<string> {
    if (Context.getPageContext().webAccessConfiguration.isHosted) {
        return Q("");
    }
    const contributionsClient = Service.VssConnection.getConnection().getHttpClient(ContributionsHttpClient);

    const query: DataProviderQuery = {
        context: {
            properties: {}
        },
        contributionIds: ["ms.vss-tfs.marketplace-data-provider"]
    } as DataProviderQuery;

    return contributionsClient.queryDataProviders(query).then((contributionDataResult: DataProviderResult): string => {
        const pageData: any = contributionDataResult.data["ms.vss-tfs.marketplace-data-provider"] || {};
        return pageData && pageData.serverKey;
    });
}

// Changes in the form layout's position are only caused by the message area control.
// So we want to reposition the form layout when the message control is used
class ProcessLayoutMessageAreaControl extends Notifications.MessageAreaControl {
    private _processLayoutView: ProcessLayoutView;

    setProcessLayoutView(processLayoutView: ProcessLayoutView) {
        this._processLayoutView = processLayoutView;
    }

    private _invokeCallback() {
        if (this._processLayoutView) {
            this._processLayoutView.fixLayoutPosition();
        }
    }

    setMessage(message: any, messageType?: Notifications.MessageAreaType): void {
        super.setMessage(message, messageType);
        this._invokeCallback();
    }

    clear(): void {
        super.clear();
        this._invokeCallback();
    }
}

export interface IPageTabViewModelOptions extends TFS_TabStrip_ViewModels.ITabViewModelOptions {
    page: Page;
    process: AdminProcessCommon.ProcessDescriptorViewModel;
    preventDeleteNonEmptyPage?: boolean;
}

export class PageTabViewModel extends TFS_TabStrip_ViewModels.TabViewModel {
    private _page: Page;
    private _process: AdminProcessCommon.ProcessDescriptorViewModel;
    private _preventDeleteNonEmptyPage?: boolean;
    public tabName: string;
    public tabArialabel: string;
    public buttonAriaLabel: string;
    public iconClass: string;

    constructor(options?: IPageTabViewModelOptions) {
        super(options);
        this._page = options.page;
        this._process = options.process;
        this._preventDeleteNonEmptyPage = options.preventDeleteNonEmptyPage;
        this.tabName = this._page.label;
        this.tabArialabel = Utils_String.format(AdminResources.FormPage, this.tabName);
        this.buttonAriaLabel = Utils_String.format(AdminResources.FormActions, this.tabName);
        if (this._page.isContribution) {
            this.iconClass = "bowtie-icon bowtie-shop-server";
        } else if (this._page.inherited) {
            this.iconClass = "icon bowtie-icon bowtie-row-child";
        } else {
            this.iconClass = "";
        }
    }

    /**
     * @return false as none of the pages should be 'delete-able' if they're inherited or contributed.
     */
    public canDelete(): boolean {
        return this._process.isInherited && !this._page.inherited && !this._page.isContribution;
    }

    /**
     * @return True if the tab is allowed to execute extra menu items.
     */
    public canExecuteCommand(commandName: string): boolean {
        switch (commandName.toLowerCase()) {
            case "hide-page-command":
                return this._page.isContribution && this._page.visible;
            case "show-page-command":
                return this._page.isContribution && !this._page.visible;
            case "edit-page-command":
                return true;
        }
    }

    /**
     * @return false is we should confirm before deleting this tab.
     */
    public confirmBeforeDelete(): boolean {
        return !AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(this._page);
    }

    /**
     * @the confirm function to be called before deleting the tab
     */
    public confirmDelete(okCallback: () => void): void {
        if (this._preventDeleteNonEmptyPage) {
            ControlsDialogs.MessageDialog.showMessageDialog(
                AdminResources.CannotRemoveNonEmptyPageText, {
                    title: AdminResources.AdminLayoutRemovePageDialogTitle,
                    buttons: [
                        {
                            id: "ok",
                            text: AdminResources.DialogOkButton
                        } as IMessageDialogButton
                    ]
                } as ControlsDialogs.IShowMessageDialogOptions);
            return;
        }

        const dialogText = [];
        dialogText.push(AdminResources.RemovePageFromLayoutDialogText1);
        dialogText.push(Utils_String.format(AdminResources.RemovePageFromLayoutDialogText2, this._page.label));

        // Show a confirmation dialog because the user is about to remove a custom field from the form.
        const options: AdminDialogFieldContracts.ConfirmDialogOptions = {
            title: AdminResources.RemoveFieldFromLayoutDialogTitle,
            okCallback: okCallback,
            dialogTextStrings: dialogText,
            successCallback: null
        };

        ControlsDialogs.show(DeleteProcessLayoutNodeConfirmationDialog, options);
    }

    /**
     * @return True if the tab can be sortable.
     */
    public isSortable(): boolean {
        return this._process.isInherited && !this._page.inherited;
    }

    /**
     * @return True if the page is hidden or contributed.
     */
    public isHiddenFromLayout(): boolean {
        return this._page.isContribution && !this._page.visible;
    }

    /**
     * @return the page object for the model
     */
    public getPage(): Page {
        return this._page;
    }
}

export class PageTabCollectionViewModel extends TFS_TabStrip_ViewModels.TabCollectionViewModel<PageTabViewModel> {
    private _pageTabViewModelOptions: IPageTabViewModelOptions[];
    private _onTabSelectDelegate: (page: Page) => void;
    private _onTabDeleteDelegate: (page: Page) => void;
    private _onTabMovedDelegate: (page: Page, order: number) => void;

    constructor(
        pageTabViewModelOptions: IPageTabViewModelOptions[],
        onTabSelectDelegate: (page: Page) => void,
        onTabDeleteDelegate: (page: Page) => void,
        onTabMovedDelegate: (page: Page, order: number) => void,
        selectedPageId?: string
    ) {

        super(PageTabViewModel, pageTabViewModelOptions);
        this._pageTabViewModelOptions = pageTabViewModelOptions;
        this._onTabSelectDelegate = onTabSelectDelegate;
        this._onTabDeleteDelegate = onTabDeleteDelegate;
        this._onTabMovedDelegate = onTabMovedDelegate;
        this.activeTabIndex(this._getActivePageIndex(selectedPageId));
    }

    private _getActivePageIndex(pageId: string): number {
        let activePageIndex = 0;
        if (pageId) {
            $.each(this.tabs(), (index: number, pageTab: PageTabViewModel) => {
                if (pageTab.getPage().id === pageId) {
                    if (this.activeTabIndex() !== index) {
                        activePageIndex = index;
                    }
                    return false;
                }
            });
        }

        return activePageIndex;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved before.
     */
    public canMoveBefore(tabIndex: number): boolean {
        const tab = this.tabs()[tabIndex];
        let prevTab: PageTabViewModel;

        if (tabIndex > 0) {
            prevTab = this.tabs()[tabIndex - 1];
        }
        return super.canMoveBefore(tabIndex) && !tab.getPage().inherited && prevTab && !prevTab.getPage().inherited;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved after.
     */
    public canMoveAfter(tabIndex: number): boolean {
        const tab = this.tabs()[tabIndex];

        return super.canMoveAfter(tabIndex) && !tab.getPage().inherited;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert before.
     */
    public canInsertBefore(tabIndex: number): boolean {
        return false;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert after.
     */
    public canInsertAfter(tabIndex: number): boolean {
        return false;
    }

    /**
     * Set the tab to be activated.
     * @param tabViewModel The tab view model.
     */
    public selectTab(tabViewModel: PageTabViewModel) {
        super.selectTab(tabViewModel);
        this._onTabSelectDelegate(tabViewModel.getPage());
    }

    /**
     * Delete tab.
     * @param index Index to be deleted.
     */
    public deleteTab(index: number) {
        const deletedTab = this.tabs()[index];
        this._onTabDeleteDelegate(deletedTab.getPage());
        super.deleteTab(index);

        // call select handler manually on the activeTab so that we can fill the grid
        this._onTabSelectDelegate(this.getActiveTab().getPage());
    }

    /**
     * Move tab from fromIndex to toIndex
     * @param fromIndex the index of the tab that needs to move.
 	 * @param toIndex the index of the tab that needs to move to.
     */
    public moveTab(fromIndex: number, toIndex: number) {
        const movedTab = this.tabs()[fromIndex];
        this._onTabMovedDelegate(movedTab.getPage(), toIndex);
        super.moveTab(fromIndex, toIndex);

        // call select handler manually on the activeTab so that we can fill the grid
        this._onTabSelectDelegate(this.getActiveTab().getPage());
    }
}

export interface IProcessLayoutViewOptions extends AdminProcessCommon.ProcessControlOptions.ProcessAndWorkItemTypeView {
    headMenuItems?: Menus.IMenuItemSpec[];
    endMenuItems?: Menus.IMenuItemSpec[];
    controlContributionInputLimit: number;
    showEditControlExtensionField?: boolean;
    hideRefreshToolbarItem?: boolean;
    alsoRemoveFromWorkItemType?: boolean;
    preventDeleteNonEmptyPage?: boolean;

    // Callback to ensure new nav UI gets notified of updates
    beginAddFieldToWorkItemType: (
        field: ProcessContracts.ProcessWorkItemTypeField,
        processId: string, witRefName: string
    ) => IPromise<ProcessContracts.ProcessWorkItemTypeField>;
}

export class ProcessLayoutView extends AdminProcessCommon.WorkItemTypeViewPage {
    public static enhancementTypeName: string = "tfs.admin.processLayoutView";

    private _layoutMenuItems: Menus.IMenuItemSpec[];
    private _toolBar: Menus.MenuBar;
    private _workItemType: ProcessWorkItemType;
    private _process: AdminProcessCommon.ProcessDescriptorViewModel;
    private _layoutFormWrapper: JQuery;
    private _processFieldHelper: AdminProcessCommon.ProcessFieldHelper;
    private _errorPane: ProcessLayoutMessageAreaControl;
    private _layoutFormRenderer: ProcessLayoutFormRenderer;
    private _tabStripControl: TFS_TabStrip_Control.TabStripControl<TFS_TabStrip_ViewModels.TabCollectionViewModel<TFS_TabStrip_ViewModels.TabViewModel>>;
    private _activePage: Page;
    private _focusedGroupId: string;
    private _focusedControlId: string;
    private _activePageGrid: JQuery;
    private _onViewLoadMessage: string;
    private _contributions: Contribution[];
    private _contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>>;
    private _contributionLoadError: boolean = false;
    private _eventService: EventsServices.EventService;
    private _layoutOM: ProcessLayoutOM;
    private _menuItemClickedDelegate: Function;

    private static MENU_NEW_FIELD = "process-layout-toolbar-new-field";
    private static MENU_NEW_CONTROL_EXTENSION = "process-layout-toolbar-new-control-extension";
    private static MENU_FIND_CONTROL_EXTENSION = "process-layout-toolbar-find-control-extension";
    private static MENU_NEW_GROUP = "process-layout-toolbar-new-group";
    private static MENU_NEW_PAGE = "process-layout-toolbar-new-page";
    private static MENU_REFRESH = "process-layout-toolbar-refresh";

    constructor(options: IProcessLayoutViewOptions) {
        super(options);
        this._workItemType = options.workItemType;
        this._process = options.process;
        this._eventService = EventsServices.getService();
        this._layoutOM = new ProcessLayoutOM(
            {
                tfsContext: this._options.tfsContext,
                controlContributionInputLimit: this._options.controlContributionInputLimit,
                getWorkItemType: () => this._workItemType,
                getProcess: () => this._process,
                setError: (message: string) => this._errorPane.setMessage(message),
                refresh: (focusedPageId, focusedGroupId, focusedControlId) => this._refresh(focusedPageId, focusedGroupId, focusedControlId),
                disableOrdering: () => this._layoutFormRenderer.disableOrdering(),
                hideBusyOverlay: () => this.hideBusyOverlay(),
                addHistoryPoint: this._options.addHistoryPoint,
            }
        );
    }

    public initialize() {
        super.initialize();

        this._processFieldHelper = new AdminProcessCommon.ProcessFieldHelper();
        // get the field usage
        this._getFieldUsage(this._process, (data) => {
            this._initialize();
        });
    }

    public dispose() {
        Menus.menuManager.detachExecuteCommand(this._menuItemClickedDelegate);
        super.dispose();
    }

    public setOnViewLoadMessage(message: string) {
        this._onViewLoadMessage = message;
    }

    // This method is executed when we switch between Fields and Layout pages
    public refresh(processDescriptor?: AdminProcessCommon.ProcessDescriptorViewModel, workItemType?: ProcessWorkItemType) {
        if (processDescriptor) {
            this._process = processDescriptor;
        }

        if (workItemType) {
            this._workItemType = workItemType;
        }

        this._getFieldUsage(this._process);

        this._updateToolbarPermissions();
        this._renderLayout(this._layoutFormWrapper);

        this.publishProcessLoadTelemetry();
    }

    public clearErrorPane(): void {
        if (this._errorPane) {
            // Clearing any previous errors.
            this._errorPane.clear();
        }
    }

    // This method is executed when layout is changed or the user hits the Refresh button
    private _refresh(focusedPageId: string = null, focusedGroupId: string = null, focusedControlId: string = null): void {
        this.clearErrorPane();
        this._options.dataProvider.invalidateCache(this._process.processTypeId);
        this._getFieldUsage(this._process, (data) => {
            let workItemType: ProcessWorkItemType;
            this._layoutOM.fieldUsageData = data;
            if (this._workItemType.referenceName) {
                for (let i = 0; i < data.WorkItemTypes.length; ++i) {
                    if (this._workItemType.referenceName === data.WorkItemTypes[i].referenceName) {
                        workItemType = data.WorkItemTypes[i];
                        break;
                    }
                }
            }

            if (!workItemType) {
                workItemType = data.WorkItemTypes[0];
                this._options.addHistoryPoint({ process: this._process.name, type: null, view: null });
            }

            this._workItemType = workItemType;

            if (focusedPageId) {
                const pages = AdminProcessCommon.ProcessLayoutHelpers.getPages(workItemType.layout, true);
                for (let i = 0; i < pages.length; i++) {
                    if (pages[i].id === focusedPageId) {
                        this._activePage = pages[i];
                        break;
                    }
                }
            }

            this._focusedGroupId = focusedGroupId;
            this._focusedControlId = focusedControlId;

            this._renderLayout(this._layoutFormWrapper);
        });
    }

    private _setOnViewLoadMessageIfAvailable() {
        if (!this._onViewLoadMessage) {
            this._errorPane.clear();
        } else {
            this._errorPane.setMessage(this._onViewLoadMessage, Notifications.MessageAreaType.Info);
            this._onViewLoadMessage = null;
        }
    }

    private _getFieldUsage(processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel, action?: (data: AdminProcessContracts.ProcessDefinitionFieldUsageData) => void) {
        const element = this.getElement();
        if (this.isDisposed() || !element) {
            return;
        }

        this._options.dataProvider.beginGetFieldUsage(
            processDescriptor.processTypeId, (data: AdminProcessContracts.ProcessDefinitionFieldUsageData) => {
                if (this.isDisposed()) {
                    return;
                }

                this._layoutOM.fieldUsageData = data;
                if (action) {
                    action(data);
                }
            },
            element.parent()
        );
    }

    private _initialize() {
        this.getElement().empty();
        const viewDiv = this.getElement().addClass("process-layout-view");

        const header = $("<div>").addClass("process-grid-view-header bowtie").appendTo(viewDiv);
        header.attr("title", AdminResources.LayoutViewDescriptionToolTip);
        header.html(Utils_String.format(AdminResources.LayoutViewDescription, "icon bowtie-icon bowtie-row-child"));

        this._layoutMenuItems = [];

        if (this._options.headMenuItems) {
            this._options.headMenuItems.forEach(item => this._layoutMenuItems.push(item));
        }

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_NEW_FIELD,
            showText: true,
            text: AdminResources.LayoutToolBarNewField,
            title: AdminResources.LayoutToolBarNewField,
            groupId: "layout",
            icon: "bowtie-icon bowtie-edit-rename",
            setTitleOnlyOnOverflow: true
        });

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_NEW_GROUP,
            showText: true,
            text: AdminResources.LayoutToolBarNewGroup,
            title: AdminResources.LayoutToolBarNewGroup,
            groupId: "layout",
            icon: "bowtie-icon bowtie-view-list-group",
            setTitleOnlyOnOverflow: true
        });

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_NEW_PAGE,
            showText: true,
            text: AdminResources.LayoutToolBarNewPage,
            title: AdminResources.LayoutToolBarNewPage,
            groupId: "layout",
            icon: "bowtie-icon bowtie-file",
            setTitleOnlyOnOverflow: true
        });

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION,
            showText: true,
            text: AdminResources.LayoutToolBarNewControlExtension,
            title: AdminResources.LayoutToolBarNewControlExtension,
            groupId: "layout",
            icon: "bowtie-icon bowtie-shop-server",
            hidden: true,
            setTitleOnlyOnOverflow: true
        });

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_FIND_CONTROL_EXTENSION,
            showText: true,
            text: AdminResources.GetControlExtensions,
            title: AdminResources.GetControlExtensions,
            groupId: "layout",
            icon: "bowtie-icon bowtie-shop-server",
            hidden: false,
            setTitleOnlyOnOverflow: true,
            href: findExtensionUrlHosted,
        });

        this._layoutMenuItems.push({
            id: ProcessLayoutView.MENU_REFRESH,
            idIsAction: true,
            disabled: false,
            icon: "bowtie-icon bowtie-navigate-refresh",
            showText: false,
            title: AdminResources.Refresh,
            groupId: "layout-refresh",
            hidden: this._options.hideRefreshToolbarItem
        });

        if (this._options.endMenuItems) {
            this._options.endMenuItems.forEach(item => this._layoutMenuItems.push(item));
        }

        const toolBarDiv = $("<div>").addClass("process-work-item-type-toolbar toolbar process-admin-wit-toolbar").appendTo(viewDiv);
        this._toolBar = <Menus.MenuBar>Controls.BaseControl.createIn(
            Menus.MenuBar, toolBarDiv,
            {
                items: this._layoutMenuItems,
            }
        );
        this._toolBar._element.find("[class=drop]").css("margin-left", "2px");

        this._errorPane = <ProcessLayoutMessageAreaControl>Controls.BaseControl.createIn(
            ProcessLayoutMessageAreaControl, this.getElement(), <Notifications.IMessageAreaControlOptions>{ showIcon: true });
        this._errorPane.setProcessLayoutView(this);

        this._menuItemClickedDelegate = delegate(this, this._onExecuteCommand);
        Menus.menuManager.attachExecuteCommand(this._menuItemClickedDelegate);
        this._layoutFormWrapper = $("<div>").addClass("process-layout-form-wrapper").appendTo(viewDiv);
        this._updateToolbarPermissions();
        this._renderLayout(this._layoutFormWrapper);

        this.publishProcessLoadTelemetry();

        this._eventService.attachEvent(
            AdminProcessCommon.ProcessLayoutEvents.CONTRIBUTIONS_LOADED,
            (sender, args: AdminProcessCommon.ProcessLayoutEvents.IContributionLoadedArgs) => {
                this._updateMenuBarWithContributions(args.contributions);
            });

        AdminProcessCommon.ProcessContributionHelpers.getControlContributions().then(
            (contributions: Contribution[]) => {
                this._contributions = contributions;
                this._contributionInputByIds = AdminProcessCommon.ProcessContributionHelpers.createContributionInputByIdsMap(this._contributions);
                this._eventService.fire(
                    AdminProcessCommon.ProcessLayoutEvents.CONTRIBUTIONS_LOADED,
                    this,
                    {
                        contributions: contributions,
                        contributionInputByIds: this._contributionInputByIds
                    } as AdminProcessCommon.ProcessLayoutEvents.IContributionLoadedArgs);
            },
            (error) => {
                this._contributionLoadError = true;
                this._errorPane.setMessage(AdminResources.ControlContributionEditDisabledErrorMessage);
            });
    }

    private _updateMenuBarWithContributions(contributions: Contribution[]) {
        if (contributions && contributions.length > 0) {
            const newCustomControlMenuItem = this._toolBar.getItem(ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION);
            this._toolBar.updateCommandStates([
                {
                    id: ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION,
                    hidden: false,
                }
            ]);
        }
        getServerKey().then(serverKey => {
            if (serverKey) {
                const href = findExtensionUrlHosted + "&serverKey=" + encodeURIComponent(serverKey) + "&hosting=onpremises";
                const findItem = this._toolBar.getItems().filter(i => i._item.id === ProcessLayoutView.MENU_FIND_CONTROL_EXTENSION)[0];
                if (findItem) {
                    findItem._item.href = href;
                    findItem.update(findItem._item);
                }
            }
        });
        this._updateToolbarPermissions();
    }

    private publishProcessLoadTelemetry(): void {

        // Get some data about the pages and sections, specifically for each custom page get the sections, and for each section indicate
        // the number of groups and the number of controls in that section.
        const sectionData: any = {};
        let pageIndex: number = 0;

        if (this._workItemType && this._workItemType.layout) {
            $.each(this._workItemType.layout.pages, (i: number, page: Page) => {
                if (page.pageType === PageType.Custom && page.visible) {
                    sectionData[pageIndex] = {};

                    $.each(page.sections, (j: number, section: Section) => {
                        let countControls = 0;
                        $.each(section.groups, (k: number, group: Group) => {
                            countControls += group.controls.length;
                        });

                        sectionData[pageIndex].pageId = page.id;
                        sectionData[pageIndex][section.id] = {};
                        sectionData[pageIndex][section.id].numberOfGroups = section.groups.length;
                        sectionData[pageIndex][section.id].numberOfControls = countControls;
                    });

                    pageIndex++;
                }
            });
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.Process.AREA,
            CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
            {
                "event": "loadWorkItemLayout",
                "process": this._process ? this._process.name : "",
                "isSytemProcess": this._process && this._process.isSystem,
                "isInheritedProcess": this._process && this._process.isInherited,
                "workItemType": this._workItemType ? this._workItemType.name : "",
                "layoutInformation": sectionData
            }));
    }

    public fixLayoutPosition(): void {
        let siblingsHeight = 0;
        this._layoutFormWrapper.siblings(":visible").each(function () {
            const $element = $(this);
            siblingsHeight += $element.outerHeight(true);
        });
        this._layoutFormWrapper.css("top", siblingsHeight);
    }

    private _isWorkItemTypeBlockedFromCustomization(): boolean {
        return this._workItemType && AdminProcessCommon.ProcessBlockingResource.WorkItemTypesBlockedFromCustomization.indexOf(this._workItemType.referenceName.toLowerCase()) > -1;
    }

    private _canEditProcess(): boolean {
        return this._process.canEdit() && !this._process.isSystem && !this._isWorkItemTypeBlockedFromCustomization();
    }

    private _updateToolbarPermissions(): void {
        const newFieldMenuItem = this._toolBar.getItem(ProcessLayoutView.MENU_NEW_FIELD);
        const newGroupMenuItem = this._toolBar.getItem(ProcessLayoutView.MENU_NEW_GROUP);
        const newPageMenuItem = this._toolBar.getItem(ProcessLayoutView.MENU_NEW_PAGE);
        const newCustomControlMenuItem = this._toolBar.getItem(ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION);

        // Change the tool bar menu state on switching between workitem types
        if (!this._canEditProcess() || this._isWorkItemTypeBlockedFromCustomization()) {
            this._toolBar.updateCommandStates([
                {
                    id: ProcessLayoutView.MENU_NEW_FIELD,
                    disabled: true
                },
                {
                    id: ProcessLayoutView.MENU_NEW_GROUP,
                    disabled: true
                },
                {
                    id: ProcessLayoutView.MENU_NEW_PAGE,
                    disabled: true
                },
                {
                    id: ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION,
                    disabled: true,
                    hidden: newCustomControlMenuItem.isHidden()
                }
            ]);
            newFieldMenuItem.updateTitle(AdminResources.WorkItemTypeBlockedFromCustomization);
            newGroupMenuItem.updateTitle(AdminResources.WorkItemTypeBlockedFromCustomization);
            newPageMenuItem.updateTitle(AdminResources.WorkItemTypeBlockedFromCustomization);
            newCustomControlMenuItem.updateTitle(AdminResources.WorkItemTypeBlockedFromCustomization);
        } else {
            this._toolBar.updateCommandStates([
                {
                    id: ProcessLayoutView.MENU_NEW_FIELD,
                    disabled: false
                },
                {
                    id: ProcessLayoutView.MENU_NEW_GROUP,
                    disabled: false
                },
                {
                    id: ProcessLayoutView.MENU_NEW_PAGE,
                    disabled: false
                },
                {
                    id: ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION,
                    disabled: false,
                    hidden: newCustomControlMenuItem.isHidden()
                }
            ]);

            newFieldMenuItem.updateTitle(AdminResources.LayoutToolBarNewField);
            newGroupMenuItem.updateTitle(AdminResources.LayoutToolBarNewGroup);
            newPageMenuItem.updateTitle(AdminResources.LayoutToolBarNewPage);
            newCustomControlMenuItem.updateTitle(AdminResources.LayoutToolBarNewControlExtension);
        }
    }

    private _getPage() {
        return !this._activePage.isContribution ? this._activePage : this._workItemType.layout.pages[0];
    }

    private _renderLayout($container: JQuery) {
        let oldPageId = this._activePage ? this._activePage.id : null;

        $container.empty();
        this._activePage = null;

        this._layoutFormRenderer = new ProcessLayoutFormRenderer(
            this._workItemType.layout,
            !this._canEditProcess(),
            this._layoutOM.fieldsMap,
            this._contributions,
            (group: Group, control: Control, fieldIdsToRemoveFromWorkItemType: string[]) => this._layoutOM.Field.removeFromLayout(
                this._workItemType.layout, group, control, this._contributions, fieldIdsToRemoveFromWorkItemType),
            (group: Group, control: Control, visible: boolean) => this._layoutOM.Field.setVisible(group, control, visible),
            (page: Page, section: Section, group: Group, visible: boolean) => this._layoutOM.Group.setVisible(page, section, group, visible),
            (page: Page, section: Section, group: Group) => this._layoutOM.Group.edit(page, section, group),
            (page: Page, section: Section, group: Group) => this._layoutOM.Group.remove(page, section, group),
            (page: Page, group: Group, targetSectionId: string, sourceSectionId: string) => this._layoutOM.Group.move(page, group, targetSectionId, sourceSectionId),
            (control: Control, targetGroupId: string, sourceGroupId: string) => this._layoutOM.Control.move(control, targetGroupId, sourceGroupId),
            (group: Group, section?: Section) => this._layoutOM.Field.add(this._getPage(), this._options.beginAddFieldToWorkItemType, group ? group.id : null, section ? section.id : null),
            (group: Group) => this._layoutOM.Control.addExtension(this._activePage, this._options.beginAddFieldToWorkItemType, group.id),
            (section: Section, group: Group, control: Control) => this._editControlMenuItemSpecs(section, group, control),
            this._process.isSystem,
            this._options.alsoRemoveFromWorkItemType);

        let pageOptions: IPageTabViewModelOptions[] = [];

        $.each(this._workItemType.layout.pages, (i: number, page: Page) => {
            if (page.pageType === PageType.Custom) {
                pageOptions.push({
                    id: page.id,
                    name: page.label,
                    page: page,
                    process: this._process,
                    preventDeleteNonEmptyPage: this._options.preventDeleteNonEmptyPage
                });
            }
        });

        if (pageOptions.length === 0) {
            // no need to create a layout when there are no pages to show
            return;
        }

        let pageTabCollectionViewModel = new PageTabCollectionViewModel(
            pageOptions,
            // selection event handler
            (page: Page) => {
                if (!this._activePage || page.id !== this._activePage.id) {
                    if (this._activePageGrid) {
                        this._activePageGrid.remove();
                        this._activePageGrid = null;
                    }
                    this._activePage = page;
                    Utils_Core.delay(this, 0, () => {
                        this._activePageGrid = this._layoutFormRenderer.renderLayout(this._activePage, this._focusedGroupId, this._focusedControlId);

                        $(".tabstrip-content-container", this._tabStripControl.getElement()).append(this._activePageGrid);

                        let clickHandler = () => {
                            this._layoutOM.Field.add(this._getPage(), this._options.beginAddFieldToWorkItemType);
                        };

                        $(".empty-page-href a", this._tabStripControl.getElement()).click(clickHandler).keyup((e: JQueryKeyEventObject) => {
                            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                                clickHandler();
                            }
                        });
                    });
                }
            },
            // delete event handler
            (page: Page) => {
                this._layoutOM.Page.remove(page);
            },
            // move event handler
            (page: Page, order: number) => {
                this._layoutOM.Page.move(page, order);
            },
            oldPageId);

        let extraMenuItems = [];
        if (this._canEditProcess()) {
            // we dont want to show edit option in page if a process cannot be edited
            extraMenuItems = [
                {
                    id: "edit-page-command",
                    text: AdminResources.Edit,
                    setDefaultTitle: false,
                    cssClass: TFS_TabStrip_Control.TabStripControl.TAB_MENU_ITEM_CLASS,
                    noIcon: false,
                    icon: "bowtie-icon bowtie-edit",
                    action: (pageTabViewModel: PageTabViewModel) => {
                        this._layoutOM.Page.edit(pageTabViewModel.getPage());
                    }
                },
                {
                    id: "hide-page-command",
                    text: AdminResources.HideNodeInLayoutContextMenuText,
                    title: Utils_String.format(AdminResources.HideNodeInLayoutContextMenuTooltip, AdminResources.Page),
                    cssClass: TFS_TabStrip_Control.TabStripControl.TAB_MENU_ITEM_CLASS,
                    noIcon: false,
                    icon: "bowtie-icon bowtie-status-no",
                    action: (pageTabViewModel: PageTabViewModel) => {
                        this._layoutOM.Page.setVisible(pageTabViewModel.getPage(), false);
                    }
                },
                {
                    id: "show-page-command",
                    text: AdminResources.ShowNodeInLayoutContextMenuText,
                    title: Utils_String.format(AdminResources.ShowNodeInLayoutContextMenuTooltip, AdminResources.Page),
                    cssClass: TFS_TabStrip_Control.TabStripControl.TAB_MENU_ITEM_CLASS,
                    noIcon: false,
                    icon: "bowtie-icon bowtie-check-light",
                    action: (pageTabViewModel: PageTabViewModel) => {
                        this._layoutOM.Page.setVisible(pageTabViewModel.getPage(), true);
                    }
                }
            ];
        }
        let options: TFS_TabStrip_Control.ITabStripControlOptions<PageTabCollectionViewModel> = {
            align: TFS_TabStrip_Control.TabStripControl.HORIZONTAL_ALIGN,
            contentTemplateClassName: "",
            tabCollection: pageTabCollectionViewModel,
            overrideTemplateBinding: true,
            extraMenuItems: extraMenuItems,
            enableContainment: true,
            disablePopupMenuFocus: true,
            useArrowKeysSwitchTab: true
        };

        Utils_Core.delay(this, 0, () => {
            // Creating the tab strip after the layout view is rendered into DOM, thus the delay.
            // If we create the tab control before its parent is added to DOM, we wont see the arrow scrollbar
            this._tabStripControl = Controls.Control.create(TFS_TabStrip_Control.TabStripControl, $container, options);
            this._tabStripControl._bind(TFS_TabStrip_Control.TabStripControl.TAB_SORTED_EVENT, (event, args) => {
                // in case of moving pages using drag/drop, the control doesnt call moveTab() function so we have to listen to a custom event for this case
                if (args.fromIndex && args.toIndex && args.fromIndex !== args.toIndex) {
                    this._layoutOM.Page.move(args.tab.getPage(), args.toIndex);
                }
            });
            this._setOnViewLoadMessageIfAvailable();
        });
    }

    private _onExecuteCommand(sender: any, args?: any) {
        switch (args.get_commandName()) {
            case ProcessLayoutView.MENU_NEW_FIELD:
                if (this._workItemType) {
                    this._layoutOM.Field.add(this._getPage(), this._options.beginAddFieldToWorkItemType);
                }
                break;
            case ProcessLayoutView.MENU_NEW_GROUP:
                if (this._workItemType) {
                    this._layoutOM.Group.add(this._getPage());
                }
                break;
            case ProcessLayoutView.MENU_NEW_PAGE:
                if (this._workItemType) {
                    this._layoutOM.Page.add();
                }
                break;
            case ProcessLayoutView.MENU_NEW_CONTROL_EXTENSION:
                if (this._workItemType) {
                    this._layoutOM.Control.addExtension(this._activePage, this._options.beginAddFieldToWorkItemType);
                }
                break;
            case ProcessLayoutView.MENU_FIND_CONTROL_EXTENSION:
                if (this._workItemType) {
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        Admin.CustomerIntelligenceConstants.Process.AREA,
                        Admin.CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
                        {
                            "event": "clickFindControlExtensions",
                            "process": this._process ? this._process.name : "",
                            "isSytemProcess": this._process && this._process.isSystem,
                            "isInheritedProcess": this._process && this._process.isInherited,
                            "workItemType": this._workItemType ? this._workItemType.name : "",
                        })
                    );
                }
                break;
            case ProcessLayoutView.MENU_REFRESH:
                if (this._workItemType) {
                    // Menu item refresh
                    this._refresh();

                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.Process.AREA,
                        CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
                        {
                            "event": "toolbarRefresh",
                            "process": this._process ? this._process.name : "",
                            "isSytemProcess": this._process && this._process.isSystem,
                            "isInheritedProcess": this._process && this._process.isInherited,
                            "workItemType": this._workItemType ? this._workItemType.name : "",
                        }));
                }
                break;
        }
    }

    private _editControlMenuItemSpecs(section: Section, group: Group, control: Control): Menus.IMenuItemSpec[] {
        let result: Menus.IMenuItemSpec[] = null;

        // if the control is not bound to a field, dont put Edit option in context menu. We'll come back to this case in future with a new spec
        // if we were unable to load control contributions, do not show the edit dialog for control contributions.
        if (!AdminProcessCommon.ProcessLayoutHelpers.isNonFieldControl(control) &&
            (!control.isContribution || !this._contributionLoadError)) {
            // if we have no contributions, do not let them edit since there is nothing actionable.
            let editDisabled: boolean = control.isContribution && this._contributions && this._contributions.length === 0;
            let title: string = editDisabled ? AdminResources.ControlContributionEditDisabledTooltip : AdminResources.Edit;
            let editContributionFieldTitle: string = editDisabled ? AdminResources.ControlContributionEditDisabledTooltip : AdminResources.EditField;

            let editContributionFieldMenuItems: Menus.IMenuItemSpec[] = null;
            if (this._options.showEditControlExtensionField && control.isContribution) {
                let contribution: WitContribution = control.contribution;
                if (contribution && contribution.contributionId && contribution.inputs) {
                    editContributionFieldMenuItems = this._editContributionFieldMenuItemSpecs(
                        contribution.contributionId, contribution.inputs, editDisabled, this._activePage, group, control);
                }
            }

            let editMenuItem: Menus.IMenuItemSpec = {
                id: "process-layout-edit",
                text: AdminResources.Edit,
                title: title,
                setTitleOnlyOnOverflow: true,
                icon: "bowtie-icon bowtie-edit",
                disabled: editDisabled,
                action: (contextInfo) => {
                    this._layoutOM.Control.edit(this._activePage, section, group, control, this._options.beginAddFieldToWorkItemType);
                }
            };
            result = [editMenuItem];

            if (editContributionFieldMenuItems && editContributionFieldMenuItems.length > 0) {
                let editContributionFieldRootMenuItem: Menus.IMenuItemSpec = {
                    id: "process-layout-edit-contribution-field",
                    text: AdminResources.EditField,
                    title: editContributionFieldTitle,
                    setTitleOnlyOnOverflow: true,
                    icon: "bowtie-icon bowtie-edit",
                    disabled: editDisabled,
                    childItems: editContributionFieldMenuItems
                };

                // case where only one field to edit, don't do flyout and use root menu item to edit
                if (editContributionFieldMenuItems.length === 1) {
                    editContributionFieldRootMenuItem.childItems = null;
                    editContributionFieldRootMenuItem.action = editContributionFieldMenuItems[0].action;
                }

                // case where selected is control extension and there is at least one field to edit, use explicit
                // menu item text "Edit control extension" and "Edit field"
                editMenuItem.text = AdminResources.EditControlExtension;
                result.push(editContributionFieldRootMenuItem);
            }
        }

        return result;
    }

    private _editContributionFieldMenuItemSpecs(
        contributionId: string,
        fieldIdByInputId: IDictionaryStringTo<string>,
        editDisabled: boolean,
        page: Page,
        group: Group,
        control: Control): Menus.IMenuItemSpec[] {
        let result: Menus.IMenuItemSpec[] = [];
        let fieldsAdded: AdminProcessContracts.ProcessField[] = [];

        for (let inputId in fieldIdByInputId) {
            if (AdminProcessCommon.ProcessContributionHelpers.isContributionInputWorkItemField(this._contributionInputByIds, contributionId, inputId) &&
                fieldIdByInputId[inputId]) {
                let field: AdminProcessContracts.ProcessField = this._layoutOM.fieldsMap[fieldIdByInputId[inputId]];
                if (!field || fieldsAdded.indexOf(field) > -1) {
                    continue;
                }

                fieldsAdded.push(field); // keep the list distinct
                result.push({
                    text: field.Name,
                    title: field.Name,
                    setTitleOnlyOnOverflow: true,
                    noIcon: true,
                    disabled: editDisabled,
                    action: (contextInfo) => {
                        EditFieldDialogHelper.EditField(
                            this._processFieldHelper,
                            this._options.dataProvider,
                            this._process,
                            this._workItemType,
                            this._layoutOM.fieldUsageData,
                            field,
                            true, // hide layout tab
                            this._options.tfsContext,
                            this._options.addHistoryPoint,
                            () => this._refresh(page.id, group.id, control.id),
                            this._options.beginAddFieldToWorkItemType
                        );
                    }
                });
            }
        }

        return result;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Process.Layout", exports);
