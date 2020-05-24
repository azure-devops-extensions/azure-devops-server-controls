import { getClient } from "VSS/Service";
import { ClientTraceEvent } from "VSS/ClientTrace/Contracts";
import { ClientTraceHttpClient4_1 } from "VSS/ClientTrace/RestClient";
import { DelayedFunction } from "VSS/Utils/Core";

/**
 * Service used to report client traces to the server
 */
class ClientTraceService {

    private _items: ClientTraceEvent[] = [];
    private _delayFunction: DelayedFunction;

    constructor() {
        this._delayFunction = new DelayedFunction(this, 1000, "ClientTracePublish", () => {
            this.flush().then(null, () => {});
        });
    }

    public publish(options: ClientTraceEvent) {
        this._items.push(options);
        if (!this._delayFunction.isPending()) {
            this._delayFunction.start();
        }
    }

    /**
     * Flush pending telemetry events
     */
    public flush(): IPromise<void> {
        const items = this._items;
        this._items = [];

        if (items.length === 0) {
            return Promise.resolve(null);
        }

        const clientTraceHttpClient = getClient(ClientTraceHttpClient4_1, undefined, undefined, undefined, { showProgressIndicator: false });
        return clientTraceHttpClient.publishEvents(items);
    }
}

const clientTraceService = new ClientTraceService();

/**
 * Trace the given event to the CI client trace channel
 * (events are queued and sent in delayed batches)
 *
 * @param eventData {ClientTraceEvent} event to publish
 */
export function trace(event: ClientTraceEvent): void {
    clientTraceService.publish(event);
}

/**
 * Flush queued event data to be sent to client trace
 */
export function flush(): IPromise<void> {
    return clientTraceService.flush();
}
