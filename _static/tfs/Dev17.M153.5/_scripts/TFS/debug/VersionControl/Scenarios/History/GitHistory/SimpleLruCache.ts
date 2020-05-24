interface SimpleLruCacheItem<T> {
    key: number;
    value: T;
}

/**
 * Simple LRU cache implemented using only an array.
 * It is only suitable for small array size (5-10 elements).
 */
export class SimpleLruCache<TValue> {
    private _itemsQueue: SimpleLruCacheItem<TValue>[];

    constructor(
        private _capacity: number = 5,
        private _itemDeletedNotification: (item: TValue) => void ) {
        this._itemsQueue = [];
    }

    public get length(): number {
        return this._itemsQueue.length;
    }

    public hasItem(key: number): boolean {
        for (const item of this._itemsQueue) {
            if (item.key === key) {
                return true;
            }
        }
        return false;
    }

    public getItem(key: number): TValue {
        for (let i = 0; i < this._itemsQueue.length; i++) {
            if (this._itemsQueue[i].key === key) {
                const removedItem = this._itemsQueue.splice(i, 1);
                this._itemsQueue.push(removedItem[0]);
                return removedItem[0].value;
            }
        }
        return null;
    }

    public setItem(key: number, value: TValue): void {
        if (!this.getItem(key)) {
            this._itemsQueue.push({
                key: key,
                value: value,
            });

            this._purgeItemIfCapacityExceeded();
        }
    }

    public resetCache(): void {
        for (const item of this._itemsQueue) {
            this._itemDeletedNotification(item.value);
        }
        this._itemsQueue = [];
    }

    private _purgeItemIfCapacityExceeded(): void {
        if (this._itemsQueue.length > this._capacity) {
            for (let i = 0; i < this._itemsQueue.length - this._capacity; i++) {
                this._itemDeletedNotification(this._itemsQueue[i].value);
            }
            this._itemsQueue.splice(0, this._itemsQueue.length - this._capacity);
        }
    }
}
