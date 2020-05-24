import { DirectoryPivotType, FilterConstants } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { format, empty } from "VSS/Utils/String";
import { getService } from "VSS/Service";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { IUserOptions } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { publishErrorToTelemetry } from "VSS/Error";
import { VssService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";

export class TestPlansHubSettingsService extends VssService {
    public static readonly defaultUserOptions: IUserOptions = {
        myPlansFilterState: empty,
        allPlansFilterState: empty,
        selectedPivot: DirectoryPivotType.mine
    };

    public static readonly selectedPivotSettingKey = "TestPlanHub/Navigation/SelectedPivot";

    private _userOptions: IUserOptions;
    private readonly _providerId = "ms.vss-test-web.testplan-hub-user-options-data-provider";
    private readonly _projectScopeKey = "project";
    private readonly _hubName = "Test Plans";

    public get userOptions(): IUserOptions {
        return this._userOptions;
    }

    constructor() {
        super();

        this._userOptions = getService(WebPageDataService).getPageData<IUserOptions>(this._providerId) ||
            TestPlansHubSettingsService.defaultUserOptions;
    }

    public setMostRecentPivot(pivot: DirectoryPivotType): IPromise<void> {
        return getSettingsService()
            .setEntries({
                [TestPlansHubSettingsService.selectedPivotSettingKey]: pivot
            }, SettingsUserScope.Me, this._projectScopeKey, this.getWebContext().project.id)
            .then(() => {
                this._userOptions.selectedPivot = pivot;
            }, (reason: any) => {
                publishErrorToTelemetry(new Error(`Could not store pivot settings for Test Plans Hub: ${reason}`));
            });
    }

    public setFilterState(pivot: DirectoryPivotType, filterState: string): IPromise<void> {
        const settingKey = format(FilterConstants.FilterRegistryKeyFormat, this._hubName, pivot);
        return getSettingsService()
            .setEntries({
                [settingKey]: filterState
            }, SettingsUserScope.Me, this._projectScopeKey, this.getWebContext().project.id)
            .then(() => {
                if (pivot === DirectoryPivotType.all) {
                    this._userOptions.allPlansFilterState = filterState;
                } else {
                    this._userOptions.myPlansFilterState = filterState;
                }
            }, (reason: any) => {
                publishErrorToTelemetry(new Error(`Could not store pivot settings for Test Plans Hub: ${reason}`));
            });
    }
}