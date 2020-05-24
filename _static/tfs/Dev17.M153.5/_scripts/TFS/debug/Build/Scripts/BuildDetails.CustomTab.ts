/// <reference types="jquery" />



import ko = require("knockout");

import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import Extensibility = require("Build/Scripts/Extensibility");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import Contributions_Contracts = require("VSS/Contributions/Contracts");

import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class BuildCustomTabViewModel {
    public contribution: KnockoutObservable<Contributions_Contracts.Contribution> = ko.observable(null);
    private _sectionFactory: Extensibility.SectionFactory;
    // callback might not be set yet when the tab is being selected, keep track of that
    private _selectTabWhenCallBackIsSet: boolean = false;

    public sections: KnockoutObservableArray<Extensibility.SummarySection> = ko.observableArray([]);

    constructor(contribution: Contributions_Contracts.Contribution) {
        this.contribution(contribution);
        this._sectionFactory = new Extensibility.SectionFactory();
    }

    public setTabSelectedCallBack(onTabSelected: () => void) {
        this._onTabSelectedCallBack = onTabSelected;
        if (onTabSelected && this._selectTabWhenCallBackIsSet) {
            this._selectTabWhenCallBackIsSet = false;
            this._onTabSelectedCallBack();
        }        
    }

    public createSection(sectionContribution: Contributions_Contracts.Contribution) {
        let contributedSections = this._sectionFactory.createContributedSections([sectionContribution]);
        this._sectionFactory.insertSections(this.sections, contributedSections);
    }

    public selectTab() {
        if (this._onTabSelectedCallBack) {
            this._onTabSelectedCallBack();
        }
        else {
            this._selectTabWhenCallBackIsSet = true;
        }
    }

    private _onTabSelectedCallBack: () => void;
}

export class BuildCustomTab extends BuildDetails.BuildDetailsTab {
    public vm: BuildCustomTabViewModel;

    constructor(vm: BuildCustomTabViewModel) {
        var tabName = vm.contribution().properties["name"] || BuildResources.TemplateCategoryCustom;
        super(vm.contribution().id, tabName, "buildvnext_details_custom_tab");
        this.vm = vm;

        this.subscribe(this.isSelected, (newValue: boolean) => {
            if (newValue) {
                this.vm.selectTab();
            }
        });
    }

    public dispose(): void {
        super.dispose();

        this.vm = null;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.BuildCustomTab", exports);
