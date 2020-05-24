import {getHistoryService} from "VSS/Navigation/Services";
import {localeIgnoreCaseComparer} from "VSS/Utils/String";

/**
 * Simple helper to detect if the page is in embedded mode.
 */
export module EmbeddedHelper {
    var EMBEDDED_HASH_PARAMETER = "embedded";

    var _isEmbedded: boolean;
    var _isInitialized: boolean;

    export function initialize(): void {
        var currentState = getHistoryService().getCurrentState();
        _isEmbedded = currentState && (localeIgnoreCaseComparer(currentState[EMBEDDED_HASH_PARAMETER], "true") === 0);
    }

    export function isEmbedded(): boolean {
        if (!_isInitialized) {
            initialize();
            _isInitialized = true;
        }
        return _isEmbedded;
    }
}
