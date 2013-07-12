/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, CodeMirror, window */

define(function (require, exports, module) {
    "use strict";
    
    /**
     * @constructor
     * Creates a queue of async operations that will be executed sequentially. Operations can be added to the
     * queue at any time. If the queue is empty and nothing is currently executing when an operation is added, 
     * it will execute immediately. Otherwise, it will execute when the last operation currently in the queue 
     * has finished.
     */
    function PromiseQueue() {
    }
    
    /**
     * @private
     * @type {Array.<function(): $.Promise>}
     * The queue of operations to execute sequentially. Note that even if this array is empty, there might
     * still be an operation we need to wait on; that operation's promise is stored in _curPromise.
     */
    PromiseQueue.prototype._queue = [];
    
    /**
     * @private
     * @type {$.Promise}
     * The promise we're currently waiting on, or null if there's nothing currently executing.
     */
    PromiseQueue.prototype._curPromise = null;
    
    /**
     * Adds an operation to the queue. If nothing is currently executing, it will execute immediately (and
     * the next operation added to the queue will wait for it to complete). Otherwise, it will wait until
     * the last operation in the queue (or the currently executing operation if nothing is in the queue) is
     * finished. The operation must return a promise that will be resolved or rejected when it's finished;
     * the queue will continue with the next operation regardless of whether the current operation's promise
     * is resolved or rejected.
     * @param {function(): $.Promise} op The operation to add to the queue.
     */
    PromiseQueue.prototype.add = function (op) {
        this._queue.push(op);

        // If something is currently executing, then _doNext() will get called when it's done. If nothing
        // is executing (in which case the queue should have been empty), we need to call _doNext() to kickstart
        // the queue.
        if (!this._curPromise) {
            this._doNext();
        }
    };
    
    /**
     * @private
     * Pulls the next operation off the queue and executes it.
     */
    PromiseQueue.prototype._doNext = function () {
        var self = this;
        if (this._queue.length) {
            var op = this._queue.shift();
            this._curPromise = op();
            this._curPromise.done(function () {
                self._curPromise = null;
                self._doNext();
            });
        }
    };
    
    exports.PromiseQueue = PromiseQueue;
});
