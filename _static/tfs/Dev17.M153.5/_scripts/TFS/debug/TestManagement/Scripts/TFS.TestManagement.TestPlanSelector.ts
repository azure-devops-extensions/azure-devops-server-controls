import * as Q from "q";
import Controls = require("VSS/Controls");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import TestPlanFavoritesStore_LAZY_LOAD = require("TestManagement/Scripts/TestPlanFavorite/TFS.TestManagement.TestPlansFavoriteStore");
import TFS_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");


let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;

export class TestPlanSelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu {

    private _selectedPlan: string;
    private _idToPlanTextMap: any;
    private _fliteredListControl: TestPlanSelectorControl;
    private _isFilterApplied: boolean = false;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            chevronClass: "bowtie-chevron-down-light",
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.addClass("testplan-selector-menu");
        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });
    }

    /**
     * Reinitalizes the control when test plan filter is applied or removed
     */
    public setIsFilterApplied(isApplied: boolean) {
        this._isFilterApplied = isApplied;
        if (this._fliteredListControl) {
            let popupEnhancement = this._getPopupEnhancement();
            popupEnhancement.resetContent();
        }
    }

    /**
     * Creates the popup list on clicking of menu
     */
    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        this._fliteredListControl = <TestPlanSelectorControl>Controls.Enhancement.enhance
            (TestPlanSelectorControl, $container, <ITestPlanSelectorControlOptions>{
                filteredTestPlans: this._idToPlanTextMap,
                isFilterApplied: this._isFilterApplied
            });
        return this._fliteredListControl;
    }

    public _getItemDisplayText(item: any): string {
        if (item) {
            return item.text;
        }
        else {
            return Resources.SelectPlan;
        }
    }

    public refreshFavorites() {
        if (this._fliteredListControl) {
            let popupEnhancement = this._getPopupEnhancement();
            popupEnhancement.resetContent();
        }
    }

    /**
     * Displays the passed data in comobox and takes care of initial selection
     * <param name="data" type="Object">the data to show</param>
     * <param name="selectedPlanId" type="Number">the planid to select</param>
     */
    public setData(data: any, selectedPlanId: number) {    
        let selectedPlan;
        this._idToPlanTextMap = {};

        this._setDisplayTextAndCreateIdToTextMap(data);
        if (selectedPlanId) {
            selectedPlan = this._idToPlanTextMap[selectedPlanId];
        } else {
            this._setSelectedPlan(null);
        }

        if (data) {
            if (selectedPlan) {
                this._setSelectedPlan(selectedPlan);
            }
        }
    }

    public updateData(plan: any, setSelectedPlan?: boolean, oldPlan?: any) {
        if (plan) {
            this._setDisplayTextAndCreateIdToTextMap([plan]);
            if (setSelectedPlan) {
                this._setSelectedPlan(plan);
            }
        }
    }

    public clearDropDown() {

    }

    /**
     * Selects the plan to show in popup menu
     */
    public selectPlanById(planId: number): any {
        let plan = this._idToPlanTextMap[planId];
        if (plan) {
            this._setSelectedPlan(plan);
        }
        return plan;
    }

    public removeDeletedPlanAndSetSelectedPlan(planId: number) {
        let plan = this._idToPlanTextMap[planId];

        if (plan) {
            delete this._idToPlanTextMap[planId];
        }

        //Get the next plan in list to show
        let selectedPlan;
        for (let i in this._idToPlanTextMap) {
            selectedPlan = this._idToPlanTextMap[i];
            break;
        }

       this._setSelectedPlan(selectedPlan);
             
        if (this._fliteredListControl) {
            this._fliteredListControl._clearCachedItems(TabIds.Favorites);
            this._fliteredListControl._clearCachedItems(TabIds.All);
        }
        this.refreshFavorites();
        return this._selectedPlan;
    }

    private _setSelectedPlan(selectedPlan: any) {
        this._selectedPlan = selectedPlan;
        this._fire("itemSelected", { item: selectedPlan });
        this.setSelectedItem(selectedPlan);
    }

    private _setDisplayTextAndCreateIdToTextMap(plans: any) {
        this._idToPlanTextMap = TestPlanSelectorUtils.GetPlanDisplayNameAndIdToObjectMapping(plans, this._idToPlanTextMap);
    }

}

VSS.initClassPrototype(TestPlanSelectorMenu, {
    _selectedPlan: null,
    _idToPlanTextMap: null,
    _fliteredListControl: null
});

module TabIds {
    export const All = "all";
    export const Favorites = "favorites";
}

export interface ITestPlanSelectorControlOptions extends TFS_FilteredListControl.FilteredListControlOptions {
    filteredTestPlans: any;
    isFilterApplied: boolean;
}


export class TestPlanSelectorControl extends TFS_FilteredListControl.FilteredListControl {

    private _myFavoriteStore: TestPlanFavoritesStore_LAZY_LOAD.TestPlansFavoriteStore;
    private _filteredTestPlans: any;
    private _isFilterApplied: boolean = false;
    private _storedSelectedTab: string;

    public initializeOptions(options?: ITestPlanSelectorControlOptions) {
        let tabNames: any = {};
        let defaultTabId: string = null;

        this._isFilterApplied = options.isFilterApplied;
        tabNames.favorites = Resources.TestPlanSelectorFavoriteTabText;
        tabNames.all = this._isFilterApplied ? Resources.TestPlanSelectorFilteredTabText : Resources.TestPlanSelectorAllTabText;
        defaultTabId = TabIds.Favorites;

        super.initializeOptions($.extend({
            tabNames: tabNames,
            defaultTabId: defaultTabId,
            scrollToExactMatch: true,
            updateListOnTabSelection: true,
            useBowtieStyle: true,
            showFavorites: true
        }, options));

        this._filteredTestPlans = options.filteredTestPlans;

    }

    public initialize() {
        this._element.addClass("testplan-selector-control").addClass("test-plan-selector");
        super.initialize();
    }

    public _getWaterMarkText(tabId: string) {
        return Resources.TestPlanSelectorFilterPlanWaterMarkText;
    }

    public _getNoItemsText(tabId: string) {
        if (tabId === TabIds.Favorites) {
            return Resources.TestPlanSelectorNoItemsFavoriteText;
        }
        else {
            return Resources.TestPlanSelectorNoItemsFilterTabText;
        }
    }

    public _getNoMatchesText(tabId: string) {
        return Resources.TestPlanSelectorNoMatchesText;
    }

    public _getItemName(plan: any) {
        let name = plan.text;
        return name;
    }

    public setSelectedItem(item: any, skipUpdate?: boolean) {
        super.setSelectedItem(item, skipUpdate);
        this._fire("itemSelected", { item: item });
    }

    public _getItemIsFavorite(item: any): boolean {
        let data = this._getFavoriteId(item);
        return !!(data && this._myFavoriteStore && this._myFavoriteStore.isFavoriteItem(data));
    }

    public _setItemIsFavorite(item: any, makeFavorite: boolean) {
        if (makeFavorite){
            this._addToFavorites(item); 
        } else{
            this._removeFromFavorites(item);
        }
    }

    public onTabClick(e: JQueryEventObject) {
        let tabId = $(e.target).closest(".filtered-list-tab").data("tabId");
        return super.onTabClick(e);
    }

    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        if (tabId === TabIds.Favorites) {
            if (this._myFavoriteStore) {
                callback.call(this, this._getFavoriteListItems());
            }
            else {
                let level = TFS_Host_TfsContext.NavigationContextLevels.Project;

				 VSS.using(["TestManagement/Scripts/TestPlanFavorite/TFS.TestManagement.TestPlansFavoriteStore"], (module: typeof TestPlanFavoritesStore_LAZY_LOAD) => {
					module.TestPlansFavoriteStore.getFavoriteStore(this._options.tfsContext, level, null).then((favStore: TestPlanFavoritesStore_LAZY_LOAD.TestPlansFavoriteStore) => {
					    this._myFavoriteStore = favStore;
					    let favoriteTestPlans = this._getFavoriteListItems();
					    callback.call(this, favoriteTestPlans);

					    if (favoriteTestPlans.length === 0 && this._selectedTab === TabIds.Favorites ) {
					        // If no favorites to show, then switch to the All tab asynchronously to ensure the filteredList content area is fully initialized.
					        setTimeout(() => {
					            this.selectTab(TabIds.All);
					        }, 10);
					    }
					}, (error: TfsError) => {
					    this.favoriteServiceErrorHandler(error);
					});
				});
            }
        } else {
            callback.call(this, this._filteredTestPlans);
        }
    }

    protected selectTab(tabId: string): void {
        if (this._element.is(":visible")) {
            super.selectTab(tabId);
        }
    }

    private _getFavoriteListItems(): string[]{
        let favoriteTestPlans: string[] = [];
        let favoriteitems: string[]  = this._myFavoriteStore ? this._myFavoriteStore.getFavoritePlanIdsfromStore() : [];
        favoriteitems.forEach((favoriteTestPlan: string) => {
            let favoriteplanid = parseInt(favoriteTestPlan);
            let index: number = this._getFullPlanObjectIndex(favoriteplanid);
            if (index >= 0) {
                favoriteTestPlans.push(this._filteredTestPlans[index]);
            }
        });
        return favoriteTestPlans;
    }

    private _getFullPlanObjectIndex(favoritePlanId: number) {
        let index = -1;
        $.each(this._filteredTestPlans, (i, plan) => {
            if (plan.id === favoritePlanId) {
                index = i;
                return false;
            }
        });
        return index;
    }

    private _addToFavorites(testPlan: any) {
        let data: string = this._getFavoriteId(testPlan); 
        let encodedName: string =   Utils_String.htmlEncodeJavascriptAttribute(testPlan.name);
        if (data) {
            this._myFavoriteStore.createNewItem(encodedName, data).then( () => {
                this._clearCachedItems(TabIds.Favorites);
            }, (error: TfsError) => {
                this.favoriteServiceErrorHandler(error);
            });
        }
    }

    private _removeFromFavorites(testPlan: any) {
        let favoriteItem = this._getFavoriteId(testPlan);
        if (favoriteItem) {
            this._myFavoriteStore.remove(favoriteItem).then(
                () => {
                 this._clearCachedItems(TabIds.Favorites);
                },
                (error: TfsError) => {
                    this.favoriteServiceErrorHandler(error);
                }
            );         
        }
    }

    private _getFavoriteId(testPlan: any): string {
        let id: string = "";
        if (testPlan) {
            id = testPlan.id;
        }
        return id.toString();
    }

    private favoriteServiceErrorHandler(error: TfsError){
        if (error){
            VSS.errorHandler.show(error);
        }   
    }
}

export class TestPlanSelectorUtils {

    /**
     * <summary>sets the text to be dislpayed in the drop down combo boof plans</summary>
     * <param name="plans" type="Object">the list of plans to disambiguate sorted by their name</param>
     * Assumes that the plans are sorted on names
     */
    public static GetPlanDisplayNameAndIdToObjectMapping(plans: any, idToPlanTextMap: any) {       
        let currentPlan,
            iterationNameArray = [],
            i;

        if (!idToPlanTextMap) {
            idToPlanTextMap = {};
        }
        if (plans) {
            for (i = 0; i < plans.length; i++) {
                // Adding iteration name and plan id to the plan name 
                currentPlan = plans[i];
                iterationNameArray = currentPlan.iteration.split("\\");
                currentPlan.text = Utils_String.format(Resources.TestPlanTitleFormat, iterationNameArray[iterationNameArray.length - 1], currentPlan.name, currentPlan.id);
                idToPlanTextMap[currentPlan.id] = currentPlan;
            }
        }
        return idToPlanTextMap;
    }
}
