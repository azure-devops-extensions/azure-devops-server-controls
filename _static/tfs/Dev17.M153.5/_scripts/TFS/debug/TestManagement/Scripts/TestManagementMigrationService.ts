import { Service, TCMServiceDataMigrationStatus } from "TFS/TestManagement/Contracts";
import { TestManagementRegistrySettingsService } from "TestManagement/Scripts/TestManagementRegistrySettingsSerivce";
import * as VSS_Service from "VSS/Service";

export class TestManagementMigrationService extends VSS_Service.VssService {
    private _registrySettingsService: TestManagementRegistrySettingsService;
    public static readonly THRESHOLD_SETTINGS_KEY="/Service/TestManagement/Settings/TcmServiceTestRunIdThreshold";
    public static readonly MIGRATION_STATUS_KEY="/Service/TestManagement/TCMServiceDataMigration/MigrationStatus";
    public static readonly URI_PREFIX="tcm";
    public static readonly URI_SEPARATOR=".";
    constructor(registrySettingsService = VSS_Service.getService(TestManagementRegistrySettingsService)) {
        super();

        this._registrySettingsService = registrySettingsService;
    }

    public async isTestRunInTcm(testRunId: number): Promise<boolean> {
        return !(await this.isTestRunInTfs(testRunId));
    }

    public async getMigrationStatus(): Promise<string> {
        const registryValue = await this._registrySettingsService.getValue(TestManagementMigrationService.MIGRATION_STATUS_KEY, 
            TCMServiceDataMigrationStatus.NotStarted.toString());
        return TCMServiceDataMigrationStatus[registryValue];
    }

    public async isTestRunInTfs(testRunId: number): Promise<boolean> {
        const isMigrationComplete = (await this.getMigrationStatus()) === TCMServiceDataMigrationStatus[TCMServiceDataMigrationStatus.Completed];
        if (isMigrationComplete) {
            return false;
        }
        const threshold = Number(await this._registrySettingsService.getValue(TestManagementMigrationService.THRESHOLD_SETTINGS_KEY, 
            Number.MAX_SAFE_INTEGER.toString()));
        if (threshold === Number.MAX_SAFE_INTEGER) {
            return true;
        }
        return (testRunId < threshold) || 
            (testRunId % 2 !== 0);
    }

    public async encodeTestCaseRefId(testRunId: number, testCaseRefId: number): Promise<string> {
        return (await this.isTestRunInTcm(testRunId)) ? 
            this.getEncodedRefId(Service.Tcm, testCaseRefId) : 
            this.getEncodedRefId(Service.Tfs, testCaseRefId)
    }

    public getEncodedRefId(service: Service, testCaseRefId: number): string {
        return service === Service.Tcm ? 
            (TestManagementMigrationService.URI_PREFIX + TestManagementMigrationService.URI_SEPARATOR + testCaseRefId.toString()) :
            testCaseRefId.toString();
    }

    public decodeTestCaseRefId(testCaseRefId: string) {
        if (testCaseRefId.indexOf(TestManagementMigrationService.URI_PREFIX + TestManagementMigrationService.URI_SEPARATOR) === 0) {
            return { service: Service.Tcm, id: Number(testCaseRefId.split(TestManagementMigrationService.URI_SEPARATOR)[1]) };
        } else {
            return { service: Service.Tfs, id: Number(testCaseRefId) };
        }
    }
}
