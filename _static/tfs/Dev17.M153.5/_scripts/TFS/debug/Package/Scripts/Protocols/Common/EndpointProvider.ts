import * as Service from "VSS/Service";

export class EndpointProvider extends Service.VssService {
    private _endpointDictionary: { [id: string]: [() => IPromise<string>, string] } = {};

    public containsEndpoint(urlKey: string): boolean {
        return this._endpointDictionary[urlKey] != null;
    }

    public getEndpointUrl(feedName: string, urlKey: string): IPromise<string> {
        const promiseFunc = this._endpointDictionary[urlKey][0];
        return promiseFunc().then((url: string) => {
            const replacementString = this._endpointDictionary[urlKey][1];
            const uriEncodedFeedName = encodeURI(feedName);
            return url.replace(replacementString, uriEncodedFeedName);
        });
    }

    public addEndpoint(promiseFunc: () => IPromise<string>, urlKey: string, replacementString: string): void {
        this._endpointDictionary[urlKey] = [promiseFunc, replacementString];
    }
}
