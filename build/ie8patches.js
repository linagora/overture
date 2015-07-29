"use strict";

// -------------------------------------------------------------------------- \\
// File: DOM.js                                                               \\
// Module: IEPatches                                                          \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*global document, Element, HTMLInputElement, HTMLTextAreaElement */
/*jshint strict: false */

( function ( doc ) {

// Add defaultView property to document
var window = doc.defaultView = doc.parentWindow;

// Add JS hook
window.ie = 8;

// Add CSS hook
doc.documentElement.id = 'ie8';

// === Fake W3C events support ===

var translate = {
    focus: 'focusin',
    blur: 'focusout'
};

var toCopy = 'altKey ctrlKey metaKey shiftKey clientX clientY charCode keyCode'.split( ' ' );

function DOMEvent ( event ) {
    var type = event.type,
        doc = document,
        target = event.srcElement || doc,
        html = ( target.ownerDocument || doc ).documentElement,
        l = toCopy.length,
        property;

    while ( l-- ) {
        property = toCopy[l];
        this[ property ] = event[ property ];
    }

    if ( type === 'propertychange' ) {
        type = ( target.nodeName === 'INPUT' &&
                target.type !== 'text' && target.type !== 'password' ) ?
            'change' : 'input';
    }

    this.type = Object.keyOf( translate, type ) || type;
    this.target = target;
    this.pageX = event.clientX + html.scrollLeft;
    this.pageY = event.clientY + html.scrollTop;

    if ( event.button ) {
        this.button = ( event.button & 4 ? 1 :
            ( event.button & 2 ? 2 : 0 ) );
        this.which = this.button + 1;
    }

    this.relatedTarget = event.fromElement === target ?
        event.toElement : event.fromElement;
    this._event = event;
}

DOMEvent.prototype.isEvent = true;
DOMEvent.prototype.preventDefault = function () {
    this.defaultPrevented = true;
    this._event.returnValue = false;
};
DOMEvent.prototype.stopPropagation = function () {
    this._event.cancelBubble = true;
};
DOMEvent.prototype.defaultPrevented = false;

var addEventListener = function ( type, handler/*, capture */) {
    var fn = handler._ie_handleEvent ||
            ( handler._ie_handleEvent = function () {
        var event = new DOMEvent( window.event );
        if ( typeof handler === 'object' ) {
            handler.handleEvent( event );
        } else {
            handler.call( this, event );
        }
    });
    handler._ie_registeredCount =
        ( handler._ie_registeredCount || 0 ) + 1;
    this.attachEvent( 'on' + ( translate[ type ] || type ), fn );
};
addEventListener.isFake = true;

var removeEventListener = function ( type, handler/*, capture */) {
    var fn = handler._ie_handleEvent;
    if ( !( handler._ie_registeredCount -= 1 ) ) {
        delete handler._ie_handleEvent;
    }
    if ( fn ) {
        this.detachEvent( 'on' + ( translate[ type ] || type ), fn );
    }
};
removeEventListener.isFake = true;

doc.addEventListener = addEventListener;
doc.removeEventListener = removeEventListener;
window.addEventListener = addEventListener;
window.removeEventListener = removeEventListener;
Element.prototype.addEventListener = addEventListener;
Element.prototype.removeEventListener = removeEventListener;

// === Add textContent property to elements ===

Object.defineProperty( Element.prototype, 'textContent', {
    get: function () {
        return this.innerText;
    },

    set: function ( text ) {
        this.innerText = text;
    }
});

// === Add text selection methods and properties ===

function stripCr ( string ) {
    return string.split( '\r' ).join( '' );
}

// Taken from http://the-stickman.com/web-development/javascript/
// finding-selection-cursor-position-in-a-textarea-in-internet-explorer/
// and modified to work with textareas + input[type=text]
function getSelection ( el ) {
    // The current selection and a dummy duplicate
    var range = document.selection.createRange(),
        dummy = range.duplicate();

    // Select all text
    if ( el.nodeName === 'TEXTAREA' ) {
        dummy.moveToElementText( el );
    }
    else {
        dummy.expand( 'textedit' );
    }

    // Move dummy range end point to end point of original range
    dummy.setEndPoint( 'EndToEnd', range );

    // Now we can calculate start and end points
    var rangeLength = stripCr( range.text ).length,
        start = stripCr( dummy.text ).length - rangeLength,
        end = start + rangeLength;

    return { start: start, end: end };
}
var getSelectionStart = {
    get: function () {
        return getSelection( this ).start;
    }
};
var getSelectionEnd = {
    get: function () {
        return getSelection( this ).end;
    }
};

Object.defineProperty(
    HTMLInputElement.prototype, 'selectionStart', getSelectionStart );
Object.defineProperty(
    HTMLInputElement.prototype, 'selectionEnd',  getSelectionEnd );
Object.defineProperty(
    HTMLTextAreaElement.prototype, 'selectionStart', getSelectionStart );
Object.defineProperty(
    HTMLTextAreaElement.prototype, 'selectionEnd',  getSelectionEnd );

HTMLInputElement.prototype.setSelectionRange =
HTMLTextAreaElement.prototype.setSelectionRange = function ( start, end ) {
    var range = this.createTextRange();
    range.collapse( true );
    range.moveEnd( 'character', end || start || 0 );
    range.moveStart( 'character', start || 0 );
    range.select();
};

Object.defineProperty( Element.prototype, 'previousElementSibling', {
    get: function () {
        var node = this;
        do {
            node = node.previousSibling;
        } while ( node && node.nodeType !== 1 );
        return node;
    }
});
Object.defineProperty( Element.prototype, 'nextElementSibling', {
    get: function () {
        var node = this;
        do {
            node = node.nextSibling;
        } while ( node && node.nodeType !== 1 );
        return node;
    }
});

// === Node constants ===

window.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    DOCUMENT_NODE: 9,
    DOCUMENT_POSITION_DISCONNECTED: 1,
    DOCUMENT_POSITION_PRECEDING: 2,
    DOCUMENT_POSITION_FOLLOWING: 4,
    DOCUMENT_POSITION_CONTAINS: 8,
    DOCUMENT_POSITION_CONTAINED_BY: 16
};

// === Element#compareDocumentPosition ===

Element.prototype.compareDocumentPosition = function ( b ) {
    var a = this,
        different = ( a !== b ),
        aIndex = a.sourceIndex,
        bIndex = b.sourceIndex;

    return ( different && a.contains( b ) ? 16 : 0 ) +
        ( different && b.contains( a ) ? 8 : 0 ) +
        ( aIndex < bIndex ? 4 : 0 ) +
        ( bIndex < aIndex ? 2 : 0 );
};

}( document ) );


// -------------------------------------------------------------------------- \\
// File: Date.js                                                              \\
// Module: IEPatches                                                          \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*jshint strict: false */

/**
    Function: Date.now

    ECMAScript 5 Date.now method. Returns the current time as the number of
    milliseconds since 1 January 1970.

    Returns:
        {Number} The current time.
*/
Date.now = function () {
    return +( new Date() );
};


// -------------------------------------------------------------------------- \\
// File: Function.js                                                          \\
// Module: IEPatches                                                          \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*jshint strict: false */

/**
    Method: Function#bind

    ECMAScript 5 bind method. Returns a function which will call the
    original function bound to the given scope.

    Parameters:
        scope    - {Object} The object to bind the 'this' parameter to.
        var_args - {...*} Any further arguments will be supplied as
                   arguments to the original function when it is called,
                   followed by any other arguments given at the time of
                   calling.

    Returns:
        {Function} The bound function.
*/
Function.prototype.bind = function ( that ) {
    var fn = this,
        boundArgs = Array.prototype.slice.call( arguments, 1 );
    return function () {
        var args = boundArgs.slice();
        if ( arguments.length ) {
            Array.prototype.push.apply( args, arguments );
        }
        return fn.apply( that, args );
    };
};


// -------------------------------------------------------------------------- \\
// File: Object.js                                                            \\
// Module: IEPatches                                                          \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*jshint strict: false */

/**
    Function: Object.create

    ECMAScript 5 create static method. Returns an object with the given
    object as its prototype. Note the ECMAScript 5 method actually also
    accepts further arguments but these are impossible to emulate.

    Parameters:
        proto - {Object} The object to use as prototype for the new object.

    Returns:
        {Object} The new object.
*/
Object.create = function ( proto ) {
    var F = function () {};
    F.prototype = proto;
    return new F();
};

/**
    Function: Object.keys

    ECMAScript 5 keys static method. Returns an array of keys for all
    enumerable properties defined explicitly on the object (not its
    prototype).

    Parameters:
        object - {Object} The object to get the array of keys from.

    Returns:
        {String[]} The list of keys.
*/
Object.keys = function ( object ) {
    var keys = [];
    for ( var key in object ) {
        if ( object.hasOwnProperty( key ) ) {
            keys.push( key );
        }
    }
    return keys;
};


// -------------------------------------------------------------------------- \\
// File: RegExp.js                                                            \\
// Module: IEPatches                                                          \\
// Author: Steven Levithan, Neil Jenkins                                      \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*jshint strict: false */

( function ( undefined ) {

// Fix major issues in IE split() function
// Main bug is the failure to include capture groups in the output.
// Original fix by Steven Levithan (tidied and optimised by Neil Jenkins):
// http://blog.stevenlevithan.com/archives/cross-browser-split
if ('a~b'.split(/(~)/).length !== 3) {
    var nativeSplit = String.prototype.split;
    String.prototype.split = function ( separator, limit ) {
        // If separator is not a regex, use the native split method
        if ( !( separator instanceof RegExp ) ) {
            return nativeSplit.apply( this, arguments );
        }

        var flags = ( separator.global ? 'g' : '' ) +
                    ( separator.ignoreCase ? 'i' : '' ) +
                    ( separator.multiline ? 'm' : '' ),
            separator2 = new RegExp( '^' + separator.source + '$', flags ),
            output = [],
            origLastIndex = separator.lastIndex,
            lastLastIndex = 0,
            i, match, lastLength, emptyMatch;

        /* behavior for limit: if it's...
        - undefined: no limit
        - NaN or zero: return an empty array
        - a positive number: use limit after dropping any decimal
        - a negative number: no limit
        - other: type-convert, then use the above rules
        */
        if ( limit === undefined || +limit < 0 ) {
            limit = 0;
        } else {
            limit = Math.floor( +limit );
            if ( !limit ) {
                return output;
            }
        }

        if ( separator.global ) {
            separator.lastIndex = 0;
        }
        else {
            separator = new RegExp( separator.source, 'g' + flags );
        }

        for ( i = 0;
                ( !limit || i <= limit ) && ( match = separator.exec( this ) );
                i += 1 ) {
            emptyMatch = !match[0].length;

            // Fix IE's infinite-loop-resistant but incorrect lastIndex
            if ( emptyMatch && separator.lastIndex > match.index ) {
                separator.lastIndex -= 1;
            }

            if ( separator.lastIndex > lastLastIndex ) {
                // Fix browsers whose exec methods don't consistently return
                // undefined for non-participating capturing groups
                if ( match.length > 1 ) {
                    match[0].replace( separator2, function () {
                        for ( var j = 1; j < arguments.length - 2; j += 1 ) {
                            if ( arguments[j] === undefined ) {
                                match[j] = undefined;
                            }
                        }
                    });
                }
                output.push( this.slice( lastLastIndex, match.index ) );
                if ( match.length > 1 && match.index < this.length ) {
                    output.push.apply( output, match.slice( 1 ) );
                }
                // only needed if s.lastIndex === this.length
                lastLength = match[0].length;
                lastLastIndex = separator.lastIndex;
            }

            if ( emptyMatch ) {
                separator.lastIndex += 1; // avoid an infinite loop
            }
        }

        // Since this uses test(), output must be generated before
        // restoring lastIndex
        if ( lastLastIndex === this.length ) {
            if ( !separator.test( '' ) || lastLength ) {
                output.push( '' );
            }
        } else {
            if ( !limit ) {
                output.push( this.slice( lastLastIndex ) );
            }
        }

        // Only needed if s.global, else we're working with a copy of the regex
        separator.lastIndex = origLastIndex;

        return output;
    };
}

}() );


// -------------------------------------------------------------------------- \\
// File: String.js                                                            \\
// Module: IEPatches                                                          \\
// Author: Neil Jenkins                                                       \\
// License: © 2010-2015 FastMail Pty Ltd. MIT Licensed.                       \\
// -------------------------------------------------------------------------- \\

/*jshint strict: false */

/**
    Method: String#trim

    Returns the string with any white space at the beginning and end
    removed. Implementation by Steven Levithan:
    <http://blog.stevenlevithan.com/archives/faster-trim-javascript>

    Returns:
        {String} The trimmed string.
*/
String.prototype.trim = function () {
    var str = this.replace( /^\s\s*/, '' ),
        ws = /\s/,
        i = str.length;
    while ( ws.test( str.charAt( i -= 1 ) ) ) {/* Empty! */}
    return str.slice( 0, i + 1 );
};
