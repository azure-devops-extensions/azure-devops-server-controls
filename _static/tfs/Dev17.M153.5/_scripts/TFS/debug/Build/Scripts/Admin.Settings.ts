/// <reference types="jquery" />

import ko = require("knockout");

import RetentionRule = require("Build/Scripts/RetentionRuleViewModel");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildCommon = require("TFS/Build/Contracts");

import Service = require("VSS/Service");
import Utils_Number = require("VSS/Utils/Number");

export class AdminSettingsViewModel {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _settings: BuildCommon.BuildSettings;
    private _buildClient: BuildClient.BuildClientService;

    public isHosted: KnockoutObservable<boolean> = ko.observable(true);
    public defaultRetentionPolicyVM: RetentionRule.RetentionRuleViewModel;
    public maximumRetentionPolicyVM: RetentionRule.RetentionRuleViewModel;
    public daysToKeepBeforeDestroy: KnockoutObservable<number> = ko.observable(30);

    // To toggle "save"/"undo" buttons
    public settingsDirty: KnockoutComputed<boolean>;
    public defaultDaysToKeepTooHigh: KnockoutComputed<boolean>;
    public defaultMinimumToKeepTooHigh: KnockoutComputed<boolean>;
    public daysToKeepBeforeDestroyInvalid: KnockoutComputed<boolean>;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, settings: BuildCommon.BuildSettings) {
        this._tfsContext = tfsContext;
        this.isHosted(tfsContext.isHosted);
        this._settings = settings;
        
        // grab build settings object and pass to VM
        var tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        this._buildClient = tfsConnection.getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);
        
        this.defaultRetentionPolicyVM = new RetentionRule.RetentionRuleViewModel(this._settings.defaultRetentionPolicy, ko.observable(true), null);
        this.maximumRetentionPolicyVM = new RetentionRule.RetentionRuleViewModel(this._settings.maximumRetentionPolicy, ko.observable(true), null);
        this.daysToKeepBeforeDestroy(this._settings.daysToKeepDeletedBuildsBeforeDestroy);

        this.settingsDirty = ko.computed({
                read: () => {
                    return this._isDirty();
                },
                write: (value: boolean) => {
                    return value;
                }
        });

        this.defaultDaysToKeepTooHigh = ko.computed({
            read: () => {
                return this.maximumRetentionPolicyVM.daysToKeep() < this.defaultRetentionPolicyVM.daysToKeep();
            }
        });        

        this.defaultMinimumToKeepTooHigh = ko.computed({
            read: () => {
                return this.maximumRetentionPolicyVM.minimumToKeep() < this.defaultRetentionPolicyVM.minimumToKeep();
            }
        }); 

        this.daysToKeepBeforeDestroyInvalid = ko.computed({
            read: () => {
                var num: number = Utils_Number.parseInvariant(this.daysToKeepBeforeDestroy().toString());
                return !(Utils_Number.isPositiveNumber(num) || num === 0);
            }
        });

        this.settingsDirty(false);
    }

    public getValue(): BuildCommon.BuildSettings {
        return {
            defaultRetentionPolicy: this.defaultRetentionPolicyVM.getValue(),
            maximumRetentionPolicy: this.maximumRetentionPolicyVM.getValue(),
            daysToKeepDeletedBuildsBeforeDestroy: this.daysToKeepBeforeDestroy()
        };
    }

    public _isDirty(): boolean {
        return this.defaultRetentionPolicyVM._isDirty() ||
            this.maximumRetentionPolicyVM._isDirty() ||
            this.daysToKeepBeforeDestroy() != this._settings.daysToKeepDeletedBuildsBeforeDestroy;
    }

    public _isInvalid(): boolean {
        var daysBeforeDestroy = this.daysToKeepBeforeDestroy();

        return this.defaultDaysToKeepTooHigh() ||
            this.defaultMinimumToKeepTooHigh() ||
            this.defaultRetentionPolicyVM._isInvalid() ||
            this.maximumRetentionPolicyVM._isInvalid() ||
            this.daysToKeepBeforeDestroyInvalid();
    }

    public isSaveEnabled(): boolean {
        return this.settingsDirty() && !this._isInvalid();
    }

    public update(newSettings: BuildCommon.BuildSettings) {
        this._settings = newSettings;
        this.defaultRetentionPolicyVM._update(this._settings.defaultRetentionPolicy);
        this.maximumRetentionPolicyVM._update(this._settings.maximumRetentionPolicy);
        this.daysToKeepBeforeDestroy(this._settings.daysToKeepDeletedBuildsBeforeDestroy);
    }

    public saveSettings() {
        var newSettings = this.getValue();
        this._buildClient.beginUpdateBuildSettings(newSettings).then(
            (settings: BuildCommon.BuildSettings) => {
                this.update(settings);
                this.settingsDirty(false);
            }, (error) => {
                alert(error.message || error);
            });
    }

    public undoSettings() {
        this.update(this._settings);
        this.settingsDirty(false);
    }
} 
