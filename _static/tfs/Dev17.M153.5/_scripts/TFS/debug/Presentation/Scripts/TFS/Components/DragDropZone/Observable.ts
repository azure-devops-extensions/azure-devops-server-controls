import * as Diag from "VSS/Diag";
export class Observable<T> {
    private _observers: ((payload: T) => void)[] = [];

    public notify(payload: T): void {
        this._observers.forEach((listener: (payload: T) => void) => {
            listener(payload);
        });
    }

    public addObserver(observer: (payload: T) => void): void {
        this._observers.push(observer);
    }

    public removeObserver(observer: (payload: T) => void): void {
        const index = this._observers.indexOf(observer);
        if (index >= 0) {
            this._observers.splice(index, 1);
        }
        else {
            Diag.logVerbose("Cannot removeObserver");         
        }
    }

    public reset(): void {
        this._observers = []; 
    }
}
