import { PerfScenarios } from "Feed/Common/Constants/Constants";

export const NpmKey = "npm";

/**
 * Perfomance scenario constants.
 */
export class NpmPerfScenarios extends PerfScenarios {
    public static DeprecatePackage = "Packaging.Package.Npm.DeprecatePackage";
    public static UnpublishPackage = "Packaging.Package.Npm.UnpublishPackage";
}

export class NpmCiConstants {
    public static BugEmailLinkClicked = "NpmBugEmailLinkClicked";
    public static BugUrlLinkClicked = "NpmBugUrlLinkClicked";
    public static CopyCommandInstallAuth = "NpmInstallAuth";
    public static CopyCommandRunAuth = "NpmRunAuth";
    public static DeprecatePackage = "NpmDeprecatePackage";
    public static HomepageLinkClicked = "NpmHomepageLinkClicked";
    public static NpmConnectToFeedPanel = "NpmConnectToFeedPanel";
    public static PersonEmailLinkClicked = "NpmPersonEmailLinkClicked";
    public static PersonUrlLinkClicked = "NpmPersonUrlLinkClicked";
    public static ProtocolName = NpmKey;
    public static RepositoryLinkClicked = "NpmRepositoryLinkClicked";
    public static UnpublishPackage = "NpmUnpublishPackage";
}

export class IndexIds {
    public static NpmRegistryIndexId = "D9B75B07-F1D9-4A67-AAA6-A4D9E66B3352";
    public static NpmAreaIndexId = "43F92FEE-B5CA-4A20-90C5-C4E041A0494A";
}

export class FeatureFlags {
    public static ReadmeUI = "ReadmeUI";
}
