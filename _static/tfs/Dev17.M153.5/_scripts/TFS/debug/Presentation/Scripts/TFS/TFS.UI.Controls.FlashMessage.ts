import Notifications = require("VSS/Controls/Notifications");

export class Message {

    public type: Notifications.MessageAreaType;

    public header: string;

    public content: any;

    constructor() {}
}
export class FlashMessage   {

    public expanded: boolean;

    public message: Message;

    public showIcon: boolean;

    public showDetailsLink: boolean;

    public showHeader: boolean;

    public earlyInitialize: boolean;

    public noHeaderNoLinkJustIcon: boolean;
    constructor() {
        this.expanded = false;
        this.message = new Message();
        this.showIcon = true;
        this.showDetailsLink = false;
        this.showHeader = false;
        this.earlyInitialize = true;
        this.noHeaderNoLinkJustIcon = true;
    }

}

export class Widget  {

    private _element: JQuery;

    private _viewModel: FlashMessage;

    constructor(element: JQuery, options: FlashMessage);

    constructor(element: JQuery, options: Object);

    constructor(element: JQuery, options: any) {

        var that = this;

        this._element = element;

        this._viewModel = options;

        this.init();
    }
    private init(): void {

        var controller: Notifications.MessageAreaControl = new Notifications.MessageAreaControl(this._viewModel);
        controller.enhance(this._element);  
    }

    public static enhanceElement(element: JQuery, options: FlashMessage) {
        var controller: Notifications.MessageAreaControl = new Notifications.MessageAreaControl(options);
        controller.enhance(element); 
    }

}
