import PopupContent = require("VSS/Controls/PopupContent");
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");

let domElem = Utils_UI.domElem;

export class DataCollectorHostControl extends Controls.BaseControl {

    _popupEnhancement: PopupContent.PopupContentControl;

    /**
     * initializa options for data collector host control
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    /**
     * initializes data collector host control
     */
    public initialize() {
        super.initialize();

        this._popupEnhancement = <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl, this._element, $.extend({
            content: () => {
                return this.getContent();
            },
            cssClass: "filtered-list-popup",
            menuContainer: this._element.parent()
        }, this._options.popupOptions));

        this._popupEnhancement._element.bind("popup-opened", () => {
            if (this._options.onPopupOpened) {
                this._options.onPopupOpened();
            }
            
        });
        this._popupEnhancement._element.bind("popup-closed", () => {
            if (this._options.onPopupClosed) {
                this._options.onPopupClosed();
            }
        });

        this.handleKeyBoardEvents();
    }

    /**
     * handles key board events
     */
    public handleKeyBoardEvents(): void {
        // Make this element focusable to listen for keyboard events
        this._element
            .attr("tabIndex", "0")
            .bind("keydown", (e) => {

                switch (e.keyCode) {
                    case Utils_UI.KeyCode.DOWN:
                        this.showPopup();
                        return false;
                    case Utils_UI.KeyCode.UP:
                    case Utils_UI.KeyCode.ESCAPE:
                        this.hidePopup();
                        return false;
                    case Utils_UI.KeyCode.ENTER:
                    case Utils_UI.KeyCode.SPACE:
                        this.showPopup();
                        return false;
                }
            });
    }

    /**
     * gets the html dom which is going to be hosted inside popup
     */
    public getContent(): JQuery {
        return $(domElem("div"));
    }

    /**
     * gets the handle to popup control
     */
    public getPopupEnhancement() {
        return this._popupEnhancement;
    }

    /**
     * hides the popup
     */
    public hidePopup() {
        this._popupEnhancement.hide();
    }

    /**
     * shows the popup
     */
    public showPopup() {
        this._popupEnhancement.show();
    }
}
