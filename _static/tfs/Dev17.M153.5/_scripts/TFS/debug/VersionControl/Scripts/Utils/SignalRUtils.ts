import * as Q from "q";
import * as Diag from "VSS/Diag";
import * as VSS from "VSS/VSS";
import * as StringUtils from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export function loadSignalR(signalrHubUrl: string): IPromise<void> {

    const tfsContext = TfsContext.getDefault();
    // Get SignalR scripts from the 3rd party scripts path
    const thirdPartyUrl = tfsContext.configuration.get3rdPartyStaticRootPath();
    const minified = !Diag.getDebugMode() ? "min." : "";
    const signalRScript = StringUtils.format("{0}_scripts/jquery.signalR-vss.2.2.0.{1}js", thirdPartyUrl, minified);

    const deferred = Q.defer<void>();

    VSS.requireModules([signalRScript]).then(
        () => {
            VSS.requireModules([signalrHubUrl]).then(
                () => {
                    deferred.resolve(null);
                },
                (error: Error) => {
                    deferred.reject(error);
                });
        }, (error: Error) => {
            deferred.reject(error);
        }
    );

    return deferred.promise;

}