import { PerfScenarios } from "Feed/Common/Constants/Constants";

export const NuGetKey = "nuget";
export const NuGetKeyCapitalized = "NuGet";

/**
 * Perfomance scenario constants.
 */
export class NuGetPerfScenarios extends PerfScenarios {
    public static DeletePackage = "Packaging.Package.NuGet.RemovePackage";
    public static RelistPackage = "Packaging.Package.NuGet.RelistPackage";
    public static UnlistPackage = "Packaging.Package.NuGet.UnlistPackage";
}

export class NuGetCiConstants {
    public static DeletePackage = "NuGetDeletePackage";
    public static DownloadCredentialBundleClicked = "NuGetDownloadCredentialBundleClicked";
    public static LicenseLinkClicked = "NuGetLicenseLinkClicked";
    public static NuGetConnectToFeedPanel = "NuGetConnectToFeedPanel";
    public static ProjectLinkClicked = "NuGetProjectLinkClicked";
    public static ProtocolName = "NuGet";
    public static RelistPackage = "NuGetRelistPackage";
    public static UnlistPackage = "NuGetUnlistPackage";
}

export class IndexIds {
    public static NuGetV3IndexId = "9D3A4E8E-2F8F-4AE1-ABC2-B461A51CB3B3";
    public static NuGetV2IndexId = "5D6FC3B3-EF78-4342-9B6E-B3799C866CFA";
}
