import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";;
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import * as KeyValueStore from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import {MessageLevel, IMessage} from "VersionControl/Scenarios/Shared/MessageArea";

export class MessageAdapater extends ActionAdapter<IMessage> {
    constructor() {
        super();
        BranchesActions.ShowMessage.addListener(this._onSelectionAdded)
        BranchesActions.DismissMessage.addListener(this._onSelectionRemoved)
    }

    private _onSelectionAdded = (payload: IMessage) => {
        this.itemsAdded.invoke(payload);
    }

    private _onSelectionRemoved = (payload: IMessage) => {
        this.itemsRemoved.invoke(payload);
    }

    public dispose(): void {
        BranchesActions.ShowMessage.removeListener(this._onSelectionAdded);
        BranchesActions.DismissMessage.removeListener(this._onSelectionRemoved);
        super.dispose();
    }
}

/**
 * Verify if the message has changed..
 */
export function isEqual(x: IMessage, y: IMessage): boolean {
    return x.key === y.key && x.text === y.text;
}

export class MessageKeyValueStore<TValue> extends KeyValueStore.DictionaryStore<TValue> {

    constructor(options: KeyValueStore.IDictionaryStoreOptions<TValue>) {
        super(options);
    }

    protected _addItem(newItem: TValue): boolean {
        const key = this._options.getKey(newItem);
        const newMessage: IMessage = newItem as any as IMessage;

        // No-op if the equal item already exists at the key, update otherwise.
        const storeItem = this.get(key);
        if (!storeItem || (storeItem && !this._options.isEqual(newItem, storeItem))) {
            //Before adding a message see if it already exists
            const messages: IMessage[] = this.getAll() as any as IMessage[];
            const duplicateMessage: IMessage[] = messages.filter(x => x.text === newMessage.text);
            //If we find a duplicate message increase the counter and return
            if (duplicateMessage && (duplicateMessage.length === 1)) {
                duplicateMessage[0].count++;
                return true;
            }
            newMessage.count = 1;
            this._items[key] = newMessage;
            return true;
        }
        return false;
    }
}
