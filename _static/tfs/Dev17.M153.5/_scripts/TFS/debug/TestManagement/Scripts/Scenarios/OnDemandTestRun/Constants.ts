export class SupportedVSTestTask {
    static readonly id = "EF087383-EE5E-42C7-9A53-AB56C98420F9";
    static readonly version = 2;
    static readonly testRunInput = "tcmTestRun";
    static readonly inputs: {[key: string]: string } = { "testSelector": "testRun" };
}

export class TestPlanSettingsTabKeyConstants {
    public static RunSettings: string = "Tab_RunSettings";
    public static OutcomeSettings: string = "Tab_OutcomeSettings";
}

export class HelpUrls {
    static readonly learnMoreUrl = "https://go.microsoft.com/fwlink/?linkid=849494";
}

export const OnDemandReleaseDefinitionTemplateId = "d71806bb-e40f-4b12-87da-ad76f3edea34";

export const testRunIdEnvVariable = "test.RunId";

export class SecurityNamespaceIds {
    static readonly ReleaseManagement = "c788c23e-1b46-4162-8f5e-d7585343b5de";
}

export enum ReleaseManagementSecurityPermissions {
    None = 0,
    ViewReleaseDefinition = 1,
    EditReleaseDefinition = 2,
    DeleteReleaseDefinition = 4,
    ManageReleaseApprovers = 8,
    ManageReleases = 16,
    ViewReleases = 32,
    QueueReleases = 64,
    EditReleaseEnvironment = 128,
    DeleteReleaseEnvironment = 256,
    AdministerReleasePermissions = 512,
    DeleteReleases = 1024,
    ManageDeployments = 2048
}
