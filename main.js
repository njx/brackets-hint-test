/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, CodeMirror, window */

define(function (require, exports, module) {
    "use strict";
    
    var Commands               = brackets.getModule("command/Commands"),
        CommandManager         = brackets.getModule("command/CommandManager"),
        EditorManager          = brackets.getModule("editor/EditorManager"),
        Menus                  = brackets.getModule("command/Menus");
        
    // once animate-inline-final is merged, we can use the version of this in Async.js
    var PromiseQueue           = require("PromiseQueue").PromiseQueue;
    
    // delay in ms between hint tests
    var TEST_DELAY = 250;
    
    // hardcoded log file
    var LOG_FILE = "/tmp/code-hint-stress.txt";
    
    var running = false,
        editor,
        queue = new PromiseQueue(),
        logStr = "",
        toggleCommand;
    
    // TODO: PromiseQueue--if function doesn't return anything, would be nice to just assume it's done and move on
    
    
    function openLog() {
        // TODO: not necessary while we're rewriting log file each time
        return new $.Deferred().resolve().promise();
    }
    
    function closeLog() {
        // TODO: not necessary while we're rewriting log file each time
        return new $.Deferred().resolve().promise();
    }
    
    function log(str) {
        var result = new $.Deferred();
        // TODO: use node to write incrementally to log file
        // TODO: will brackets.fs.writeFile flush to disk? (maybe it doesn't matter since it's in the browser process anyway)
        logStr += "[" + new Date().toTimeString() + "] " + str + "\n";
        brackets.fs.writeFile(LOG_FILE, logStr, "utf8", function () {
            result.resolve();
        });
        return result.promise();
    }
    
    function wait(delay) {
        return function () {
            var result = new $.Deferred();
            window.setTimeout(function () {
                result.resolve();
            }, delay);
            return result.promise();
        };
    }
    
    function doOneHint() {
        var result = new $.Deferred();
        if (running && editor) {
            // Pick a random location in the editor.
            var line = Math.floor(Math.random() * editor.lineCount()),
                lineStr = editor.document.getLine(line),
                ch = Math.floor(Math.random() * lineStr.length);
            
            // Two choices: 
            // -- just invoke code hints at the random location
            // -- TODO: find a location where we should be able to type a ".", type it, and then undo after a short pause
            var doSimpleCodeHint = true;
            
//            if (Math.random() < 0.5) {
//                // Scan backwards to the last word character, and assume we can type a "." there to get code hints.
//                // Might not always be true, but it's fine for testing. If we don't find a word character on the line,
//                // just fall back to invoking code hints at the original location.
//                var index = ch;
//                while (index >= 0 && !(/[A-Za-z]/.test(lineStr.charAt(index)))) {
//                    index--;
//                }
//                if (index >= 0) {
//                    doSimpleCodeHint = false;
//                    ch = index + 1;
//                    log("Typing '.' at line " + line + ", ch " + ch)
//                        .done(function () {
//                            editor.setCursorPos(line, ch, true);
//                            // TODO: how to simulate keydown?
//                        });
//                }
//            }
            
            if (doSimpleCodeHint) {
                editor.setCursorPos(line, ch, true);
                log("Opening code hints at line " + line + ", ch " + ch)
                    .done(function () {
                        CommandManager.execute(Commands.SHOW_CODE_HINTS);
                        result.resolve();

                        // Pause, then do another test.
                        queue.add(wait(TEST_DELAY));
                        queue.add(doOneHint);
                    });
            }
            
        } else {
            // no longer running, just finish immediately
            result.resolve();
        }
        return result.promise();
    }
    
    function toggleStressCodeHints() {
        if (running) {
            running = false;
            editor = null;
            queue.add(function () {
                return log("=== Stopping ===");
            });
            queue.add(closeLog);
            queue.add(function () {
                toggleCommand.setChecked(false);
                return new $.Deferred().resolve().promise();
            });
        } else {
            running = true;
            editor = EditorManager.getCurrentFullEditor();
            queue.add(function () {
                toggleCommand.setChecked(true);
                return new $.Deferred().resolve().promise();
            });
            queue.add(openLog);
            queue.add(function () {
                return log("=== Starting: " + editor.document.file.fullPath + " ===");
            });
            queue.add(doOneHint);
        }
    }
    
    toggleCommand = CommandManager.register("Stress Code Hints", "com.adobe.brackets.debug.stressCodeHints", toggleStressCodeHints);
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(toggleCommand);
});
