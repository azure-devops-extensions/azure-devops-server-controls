/// <reference types="jquery" />

import SettingsStore = require("Agile/Scripts/Card/CardCustomizationTestsStore");
import ko = require("knockout");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

/// <summary>
/// Enum for selected test plan option - user specified or default
/// </summary>
export enum TestPlanType {
    default,
    custom,
    none
}

export interface ITestPlanSettingsModel {
    teamId: string;
    testPlanType: KnockoutObservable<TestPlanType>;
    testPlanId: KnockoutObservable<number>;
    beginSave: () => IPromise<any>
}

/// <summary>
/// Model for test annotation plan settings for kanban board
/// </summary>
export class TestPlanSettingsModel implements ITestPlanSettingsModel {
    public testPlanType: KnockoutObservable<TestPlanType> = ko.observable(TestPlanType.none);
    public testPlanId: KnockoutObservable<number> = ko.observable(0);

    constructor(public teamId: string) { }

    /// <summary>
    /// Saves the selected test plan settings in the registry for the team
    /// </summary>
    public beginSave(): IPromise<any> {
        const newPlan = this.testPlanType() == TestPlanType.custom ? this.testPlanId() : 0;
        const testSettingsStore: SettingsStore.ITestAnnotationSettingsStore = SettingsStore.getStore(this.teamId);
        return testSettingsStore.beginSetTestPlanId(newPlan);
    }
}

/// <summary>
/// Model for test outcome settings for kanban board
/// </summary>
export interface ITestOutcomeSettingsModel {
    teamId: string;
    propagateOutcome: KnockoutObservable<boolean>;
    beginSave: () => IPromise<any>;
}

export class TestOutcomeSettingsModel implements ITestOutcomeSettingsModel {
    public propagateOutcome: KnockoutObservable<boolean> = ko.observable(false);

    constructor(public teamId: string) { }

    public beginSave(): IPromise<any> {
        const testSettingsStore: SettingsStore.ITestAnnotationSettingsStore = SettingsStore.getStore(this.teamId);
        return testSettingsStore.beginSetTestOutcomeSettings(this.propagateOutcome());
    }
}
