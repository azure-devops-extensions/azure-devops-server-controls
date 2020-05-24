import { PerfScenarios } from "Feed/Common/Constants/Constants";

export const MavenKey = "maven";
export const MavenKeyCapitalized = "Maven";

export class MavenPerfScenarios extends PerfScenarios {
    public static DeletePackage = "Packaging.Package.Maven.DeletePackage";
    public static RecycleBinRestorePackage = "Packaging.Package.Maven.RecycleBinRestorePackage";
    public static RecycleBinPermanentDeletePackage = "Packaging.Package.Maven.RecycleBinPermanentDeletePackage";
}

export class MavenCiConstants {
    public static BuildLinkClicked = "BuildLinkClicked";
    public static CodeLinkClicked = "CodeLinkClicked";
    public static IssueLinkClicked = "IssueLinkClicked";
    public static LicenseLinkClicked = "LicenseLinkClicked";
    public static MavenDevelopment = "MavenDevelopment";
    public static OrganizationLinkClicked = "OrganizationLinkClicked";
    public static ProtocolName = "Maven";
    public static MavenConnectToFeedPanel = "MavenConnectToFeedPanel";
    public static DeletePackage = "Delete";
    public static RecycleBinRestorePackage = "RecycleBinRestorePackage";
    public static RecycleBinPermanentDeletePackage = "RecycleBinPermanentDeletePackage";
}

export class MavenExternalLinks {
    public static SettingsServerReference = "https://go.microsoft.com/fwlink/?linkid=856090";
    public static PomRepositoriesReference = "https://go.microsoft.com/fwlink/?linkid=856091";
    public static DeployPluginReference = "https://go.microsoft.com/fwlink/?linkid=856092";
}

export class GradleCiConstants {
    public static ClientTool = "Gradle";
    public static GradleConnectToFeedPanel = "GradleConnectToFeedPanel";
}

export class GradleExternalLinks {
    public static GradlePropertiesReference = "https://go.microsoft.com/fwlink/?linkid=857048";
    public static BuildGradleReference = "https://go.microsoft.com/fwlink/?linkid=857049";
    public static GradleDepdendenciesReference = "https://go.microsoft.com/fwlink/?linkid=857230";
    public static GradlePublishReference = "https://go.microsoft.com/fwlink/?linkid=857051";
}
