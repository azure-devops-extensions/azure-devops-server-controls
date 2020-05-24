import VSS = require("VSS/VSS");
import Telemetry = require("VSS/Telemetry/Services");

export module linkClickHandlerFactory {

    /** So that the actual redirection can be mocked out. 
    * @param href The location to redirect to.
    */
    export function setWindowHref(href: string)
    {
        window.location.href = href;
    }

    /** Creates a function that can be attached to event listeners, generating
    * an AI logEvent containing the closed over arguments when it is called.
    * Assumes to be used as an anchor tag onclick handler. (relies on this having an href)
    * Also tries to assumes on the nature of <a> target; if this window delay, otherwise don't.
    * @param name The name of the event in / deliniated path for AI
    * @param properties The dictionary of properties to log in AI
    * @param metrics The dictionary of metrics to log in AI
    */
    export function create(area: string, feature: string, properties: { [x:string]:any })
    {
        return function(event: any)
        {
            // We assume that this is an anchor tab.
            properties["originalHref"] = $(this).attr("data-original-href");
			properties["sourceUrl"] = window.location.href;

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(area, feature, properties));

            // If the target is defined; we do not deferr, scenarios
            // such as _blank are outliers, and given that we are targeting
            // the current frame, we don't handle this scenario.
            if ($(this).attr("target"))
            {
                return true;                
            }

            // Otherwise, delay processing the click
            // so it can run without being cut off.
            let closedHref = $(this).attr("href");

            setTimeout(
                function() 
                { 
                    linkClickHandlerFactory.setWindowHref(closedHref);
                }, 
                300);

            return false;
        };
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.Telemetry", exports);
