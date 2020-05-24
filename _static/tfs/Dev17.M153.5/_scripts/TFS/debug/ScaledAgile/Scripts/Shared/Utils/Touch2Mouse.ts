import { BrowserFeatures } from "ScaledAgile/Scripts/Shared/Utils/BrowserFeatures";

export class Touch2Mouse {
    private static _touchHandled;
    private static _touchMoved;

    private static _originalMouseInit;
    private static _originalMouseDestroy;

    private static simulateMouseEvent(event: any, simulatedType: string): void {
        event.preventDefault();

        const touch = event.originalEvent.changedTouches[0];
        const simulatedEvent = document.createEvent("MouseEvents");

        simulatedEvent.initMouseEvent(
            simulatedType,    // type
            true,             // bubbles                    
            true,             // cancelable                 
            window,           // view                       
            1,                // detail                     
            touch.screenX,    // screenX                    
            touch.screenY,    // screenY                    
            touch.clientX,    // clientX                    
            touch.clientY,    // clientY                    
            false,            // ctrlKey                    
            false,            // altKey                     
            false,            // shiftKey                   
            false,            // metaKey                    
            0,                // button                     
            null              // relatedTarget              
        );

        event.target.dispatchEvent(simulatedEvent);
    }

    public static Shim(): void {
        if (!BrowserFeatures.isTouchDevice) {
            return;
        }
        Touch2Mouse._touchHandled = false;
        Touch2Mouse._originalMouseInit = $.ui.mouse.prototype._mouseInit;
        Touch2Mouse._originalMouseDestroy = $.ui.mouse.prototype._mouseDestroy;
        $.ui.mouse.prototype._touchStart = Touch2Mouse.touchStart;
        $.ui.mouse.prototype._touchMove = Touch2Mouse.touchMove;
        $.ui.mouse.prototype._touchEnd = Touch2Mouse.touchEnd;
        $.ui.mouse.prototype._mouseInit = Touch2Mouse.mouseInit;
        $.ui.mouse.prototype._mouseDestroy = Touch2Mouse.mouseDestroy;
    }

    public static touchStart(event: TouchEvent) {
        // var self = this as any;
        console.log("touchStart");
        if (Touch2Mouse._touchHandled /*|| !self._mouseCapture(event.originalEvent.changedTouches[0])*/) {
            return;
        }

        Touch2Mouse._touchHandled = true;
        Touch2Mouse._touchMoved = false;
        Touch2Mouse.simulateMouseEvent(event, "mouseover");
        Touch2Mouse.simulateMouseEvent(event, "mousemove");
        Touch2Mouse.simulateMouseEvent(event, "mousedown");
    }

    public static touchMove(event: TouchEvent) {
        if (!Touch2Mouse._touchHandled) {
            return;
        }
        Touch2Mouse._touchMoved = true;
        Touch2Mouse.simulateMouseEvent(event, "mousemove");
    };

    public static touchEnd(event: TouchEvent) {
        console.log("touchEnd");
        if (!Touch2Mouse._touchHandled) {
            return;
        }
        Touch2Mouse.simulateMouseEvent(event, "mouseup");
        Touch2Mouse.simulateMouseEvent(event, "mouseout");
        if (!Touch2Mouse._touchHandled) {
            Touch2Mouse.simulateMouseEvent(event, "click");
        }

        Touch2Mouse._touchHandled = false;
    }

    public static mouseInit() {
        console.log("mouseInit");
        var self = this as any;
        self.element.bind({
            touchstart: $.proxy(self, "_touchStart"),
            touchmove: $.proxy(self, "_touchMove"),
            touchend: $.proxy(self, "_touchEnd")
        });

        Touch2Mouse._originalMouseInit.call(self);

    }

    public static mouseDestroy() {
        console.log("mouseDestroy");

        var self = this as any;
        self.element.unbind({
            touchstart: $.proxy(self, "_touchStart"),
            touchmove: $.proxy(self, "_touchMove"),
            touchend: $.proxy(self, "_touchEnd")
        });
        Touch2Mouse._originalMouseDestroy.call(self);

    }
}


