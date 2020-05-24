///<summary>The core Charting namespace covers primitive contracts for interactions of higher level charting components.</summary >
/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");


var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();


export class ChartProviders {
    //A common definition for features to reference their server side implementation
    public static witQueries: string = "WorkitemTracking.Queries";
    public static testReports: string = "TestManagement.Reports";
    public static testAuthoringMetadata: string = "TestManagement.AuthoringMetadata";
    public static testRunSummary: string = "TestManagement.RunSummary";
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Charting", exports);
