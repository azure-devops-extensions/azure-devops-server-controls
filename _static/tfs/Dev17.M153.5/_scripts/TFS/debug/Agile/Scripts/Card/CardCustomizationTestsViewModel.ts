/// <reference types="jquery" />


import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import Dialogs = require("VSS/Controls/Dialogs");
import ko = require("knockout");
import Model = require("Agile/Scripts/Card/CardCustomizationTestsModel");
import Q = require("q");
import SettingsStore = require("Agile/Scripts/Card/CardCustomizationTestsStore");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS = require("VSS/VSS");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import StringUtils = require("VSS/Utils/String");
import Diag = require("VSS/Diag");

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService"
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;

export interface ITestAnnotationSettingsViewModelOptions {
    teamId: string;
    fireDirtyFlagChange: (isDirty: boolean) => void;
    isEditable: boolean;
}

/// <summary>
/// Parent view model for all the test annotation related settings on the CSC dialog
/// </summary>
export class TestAnnotationSettingsViewModel {

    public planSettingsViewModel: TestPlanSettingsViewModel;
    public outcomeSettingsViewModel: TestOutcomeSettingsViewModel;

    public isDirty: KnockoutComputed<boolean>;
    public isEditable: KnockoutObservable<boolean>;
    public fireDirtyFlagChange: (isDirty: boolean) => void;

    constructor(options: ITestAnnotationSettingsViewModelOptions) {
        this.fireDirtyFlagChange = options.fireDirtyFlagChange;
        this.isEditable = ko.observable(options.isEditable);
        let planModel = new Model.TestPlanSettingsModel(options.teamId);
        let outcomeModel = new Model.TestOutcomeSettingsModel(options.teamId);
        this.planSettingsViewModel = new TestPlanSettingsViewModel(planModel);
        this.outcomeSettingsViewModel = new TestOutcomeSettingsViewModel(outcomeModel);


        this.isDirty = ko.computed(() => {
            var dirtyState = this.planSettingsViewModel.isDirty() || this.outcomeSettingsViewModel.isDirty();

            if (this.fireDirtyFlagChange) {
                this.fireDirtyFlagChange(dirtyState);
            }
            return dirtyState;
        });
    }

    /// <summary>
    /// Begins fetching of all test annotation related settings from the registry
    /// </summary>
    public beginInitialize(): IPromise<any> {
        var promises = [];
        promises.push(this.planSettingsViewModel.beginInitialize());
        promises.push(this.outcomeSettingsViewModel.beginInitialize());

        return Q.all(promises);
    }

    /// <summary>
    /// Begins save of all test annotaiton related settings into the registry
    /// </summary>
    public beginSave(): IPromise<any> {
        let successHandler = () => {
            this.fireDirtyFlagChange(false);
        };

        var promises = [];

        if (this.planSettingsViewModel.isDirty()) {
            promises.push(this.planSettingsViewModel.model.beginSave());
        }
        if (this.outcomeSettingsViewModel.isDirty()) {
            promises.push(this.outcomeSettingsViewModel.model.beginSave());
        }

        return Q.all(promises).then(successHandler);
    }

    public dispose(): void {
        this.isDirty.dispose();
        this.isDirty = null;
        this.fireDirtyFlagChange = null;
        this.planSettingsViewModel.dispose();
    }
}

export class TestPlanSettingsViewModel {
    public model: Model.ITestPlanSettingsModel;
    public testPlanTitle: KnockoutObservable<string> = ko.observable("");
    public isDirty: KnockoutObservable<boolean> = ko.observable(false);

    private _currentPlanId: number = 0;
    private _initialPlanId: number = 0;
    private _subscriptions: KnockoutSubscription<any>[] = [];

    constructor(model: Model.ITestPlanSettingsModel) {
        this.model = model;

        let subscription = this.model.testPlanType.subscribe((newValue) => {
            let planType: Model.TestPlanType = parseInt(newValue.toString());
            this._handleTestPlanTypeChange(planType);
        });

        this._subscriptions.push(subscription);
    }

    /// <summary>
    /// Begins fetching of all test plan id and title from the server
    /// </summary>
    public beginInitialize(): IPromise<any> {
        let setPlanId = (id: number): void => {
            this._currentPlanId = id;
            this._initialPlanId = id;
            this.model.testPlanId(id);
            this.model.testPlanType(id ? Model.TestPlanType.custom : Model.TestPlanType.default);
        };

        let fetchTitle = (id: number): IPromise<string> => {
            return id ? this._getWorkItemTitle(id) : Q.resolve(StringUtils.empty);
        };

        let setTitle = (title: string): void => {
            this.testPlanTitle(title);
        };

        let testSettingsStore: SettingsStore.ITestAnnotationSettingsStore = SettingsStore.getStore(this.model.teamId);

        return testSettingsStore.beginGetTestPlanId()
            .then(
                (id: number): IPromise<string> => {
                    setPlanId(id);
                    return fetchTitle(id);
                },
                (error: any): IPromise<string> => {
                    Diag.logError(JSON.stringify(error));
                    setPlanId(0);
                    return Q.resolve(StringUtils.empty);
                })
            .then(
                setTitle,
                (error: any): void => {
                    Diag.logError(JSON.stringify(error));
                    setPlanId(0);
                    setTitle(StringUtils.empty);
                }
            );
    }

    /// <summary>
    /// Updates the selected test plan id and title in the view model
    /// </summary>
    public selectPlan(planId: number): IPromise<any> {
        if (planId !== this._currentPlanId) {
            this.model.testPlanId(planId);
            this._currentPlanId = planId;
            this.isDirty(planId !== this._initialPlanId);

            return this._getWorkItemTitle(planId)
                .then(title => { this.testPlanTitle(title); });
        }

        return null;
    }

    /// <summary>
    /// Opens work item query dialog to query for test plans
    /// </summary>
    public openQueryDialog() {
        new SelectTestPlanView().open(this.model.teamId, (ids: number[]) => {
            this.selectPlan(ids[0]);
        });
    }

    public dispose(): void {
        $.each(this._subscriptions, (index, subscription: KnockoutSubscription<any>) => {
            subscription.dispose();
        });
        this._subscriptions = null;
    }

    private _handleTestPlanTypeChange(planType: Model.TestPlanType): void {
        var initialSelection: Model.TestPlanType = this._initialPlanId === 0 ? Model.TestPlanType.default : Model.TestPlanType.custom;
        if (planType === Model.TestPlanType.default) {
            this.isDirty(initialSelection !== planType);
        }
        else {
            this.isDirty(this.model.testPlanId() !== this._initialPlanId);
        }
    }

    private _getWorkItemTitle(id: number): IPromise<string> {
        let client = WIT_WebApi.getClient();
        return client.getWorkItem(id, [DatabaseCoreFieldRefName.Title])
            .then(
                (wit: WIT_Contracts.WorkItem): IPromise<string> => {
                    return wit ? wit.fields[DatabaseCoreFieldRefName.Title] : StringUtils.empty;
                },
                (error: any): IPromise<string> => {
                    return Q.reject(error);
                }
            );
    }
}

export class TestOutcomeSettingsViewModel {
    public model: Model.ITestOutcomeSettingsModel;
    public isDirty: KnockoutObservable<boolean> = ko.observable(false);
    private _initialValue: boolean = false;
    private _subscriptions: KnockoutSubscription<any>[] = [];

    constructor(model: Model.ITestOutcomeSettingsModel) {
        this.model = model;
        this._initialValue = this.model.propagateOutcome();

        let subscription = this.model.propagateOutcome.subscribe((newValue) => {
            if (this.isDirty()) {
                if (newValue === this._initialValue) {
                    this.isDirty(false);
                }
            }
            else {
                if (newValue !== this._initialValue) {
                    this.isDirty(true);
                }
            }
        });

        this._subscriptions.push(subscription);
    }

    /// <summary>
    /// Begins fetching of all test outcome settings from the server
    /// </summary>
    public beginInitialize(): IPromise<any> {
        let setValues = (propagateOutcome: boolean) => {
            this._initialValue = propagateOutcome;
            this.model.propagateOutcome(propagateOutcome);
            return propagateOutcome;
        };

        let testSettingsStore: SettingsStore.ITestAnnotationSettingsStore = SettingsStore.getStore(this.model.teamId);

        return testSettingsStore.beginGetTestOutcomeSettings()
            .then(setValues);
    }

}

export class SelectTestPlanView {
    public static TEST_PLAN_CATEGORY = "Microsoft.TestPlanCategory";
    public static TEST_PLAN_QUERY_PERSISTENCE_ID = "44875964-77FC-4D6B-846E-4621E71DC565";

    /// <summary>
    /// Launches test plan query dialog
    /// </summary>
    public open(teamId: string, okCallback: Function): void {
        var areaPath = AreaPathHelper.getAreaPath(teamId);

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module) => {
            Dialogs.show(Module.SelectTestPlanDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                removeQueryOptions: true,
                areaPath: areaPath,
                attachResize: true,
                okCallback: okCallback,
                title: AgileControlsResources.TestAnnotation_Configuration_TestPlan_SelectTestPlanDialog.toLocaleUpperCase(),
                workItemCategories: [SelectTestPlanView.TEST_PLAN_CATEGORY],
                hideQueryType: true,
                persistenceId: SelectTestPlanView.TEST_PLAN_QUERY_PERSISTENCE_ID,
                supportWorkItemOpen: true
            });
        });
    }
}

/// <summary>
/// Utility class to fetch the area path used for querying test plans
/// </summary>
export class AreaPathHelper {

    /**
     * Fetches the area path for a team
     * @param teamId 
     */
    public static getAreaPath(teamId: string): string {
        return AreaPathHelper._isTeamValueAreaPath(teamId) ?
            AreaPathHelper._getTeamFieldValue(teamId) :
            AreaPathHelper._getProjectName(teamId);
    }

    private static _getTeamSettings(teamId: string): ITeamSettings {
        var teamAwareness: TeamAwarenessService = ProjectCollection.getConnection(tfsContext)
            .getService<TeamAwarenessService>(TeamAwarenessService);
        return teamAwareness.getTeamSettings(teamId);
    }

    private static _getProjectName(teamId: string): string {
        return tfsContext.contextData.project.name;
    }

    private static _isTeamValueAreaPath(teamId: string): boolean {
        var teamSettings = AreaPathHelper._getTeamSettings(teamId);
        return teamSettings.teamFieldName === DatabaseCoreFieldRefName.AreaPath;
    }

    private static _getTeamFieldValue(teamId: string): string {
        var teamSettings = AreaPathHelper._getTeamSettings(teamId);
        return teamSettings.teamFieldDefaultValue;
    }
}
