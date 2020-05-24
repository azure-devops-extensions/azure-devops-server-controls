///<amd-dependency path="jQueryUI/draggable"/>

import Diag = require("VSS/Diag");

$(function () {
    (<any>$.ui).plugin.add("draggable", "scrollables", {
        start: function (event, ui) {
            /// <summary>start event: cache the elements and their rectangles</summary>
            /// <param name="event" type="object">Event object</param>
            /// <param name="ui" type="object">ui object</param>

            var i, l,
                elements = [],
                $elements = null,
                element = null,
                elementRect = null,
                draggable = $(this).data("ui-draggable"),
                options = draggable.options;

            function elementExistsOnPage($element) { //Checks to see if the given element exists on this page
                if ($element.closest("body").length) {
                    return true;
                }
                return false;
            }

            var scrollableElementsIndex = 0;

            // loop through the scrollables and cache the elements and their rectangles
            for (i = 0, l = options.scrollables.length; i < l; i++ , scrollableElementsIndex++) {
                $elements = $(options.scrollables[i]);
                if (!elementExistsOnPage($elements)) {
                    continue; //This scrollable container does not exist on this page
                }

                $elements.each((index, element) => {
                    var $element = $(element);
                    elementRect = $element.offset(); // get top & left offset of the element

                    elementRect.bottom = elementRect.top + $element.height();
                    elementRect.right = elementRect.left + $element.width();
                    elements[scrollableElementsIndex++] = {
                        element: element,
                        rect: elementRect
                    };
                });
            }
            options.scrollableElements = elements;
        },
        drag: function (event, ui) {
            /// <summary>drag event: scroll elements if needed</summary>
            /// <param name="event" type="object">Event object</param>
            /// <param name="ui" type="object">ui object</param>

            var draggable = $(this).data("ui-draggable"),
                options = draggable.options,
                cursorAt = options.cursorAt || { left: 0, top: 0 }, // get the cursor location with respect to the tile
                intersect = false,
                element = null,
                scrolled = false,
                elements = options.scrollableElements, // get cached scrolled elements
                elementRect = null, // get top & left offset of the element
                offsetHeight;

            Diag.Debug.assert(
                (cursorAt.left != null || cursorAt.right != null) && (cursorAt.top != null || cursorAt.bottom != null),
                "Either cursorAt.left or cursorAt.right and cursorAt.top or cursorAt.bottom need to be defined");

            var top = cursorAt.top != null ? cursorAt.top : (draggable.helperProportions.height - cursorAt.bottom); // cursor location with respect to tile
            var left = cursorAt.left != null ? cursorAt.left : (draggable.helperProportions.width - cursorAt.right); // cursor location with respect to tile
            var tileRect = {
                left: event.pageX - left, // cursor x - cursor location with respect to tile
                top: event.pageY - top, // cursor y - cursor location with respect to tile
                right: event.pageX - left + draggable.helperProportions.width, // left + width
                bottom: event.pageY - top + draggable.helperProportions.height // top + height
            };

            for (let i = 0, l = elements.length; i < l; i += 1) {
                if (typeof (elements[i]) === "undefined") {
                    continue; //The referenced scrollable container does not exist on this page
                }
                element = elements[i].element;
                elementRect = elements[i].rect;

                // we will use very simple rule for intersecton which is that one of the tile verticies are in the element boundries .
                intersect = ((tileRect.left >= elementRect.left && tileRect.left <= elementRect.right) || (tileRect.right >= elementRect.left && tileRect.right <= elementRect.right)) && ((tileRect.top >= elementRect.top && tileRect.top <= elementRect.bottom) || (tileRect.bottom >= elementRect.top && tileRect.bottom <= elementRect.bottom));

                if (intersect) {

                    // we scroll if the cursor is close to top/bottom or right/left by the scrollSensitivity

                    if ((!options.axis || options.axis === 'y') && (!options.scrollablesAxis || options.scrollablesAxis === "y")) {
                        if (elementRect.bottom - event.pageY < options.scrollSensitivity) { // close to bottom
                            element.scrollTop = element.scrollTop + options.scrollSpeed;
                            scrolled = true;
                        }
                        else if (event.pageY - elementRect.top < options.scrollSensitivity) { // close to top
                            element.scrollTop = element.scrollTop - options.scrollSpeed;
                            scrolled = true;
                        }
                    }

                    if ((!options.axis || options.axis === 'x') && (!options.scrollablesAxis || options.scrollablesAxis === "x")) {
                        if (elementRect.right - event.pageX < options.scrollSensitivity) { // close to right
                            element.scrollLeft = element.scrollLeft + options.scrollSpeed;
                            scrolled = true;
                        }
                        else if (event.pageX - elementRect.left < options.scrollSensitivity) { // close to left
                            element.scrollLeft = element.scrollLeft - options.scrollSpeed;
                            scrolled = true;
                        }
                    }
                }
            }
            if (scrolled !== false) {
                // JSLint: Assigning the value even though it is not used for JSLint.
                offsetHeight = element.offsetHeight; // this cause the browser to render the changes above so any further events operate on correct locations
            }
        },
        stop: function (event, ui) {
            /// <summary>stop event: cleanup of stored data</summary>
            /// <param name="event" type="object">Event object</param>
            /// <param name="ui" type="object">ui object</param>

            var draggable = $(this).data("ui-draggable"),
                options = draggable.options;

            delete options.scrollableElements;
        }
    });
});