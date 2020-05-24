/// <reference types="jquery" />



import ko = require("knockout");

import { handleError } from "Build/Scripts/PlatformMessageHandlers";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Marked = require("Presentation/Scripts/marked");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { getPageContext } from "VSS/Context";

KnockoutCommon.initKnockoutHandlers(true);

export class AdminPoolSettingsTab extends Navigation.NavigationViewTab {
    // this tab uses knockout
    private _template: JQuery = null;
    private _viewModel: AdminPoolSettingsViewModel;
    private _currentPoolId: number = -1;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;

    public initialize() {
        super.initialize();
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, TfsContext.getDefault().contextData);
    }

    public dispose() {
        super.dispose();
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        let title: string = "";

        if (!this._template) {
            var tfsContext = TfsContext.getDefault();
            this._viewModel = new AdminPoolSettingsViewModel(tfsContext);
            this._template = TFS_Knockout.loadHtmlTemplate("buildvnext_admin_pool_settings_tab").appendTo(this._element);
            ko.applyBindings(this._viewModel, this._template[0]);
        }

        if (parsedState.pool) {
            this._viewModel.poolId(parsedState.poolId);
            title = Utils_String.format(BuildResources.PoolAgentsTitleFormat, parsedState.pool.name);
        }

        this._options.navigationView.setViewTitle(title);
    }
}

class AdminPoolSettingsViewModel {
    private _pool: DistributedTask.TaskAgentPool;
    private _poolClient: DistributedTaskApi.TaskAgentHttpClient;
    private _maintenanceDefinition: DistributedTask.TaskAgentPoolMaintenanceDefinition;

    public poolId: KnockoutObservable<number> = ko.observable(0);
    public maintenanceDefinitionViewModel: AdminPoolMaintenanceDefinitionViewModel;
    public settingsDirty: KnockoutComputed<boolean>;

    constructor(tfsContext: TfsContext) {
        this._poolClient = Service.getApplicationClient(DistributedTaskApi.TaskAgentHttpClient, tfsContext.contextData);
        this.maintenanceDefinitionViewModel = new AdminPoolMaintenanceDefinitionViewModel(null);
        this.settingsDirty = ko.computed({
            read: () => {
                return this._isDirty();
            },
            write: (value: boolean) => {
                return value;
            }
        });

        // React to changes in poolId
        this.poolId.subscribe((currentPoolId: number) => {
            if (!!currentPoolId && currentPoolId > 0) {
                this._poolClient.getAgentPoolMaintenanceDefinitions(currentPoolId)
                    .then((definitions: DistributedTask.TaskAgentPoolMaintenanceDefinition[]) => {
                        if (definitions && definitions.length > 0) {
                            this._maintenanceDefinition = definitions[0];
                        }
                        else {
                            this._maintenanceDefinition = null;
                        }

                        this._update(this._maintenanceDefinition);
                    }, (error) => {
                        if (error.status !== 404) {
                            handleError(error);
                        }
                    });
            }
        });

        this.settingsDirty(false);
    }

    private _getValue(): DistributedTask.TaskAgentPoolMaintenanceDefinition {
        return this.maintenanceDefinitionViewModel.getValue();
    }

    private _isDirty(): boolean {
        return this.maintenanceDefinitionViewModel._isDirty();
    }

    private _update(newDefinition: DistributedTask.TaskAgentPoolMaintenanceDefinition) {
        if (!newDefinition) {
            newDefinition = {
                id: 0,
                enabled: false,
                jobTimeoutInMinutes: 60,
                maxConcurrentAgentsPercentage: 25,
                pool: null,
                options: {
                    workingDirectoryExpirationInDays: 30,
                } as DistributedTask.TaskAgentPoolMaintenanceOptions,
                retentionPolicy: {
                    numberOfHistoryRecordsToKeep: 10
                } as DistributedTask.TaskAgentPoolMaintenanceRetentionPolicy,
                scheduleSetting: {
                    scheduleJobId: Utils_String.generateUID(),
                    startHours: 0,
                    startMinutes: 0,
                    timeZoneId: getPageContext().globalization.timeZoneId,
                    daysToBuild: DistributedTask.TaskAgentPoolMaintenanceScheduleDays.None,
                } as DistributedTask.TaskAgentPoolMaintenanceSchedule,
            } as DistributedTask.TaskAgentPoolMaintenanceDefinition
        }

        this._maintenanceDefinition = newDefinition;
        this.maintenanceDefinitionViewModel.update(this._maintenanceDefinition);
    }

    public isInvalid(): boolean {
        return this.maintenanceDefinitionViewModel._isInvalid();
    }

    public saveSettings() {
        this._maintenanceDefinition = this._getValue();
        if (this._maintenanceDefinition.id == 0) {
            this._poolClient.createAgentPoolMaintenanceDefinition(this._maintenanceDefinition, this.poolId())
                .then((definition: DistributedTask.TaskAgentPoolMaintenanceDefinition) => {
                    this._update(definition);
                    this.settingsDirty.notifySubscribers(false);
                }, (error) => {
                    alert(error.message || error);
                });
        } else {
            this._poolClient.updateAgentPoolMaintenanceDefinition(this._maintenanceDefinition, this.poolId(), this._maintenanceDefinition.id)
                .then((definition: DistributedTask.TaskAgentPoolMaintenanceDefinition) => {
                    this._update(definition);
                    this.settingsDirty.notifySubscribers(false);
                }, (error) => {
                    alert(error.message || error);
                });
        }
    }

    public undoSettings() {
        this._update(this._maintenanceDefinition);
    }
}

class AdminPoolMaintenanceDefinitionViewModel extends TaskModels.ChangeTrackerModel {
    private _definition: DistributedTask.TaskAgentPoolMaintenanceDefinition;
    private _scheduleJobId: string;

    public enable: KnockoutObservable<boolean>;
    public timeout: KnockoutObservable<string>;
    public agentConcurrentPercentage: KnockoutObservable<string>;
    public jobRecordsToKeep: KnockoutObservable<string>;
    public deleteStaleDefaultWorkingDirectory: KnockoutObservable<boolean>;
    public staleDefaultWorkingDirectoryDays: KnockoutObservable<string>;
    public concurrentPercentageHelpMarkDown: string = Marked(BuildResources.MaxAgentConcurrentPercentageHelpMarkDown);

    public hoursOptions: string[];
    public displayTimeHours: KnockoutObservable<number>;

    public displayTimeMinutes: KnockoutObservable<number>;
    public minutesOptions: string[];

    public timeZones: KnockoutObservableArray<any>;
    public timeZoneId: KnockoutObservable<string>;

    public days: KnockoutObservable<ScheduleDaysViewModel>;

    constructor(definition: DistributedTask.TaskAgentPoolMaintenanceDefinition) {
        super();

        // get timezones from json island
        var allTimeZones, json;
        var timeZones;
        allTimeZones = $("script.valid-time-zones");
        if (allTimeZones.length > 0) {
            json = allTimeZones.eq(0).html();

            if (json) {
                // setting the account time zone from the server
                timeZones = (Utils_Core.parseMSJSON(json, false)).validTimeZones;
            }
        }

        this.timeZones(timeZones);

        // React to changes in deleteStaleDefaultWorkingDirectory
        this.deleteStaleDefaultWorkingDirectory.subscribe((deleteStaleDirectory: boolean) => {
            if (!deleteStaleDirectory) {
                this.staleDefaultWorkingDirectoryDays("0");
            } else if (this._definition && this._definition.options && this._definition.options.workingDirectoryExpirationInDays === 0) {
                this.staleDefaultWorkingDirectoryDays("30");
            } else if (this._definition && this._definition.options && this._definition.options.workingDirectoryExpirationInDays > 0) {
                this.staleDefaultWorkingDirectoryDays(this._definition.options.workingDirectoryExpirationInDays.toString());
            }
        });

        this.update(definition);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.enable = ko.observable(false);
        this.timeout = ko.observable("");
        this.agentConcurrentPercentage = ko.observable("");
        this.jobRecordsToKeep = ko.observable("");
        this.deleteStaleDefaultWorkingDirectory = ko.observable(false);
        this.staleDefaultWorkingDirectoryDays = ko.observable("");

        // populate hours and minutes options for time
        this.hoursOptions = [];
        for (var i = 0; i < 24; i++) {
            if (i < 10) {
                this.hoursOptions.push("0" + i.toString());
            }
            else {
                this.hoursOptions.push(i.toString());
            }
        }
        this.minutesOptions = [];
        for (var i = 0; i < 60; i++) {
            if (i < 10) {
                this.minutesOptions.push("0" + i.toString());
            }
            else {
                this.minutesOptions.push(i.toString());
            }
        }

        this.days = ko.observable(new ScheduleDaysViewModel(DistributedTask.TaskAgentPoolMaintenanceScheduleDays.None));
        this.displayTimeHours = ko.observable(0);
        this.displayTimeMinutes = ko.observable(0);
        this.timeZones = ko.observableArray([]);
        this.timeZoneId = ko.observable(getPageContext().globalization.timeZoneId);
    }

    _isDirty(): boolean {
        let definition = this._definition || {} as DistributedTask.TaskAgentPoolMaintenanceDefinition;
        let value = this.getValue();

        if (value.enabled == definition.enabled && value.enabled == false) {
            return false;
        }

        return value.enabled != definition.enabled ||
            value.jobTimeoutInMinutes != definition.jobTimeoutInMinutes ||
            value.maxConcurrentAgentsPercentage != definition.maxConcurrentAgentsPercentage ||
            value.retentionPolicy.numberOfHistoryRecordsToKeep != definition.retentionPolicy.numberOfHistoryRecordsToKeep ||
            value.options.workingDirectoryExpirationInDays != definition.options.workingDirectoryExpirationInDays ||
            value.scheduleSetting.startHours != definition.scheduleSetting.startHours ||
            value.scheduleSetting.startMinutes != definition.scheduleSetting.startMinutes ||
            value.scheduleSetting.timeZoneId != definition.scheduleSetting.timeZoneId ||
            this.days()._isDirty();
    }

    _isInvalid(): boolean {
        return this.timeoutInvalid() || this.agentConcurrentPercentageInvalid() || this.staleDefaultWorkingDirectoryDaysInvalid() || this.jobRecordsToKeepInvalid();
    }

    public update(newDefinition: DistributedTask.TaskAgentPoolMaintenanceDefinition) {
        if (!newDefinition) {
            return;
        }

        this._definition = newDefinition;
        this.enable(newDefinition.enabled);
        this.timeout(newDefinition.jobTimeoutInMinutes.toString());
        this.agentConcurrentPercentage(newDefinition.maxConcurrentAgentsPercentage.toString());
        this.jobRecordsToKeep(newDefinition.retentionPolicy.numberOfHistoryRecordsToKeep.toString());
        this.deleteStaleDefaultWorkingDirectory(newDefinition.options.workingDirectoryExpirationInDays > 0);
        this.staleDefaultWorkingDirectoryDays(newDefinition.options.workingDirectoryExpirationInDays.toString());
        this._scheduleJobId = newDefinition.scheduleSetting.scheduleJobId;
        this.displayTimeHours(newDefinition.scheduleSetting.startHours);
        this.displayTimeMinutes(newDefinition.scheduleSetting.startMinutes);
        this.timeZoneId(newDefinition.scheduleSetting.timeZoneId);
        this.days(new ScheduleDaysViewModel(newDefinition.scheduleSetting.daysToBuild || DistributedTask.TaskAgentPoolMaintenanceScheduleDays.None))

        // These observables are bound to inputs, when the user saves, we would need dirty to be evaluated, infact, dirty should be called everytime this method is called
        //  so force an update, so that subscribers get triggered though the value of observables remain the same (when we save)
        this.enable.valueHasMutated();
    }

    /**
     * Extracts the data contract from the viewmodel
     */
    public getValue(): DistributedTask.TaskAgentPoolMaintenanceDefinition {
        let maintenanceOptions: DistributedTask.TaskAgentPoolMaintenanceOptions = {
            workingDirectoryExpirationInDays: this.deleteStaleDefaultWorkingDirectory() ? Utils_Number.parseInvariant(this.staleDefaultWorkingDirectoryDays()) : 0,
        };

        let maintenanceSchedule: DistributedTask.TaskAgentPoolMaintenanceSchedule = {
            scheduleJobId: this._scheduleJobId ? this._scheduleJobId : Utils_String.generateUID(),
            daysToBuild: this.days().getValue() || DistributedTask.TaskAgentPoolMaintenanceScheduleDays.None,
            startHours: this.displayTimeHours(),
            startMinutes: this.displayTimeMinutes(),
            timeZoneId: this.timeZoneId(),
        };

        let maintenanceRetention: DistributedTask.TaskAgentPoolMaintenanceRetentionPolicy = {
            numberOfHistoryRecordsToKeep: Utils_Number.parseInvariant(this.jobRecordsToKeep()),
        };

        let maintenanceDefinition: DistributedTask.TaskAgentPoolMaintenanceDefinition = {
            id: this._definition ? this._definition.id : 0,
            pool: null,
            enabled: this.enable(),
            jobTimeoutInMinutes: Utils_Number.parseInvariant(this.timeout()),
            maxConcurrentAgentsPercentage: Utils_Number.parseInvariant(this.agentConcurrentPercentage()),
            options: maintenanceOptions,
            scheduleSetting: maintenanceSchedule,
            retentionPolicy: maintenanceRetention,
        };

        return maintenanceDefinition;
    }

    public timeoutInvalid(): boolean {
        if (!this.enable()) {
            return false;
        }

        let jobTimeout = Utils_Number.parseInvariant(this.timeout());
        return !(Utils_Number.isPositiveNumber(jobTimeout) || jobTimeout === 0);
    }

    public agentConcurrentPercentageInvalid(): boolean {
        if (!this.enable()) {
            return false;
        }

        let percentage = Utils_Number.parseInvariant(this.agentConcurrentPercentage());
        return !(Utils_Number.isPositiveNumber(percentage) && percentage <= 100);
    }

    public staleDefaultWorkingDirectoryDaysInvalid(): boolean {
        if (!this.deleteStaleDefaultWorkingDirectory()) {
            return false;
        }

        let staleDays: number = Utils_Number.parseInvariant(this.staleDefaultWorkingDirectoryDays());
        return !(Utils_Number.isPositiveNumber(staleDays) && staleDays <= 365);
    }

    public jobRecordsToKeepInvalid(): boolean {
        if (!this.enable()) {
            return false;
        }

        let records = Utils_Number.parseInvariant(this.jobRecordsToKeep());
        return !(Utils_Number.isPositiveNumber(records) && records <= 100);
    }
}

export class ScheduleDaysViewModel {
    /**
     * Original value.
     */
    private _days: DistributedTask.TaskAgentPoolMaintenanceScheduleDays;

    public monday: KnockoutObservable<boolean> = ko.observable(false);
    public tuesday: KnockoutObservable<boolean> = ko.observable(false);
    public wednesday: KnockoutObservable<boolean> = ko.observable(false);
    public thursday: KnockoutObservable<boolean> = ko.observable(false);
    public friday: KnockoutObservable<boolean> = ko.observable(false);
    public saturday: KnockoutObservable<boolean> = ko.observable(false);
    public sunday: KnockoutObservable<boolean> = ko.observable(false);

    constructor(days: DistributedTask.TaskAgentPoolMaintenanceScheduleDays) {
        this._days = this._convertDaysEnumToNumber(days);
        this._update(this._days);
    }

    _isDirty(): boolean {
        if (this._days == null) {
            return false;
        }

        // compare current value to original value
        return !this.equals(this._days);
    }

    /**
     * Gets the underlying value of the model.
     */
    public getValue(): DistributedTask.TaskAgentPoolMaintenanceScheduleDays {
        var rtn = DistributedTask.TaskAgentPoolMaintenanceScheduleDays.None;

        if (this.monday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Monday;
        }
        if (this.tuesday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Tuesday;
        }
        if (this.wednesday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Wednesday;
        }
        if (this.thursday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Thursday;
        }
        if (this.friday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Friday;
        }
        if (this.saturday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Saturday;
        }
        if (this.sunday()) {
            rtn |= DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Sunday;
        }

        return rtn;
    }

    /**
     * Determines whether the specified value equals to current filter.
     */
    public equals(days: DistributedTask.TaskAgentPoolMaintenanceScheduleDays): boolean {
        return this._convertDaysEnumToNumber(this.getValue()) == this._convertDaysEnumToNumber(days);
    }

    public _update(days: DistributedTask.TaskAgentPoolMaintenanceScheduleDays) {
        this._days = this._convertDaysEnumToNumber(days);

        this.monday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Monday));
        this.tuesday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Tuesday));
        this.wednesday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Wednesday));
        this.thursday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Thursday));
        this.friday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Friday));
        this.saturday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Saturday));
        this.sunday(!!(this._days & DistributedTask.TaskAgentPoolMaintenanceScheduleDays.Sunday));
    }

    // handles a single day being scheduled, in which case the enum is passed from the server as a string
    private _convertDaysEnumToNumber(days: DistributedTask.TaskAgentPoolMaintenanceScheduleDays): number {
        if (!days) {
            return days;
        }

        switch (days.toString().toLowerCase()) {
            case "none":
                return 0;
            case "monday":
                return 1;
            case "tuesday":
                return 2;
            case "wednesday":
                return 4;
            case "thursday":
                return 8;
            case "friday":
                return 16;
            case "saturday":
                return 32;
            case "sunday":
                return 64;
            case "all":
                return 127;
            default:
                return days;
        }
    }
}
