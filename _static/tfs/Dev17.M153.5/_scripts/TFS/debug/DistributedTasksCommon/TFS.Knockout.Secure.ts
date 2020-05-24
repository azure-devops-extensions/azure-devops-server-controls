import ko = require("knockout");
import ksb = require("knockoutSecureBinding");

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

var FeatureFlag = "Webaccess.DistributedTask.KSB";
var __initialized: boolean = false;

export function registerSecureBinding() {
    if (__initialized) {
        return;
    }

    if (!FeatureAvailabilityService.isFeatureEnabled(FeatureFlag, false)) {
        console.log(`Please enable FF ${FeatureFlag} to register knockout secure binding.`);
        return;
    }

    //see https://github.com/brianmhunt/knockout-secure-binding
    const options = {
        attribute: "data-bind",        // default "data-sbind"
        globals: window,               // default {}
        bindings: ko.bindingHandlers,  // default ko.bindingHandlers
        noVirtualElements: false       // default true
    };

    ko.bindingProvider.instance = new ksb(options);
    __initialized = true;
}