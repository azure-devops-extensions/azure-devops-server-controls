import { registerContent, VSS } from "VSS/SDK/Shim";
import { showMessageDialog } from "VSS/Controls/Dialogs";

// This file implements the action for the contributed PivotBar command.
// The contribution is ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.commands.contributedCommand,
// defined in vss-samples.json.

export class Handler {
    private _id: string;
    private _text: string;
    private _important: boolean;

    constructor(options: { id: string, text: string, important?: boolean }) {
        this._id = options.id;
        this._text = options.text;
        this._important = !!options.important;
    }

    public getMenuItems(context: any): {}[] {
        return [
            {
                id: this._id,
                text: this._text,
                important: this._important,
                icon: "fabric://Globe",
                action: this.clickHandler.bind(this),
            },
            {
                id: this._id + 2,
                text: this._text + 2,
                important: this._important,
                icon: "https://blueprint.gallerycdn.vsassets.io/extensions/blueprint/vsts-open-work-items-in-excel/0.1.66/1495259267977/img/miniexcellogo.png",
                action: this.clickHandler.bind(this),
            },
        ];
    }

    private clickHandler(context: any): void {
        showMessageDialog("Context: " + JSON.stringify(context, null, 4), { title: this._text });
    }
}

registerContent("contributed.command", context => {
    const id = "ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedCommand";
    VSS.register(id, new Handler({ id, text: "Contributed Command", important: true }));
});
